import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  ChartLineData01Icon,
  Download01Icon,
  SparklesIcon,
  TableIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { saveFile } from "@/components/page-kit"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui-extra/toaster"
import {
  change,
  daily,
  dayLabel,
  fmtCompact,
  fmtInt,
  fmtPct,
  fmtSec,
  fmtUsd,
  leader,
  M,
  periodLabel,
  rate,
  slice,
  sum,
  SOURCES,
  VIDEO_SECONDS,
  type Dataset,
  type Filter,
  type FlickMeta,
  type Range,
  type Source,
  type Totals,
  type Row,
} from "./data"
import { BarList, Funnel, LinesChart, Legend, MomentChart, Spark, SwitchGrid, type Line } from "./charts"

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"]
const RANGE_LABEL: Record<Range, string> = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" }
const EARLY = 100
const PLURAL: Record<Source, string> = { link: "links", embed: "embeds", ads: "ads" }

/**
 * Analytics (experiment): every Flick's reach and engagement, then one Flick in depth. Filters sit in
 * one row above everything and scope all of it; each number compares with the period before.
 */
type Tab = "overview" | "campaigns" | "embeds" | "flicks"
type Open = { kind: "flick" | "campaign" | "placement" | "embed"; id: string; from?: Open }
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "campaigns", label: "Campaigns" },
  { id: "embeds", label: "Embeds" },
  { id: "flicks", label: "Flicks" },
]

