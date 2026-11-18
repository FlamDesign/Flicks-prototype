import * as fmt from "@/lib/format"
import { useSyncExternalStore } from "react"
import type { Flick } from "@/data"
import { getLibrary } from "@/library"

/**
 * Ads: campaigns hold placements. A placement is a fixed-size slot with one tag that never
 * changes; the Flick inside it can be replaced, and every Flick it has held is kept.
 * Serving is charged per 1,000 impressions (any ad that loads) at the CPM of the country
 * those impressions came from, from the Ad Balance (dollars, separate from AI credits).
 */

// ---------- rates and countries ----------

/** Sample CPM rate card, in dollars per 1,000 impressions. Placeholder numbers. */
export const CPM_RATES: { country: string; code: string; cpm: number }[] = [
  { country: "United States", code: "US", cpm: 12 },
  { country: "United Kingdom", code: "GB", cpm: 10 },
  { country: "Canada", code: "CA", cpm: 9 },
  { country: "Australia", code: "AU", cpm: 9 },
  { country: "Japan", code: "JP", cpm: 9 },
  { country: "Germany", code: "DE", cpm: 8 },
  { country: "France", code: "FR", cpm: 7 },
  { country: "United Arab Emirates", code: "AE", cpm: 7 },
  { country: "Singapore", code: "SG", cpm: 7 },
  { country: "Malaysia", code: "MY", cpm: 3 },
  { country: "India", code: "IN", cpm: 2.5 },
  { country: "Thailand", code: "TH", cpm: 2.5 },
  { country: "Indonesia", code: "ID", cpm: 2 },
  { country: "Philippines", code: "PH", cpm: 2 },
  { country: "Vietnam", code: "VN", cpm: 2 },
]
export const OTHER_CPM = 3
export const cpmFor = (code: string) => CPM_RATES.find((r) => r.code === code)?.cpm ?? OTHER_CPM
export const countryName = (code: string) => CPM_RATES.find((r) => r.code === code)?.country ?? "Other countries"

/** Time zones of the rate-card countries, to tell which country someone is signed in from. */
const ZONES: [RegExp, string][] = [
  [/^America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Boise|Indiana|Kentucky)|^Pacific\/Honolulu/, "US"],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina)/, "CA"],
  [/^Europe\/(London|Belfast)/, "GB"],
  [/^Australia\//, "AU"],
  [/^Asia\/Tokyo/, "JP"],
  [/^Europe\/Berlin/, "DE"],
  [/^Europe\/Paris/, "FR"],
  [/^Asia\/Dubai/, "AE"],
  [/^Asia\/Singapore/, "SG"],
  [/^Asia\/(Kuala_Lumpur|Kuching)/, "MY"],
  [/^Asia\/(Kolkata|Calcutta)/, "IN"],
  [/^Asia\/Bangkok/, "TH"],
  [/^Asia\/(Jakarta|Makassar|Jayapura|Pontianak)/, "ID"],
  [/^Asia\/Manila/, "PH"],
  [/^Asia\/(Ho_Chi_Minh|Saigon)/, "VN"],
]
/** Where the person is signed in from (production: the IP country at sign-in; here: the device time zone). */
export function signedInCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return ZONES.find(([re]) => re.test(tz))?.[1] ?? "OTHER"
  } catch {
    return "OTHER"
  }
}

// ---------- platforms and tags ----------

export const PLATFORMS = [
  "The Trade Desk",
  "DV360",
  "Campaign Manager 360",
  "Google Ad Manager",
  "Amazon DSP",
  "Microsoft Invest (Xandr)",
  "Yahoo DSP",
  "StackAdapt",
] as const
export const OTHER_PLATFORM = "Other"

/** Each platform's click and cache-busting macros; unknown platforms get placeholders to replace. */
const MACROS: Record<string, { click: string; cb: string }> = {
  "The Trade Desk": { click: "%%TTD_CLK%%", cb: "%%TTD_CACHEBUSTER%%" },
  DV360: { click: "${CLICK_URL}", cb: "${CACHEBUSTER}" },
  "Campaign Manager 360": { click: "%%CLICK_URL_UNESC%%", cb: "%%CACHEBUSTER%%" },
  "Google Ad Manager": { click: "%%CLICK_URL_UNESC%%", cb: "%%CACHEBUSTER%%" },
  "Microsoft Invest (Xandr)": { click: "${CLICK_URL}", cb: "${CACHEBUSTER}" },
}
export const macrosFor = (platform: string) => MACROS[platform] ?? { click: "[CLICK_URL]", cb: "[CACHEBUSTER]" }
export const knownMacros = (platform: string) => !!MACROS[platform]

export const TAG_FORMATS = ["VAST 4.2", "SIMID", "MRAID 3.0"] as const
export type TagFormat = (typeof TAG_FORMATS)[number]

