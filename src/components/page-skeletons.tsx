import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useDevState } from "@/dev/state"
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
    <div aria-busy="true" aria-label="Loading" className="h-full">
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

/* ---------- loading inside a page: panels, dialogs, filters ---------- */

/** How long things pretend to load: State manager › Page load time (0 turns it all off). */
export function useLoadMs() {
  return useDevState().state.pageLoadMs
}

/**
 * True for a moment whenever `k` changes (and on mount, unless `skipFirst`), as if fetching:
 * use it to show a skeleton while a list re-filters, a panel opens or a dialog fetches its data.
 */
export function useLoading(k: unknown, opts: { skipFirst?: boolean; ms?: number } = {}) {
  const base = useLoadMs()
  const ms = opts.ms ?? base
  const key = typeof k === "string" ? k : JSON.stringify(k)
  const first = useRef(true)
  const [loading, setLoading] = useState(() => ms > 0 && !opts.skipFirst)
  useEffect(() => {
    if (first.current) {
      first.current = false
      if (opts.skipFirst || ms <= 0) return
    } else if (ms <= 0) return
    setLoading(true)
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return loading
}

/** Shows `skeleton` while loading (see useLoading), then the content. */
export function Loading({ k, skeleton, skipFirst, ms, children }: { k?: unknown; skeleton: React.ReactNode; skipFirst?: boolean; ms?: number; children: React.ReactNode }) {
  const loading = useLoading(k ?? "", { skipFirst, ms })
  return loading ? (
    <div aria-busy="true" aria-label="Loading" className="animate-in fade-in-0 duration-150">
      {skeleton}
    </div>
  ) : (
    <div className="animate-in fade-in-0 duration-200">{children}</div>
  )
}

/** Cards in a grid: an image block and two lines under each. */
export function CardsSkeleton({ count = 8, cols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", aspect = "aspect-square", lines = 2 }: { count?: number; cols?: string; aspect?: string; lines?: number }) {
  return (
    <div className={cn("grid gap-4", cols)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className={cn("w-full rounded-2xl", aspect)} />
          {lines > 0 && <Line className="w-3/4" />}
          {lines > 1 && <Line className="w-1/2" />}
        </div>
      ))}
    </div>
  )
}

/** Rows: an optional thumbnail, a line or two, and something on the right. */
export function RowsSkeleton({ rows = 4, thumb = true, right = true, className }: { rows?: number; thumb?: boolean; right?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          {thumb && <Skeleton className="size-9 shrink-0 rounded-lg" />}
          <div className="flex-1 space-y-2">
            <Line className={i % 2 ? "w-1/2" : "w-2/3"} />
            <Line className="w-1/3 opacity-70" />
          </div>
          {right && <Skeleton className="h-6 w-14 shrink-0 rounded-full" />}
        </div>
      ))}
    </div>
  )
}

/** A chart card: a title, a big number and bars. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 rounded-2xl p-5 ring-1 ring-foreground/10", className)}>
      <div className="flex gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Line className="w-16" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex h-40 items-end gap-2">
        {Array.from({ length: 18 }, (_, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${30 + ((i * 37) % 60)}%` }} />
        ))}
      </div>
    </div>
  )
}

/** The editor while a project opens: rail, canvas and the prompts panel. */
export function EditorSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1" aria-busy="true" aria-label="Loading">
      <div className="flex w-[72px] flex-col items-center gap-4 border-r py-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="size-9 rounded-xl" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="grid flex-1 place-items-center bg-muted/40">
          <Skeleton className="aspect-[9/16] h-[70%] rounded-xl" />
        </div>
        <div className="flex justify-center gap-3 border-t p-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-12 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="hidden w-[340px] flex-col gap-4 border-l p-4 lg:flex">
        <Line className="w-24" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="ml-auto h-14 w-3/4 rounded-2xl" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-10 rounded-lg" />
              <Line className="w-28" />
            </div>
          </div>
        ))}
        <Skeleton className="mt-auto h-24 w-full rounded-2xl" />
      </div>
    </div>
  )
}

/** A spinner, for buttons. */
export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />
}

/**
 * A button that works for a moment before it acts (saving, creating, deleting): it shows a spinner,
 * keeps its width and stays disabled, then runs onClick.
 */
export function PendingButton({ onClick, children, disabled, ms, ...props }: React.ComponentProps<typeof Button> & { ms?: number }) {
  const base = useLoadMs()
  const wait = ms ?? Math.min(900, Math.max(450, base))
  const [pending, setPending] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => void (alive.current = false), [])
  return (
    <Button
      {...props}
      className={cn("relative", props.className, pending && "disabled:opacity-100")}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (pending) return
        if (base <= 0) return onClick?.(e)
        e.persist?.()
        setPending(true)
        setTimeout(() => {
          if (alive.current) setPending(false)
          onClick?.(e)
        }, wait)
      }}
    >
      <span className={cn("inline-flex items-center gap-1.5", pending && "invisible")}>{children}</span>
      {pending && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
    </Button>
  )
}