export function AnalyticsPage({ data, loading }: { data: Dataset; loading: boolean }) {
  const [filter, setFilter] = useState<Filter>({ range: 30, source: "all", size: "all", compare: true })
  const [tab, setTab] = useState<Tab>("overview")
  const [open, setOpenRaw] = useState<Open | null>(null)
  const go = (o: Omit<Open, "from">) => setOpenRaw((cur) => ({ ...o, from: cur ?? undefined }))
  const back = () => setOpenRaw((cur) => cur?.from ?? null)
  const sizes = [...new Set(data.flicks.map((f) => f.size))]
  // the source filter only means something where all sources mix
  const showSource = !open ? tab === "overview" || tab === "flicks" : open.kind === "flick"
  const scoped: Filter = showSource ? filter : { ...filter, source: "all" }
  const backLabel = !open?.from ? TABS.find((t) => t.id === tab)!.label : open.from.kind === "campaign" ? data.campaigns.find((c) => c.id === open.from!.id)?.name ?? "Back" : "Back"

  const header = (() => {
    if (!open) return null
    if (open.kind === "flick") {
      const m = data.flicks.find((f) => f.id === open.id)
      return m && <Head image={m.image} title={m.name} sub={`${m.size}${m.campaign ? ` · ${m.campaign}` : ""} · ${m.variants.length} variations`} />
    }
    if (open.kind === "campaign") {
      const c = data.campaigns.find((x) => x.id === open.id)
      const n = data.places.filter((p) => p.campaignId === open.id).length
      return c && <Head title={c.name} sub={`Campaign · ${n} placement${n === 1 ? "" : "s"}`} />
    }
    const p = data.places.find((x) => x.id === open.id)
    const camp = p?.campaignId ? data.campaigns.find((c) => c.id === p.campaignId)?.name : undefined
    return p && <Head title={p.name} sub={p.kind === "placement" ? `Placement · ${p.size} · ${p.platform}${camp ? ` · ${camp}` : ""}` : `Embed · ${p.size}`} />
  })()

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-8 md:px-8 md:py-10">
      {open ? (
        <div className="flex flex-col gap-1">
          <button type="button" onClick={back} className="flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            {backLabel}
          </button>
          {header}
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <h1 className="text-2xl font-medium tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">How people watch, switch and click, across campaigns, embeds and links.</p>
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

      <Filters filter={filter} setFilter={setFilter} sizes={open ? null : sizes} showSource={showSource} onExport={() => exportCsv(data, scoped, tab, open)} disabled={!data.flicks.length} />

      {loading ? (
        <LoadingState />
      ) : !data.flicks.length ? (
        <EmptyState />
      ) : open?.kind === "flick" ? (
        <FlickView key={open.id} data={data} meta={data.flicks.find((f) => f.id === open.id)!} filter={scoped} />
      ) : open?.kind === "campaign" ? (
        <CampaignView key={open.id} data={data} id={open.id} filter={scoped} go={go} />
      ) : open ? (
        <PlaceView key={open.id} data={data} id={open.id} filter={scoped} go={go} />
      ) : tab === "overview" ? (
        <Overview data={data} filter={scoped} go={go} onTab={setTab} />
      ) : tab === "campaigns" ? (
        <CampaignsTab data={data} filter={scoped} go={go} />
      ) : tab === "embeds" ? (
        <EmbedsTab data={data} filter={scoped} go={go} />
      ) : (
        <Overview data={data} filter={scoped} go={go} onTab={setTab} flicksOnly />
      )}
    </div>
  )
}

function Head({ image, title, sub }: { image?: string; title: string; sub: string }) {
  return (
    <div className="mt-2 flex items-center gap-3">
      {image && <img src={image} alt="" className="size-12 rounded-xl object-cover ring-1 ring-foreground/10" />}
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-medium tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

// ---------- filters ----------

function Filters({ filter, setFilter, sizes, showSource, onExport, disabled }: { filter: Filter; setFilter: (f: Filter) => void; sizes: string[] | null; showSource: boolean; onExport: () => void; disabled: boolean }) {
  return (
    <div className="mt-6 flex flex-col gap-2">
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(filter.range)} onValueChange={(v) => setFilter({ ...filter, range: Number(v) as Range })}>
        <SelectTrigger className="w-40" aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {([7, 30, 90] as Range[]).map((r) => (
            <SelectItem key={r} value={String(r)}>
              {RANGE_LABEL[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showSource && (
      <Select value={filter.source} onValueChange={(v) => setFilter({ ...filter, source: v as Source | "all" })}>
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
      {sizes && (
        <Select value={filter.size} onValueChange={(v) => setFilter({ ...filter, size: v })}>
          <SelectTrigger className="w-36" aria-label="Size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sizes</SelectItem>
            {sizes.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={filter.compare ? "prev" : "none"} onValueChange={(v) => setFilter({ ...filter, compare: v === "prev" })}>
        <SelectTrigger className="w-56" aria-label="Compare">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="prev">Compare: previous period</SelectItem>
          <SelectItem value="none">No comparison</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={onExport} disabled={disabled}>
        <HugeiconsIcon icon={Download01Icon} className="size-4" />
        Export CSV
      </Button>
    </div>
    <p className="text-xs text-muted-foreground">
      {periodLabel(filter.range)}
      {filter.compare && <> · compared with {periodLabel(filter.range, 1)}</>}
    </p>
    </div>
  )
}

// ---------- shared pieces ----------

function Delta({ cur, prev, invert, neutral }: { cur: number; prev: number; invert?: boolean; neutral?: boolean }) {
  const c = change(cur, prev)
  if (c === null || !isFinite(c)) return <span className="text-xs text-muted-foreground">No earlier data</span>
  // a jump this big means the earlier period barely had data: say so instead of a meaningless %
  if (c > 4) return <span className="text-xs text-muted-foreground">Mostly new this period</span>
  const up = c >= 0
  const good = invert ? !up : up
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", Math.abs(c) < 0.005 || neutral ? "text-muted-foreground" : good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
      <HugeiconsIcon icon={up ? ArrowUp01Icon : ArrowDown01Icon} className="size-3.5" />
      {fmtPct(Math.abs(c), Math.abs(c) < 0.1 ? 1 : 0)}
      <span className="ml-1 font-normal text-muted-foreground">vs previous</span>
    </span>
  )
}

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

function SourcesCard({ rows }: { rows: ReturnType<typeof slice> }) {
  const items = SOURCES.map((s) => ({ ...s, t: sum(rows.filter((r) => r.source === s.id)) })).filter((s) => s.t.played > 0)
  return (
    <Section title="By source" description="Views, with interaction rate and click-through rate">
      {items.length ? (
        <BarList
          items={items.map((s) => ({ label: s.label, value: s.t.played, color: SERIES[SOURCES.findIndex((x) => x.id === s.id)], note: `${fmtPct(M.interaction(s.t), 0)} · ${fmtPct(M.ctr(s.t))}` }))}
          format={fmtCompact}
          detail={(i) => [
            { label: "views", value: fmtInt(items[i].t.played) },
            { label: "interaction rate", value: fmtPct(M.interaction(items[i].t)) },
            { label: "click-through rate", value: fmtPct(M.ctr(items[i].t)) },
            ...(items[i].id === "ads" ? [{ label: "spend", value: fmtUsd(items[i].t.spend) }] : []),
          ]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No views from these sources in this period.</p>
      )}
    </Section>
  )
}

// ---------- metrics: tiles that choose the chart ----------

type Metric = { id: string; label: string; v: (t: Totals) => number; tile: (n: number, t: Totals) => string; fmt: (n: number) => string; axis: (n: number) => string; hint: string; invert?: boolean; neutral?: boolean }
const MT = {
  views: { id: "views", label: "Views", v: M.views, tile: (n: number) => fmtCompact(n), fmt: fmtInt, axis: fmtCompact, hint: "Times a Flick started playing. Ad impressions that didn’t play aren’t counted." },
  impressions: { id: "impressions", label: "Impressions", v: (t: Totals) => t.loaded, tile: (n: number) => fmtCompact(n), fmt: fmtInt, axis: fmtCompact, hint: "Ads that loaded. Each is charged from your Ad Balance at its country’s CPM." },
  interaction: { id: "interaction", label: "Interaction rate", v: M.interaction, tile: (n: number) => fmtPct(n), fmt: (n: number) => fmtPct(n), axis: (n: number) => fmtPct(n, 0), hint: "Share of views where someone tapped at least once: a thumbnail, a button or the video." },
  switches: { id: "switches", label: "Switches per view", v: M.switchesPerView, tile: (n: number) => n.toFixed(2), fmt: (n: number) => n.toFixed(2), axis: (n: number) => n.toFixed(1), hint: "How many times, on average, a viewer moved between variations." },
  ctr: { id: "ctr", label: "Click-through rate", v: M.ctr, tile: (n: number) => fmtPct(n), fmt: (n: number) => fmtPct(n), axis: (n: number) => fmtPct(n, 1), hint: "Button taps that opened a link, per view." },
  spend: { id: "spend", label: "Spend", v: (t: Totals) => t.spend, tile: (n: number) => fmtUsd(n), fmt: fmtUsd, axis: (n: number) => `$${fmtCompact(n)}`, hint: "Charged from your Ad Balance.", neutral: true },
  cpi: { id: "cpi", label: "Cost per interaction", v: M.costPerInteraction, tile: (n: number, t: Totals) => (t.interacted ? fmtUsd(n) : "—"), fmt: fmtUsd, axis: (n: number) => `$${n.toFixed(2)}`, hint: "Ad spend divided by ad views with an interaction.", invert: true },
} satisfies Record<string, Metric>
const VIEW_SET: Metric[] = [MT.views, MT.interaction, MT.switches, MT.ctr]
const AD_SET: Metric[] = [MT.impressions, MT.interaction, MT.ctr, MT.spend, MT.cpi]

/**
 * The headline numbers as tiles, each with its trend; the selected tile chooses the chart below
 * (Reddit and Google Ads style). Rows ticked in a table below draw their own lines instead.
 */
function MetricStrip({ rows, prevRows, filter, metrics, sel }: { rows: Row[]; prevRows: Row[]; filter: Filter; metrics: Metric[]; sel?: Selection }) {
  const [mid, setMid] = useState(metrics[0].id)
  const [asTable, setAsTable] = useState(false)
  const m = metrics.find((x) => x.id === mid) ?? metrics[0]
  const t = sum(rows)
  const p = sum(prevRows)
  const labels = daily(rows, filter, M.views).map((d) => dayLabel(d.day))
  const picks = sel?.sel ?? []
  const lines: Line[] = picks.length
    ? picks.map((s) => ({ name: s.name, color: s.color, values: daily(rows.filter(s.pred), filter, m.v).map((d) => d.value), area: false }))
    : [
        { name: m.label, color: "var(--series-1)", values: daily(rows, filter, m.v).map((d) => d.value) },
        ...(filter.compare ? [{ name: "Previous period", color: "var(--viz-prev)", values: daily(prevRows, filter, m.v, 1).map((d) => d.value), dashed: true }] : []),
      ]
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div role="tablist" aria-label="Metrics" className={cn("grid grid-cols-2 gap-px border-b bg-foreground/5", metrics.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        {metrics.map((x) => {
          const on = x.id === m.id
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setMid(x.id)}
              className={cn("relative flex flex-col gap-1.5 bg-card p-4 text-left outline-none last:odd:col-span-2 lg:last:odd:col-span-1 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", on ? "bg-[color-mix(in_oklch,var(--primary)_5%,var(--card))]" : "hover:bg-muted/50")}
            >
              {on && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />}
              <span className={cn("text-sm", on ? "font-medium text-foreground" : "text-muted-foreground")}>{x.label}</span>
              <span className="flex items-end justify-between gap-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">{x.tile(x.v(t), t)}</span>
                <Spark values={daily(rows, filter, x.v).map((d) => d.value)} color={on ? "var(--series-1)" : "var(--viz-axis)"} className="mb-1 shrink-0 max-sm:hidden" />
              </span>
              {filter.compare ? <Delta cur={x.v(t)} prev={x.v(p)} invert={x.invert} neutral={x.neutral} /> : null}
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-medium">{m.label} by day</h2>
            <p className="text-xs text-muted-foreground">{m.hint}</p>
          </div>
          <div className="flex items-center gap-3">
            <Legend items={lines.map((l) => ({ label: l.name === m.label ? RANGE_LABEL[filter.range] : l.name, color: l.color, line: true, dashed: l.dashed }))} />
            {picks.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={sel?.clear}>
                Clear
              </Button>
            )}
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
        {asTable ? (
          <div className="max-h-[260px] overflow-y-auto [scrollbar-width:thin]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 text-left font-normal">Day</th>
                  {lines.map((l) => (
                    <th key={l.name} className="py-1.5 text-right font-normal">
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
                      <td key={l.name} className={cn("py-1.5 text-right tabular-nums", l.dashed && "text-muted-foreground")}>
                        {m.fmt(l.values[i] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <LinesChart lines={lines} labels={labels} format={m.fmt} axisFormat={m.axis} label={`${m.label} by day`} />
        )}
        {sel && !picks.length && <p className="text-xs text-muted-foreground">Tick rows in the table below to compare them here.</p>}
      </div>
    </Card>
  )
}

// ---------- ticking rows to compare them on the chart (Vimeo style) ----------

type Sel = { id: string; name: string; color: string; pred: (r: Row) => boolean }
type Selection = { sel: Sel[]; toggle: (x: Omit<Sel, "color">) => void; clear: () => void }
const MAX_SEL = 5
function useSelection(): Selection {
  const [sel, setSel] = useState<Sel[]>([])
  return {
    sel,
    // a row keeps its colour while it's ticked; the colour follows the row, not its position
    toggle: (x) => setSel((s) => (s.some((y) => y.id === x.id) ? s.filter((y) => y.id !== x.id) : s.length >= MAX_SEL ? s : [...s, { ...x, color: SERIES.find((c) => !s.some((y) => y.color === c))! }])),
    clear: () => setSel([]),
  }
}

function SelBox({ selection, id, name, pred }: { selection: Selection; id: string; name: string; pred: (r: Row) => boolean }) {
  const cur = selection.sel.find((s) => s.id === id)
  const full = !cur && selection.sel.length >= MAX_SEL
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!cur}
      aria-label={`Compare ${name} on the chart`}
      title={full ? `Up to ${MAX_SEL} at a time` : undefined}
      disabled={full}
      onClick={(e) => (e.stopPropagation(), selection.toggle({ id, name, pred }))}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn("grid size-4 place-items-center rounded-[5px] outline-none ring-1 ring-foreground/25 transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40", cur && "ring-0")}
      style={cur ? { background: cur.color } : undefined}
    >
      {cur && <HugeiconsIcon icon={Tick02Icon} className="size-3 text-white" strokeWidth={3} />}
    </button>
  )
}

// ---------- a written summary (HubSpot style) ----------

function Summary({ items }: { items: string[] }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  if (!items.length) return null
  return (
    <section aria-label="Summary" className="rounded-2xl bg-primary/5 p-5 ring-1 ring-primary/15">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={SparklesIcon} className="size-4 text-primary" />
        <h2 className="text-sm font-medium">Summary</h2>
        <span className="text-xs text-muted-foreground">From this period’s numbers</span>
        <div className="ml-auto flex items-center gap-0.5">
          {vote ? (
            <span className="text-xs text-muted-foreground">Thanks for the feedback</span>
          ) : (
            <>
              <Button variant="ghost" size="icon-sm" aria-label="Useful" onClick={() => setVote("up")}>
                <HugeiconsIcon icon={ThumbsUpIcon} className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Not useful" onClick={() => setVote("down")}>
                <HugeiconsIcon icon={ThumbsDownIcon} className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5 text-sm text-pretty">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------- comparing variations (Klaviyo A/B style) ----------

const frac = (x: number) => x - Math.floor(x)
function VariationTest({ meta, rows, filter, t }: { meta: FlickMeta; rows: Row[]; filter: Filter; t: Totals }) {
  const toast = useToast()
  const lead = leader(meta, t)
  const played = daily(rows, filter, M.views).map((d) => d.value)
  const clicks = daily(rows, filter, (x) => x.clicks).map((d) => d.value)
  const labels = daily(rows, filter, M.views).map((d) => dayLabel(d.day))
  const noise = (d: number, i: number) => 0.85 + 0.3 * frac(Math.sin(d * 12.9898 + i * 78.233) * 43758.5453)
  // click-through rate per variation, as a 7-day average so a quiet day doesn't swing it
  const lines: Line[] = meta.variants.map((v, i) => ({
    name: v.name,
    color: SERIES[i % SERIES.length],
    area: false,
    values: played.map((_, d) => {
      let vw = 0
      let ck = 0
      for (let k = Math.max(0, d - 6); k <= d; k++) {
        vw += played[k] * v.view * noise(k, i)
        ck += clicks[k] * v.click * noise(k + 97, i)
      }
      return rate(ck, vw)
    }),
  }))
  if (!lead.best || !lead.runnerUp || !t.played) return null
  const sure = lead.confidence >= 0.95
  const best = meta.variants[lead.best.i]
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Win probability</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{(lead.confidence * 100).toFixed(1)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            that {best.name} gets more clicks per view than {lead.runnerUp.name}
          </p>
        </div>
        <span className={cn("w-fit rounded-full px-2 py-0.5 text-xs", sure ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground ring-1 ring-foreground/10")}>{sure ? "Significant" : "Not significant yet · needs 95%"}</span>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Leading</dt>
          <dd className="flex items-center gap-1.5 font-medium">
            <span aria-hidden className="size-2 rounded-full" style={{ background: SERIES[lead.best.i % SERIES.length] }} />
            {best.name}
          </dd>
          <dt className="text-muted-foreground">Lift</dt>
          <dd className="tabular-nums">+{fmtPct(lead.lift, 0)} click-through</dd>
          <dt className="text-muted-foreground">Starts on</dt>
          <dd>{meta.variants[meta.start].name}</dd>
        </dl>
        <Button
          variant="outline"
          size="sm"
          disabled={lead.best.i === meta.start}
          onClick={() => toast({ title: `Remix to start on ${best.name}`, description: "Flicks don’t change. Remix opens a new project from this one, where you can set it to start on " + best.name + "." })}
        >
          {lead.best.i === meta.start ? "Already starts here" : `Remix starting on ${best.name}`}
        </Button>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Click-through rate by variation</p>
            <p className="text-xs text-muted-foreground">7-day average</p>
          </div>
          <Legend items={lines.map((l) => ({ label: l.name, color: l.color, line: true }))} />
        </div>
        <LinesChart lines={lines} labels={labels} format={(n) => fmtPct(n)} axisFormat={(n) => fmtPct(n, 1)} height={220} label="Click-through rate by variation" />
      </div>
    </div>
  )
}

// ---------- when people switch, against the video (TikTok style) ----------

function MomentsCard({ meta, t }: { meta: FlickMeta; t: Totals }) {
  const peak = meta.timeline.indexOf(Math.max(...meta.timeline))
  const [active, setActive] = useState<number | null>(null)
  const bin = active ?? peak
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = video.current
    if (v && v.readyState >= 1) v.currentTime = bin / 2 + 0.25
  }, [bin])
  const start = meta.variants[meta.start]
  const [w, h] = meta.size.split("×").map(Number)
  const width = Math.min(220, (190 * w) / h)
  return (
    <Section title="When people switch" description="Hover the bars to see that moment in the video">
      <div className="flex gap-4 max-sm:flex-col">
        <div className="relative shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10" style={{ width, height: (width * h) / w }}>
          <video
            ref={video}
            src={start.src}
            poster={start.poster}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => (e.currentTarget.currentTime = bin / 2 + 0.25)}
            className="size-full object-cover"
          />
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] tabular-nums text-white">{(bin / 2).toFixed(1)}s</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <MomentChart bins={meta.timeline} seconds={VIDEO_SECONDS} total={t.switches} active={bin} onActive={setActive} />
          <p className="text-sm">
            <span className="font-semibold tabular-nums">{fmtPct(meta.timeline[bin])}</span>{" "}
            <span className="text-muted-foreground">
              of switches happen between {(bin / 2).toFixed(1)}s and {((bin + 1) / 2).toFixed(1)}s{bin === peak ? ", the busiest moment" : ""}.
            </span>
          </p>
        </div>
      </div>
    </Section>
  )
}

// ---------- overview ----------

type SortKey = "views" | "interaction" | "switches" | "ctr" | "spend"

function Overview({ data, filter, go, onTab, flicksOnly }: { data: Dataset; filter: Filter; go: (o: Omit<Open, "from">) => void; onTab: (t: Tab) => void; flicksOnly?: boolean }) {
  const onOpen = (id: string) => go({ kind: "flick", id })
  const rows = useMemo(() => slice(data, filter), [data, filter])
  const prevRows = useMemo(() => slice(data, filter, 1), [data, filter])
  const t = sum(rows)
  const p = sum(prevRows)
  const ads = filter.source === "all" || filter.source === "ads"
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "views", desc: true })
  const selection = useSelection()

  const perFlick = data.flicks
    .filter((f) => filter.size === "all" || f.size === filter.size)
    .map((f) => {
      const fr = rows.filter((r) => r.flickId === f.id)
      const ft = sum(fr)
      return { meta: f, t: ft, spark: daily(fr, filter, M.views).map((d) => d.value), lead: leader(f, ft) }
    })
  const val = (x: (typeof perFlick)[number]) =>
    sort.key === "views" ? x.t.played : sort.key === "interaction" ? M.interaction(x.t) : sort.key === "switches" ? M.switchesPerView(x.t) : sort.key === "ctr" ? M.ctr(x.t) : x.t.spend
  const sorted = [...perFlick].sort((a, b) => (sort.desc ? val(b) - val(a) : val(a) - val(b)))

  // plain-language callouts
  const insights: string[] = []
  const views = change(t.played, p.played)
  if (views !== null)
    insights.push(
      views > 4
        ? `${fmtCompact(t.played)} views in the last ${filter.range} days, against ${fmtCompact(p.played)} before. Most come from embeds and ads that started this period.`
        : `Views are ${views >= 0 ? "up" : "down"} ${fmtPct(Math.abs(views), 0)} on the previous ${filter.range} days, with ${fmtCompact(t.played)} in all.`,
    )
  const bySource = SOURCES.map((s) => ({ ...s, t: sum(rows.filter((r) => r.source === s.id)) })).filter((s) => s.t.played > 200)
  if (bySource.length > 1) {
    const s = [...bySource].sort((a, b) => M.ctr(b.t) - M.ctr(a.t))
    insights.push(`Views from ${PLURAL[s[0].id]} get the most clicks: ${fmtPct(M.ctr(s[0].t))} click through, against ${fmtPct(M.ctr(s[s.length - 1].t))} from ${PLURAL[s[s.length - 1].id]}.`)
  }
  const active = perFlick.filter((x) => x.t.played > 500)
  if (active.length) {
    const top = [...active].sort((a, b) => M.interaction(b.t) - M.interaction(a.t))[0]
    insights.push(`“${top.meta.name}” gets the most taps: ${fmtPct(M.interaction(top.t), 0)} of its viewers interact, ${fmtPct(M.interaction(top.t) - M.interaction(t), 0)} above average.`)
  }

  const early = t.played < EARLY
  const head = (key: SortKey, label: string, cls?: string) => (
    <th className={cn("py-2 font-normal", cls)} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
        className={cn("inline-flex items-center gap-1 rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", sort.key === key && "font-medium text-foreground")}
      >
        {label}
        <HugeiconsIcon icon={sort.key === key ? (sort.desc ? ArrowDown01Icon : ArrowUp01Icon) : ArrowUpDownIcon} className="size-3.5" />
      </button>
    </th>
  )

  return (
    <div className="mt-6 flex flex-col gap-6">
      {early && <EarlyNote />}
      <MetricStrip rows={rows} prevRows={prevRows} filter={filter} metrics={ads && t.spend > 0 ? [MT.views, MT.interaction, MT.switches, MT.ctr, MT.cpi] : VIEW_SET} sel={flicksOnly ? selection : undefined} />
      {!early && <Summary items={insights} />}
      {!flicksOnly && (
        <div className="grid gap-6 lg:grid-cols-2">
          <FunnelCard t={t} />
          <SourcesCard rows={rows} />
        </div>
      )}
      {flicksOnly ? (
      <Section title="Flicks" description="Open one to see its variations, switches and funnel. Tick up to 5 to compare them on the chart.">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-right">
                <th className="w-8 py-2 pl-2" aria-label="Compare" />
                <th className="py-2 text-left font-normal">Flick</th>
                {head("views", "Views")}
                <th className="py-2 font-normal">Trend</th>
                {head("interaction", "Interaction")}
                {head("switches", "Switches/view")}
                {head("ctr", "CTR")}
                <th className="py-2 pl-4 text-left font-normal">Best variation</th>
                {ads && head("spend", "Spend", "pr-2")}
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ meta, t: ft, spark, lead }) => (
                <tr key={meta.id} tabIndex={0} onClick={() => onOpen(meta.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(meta.id)} className="cursor-pointer border-t border-foreground/5 text-right outline-none hover:bg-muted/60 focus-visible:bg-muted/60">
                  <td className="py-2 pl-2">
                    <SelBox selection={selection} id={meta.id} name={meta.name} pred={(r) => r.flickId === meta.id} />
                  </td>
                  <td className="py-2 text-left">
                    <span className="flex items-center gap-3">
                      <img src={meta.image} alt="" className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{meta.name}</span>
                        <span className="block text-xs text-muted-foreground">{meta.size}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2 tabular-nums">{ft.played ? fmtCompact(ft.played) : "—"}</td>
                  <td className="py-2">{ft.played > 0 && <Spark values={spark} className="ml-auto" />}</td>
                  <td className="py-2 tabular-nums">{ft.played ? fmtPct(M.interaction(ft), 0) : "—"}</td>
                  <td className="py-2 tabular-nums">{ft.played ? M.switchesPerView(ft).toFixed(2) : "—"}</td>
                  <td className="py-2 tabular-nums">{ft.played ? fmtPct(M.ctr(ft)) : "—"}</td>
                  <td className="py-2 pl-4 text-left">{ft.played > 0 && lead.best ? <LeaderChip name={lead.best.name} confidence={lead.confidence} /> : <span className="text-muted-foreground">—</span>}</td>
                  {ads && <td className="py-2 pr-2 tabular-nums">{ft.spend ? fmtUsd(ft.spend) : "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      ) : (
        <TopLists data={data} filter={filter} go={go} onTab={onTab} />
      )}
    </div>
  )
}

function LeaderChip({ name, confidence }: { name: string; confidence: number }) {
  const sure = confidence >= 0.95
  const likely = confidence >= 0.8
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-medium">{name}</span>
      <span className={cn("rounded-full px-1.5 py-0.5 text-[11px]", sure ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{sure ? "Clear lead" : likely ? "Likely" : "Too early"}</span>
    </span>
  )
}

// ---------- one Flick ----------

function FlickView({ data, meta, filter }: { data: Dataset; meta: FlickMeta; filter: Filter }) {
  const rows = useMemo(() => slice(data, filter, 0, meta.id), [data, filter, meta.id])
  const prevRows = useMemo(() => slice(data, filter, 1, meta.id), [data, filter, meta.id])
  const t = sum(rows)
  const lead = leader(meta, t)
  const names = meta.variants.map((v) => v.name)
  const early = t.played < EARLY
  const ads = t.spend > 0
  const selection = useSelection()

  const peak = meta.timeline.indexOf(Math.max(...meta.timeline))
  const insights: string[] = []
  if (lead.best && t.played > 0) {
    const v = meta.variants[lead.best.i]
    insights.push(
      `${v.name} gets ${fmtPct(v.click, 0)} of clicks from ${fmtPct(v.view, 0)} of views. ` +
        (lead.confidence >= 0.95 ? `Its click-through rate is ${fmtPct(lead.lift, 0)} higher than ${lead.runnerUp?.name}’s, a clear lead.` : lead.confidence >= 0.8 ? `It’s likely ahead of ${lead.runnerUp?.name}; give it more views to be sure.` : `Too early to say it beats ${lead.runnerUp?.name}.`),
    )
  }
  insights.push(`Most switches happen around ${(peak / 2 + 0.25).toFixed(1)}s into the video. ${peak < 4 ? "People start exploring almost right away." : "People watch a while before switching."}`)
  const ended = [...meta.variants].sort((a, b) => b.end - a.end)[0]
  if (ended) insights.push(`${fmtPct(ended.end, 0)} of viewers end on ${ended.name}, the most of any variation${meta.variants.indexOf(ended) === meta.start ? ", which is also where the Flick starts" : ""}.`)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {early && <EarlyNote />}
      <MetricStrip rows={rows} prevRows={prevRows} filter={filter} metrics={ads ? [MT.views, MT.interaction, MT.switches, MT.ctr, MT.cpi] : VIEW_SET} sel={selection} />
      {!early && <Summary items={insights} />}

      <Section title="Variations" description="Which variation people watch, stay on, end on and click">
        <div className="flex flex-col gap-6">
          <VariationTest meta={meta} rows={rows} filter={filter} t={t} />
          <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-right">
                <th className="py-2 pl-2 text-left font-normal">Variation</th>
                <th className="w-[30%] py-2 pl-4 text-left font-normal">Share of views</th>
                <th className="py-2 font-normal">Avg time on it</th>
                <th className="py-2 font-normal">Ended on</th>
                <th className="py-2 font-normal">Clicks</th>
                <th className="py-2 pr-2 font-normal">CTR</th>
              </tr>
            </thead>
            <tbody>
              {meta.variants.map((v, i) => {
                const views = t.played * v.view
                const clicks = t.clicks * v.click
                const best = lead.best?.i === i && t.played > 0
                return (
                  <tr key={v.name} className="border-t border-foreground/5 text-right">
                    <td className="py-2 pl-2 text-left">
                      <span className="flex items-center gap-2.5">
                        <span className="relative">
                          <img src={v.poster} alt="" className="h-10 w-8 rounded-md object-cover ring-1 ring-foreground/10" />
                          <span aria-hidden className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card" style={{ background: SERIES[i % SERIES.length] }} />
                        </span>
                        <span className="font-medium">{v.name}</span>
                        {i === meta.start && <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">Starts here</Badge>}
                        {best && <Badge className="h-5 px-1.5 text-[11px] font-normal">Most clicks per view</Badge>}
                      </span>
                    </td>
                    <td className="py-2 pl-4">
                      <span className="flex items-center gap-2">
                        <span className="h-2 flex-1 rounded-full bg-muted">
                          <span className="block h-full rounded-full" style={{ width: `${v.view * 100}%`, background: SERIES[i % SERIES.length] }} />
                        </span>
                        <span className="w-10 tabular-nums">{fmtPct(v.view, 0)}</span>
                      </span>
                    </td>
                    <td className="py-2 tabular-nums">{fmtSec(v.time)}</td>
                    <td className="py-2 tabular-nums">{fmtPct(v.end, 0)}</td>
                    <td className="py-2 tabular-nums">{fmtInt(clicks)}</td>
                    <td className={cn("py-2 pr-2 tabular-nums", best && "font-semibold")}>{fmtPct(rate(clicks, views))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Where people switch" description={`${fmtInt(t.switches)} switches. Share of all switches, from each variation to another`}>
          <SwitchGrid names={names} matrix={meta.matrix} total={t.switches} />
        </Section>
        <MomentsCard meta={meta} t={t} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelCard t={t} />
        <SourcesCard rows={rows} />
      </div>

      <Section title="Where it ran" description="Its link, and each placement and embed it has been in. Tick up to 5 to compare them on the chart.">
        <DataTable
          selection={selection}
          nameLabel="Where"
          cols={[C.views, C.interaction, C.ctr, C.clicks, C.spend]}
          rows={[...new Set(rows.map((r) => r.where))].map((w) => {
            const pl = data.places.find((x) => x.id === w)
            const camp = pl?.campaignId ? data.campaigns.find((c) => c.id === pl.campaignId)?.name : undefined
            return {
              id: w,
              name: pl ? pl.name : "Its link",
              sub: pl ? (pl.kind === "placement" ? `Placement · ${camp ?? ""} · ${pl.platform}` : "Embed") : "Shared directly",
              badge: pl && pl.current === meta.id ? (pl.kind === "placement" ? "Serving" : "Showing") : undefined,
              t: sum(rows.filter((r) => r.where === w)),
              pred: (r: Row) => r.where === w,
            }
          })}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Devices">
          <BarList items={meta.devices.map((d) => ({ label: d.label, value: d.share }))} format={(n) => fmtPct(n, 0)} detail={(i) => [{ label: "views", value: fmtInt(t.played * meta.devices[i].share) }]} />
        </Section>
        <Section title="Countries">
          <BarList items={meta.countries.map((d) => ({ label: d.label, value: d.share }))} format={(n) => fmtPct(n, 0)} detail={(i) => [{ label: "views", value: fmtInt(t.played * meta.countries[i].share) }]} />
        </Section>
      </div>
    </div>
  )
}

// ---------- states ----------

function EarlyNote() {
  return (
    <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
      <span className="font-medium">Early numbers.</span> <span className="text-muted-foreground">Fewer than {EARLY} views so far. Rates move a lot until more people watch.</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
      <HugeiconsIcon icon={ChartLineData01Icon} className="size-6 text-muted-foreground" />
      <p className="font-medium">No numbers yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">Export a Flick and share its link, embed it, or serve it in ads. Views, switches and clicks show here as people watch.</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="mt-6 flex flex-col gap-6" aria-busy>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-[320px] rounded-2xl" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
      <Skeleton className="h-[360px] rounded-2xl" />
    </div>
  )
}

// ---------- export ----------

function exportCsv(data: Dataset, filter: Filter, tab: Tab, open: Open | null) {
  const rows = slice(data, filter)
  const head = ["Name", "Impressions", "Views", "Interaction rate", "Switches per view", "CTR", "Clicks", "Spend"]
  const line = (name: string, t: Totals) =>
    [`"${name.replace(/"/g, '""')}"`, Math.round(t.loaded), Math.round(t.played), M.interaction(t).toFixed(4), M.switchesPerView(t).toFixed(2), M.ctr(t).toFixed(4), Math.round(t.clicks), t.spend.toFixed(2)].join(",")
  let lines: string[]
  let name: string
  if (open?.kind === "campaign" || (!open && tab === "campaigns")) {
    const places = data.places.filter((p) => p.kind === "placement" && (!open || p.campaignId === open.id))
    lines = places.map((p) => line(p.name, sum(rows.filter((r) => r.where === p.id))))
    name = "placements"
  } else if (open?.kind === "placement" || open?.kind === "embed") {
    lines = data.flicks.map((f) => ({ f, t: sum(rows.filter((r) => r.where === open.id && r.flickId === f.id)) })).filter((x) => x.t.played).map((x) => line(x.f.name, x.t))
    name = "flicks-in-" + open.kind
  } else if (!open && tab === "embeds") {
    lines = data.places.filter((p) => p.kind === "embed").map((p) => line(p.name, sum(rows.filter((r) => r.where === p.id))))
    name = "embeds"
  } else {
    lines = data.flicks.filter((f) => !open || f.id === open.id).map((f) => line(f.name, sum(rows.filter((r) => r.flickId === f.id))))
    name = "flicks"
  }
  saveFile(`analytics-${name}-${filter.range}d.csv`, "text/csv", [head.join(","), ...lines].join("\n"))
}

// ---------- campaigns, placements and embeds ----------

const cpm = (t: Totals) => rate(t.spend, t.loaded) * 1000
type Col = { id: string; label: string; v: (t: Totals) => number; f: (n: number, t: Totals) => string }
const C = {
  impressions: { id: "impressions", label: "Impressions", v: (t: Totals) => t.loaded, f: (n: number) => fmtCompact(n) },
  views: { id: "views", label: "Views", v: (t: Totals) => t.played, f: (n: number) => fmtCompact(n) },
  interaction: { id: "interaction", label: "Interaction", v: M.interaction, f: (n: number, t: Totals) => (t.played ? fmtPct(n, 0) : "—") },
  switches: { id: "switches", label: "Switches/view", v: M.switchesPerView, f: (n: number, t: Totals) => (t.played ? n.toFixed(2) : "—") },
  ctr: { id: "ctr", label: "CTR", v: M.ctr, f: (n: number, t: Totals) => (t.played ? fmtPct(n) : "—") },
  clicks: { id: "clicks", label: "Clicks", v: (t: Totals) => t.clicks, f: (n: number) => fmtInt(n) },
  spend: { id: "spend", label: "Spend", v: (t: Totals) => t.spend, f: (n: number) => (n ? fmtUsd(n) : "—") },
  cpm: { id: "cpm", label: "CPM", v: cpm, f: (n: number, t: Totals) => (t.loaded ? fmtUsd(n) : "—") },
  cpi: { id: "cpi", label: "Cost/interaction", v: M.costPerInteraction, f: (n: number, t: Totals) => (t.interacted ? fmtUsd(n) : "—") },
} satisfies Record<string, Col>
const AD_COLS: Col[] = [C.impressions, C.views, C.interaction, C.ctr, C.spend, C.cpm, C.cpi]
const VIEW_COLS: Col[] = [C.views, C.interaction, C.switches, C.ctr, C.clicks]

type TRow = { id: string; name: string; sub?: string; image?: string; badge?: string; t: Totals; onClick?: () => void; pred?: (r: Row) => boolean }

/** A sortable table of things (campaigns, placements, embeds, Flicks) with the same measures. */
function DataTable({ rows, cols, empty = "Nothing in this period.", nameLabel = "Name", selection }: { rows: TRow[]; cols: Col[]; empty?: string; nameLabel?: string; selection?: Selection }) {
  const [sort, setSort] = useState<{ id: string; desc: boolean }>({ id: cols[0].id, desc: true })
  const col = cols.find((c) => c.id === sort.id) ?? cols[0]
  const sorted = [...rows].sort((a, b) => (sort.desc ? col.v(b.t) - col.v(a.t) : col.v(a.t) - col.v(b.t)))
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: 260 + cols.length * 96 }}>
        <thead className="text-xs text-muted-foreground">
          <tr className="text-right">
            {selection && <th className="w-8 py-2 pl-2" aria-label="Compare" />}
            <th className={cn("py-2 text-left font-normal", !selection && "pl-2")}>{nameLabel}</th>
            {cols.map((c, i) => (
              <th key={c.id} className={cn("py-2 font-normal", i === cols.length - 1 && "pr-2")} aria-sort={sort.id === c.id ? (sort.desc ? "descending" : "ascending") : "none"}>
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ id: c.id, desc: s.id === c.id ? !s.desc : true }))}
                  className={cn("inline-flex items-center gap-1 rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", sort.id === c.id && "font-medium text-foreground")}
                >
                  {c.label}
                  <HugeiconsIcon icon={sort.id === c.id ? (sort.desc ? ArrowDown01Icon : ArrowUp01Icon) : ArrowUpDownIcon} className="size-3.5" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              tabIndex={r.onClick ? 0 : undefined}
              onClick={r.onClick}
              onKeyDown={(e) => e.key === "Enter" && r.onClick?.()}
              className={cn("border-t border-foreground/5 text-right outline-none", r.onClick && "cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60")}
            >
              {selection && (
                <td className="py-2 pl-2">
                  {r.pred && r.t.played > 0 && <SelBox selection={selection} id={r.id} name={r.name} pred={r.pred} />}
                </td>
              )}
              <td className={cn("py-2 text-left", !selection && "pl-2")}>
                <span className="flex items-center gap-3">
                  {r.image && <img src={r.image} alt="" className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10" />}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{r.name}</span>
                      {r.badge && <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[11px] font-normal">{r.badge}</Badge>}
                    </span>
                    {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                  </span>
                </span>
              </td>
              {cols.map((c, i) => (
                <td key={c.id} className={cn("py-2 tabular-nums", i === cols.length - 1 && "pr-2", sort.id === c.id && "font-medium")}>
                  {c.f(c.v(r.t), r.t)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const byWhere = (rows: Row[], id: string) => sum(rows.filter((r) => r.where === id))
const byFlick = (rows: Row[], id: string) => sum(rows.filter((r) => r.flickId === id))
const placesOf = (data: Dataset, kind: "placement" | "embed", campaignId?: string) => data.places.filter((p) => p.kind === kind && (!campaignId || p.campaignId === campaignId))
const flickName = (data: Dataset, id?: string) => data.flicks.find((f) => f.id === id)?.name

/** Overview: the best of each, with a way into the full lists. */
function TopLists({ data, filter, go, onTab }: { data: Dataset; filter: Filter; go: (o: Omit<Open, "from">) => void; onTab: (t: Tab) => void }) {
  const rows = slice(data, filter)
  const camps = data.campaigns.map((c) => ({ id: c.id, name: c.name, t: sum(rows.filter((r) => placesOf(data, "placement", c.id).some((p) => p.id === r.where))) }))
  const embeds = placesOf(data, "embed").map((e) => ({ id: e.id, name: e.name, t: byWhere(rows, e.id) }))
  const flicks = data.flicks.map((f) => ({ id: f.id, name: f.name, image: f.image, t: byFlick(rows, f.id) }))
  const list = (title: string, items: { id: string; name: string; image?: string; t: Totals }[], kind: Open["kind"], tab: Tab, value: (t: Totals) => string, label: string) => (
    <Section title={title} tools={<Button variant="ghost" size="sm" className="-my-1 h-7 px-2 text-primary hover:text-primary" onClick={() => onTab(tab)}>See all</Button>}>
      <ul className="flex flex-col">
        {[...items].sort((a, b) => b.t.played - a.t.played).slice(0, 4).map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => go({ kind, id: x.id })} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2 text-left text-sm outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
              {x.image && <img src={x.image} alt="" className="size-8 shrink-0 rounded-md object-cover ring-1 ring-foreground/10" />}
              <span className="min-w-0 flex-1 truncate font-medium">{x.name}</span>
              <span className="shrink-0 text-right tabular-nums">
                {value(x.t)}
                <span className="block text-[11px] text-muted-foreground">{x.t.played ? `${fmtPct(M.interaction(x.t), 0)} interact` : "No views"}</span>
              </span>
            </button>
          </li>
        ))}
        {!items.length && <li className="py-2 text-sm text-muted-foreground">None yet.</li>}
      </ul>
      <span className="sr-only">{label}</span>
    </Section>
  )
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {list("Campaigns", camps, "campaign", "campaigns", (t) => `${fmtCompact(t.loaded)} impr.`, "by impressions")}
      {list("Embeds", embeds, "embed", "embeds", (t) => `${fmtCompact(t.played)} views`, "by views")}
      {list("Flicks", flicks, "flick", "flicks", (t) => `${fmtCompact(t.played)} views`, "by views")}
    </div>
  )
}

function CampaignsTab({ data, filter, go }: { data: Dataset; filter: Filter; go: (o: Omit<Open, "from">) => void }) {
  const f: Filter = { ...filter, source: "ads" }
  const rows = useMemo(() => slice(data, f), [data, filter])
  const prevRows = useMemo(() => slice(data, f, 1), [data, filter])
  const t = sum(rows)
  const selection = useSelection()
  const placements = placesOf(data, "placement")
  const campRows: TRow[] = data.campaigns.map((c) => {
    const ps = placesOf(data, "placement", c.id)
    return { id: c.id, name: c.name, sub: `${ps.length} placement${ps.length === 1 ? "" : "s"}`, t: sum(rows.filter((r) => ps.some((x) => x.id === r.where))), pred: (r: Row) => ps.some((y) => y.id === r.where), onClick: () => go({ kind: "campaign", id: c.id }) }
  })
  const placeRows: TRow[] = placements.map((x) => ({
    id: x.id,
    name: x.name,
    sub: `${data.campaigns.find((c) => c.id === x.campaignId)?.name ?? ""} · ${x.size} · ${x.platform}`,
    image: data.flicks.find((fl) => fl.id === x.current)?.image,
    t: byWhere(rows, x.id),
    pred: (r: Row) => r.where === x.id,
    onClick: () => go({ kind: "placement", id: x.id }),
  }))
  const insights: string[] = []
  const live = placeRows.filter((r) => r.t.interacted > 50)
  if (live.length > 1) {
    const s = [...live].sort((a, b) => M.costPerInteraction(a.t) - M.costPerInteraction(b.t))
    insights.push(`${s[0].name} is the cheapest place to get an interaction: ${fmtUsd(M.costPerInteraction(s[0].t))}, against ${fmtUsd(M.costPerInteraction(s[s.length - 1].t))} for ${s[s.length - 1].name}.`)
    const c = [...live].sort((a, b) => M.ctr(b.t) - M.ctr(a.t))
    insights.push(`${c[0].name} has the best click-through rate, ${fmtPct(M.ctr(c[0].t))}.`)
  }
  if (t.spend) insights.push(`${fmtUsd(t.spend)} spent for ${fmtCompact(t.loaded)} impressions, an average CPM of ${fmtUsd(cpm(t))}.`)
  return (
    <div className="mt-6 flex flex-col gap-6">
      <MetricStrip rows={rows} prevRows={prevRows} filter={f} metrics={AD_SET} sel={selection} />
      <Summary items={insights} />
      <Section title="Campaigns" description="Open one to see its placements and the Flicks they served. Tick to compare on the chart.">
        <DataTable selection={selection} rows={campRows} cols={AD_COLS} nameLabel="Campaign" />
      </Section>
      <Section title="Placements" description="Every placement across campaigns.">
        <DataTable selection={selection} rows={placeRows} cols={AD_COLS} nameLabel="Placement" empty="No placements have served yet." />
      </Section>
    </div>
  )
}

function CampaignView({ data, id, filter, go }: { data: Dataset; id: string; filter: Filter; go: (o: Omit<Open, "from">) => void }) {
  const ps = placesOf(data, "placement", id)
  const where = (r: Row) => ps.some((x) => x.id === r.where)
  const f: Filter = { ...filter, source: "ads" }
  const rows = useMemo(() => slice(data, f, 0, undefined, where), [data, filter, id])
  const prevRows = useMemo(() => slice(data, f, 1, undefined, where), [data, filter, id])
  const t = sum(rows)
  const selection = useSelection()
  const placeRows: TRow[] = ps.map((x) => ({ id: x.id, name: x.name, sub: `${x.size} · ${x.platform}${x.current ? ` · ${flickName(data, x.current)}` : " · No Flick yet"}`, t: byWhere(rows, x.id), pred: (r: Row) => r.where === x.id, onClick: () => go({ kind: "placement", id: x.id }) }))
  const served = [...new Set(rows.map((r) => r.flickId))]
  const flickRows: TRow[] = served.map((fid) => {
    const m = data.flicks.find((x) => x.id === fid)!
    const live = ps.some((x) => x.current === fid)
    return { id: fid, name: m.name, sub: m.size, image: m.image, badge: live ? "Serving" : undefined, t: byFlick(rows, fid), pred: (r: Row) => r.flickId === fid, onClick: () => go({ kind: "flick", id: fid }) }
  })
  // countries: each placement's split, weighted by its impressions
  const countries = new Map<string, number>()
  for (const x of ps) {
    const imp = byWhere(rows, x.id).loaded
    for (const c of x.countries ?? []) countries.set(c.label, (countries.get(c.label) ?? 0) + c.share * imp)
  }
  const cTotal = [...countries.values()].reduce((a, b) => a + b, 0) || 1
  const insights: string[] = []
  if (flickRows.length > 1) {
    const s = [...flickRows].sort((a, b) => M.interaction(b.t) - M.interaction(a.t))
    insights.push(`“${s[0].name}” gets ${fmtPct(M.interaction(s[0].t), 0)} of viewers to interact, the most of the ${flickRows.length} Flicks this campaign served.`)
  }
  const live = placeRows.filter((r) => r.t.interacted > 0)
  if (live.length > 1) {
    const s = [...live].sort((a, b) => M.costPerInteraction(a.t) - M.costPerInteraction(b.t))
    insights.push(`${s[0].name} gets interactions for ${fmtUsd(M.costPerInteraction(s[0].t))} each, the least in this campaign.`)
  }
  if (t.spend) insights.push(`${fmtUsd(t.spend)} spent in this period, ${fmtUsd(cpm(t))} per 1,000 impressions on average.`)
  return (
    <div className="mt-6 flex flex-col gap-6">
      <MetricStrip rows={rows} prevRows={prevRows} filter={f} metrics={AD_SET} sel={selection} />
      <Summary items={insights} />
      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelCard t={t} />
        <Section title="Countries" description="Share of impressions">
          <BarList items={[...countries.entries()].sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, value: v / cTotal }))} format={(n) => fmtPct(n, 0)} detail={(i) => [{ label: "impressions", value: fmtInt([...countries.values()].sort((a, b) => b - a)[i]) }]} />
        </Section>
      </div>
      <Section title="Placements" description="Open one to see each Flick it served.">
        <DataTable selection={selection} rows={placeRows} cols={AD_COLS} nameLabel="Placement" />
      </Section>
      <div className="grid gap-6">
        <Section title="Flicks served" description="How each Flick did in this campaign">
          <DataTable selection={selection} rows={flickRows} cols={[C.impressions, C.interaction, C.ctr, C.spend, C.cpi]} nameLabel="Flick" empty="No Flicks served in this period." />
        </Section>
      </div>
    </div>
  )
}

function PlaceView({ data, id, filter, go }: { data: Dataset; id: string; filter: Filter; go: (o: Omit<Open, "from">) => void }) {
  const place = data.places.find((x) => x.id === id)!
  const isAd = place.kind === "placement"
  const where = (r: Row) => r.where === id
  const f: Filter = { ...filter, source: isAd ? "ads" : "embed" }
  const rows = useMemo(() => slice(data, f, 0, undefined, where), [data, filter, id])
  const prevRows = useMemo(() => slice(data, f, 1, undefined, where), [data, filter, id])
  const allRows = useMemo(() => data.rows.filter(where), [data, id])
  const t = sum(rows)
  const selection = useSelection()
  // every Flick that has run here, newest first, with when it ran
  const history = [...new Set(allRows.map((r) => r.flickId))]
    .map((fid) => {
      const days = allRows.filter((r) => r.flickId === fid).map((r) => r.day)
      return { fid, from: Math.min(...days), to: Math.max(...days) }
    })
    .sort((a, b) => b.from - a.from)
  const flickRows: TRow[] = history.map((h) => {
    const m = data.flicks.find((x) => x.id === h.fid)!
    const live = place.current === h.fid
    return { id: h.fid, name: m.name, sub: `${dayLabel(h.from)} – ${live ? "now" : dayLabel(h.to)}`, image: m.image, badge: live ? (isAd ? "Serving" : "Showing") : undefined, t: byFlick(rows, h.fid), pred: (r: Row) => r.flickId === h.fid, onClick: () => go({ kind: "flick", id: h.fid }) }
  })
  // compare the Flick in it now with the one before, over each one's whole run
  const insights: string[] = []
  if (history.length > 1) {
    const now = sum(allRows.filter((r) => r.flickId === history[0].fid))
    const before = sum(allRows.filter((r) => r.flickId === history[1].fid))
    const d = change(M.interaction(now), M.interaction(before))
    const n0 = flickName(data, history[0].fid)
    const n1 = flickName(data, history[1].fid)
    if (d !== null) insights.push(`Since “${n0}” replaced “${n1}”, the interaction rate is ${d >= 0 ? "up" : "down"} ${fmtPct(Math.abs(d), 0)} (${fmtPct(M.interaction(now), 0)} against ${fmtPct(M.interaction(before), 0)}).`)
    const c = change(M.ctr(now), M.ctr(before))
    if (c !== null) insights.push(`Clicks per view are ${c >= 0 ? "up" : "down"} ${fmtPct(Math.abs(c), 0)}: ${fmtPct(M.ctr(now))}, against ${fmtPct(M.ctr(before))} before.`)
  }
  if (isAd && t.spend) insights.push(`${fmtUsd(t.spend)} spent in this period at ${fmtUsd(cpm(t))} per 1,000 impressions, ${fmtUsd(M.costPerInteraction(t))} per interaction.`)
  if (!isAd && t.played) insights.push(`${fmtCompact(t.played)} views in this period. Embeds are free, so every interaction here costs nothing.`)
  // devices for an embed: the mix of the Flicks it showed, by views
  const devices = new Map<string, number>()
  if (!isAd)
    for (const h of history) {
      const m = data.flicks.find((x) => x.id === h.fid)!
      const v = byFlick(rows, h.fid).played
      for (const d of m.devices) devices.set(d.label, (devices.get(d.label) ?? 0) + d.share * v)
    }
  const dTotal = [...devices.values()].reduce((a, b) => a + b, 0) || 1
  return (
    <div className="mt-6 flex flex-col gap-6">
      <MetricStrip rows={rows} prevRows={prevRows} filter={f} metrics={isAd ? AD_SET : VIEW_SET} sel={selection} />
      <Summary items={insights} />
      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelCard t={t} />
        {isAd ? (
          <Section title="Countries" description="Share of impressions">
            <BarList items={(place.countries ?? []).map((c) => ({ label: c.label, value: c.share }))} format={(n) => fmtPct(n, 0)} detail={(i) => [{ label: "impressions", value: fmtInt(t.loaded * (place.countries?.[i]?.share ?? 0)) }]} />
          </Section>
        ) : (
          <Section title="Devices" description="Share of views">
            <BarList items={[...devices.entries()].map(([label, v]) => ({ label, value: v / dTotal }))} format={(n) => fmtPct(n, 0)} />
          </Section>
        )}
      </div>
      <div className="grid gap-6">
        <Section title={isAd ? "Flicks in this placement" : "Flicks in this embed"} description={`Each Flick it has ${isAd ? "served" : "shown"}, newest first. The ${isAd ? "tag" : "code"} stayed the same throughout. Tick to compare them on the chart.`}>
          <DataTable selection={selection} rows={flickRows} cols={isAd ? [C.impressions, C.interaction, C.ctr, C.spend, C.cpi] : [C.views, C.interaction, C.switches, C.ctr]} nameLabel="Flick" empty="No Flick has run here in this period." />
        </Section>
      </div>
    </div>
  )
}

function EmbedsTab({ data, filter, go }: { data: Dataset; filter: Filter; go: (o: Omit<Open, "from">) => void }) {
  const f: Filter = { ...filter, source: "embed" }
  const rows = useMemo(() => slice(data, f), [data, filter])
  const prevRows = useMemo(() => slice(data, f, 1), [data, filter])
  const t = sum(rows)
  const selection = useSelection()
  const embedRows: TRow[] = placesOf(data, "embed").map((e) => {
    const cur = data.flicks.find((x) => x.id === e.current)
    return { id: e.id, name: e.name, sub: `${e.size}${cur ? ` · ${cur.name}` : " · No Flick"}`, image: cur?.image, t: byWhere(rows, e.id), pred: (r: Row) => r.where === e.id, onClick: () => go({ kind: "embed", id: e.id }) }
  })
  const insights: string[] = []
  const live = embedRows.filter((r) => r.t.played > 100)
  if (live.length > 1) {
    const s = [...live].sort((a, b) => M.ctr(b.t) - M.ctr(a.t))
    insights.push(`${s[0].name} turns the most views into clicks: ${fmtPct(M.ctr(s[0].t))}, against ${fmtPct(M.ctr(s[s.length - 1].t))} for ${s[s.length - 1].name}.`)
    const v = [...live].sort((a, b) => b.t.played - a.t.played)
    insights.push(`${v[0].name} brings ${fmtPct(rate(v[0].t.played, t.played), 0)} of all embed views.`)
  }
  if (t.played) insights.push(`${fmtCompact(t.played)} embed views and ${fmtInt(t.clicks)} clicks in this period, at no cost.`)
  return (
    <div className="mt-6 flex flex-col gap-6">
      <MetricStrip rows={rows} prevRows={prevRows} filter={f} metrics={VIEW_SET} sel={selection} />
      <Summary items={insights} />
      <Section title="Embeds" description="Open one to compare the Flicks it has shown. Tick to compare embeds on the chart.">
        <DataTable selection={selection} rows={embedRows} cols={VIEW_COLS} nameLabel="Embed" empty="No embeds yet." />
      </Section>
    </div>
  )
}

function FunnelCard({ t }: { t: Totals }) {
  return (
    <Section title="Funnel" description="From loading to a click">
      <Funnel
        steps={[
          { label: "Loaded", value: t.loaded },
          { label: "Played", value: t.played },
          { label: "Interacted", value: t.interacted },
          { label: "Switched", value: t.interacted * 0.82 },
          { label: "Clicked", value: t.clicks * 0.9 },
        ]}
      />
    </Section>
  )
}