const AD_HOST = "https://ads.flamapp.ai"
/** The tag for a placement: tied to the placement, so it never changes when the Flick is replaced. */
export function tagFor(p: Placement, format: TagFormat): string {
  const [w, h] = p.size.split("×")
  const { click, cb } = macrosFor(platformLabel(p))
  if (format === "VAST 4.2") return `${AD_HOST}/vast/4.2/${p.id}.xml?click=${click}&cb=${cb}`
  if (format === "SIMID")
    return [
      `<VAST version="4.2">`,
      `  <Ad id="${p.id}">`,
      `    <Wrapper>`,
      `      <AdSystem>Flam</AdSystem>`,
      `      <VASTAdTagURI><![CDATA[${AD_HOST}/vast/4.2/${p.id}.xml?simid=1&cb=${cb}]]></VASTAdTagURI>`,
      `      <Creatives>`,
      `        <Creative>`,
      `          <Linear>`,
      `            <InteractiveCreativeFile type="text/html" apiFramework="SIMID" variableDuration="true">`,
      `              <![CDATA[${AD_HOST}/simid/${p.id}.html?click=${click}]]>`,
      `            </InteractiveCreativeFile>`,
      `          </Linear>`,
      `        </Creative>`,
      `      </Creatives>`,
      `    </Wrapper>`,
      `  </Ad>`,
      `</VAST>`,
    ].join("\n")
  return [
    `<div id="flam-${p.id}" style="width:${w}px;height:${h}px"></div>`,
    `<script src="${AD_HOST}/mraid/3.0/${p.id}.js"`,
    `  data-width="${w}" data-height="${h}"`,
    `  data-click="${click}" data-cb="${cb}" async></script>`,
  ].join("\n")
}

// ---------- model ----------

export type FlickRef = { id: string; name: string; size: string; image: string; editedAt?: number; video?: string; /** the real Flick's share page on the Flicks API: shown in place of the prototype's player */ url?: string }
export type HistoryEntry = { flick: FlickRef; from: number; to?: number; impressions: number; spend: number; clicks: number }
export type Placement = {
  id: string
  campaignId: string
  name: string
  /** fixed when the placement is made */
  size: string
  platform: string
  /** when platform is Other: the name they typed, shown as pending review */
  otherPlatform?: string
  flick?: FlickRef
  /** newest first; the first entry is the live Flick (no `to`) */
  history: HistoryEntry[]
  impressions: number
  spend: number
  clicks: number
  byCountry: Record<string, number>
  createdAt: number
}
export type Campaign = { id: string; name: string; createdAt: number }
export type AdTxn = {
  id: string
  at: number
  kind: "funds" | "spend"
  /** dollars; spend is negative */
  amount: number
  label: string
  country?: string
  placementId?: string
  /** spend: how many impressions it paid for */
  impressions?: number
  /** funds: the invoice for it */
  invoice?: string
}

/** The platform as shown; empty until one is chosen on the placement. */
export const platformLabel = (p: Placement) => (p.platform === OTHER_PLATFORM ? p.otherPlatform || "Other" : p.platform)

export const flickRef = (f: Flick & { remote?: { url?: string } }): FlickRef => ({ id: f.id, name: f.name, size: f.size, image: f.image, editedAt: f.editedAt, video: f.video, ...(f.remote?.url ? { url: f.remote.url } : {}) })
/** Flicks that can go in a placement: ready Flicks of the same size (never projects, nor ones still exporting). */
export const flicksFor = (size: string) => getLibrary().flicks.filter((f) => f.size === size && !f.exporting && f.remote?.status !== "failed").map(flickRef)

// ---------- sample data, from the account's own Flicks ----------

const HOUR = 3_600_000
const DAY = 24 * HOUR
const SAMPLE_PLATFORMS = ["The Trade Desk", "DV360", "Campaign Manager 360", "Amazon DSP"]
const COUNTRY_SETS: Record<string, number>[] = [
  { US: 120_000, GB: 52_000, JP: 38_000, IN: 36_000 },
  { US: 60_000, IN: 200_000, ID: 90_000, AE: 60_000 },
  { US: 40_000, SG: 30_000, JP: 25_000, MY: 42_000 },
  { US: 210_000, CA: 44_000, GB: 31_000 },
  { IN: 150_000, AE: 48_000, SA: 22_000 },
]
/** a steady pseudo-random click-through rate per Flick, 1.2% to 3% */
const sampleCtr = (id: string) => 0.012 + (id.charCodeAt(id.length - 1) % 7) * 0.003
const withTotals = (p: Omit<Placement, "impressions" | "spend" | "clicks">): Placement => {
  const impressions = Object.values(p.byCountry).reduce((a, b) => a + b, 0)
  const spend = Object.entries(p.byCountry).reduce((a, [c, n]) => a + (n / 1000) * cpmFor(c), 0)
  const out: Placement = { ...p, impressions, spend, clicks: 0 }
  // the live Flick's history row in step with the totals; clicks from the sample rate
  const past = out.history.slice(1)
  if (out.history[0]) {
    out.history[0].impressions = Math.max(0, impressions - past.reduce((a, h) => a + h.impressions, 0))
    out.history[0].spend = Math.max(0, spend - past.reduce((a, h) => a + h.spend, 0))
  }
  for (const h of out.history) h.clicks = Math.round(h.impressions * sampleCtr(h.flick.id))
  out.clicks = out.history.reduce((a, h) => a + h.clicks, 0)
  return out
}

