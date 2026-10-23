import type { FlickRecord } from "@/library"
import type { Placement } from "@/ads/ads"
import type { Embed } from "@/embeds/embeds"
import { GENERATED_VIDEOS } from "@/components/editor/elements"

/**
 * Analytics experiment: sample numbers for every Flick, consistent with what the prototype already
 * shows (a Flick's views by variation, its embeds' views, its placements' impressions and spend).
 * Daily rows for 180 days so any range up to 90 days has a previous period to compare with.
 */

export const DAYS = 180
export const VIDEO_SECONDS = 8
export type Source = "link" | "embed" | "ads"
export const SOURCES: { id: Source; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "embed", label: "Embeds" },
  { id: "ads", label: "Ads" },
]

/** One day of one Flick from one source. `day` 0 is the oldest, DAYS - 1 is today. */
export type Row = { day: number; flickId: string; source: Source; /** "link", a placement id or an embed id */ where: string; loaded: number; played: number; interacted: number; switches: number; clicks: number; watch: number; spend: number }
export type Totals = Omit<Row, "day" | "flickId" | "source" | "where">
export const ZERO: Totals = { loaded: 0, played: 0, interacted: 0, switches: 0, clicks: 0, watch: 0, spend: 0 }

export type VariantStat = { name: string; poster: string; /** the variation's video */ src?: string; view: number; time: number; end: number; click: number }
export type FlickMeta = {
  id: string
  name: string
  size: string
  image: string
  campaign?: string
  created: number
  start: number
  variants: VariantStat[]
  /** share of switches from row variation to column variation */
  matrix: number[][]
  /** share of switches in each half-second of the video */
  timeline: number[]
  devices: { label: string; share: number }[]
  countries: { label: string; share: number }[]
}
export type PlaceMeta = { id: string; name: string; size: string; kind: "placement" | "embed"; campaignId?: string; platform?: string; createdAt: number; current?: string; countries?: { label: string; share: number }[] }
export type CampaignMeta = { id: string; name: string; createdAt: number }
export type Dataset = { rows: Row[]; flicks: FlickMeta[]; campaigns: CampaignMeta[]; places: PlaceMeta[] }

