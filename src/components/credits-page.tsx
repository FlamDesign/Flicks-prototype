import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { SparklesIcon } from "@hugeicons/core-free-icons"
import { PageShell, StatCard, StatAction, ListCard, InvoicesCard, Pager, downloadInvoice } from "@/components/page-kit"
import { DateFilter, inDateFilter, type DateFilterValue } from "@/components/ui-extra/date-filter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VIDEO_COST, videoCost } from "@/components/credits-card"
import { useDevState } from "@/dev/state"
import { cn } from "@/lib/utils"

// Sample data generated from the State manager counts. Replace with billing + usage APIs (paged server-side).
type Invoice = { id: string; at: number; title: "Credits top-up" | "Auto-reload"; amount: number; credits: number }
type Kind = "spent" | "added" | "refunded" | "granted"
type Activity = { id: string; at: number; label: string; size?: string; kind: Kind; credits: number }

const NOW = new Date("2026-10-07T10:00:00").getTime()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const AMOUNTS = [1000, 500, 250, 500, 200, 2500]
const SIZES = ["1080×1080", "1920×1080", "1080×1920", "300×250", "300×600", "336×280"]
const creditsFor = (usd: number) => usd * 10 + (usd >= 1000 ? usd : 0) // internal: $1 = 10 credits, +10% from $1,000

/**
 * Builds invoices + activity. The newest rows always show one of each kind first
 * (generation, refund, auto-reload, purchase) so every row style is visible at the top.
 */
function sampleData(generations: number, invoices: number) {
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const size = () => SIZES[Math.floor(rnd() * SIZES.length)]

  const inv: Invoice[] = []
  for (let i = 0; i < invoices; i++) {
    const amount = AMOUNTS[i % AMOUNTS.length]
    const at = i === 0 ? NOW - 4 * HOUR : i === 1 ? NOW - 2 * HOUR : NOW - (i * 12 + 3) * DAY
    inv.push({ id: `inv${i}`, at, title: i === 1 ? "Auto-reload" : "Credits top-up", amount, credits: creditsFor(amount) })
  }
  inv.sort((x, y) => y.at - x.at)

  const act: Activity[] = inv.map((v) => ({
    id: `p-${v.id}`,
    at: v.at,
    label: v.title === "Auto-reload" ? "Auto-reload" : "Credits purchased",
    kind: "added",
    credits: v.credits,
  }))

  let t = NOW - 20 * MIN
  for (let i = 0; i < generations; i++) {
    const sz = size()
    act.push({ id: `g${i}`, at: t, label: "Video generation", size: sz, kind: "spent", credits: videoCost(sz) })
    // first refund lands right after the newest generation; then ~6% of generations fail
    if (i === 0 || rnd() < 0.06)
      act.push({ id: `r${i}`, at: i === 0 ? NOW - 50 * MIN : t - MIN, label: "Refund for failed generation", size: sz, kind: "refunded", credits: videoCost(sz) })
    t = i === 0 ? NOW - 5 * HOUR : t - (0.2 + rnd() * 1.1) * 13 * HOUR
  }
  // Credits granted by Flam: a manual grant from the backend (shown near the top) and the welcome credits at sign-up (oldest)
  act.push({ id: "grant", at: NOW - 6.5 * HOUR, label: "Credits added by Flam", kind: "granted", credits: 500 })
  const oldest = act.reduce((m, a) => Math.min(m, a.at), NOW)
  act.push({ id: "welcome", at: oldest - DAY, label: "Welcome credits", kind: "granted", credits: 1000 })
  act.sort((x, y) => y.at - x.at)
  return { invoices: inv, activity: act }
}

const inRange = (at: number, days: number) => NOW - at <= days * 86_400_000

const HISTORY_PAGE = 10
const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })

export function CreditsPage({ onGetCredits, onAutoReload, email }: { onGetCredits: () => void; onAutoReload: () => void; email: string }) {
  const { state: dev } = useDevState()
  const credits = dev.credits

  const { invoices, activity } = useMemo(() => sampleData(dev.generations, dev.invoices), [dev.generations, dev.invoices])
  const spent30 = activity.filter((a) => a.kind === "spent" && inRange(a.at, 30))
  const refunded30 = activity.filter((a) => a.kind === "refunded" && inRange(a.at, 30))
  const used = spent30.reduce((n, a) => n + a.credits, 0) - refunded30.reduce((n, a) => n + a.credits, 0)
  const monthStart = new Date(NOW).setDate(1)
  const addedThisMonth = invoices.filter((i) => i.at >= monthStart).reduce((n, i) => n + i.credits, 0)

  return (
    <PageShell
      title="Credits"
      description="Your balance, purchases and how credits were used."
      action={
        <Button onClick={onGetCredits} className="gap-2">
          <HugeiconsIcon icon={SparklesIcon} className="size-4" />
          Get credits
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Balance" value={credits.toLocaleString()} note={`About ${Math.floor(credits / VIDEO_COST).toLocaleString()} video generations`} />
        <StatCard
          label="Auto-reload"
          value={dev.autoReload ? "On" : "Off"}
          valueClassName={dev.autoReload ? "text-primary" : undefined}
          note={dev.autoReload ? `Below $${dev.autoReloadAt}, add $${dev.autoReloadTo}` : "Top up when low"}
          action={<StatAction onClick={onAutoReload}>{dev.autoReload ? "Edit" : "Set up"}</StatAction>}
        />
        <StatCard label="Used" tag="Last 30 days" value={used.toLocaleString()} note={`${spent30.length.toLocaleString()} video generations`} />
        <StatCard label="Added" tag="This month" value={addedThisMonth.toLocaleString()} note="Including bonus credits" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <UsageHistory activity={activity} />
        <InvoicesCard invoices={invoices.map((i) => ({ id: i.id, title: i.title, at: i.at, amount: i.amount }))} onDownload={(inv) => downloadInvoice(inv, email, `${inv.title} (credits)`)} />
      </div>
    </PageShell>
  )
}


function UsageHistory({ activity }: { activity: Activity[] }) {
  const [filter, setFilter] = useState<"all" | Kind>("all")
  const [dates, setDates] = useState<DateFilterValue>({ preset: "30" })
  const [page, setPage] = useState(0)
  const rows = useMemo(
    () => activity.filter((a) => (filter === "all" || a.kind === filter) && inDateFilter(a.at, dates)),
    [activity, filter, dates],
  )
  const pages = Math.max(1, Math.ceil(rows.length / HISTORY_PAGE))
  const view = rows.slice(page * HISTORY_PAGE, page * HISTORY_PAGE + HISTORY_PAGE)

  return (
    <ListCard
      title="Usage history"
      tools={
        <>
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v as typeof filter)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-[130px]" aria-label="Activity type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activity</SelectItem>
              <SelectItem value="spent">Spent</SelectItem>
              <SelectItem value="added">Added</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="granted">Granted</SelectItem>
            </SelectContent>
          </Select>
          <DateFilter value={dates} onChange={(v) => (setDates(v), setPage(0))} className="w-[150px]" />
        </>
      }
    >
        {view.length ? (
          <ul className="divide-y">
            {view.map((a) => (
              <li key={a.id} className="flex items-start gap-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{a.label}</span>
                    {a.size && (
                      <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[11px] font-normal tabular-nums">
                        {a.size}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(a.at)}</p>
                </div>
                <p className={cn("text-sm font-medium tabular-nums", a.kind !== "spent" && "text-primary")}>
                  {a.kind === "spent" ? "−" : "+"}
                  {a.credits.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No activity found.</p>
        )}
        <Pager page={page} pages={pages} total={rows.length} size={HISTORY_PAGE} onPage={setPage} />
    </ListCard>
  )
}