/**
 * Sample campaigns and placements built from the account's finished Flicks (the ones the Flicks
 * page shows), so every number on Campaigns, Ad Balance and Analytics points at a real Flick. Up to
 * five placements across two campaigns; a placement's earlier Flick comes from the same size when
 * there is one. Steady pseudo-random figures, so the same Flicks give the same sample every time.
 */
export function buildSampleAds(flicks: FlickRef[], now = Date.now()): { campaigns: Campaign[]; placements: Placement[]; ledger: AdTxn[] } {
  const campaigns: Campaign[] = [
    { id: "c_sample1", name: "Holiday 2026", createdAt: now - 12 * DAY },
    { id: "c_sample2", name: "Always-on retail", createdAt: now - 30 * DAY },
  ]
  const placements: Placement[] = flicks.slice(0, 5).map((f, i) => {
    const earlier = flicks.find((x) => x.size === f.size && x.id !== f.id)
    const age = [11, 9, 2, 30, 16][i]
    const history = earlier && i % 2 === 0 ? [{ flick: f, from: now - Math.round(age * 0.55) * DAY, impressions: 0, spend: 0, clicks: 0 }, { flick: earlier, from: now - age * DAY, to: now - Math.round(age * 0.55) * DAY, impressions: 64_000, spend: 610, clicks: 0 }] : [{ flick: f, from: now - age * DAY, impressions: 0, spend: 0, clicks: 0 }]
    return withTotals({
      id: `pl_sample${i + 1}`,
      campaignId: campaigns[i < 3 ? 0 : 1].id,
      name: `${f.name} · ${f.size}`,
      size: f.size,
      platform: SAMPLE_PLATFORMS[i % SAMPLE_PLATFORMS.length],
      flick: f,
      history,
      byCountry: i === 2 ? {} : COUNTRY_SETS[i % COUNTRY_SETS.length],
      createdAt: now - age * DAY,
    })
  })
  return { campaigns, placements, ledger: sampleLedger(placements, now) }
}

/** the Ad Balance ledger behind sample placements: funds added, then each one's spend by day and country */
function sampleLedger(placements: Placement[], now: number): AdTxn[] {
  const out: AdTxn[] = [
    { id: "t-f3", at: now - 3 * DAY, kind: "funds", amount: 2_000, label: "Funds added", invoice: "FLM-AD-1003" },
    { id: "t-f2", at: now - 14 * DAY, kind: "funds", amount: 5_000, label: "Funds added", invoice: "FLM-AD-1002" },
    { id: "t-f1", at: now - 31 * DAY, kind: "funds", amount: 1_000, label: "Funds added", invoice: "FLM-AD-1001" },
  ]
  let i = 0
  for (const p of placements) {
    const days = Math.max(1, Math.min(14, Math.floor((now - p.createdAt) / DAY)))
    for (const [c, n] of Object.entries(p.byCountry)) {
      const batches = n / 1000
      // uneven days (a steady pseudo-random weight per day and country), in whole batches of 1,000, adding up to the total
      const weights = Array.from({ length: days }, (_, d) => 0.5 + (((d + 3) * 7919 + c.charCodeAt(0) * 31 + c.charCodeAt(1) * 17) % 100) / 100)
      const sum = weights.reduce((a, b) => a + b, 0)
      const shares = weights.map((w) => Math.floor((batches * w) / sum))
      shares[0] += batches - shares.reduce((a, b) => a + b, 0)
      for (let d = 0; d < days; d++) {
        const share = shares[d]
        if (share <= 0) continue
        out.push({
          id: `t-s${i++}`,
          at: now - d * DAY - ((i * 37) % 10) * HOUR - HOUR,
          kind: "spend",
          amount: -(share * cpmFor(c)),
          label: `${(share * 1000).toLocaleString("en-US")} impressions`,
          country: c,
          placementId: p.id,
          impressions: share * 1000,
        })
      }
    }
  }
  return out.sort((a, b) => b.at - a.at)
}

// ---------- store ----------

