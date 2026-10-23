import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { DashboardSquare01Icon, DragDropVerticalIcon, File01Icon, Mail01Icon, FlashIcon, TestTubeIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useDevActions } from "@/dev/dev-actions"

const KEY = "flam.devWidget"
const MARGIN = 8

/**
 * Dev tools as a small floating bar, on every screen (sign-in, onboarding, the app and the editor).
 * Drag the grip to move it; it remembers where it was left on this device.
 * Compact by default (grip and icons); hovering or focusing it shows the names of the shortcuts and tools.
 */
export function DevWidget({ onStateManager, onComponents, onPrd, onEmails }: { onStateManager: () => void; onComponents: () => void; onPrd: () => void; onEmails: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "null")
      return v && typeof v.x === "number" ? v : null
    } catch {
      return null
    }
  })
  const [dragging, setDragging] = useState(false)
  // expanded while hovered or focused. The item under the pointer stays put as names appear (the bar
  // slides left to keep it there), and the bar never runs off either edge of the screen.
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const anchor = useRef<{ el: Element; x: number } | null>(null)
  const expand = (target: EventTarget | null) => {
    if (open) return
    const el = (target as HTMLElement | null)?.closest?.("button, [aria-label='Move dev tools']")
    anchor.current = el ? { el, x: el.getBoundingClientRect().left } : null
    setOpen(true)
  }
  useLayoutEffect(() => {
    const el = box.current
    if (!open || !el || !pos) return setShift(0)
    let s = anchor.current ? anchor.current.el.getBoundingClientRect().left - anchor.current.x : 0
    s = Math.max(s, pos.x + el.offsetWidth - (window.innerWidth - MARGIN))
    setShift(Math.min(s, pos.x - MARGIN))
    // only when it opens; dragging updates pos and recomputes below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /** Keep the bar fully on screen. */
  const clamp = (x: number, y: number) => {
    const el = box.current
    const w = el?.offsetWidth ?? 300
    const h = el?.offsetHeight ?? 40
    return { x: Math.min(Math.max(MARGIN, x), window.innerWidth - w - MARGIN), y: Math.min(Math.max(MARGIN, y), window.innerHeight - h - MARGIN) }
  }
  // default: bottom centre; and back on screen when the window shrinks
  useEffect(() => {
    const place = () =>
      setPos((p) => {
        const el = box.current
        if (!p) return clamp((window.innerWidth - (el?.offsetWidth ?? 300)) / 2, window.innerHeight - (el?.offsetHeight ?? 40) - 16)
        return clamp(p.x, p.y)
      })
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startDrag = (e: React.PointerEvent) => {
    if (!pos) return
    e.preventDefault()
    // drag from where the bar is drawn (its slide included)
    const start = { x: pos.x - shift, y: pos.y }
    setPos(start)
    setShift(0)
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    setDragging(true)
    const move = (ev: PointerEvent) => setPos(clamp(ev.clientX - dx, ev.clientY - dy))
    const up = () => {
      setDragging(false)
      // dropped away from the pointer: collapse again
      setOpen(!!box.current?.matches(":hover"))
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      setPos((p) => {
        try {
          localStorage.setItem(KEY, JSON.stringify(p))
        } catch {
          /* storage unavailable */
        }
        return p
      })
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  // shortcuts the current screen offers (e.g. opening the emailed sign-in link)
  const actions = useDevActions()
  const tools = [
    { label: "State manager", icon: TestTubeIcon, onClick: onStateManager },
    { label: "Components", icon: DashboardSquare01Icon, onClick: onComponents },
    { label: "Emails", icon: Mail01Icon, onClick: onEmails },
    { label: "PRD", icon: File01Icon, onClick: onPrd },
  ]

  return (
    <div
      ref={box}
      role="toolbar"
      aria-label="Dev tools"
      data-keep-selection
      style={pos ? { left: pos.x - shift, top: pos.y } : { visibility: "hidden" }}
      onPointerEnter={(e) => expand(document.elementFromPoint(e.clientX, e.clientY))}
      onPointerLeave={() => !dragging && setOpen(false)}
      onFocus={(e) => expand(e.target)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      className={cn(
        "fixed z-[45] flex items-center gap-0.5 rounded-xl bg-neutral-900/90 p-1 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md dark:bg-neutral-800/90",
        dragging && "cursor-grabbing select-none shadow-2xl",
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onPointerDown={startDrag}
            onDoubleClick={() => {
              try {
                localStorage.removeItem(KEY)
              } catch {
                /* storage unavailable */
              }
              const el = box.current
              setPos(clamp((window.innerWidth - (el?.offsetWidth ?? 300)) / 2, window.innerHeight - (el?.offsetHeight ?? 40) - 16))
            }}
            aria-label="Move dev tools"
            className={cn("flex h-7 items-center gap-1 rounded-lg pl-1 pr-1.5 text-white/60 hover:bg-white/10 hover:text-white", dragging ? "cursor-grabbing" : "cursor-grab")}
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5" />
            <span className="font-mono text-[10px] font-semibold tracking-wide">DEV</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>Drag to move · double-click to reset</TooltipContent>
      </Tooltip>
      <span aria-hidden className="mx-0.5 h-4 w-px bg-white/15" />
      {actions.map((a) => (
        <Button
          key={a.id}
          size="sm"
          onClick={a.run}
          aria-label={a.label}
          className={cn("h-7 gap-1.5 rounded-lg bg-primary text-xs transition-none font-medium text-primary-foreground hover:bg-primary/90", open ? "px-2" : "w-7 px-0")}
        >
          <HugeiconsIcon icon={FlashIcon} className="size-3.5" />
          {open && <span className="animate-in fade-in-0 duration-150">{a.label}</span>}
        </Button>
      ))}
      {actions.length > 0 && <span aria-hidden className="mx-0.5 h-4 w-px bg-white/15" />}
      {tools.map((t) => (
        <Button
          key={t.label}
          variant="ghost"
          size="sm"
          onClick={t.onClick}
          aria-label={t.label}
          className={cn("h-7 gap-1.5 rounded-lg text-xs font-normal transition-none text-white/85 hover:bg-white/10 hover:text-white dark:hover:bg-white/10", open ? "px-2" : "w-7 px-0")}
        >
          <HugeiconsIcon icon={t.icon} className="size-3.5" />
          {open && <span className="animate-in fade-in-0 duration-150">{t.label}</span>}
        </Button>
      ))}
    </div>
  )
}