// ---------- a seeded random, so the numbers stay put ----------
function rng(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
const between = (r: () => number, a: number, b: number) => a + (b - a) * r()
const norm = (xs: number[]) => {
  const s = xs.reduce((a, b) => a + b, 0) || 1
  return xs.map((x) => x / s)
}

const DAY_MS = 86_400_000
const dayOf = (t: number) => Math.max(0, Math.min(DAYS - 1, DAYS - 1 - Math.floor((Date.now() - t) / DAY_MS)))

/** Spread `total` over days [from, to], with a weekly rhythm, a gentle trend and some noise. */
function spread(total: number, from: number, to: number, r: () => number, trend: number) {
  const out: number[] = []
  for (let d = from; d <= to; d++) {
    const k = (d - from) / Math.max(1, to - from)
    const weekly = 1 + 0.18 * Math.sin(((d % 7) / 7) * Math.PI * 2)
    // a launch bump in the first days
    const launch = 1 + 0.9 * Math.exp(-(d - from) / 3)
    out.push(weekly * launch * (1 + trend * k) * between(r, 0.8, 1.2))
  }
  return norm(out).map((w) => w * total)
}

export function buildDataset(flicks: FlickRecord[], placements: Placement[], embeds: Embed[], campaigns: CampaignMeta[], mode: "normal" | "empty" | "early" = "normal"): Dataset {
  if (mode === "empty") return { rows: [], flicks: [], campaigns: [], places: [] }
  const rows: Row[] = []
  const metas: FlickMeta[] = []
  const ready = flicks.filter((f) => !f.exporting)

  for (const f of ready) {
    const r = rng(f.id)
    const scale = mode === "early" ? 0.00012 : 1
    // how this Flick behaves
    const playRate = between(r, 0.78, 0.9)
    const interactRate = between(r, 0.2, 0.42)
    const switchesPer = between(r, 1.6, 3.1)
    const ctr = between(r, 0.018, 0.045)
    const watchAvg = between(r, 6, 13)
    const trend = between(r, -0.3, 0.5)

    // per source: when it started, and its all-time volume
    const linkViews = f.variants.reduce((a, v) => a + v.views, 0)
    const linkFrom = Math.min(DAYS - 2, dayOf(f.editedAt) - Math.round(between(r, 30, 140)))
    const embedHist = embeds.flatMap((e) => e.history.filter((h) => h.flick.id === f.id).map((h) => ({ ...h, where: e.id })))
    const adHist = placements.flatMap((p) => p.history.filter((h) => h.flick.id === f.id).map((h) => ({ ...h, where: p.id })))

    const push = (source: Source, where: string, from: number, to: number, played: number, loaded: number, clicks: number, spend: number, intMul: number) => {
      if (played <= 0 || to < from) return
      const pl = spread(played * scale, from, to, r, trend)
      const k = (x: number) => x / played
      pl.forEach((p, i) => {
        const jitter = between(r, 0.9, 1.1)
        const interacted = p * interactRate * intMul * jitter
        rows.push({
          day: from + i,
          flickId: f.id,
          source,
          where,
          played: p,
          loaded: p * k(loaded),
          interacted,
          switches: interacted * switchesPer * between(r, 0.9, 1.1),
          clicks: p * k(clicks) * between(r, 0.85, 1.15),
          watch: p * watchAvg * between(r, 0.92, 1.08),
          spend: p * k(spend),
        })
      })
    }

    push("link", "link", Math.max(0, linkFrom), DAYS - 1, linkViews, linkViews / playRate, linkViews * ctr, 0, 1)
    for (const h of embedHist) push("embed", h.where, dayOf(h.from), h.to ? dayOf(h.to) : DAYS - 1, h.views, h.views / (playRate - 0.06), Math.max(h.clicks, h.views * ctr * 0.8), 0, 1.05)
    for (const h of adHist) {
      const played = h.impressions * between(r, 0.5, 0.62)
      push("ads", h.where, dayOf(h.from), h.to ? dayOf(h.to) : DAYS - 1, played, h.impressions, h.impressions * between(r, 0.011, 0.024), h.spend, 0.72)
    }

    // variations: the starting one gets most views; one other does best on clicks
    const n = f.variants.length
    const star = (f.start + 1 + Math.floor(r() * (n - 1))) % n
    const view = norm(f.variants.map((_, i) => (i === f.start ? 1.6 : 0.6 + r() * 0.5)))
    // some Flicks have a clear winner, others are close
    const close = r() < 0.4
    const clickRate = f.variants.map((_, i) => (i === star ? (close ? between(r, 1.0, 1.06) : between(r, 1.5, 1.9)) : close ? between(r, 0.97, 1.0) : between(r, 0.75, 1.1)))
    const click = norm(view.map((v, i) => v * clickRate[i]))
    const end = norm(f.variants.map((_, i) => (i === star ? 1.5 : i === f.start ? 0.9 : 0.6 + r() * 0.4)))
    const variants = f.variants.map((v, i) => ({ name: v.name, poster: v.poster, src: GENERATED_VIDEOS[v.video]?.mp4, view: view[i], click: click[i], end: end[i], time: between(r, 2.2, 5.5) * (i === star ? 1.25 : 1) }))
    const matrix = f.variants.map((_, a) => norm(f.variants.map((_, b) => (a === b ? 0 : (b === star ? 1.7 : 1) * between(r, 0.6, 1.2)))))
    const timeline = norm(Array.from({ length: VIDEO_SECONDS * 2 }, (_, i) => {
      const t = i / 2
      return 0.15 + Math.exp(-((t - 1.4) ** 2) / 0.5) * 1.1 + Math.exp(-((t - 4.2) ** 2) / 0.9) * 0.7 + r() * 0.08
    }))
    const mob = between(r, 0.55, 0.75)
    const desk = (1 - mob) * between(r, 0.7, 0.85)
    const countries = norm([between(r, 3, 5), between(r, 1, 2.5), between(r, 0.8, 1.8), between(r, 0.6, 1.4), between(r, 0.5, 1.2), between(r, 0.8, 1.5)])
    metas.push({
      id: f.id,
      name: f.name,
      size: f.size,
      image: f.image,
      campaign: f.campaign,
      created: Math.max(0, linkFrom),
      start: f.start,
      variants,
      matrix,
      timeline,
      devices: [
        { label: "Mobile", share: mob },
        { label: "Desktop", share: desk },
        { label: "Tablet", share: 1 - mob - desk },
      ],
      countries: ["United States", "India", "Japan", "United Arab Emirates", "Singapore", "Other"].map((label, i) => ({ label, share: countries[i] })),
    })
  }
  const places: PlaceMeta[] = [
    ...placements.map((p) => {
      const total = Object.values(p.byCountry).reduce((a, b) => a + b, 0) || 1
      return {
        id: p.id,
        name: p.name,
        size: p.size,
        kind: "placement" as const,
        campaignId: p.campaignId,
        platform: p.platform === "Other" ? p.otherPlatform || "Other" : p.platform,
        createdAt: p.createdAt,
        current: p.flick?.id,
        countries: Object.entries(p.byCountry).map(([code, n]) => ({ label: COUNTRY[code] ?? code, share: n / total })).sort((a, b) => b.share - a.share),
      }
    }),
    ...embeds.map((e) => ({ id: e.id, name: e.name, size: e.size, kind: "embed" as const, createdAt: e.createdAt, current: e.flick?.id })),
  ]
  return { rows, flicks: metas, campaigns, places }
}

// ---------- slicing ----------

const COUNTRY: Record<string, string> = { US: "United States", GB: "United Kingdom", JP: "Japan", IN: "India", ID: "Indonesia", AE: "United Arab Emirates", SG: "Singapore", MY: "Malaysia" }

export type Range = 7 | 30 | 90
export type Filter = { range: Range; source: Source | "all"; size: string | "all"; /** compare with the period before */ compare: boolean }

export function sum(rows: Row[]): Totals {
  const t = { ...ZERO }
  for (const x of rows) {
    t.loaded += x.loaded
    t.played += x.played
    t.interacted += x.interacted
    t.switches += x.switches
    t.clicks += x.clicks
    t.watch += x.watch
    t.spend += x.spend
  }
  return t
}

/** rows inside the filter, for the current period (offset 0) or the one before (offset 1) */
export function slice(d: Dataset, f: Filter, offset = 0, flickId?: string, where?: (r: Row) => boolean) {
  const sizes = f.size === "all" ? null : new Set(d.flicks.filter((x) => x.size === f.size).map((x) => x.id))
  const to = DAYS - 1 - offset * f.range
  const from = to - f.range + 1
  return d.rows.filter((x) => x.day >= from && x.day <= to && (f.source === "all" || x.source === f.source) && (!sizes || sizes.has(x.flickId)) && (!flickId || x.flickId === flickId) && (!where || where(x)))
}

/** daily series of a measure across the current period */
export function daily(rows: Row[], f: Filter, measure: (t: Totals) => number, offset = 0) {
  const to = DAYS - 1 - offset * f.range
  const from = to - f.range + 1
  const byDay = new Map<number, Row[]>()
  for (const x of rows) byDay.set(x.day, [...(byDay.get(x.day) ?? []), x])
  return Array.from({ length: f.range }, (_, i) => {
    const day = from + i
    return { day, value: measure(sum(byDay.get(day) ?? [])) }
  })
}

// ---------- measures ----------
export const rate = (a: number, b: number) => (b > 0 ? a / b : 0)
export const M = {
  views: (t: Totals) => t.played,
  interaction: (t: Totals) => rate(t.interacted, t.played),
  switchesPerView: (t: Totals) => rate(t.switches, t.played),
  ctr: (t: Totals) => rate(t.clicks, t.played),
  watch: (t: Totals) => rate(t.watch, t.played),
  costPerInteraction: (t: Totals) => rate(t.spend, t.interacted),
}

/** Is the leading variation's click rate really ahead of the runner-up? (two-proportion z-test) */
export function leader(meta: FlickMeta, t: Totals) {
  const stats = meta.variants.map((v, i) => {
    const views = t.played * v.view
    const clicks = t.clicks * v.click
    return { i, name: v.name, views, clicks, ctr: rate(clicks, views) }
  })
  const [a, b] = [...stats].sort((x, y) => y.ctr - x.ctr)
  if (!a || !b || a.views < 1) return { best: a, runnerUp: b, confidence: 0, lift: 0 }
  const p = (a.clicks + b.clicks) / (a.views + b.views)
  const se = Math.sqrt(p * (1 - p) * (1 / a.views + 1 / b.views))
  const z = se > 0 ? (a.ctr - b.ctr) / se : 0
  return { best: a, runnerUp: b, confidence: normCdf(z), lift: rate(a.ctr - b.ctr, b.ctr) }
}
function normCdf(z: number) {
  // Abramowitz-Stegun
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

// ---------- formatting ----------
export const fmtInt = (n: number) => Math.round(n).toLocaleString()
export const fmtCompact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : n >= 10_000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(Math.round(n)))
export const fmtPct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`
export const fmtUsd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const fmtSec = (n: number) => `${n.toFixed(1)}s`
export const change = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : null)
/** the period's first and last day, and the period before it */
export function periodLabel(range: number, offset = 0) {
  const to = DAYS - 1 - offset * range
  return `${dayLabel(to - range + 1)} – ${dayLabel(to)}`
}
export const dayLabel = (day: number) => new Date(Date.now() - (DAYS - 1 - day) * DAY_MS).toLocaleDateString(undefined, { month: "short", day: "numeric" })
