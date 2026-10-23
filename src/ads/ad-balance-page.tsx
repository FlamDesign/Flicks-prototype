import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Download01Icon, Globe02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { PageShell, ListCard, InvoicesCard, downloadInvoice, saveFile, type InvoiceRow } from "@/components/page-kit"
import { useToast } from "@/components/ui-extra/toaster"
import { ALL_DATES, DateFilter, dateFilterLabel, inDateFilter, type DateFilterValue } from "@/components/ui-extra/date-filter"
import { useDevState } from "@/dev/state"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { compact, MIN_FUNDS, usd, useAds } from "@/ads/ads"
import { AddFundsDialog, RatesDialog, useFunded, useMyCpm } from "@/ads/ads-ui"

const dayKey = (t: number) => new Date(t).toDateString()
const dayLabel = (t: number) => {
  if (dayKey(t) === new Date().toDateString()) return "Today"
  if (dayKey(t) === new Date(Date.now() - 86_400_000).toDateString()) return "Yesterday"
  return new Date(t).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}
const isoDay = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const DAYS_PAGE = 7

const csvCell = (v: string | number) => (typeof v === "number" ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)


/**
 * Ad Balance: the money that pays for impressions (in dollars, separate from AI credits).
 * Add $100 to $10,000 at a time; no discounts, no auto-reload. Charged per 1,000 impressions
 * at the CPM of the country they came from. It can go negative: ads keep serving, and the next
 * top-up settles it first. Below: spend by day (campaign and placement), with a date filter and
 * CSV export; and funds added, each with its invoice.
 */
export function AdBalancePage({ onCampaigns, email }: { onCampaigns: () => void; email: string }) {
  const { state: dev } = useDevState()
  const { ledger } = useAds()
  const funded = useFunded()
  const mine = useMyCpm()
  const [funds, setFunds] = useState(false)
  const [rates, setRates] = useState(false)
  const negative = dev.adBalance < 0
  const invoices: InvoiceRow[] = ledger.filter((t) => t.kind === "funds").map((t) => ({ id: t.id, title: "Funds added", number: t.invoice, at: t.at, amount: t.amount }))

  return (
    <PageShell title="Ad Balance" description="Pays for your ads, per 1,000 impressions. Separate from AI credits.">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* the balance */}
        <Card className="shadow-none">
          <CardContent className="flex h-full flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={cn("mt-1 text-4xl font-semibold tracking-tight tabular-nums", negative && "text-destructive")}>{usd(dev.adBalance)}</p>
            </div>
            <p className={cn("text-sm", negative ? "text-destructive" : "text-muted-foreground")}>
              {!funded
                ? `Add at least ${usd(MIN_FUNDS, false)} to start serving your placements.`
                : negative
                  ? "Your ads keep running. Your next top-up settles this first."
                  : dev.adBalance < 50
                    ? "Running low. Your ads keep running, and the balance can go below zero."
                    : "Your ads are serving."}
            </p>
            <Button className="mt-auto gap-1.5 self-start" onClick={() => setFunds(true)}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Add funds
            </Button>
          </CardContent>
        </Card>

        {/* your rate */}
        <Card className="bg-muted/50 shadow-none ring-0">
          <CardContent className="flex h-full flex-col gap-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Globe02Icon} className="size-4" />
              Your CPM in {mine.name}
            </p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{usd(mine.cpm)}</p>
            <p className="text-sm text-muted-foreground">For every 1,000 impressions from {mine.code === "OTHER" ? "where you are" : mine.name}. Each country has its own rate; you’re charged by where impressions come from.</p>
            <Button variant="link" className="mt-auto h-auto self-start p-0" onClick={() => setRates(true)}>
              See all rates
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <SpendByDay onCampaigns={onCampaigns} />
        <InvoicesCard invoices={invoices} onDownload={(inv) => downloadInvoice(inv, email, "Ad Balance funds")} empty="No funds added yet. Each top-up comes with an invoice." />
      </div>

      <AddFundsDialog open={funds} onOpenChange={setFunds} />
      <RatesDialog open={rates} onOpenChange={setRates} />
    </PageShell>
  )
}

