import type { FlickRecord } from "@/library"
import { cpmFor, countryName, CPM_RATES, type Campaign, type Placement } from "@/ads/ads"
import type { Embed } from "@/embeds/embeds"
import type { DateFilterValue } from "@/components/ui-extra/date-filter"

/**
 * Analytics V1 data, shaped like the events the player sends and the 5-minute aggregation builds:
 * - impression: one per session (shown as Views; Impressions where it's an ad)
 * - interaction: a switch between variations or a CTA click, each tagged with the variation
 * - heartbeat: every 2s while it plays, tagged with the variation on screen (dwell time)
 * Every row carries the ids (Flick, campaign, placement or embed, template) and a country split.
 * Sample numbers follow what the rest of the prototype already shows for each Flick, embed and placement.
 */

export const DAYS = 120
export const HEARTBEAT_SECONDS = 2
export const AGGREGATE_MINUTES = 5
export type Source = "link" | "embed" | "ads"
export const SOURCES: { id: Source; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "embed", label: "Embeds" },
  { id: "ads", label: "Ads" },
]

/** country code → [share of views, share of spend] */
export type Geo = Record<string, [number, number]>
/** One day of one Flick in one place. `day` DAYS - 1 is today (so far). */
export type Row = {
  day: number
  flickId: string
  source: Source
  /** "link", a placement id or an embed id */
  where: string
  campaignId?: string
  templateId?: string
  views: number
  switches: number
  clicks: number
  /** seconds, from heartbeats */
  dwell: number
  spend: number
  geo: Geo
}
export type Totals = { views: number; switches: number; clicks: number; dwell: number; spend: number }
export const ZERO: Totals = { views: 0, switches: 0, clicks: 0, dwell: 0, spend: 0 }
export const interactions = (t: Totals) => t.switches + t.clicks

/** Per variation: its share of switches into it, of CTA clicks and of watch time. */
export type VariantMeta = { name: string; poster: string; sw: number; ck: number; dw: number }
export type FlickMeta = { id: string; name: string; size: string; image: string; start: number; variants: VariantMeta[] }
export type PlaceMeta = { id: string; name: string; size: string; kind: "placement" | "embed"; campaignId?: string; platform?: string; current?: string }
export type Dataset = { rows: Row[]; flicks: FlickMeta[]; campaigns: Campaign[]; places: PlaceMeta[]; countries: { code: string; name: string }[]; updatedAt: number }

// ---------- seeded random, so numbers stay put ----------
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
const frac = (x: number) => x - Math.floor(x)

// ---------- time ----------
export const DAY_MS = 86_400_000
export const TODAY = DAYS - 1
const midnight = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
/** the date a day index stands for */
export const dateOf = (day: number) => new Date(midnight() - (TODAY - day) * DAY_MS)
const dayOf = (t: number) => Math.max(0, Math.min(TODAY, TODAY - Math.max(0, Math.ceil((midnight() - t) / DAY_MS))))

/** Share of a day's views in each hour: quiet nights, a lunch bump and an evening peak, a little different each day. */
const BASE_HOURS = Array.from({ length: 24 }, (_, h) => 0.12 + 0.9 * Math.exp(-((h - 13) ** 2) / 8) + 1.2 * Math.exp(-((h - 20.5) ** 2) / 6) + 0.35 * Math.exp(-((h - 8.5) ** 2) / 3))
const hourCache = new Map<number, number[]>()
export function hoursOf(day: number) {
  let w = hourCache.get(day)
  if (!w) {
    w = norm(BASE_HOURS.map((b, h) => b * (0.85 + 0.3 * frac(Math.sin(day * 12.9898 + h * 78.233) * 43758.5453))))
    hourCache.set(day, w)
  }
  return w
}
/** how much of a day's views happen by the current time of day */
export function elapsed(day: number) {
  const now = new Date()
  const h = now.getHours() + now.getMinutes() / 60
  const w = hoursOf(day)
  let s = 0
  for (let i = 0; i < 24; i++) s += w[i] * Math.max(0, Math.min(1, h - i))
  return Math.max(0.01, s)
}

