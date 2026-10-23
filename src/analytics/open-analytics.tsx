import { createContext, useContext } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import type { AnalyticsTarget } from "./analytics-page"

/** Opens Analytics on one Flick, campaign, placement or embed. Provided by the app shell. */
export const OpenAnalytics = createContext<((t: AnalyticsTarget) => void) | null>(null)

/** "Full analytics": a heading row for the stats on campaign, placement and embed pages. */
export function AnalyticsHeading({ target, note }: { target: AnalyticsTarget; note: string }) {
  const open = useContext(OpenAnalytics)
  return (
    <div className="-mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-medium">Analytics</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
      </div>
      {open && (
        <Button variant="ghost" size="sm" className="-mr-2 gap-1 text-primary hover:text-primary" onClick={() => open(target)}>
          Full analytics
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
        </Button>
      )}
    </div>
  )
}
