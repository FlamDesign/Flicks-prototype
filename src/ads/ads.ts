import { useSyncExternalStore } from "react"
import { FLICKS, type Flick } from "@/data"
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

export type FlickRef = { id: string; name: string; size: string; image: string; editedAt?: number; video?: number }
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

export const flickRef = (f: Flick): FlickRef => ({ id: f.id, name: f.name, size: f.size, image: f.image, editedAt: f.editedAt, video: f.video })
/** Flicks that can go in a placement: ready Flicks of the same size (never projects, nor ones still exporting). */
export const flicksFor = (size: string) => getLibrary().flicks.filter((f) => f.size === size && !f.exporting).map(flickRef)

// ---------- sample data ----------

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW = Date.now()
const byId = (id: string) => flickRef(FLICKS.find((f) => f.id === id)!)

const SAMPLE_CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Holiday 2026", createdAt: NOW - 12 * DAY },
  { id: "c2", name: "Spring launch", createdAt: NOW - 30 * DAY },
]
const mk = (p: Omit<Placement, "impressions" | "spend" | "clicks">): Placement => {
  const impressions = Object.values(p.byCountry).reduce((a, b) => a + b, 0)
  const spend = Object.entries(p.byCountry).reduce((a, [c, n]) => a + (n / 1000) * cpmFor(c), 0)
  return { ...p, impressions, spend, clicks: 0 }
}
const SAMPLE_PLACEMENTS: Placement[] = [
  mk({
    id: "pl_8f2k1a",
    campaignId: "c1",
    name: "Living room hero 16:9",
    size: "1920×1080",
    platform: "The Trade Desk",
    flick: byId("f1"),
    history: [
      { flick: byId("f1"), from: NOW - 6 * DAY, impressions: 182_000, spend: 1_786, clicks: 0 },
      { flick: byId("f9"), from: NOW - 11 * DAY, to: NOW - 6 * DAY, impressions: 64_000, spend: 610, clicks: 0 },
    ],
    byCountry: { US: 120_000, GB: 52_000, JP: 38_000, IN: 36_000 },
    createdAt: NOW - 11 * DAY,
  }),
  mk({
    id: "pl_3m9q7c",
    campaignId: "c1",
    name: "Camera bundle MREC",
    size: "300×250",
    platform: "DV360",
    flick: byId("f4"),
    history: [{ flick: byId("f4"), from: NOW - 9 * DAY, impressions: 410_000, spend: 1_520, clicks: 0 }],
    byCountry: { US: 60_000, IN: 200_000, ID: 90_000, AE: 60_000 },
    createdAt: NOW - 9 * DAY,
  }),
  mk({
    id: "pl_5t1w4d",
    campaignId: "c1",
    name: "Stories 9:16",
    size: "1080×1920",
    platform: OTHER_PLATFORM,
    otherPlatform: "Moloco",
    history: [],
    byCountry: {},
    createdAt: NOW - 2 * DAY,
  }),
  mk({
    id: "pl_7r6y2e",
    campaignId: "c2",
    name: "Square feed",
    size: "1080×1080",
    platform: "Campaign Manager 360",
    flick: byId("f3"),
    history: [
      { flick: byId("f3"), from: NOW - 18 * DAY, impressions: 96_000, spend: 820, clicks: 0 },
      { flick: byId("f10"), from: NOW - 30 * DAY, to: NOW - 18 * DAY, impressions: 41_000, spend: 330, clicks: 0 },
    ],
    byCountry: { US: 40_000, SG: 30_000, JP: 25_000, MY: 42_000 },
    createdAt: NOW - 30 * DAY,
  }),
]
// a steady sample click-through rate per Flick, 1.2% to 3%
const sampleCtr = (id: string) => 0.012 + (id.charCodeAt(id.length - 1) % 7) * 0.003
// keep each live Flick's history row in step with the placement's totals; clicks from the sample rate
for (const p of SAMPLE_PLACEMENTS) {
  const past = p.history.slice(1)
  if (p.history[0]) {
    p.history[0].impressions = Math.max(0, p.impressions - past.reduce((a, h) => a + h.impressions, 0))
    p.history[0].spend = Math.max(0, p.spend - past.reduce((a, h) => a + h.spend, 0))
  }
  for (const h of p.history) h.clicks = Math.round(h.impressions * sampleCtr(h.flick.id))
  p.clicks = p.history.reduce((a, h) => a + h.clicks, 0)
}

const sampleLedger = (): AdTxn[] => {
  const out: AdTxn[] = [
    { id: "t-f3", at: NOW - 3 * DAY, kind: "funds", amount: 2_000, label: "Funds added", invoice: "FLM-AD-1003" },
    { id: "t-f2", at: NOW - 14 * DAY, kind: "funds", amount: 5_000, label: "Funds added", invoice: "FLM-AD-1002" },
    { id: "t-f1", at: NOW - 31 * DAY, kind: "funds", amount: 1_000, label: "Funds added", invoice: "FLM-AD-1001" },
  ]
  // spend, summarised by day and country: each placement's impressions spread over the days it has run
  let i = 0
  for (const p of SAMPLE_PLACEMENTS) {
    const days = Math.max(1, Math.min(14, Math.floor((NOW - p.createdAt) / DAY)))
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
          at: NOW - d * DAY - ((i * 37) % 10) * HOUR - HOUR,
          kind: "spend",
          amount: -(share * cpmFor(c)),
          label: `${(share * 1000).toLocaleString()} impressions`,
          country: c,
          placementId: p.id,
          impressions: share * 1000,
        })
      }
    }
  }
  return out.sort((a, b) => b.at - a.at)
}
/** The sample balance: funds added minus spend. */
export const SAMPLE_BALANCE = Math.round(sampleLedger().reduce((a, t) => a + t.amount, 0) * 100) / 100

// ---------- store ----------

type AdsState = { campaigns: Campaign[]; placements: Placement[]; ledger: AdTxn[] }
let state: AdsState = { campaigns: SAMPLE_CAMPAIGNS, placements: SAMPLE_PLACEMENTS, ledger: sampleLedger() }
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
  /** for the dev tools: sample data, or nothing at all */
  reset(empty: boolean) {
    set(() => (empty ? { campaigns: [], placements: [], ledger: [] } : { campaigns: SAMPLE_CAMPAIGNS, placements: SAMPLE_PLACEMENTS, ledger: sampleLedger() }))
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
export const usd = (n: number, cents = true) =>
  `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`
export const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n))
