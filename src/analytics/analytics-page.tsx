import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Cancel01Icon,
  ChartLineData01Icon,
  Download01Icon,
  InformationCircleIcon,
  Search01Icon,
  TableIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { saveFile } from "@/components/page-kit"
import { DateFilter, type DateFilterValue } from "@/components/ui-extra/date-filter"
import { cn } from "@/lib/utils"
import { ChartSkeleton, Loading, RowsSkeleton } from "@/components/page-skeletons"
import {
  ago,
  AGGREGATE_MINUTES,
  buckets,
  TODAY,
  hourly,
  spanName,
  dateOf,
  fmtCompact,
  fmtDuration,
  fmtInt,
  fmtPct,
  fmtSec,
  fmtUsd,
  fmtUsdShort,
  groupTotals,
  interactions,
  leader,
  pick,
  rate,
  series,
  SOURCES,
  spanOf,
  sum,
  variantStats,
  ZERO,
  type Dataset,
  type Filter,
  type FlickMeta,
  type PlaceMeta,
  type Row,
  type Scope,
  type Source,
  type Span,
  type Totals,
} from "./data"
import { Donut, LinesChart, Legend, type Line } from "./charts"

/**
 * Analytics: views, interactions (switches and clicks), clicks, average watch time and, on ad pages, spend,
 * for Flicks, embeds, placements and campaigns. One row of filters scopes everything below it: period (the app's
 * date filter), country, and on Overview the source. Overview lists every Flick; Campaigns and Embeds list theirs.
 * Lists search, filter, sort and page, so they hold hundreds of rows. Any row can be added to the chart to compare
 * (up to 5), from the row or from the picker above the chart.
 */

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"]
const EARLY = 100
const PAGE = 25
type Tab = "overview" | "campaigns" | "embeds"
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "campaigns", label: "Campaigns" },
  { id: "embeds", label: "Embeds" },
]
/** What to open. A placement, embed or a Flick's link can be narrowed to one Flick. */
export type AnalyticsTarget = { kind: "flick" | "campaign" | "placement" | "embed" | "link"; id: string; flickId?: string }
type Open = AnalyticsTarget & { from?: Open }
type Go = (o: AnalyticsTarget) => void
const tabOf = (o: AnalyticsTarget): Tab => (o.kind === "campaign" || o.kind === "placement" ? "campaigns" : o.kind === "embed" ? "embeds" : "overview")

/** The list on screen, for Export CSV: whatever its search and filters leave. */
type Exportable = { name: string; rows: TRow[] }
const ExportCtx = createContext<{ current: Exportable | null } | null>(null)

