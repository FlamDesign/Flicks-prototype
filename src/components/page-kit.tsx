import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon, Download01Icon } from "@hugeicons/core-free-icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Shared building blocks for the account-type pages (Account, Credits, Ad Balance), so they share
 * one width, one header, one stat card, one list card, one invoice list and one pager.
 */

/** Every main page's frame: one width and one padding. */
export const PAGE = "mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10"

export type Crumb = { label: string; onClick?: () => void }

/** The trail back, small and muted, above a page's title (Flicks › Rain-ready boots). */
export function Crumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
      {items.map((c, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1">
          {i > 0 && <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 shrink-0 opacity-60" />}
          {c.onClick ? (
            <button type="button" onClick={c.onClick} className="-mx-1 truncate rounded-md px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              {c.label}
            </button>
          ) : (
            <span className="truncate">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

/**
 * The one page header: an optional trail back, the title (with a count or a tag beside it), the
 * page's actions on the right, then one row for search and filters. Same spacing on every page.
 */
export function PageHeader({
  crumbs,
  title,
  count,
  titleExtra,
  actions,
  toolbar,
  className,
}: {
  crumbs?: Crumb[]
  title: React.ReactNode
  count?: React.ReactNode
  titleExtra?: React.ReactNode
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-1.5">
        {crumbs && <Crumbs items={crumbs} />}
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            {count !== undefined && <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{count}</span>}
            {titleExtra}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
    </div>
  )
}

/** Settings-style pages (Account, Credits, Ad Balance): the shared header, then their sections. */
export function PageShell({ title, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={PAGE}>
      <PageHeader title={title} actions={action} />
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </div>
  )
}

/** A number with its label, an optional tag or action at the top right, and a note under it. */
export function StatCard({
  label,
  tag,
  value,
  note,
  action,
  valueClassName,
  noteClassName,
}: {
  label: string
  tag?: string
  value: string
  note: string
  action?: React.ReactNode
  valueClassName?: string
  noteClassName?: string
}) {
  return (
    <Card size="sm" className="shadow-none">
      <CardContent className="space-y-2">
        <div className="flex min-h-5 items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {tag && <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">{tag}</Badge>}
          {action}
        </div>
        <p className={cn("text-2xl font-semibold tabular-nums tracking-tight", valueClassName)}>{value}</p>
        <p className={cn("text-xs text-muted-foreground", noteClassName)}>{note}</p>
      </CardContent>
    </Card>
  )
}

/** The small link-style action in a stat card's corner (Set up, Edit, All rates). */
export function StatAction({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button size="xs" variant="ghost" className="-my-1 -mr-2 h-7 px-2 text-sm" onClick={onClick}>
      {children}
    </Button>
  )
}

/** A titled card for a list, with its filters and actions on the right of the title. */
export function ListCard({ title, tools, children, className }: { title: string; tools?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("h-fit shadow-none", className)}>
      <CardHeader className="flex min-h-8 flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {tools && <div className="flex flex-wrap items-center gap-2">{tools}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export const fmtDate = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
export const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export type InvoiceRow = { id: string; title: string; number?: string; at: number; amount: number }

/** Save text as a file. */
export function saveFile(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A simple printable invoice: from Flam, to the signed-in email. */
export function downloadInvoice(inv: InvoiceRow, email: string, what: string) {
  const no = inv.number ?? inv.id.toUpperCase()
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${no}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:640px;margin:48px auto;padding:0 24px}h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:left}th:last-child,td:last-child{text-align:right}.muted{color:#666}.total{font-weight:600}</style></head>
<body><h1>Invoice</h1><p class="muted">${no} · ${fmtDate(inv.at)}</p>
<p><strong>From</strong><br>Flam</p><p><strong>Billed to</strong><br>${email}</p>
<table><tr><th>Description</th><th>Amount</th></tr>
<tr><td>${what}</td><td>${money(inv.amount)}</td></tr>
<tr class="total"><td>Total paid</td><td>${money(inv.amount)}</td></tr></table>
<p class="muted">Paid by card.</p></body></html>`
  saveFile(`${no}.html`, "text/html", html)
}

/** Invoices: title, date (and number), amount, and Download invoice. */
export function InvoicesCard({ invoices, onDownload, empty = "No invoices yet." }: { invoices: InvoiceRow[]; onDownload: (inv: InvoiceRow) => void; empty?: string }) {
  return (
    <ListCard title="Invoices">
      {invoices.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>}
      <ul className="divide-y">
        {invoices.map((inv) => (
          <li key={inv.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{inv.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(inv.at)}</p>
            </div>
            <p className="text-sm font-medium tabular-nums">{money(inv.amount)}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="-my-1 -mr-1.5" aria-label={`Download invoice from ${fmtDate(inv.at)}`} onClick={() => onDownload(inv)}>
                  <HugeiconsIcon icon={Download01Icon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download invoice</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </ListCard>
  )
}

/** "1–10 of 88" with previous and next. */
export function Pager({ page, pages, total, size, onPage }: { page: number; pages: number; total: number; size: number; onPage: (p: number) => void }) {
  if (total <= size) return null
  const from = page * size + 1
  const to = Math.min(total, from + size - 1)
  return (
    <div className="mt-2 flex items-center justify-between gap-2 border-t pt-3">
      <span className="text-xs tabular-nums text-muted-foreground">
        {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {total.toLocaleString("en-US")}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}>
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
        </Button>
      </div>
    </div>
  )
}
