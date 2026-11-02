import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"

/** what the model is doing, by how far along it is (named so the wait reads as work, not a spinner) */
const STAGES = [
  { until: 0.15, label: "Reading your prompt and references" },
  { until: 0.45, label: "Composing the shot" },
  { until: 0.85, label: "Rendering the video" },
  { until: Infinity, label: "Finishing up" },
]

const left = (ms: number) => (ms > 90_000 ? `About ${Math.round(ms / 60_000)} min left` : ms > 20_000 ? "Under a minute left" : "A few seconds left")

/**
 * Inside the generating frame: the current stage, a progress bar and the time left. The estimate
 * holds at 95% until the video actually arrives.
 */
export function GenerationProgress({ startedAt, expectedMs, queued, name }: { startedAt: number; expectedMs: number; queued?: boolean; name: string }) {
  // its own second-by-second clock
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const f = queued ? 0 : Math.min(0.95, Math.max(0, (now - startedAt) / expectedMs))
  const stage = queued ? "Queued, starting soon" : STAGES.find((s) => f < s.until)!.label
  return (
    <div role="status" className="pointer-events-none absolute bottom-full right-0 z-30 mb-2">
      <div className="flex w-64 flex-col gap-1.5 rounded-2xl bg-background/85 px-3 py-2 shadow-sm ring-1 ring-foreground/10 backdrop-blur-md animate-in fade-in-0 slide-in-from-bottom-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium">{name}</span>
          <span className="tabular-nums text-muted-foreground">{queued ? "" : left(expectedMs - (now - startedAt))}</span>
        </div>
        <Progress value={f * 100} aria-label={`${name}: ${stage}`} className="h-1 [&>[data-slot=progress-indicator]]:duration-1000 [&>[data-slot=progress-indicator]]:ease-linear" />
        <span key={stage} className="text-shimmer text-xs animate-in fade-in-0">{stage}…</span>
      </div>
    </div>
  )
}