/** Spread `total` over days [from, to] with a weekly rhythm, a launch bump, a trend and noise. */
function spread(total: number, from: number, to: number, r: () => number, trend: number) {
  const out: number[] = []
  for (let d = from; d <= to; d++) {
    const k = (d - from) / Math.max(1, to - from)
    const dow = dateOf(d).getDay()
    const weekly = dow === 0 || dow === 6 ? 1.15 : 1
    const launch = 1 + 0.9 * Math.exp(-(d - from) / 3)
    out.push(weekly * launch * (1 + trend * k) * between(r, 0.8, 1.2))
  }
  return norm(out).map((w) => w * total)
}

const LINK_COUNTRIES = ["US", "IN", "JP", "AE", "SG", "GB", "ID"]

export function buildDataset(flicks: FlickRecord[], placements: Placement[], embeds: Embed[], campaigns: Campaign[]): Dataset {
  const rows: Row[] = []
  const metas: FlickMeta[] = []
  const ready = flicks.filter((f) => !f.exporting)
  const todayPart = elapsed(TODAY)

  for (const f of ready) {
    const r = rng(f.id)
    const switchesPer = between(r, 0.5, 1.3)
    const ctr = between(r, 0.014, 0.04)
    const dwellAvg = between(r, 5.5, 11)
    const trend = between(r, -0.3, 0.5)
    // its link's audience by country
    const lw = norm(LINK_COUNTRIES.map((_, i) => (i === 0 ? between(r, 3, 5) : between(r, 0.4, 2) * (1 - i / 9))))
    const linkGeo: Geo = Object.fromEntries(LINK_COUNTRIES.map((c, i) => [c, [lw[i], 0]]))

    const push = (source: Source, where: string, from: number, to: number, views: number, spend: number, geo: Geo, extra: { campaignId?: string; mul: number }) => {
      if (views <= 0 || to < from) return
      const vs = spread(views, from, to, r, trend)
      const spendPerView = spend / views
      vs.forEach((v0, i) => {
        const day = from + i
        // today is still going: only the views so far
        const v = day === TODAY ? v0 * todayPart : v0
        const j = () => between(r, 0.9, 1.1)
        rows.push({
          day,
          flickId: f.id,
          source,
          where,
          campaignId: extra.campaignId,
          views: v,
          switches: v * switchesPer * extra.mul * j(),
          clicks: v * ctr * extra.mul * j(),
          dwell: v * dwellAvg * j(),
          spend: v * spendPerView,
          geo,
        })
      })
    }

    const linkViews = f.variants.reduce((a, v) => a + v.views, 0)
    const linkFrom = Math.max(0, Math.min(DAYS - 2, dayOf(f.editedAt) - Math.round(between(r, 20, 90))))
    push("link", "link", linkFrom, TODAY, linkViews, 0, linkGeo, { mul: 1 })
    for (const e of embeds)
      for (const h of e.history.filter((x) => x.flick.id === f.id)) push("embed", e.id, dayOf(h.from), h.to ? dayOf(h.to) : TODAY, h.views, 0, linkGeo, { mul: 1.05 })
    for (const p of placements) {
      // the placement's country split: views by impressions, spend by each country's CPM
      const total = Object.values(p.byCountry).reduce((a, b) => a + b, 0) || 1
      const cost = Object.entries(p.byCountry).reduce((a, [c, n]) => a + n * cpmFor(c), 0) || 1
      const geo: Geo = Object.fromEntries(Object.entries(p.byCountry).map(([c, n]) => [c, [n / total, (n * cpmFor(c)) / cost]]))
      for (const h of p.history.filter((x) => x.flick.id === f.id)) push("ads", p.id, dayOf(h.from), h.to ? dayOf(h.to) : TODAY, h.impressions, h.spend, geo, { campaignId: p.campaignId, mul: 0.7 })
    }

    // variations: the starting one holds attention, one other gets the most clicks
    const n = f.variants.length
    const star = (f.start + 1 + Math.floor(r() * Math.max(1, n - 1))) % n
    const close = r() < 0.4
    const sw = norm(f.variants.map((_, i) => (i === f.start ? 0.35 : i === star ? 1.4 : between(r, 0.7, 1.1))))
    const dw = norm(f.variants.map((_, i) => (i === f.start ? 1.7 : i === star ? 1.2 : between(r, 0.6, 0.9))))
    const ck = norm(f.variants.map((_, i) => (i === star ? (close ? 1.05 : 1.8) : i === f.start ? 0.9 : between(r, 0.7, 1))))
    metas.push({ id: f.id, name: f.name, size: f.size, image: f.image, start: f.start, variants: f.variants.map((v, i) => ({ name: v.name, poster: v.poster, sw: sw[i], ck: ck[i], dw: dw[i] })) })
  }

  const countries = [...new Set(rows.flatMap((x) => Object.keys(x.geo)))].map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name))
  const places: PlaceMeta[] = [
    ...placements.map((p) => ({ id: p.id, name: p.name, size: p.size, kind: "placement" as const, campaignId: p.campaignId, platform: p.platform === "Other" ? p.otherPlatform || "Other" : p.platform, current: p.flick?.id })),
    ...embeds.map((e) => ({ id: e.id, name: e.name, size: e.size, kind: "embed" as const, current: e.flick?.id })),
  ]
  // numbers refresh every few minutes: they're as of the last run
  const updatedAt = Math.floor(Date.now() / (AGGREGATE_MINUTES * 60_000)) * AGGREGATE_MINUTES * 60_000
  return { rows, flicks: metas, campaigns, places, countries, updatedAt }
}

