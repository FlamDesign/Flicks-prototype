import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Page loading: a page shows its skeleton for a moment (State manager › Page load time) before the
 * content, the way it would while data loads. Each skeleton follows its page's layout so nothing jumps.
 */
export function PageLoader({ ms, skeleton, children }: { ms: number; skeleton: React.ReactNode; children: React.ReactNode }) {
  const [loading, setLoading] = useState(ms > 0)
  useEffect(() => {
    if (ms <= 0) return
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
  }, [ms])
  return loading ? (
    <div aria-busy="true" aria-label="Loading">
      {skeleton}
    </div>
  ) : (
    <>{children}</>
  )
}

const Frame = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10", className)}>{children}</div>
)
const Line = ({ className }: { className?: string }) => <Skeleton className={cn("h-3 rounded-full", className)} />

/** Title, description and the filters on the right. */
function ListHeader({ filters = 3, action }: { filters?: number; action?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-36 rounded-lg" />
        <Line className="w-72 max-w-[70vw]" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: filters }, (_, i) => (
          <Skeleton key={i} className={cn("h-9 rounded-2xl", i === 0 ? "w-[220px] max-sm:hidden" : "w-[140px]")} />
        ))}
        {action && <Skeleton className="h-9 w-32 rounded-2xl" />}
      </div>
    </div>
  )
}

/** Square cards with two lines under them: Projects, Flicks, Assets, Embeds. */
export function GridSkeleton({ count = 8, filters = 3, action, cols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" }: { count?: number; filters?: number; action?: boolean; cols?: string }) {
  return (
    <Frame>
      <ListHeader filters={filters} action={action} />
      <div className={cn("mt-6 grid gap-x-4 gap-y-6", cols)}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Line className="w-3/4" />
            <Line className="w-1/2" />
          </div>
        ))}
      </div>
    </Frame>
  )
}

/** A table of rows: Campaigns. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Frame>
      <ListHeader filters={0} action />
      <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-foreground/10">
        <div className="h-9 bg-muted/50" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-t border-foreground/5 px-4 py-3.5">
            <Line className="w-48" />
            <Line className="ml-auto w-10" />
            <Line className="w-16 max-sm:hidden" />
            <Line className="w-16" />
            <Line className="w-14 max-md:hidden" />
          </div>
        ))}
      </div>
    </Frame>
  )
}

/** Breadcrumb, then the Flick stage beside a column of cards: the Flick page. */
export function FlickPageSkeleton() {
  return (
    <Frame>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-72 max-w-[60vw] rounded-lg" />
          <Line className="w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-2xl" />
          <Skeleton className="size-9 rounded-2xl" />
        </div>
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[clamp(280px,56vh,520px)] w-full rounded-xl" />
          <CardSkeleton lines={4} />
        </div>
        <div className="flex flex-col gap-4">
          <CardSkeleton lines={2} block />
          <CardSkeleton lines={1} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </Frame>
  )
}

/** Numbers on top, the Flick and history on the left, the code or tag on the right: a placement or embed. */
export function DetailSkeleton({ stats = 3 }: { stats?: number }) {
  return (
    <Frame>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-80 max-w-[60vw] rounded-lg" />
        <Skeleton className="size-9 rounded-2xl" />
      </div>
      <div className={cn("mt-6 grid gap-3", stats === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3")}>
        {Array.from({ length: stats }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
          <div className="flex justify-between">
            <Line className="w-40" />
            <Skeleton className="h-8 w-40 rounded-2xl" />
          </div>
          <Skeleton className="h-[clamp(280px,56vh,520px)] w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
          <Line className="w-24" />
          <Line className="w-full" />
          <Skeleton className="h-9 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-2xl" />
        </div>
      </div>
    </Frame>
  )
}

/** Title, stat cards, then two list cards: Credits, Ad Balance. */
export function AccountSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-8 md:py-10">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Line className="w-64" />
      </div>
      <div className={cn("mt-6 grid gap-4", stats === 2 ? "sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
        {Array.from({ length: stats }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CardSkeleton lines={6} rows />
        <CardSkeleton lines={3} rows />
      </div>
    </div>
  )
}

function CardSkeleton({ lines, block, rows }: { lines: number; block?: boolean; rows?: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
      <Line className="w-28" />
      {block && <Skeleton className="h-10 w-full rounded-xl" />}
      {Array.from({ length: lines }, (_, i) =>
        rows ? (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <Line className="w-2/3" />
              <Line className="w-1/3" />
            </div>
            <Line className="w-14" />
          </div>
        ) : (
          <Line key={i} className={i % 2 ? "w-2/3" : "w-full"} />
        ),
      )}
    </div>
  )
}