/** Spend grouped by day, then by campaign and placement; filter by date, export as CSV. */
function SpendByDay({ onCampaigns }: { onCampaigns: () => void }) {
  const { ledger, placements, campaigns } = useAds()
  const toast = useToast()
  const [dates, setDates] = useState<DateFilterValue>(ALL_DATES)
  const [shownDays, setShownDays] = useState(DAYS_PAGE)
  const placementOf = (id?: string) => placements.find((p) => p.id === id)
  const campaignOf = (id?: string) => campaigns.find((c) => c.id === placementOf(id)?.campaignId)?.name ?? "Deleted campaign"

  // day → placement → totals
  const days = useMemo(() => {
    const map = new Map<string, { at: number; rows: Map<string, { placementId?: string; impressions: number; spend: number }> }>()
    for (const t of ledger) {
      if (t.kind !== "spend" || !inDateFilter(t.at, dates)) continue
      const k = dayKey(t.at)
      const day = map.get(k) ?? { at: t.at, rows: new Map() }
      const row = day.rows.get(t.placementId ?? "") ?? { placementId: t.placementId, impressions: 0, spend: 0 }
      row.impressions += t.impressions ?? 0
      row.spend += -t.amount
      day.rows.set(t.placementId ?? "", row)
      map.set(k, day)
    }
    return [...map.values()]
      .sort((a, b) => b.at - a.at)
      .map((d) => ({ at: d.at, rows: [...d.rows.values()].sort((a, b) => b.spend - a.spend) }))
  }, [ledger, dates])
  const total = days.reduce((a, d) => a + d.rows.reduce((x, r) => x + r.spend, 0), 0)
  const totalImpr = days.reduce((a, d) => a + d.rows.reduce((x, r) => x + r.impressions, 0), 0)

  const exportCsv = () => {
    const lines = [["Date", "Campaign", "Placement", "Placement ID", "Impressions", "Spend (USD)"].join(",")]
    for (const d of days)
      for (const r of d.rows) {
        const p = placementOf(r.placementId)
        lines.push([isoDay(d.at), csvCell(campaignOf(r.placementId)), csvCell(p?.name ?? "Deleted placement"), csvCell(r.placementId ?? ""), r.impressions, r.spend.toFixed(2)].join(","))
      }
    saveFile(`flam-ad-spend-${isoDay(Date.now())}.csv`, "text/csv", lines.join("\n"))
    toast({ title: "Spend exported", description: `${dateFilterLabel(dates)} · ${days.length === 1 ? "1 day" : `${days.length} days`}` })
  }

  return (
    <ListCard
      title="Spend by day"
      tools={
        <>
          <DateFilter value={dates} onChange={(v) => (setDates(v), setShownDays(DAYS_PAGE))} className="w-[150px]" />
          <Button variant="outline" className="h-8 gap-1.5" disabled={!days.length} onClick={exportCsv}>
            <HugeiconsIcon icon={Download01Icon} className="size-4" />
            Export CSV
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        {days.length ? (
          <>
            <span className="font-medium tabular-nums text-foreground">{usd(total)}</span> on <span className="tabular-nums">{compact(totalImpr)}</span> impressions
          </>
        ) : (
          "No spend in this period"
        )}
      </p>
      {days.length ? (
        <div className="flex flex-col gap-3">
          {days.slice(0, shownDays).map((d) => {
            const daySpend = d.rows.reduce((a, r) => a + r.spend, 0)
            const dayImpr = d.rows.reduce((a, r) => a + r.impressions, 0)
            return (
              <div key={dayKey(d.at)} className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                <div className="flex items-center gap-3 bg-muted/50 px-4 py-2.5 text-sm">
                  <span className="flex-1 font-medium">{dayLabel(d.at)}</span>
                  <span className="hidden w-28 text-right tabular-nums text-muted-foreground sm:block">{compact(dayImpr)}</span>
                  <span className="w-24 text-right font-medium tabular-nums">{usd(daySpend)}</span>
                </div>
                <ul className="divide-y divide-foreground/5">
                  {d.rows.map((r) => {
                    const p = placementOf(r.placementId)
                    return (
                      <li key={r.placementId ?? "x"} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <button type="button" onClick={onCampaigns} className="min-w-0 flex-1 truncate text-left outline-none hover:underline focus-visible:underline">
                          <span className="text-muted-foreground">{campaignOf(r.placementId)} › </span>
                          {p?.name ?? "Deleted placement"}
                        </button>
                        <span className="hidden w-28 text-right tabular-nums text-muted-foreground sm:block">{compact(r.impressions)}</span>
                        <span className="w-24 text-right tabular-nums">{usd(r.spend)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
          {days.length > shownDays && (
            <Button variant="ghost" className="self-center" onClick={() => setShownDays((n) => n + DAYS_PAGE)}>
              Show more days
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          <p>{dates.preset === "all" ? "No spend yet. It shows here, day by day, as your placements serve." : "No spend in this period. Try another date."}</p>
          {dates.preset !== "all" && (
            <Button variant="outline" size="sm" onClick={() => (setDates(ALL_DATES), setShownDays(DAYS_PAGE))}>
              Clear filters
            </Button>
          )}
        </div>
      )}
    </ListCard>
  )
}