// ---------- periods (the app's date filter: All period, Today, Last 7 / 30 days, or a custom range) ----------

/** days [from, to]; `part` is how much of the day `to` counts (1 = all of it) */
export type Span = { from: number; to: number; part: number }

const dayIndex = (d: Date) => {
  const m = new Date(d)
  m.setHours(0, 0, 0, 0)
  return Math.max(0, Math.min(TODAY, TODAY - Math.round((midnight() - m.getTime()) / DAY_MS)))
}

export function spanOf(v: DateFilterValue): Span {
  if (v.preset === "today") return { from: TODAY, to: TODAY, part: 1 }
  if (v.preset === "7") return { from: TODAY - 6, to: TODAY, part: 1 }
  if (v.preset === "30") return { from: TODAY - 29, to: TODAY, part: 1 }
  if (v.preset === "custom" && v.from) {
    const from = dayIndex(v.from)
    const to = dayIndex(v.to ?? v.from)
    return { from: Math.min(from, to), to: Math.max(from, to), part: 1 }
  }
  return { from: 0, to: TODAY, part: 1 }
}

/** One day is charted by hour; anything longer by day. */
export const hourly = (s: Span) => s.from === s.to

const fmtDate = (day: number, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) => dateOf(day).toLocaleDateString(undefined, opts)
export function spanName(s: Span, v?: DateFilterValue) {
  if (v?.preset === "today") return "Today"
  if (v?.preset === "7") return "Last 7 days"
  if (v?.preset === "30") return "Last 30 days"
  if (v?.preset === "all") return "All period"
  return s.from === s.to ? fmtDate(s.from, { weekday: "short", month: "short", day: "numeric" }) : `${fmtDate(s.from)} – ${fmtDate(s.to)}`
}
export function spanLabel(s: Span) {
  const so = s.to === TODAY ? (s.from === s.to ? ", so far" : " (today so far)") : ""
  if (s.from === s.to) return `${fmtDate(s.from, { weekday: "short", month: "short", day: "numeric" })}${so}`
  return `${fmtDate(s.from)} – ${fmtDate(s.to)}${so}`
}