export function AnalyticsPage({ data, target }: { data: Dataset; target?: AnalyticsTarget | null }) {
  // opened from a Flick, campaign, placement or embed page: all time, so the numbers match that page
  const [filter, setFilter] = useState<Filter>({ range: { preset: target ? "all" : "7" }, country: "all" })
  const [source, setSource] = useState<Source | "all">("all")
  const [tab, setTab] = useState<Tab>(target ? tabOf(target) : "overview")
  const [open, setOpen] = useState<Open | null>(target ?? null)
  const exportRef = useRef<Exportable | null>(null)
  const go: Go = (o) => setOpen((cur) => ({ ...o, from: cur ?? undefined }))
  const showSource = !open && tab === "overview"
  const setCountry = (country: string) => setFilter((f) => ({ ...f, country }))

  return (
    <ExportCtx.Provider value={exportRef}>
      <div className="mx-auto w-full max-w-[1180px] px-4 py-8 md:px-8 md:py-10">
        {open ? (
          <DetailHead data={data} open={open} tab={tab} setOpen={setOpen} />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-1">
                <h1 className="text-2xl font-medium tracking-tight">Analytics</h1>
                <p className="text-sm text-muted-foreground">Views, interactions and watch time across links, embeds and ads.</p>
              </div>
              <Updated at={data.updatedAt} />
            </div>
            <div role="tablist" aria-label="Analytics views" className="mt-5 flex gap-1 border-b">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn("-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === t.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        <Filters data={data} filter={filter} setFilter={setFilter} source={showSource ? source : null} setSource={setSource} onExport={() => exportCsv(exportRef.current, filter)} disabled={!data.flicks.length} />

        {/* changing the tab, period, country, source or what's open fetches again */}
        <Loading
          k={[tab, open, filter, source]}
          skipFirst
          skeleton={
            <div className="flex flex-col gap-4">
              <ChartSkeleton />
              <div className="grid gap-4 lg:grid-cols-2">
                <RowsSkeleton rows={5} className="rounded-2xl p-5 ring-1 ring-foreground/10" />
                <RowsSkeleton rows={5} thumb={false} className="rounded-2xl p-5 ring-1 ring-foreground/10" />
              </div>
            </div>
          }
        >
        {!data.flicks.length ? (
          <EmptyState />
        ) : open?.kind === "flick" ? (
          <FlickView key={open.id} data={data} meta={data.flicks.find((f) => f.id === open.id)!} filter={filter} setCountry={setCountry} go={go} />
        ) : open?.kind === "campaign" ? (
          <CampaignView key={open.id} data={data} id={open.id} filter={filter} setCountry={setCountry} go={go} />
        ) : open ? (
          <PlaceView key={open.kind + open.id + (open.flickId ?? "")} data={data} open={open} filter={filter} setCountry={setCountry} go={go} />
        ) : tab === "overview" ? (
          <Overview data={data} filter={filter} setCountry={setCountry} source={source} go={go} />
        ) : tab === "campaigns" ? (
          <CampaignsTab data={data} filter={filter} setCountry={setCountry} go={go} />
        ) : (
          <EmbedsTab data={data} filter={filter} setCountry={setCountry} go={go} />
        )}
        </Loading>
      </div>
    </ExportCtx.Provider>
  )
}

const flickOf = (data: Dataset, id?: string) => data.flicks.find((f) => f.id === id)
const placeOf = (data: Dataset, id?: string) => data.places.find((p) => p.id === id)
const campaignOf = (data: Dataset, id?: string) => data.campaigns.find((c) => c.id === id)
const nameOf = (data: Dataset, o: AnalyticsTarget) =>
  o.kind === "flick" ? flickOf(data, o.id)?.name : o.kind === "campaign" ? campaignOf(data, o.id)?.name : o.kind === "link" ? "Flick link" : placeOf(data, o.id)?.name

/** Breadcrumbs back to the list, then the title. A placement, embed or link narrowed to one Flick says so, with a way to clear it. */
function DetailHead({ data, open, tab, setOpen }: { data: Dataset; open: Open; tab: Tab; setOpen: (o: Open | null) => void }) {
  const chain: Open[] = []
  for (let o = open.from; o; o = o.from) chain.unshift(o)
  let image: string | undefined
  let title = nameOf(data, open) ?? ""
  let sub = ""
  if (open.kind === "flick") {
    const m = flickOf(data, open.id)
    image = m?.image
    sub = `Flick · ${m?.size ?? ""} · ${m?.variants.length ?? 0} variations`
  } else if (open.kind === "campaign") {
    const n = data.places.filter((p) => p.campaignId === open.id).length
    sub = `Campaign · ${n} placement${n === 1 ? "" : "s"}`
  } else if (open.kind === "link") {
    const m = flickOf(data, open.id)
    image = m?.image
    title = m?.name ?? ""
    sub = "Flick link · shared directly"
  } else {
    const p = placeOf(data, open.id)
    const camp = campaignOf(data, p?.campaignId)?.name
    sub = p?.kind === "placement" ? ["Placement", camp, p.size, p.platform].filter(Boolean).join(" · ") : `Embed · ${p?.size ?? ""}`
  }
  const only = open.kind !== "link" && open.flickId ? flickOf(data, open.flickId) : undefined
  const crumb = "rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div className="flex flex-col gap-2">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <button type="button" onClick={() => setOpen(open.from ?? null)} className={cn(crumb, "mr-1 grid size-6 place-items-center")} aria-label="Back">
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        </button>
        <button type="button" onClick={() => setOpen(null)} className={crumb}>
          {TABS.find((t) => t.id === tab)!.label}
        </button>
        {chain.map((o, i) => (
          <Fragment key={i}>
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
            <button type="button" onClick={() => setOpen(o)} className={cn(crumb, "max-w-48 truncate")}>
              {nameOf(data, o)}
            </button>
          </Fragment>
        ))}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
        <span className="max-w-56 truncate text-foreground">{open.kind === "link" ? "Flick link" : only ? only.name : title}</span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {image && <img src={image} alt="" className="size-12 rounded-xl object-cover ring-1 ring-foreground/10" />}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-medium tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{sub}</p>
          </div>
        </div>
        <Updated at={data.updatedAt} />
      </div>
      {only && (
        <div className="flex w-fit items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-1.5 text-sm">
          <img src={only.image} alt="" className="size-6 rounded-full object-cover" />
          <span className="text-muted-foreground">Only</span>
          <span className="font-medium">{only.name}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Show every Flick" onClick={() => setOpen({ ...open, flickId: undefined })} className="grid size-6 place-items-center rounded-full text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Show every Flick</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

function Updated({ at }: { at: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="flex items-center gap-1.5 rounded-md text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
          Updated {ago(at)}
        </span>
      </TooltipTrigger>
      <TooltipContent>Numbers refresh every {AGGREGATE_MINUTES} minutes.</TooltipContent>
    </Tooltip>
  )
}

// ---------- filters ----------

function Filters({ data, filter, setFilter, source, setSource, onExport, disabled }: { data: Dataset; filter: Filter; setFilter: (f: Filter) => void; source: Source | "all" | null; setSource: (s: Source | "all") => void; onExport: () => void; disabled: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <DateFilter value={filter.range} onChange={(range: DateFilterValue) => setFilter({ ...filter, range })} label="Period" className="w-[170px]" />
      <Select value={filter.country} onValueChange={(v) => setFilter({ ...filter, country: v })}>
        <SelectTrigger className="w-48" aria-label="Country">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All countries</SelectItem>
          {data.countries.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {source !== null && (
        <Select value={source} onValueChange={(v) => setSource(v as Source | "all")}>
          <SelectTrigger className="w-36" aria-label="Source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={onExport} disabled={disabled}>
        <HugeiconsIcon icon={Download01Icon} className="size-4" />
        Export CSV
      </Button>
    </div>
  )
}

// ---------- shared pieces ----------

function Section({ title, tools, children, className, description }: { title: string; tools?: React.ReactNode; children: React.ReactNode; className?: string; description?: string }) {
  return (
    <Card className={cn("h-fit min-w-0 shadow-none", className)}>
      <CardHeader className="flex min-h-8 flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {tools && <div className="flex flex-wrap items-center gap-2">{tools}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function usePeriodRows(data: Dataset, filter: Filter, scope: Scope) {
  const key = JSON.stringify(scope)
  const rk = JSON.stringify(filter.range)
  const full = spanOf(filter.range)
  const rows = useMemo(() => pick(data, full, scope), [data, rk, key])
  // All period starts at the first day with numbers here, not months of empty chart
  const first = filter.range.preset === "all" && rows.length ? rows.reduce((m, r) => Math.min(m, r.day), TODAY) : full.from
  const span = useMemo(() => ({ ...full, from: Math.min(first, full.to) }), [rk, first])
  return { rows, span }
}

/** days in the span, with today counted as the part that has passed */
const daysSoFar = (s: Span) => s.to - s.from + (s.to === TODAY ? elapsedFraction() : 1)
const hoursSoFar = () => new Date().getHours() + new Date().getMinutes() / 60
const elapsedFraction = () => {
  const n = new Date()
  return (n.getHours() * 60 + n.getMinutes()) / 1440
}
const avgWatch = (t: Totals) => rate(t.dwell, t.views)
const cpm = (t: Totals) => rate(t.spend, t.views) * 1000

// ---------- metric tiles: the same four everywhere, plus Spend on ad pages ----------

type Metric = { id: string; label: string; v: (t: Totals) => number; tile: (t: Totals) => string; sub: (t: Totals, span: Span) => string; fmt: (n: number) => string; axis: (n: number) => string; hint: string }
function metrics(ad: boolean): Metric[] {
  const list: Metric[] = [
    {
      id: "views",
      label: "Views",
      v: (t) => t.views,
      tile: (t) => fmtCompact(t.views),
      sub: (t, s) => (s.from === s.to ? `About ${fmtCompact(t.views / Math.max(1, s.to === TODAY ? hoursSoFar() : 24))} an hour` : `About ${fmtCompact(t.views / daysSoFar(s))} a day`),
      fmt: fmtInt,
      axis: fmtCompact,
      hint: ad ? "Impression is added each time the ad loads." : "Each time a Flick starts playing.",
    },
    { id: "interactions", label: "Interactions", v: interactions, tile: (t) => fmtCompact(interactions(t)), sub: (t) => `${rate(interactions(t), t.views).toFixed(2)} per view`, fmt: fmtInt, axis: fmtCompact, hint: "Switches between variations." },
    { id: "clicks", label: "Clicks", v: (t) => t.clicks, tile: (t) => fmtCompact(t.clicks), sub: (t) => `${fmtPct(rate(t.clicks, t.views))} of views`, fmt: fmtInt, axis: fmtCompact, hint: "Taps on buttons." },
    { id: "watch", label: "Avg watch time", v: avgWatch, tile: (t) => fmtSec(avgWatch(t)), sub: (t) => `${fmtDuration(t.dwell)} watched in total`, fmt: fmtSec, axis: (n) => `${n.toFixed(0)}s`, hint: "Average time each viewer spent watching." },
  ]
  if (ad) list.push({ id: "spend", label: "Spend", v: (t) => t.spend, tile: (t) => fmtUsdShort(t.spend), sub: (t) => `${fmtUsd(cpm(t))} CPM`, fmt: fmtUsd, axis: (n) => `$${fmtCompact(n)}`, hint: "Charged from your Ad Balance at each country’s CPM (per 1,000 impressions)." })
  return list
}

function MetricStrip({ rows, span, filter, set, sel, items }: { rows: Row[]; span: Span; filter: Filter; set: Metric[]; sel: Selection; items: Pickable[] }) {
  const [mid, setMid] = useState(set[0].id)
  const [asTable, setAsTable] = useState(false)
  const m = set.find((x) => x.id === mid) ?? set[0]
  // each tile has its own colour from the chart palette; the chart draws in the chosen tile's colour
  const colorOf = (id: string) => SERIES[Math.max(0, set.findIndex((x) => x.id === id)) % SERIES.length]
  const mc = colorOf(m.id)
  const c = filter.country
  const t = sum(rows, c)
  const labels = buckets(span)
  const picks = sel.sel
  const lines: Line[] = picks.length
    ? picks.map((s) => ({ name: s.name, color: s.color, values: series(rows.filter(s.pred), span, c, m.v), area: false }))
    : [{ name: spanName(span, filter.range), color: mc, values: series(rows, span, c, m.v) }]
  const by = hourly(span) ? "hour" : "day"
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div role="tablist" aria-label="Metrics" className={cn("grid grid-cols-2 gap-px border-b bg-foreground/5", set.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        {set.map((x) => {
          const on = x.id === m.id
          const xc = colorOf(x.id)
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setMid(x.id)}
              className={cn("relative flex flex-col gap-1 bg-card p-4 text-left outline-none transition-colors last:odd:col-span-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:last:odd:col-span-1", !on && "hover:bg-muted/50")}
              style={on ? { background: `color-mix(in srgb, ${xc} 7%, var(--card))` } : undefined}
            >
              <span aria-hidden className={cn("absolute inset-x-0 top-0 h-0.5 transition-opacity", on ? "opacity-100" : "opacity-0")} style={{ background: xc }} />
              <span className={cn("flex items-center gap-1.5 text-sm", on ? "font-medium text-foreground" : "text-muted-foreground")}>
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: xc }} />
                {x.label}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground/70 hover:text-foreground">
                      <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60">{x.hint}</TooltipContent>
                </Tooltip>
              </span>
              <span className="text-2xl font-semibold tabular-nums tracking-tight">{x.tile(t)}</span>
              <span className="truncate text-xs text-muted-foreground">{x.sub(t, span)}</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-medium">
              {m.label} by {by}
            </h2>
            <p className="text-xs text-muted-foreground">{m.hint}</p>
          </div>
          <div className="flex items-center gap-3">
            {!picks.length && <Legend items={lines.map((l) => ({ label: l.name, color: l.color, line: true }))} />}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={asTable ? "Show chart" : "Show table"} onClick={() => setAsTable((v) => !v)}>
                  <HugeiconsIcon icon={asTable ? ChartLineData01Icon : TableIcon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{asTable ? "Show chart" : "Show table"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <CompareBar sel={sel} items={items} />
        {asTable ? (
          <div className="max-h-[260px] overflow-y-auto [scrollbar-width:thin]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 text-left font-normal capitalize">{by}</th>
                  {lines.map((l) => (
                    <th key={l.name} className="max-w-40 truncate py-1.5 text-right font-normal">
                      {l.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labels.map((d, i) => (
                  <tr key={d + i} className="border-t border-foreground/5">
                    <td className="py-1.5">{d}</td>
                    {lines.map((l) => (
                      <td key={l.name} className="py-1.5 text-right tabular-nums">
                        {l.values[i] === undefined ? "—" : m.fmt(l.values[i])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <LinesChart lines={lines} labels={labels} format={m.fmt} axisFormat={m.axis} label={`${m.label} by ${by}`} />
        )}
        {picks.length > 0 && (
          <div className="grid gap-x-6 gap-y-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((p) => (
              <div key={p.id} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="font-medium tabular-nums">{m.tile(sum(rows.filter(p.pred), c))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ---------- compare: up to 5 rows on the chart ----------

type Kind = "Flick" | "Campaign" | "Placement" | "Embed" | "Link"
/** Anything that can go on the chart: its name, what it is, and which rows are its. */
type Pickable = { id: string; name: string; kind: Kind; sub?: string; image?: string; views: number; pred: (r: Row) => boolean }
type Sel = Pickable & { color: string }
type Selection = { sel: Sel[]; has: (id: string) => Sel | undefined; toggle: (x: Pickable) => void; clear: () => void; full: boolean }
const MAX_SEL = 5
function useSelection(): Selection {
  const [sel, setSel] = useState<Sel[]>([])
  return {
    sel,
    has: (id) => sel.find((s) => s.id === id),
    toggle: (x) => setSel((s) => (s.some((y) => y.id === x.id) ? s.filter((y) => y.id !== x.id) : s.length >= MAX_SEL ? s : [...s, { ...x, color: SERIES.find((c) => !s.some((y) => y.color === c))! }])),
    clear: () => setSel([]),
    full: sel.length >= MAX_SEL,
  }
}

/** Everything with views in these rows: Flicks, campaigns, placements, embeds (and the link, when the rows are one Flick's). */
function pickables(data: Dataset, rows: Row[], country: string): Pickable[] {
  const byFlick = groupTotals(rows, country, (r) => r.flickId)
  const byCamp = groupTotals(rows, country, (r) => r.campaignId)
  const byWhere = groupTotals(rows, country, (r) => r.where)
  const oneFlick = byFlick.size === 1
  const out: Pickable[] = []
  for (const [id, t] of byFlick) {
    const f = flickOf(data, id)
    if (f && t.views > 0) out.push({ id: `f:${id}`, name: f.name, kind: "Flick", sub: f.size, image: f.image, views: t.views, pred: (r) => r.flickId === id })
  }
  for (const [id, t] of byCamp) {
    const c = campaignOf(data, id)
    if (c && t.views > 0) out.push({ id: `c:${id}`, name: c.name, kind: "Campaign", views: t.views, pred: (r) => r.campaignId === id })
  }
  for (const [id, t] of byWhere) {
    if (t.views <= 0) continue
    if (id === "link") {
      if (oneFlick) out.push({ id: "w:link", name: "Flick link", kind: "Link", sub: "Shared directly", views: t.views, pred: (r) => r.where === "link" })
      continue
    }
    const p = placeOf(data, id)
    if (p) out.push({ id: `w:${id}`, name: p.name, kind: p.kind === "placement" ? "Placement" : "Embed", sub: p.kind === "placement" ? [campaignOf(data, p.campaignId)?.name, p.size].filter(Boolean).join(" · ") : p.size, views: t.views, pred: (r) => r.where === id })
  }
  return out
}

const KIND_ORDER: Kind[] = ["Flick", "Campaign", "Placement", "Embed", "Link"]
function CompareBar({ sel, items }: { sel: Selection; items: Pickable[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sel.sel.map((s) => (
        <span key={s.id} className="flex h-7 max-w-64 items-center gap-1.5 rounded-full border bg-background pl-2.5 pr-1 text-xs">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
          <span className="truncate font-medium">{s.name}</span>
          <span className="shrink-0 text-muted-foreground">{s.kind}</span>
          <button type="button" aria-label={`Remove ${s.name} from the chart`} onClick={() => sel.toggle(s)} className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
          </button>
        </span>
      ))}
      <ComparePicker sel={sel} items={items} />
      {sel.sel.length > 0 ? (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={sel.clear}>
          Clear
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Compare up to {MAX_SEL} on the chart.</span>
      )}
    </div>
  )
}

function ComparePicker({ sel, items }: { sel: Selection; items: Pickable[] }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const found = items.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()))
  const groups = KIND_ORDER.map((k) => ({ k, list: found.filter((i) => i.kind === k).sort((a, b) => b.views - a.views) })).filter((g) => g.list.length)
  const LIMIT = 8
  const trigger = (
    <Button variant="outline" size="sm" className="h-7 gap-1 rounded-full px-2.5 text-xs" disabled={sel.full}>
      <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
      {sel.sel.length ? "Add" : "Compare"}
    </Button>
  )
  if (sel.full)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{trigger}</span>
        </TooltipTrigger>
        <TooltipContent>Up to {MAX_SEL} at a time. Remove one to add another.</TooltipContent>
      </Tooltip>
    )
  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), !o && setQ(""))}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-0 p-0">
        <div className="relative border-b p-2">
          <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search to compare" className="h-8 pl-8" aria-label="Search to compare" />
        </div>
        <div className="max-h-80 overflow-y-auto p-1 [scrollbar-width:thin]">
          {!groups.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing with views matches.</p>}
          {groups.map((g) => (
            <div key={g.k} className="py-1">
              <p className="px-2.5 pb-1 pt-1.5 text-xs text-muted-foreground">
                {g.k === "Link" ? "Link" : `${g.k}s`}
                {g.list.length > LIMIT && ` · top ${LIMIT} of ${g.list.length}, search for more`}
              </p>
              {g.list.slice(0, LIMIT).map((i) => {
                const on = sel.has(i.id)
                const blocked = !on && sel.full
                return (
                  <button
                    key={i.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => sel.toggle(i)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-40"
                  >
                    {i.image ? <img src={i.image} alt="" className="size-7 shrink-0 rounded-md object-cover" /> : <span className="size-7 shrink-0 rounded-md bg-muted" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{i.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{fmtCompact(i.views)} views{i.sub ? ` · ${i.sub}` : ""}</span>
                    </span>
                    {on ? <span className="grid size-4 shrink-0 place-items-center rounded-full" style={{ background: on.color }}><HugeiconsIcon icon={Tick02Icon} className="size-3 text-white" strokeWidth={3} /></span> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------- lists: search, filters, sort, pages ----------

type TRow = {
  id: string
  name: string
  sub?: string
  image?: string
  /** "Live" when it's on now */
  badge?: string
  kind?: Kind
  t: Totals
  onClick?: () => void
  /** for the chart; rows without one can't be compared */
  pick?: Pickable
  /** values for the list's filters, by filter id */
  tags?: Record<string, string | string[]>
}
type Col = { id: string; label: string; v: (r: TRow) => number; f: (n: number, r: TRow) => string }
const C = {
  views: { id: "views", label: "Views", v: (r: TRow) => r.t.views, f: (n: number) => fmtCompact(n) },
  interactions: { id: "interactions", label: "Interactions", v: (r: TRow) => interactions(r.t), f: (n: number) => fmtCompact(n) },
  clicks: { id: "clicks", label: "Clicks", v: (r: TRow) => r.t.clicks, f: (n: number) => fmtInt(n) },
  watch: { id: "watch", label: "Avg watch time", v: (r: TRow) => avgWatch(r.t), f: (n: number) => (n ? fmtSec(n) : "—") },
  spend: { id: "spend", label: "Spend", v: (r: TRow) => r.t.spend, f: (n: number) => (n ? fmtUsdShort(n) : "—") },
  cpm: { id: "cpm", label: "CPM", v: (r: TRow) => cpm(r.t), f: (n: number, r: TRow) => (r.t.views ? fmtUsd(n) : "—") },
} satisfies Record<string, Col>
const VIEW_COLS: Col[] = [C.views, C.interactions, C.clicks, C.watch]
const AD_COLS: Col[] = [C.views, C.interactions, C.clicks, C.watch, C.spend]

type ListFilter = { id: string; label: string; options: { value: string; label: string }[] }

/**
 * A list for hundreds of rows: search by name, filters, "Hide no views" (on by default), sort by any column and
 * 25 a page. With `preview`, it starts as the top few with a button for the rest.
 */
function ListTable({
  rows,
  cols,
  nameLabel,
  noun,
  sel,
  filters = [],
  preview,
  expand,
  exportName,
  natural,
  empty = "Nothing here yet.",
}: {
  rows: TRow[]
  cols: Col[]
  nameLabel: string
  /** plural, for counts: "Flicks", "placements" */
  noun: string
  sel?: Selection
  filters?: ListFilter[]
  preview?: number
  expand?: (r: TRow) => React.ReactNode
  /** the page's main list: Export CSV exports it as filtered here */
  exportName?: string
  /** keep the order given (newest first) until a column is sorted */
  natural?: boolean
  empty?: string
}) {
  const [sort, setSort] = useState<{ id: string; desc: boolean }>({ id: natural ? "" : cols[0].id, desc: true })
  const [q, setQ] = useState("")
  const [vals, setVals] = useState<Record<string, string>>({})
  const [hideZero, setHideZero] = useState(true)
  const [page, setPage] = useState(0)
  const [all, setAll] = useState(!preview)
  const [opened, setOpened] = useState<Set<string>>(new Set())
  const exportRef = useContext(ExportCtx)
  useEffect(() => setPage(0), [q, JSON.stringify(vals), hideZero, sort.id, sort.desc])

  const col = cols.find((c) => c.id === sort.id)
  const needle = q.trim().toLowerCase()
  const shown = rows.filter(
    (r) =>
      (!hideZero || r.t.views > 0) &&
      (!needle || r.name.toLowerCase().includes(needle) || r.sub?.toLowerCase().includes(needle)) &&
      filters.every((f) => {
        const v = vals[f.id]
        if (!v || v === "all") return true
        const tag = r.tags?.[f.id]
        return Array.isArray(tag) ? tag.includes(v) : tag === v
      }),
  )
  const sorted = col ? [...shown].sort((a, b) => (sort.desc ? col.v(b) - col.v(a) : col.v(a) - col.v(b))) : shown
  if (exportName && exportRef) exportRef.current = { name: exportName, rows: sorted }
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const cur = Math.min(page, pages - 1)
  const visible = all ? sorted.slice(cur * PAGE, cur * PAGE + PAGE) : sorted.slice(0, preview)
  const zeros = rows.filter((r) => r.t.views <= 0).length
  const tools = all && (rows.length > 8 || filters.length > 0 || zeros > 0)

  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="flex flex-col gap-3">
      {tools && (
        <div className="flex flex-wrap items-center gap-2">
          {rows.length > 8 && (
            <div className="relative w-full sm:w-64">
              <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${noun.toLowerCase()}`} className="h-8 pl-8" aria-label={`Search ${noun.toLowerCase()}`} />
            </div>
          )}
          {filters.map((f) => (
            <Select key={f.id} value={vals[f.id] ?? "all"} onValueChange={(v) => setVals((s) => ({ ...s, [f.id]: v }))}>
              <SelectTrigger size="sm" className="w-auto min-w-36" aria-label={f.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{f.label}: all</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {zeros > 0 && (
            <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Switch size="sm" checked={hideZero} onCheckedChange={setHideZero} />
              Hide no views
            </label>
          )}
        </div>
      )}
      {!sorted.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No {noun.toLowerCase()} match. {(needle || Object.values(vals).some((v) => v && v !== "all")) && "Try clearing the search or filters."}</p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 300 + cols.length * 104 }}>
            <thead className="text-xs text-muted-foreground">
              <tr className="text-right">
                {expand && <th className="w-8" aria-label="Expand" />}
                <th className={cn("sticky left-0 z-10 bg-card py-2 text-left font-normal", !expand && "pl-2")}>{nameLabel}</th>
                {cols.map((c) => (
                  <th key={c.id} className="py-2 font-normal" aria-sort={sort.id === c.id ? (sort.desc ? "descending" : "ascending") : "none"}>
                    <button
                      type="button"
                      onClick={() => setSort((s) => ({ id: c.id, desc: s.id === c.id ? !s.desc : true }))}
                      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", sort.id === c.id && "font-medium text-foreground")}
                    >
                      {c.label}
                      <HugeiconsIcon icon={sort.id === c.id ? (sort.desc ? ArrowDown01Icon : ArrowUp01Icon) : ArrowUpDownIcon} className="size-3.5" />
                    </button>
                  </th>
                ))}
                {sel && <th className="w-12 pr-2" aria-label="Compare" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const on = r.pick ? sel?.has(r.pick.id) : undefined
                const isOpen = opened.has(r.id)
                return (
                  <Fragment key={r.id}>
                    <tr
                      tabIndex={r.onClick ? 0 : undefined}
                      onClick={r.onClick}
                      onKeyDown={(e) => e.key === "Enter" && r.onClick?.()}
                      className={cn("group border-t border-foreground/5 text-right outline-none", r.onClick && "cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60")}
                    >
                      {expand && (
                        <td className="pl-1">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={isOpen ? `Hide ${r.name}'s placements` : `Show ${r.name}'s placements`}
                            onClick={(e) => (e.stopPropagation(), setOpened((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n }))}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <HugeiconsIcon icon={ArrowRight01Icon} className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
                          </button>
                        </td>
                      )}
                      <td className={cn("sticky left-0 z-10 max-w-[200px] bg-card py-2 text-left sm:max-w-none group-hover:bg-[color-mix(in_oklch,var(--muted)_60%,var(--card))]", !expand && "pl-2")}>
                        <span className="flex items-center gap-3">
                          {r.image ? <img src={r.image} alt="" className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10" /> : null}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              {on && <span className="size-2 shrink-0 rounded-full" style={{ background: on.color }} aria-label="On the chart" />}
                              <span className="truncate font-medium">{r.name}</span>
                            </span>
                            {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                          </span>
                          {(r.badge || r.kind) && (
                            <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-2 pr-4">
                              {r.badge && <Badge className="h-5 px-1.5 text-[11px] font-normal">{r.badge}</Badge>}
                              {r.kind && (
                                <Badge variant="outline" className="h-5 w-[72px] justify-center px-1.5 text-[11px] font-normal">
                                  {r.kind}
                                </Badge>
                              )}
                            </span>
                          )}
                        </span>
                      </td>
                      {cols.map((c) => (
                        <td key={c.id} className={cn("whitespace-nowrap py-2 tabular-nums", sort.id === c.id && "font-medium")}>
                          {c.f(c.v(r), r)}
                        </td>
                      ))}
                      {sel && (
                        <td className="pr-2 text-right">
                          {r.pick && r.t.views > 0 && <CompareToggle sel={sel} item={r.pick} />}
                        </td>
                      )}
                    </tr>
                    {expand && isOpen && (
                      <tr className="bg-muted/30">
                        <td />
                        <td colSpan={cols.length + (sel ? 2 : 1)} className="py-2 pr-2">
                          {expand(r)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {!all && sorted.length > (preview ?? 0) ? (
        <Button variant="ghost" size="sm" className="w-fit gap-1 self-center text-primary hover:text-primary" onClick={() => setAll(true)}>
          See all {sorted.length} {noun}
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
        </Button>
      ) : (
        all &&
        sorted.length > PAGE && (
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="tabular-nums">
              {cur * PAGE + 1}–{Math.min(sorted.length, cur * PAGE + PAGE)} of {sorted.length} {noun}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              </Button>
              <span className="tabular-nums">
                Page {cur + 1} of {pages}
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

/** In a row: add it to the chart (shows on hover) or, once added, its colour with a way to remove it. */
function CompareToggle({ sel, item }: { sel: Selection; item: Pickable }) {
  const on = sel.has(item.id)
  const blocked = !on && sel.full
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={!!on}
          aria-label={on ? `Remove ${item.name} from the chart` : `Compare ${item.name} on the chart`}
          disabled={blocked}
          onClick={(e) => (e.stopPropagation(), sel.toggle(item))}
          onKeyDown={(e) => e.stopPropagation()}
          className={cn(
            "inline-grid size-7 place-items-center rounded-full outline-none transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-0",
            on ? "text-white" : "text-muted-foreground opacity-0 ring-1 ring-foreground/15 hover:bg-background hover:text-foreground group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
          style={on ? { background: on.color } : undefined}
        >
          <HugeiconsIcon icon={on ? Tick02Icon : ChartLineData01Icon} className="size-3.5" strokeWidth={on ? 3 : 1.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{on ? "Remove from the chart" : "Compare on the chart"}</TooltipContent>
    </Tooltip>
  )
}

const placesOf = (data: Dataset, kind: "placement" | "embed", campaignId?: string) => data.places.filter((p) => p.kind === kind && (!campaignId || p.campaignId === campaignId))
/** a placement or embed: Live (has a Flick on now), Ended (had one), or No Flick */
const statusOf = (data: Dataset, p: PlaceMeta, ever: Set<string>) => (p.current ? "live" : ever.has(p.id) ? "ended" : "none")
const STATUS: ListFilter = {
  id: "status",
  label: "Status",
  options: [
    { value: "live", label: "Live" },
    { value: "ended", label: "Ended" },
    { value: "none", label: "No Flick" },
  ],
}
const sizeFilter = (sizes: string[]): ListFilter => ({ id: "size", label: "Size", options: [...new Set(sizes)].sort().map((s) => ({ value: s, label: s })) })

// ---------- variations ----------

function LeaderChip({ confidence }: { confidence: number }) {
  const sure = confidence >= 0.95
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[11px]", sure ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{sure ? "Clear lead" : confidence >= 0.8 ? "Likely" : "Too early"}</span>
}

function HeadTip({ label, tip, className }: { label: string; tip: string; className?: string }) {
  return (
    <th className={cn("py-2 font-normal", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="cursor-default rounded underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-60">{tip}</TooltipContent>
      </Tooltip>
    </th>
  )
}

/** Each variation of one Flick, within the rows given. With several Flicks (a placement over time), pick one. */
function VariationsCard({ data, rows, country, flickIds, current }: { data: Dataset; rows: Row[]; country: string; flickIds: string[]; current?: string }) {
  const [fid, setFid] = useState(current && flickIds.includes(current) ? current : flickIds[0])
  const meta = flickOf(data, fid)
  if (!meta) return null
  const t = sum(rows.filter((r) => r.flickId === meta.id), country)
  const stats = variantStats(meta, t)
  const lead = leader(meta, t)
  const tools =
    flickIds.length > 1 ? (
      <Select value={fid} onValueChange={setFid}>
        <SelectTrigger size="sm" className="w-56" aria-label="Flick">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {flickIds.map((id) => (
            <SelectItem key={id} value={id}>
              {flickOf(data, id)?.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : undefined
  return (
    <Section title="Variations" description="How each variation did, and which gets the most clicks" tools={tools}>
      {!t.views ? (
        <p className="text-sm text-muted-foreground">No views in this period.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-right">
                <th className="py-2 pl-2 text-left font-normal">Variation</th>
                <HeadTip label="Views" tip="Views on this variation." />
                <HeadTip label="Interactions" tip="Switches to this variation." />
                <HeadTip label="Clicks" tip="Button clicks on this variation." />
                <HeadTip label="Click rate" tip="Button clicks with respect to views on this variation." />
                <HeadTip label="Avg watch time" tip="Average time on this variation" className="pr-2" />
              </tr>
            </thead>
            <tbody>
              {stats.map((v) => {
                const best = lead.best?.i === v.i
                return (
                  <tr key={v.name} className="border-t border-foreground/5 text-right">
                    <td className="py-2 pl-2 text-left">
                      <span className="flex items-center gap-2.5">
                        <img src={v.poster} alt="" className="h-10 w-8 rounded-md object-cover ring-1 ring-foreground/10" />
                        <span className="font-medium">{v.name}</span>
                        {v.i === meta.start && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
                            Starts here
                          </Badge>
                        )}
                        {best && (
                          <span className="flex items-center gap-1">
                            <Badge className="h-5 px-1.5 text-[11px] font-normal">Best click rate</Badge>
                            <LeaderChip confidence={lead.confidence} />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 tabular-nums">{fmtCompact(v.shown)}</td>
                    <td className="py-2 tabular-nums">{fmtCompact(v.interactions)}</td>
                    <td className="py-2 tabular-nums">{fmtInt(v.clicks)}</td>
                    <td className={cn("py-2 tabular-nums", best && "font-semibold")}>{fmtPct(v.ctr)}</td>
                    <td className="py-2 pr-2 tabular-nums">{fmtSec(v.avgDwell)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

// ---------- countries and sources ----------

const TOP_COUNTRIES = 5
/**
 * Share of views by country for the period and scope, whatever the country filter, so the split stays visible.
 * The selected country is highlighted (and pinned with its rank when outside the top 5); clicking a row filters by it.
 */
function CountriesCard({ data, rows, country, setCountry }: { data: Dataset; rows: Row[]; country: string; setCountry: (c: string) => void }) {
  const [all, setAll] = useState(false)
  const [q, setQ] = useState("")
  const [tip, setTip] = useState<{ x: number; y: number; i: number } | null>(null)
  const items = data.countries
    .map((c) => ({ c, t: sum(rows, c.code) }))
    .filter((x) => x.t.views > 0)
    .sort((a, b) => b.t.views - a.t.views)
    .map((x, i) => ({ ...x, rank: i + 1 }))
  const total = items.reduce((a, x) => a + x.t.views, 0) || 1
  const max = items[0]?.t.views || 1
  const picked = items.find((x) => x.c.code === country)
  const needle = q.trim().toLowerCase()
  const list = all ? items.filter((x) => !needle || x.c.name.toLowerCase().includes(needle)) : [...items.slice(0, TOP_COUNTRIES), ...(picked && picked.rank > TOP_COUNTRIES ? [picked] : [])]
  const description = picked ? `${picked.c.name}: ${fmtPct(picked.t.views / total, 0)} of views, #${picked.rank} of ${items.length} countries` : country !== "all" ? `No views from ${data.countries.find((c) => c.code === country)?.name ?? "this country"} in this period` : "Share of views."
  const tools = items.length > TOP_COUNTRIES && (
    <Button variant="ghost" size="sm" className="-mr-2 h-7 text-primary hover:text-primary" onClick={() => (setAll((v) => !v), setQ(""))}>
      {all ? "Show top 5" : `Show all ${items.length}`}
    </Button>
  )
  return (
    <Section title={all ? "Countries" : "Top countries"} description={description} tools={tools}>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">No views in this period.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {all && items.length > 10 && (
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search countries" className="h-8 pl-8" aria-label="Search countries" />
            </div>
          )}
          <ul className={cn("flex flex-col gap-1", all && "max-h-80 overflow-y-auto [scrollbar-width:thin]")}>
            {list.map((x, i) => {
              const on = x.c.code === country
              const dim = country !== "all" && !on
              const gap = !all && i === TOP_COUNTRIES
              return (
                <li key={x.c.code} className={cn(gap && "mt-1 border-t border-dashed pt-2")}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCountry(on ? "all" : x.c.code)}
                    onPointerMove={(e) => setTip({ x: e.clientX, y: e.clientY, i: items.indexOf(x) })}
                    onPointerLeave={() => setTip(null)}
                    className={cn("flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring", on && "bg-primary/5 ring-1 ring-primary/20")}
                  >
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className={cn("truncate", on && "font-medium")}>
                        <span className="mr-2 inline-block w-5 text-xs tabular-nums text-muted-foreground">{x.rank}</span>
                        {x.c.name}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{fmtPct(x.t.views / total, 0)}</span>
                    </span>
                    <span className="ml-7 block h-2 rounded-full bg-muted">
                      <span className="block h-full rounded-full transition-[width,opacity] duration-300" style={{ width: `${Math.max(1.5, (x.t.views / max) * 100)}%`, background: "var(--series-1)", opacity: dim ? 0.3 : 1 }} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {tip && items[tip.i] && (
            <CountryTip x={tip.x} y={tip.y} name={items[tip.i].c.name} t={items[tip.i].t} />
          )}
        </div>
      )}
    </Section>
  )
}

function CountryTip({ x, y, name, t }: { x: number; y: number; name: string; t: Totals }) {
  return (
    <div role="tooltip" className="pointer-events-none fixed z-50 min-w-36 rounded-xl bg-popover px-3 py-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10" style={{ left: Math.min(window.innerWidth - 220, x + 14), top: y + 14 }}>
      <p className="mb-1 text-xs text-muted-foreground">{name}</p>
      {[
        ["views", fmtInt(t.views)],
        ["interactions", fmtInt(interactions(t))],
        ...(t.spend > 0 ? [["spend", fmtUsd(t.spend)]] : []),
      ].map(([l, v]) => (
        <p key={l} className="flex gap-2 text-xs">
          <span className="font-semibold tabular-nums">{v}</span>
          <span className="text-muted-foreground">{l}</span>
        </p>
      ))}
    </div>
  )
}

function SourcesCard({ rows, country }: { rows: Row[]; country: string }) {
  const items = SOURCES.map((s, i) => ({ ...s, i, t: sum(rows.filter((r) => r.source === s.id), country) })).filter((s) => s.t.views > 0)
  return (
    <Section title="By source" description="Views from each source">
      {items.length ? (
        <Donut
          items={items.map((s) => ({ label: s.label, value: s.t.views, color: SERIES[s.i] }))}
          format={fmtCompact}
          centerLabel="views"
          detail={(i) => [
            { label: "views", value: fmtInt(items[i].t.views) },
            { label: "interactions", value: fmtInt(interactions(items[i].t)) },
            { label: "clicks", value: fmtInt(items[i].t.clicks) },
          ]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No views from these sources in this period.</p>
      )}
    </Section>
  )
}

// ---------- Overview: everything, then every Flick ----------

type ViewProps = { data: Dataset; filter: Filter; setCountry: (c: string) => void; go: Go }

function Overview({ data, filter, setCountry, source, go }: ViewProps & { source: Source | "all" }) {
  const scope: Scope = source === "all" ? {} : { source }
  const { rows, span } = usePeriodRows(data, filter, scope)
  const c = filter.country
  const t = sum(rows, c)
  const sel = useSelection()
  const items = useMemo(() => pickables(data, rows, c), [data, rows, c])
  const flickRows = useMemo(() => {
    const totals = groupTotals(rows, c, (r) => r.flickId)
    const ran = new Map<string, Set<string>>()
    for (const r of rows) (ran.get(r.flickId) ?? ran.set(r.flickId, new Set()).get(r.flickId)!).add(r.source)
    const live = new Set(data.places.map((p) => p.current).filter(Boolean))
    return data.flicks.map((f): TRow => {
      const ft = totals.get(f.id) ?? ZERO
      return {
        id: f.id,
        name: f.name,
        sub: f.size,
        image: f.image,
        badge: live.has(f.id) ? "Live" : undefined,
        t: ft,
        onClick: () => go({ kind: "flick", id: f.id }),
        pick: { id: `f:${f.id}`, name: f.name, kind: "Flick", sub: f.size, image: f.image, views: ft.views, pred: (r) => r.flickId === f.id },
        tags: { runs: [...(ran.get(f.id) ?? [])], size: f.size },
      }
    })
  }, [data, rows, c])
  return (
    <div className="mt-6 flex flex-col gap-6">
      {t.views < EARLY && <EarlyNote />}
      <MetricStrip rows={rows} span={span} filter={filter} set={metrics(false)} sel={sel} items={items} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SourcesCard rows={rows} country={c} />
        <CountriesCard data={data} rows={rows} country={c} setCountry={setCountry} />
      </div>
      <Section title="Flicks" description="Open one for its variations and where it ran.">
        <ListTable
          rows={flickRows}
          cols={VIEW_COLS}
          nameLabel="Flick"
          noun="Flicks"
          sel={sel}
          preview={10}
          exportName="flicks"
          filters={[
            { id: "runs", label: "Runs in", options: SOURCES.map((s) => ({ value: s.id, label: s.label })) },
            sizeFilter(data.flicks.map((f) => f.size)),
          ]}
          empty="No Flicks yet."
        />
      </Section>
    </div>
  )
}

// ---------- one Flick ----------

function FlickView({ data, meta, filter, setCountry, go }: ViewProps & { meta: FlickMeta }) {
  const { rows, span } = usePeriodRows(data, filter, { flickId: meta.id })
  const c = filter.country
  const t = sum(rows, c)
  const sel = useSelection()
  const items = useMemo(() => pickables(data, rows, c).filter((i) => i.kind !== "Flick"), [data, rows, c])
  // every place it has run, ever, so a place with no views this period still shows
  const ran = useMemo(() => [...new Set(data.rows.filter((r) => r.flickId === meta.id).map((r) => r.where))], [data, meta.id])
  const totals = useMemo(() => groupTotals(rows, c, (r) => r.where), [rows, c])
  const whereRows: TRow[] = ran.map((w) => {
    const pl = placeOf(data, w)
    const camp = campaignOf(data, pl?.campaignId)?.name
    const kind: Kind = pl ? (pl.kind === "placement" ? "Placement" : "Embed") : "Link"
    const name = pl ? pl.name : "Flick link"
    const tw = totals.get(w) ?? ZERO
    const sub = pl ? (pl.kind === "placement" ? [camp, pl.size, pl.platform].filter(Boolean).join(" · ") : pl.size) : "Shared directly"
    return {
      id: w,
      name,
      sub,
      kind,
      badge: pl && pl.current === meta.id ? "Live" : undefined,
      t: tw,
      onClick: () => go(pl ? { kind: pl.kind, id: w, flickId: meta.id } : { kind: "link", id: meta.id }),
      pick: { id: `w:${w}`, name, kind, sub, views: tw.views, pred: (r) => r.where === w },
      tags: { kind: kind.toLowerCase() },
    }
  })
  const kinds = [...new Set(whereRows.map((r) => r.kind!))]
  return (
    <div className="mt-6 flex flex-col gap-6">
      {t.views < EARLY && <EarlyNote />}
      <MetricStrip rows={rows} span={span} filter={filter} set={metrics(false)} sel={sel} items={items} />
      <VariationsCard data={data} rows={rows} country={c} flickIds={[meta.id]} />
      <Section title="Distribution" description="View performance across link, embeds and ads.">
        <ListTable
          rows={whereRows}
          cols={VIEW_COLS}
          nameLabel="Channel"
          noun="channels"
          sel={sel}
          exportName={`${meta.name}-distribution`}
          filters={kinds.length > 1 ? [{ id: "kind", label: "Type", options: kinds.map((k) => ({ value: k.toLowerCase(), label: k })) }] : []}
        />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <CountriesCard data={data} rows={rows} country={c} setCountry={setCountry} />
      </div>
    </div>
  )
}

// ---------- campaigns and placements ----------

function placementRows(data: Dataset, ps: PlaceMeta[], rows: Row[], c: string, go: Go, withCampaign: boolean): TRow[] {
  const totals = groupTotals(rows, c, (r) => r.where)
  const ever = new Set(data.rows.map((r) => r.where))
  return ps.map((x) => {
    const pt = totals.get(x.id) ?? ZERO
    const cur = flickOf(data, x.current)
    const sub = [withCampaign ? campaignOf(data, x.campaignId)?.name : undefined, x.size, x.platform, cur ? cur.name : ever.has(x.id) ? "No Flick now" : "No Flick yet"].filter(Boolean).join(" · ")
    return {
      id: x.id,
      name: x.name,
      sub,
      image: cur?.image,
      badge: x.current ? "Live" : undefined,
      t: pt,
      onClick: () => go({ kind: "placement", id: x.id }),
      pick: { id: `w:${x.id}`, name: x.name, kind: "Placement", sub, views: pt.views, pred: (r) => r.where === x.id },
      tags: { status: statusOf(data, x, ever), size: x.size },
    }
  })
}

function CampaignsTab({ data, filter, setCountry, go }: ViewProps) {
  const { rows, span } = usePeriodRows(data, filter, { source: "ads" })
  const c = filter.country
  const sel = useSelection()
  const items = useMemo(() => pickables(data, rows, c), [data, rows, c])
  const campRows = useMemo(() => {
    const totals = groupTotals(rows, c, (r) => r.campaignId)
    return data.campaigns.map((x): TRow => {
      const ps = placesOf(data, "placement", x.id)
      const live = ps.filter((p) => p.current).length
      const ct = totals.get(x.id) ?? ZERO
      return {
        id: x.id,
        name: x.name,
        sub: `${ps.length} placement${ps.length === 1 ? "" : "s"}${live ? ` · ${live} live` : ""}`,
        badge: live ? "Live" : undefined,
        t: ct,
        onClick: () => go({ kind: "campaign", id: x.id }),
        pick: { id: `c:${x.id}`, name: x.name, kind: "Campaign", views: ct.views, pred: (r) => r.campaignId === x.id },
        tags: { status: live ? "live" : "off" },
      }
    })
  }, [data, rows, c])
  const expand = (r: TRow) => {
    const ps = placementRows(data, placesOf(data, "placement", r.id), rows, c, go, false).sort((a, b) => b.t.views - a.t.views)
    return (
      <div className="flex flex-col">
        {ps.slice(0, 5).map((p) => (
          <button key={p.id} type="button" onClick={p.onClick} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring">
            {p.image ? <img src={p.image} alt="" className="size-7 rounded-md object-cover" /> : <span className="size-7 rounded-md bg-muted" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate">{p.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.sub}</span>
            </span>
            {p.badge && <Badge className="h-5 px-1.5 text-[11px] font-normal">{p.badge}</Badge>}
            <span className="w-20 text-right tabular-nums">{fmtCompact(p.t.views)}</span>
            <span className="w-24 text-right tabular-nums text-muted-foreground">{p.t.spend ? fmtUsdShort(p.t.spend) : "—"}</span>
          </button>
        ))}
        {ps.length > 5 && (
          <Button variant="ghost" size="sm" className="mt-1 w-fit text-primary hover:text-primary" onClick={r.onClick}>
            Open campaign to see all {ps.length} placements
          </Button>
        )}
        {!ps.length && <p className="px-2 py-1.5 text-sm text-muted-foreground">No placements yet.</p>}
      </div>
    )
  }
  return (
    <div className="mt-6 flex flex-col gap-6">
      <MetricStrip rows={rows} span={span} filter={filter} set={metrics(true)} sel={sel} items={items} />
      <Section title="Campaigns" description="View performance across placements and Flicks.">
        <ListTable
          rows={campRows}
          cols={AD_COLS}
          nameLabel="Campaign"
          noun="campaigns"
          sel={sel}
          expand={expand}
          exportName="campaigns"
          filters={[{ id: "status", label: "Status", options: [{ value: "live", label: "Live" }, { value: "off", label: "Not running" }] }]}
          empty="No campaigns yet."
        />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <CountriesCard data={data} rows={rows} country={c} setCountry={setCountry} />
      </div>
    </div>
  )
}

function CampaignView({ data, id, filter, setCountry, go }: ViewProps & { id: string }) {
  const ps = placesOf(data, "placement", id)
  const { rows, span } = usePeriodRows(data, filter, { campaignId: id })
  const c = filter.country
  const sel = useSelection()
  const items = useMemo(() => pickables(data, rows, c).filter((i) => i.kind !== "Campaign"), [data, rows, c])
  const placeRows = useMemo(() => placementRows(data, ps, rows, c, go, false), [data, rows, c])
  return (
    <div className="mt-6 flex flex-col gap-6">
      <MetricStrip rows={rows} span={span} filter={filter} set={metrics(true)} sel={sel} items={items} />
      <Section title="Placements" description="View performance across Flicks.">
        <ListTable rows={placeRows} cols={[...AD_COLS, C.cpm]} nameLabel="Placement" noun="placements" sel={sel} exportName="placements" filters={[STATUS, sizeFilter(ps.map((p) => p.size))]} empty="No placements yet." />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <CountriesCard data={data} rows={rows} country={c} setCountry={setCountry} />
      </div>
    </div>
  )
}

/** A placement, an embed, or a Flick's link; narrowed to one Flick when opened from that Flick. */
function PlaceView({ data, open, filter, setCountry, go }: ViewProps & { open: AnalyticsTarget }) {
  const isLink = open.kind === "link"
  const where = isLink ? "link" : open.id
  const flickId = isLink ? open.id : open.flickId
  const place = isLink ? undefined : placeOf(data, open.id)
  const isAd = place?.kind === "placement"
  const { rows, span } = usePeriodRows(data, filter, { where, flickId })
  const c = filter.country
  const sel = useSelection()
  const items = useMemo(() => pickables(data, rows, c).filter((i) => i.kind === "Flick"), [data, rows, c])
  const t = sum(rows, c)
  // every Flick that has run here, newest first, with when it ran
  const allRows = useMemo(() => data.rows.filter((r) => r.where === where && (!flickId || r.flickId === flickId)), [data, where, flickId])
  const flickRows = useMemo(() => {
    const totals = groupTotals(rows, c, (r) => r.flickId)
    const spans = new Map<string, [number, number]>()
    for (const r of allRows) {
      const s = spans.get(r.flickId)
      spans.set(r.flickId, s ? [Math.min(s[0], r.day), Math.max(s[1], r.day)] : [r.day, r.day])
    }
    const fmtDay = (d: number) => dateOf(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    return [...spans]
      .sort((a, b) => b[1][0] - a[1][0])
      .map(([fid, [from, to]]): TRow => {
        const m = flickOf(data, fid)!
        const live = place?.current === fid
        const ft = totals.get(fid) ?? ZERO
        return { id: fid, name: m.name, sub: `${fmtDay(from)} – ${live ? "now" : fmtDay(to)}`, image: m.image, badge: live ? "Live" : undefined, t: ft, onClick: () => go({ kind: open.kind as "placement" | "embed", id: open.id, flickId: fid }), pick: { id: `f:${fid}`, name: m.name, kind: "Flick", sub: m.size, image: m.image, views: ft.views, pred: (r) => r.flickId === fid } }
      })
  }, [data, rows, c, allRows])
  const served = [...new Set(rows.map((r) => r.flickId))]
  return (
    <div className="mt-6 flex flex-col gap-6">
      {t.views < EARLY && <EarlyNote />}
      <MetricStrip rows={rows} span={span} filter={filter} set={metrics(isAd)} sel={sel} items={items} />
      {!flickId && (
        <Section title={isAd ? "Flicks in this placement" : "Flicks in this embed"} description={`Each Flick it has ${isAd ? "served" : "shown"}. Open one to see only its numbers here.`}>
          <ListTable rows={flickRows} cols={isAd ? AD_COLS : VIEW_COLS} nameLabel="Flick" noun="Flicks" sel={sel} exportName="flicks" natural empty="No Flick has run here yet." />
        </Section>
      )}
      {served.length > 0 && <VariationsCard key={flickId ?? "all"} data={data} rows={rows} country={c} flickIds={served} current={flickId ?? place?.current} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <CountriesCard data={data} rows={rows} country={c} setCountry={setCountry} />
      </div>
    </div>
  )
}

function EmbedsTab({ data, filter, setCountry, go }: ViewProps) {
  const { rows, span } = usePeriodRows(data, filter, { source: "embed" })
  const c = filter.country
  const sel = useSelection()
  const items = useMemo(() => pickables(data, rows, c), [data, rows, c])
  const embedRows = useMemo(() => {
    const totals = groupTotals(rows, c, (r) => r.where)
    const ever = new Set(data.rows.map((r) => r.where))
    return placesOf(data, "embed").map((e): TRow => {
      const cur = flickOf(data, e.current)
      const et = totals.get(e.id) ?? ZERO
      const sub = `${e.size} · ${cur ? cur.name : "No Flick"}`
      return { id: e.id, name: e.name, sub, image: cur?.image, badge: e.current ? "Live" : undefined, t: et, onClick: () => go({ kind: "embed", id: e.id }), pick: { id: `w:${e.id}`, name: e.name, kind: "Embed", sub, views: et.views, pred: (r) => r.where === e.id }, tags: { status: statusOf(data, e, ever), size: e.size } }
    })
  }, [data, rows, c])
  return (
    <div className="mt-6 flex flex-col gap-6">
      <MetricStrip rows={rows} span={span} filter={filter} set={metrics(false)} sel={sel} items={items} />
      <Section title="Embeds" description="Open one to see each Flick it has shown.">
        <ListTable rows={embedRows} cols={VIEW_COLS} nameLabel="Embed" noun="embeds" sel={sel} exportName="embeds" filters={[STATUS, sizeFilter(placesOf(data, "embed").map((e) => e.size))]} empty="No embeds yet." />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <CountriesCard data={data} rows={rows} country={c} setCountry={setCountry} />
      </div>
    </div>
  )
}

// ---------- states ----------

function EarlyNote() {
  return (
    <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
      <span className="font-medium">Early numbers.</span> <span className="text-muted-foreground">Fewer than {EARLY} views in this period. Numbers move a lot until more people watch.</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
      <HugeiconsIcon icon={ChartLineData01Icon} className="size-6 text-muted-foreground" />
      <p className="font-medium">No numbers yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">Export a Flick and share its link, embed it, or serve it in ads. Views, interactions and watch time show here as people watch.</p>
    </div>
  )
}

// ---------- export: the page's main list, as searched and filtered, every page of it ----------

function exportCsv(list: Exportable | null, filter: Filter) {
  if (!list) return
  const span = spanOf(filter.range)
  const head = ["Name", "Details", "Views", "Interactions", "Switches", "Clicks", "Avg watch time (seconds)", "Total watch time (seconds)", "Spend (USD)"]
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const lines = list.rows.map((r) => [q(r.name), q(r.sub ?? ""), Math.round(r.t.views), Math.round(interactions(r.t)), Math.round(r.t.switches), Math.round(r.t.clicks), avgWatch(r.t).toFixed(1), Math.round(r.t.dwell), r.t.spend.toFixed(2)].join(","))
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  saveFile(`analytics-${slug(list.name)}-${slug(spanName(span, filter.range))}${filter.country !== "all" ? `-${filter.country.toLowerCase()}` : ""}.csv`, "text/csv", [head.join(","), ...lines].join("\n"))
}
