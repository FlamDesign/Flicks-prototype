import { useSyncExternalStore } from "react"
import type { FlickRef } from "@/ads/ads"

/**
 * Embeds: a fixed-size slot on a website or app with one code snippet. Like a placement, the Flick
 * inside can be replaced without touching the site; unlike one, embeds are free (no Ad Balance).
 */

export type EmbedHistory = { flick: FlickRef; from: number; to?: number; views: number; clicks: number }
export type Embed = {
  id: string
  name: string
  /** fixed when the embed is made */
  size: string
  flick?: FlickRef
  /** newest first; the first entry is the live Flick (no `to`) */
  history: EmbedHistory[]
  views: number
  clicks: number
  createdAt: number
}
export type EmbedPlatform = "Website" | "iOS" | "Android"
export const EMBED_PLATFORMS: EmbedPlatform[] = ["Website", "iOS", "Android"]

const HOST = "https://flamapp.ai"
/** The code for an embed: tied to the embed, so it never changes when the Flick is replaced. */
export function embedCodeFor(e: Embed, platform: EmbedPlatform): string {
  const [w, h] = e.size.split("×")
  if (platform === "Website")
    return [`<script src="${HOST}/embed.js" async></script>`, `<flam-embed id="${e.id}" style="aspect-ratio:${w}/${h};width:100%"></flam-embed>`].join("\n")
  if (platform === "iOS")
    return [`// Swift Package: https://github.com/flamapp/flicks-ios`, `import FlicksKit`, ``, `let embed = FlickEmbedView(embedId: "${e.id}")`, `embed.aspectRatio = ${w}.0 / ${h}.0`, `view.addSubview(embed)`].join("\n")
  return [`// Gradle: implementation("ai.flamapp:flicks:1.+")`, `import ai.flamapp.flicks.FlickEmbedView`, ``, `val embed = FlickEmbedView(context, embedId = "${e.id}")`, `embed.aspectRatio = ${w}f / ${h}f`, `container.addView(embed)`].join("\n")
}

// ---------- sample data, from the account's own Flicks ----------

const DAY = 86_400_000
const h = (flick: FlickRef, now: number, fromDays: number, toDays: number | undefined, views: number, ctr: number): EmbedHistory => ({
  flick,
  from: now - fromDays * DAY,
  to: toDays === undefined ? undefined : now - toDays * DAY,
  views,
  clicks: Math.round(views * ctr),
})
const withTotals = (e: Omit<Embed, "views" | "clicks">): Embed => ({
  ...e,
  views: e.history.reduce((a, x) => a + x.views, 0),
  clicks: e.history.reduce((a, x) => a + x.clicks, 0),
})
/** Sample embeds built from the account's finished Flicks: up to three, steady figures. */
export function buildSampleEmbeds(flicks: FlickRef[], now = Date.now()): Embed[] {
  const spots = ["Homepage hero", "Product page gallery", "App home banner"]
  return flicks.slice(0, 3).map((f, i) => {
    const earlier = flicks.find((x) => x.size === f.size && x.id !== f.id)
    const live = [5, 9, 14][i]
    const history = [h(f, now, live, undefined, [21_400, 12_300, 30_800][i], [0.034, 0.041, 0.022][i])]
    if (earlier && i === 0) history.push(h(earlier, now, 20, 5, 48_900, 0.027))
    return withTotals({ id: `em_sample${i + 1}`, name: spots[i], size: f.size, flick: f, history, createdAt: now - (i === 0 ? 20 : live) * DAY })
  })
}

// ---------- store ----------

/** empty until the sample is seeded from the account's Flicks (see src/sample-data.ts) or the user adds to it */
let state: { embeds: Embed[] } = { embeds: [] }
const listeners = new Set<() => void>()
const set = (fn: (s: typeof state) => typeof state) => {
  state = fn(state)
  listeners.forEach((l) => l())
}
export const useEmbeds = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )

const uid = () => `em_${Math.random().toString(36).slice(2, 8)}`

export const embeds = {
  /** the sample built from the account's Flicks (dev tools and first load), or nothing at all */
  seed(flicks: FlickRef[]) {
    set(() => ({ embeds: buildSampleEmbeds(flicks) }))
  },
  clear() {
    set(() => ({ embeds: [] }))
  },
  add(e: { name: string; size: string; flick?: FlickRef }) {
    const now = Date.now()
    const embed: Embed = { id: uid(), ...e, history: e.flick ? [{ flick: e.flick, from: now, views: 0, clicks: 0 }] : [], views: 0, clicks: 0, createdAt: now }
    set((s) => ({ embeds: [embed, ...s.embeds] }))
    return embed
  },
  rename(id: string, name: string) {
    set((s) => ({ embeds: s.embeds.map((e) => (e.id === id ? { ...e, name } : e)) }))
  },
  delete(id: string) {
    set((s) => ({ embeds: s.embeds.filter((e) => e.id !== id) }))
  },
  /** put a Flick in the embed; the one it replaces moves to history */
  setFlick(id: string, flick: FlickRef) {
    const now = Date.now()
    set((s) => ({
      embeds: s.embeds.map((e) => {
        if (e.id !== id || e.flick?.id === flick.id) return e
        const history = e.history.map((x, i) => (i === 0 && !x.to ? { ...x, to: now } : x))
        return { ...e, flick, history: [{ flick, from: now, views: 0, clicks: 0 }, ...history] }
      }),
    }))
  },
  /** dev tools: views coming in on the live Flick */
  addViews(id: string, n: number) {
    const clicks = Math.round(n * (0.02 + Math.random() * 0.02))
    set((s) => ({
      embeds: s.embeds.map((e) =>
        e.id !== id
          ? e
          : {
              ...e,
              views: e.views + n,
              clicks: e.clicks + clicks,
              history: e.history.map((x, i) => (i === 0 && !x.to ? { ...x, views: x.views + n, clicks: x.clicks + clicks } : x)),
            },
      ),
    }))
  },
}
