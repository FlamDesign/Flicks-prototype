#!/usr/bin/env node
/**
 * One-time migration of the saved library (Worker key "state") from video positions to video keys.
 *
 * Before this, a slide or a Flick variation held `video: <number>`: a position in a list that
 * began with the videos bundled in the app (25 of them when these records were saved: 10 generic
 * samples, then 15 brand videos) and went on with the made videos in the order this device had
 * them. Positions from 100000 were the real Flicks' videos. Now every video is known by a key
 * that never changes: a bundled video by its name, a made video by its address.
 *
 * Usage: node scripts/migrate-video-keys.cjs <state.json> <out.json>
 * Reads the old copy, writes the new one, and prints a check of every reference. Nothing is sent.
 */
const fs = require("fs")

const [, , inFile, outFile] = process.argv
if (!inFile || !outFile) {
  console.error("usage: migrate-video-keys.cjs <state.json> <out.json>")
  process.exit(2)
}
const state = JSON.parse(fs.readFileSync(inFile, "utf8"))
const made = state.made ?? []

// the bundled list these records were numbered against
const LEGACY_BUILT_IN = 25
const LEGACY_SAMPLES = 10
const BRAND = [
  ["gap", ["denim", "brown", "burgundy"]],
  ["diageo", ["tanqueray", "black label", "don julio"]],
  ["little-caesars", ["pepperoni", "cheese", "veggie"]],
  ["general-mills", ["lucky charms", "cheerios", "cinnamon"]],
  ["modelo", ["oro", "negra", "especial"]],
].flatMap(([set, parts]) => parts.map((p, i) => `${set}-${i + 1}-${p}`))
const REAL = ["coach", "wwe2k", "ulta", "homedepot", "diageo", "lovesac", "littlecaesars", "amazon", "geico", "amex", "generalmills", "modelo", "paramount", "sony", "redbull", "gap"]
const REAL_BASE = 100_000
// the generic sample clips now live on the AI server like every made video (the Sample videos
// switch uses them); a slide that used one (pre-chat projects) points at the matching clip
const SERVER = "https://flicks-ai.flick-prototype.workers.dev/file/"
const SAMPLE_CLIPS = [
  ["up-220b9972-6e16-4a42-81c3-888e7e16723c", "up-36018883-196e-4d3a-b1df-75393bd990ae"],
  ["up-b2daaa33-6f3b-416c-85a1-1f26ef6f5b19", "up-254a6f04-ff32-410d-9d04-47a46b67e5db"],
  ["up-1ffaf4c7-d115-4710-ae90-741d489d74c9", "up-e829058c-fb77-474e-82bf-04c4b03ca37c"],
  ["up-02ba4892-de83-458b-8a86-eaa3bf1ce5ef", "up-2cb4098f-4305-45c2-a261-182a14d027e7"],
  ["up-21d63f3a-be07-4973-9cca-ba36df2e7968", "up-ddb69f8d-39e2-4ff1-827f-413469b686f3"],
].map(([v, p], i) => ({ name: `Sample video ${i + 1}`, size: "1080×1920", mp4: `${SERVER}${v}.mp4`, poster: `${SERVER}${p}.jpg` }))
const SAMPLE_KEY = (i) => SAMPLE_CLIPS[i % 5].mp4
/** a kept copy's address always carries its extension (the server serves both forms; one key per video) */
const keptUrl = (u) => (typeof u === "string" && u.startsWith(SERVER) && !/\.\w+$/.test(u) ? `${u}.mp4` : u)

const stats = { total: 0, made: 0, brand: 0, real: 0, sample: 0, unknown: 0, mismatch: [] }
function keyOf(i, name) {
  stats.total++
  if (i >= REAL_BASE) {
    stats.real++
    const k = i - REAL_BASE
    return `${REAL[Math.floor(k / 3)]}-${(k % 3) + 1}`
  }
  if (i < LEGACY_SAMPLES) {
    stats.sample++
    return SAMPLE_KEY(i)
  }
  if (i < LEGACY_BUILT_IN) {
    stats.brand++
    return BRAND[i - LEGACY_SAMPLES]
  }
  const m = made[i - LEGACY_BUILT_IN]
  if (!m) {
    stats.unknown++
    stats.mismatch.push(`no made video at ${i} (${name ?? "?"})`)
    return `missing-${i}`
  }
  stats.made++
  // every made video is named "<variation>-<started at>" (or "<project> · <variation>"): the
  // variation's name must agree, or the position was wrong
  if (name && !(String(m.name).startsWith(name) || String(m.name).endsWith(`· ${name}`))) stats.mismatch.push(`${where} ${name} -> ${m.name} (${i})`)
  return keptUrl(m.mp4)
}
let where = ""

/** every `video: number` in a record becomes its key; `src` (the same address) is dropped */
function convert(v, name) {
  if (Array.isArray(v)) return v.map((x) => convert(x))
  if (v && typeof v === "object") {
    const out = {}
    const own = typeof v.name === "string" ? v.name : name
    for (const [k, x] of Object.entries(v)) {
      if (k === "video" && typeof x === "number") out.video = keyOf(x, own)
      else if (k === "src" && typeof v.video === "number") continue
      else if (k === "sig" && typeof x === "string") {
        // a checkpoint's signature is its canvas as JSON: converted the same way
        try {
          out.sig = JSON.stringify(convert(JSON.parse(x)))
        } catch {
          out.sig = x
        }
      } else out[k] = convert(x, own)
    }
    return out
  }
  return v
}

const next = { ...state }
for (const key of ["projects", "flicks"]) next[key] = state[key].map((x) => ((where = `${key}:${x.name}`), convert(x)))
delete next.builtIn
// one entry per address; a known still beats a missing one
const byUrl = new Map()
for (const m of [...SAMPLE_CLIPS, ...made]) {
  const mp4 = keptUrl(m.mp4)
  const old = byUrl.get(mp4)
  byUrl.set(mp4, { name: m.name, size: m.size, mp4, poster: m.poster || old?.poster || "" })
}
next.made = [...byUrl.values()]

// nothing numeric may remain
let left = 0
JSON.parse(JSON.stringify(next), (k, v) => {
  if (k === "video" && typeof v === "number") left++
  return v
})
fs.writeFileSync(outFile, JSON.stringify(next))
console.log({ ...stats, mismatch: stats.mismatch.length, numericLeft: left, made: `${stats.made} refs, ${next.made.length} videos (${made.length} before)` })
if (stats.mismatch.length) console.log(stats.mismatch.slice(0, 20).join("\n"))
process.exit(stats.mismatch.length || left ? 1 : 0)
