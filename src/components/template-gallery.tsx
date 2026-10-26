import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { TemplateCard } from "@/components/template-card"
import { INDUSTRIES, SIZES, TEMPLATES, type Template } from "@/data"
import { useDevState } from "@/dev/state"
import { CardsSkeleton, Loading } from "@/components/page-skeletons"

export function TemplateGallery({ onUse, saved = [] }: { onUse: (t: Template) => void; saved?: Template[] }) {
  const [industry, setIndustry] = useState("all")
  const [size, setSize] = useState("all")

  const { state: dev } = useDevState()
  const all = useMemo(() => [...saved, ...(dev.templatesEmpty ? [] : TEMPLATES)], [saved, dev.templatesEmpty])
  const list = useMemo(
    () =>
      all.filter(
        (t) => !!t.image && (industry === "all" || t.industry === industry) && (size === "all" || t.size === size),
      ),
    [all, industry, size],
  )


  return (
    <Card className="relative py-5 shadow-[0_-8px_40px_-16px_color-mix(in_oklch,var(--shadow-ink)_20%,transparent)]">
      <CardContent>
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium">Start with templates</h2>
          {all.length > 0 && <div className="flex gap-2">
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All industries</SelectItem>
                {saved.length > 0 && <SelectItem value="Your templates">Your templates</SelectItem>}
                {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sizes</SelectItem>
                {SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>}
        </div>

        <div className="mt-5">
          {/* loads on arrival and whenever the filters change */}
          <Loading k={[industry, size]} skeleton={<CardsSkeleton count={8} cols="grid-cols-2 gap-x-5 sm:grid-cols-3 lg:grid-cols-4" aspect="aspect-square" />}>
          {list.length ? (
            // square cards in rows: 4 on wide screens, fewer as it narrows
            <div className="grid grid-cols-2 gap-x-5 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((t) => <TemplateCard key={t.id} t={t} onUse={onUse} />)}
            </div>
          ) : (
            all.length === 0 ? (
              <EmptyState title="No templates yet" body="Templates will show up here. Describe your video above to start from scratch." />
            ) : (
            <EmptyState
              title="No templates match these filters"
              body="Try another industry or size."
              action={<Button variant="outline" size="sm" onClick={() => { setIndustry("all"); setSize("all") }}>Clear filters</Button>}
            />
            )
          )}
          </Loading>
        </div>
      </CardContent>

    </Card>
  )
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