/** Chart buckets: hours for one day, days otherwise. */
export function buckets(s: Span) {
  if (hourly(s)) return Array.from({ length: 24 }, (_, h) => new Date(2026, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" }))
  return Array.from({ length: s.to - s.from + 1 }, (_, i) => fmtDate(s.from + i))
}

// ---------- filtering and totals ----------

export type Scope = { source?: Source; flickId?: string; where?: string; campaignId?: string }
export type Filter = { range: DateFilterValue; country: string }

export function pick(d: Dataset, s: Span, scope: Scope = {}) {
  return d.rows.filter((x) => x.day >= s.from && x.day <= s.to && (!scope.source || x.source === scope.source) && (!scope.flickId || x.flickId === scope.flickId) && (!scope.where || x.where === scope.where) && (!scope.campaignId || x.campaignId === scope.campaignId))
}

export function sum(rows: Row[], country = "all", s?: Span): Totals {
  const t = { ...ZERO }
  for (const x of rows) {
    const g = country === "all" ? null : x.geo[country]
    if (country !== "all" && !g) continue
    const w = s && x.day === s.to ? s.part : 1
    const v = (g ? g[0] : 1) * w
    t.views += x.views * v
    t.switches += x.switches * v
    t.clicks += x.clicks * v
    t.dwell += x.dwell * v
    t.spend += x.spend * (g ? g[1] : 1) * w
  }
  return t
}

/** A measure per bucket of the span; hours come from each day's hourly pattern. Buckets after now are left out. */
export function series(rows: Row[], s: Span, country: string, measure: (t: Totals) => number) {
  if (hourly(s)) {
    const day = s.from
    const t = sum(rows.filter((x) => x.day === day), country)
    const w = hoursOf(day)
    // today's rows hold the day so far: scale back to a full day, then keep the hours that have passed
    const full = day === TODAY ? elapsed(day) : 1
    const now = new Date()
    const last = day === TODAY ? now.getHours() : 23
    return Array.from({ length: last + 1 }, (_, h) => {
      const k = (w[h] / full) * (day === TODAY && h === last ? now.getMinutes() / 60 : 1)
      return measure({ views: t.views * k, switches: t.switches * k, clicks: t.clicks * k, dwell: t.dwell * k, spend: t.spend * k })
    })
  }
  const byDay = new Map<number, Row[]>()
  for (const x of rows) byDay.set(x.day, [...(byDay.get(x.day) ?? []), x])
  return Array.from({ length: s.to - s.from + 1 }, (_, i) => measure(sum(byDay.get(s.from + i) ?? [], country)))
}

/** Totals per key in one pass (a Flick, a place, a campaign…); rows without a key are skipped. */
export function groupTotals(rows: Row[], country: string, key: (r: Row) => string | undefined) {
  const byKey = new Map<string, Row[]>()
  for (const x of rows) {
    const k = key(x)
    if (k === undefined) continue
    const list = byKey.get(k)
    if (list) list.push(x)
    else byKey.set(k, [x])
  }
  const out = new Map<string, Totals>()
  for (const [k, list] of byKey) out.set(k, sum(list, country))
  return out
}

// ---------- measures ----------
export const rate = (a: number, b: number) => (b > 0 ? a / b : 0)

/** Per variation of one Flick, within the given totals. Shown = sessions that saw it: all of them for the starting one, plus switches into it. */
export function variantStats(meta: FlickMeta, t: Totals) {
  return meta.variants.map((v, i) => {
    const switchesIn = t.switches * v.sw
    const shown = (i === meta.start ? t.views : 0) + switchesIn
    const clicks = t.clicks * v.ck
    const dwell = t.dwell * v.dw
    return { i, name: v.name, poster: v.poster, shown, switchesIn, clicks, interactions: switchesIn + clicks, dwell, ctr: rate(clicks, shown), avgDwell: rate(dwell, shown) }
  })
}

/** Is the leading variation's click rate really ahead of the runner-up? (two-proportion z-test) */
export function leader(meta: FlickMeta, t: Totals) {
  const stats = variantStats(meta, t)
  const [a, b] = [...stats].sort((x, y) => y.ctr - x.ctr)
  if (!a || !b || a.shown < 1 || b.shown < 1) return { best: a, runnerUp: b, confidence: 0 }
  const p = (a.clicks + b.clicks) / (a.shown + b.shown)
  const se = Math.sqrt(p * (1 - p) * (1 / a.shown + 1 / b.shown))
  const z = se > 0 ? (a.ctr - b.ctr) / se : 0
  return { best: a, runnerUp: b, confidence: normCdf(z) }
}
function normCdf(z: number) {
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
/** money that can get large: $4,021.33, then $188K, $1.2M */
export const fmtUsdShort = (n: number) => (Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : Math.abs(n) >= 10_000 ? `$${Math.round(n / 1000)}K` : fmtUsd(n))
export const fmtSec = (n: number) => `${n.toFixed(1)}s`
/** total watch time, in the largest unit that reads well */
export const fmtDuration = (s: number) => (s >= 36_000 ? `${fmtInt(s / 3600)} h` : s >= 3600 ? `${(s / 3600).toFixed(1)} h` : s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)}s`)
export const ago = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60_000))
  return m < 1 ? "just now" : `${m} min ago`
}

// ---------- a large account, to see every list at scale ----------

const PRODUCTS = ["sneaker drop", "camera bundle", "latte menu", "skincare set", "rain jacket", "trail shoes", "smart speaker", "denim fit", "pizza night", "snack pack", "lager six-pack", "gown edit", "sofa range", "lens switch", "running tee", "headphones", "lamp collection", "watch strap", "sun cream", "travel bag"]
const MOODS = ["Holiday", "Spring", "Summer", "Fall", "Winter", "Weekend", "Flash sale", "Launch", "Back to school", "Game day", "New season", "Limited"]
const SIZES = ["1080×1920", "1080×1080", "1920×1080", "300×250", "320×480", "970×250"]
const PLATFORMS = ["DV360", "The Trade Desk", "Amazon DSP", "Xandr", "Yahoo DSP"]
const SLOTS = ["MREC", "Billboard", "Interstitial", "Stories", "Feed square", "Leaderboard", "Rail", "Takeover"]
const PAGES = ["Homepage hero", "Product gallery", "Blog inline", "Lookbook", "Checkout upsell", "Store locator", "Recipe page", "Landing page"]
const REGIONS = ["US", "UK", "APAC", "Japan", "India", "UAE", "Europe", "LATAM", "Canada", "SEA"]
const GOALS = ["Awareness", "Launch", "Retargeting", "Always on", "Promo", "Seasonal"]

/**
 * About 250 Flicks, 60 campaigns with 400 placements and 80 embeds, with the same shape of numbers as the sample.
 * Images and variations reuse the sample Flicks' so it still looks real.
 */
export function buildLargeDataset(base: Dataset): Dataset {
  const r = rng("large-account")
  const pickOf = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const codes = CPM_RATES.map((c) => c.code)
  const geos: Geo[] = Array.from({ length: 12 }, () => {
    const w = norm(codes.map((_, i) => (i === 0 ? between(r, 2, 6) : between(r, 0.05, 1.6) * (r() < 0.25 ? 0 : 1))))
    const cost = codes.reduce((a, c, i) => a + w[i] * cpmFor(c), 0) || 1
    return Object.fromEntries(codes.map((c, i) => [c, [w[i], (w[i] * cpmFor(c)) / cost]]).filter(([, v]) => (v as number[])[0] > 0))
  })
  const samples = base.flicks.length ? base.flicks : []
  const flicks: FlickMeta[] = Array.from({ length: 250 }, (_, i) => {
    const s = samples[i % Math.max(1, samples.length)]
    const name = `${pickOf(MOODS)} ${pickOf(PRODUCTS)}${i >= 200 ? ` ${i - 199}` : ""}`
    return { id: `lf${i}`, name: name[0].toUpperCase() + name.slice(1), size: pickOf(SIZES), image: s?.image ?? "", start: s?.start ?? 0, variants: s?.variants ?? [] }
  }).filter((f) => f.variants.length)
  const campaigns: Campaign[] = Array.from({ length: 60 }, (_, i) => ({ id: `lc${i}`, name: `${pickOf(REGIONS)} ${pickOf(GOALS)} ${2025 + (i % 2)}${i >= 40 ? ` · ${i - 39}` : ""}`, createdAt: Date.now() - between(r, 5, 110) * DAY_MS }))
  const places: PlaceMeta[] = []
  const rows: Row[] = []
  const todayPart = elapsed(TODAY)
  const push = (f: FlickMeta, source: Source, where: string, from: number, to: number, views: number, cpm: number, geo: Geo, campaignId?: string) => {
    const fr = rng(f.id + where)
    const switchesPer = between(fr, 0.5, 1.3)
    const ctr = between(fr, 0.012, 0.04)
    const dwellAvg = between(fr, 5, 11)
    const mul = source === "ads" ? 0.7 : 1
    spread(views, from, to, fr, between(fr, -0.3, 0.5)).forEach((v0, i) => {
      const day = from + i
      const v = day === TODAY ? v0 * todayPart : v0
      rows.push({ day, flickId: f.id, source, where, campaignId, views: v, switches: v * switchesPer * mul, clicks: v * ctr * mul, dwell: v * dwellAvg, spend: (v / 1000) * cpm, geo })
    })
  }
  // links: most Flicks are shared; a long tail gets very few views, some none in recent weeks
  flicks.forEach((f, i) => {
    if (r() < 0.12) return
    const from = Math.floor(between(r, 0, DAYS - 10))
    const to = r() < 0.2 ? Math.min(TODAY, from + Math.floor(between(r, 5, 40))) : TODAY
    push(f, "link", "link", from, to, Math.round(between(r, 200, 60_000) * (i < 30 ? 3 : 1)), 0, pickOf(geos))
  })
  // placements, 400 across the campaigns; some never got a Flick
  for (let i = 0; i < 400; i++) {
    const c = campaigns[i < 60 ? i : Math.floor(r() * campaigns.length)]
    const size = pickOf(SIZES)
    const id = `lp${i}`
    const fits = flicks.filter((f) => f.size === size)
    const empty = r() < 0.08 || !fits.length
    let current: string | undefined
    if (!empty) {
      const geo = pickOf(geos)
      const cpm = Object.entries(geo).reduce((a, [code, [v]]) => a + v * cpmFor(code), 0)
      let from = Math.floor(between(r, 0, DAYS - 20))
      const n = 1 + Math.floor(r() * 3)
      for (let k = 0; k < n && from <= TODAY; k++) {
        const f = pickOf(fits)
        const last = k === n - 1
        const ended = last && r() < 0.25
        const to = last ? (ended ? Math.min(TODAY, from + Math.floor(between(r, 7, 30))) : TODAY) : Math.min(TODAY, from + Math.floor(between(r, 7, 30)))
        push(f, "ads", id, from, to, Math.round(between(r, 2_000, 180_000)), cpm, geo, c.id)
        if (last && !ended) current = f.id
        from = to + 1
      }
    }
    places.push({ id, name: `${pickOf(SLOTS)} ${size}`, size, kind: "placement", campaignId: c.id, platform: pickOf(PLATFORMS), current })
  }
  // embeds
  for (let i = 0; i < 80; i++) {
    const id = `le${i}`
    const size = pickOf(SIZES)
    const f = pickOf(flicks)
    const from = Math.floor(between(r, 0, DAYS - 10))
    const live = r() > 0.15
    push(f, "embed", id, from, live ? TODAY : Math.min(TODAY, from + 20), Math.round(between(r, 300, 50_000)), 0, pickOf(geos))
    places.push({ id, name: `${pickOf(PAGES)}${i >= PAGES.length ? ` ${Math.floor(i / PAGES.length) + 1}` : ""}`, size, kind: "embed", current: live ? f.id : undefined })
  }
  const countries = [...new Set(rows.flatMap((x) => Object.keys(x.geo)))].map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name))
  return { rows, flicks, campaigns, places, countries, updatedAt: base.updatedAt }
}
