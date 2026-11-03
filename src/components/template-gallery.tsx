import { EmptyState } from "@/components/empty-state"
import { useMemo, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { TemplateCard } from "@/components/template-card"
import { TEMPLATES, type Template } from "@/data"
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
  // filters offer only what the templates have
  const industries = useMemo(() => [...new Set(all.map((t) => t.industry))].sort(), [all])
  const sizes = useMemo(() => [...new Set(all.map((t) => t.size))], [all])


  return (
    <section className="relative px-3 md:px-5">
      <div>
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Start with templates</h2>
          {all.length > 0 && <div className="flex gap-2">
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All industries</SelectItem>
                {saved.length > 0 && <SelectItem value="Your templates">Your templates</SelectItem>}
                {industries.filter((i) => i !== "Your templates").map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sizes</SelectItem>
                {sizes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>}
        </div>

        <div className="mt-5">
          {/* loads on arrival and whenever the filters change */}
          <Loading k={[industry, size]} skeleton={<CardsSkeleton count={8} cols="grid-cols-2 gap-x-5 sm:grid-cols-3 lg:grid-cols-4" aspect="aspect-[3/4]" />}>
          {list.length ? (
            // masonry: each card keeps its own shape; 4 columns on wide screens, fewer as it narrows
            <div className="columns-2 gap-x-5 sm:columns-3 lg:columns-4">
              {list.map((t) => <TemplateCard key={t.id} t={t} onUse={onUse} />)}
            </div>
          ) : (
            all.length === 0 ? (
              <EmptyState art="templates" title="No templates yet" text="Templates will show up here. Describe your video above to start from scratch." />
            ) : (
            <EmptyState art="search"
              title="No templates match these filters"
              text="Try another industry or size."
              action={<Button variant="outline" size="sm" onClick={() => { setIndustry("all"); setSize("all") }}>Clear filters</Button>}
            />
            )
          )}
          </Loading>
        </div>
      </div>

    </section>
  )
}

