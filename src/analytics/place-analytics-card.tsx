import { useContext, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLibrary } from "@/library"
import { useAds } from "@/ads/ads"
import { useEmbeds } from "@/embeds/embeds"
import { cn } from "@/lib/utils"
import { buildDataset, sum, variantStats } from "./data"
import { OpenAnalytics } from "./open-analytics"

/**
 * On a placement or embed page, like the Flick page's Analytics card: views of the Flick on now (or the last one it ran)
 * in this place, and how they split across its variations, all time. Full analytics opens this placement or embed.
 */
export function PlaceAnalyticsCard({ kind, id }: { kind: "placement" | "embed"; id: string }) {
  const lib = useLibrary()
  const ads = useAds()
  const embeds = useEmbeds()
  const open = useContext(OpenAnalytics)
  const data = useMemo(() => buildDataset(lib.flicks, ads.placements, embeds.embeds, ads.campaigns), [lib.flicks, ads.placements, ads.campaigns, embeds.embeds])
  const rows = data.rows.filter((r) => r.where === id)
  const place = data.places.find((p) => p.id === id)
  const fid = place?.current ?? [...rows].sort((a, b) => b.day - a.day)[0]?.flickId
  const meta = data.flicks.find((f) => f.id === fid)
  const t = sum(rows.filter((r) => r.flickId === fid))
  const stats = meta ? variantStats(meta, t) : []
  const shownTotal = stats.reduce((a, v) => a + v.shown, 0) || 1
  const max = Math.max(1, ...stats.map((v) => v.shown))
  const views = Math.round(t.views)
  return (
    <section className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">Analytics</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta ? `${meta.name} ${place?.current === fid ? "here" : "when it ran here"}, all time` : "Views on each variation"}</p>
        </div>
        {open && (
          <Button variant="ghost" size="sm" className="-mr-2 gap-1 text-primary hover:text-primary" onClick={() => open({ kind, id })}>
            Full analytics
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Button>
        )}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{views.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Views</p>
      </div>
      {meta && views > 0 ? (
        <ul className="flex flex-col gap-3">
          {stats.map((v) => (
            <li key={`${v.name}-${v.i}`} className="flex items-center gap-3">
              <img src={v.poster} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{v.name}</span>
                    {v.i === meta.start && <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[11px] font-normal">Starts here</Badge>}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {Math.round((v.shown / shownTotal) * views).toLocaleString()} <span className="text-xs text-muted-foreground">· {Math.round((v.shown / shownTotal) * 100)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", v.i === meta.start ? "bg-primary" : "bg-primary/45")} style={{ width: `${(v.shown / max) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">{kind === "placement" ? "No views yet. Views show here once the tag is live in your ad platform." : "No views yet. Views show here once the embed is on your site."}</p>
      )}
    </section>
  )
}
