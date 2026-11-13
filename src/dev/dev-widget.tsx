import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Analytics01Icon, ChatBotIcon, DashboardSquare01Icon, DragDropVerticalIcon, File01Icon, FlashIcon, TestTubeIcon, Timer01Icon } from "@hugeicons/core-free-icons"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useDevActions } from "@/dev/dev-actions"
import { health, mockVideos, isLive, type Health } from "@/ai/client"
import { managedOn, setManaged } from "@/ai/managed"
import { useDevState } from "@/dev/state"

const KEY = "flam.devWidget"
const MARGIN = 8

/**
 * Dev tools as one small floating pill, on every screen (sign-in, onboarding, the app and the
 * editor). Click it (or ⌘.) for the menu: the switches, this screen's shortcuts, and the three
 * dialogs (State, AI, Docs). Two dots on the pill show Sample videos and Managed agent. Drag the
 * grip to move it; it remembers where it was left on this device.
 */
export function DevWidget({ onState, onAi, onDocs }: { onState: () => void; onAi: () => void; onDocs: () => void }) {
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
  const [open, setOpen] = useState(false)
  const [mock, setMock] = useState(mockVideos)
  const [managed, setManagedOn] = useState(managedOn)
  const { state: dev, update: setDev } = useDevState()
  const slow = dev.pageLoadMs > 0

  /** Keep the pill fully on screen. */
  const clamp = (x: number, y: number) => {
    const el = box.current
    const w = el?.offsetWidth ?? 80
    const h = el?.offsetHeight ?? 32
    return { x: Math.min(Math.max(MARGIN, x), window.innerWidth - w - MARGIN), y: Math.min(Math.max(MARGIN, y), window.innerHeight - h - MARGIN) }
  }
  // default: bottom center; and back on screen when the window shrinks
  useEffect(() => {
    const place = () =>
      setPos((p) => {
        const el = box.current
        if (!p) return clamp((window.innerWidth - (el?.offsetWidth ?? 80)) / 2, window.innerHeight - (el?.offsetHeight ?? 32) - 16)
        return clamp(p.x, p.y)
      })
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // ⌘. opens the menu from anywhere
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "." && (e.metaKey || e.ctrlKey)) (e.preventDefault(), setOpen((o) => !o))
    }
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
  }, [])

  const moved = useRef(false)
  const startDrag = (e: React.PointerEvent) => {
    if (!pos) return
    e.preventDefault()
    moved.current = false
    const dx = e.clientX - pos.x
    const dy = e.clientY - pos.y
    setDragging(true)
    const move = (ev: PointerEvent) => {
      moved.current = true
      setPos(clamp(ev.clientX - dx, ev.clientY - dy))
    }
    const up = () => {
      setDragging(false)
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
  // today's use against the server's caps, read when the menu opens
  const [h, setH] = useState<Health | null>(null)
  useEffect(() => {
    if (open && isLive()) health().then(setH).catch(() => setH(null))
  }, [open])

  return (
    <div
      ref={box}
      role="toolbar"
      aria-label="Dev tools"
      data-keep-selection
      style={pos ? { left: pos.x, top: pos.y } : { visibility: "hidden" }}
      className={cn("fixed z-[45] flex items-center rounded-xl bg-neutral-900/90 p-1 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md dark:bg-neutral-800/90", dragging && "cursor-grabbing select-none shadow-2xl")}
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
              setPos(clamp((window.innerWidth - (el?.offsetWidth ?? 80)) / 2, window.innerHeight - (el?.offsetHeight ?? 32) - 16))
            }}
            aria-label="Move dev tools"
            className={cn("flex h-7 items-center rounded-lg px-1 text-white/70 hover:bg-white/10 hover:text-white", dragging ? "cursor-grabbing" : "cursor-grab")}
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Drag to move · double-click to reset</TooltipContent>
      </Tooltip>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Dev menu"
            className="flex h-7 items-center gap-2 rounded-lg pl-1.5 pr-2 font-mono text-xs font-semibold tracking-wide text-white/90 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 data-[state=open]:bg-white/20"
          >
            DEV
            <span className="flex items-center gap-1" aria-hidden>
              <span title="Sample videos" className={cn("size-1.5 rounded-full", mock ? "bg-brand" : "bg-white/30")} />
              <span title="Managed agent" className={cn("size-1.5 rounded-full", managed ? "bg-brand" : "bg-white/30")} />
            </span>
            {actions.length > 0 && <HugeiconsIcon icon={FlashIcon} className="size-3 text-brand" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-72">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Switches</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={mock}
            onCheckedChange={(v) => {
              try {
                localStorage.setItem("flam.mockVideos", v ? "1" : "0")
              } catch {
                /* no storage */
              }
              setMock(!!v)
            }}
          >
            <HugeiconsIcon icon={TestTubeIcon} className="size-4" />
            Sample videos
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={managed} onCheckedChange={(v) => (setManaged(!!v), setManagedOn(!!v))}>
            <HugeiconsIcon icon={ChatBotIcon} className="size-4" />
            Managed agent
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={slow} onCheckedChange={(v) => setDev({ pageLoadMs: v ? 400 : 0 })}>
            <HugeiconsIcon icon={Timer01Icon} className="size-4" />
            Page load time
          </DropdownMenuCheckboxItem>
          {actions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">This screen</DropdownMenuLabel>
              <DropdownMenuGroup>
                {actions.map((a) => (
                  <DropdownMenuItem key={a.id} onSelect={a.run}>
                    <HugeiconsIcon icon={FlashIcon} className="size-4 text-brand" />
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Open</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onState}>
              <HugeiconsIcon icon={DashboardSquare01Icon} className="size-4" />
              State
              <DropdownMenuShortcut>UI states, users, history</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onAi}>
              <HugeiconsIcon icon={Analytics01Icon} className="size-4" />
              AI
              <DropdownMenuShortcut>server, agent, requests, metrics</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDocs}>
              <HugeiconsIcon icon={File01Icon} className="size-4" />
              Docs
              <DropdownMenuShortcut>PRD, components, emails</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {h && (
            <>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs tabular-nums text-muted-foreground">
                Today: {h.used.chats}/{h.caps.chats} replies · {h.used.images}/{h.caps.images} images{h.caps.videos !== undefined ? ` · ${h.used.videos ?? 0}/${h.caps.videos} videos` : ""}
              </p>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
