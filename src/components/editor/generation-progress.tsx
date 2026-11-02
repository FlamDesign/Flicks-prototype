import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/** what the model is doing, by how far along it is (named so the wait reads as work) */
const STAGES = [
  { until: 0.15, label: "Reading your prompt and references" },
  { until: 0.45, label: "Composing the shot" },
  { until: 0.85, label: "Rendering the video" },
  { until: Infinity, label: "Finishing up" },
]
const left = (ms: number) => (ms > 90_000 ? `About ${Math.round(ms / 60_000)} min left` : ms > 20_000 ? "Under a minute left" : "A few seconds left")

/**
 * How far a generation is: 0 to 0.95 from the time it started against how long it usually takes
 * (it holds at 95% until the video actually arrives), the stage, and the time left. Ticks each second.
 */
export function useGenerationProgress(startedAt: number | undefined, expectedMs: number, queued?: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const f = queued || !startedAt ? 0 : Math.min(0.95, Math.max(0, (now - startedAt) / expectedMs))
  return {
    f,
    stage: queued ? "Queued, starting soon" : STAGES.find((s) => f < s.until)!.label,
    left: queued || !startedAt ? "" : left(expectedMs - (now - startedAt)),
  }
}

/** The looping part: a field of dots with a soft band sweeping across it. Fills its parent. */
export function GeneratingDots({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 bg-muted", className)}>
      <div className="gen-dots absolute inset-0" />
      <div className="gen-dots gen-dots-sweep absolute inset-0" />
    </div>
  )
}

/**
 * On the canvas while a video generates: the looping dot field, and in the middle a progress ring
 * with the percentage (deterministic), the stage, and the variation with the time left.
 */
export function GeneratingLoader({ name, startedAt, expectedMs, queued, waiting }: { name: string; startedAt?: number; expectedMs: number; queued?: boolean; waiting?: string }) {
  const { f, stage, left: timeLeft } = useGenerationProgress(startedAt, expectedMs, queued)
  const pct = Math.round(f * 100)
  const r = 44
  const c = 2 * Math.PI * r
  return (
    <div role="status" aria-label={waiting ?? `${name}: ${stage}, ${pct}%`} className="absolute inset-0 overflow-hidden">
      <GeneratingDots />
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-[3cqmin] text-center">
          <div className="relative size-[clamp(56px,24cqmin,128px)]">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle cx="50" cy="50" r={r} className="fill-background/70 stroke-foreground/10" strokeWidth="5" />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - f)}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[clamp(0.75rem,6cqmin,1.5rem)] font-semibold tabular-nums">{waiting ? "" : `${pct}%`}</span>
          </div>
          <div className="flex max-w-[80cqw] flex-col items-center gap-1 rounded-xl bg-background/70 px-3 py-1.5 backdrop-blur-sm">
            <span key={waiting ?? stage} className="text-shimmer text-sm font-medium animate-in fade-in-0">{waiting ?? `${stage}…`}</span>
            {!waiting && <span className="text-xs text-muted-foreground">{[name, timeLeft].filter(Boolean).join(" · ")}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

/** A small version for thumbnails: the dot field with a thin progress bar along the bottom. */
export function GeneratingThumb({ startedAt, expectedMs }: { startedAt?: number; expectedMs: number }) {
  const { f } = useGenerationProgress(startedAt, expectedMs)
  return (
    <>
      <GeneratingDots />
      <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-foreground/10">
        <span className="block h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${f * 100}%` }} />
      </span>
    </>
  )
}
