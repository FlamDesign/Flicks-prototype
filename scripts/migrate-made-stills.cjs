#!/usr/bin/env node
/**
 * One-time migration: made videos' stills saved inside the library as data: images become files
 * on the AI server (the library then holds only their addresses, so every save is small).
 *
 * FP=<passcode> node scripts/migrate-made-stills.cjs <state.json> <out.json>
 * Reads the saved copy, uploads each data: still (purpose "app": not shown in Assets), writes the
 * new copy. Nothing is sent to the store; PUT the output when the counts look right.
 */
const fs = require("fs")

const [, , inFile, outFile] = process.argv
const W = process.env.WORKER || "https://flicks-ai.flick-prototype.workers.dev"
const FP = process.env.FP
if (!inFile || !outFile || !FP) {
  console.error("usage: FP=<passcode> migrate-made-stills.cjs <state.json> <out.json>")
  process.exit(2)
}
const state = JSON.parse(fs.readFileSync(inFile, "utf8"))

async function upload(dataUrl, name) {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/s)
  if (!m) throw new Error("not a base64 image")
  const bytes = Buffer.from(m[2], "base64")
  const q = new URLSearchParams({ name })
  const res = await fetch(`${W}/upload?${q}`, { method: "POST", headers: { "content-type": m[1], "x-flicks-pass": FP }, body: bytes })
  if (!res.ok) throw new Error(`upload ${res.status} ${await res.text()}`)
  const { url } = await res.json()
  return `${url}${m[1] === "image/png" ? ".png" : m[1] === "image/webp" ? ".webp" : ".jpg"}`
}

;(async () => {
  let done = 0, failed = 0, skipped = 0
  for (const v of state.made ?? []) {
    if (typeof v.poster !== "string" || !v.poster.startsWith("data:")) {
      skipped++
      continue
    }
    try {
      v.poster = await upload(v.poster, `${v.name} still`)
      done++
    } catch (e) {
      failed++
      console.error("kept as data:", v.name, String(e).slice(0, 120))
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(state))
  console.log({ uploaded: done, failed, alreadyFiles: skipped, sizeKB: Math.round(JSON.stringify(state).length / 1024) })
  process.exit(failed ? 1 : 0)
})()