type AdsState = { campaigns: Campaign[]; placements: Placement[]; ledger: AdTxn[] }
/** empty until the sample is seeded from the account's Flicks (see src/sample-data.ts) or the user adds to it */
let state: AdsState = { campaigns: [], placements: [], ledger: [] }
const listeners = new Set<() => void>()
const set = (fn: (s: AdsState) => AdsState) => {
  state = fn(state)
  listeners.forEach((l) => l())
}
export const useAds = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`

/** Click-through rate as shown: "2.4%", or a dash before any impressions. */
export const ctr = (clicks: number, impressions: number) => (impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—")
/** Average CPM as shown, or a dash before any impressions. */
export const avgCpm = (spend: number, impressions: number) => (impressions ? usd((spend / impressions) * 1000) : "—")

export const ads = {
  /** the sample built from the account's Flicks (dev tools and first load), or nothing at all */
  seed(flicks: FlickRef[]) {
    set(() => buildSampleAds(flicks))
  },
  clear() {
    set(() => ({ campaigns: [], placements: [], ledger: [] }))
  },
  addCampaign(name: string) {
    const c = { id: uid("c"), name, createdAt: Date.now() }
    set((s) => ({ ...s, campaigns: [c, ...s.campaigns] }))
    return c
  },
  renameCampaign(id: string, name: string) {
    set((s) => ({ ...s, campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, name } : c)) }))
  },
  deleteCampaign(id: string) {
    set((s) => ({ ...s, campaigns: s.campaigns.filter((c) => c.id !== id), placements: s.placements.filter((p) => p.campaignId !== id) }))
  },
  addPlacement(p: { campaignId: string; name: string; size: string; platform?: string; otherPlatform?: string; flick?: FlickRef }) {
    const now = Date.now()
    const placement: Placement = {
      id: uid("pl"),
      platform: "",
      ...p,
      history: p.flick ? [{ flick: p.flick, from: now, impressions: 0, spend: 0, clicks: 0 }] : [],
      impressions: 0,
      spend: 0,
      clicks: 0,
      byCountry: {},
      createdAt: now,
    }
    set((s) => ({ ...s, placements: [...s.placements, placement] }))
    return placement
  },
  updatePlacement(id: string, patch: Partial<Pick<Placement, "name" | "platform" | "otherPlatform">>) {
    set((s) => ({ ...s, placements: s.placements.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  },
  deletePlacement(id: string) {
    set((s) => ({ ...s, placements: s.placements.filter((p) => p.id !== id) }))
  },
  /** put a Flick in the placement; the one it replaces moves to history */
  setFlick(id: string, flick: FlickRef) {
    const now = Date.now()
    set((s) => ({
      ...s,
      placements: s.placements.map((p) => {
        if (p.id !== id || p.flick?.id === flick.id) return p
        const history = p.history.map((h, i) => (i === 0 && !h.to ? { ...h, to: now } : h))
        return { ...p, flick, history: [{ flick, from: now, impressions: 0, spend: 0, clicks: 0 }, ...history] }
      }),
    }))
  },
  addFunds(amount: number) {
    set((s) => {
      const n = 1001 + s.ledger.filter((t) => t.kind === "funds").length
      return { ...s, ledger: [{ id: uid("t"), at: Date.now(), kind: "funds", amount, label: "Funds added", invoice: `FLM-AD-${n}` }, ...s.ledger] }
    })
  },
  /** charge one batch of 1,000 impressions from a country; returns the cost */
  serve(placementId: string, country: string) {
    const cost = cpmFor(country)
    // 1% to 3% of the batch click through
    const clicks = 10 + Math.floor(Math.random() * 21)
    set((s) => ({
      ...s,
      placements: s.placements.map((p) =>
        p.id !== placementId
          ? p
          : {
              ...p,
              impressions: p.impressions + 1000,
              spend: p.spend + cost,
              clicks: p.clicks + clicks,
              byCountry: { ...p.byCountry, [country]: (p.byCountry[country] ?? 0) + 1000 },
              history: p.history.map((h, i) => (i === 0 && !h.to ? { ...h, impressions: h.impressions + 1000, spend: h.spend + cost, clicks: h.clicks + clicks } : h)),
            },
      ),
      ledger: [{ id: uid("t"), at: Date.now(), kind: "spend", amount: -cost, label: "1,000 impressions", country, placementId, impressions: 1000 }, ...s.ledger],
    }))
    return cost
  },
}

// ---------- money ----------

export const MIN_FUNDS = 100
export const MAX_FUNDS = 10_000
/** the shared formats (lib/format): $4,212.00 (whole dollars only where cents can't occur), 9,500 · 656K */
export const usd = (n: number, cents = true) =>
  cents ? fmt.usd(n) : `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`
export const compact = fmt.compact
