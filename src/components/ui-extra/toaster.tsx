import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ToastInput = { title: string; description?: string; kind?: "success" | "info" | "error"; action?: { label: string; onClick: () => void } }
type Toast = ToastInput & { id: number }

const Ctx = createContext<(t: ToastInput | string) => void>(() => {})
export const useToast = () => useContext(Ctx)

const VISIBLE = 3
const DURATION = 5000
const GAP = 10

/**
 * Stacked toasts, shadcn/sonner style: newest in front, older ones peek behind it.
 * Hover the stack to spread them out; each dismisses on its own timer (paused while hovered).
 */
export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const push = useCallback((t: ToastInput | string) => {
    const toast = typeof t === "string" ? { title: t } : t
    setToasts((list) => [...list, { ...toast, id: nextId.current++ }].slice(-8))
  }, [])
  const dismiss = (id: number) => setToasts((list) => list.filter((t) => t.id !== id))

  return (
    <Ctx.Provider value={push}>
      {children}
      <Stack toasts={toasts} dismiss={dismiss} />
    </Ctx.Provider>
  )
}

function Stack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [heights, setHeights] = useState<Record<number, number>>({})
  const ordered = [...toasts].reverse() // newest first
  const frontHeight = heights[ordered[0]?.id] ?? 64

  // collapse once the stack empties
  useEffect(() => {
    if (!toasts.length) setExpanded(false)
  }, [toasts.length])

  let offset = 0
  return (
    <section
      aria-label="Notifications"
      aria-live="polite"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed left-1/2 top-4 z-[60] w-[360px] max-w-[calc(100vw-2.5rem)] -translate-x-1/2"
      style={{ height: toasts.length ? (expanded ? Object.values(heights).reduce((a, b) => a + b + GAP, 0) : frontHeight + Math.min(ordered.length - 1, VISIBLE - 1) * 14) : 0 }}
    >
      {ordered.map((t, i) => {
        const y = expanded ? offset : i * 14
        offset += (heights[t.id] ?? 64) + GAP
        const hidden = !expanded && i >= VISIBLE
        return (
          <ToastCard
            key={t.id}
            t={t}
            index={i}
            y={y}
            expanded={expanded}
            hidden={hidden}
            frontHeight={frontHeight}
            paused={expanded}
            onHeight={(h) => setHeights((m) => (m[t.id] === h ? m : { ...m, [t.id]: h }))}
            onDismiss={() => {
              dismiss(t.id)
              setHeights(({ [t.id]: _gone, ...rest }) => rest)
            }}
          />
        )
      })}
    </section>
  )
}

function ToastCard({
  t,
  index,
  y,
  expanded,
  hidden,
  frontHeight,
  paused,
  onHeight,
  onDismiss,
}: {
  t: Toast
  index: number
  y: number
  expanded: boolean
  hidden: boolean
  frontHeight: number
  paused: boolean
  onHeight: (h: number) => void
  onDismiss: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const left = useRef(DURATION)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    if (ref.current) onHeight(ref.current.offsetHeight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // auto-dismiss, paused while the stack is spread out
  useEffect(() => {
    if (paused) return
    const start = Date.now()
    const id = setTimeout(onDismiss, left.current)
    return () => {
      clearTimeout(id)
      left.current -= Date.now() - start
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  const scale = expanded ? 1 : 1 - index * 0.05
  return (
    <div
      ref={ref}
      role="status"
      className={cn(
        "absolute inset-x-0 top-0 flex items-start gap-3 rounded-2xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition-all duration-300 ease-out",
        hidden && "pointer-events-none opacity-0",
      )}
      style={{
        zIndex: 100 - index,
        transform: mounted ? `translateY(${y}px) scale(${scale})` : "translateY(-100%)",
        opacity: mounted && !hidden ? 1 : 0,
        transformOrigin: "top center",
        // collapsed cards behind the front one take its height so the stack edges line up
        height: !expanded && index > 0 ? frontHeight : undefined,
        overflow: "hidden",
      }}
    >
      <HugeiconsIcon
        icon={t.kind === "info" ? InformationCircleIcon : t.kind === "error" ? Alert02Icon : CheckmarkCircle02Icon}
        className={cn(
          "mt-0.5 size-4 shrink-0 transition-opacity",
          t.kind === "info" ? "text-muted-foreground" : t.kind === "error" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
          !expanded && index > 0 && "opacity-0",
        )}
      />
      <div className={cn("min-w-0 flex-1 transition-opacity", !expanded && index > 0 && "opacity-0")}>
        <p className="text-sm font-medium">{t.title}</p>
        {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
        {t.action && (
          <Button variant="link" size="xs" onClick={() => (t.action!.onClick(), onDismiss())} className="mt-1 h-auto px-0">
            {t.action.label}
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss"
        onClick={onDismiss}
        className={cn("size-5 shrink-0 rounded-full text-muted-foreground transition-opacity", !expanded && index > 0 && "opacity-0")}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
      </Button>
    </div>
  )
}
