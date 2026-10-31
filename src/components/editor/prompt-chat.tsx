import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Loading03Icon, PanelRightCloseIcon, SparklesIcon } from "@hugeicons/core-free-icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { RefStill, type Reference } from "@/components/prompt-composer"
import { cn } from "@/lib/utils"
import { MediaViewer } from "@/components/media-viewer"

/** One generation, as it appears in the history. */
export type HistoryItem = {
  id: string
  /** which video it was for */
  slideId: string
  prompt: string
  refs: { url: string; name: string; media?: "image" | "video"; poster?: string }[]
  /** the reference video was attached automatically (variations) */
  fromReference?: boolean
  /** the sample video it produced, and when it started (to tell if it's still generating) */
  video: number
  startedAt: number
  /** generated together with the reference video (Regenerate all) */
  batch?: boolean
  /** when it was sent (startedAt can be later: queued after the reference video) */
  at?: number
}

const MIN_W = 280
const MAX_W = 560
const DEFAULT_W = 340
const WIDTH_KEY = "flam.promptsWidth"
const clampW = (w: number) => Math.round(Math.min(MAX_W, Math.max(MIN_W, w)))

export type ChatTarget = { id: string; name: string; poster?: string; isReference: boolean }

/**
 * Prompts as a chat, on the right of the canvas: every generation so far, newest at the bottom,
 * each saying which video it was for. The composer at the bottom writes for the video in view.
 */
export function PromptChat({
  history,
  nameOf,
  posterOf,
  isGenerating,
  isCurrent,
  onSelect,
  target,
  composer,
  busy,
  collapsed,
  onCollapse,
  title = "Prompts",
  badge,
  extra = [],
  emptyText = "Prompts for the reference video and each variation show up here.",
  head,
}: {
  /** replaces "Creating for" above the composer */
  head?: React.ReactNode
  /** panel title: Prompts, or Chat when the chat plans the Flick */
  title?: string
  /** shown beside the title (live or demo chat) */
  badge?: React.ReactNode
  /** more chat items (the planning chat), merged with the history by time */
  extra?: { key: string; at: number; node: React.ReactNode }[]
  emptyText?: string
  history: HistoryItem[]
  /** the video's current name (names can change after the fact) */
  nameOf: (slideId: string) => string | undefined
  posterOf: (video: number) => string
  /** still generating this item */
  isGenerating: (h: HistoryItem) => boolean
  /** the latest video for its slide (older ones were replaced) */
  isCurrent: (h: HistoryItem) => boolean
  onSelect: (slideId: string) => void
  target: ChatTarget
  /** the prompt box itself */
  composer: React.ReactNode
  /** something is generating: the composer is paused */
  busy: boolean
  /** hidden; reopened from the Prompts button on the canvas */
  collapsed?: boolean
  onCollapse?: () => void
}) {
  const list = useRef<HTMLDivElement>(null)
  // a reference image from the history, open in the viewer
  const [viewing, setViewing] = useState<{ h: string; i: number } | null>(null)
  const viewRefs = viewing ? (history.find((x) => x.id === viewing.h)?.refs ?? []) : []
  // resizable width, remembered on this device
  const [width, setWidthRaw] = useState(() => {
    try {
      const v = Number(localStorage.getItem(WIDTH_KEY))
      return v ? clampW(v) : DEFAULT_W
    } catch {
      return DEFAULT_W
    }
  })
  const setWidth = (u: number | ((w: number) => number)) =>
    setWidthRaw((w) => {
      const next = clampW(typeof u === "function" ? u(w) : u)
      try {
        localStorage.setItem(WIDTH_KEY, String(next))
      } catch {
        /* storage unavailable */
      }
      return next
    })
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const x0 = e.clientX
    const w0 = width
    document.body.style.cursor = "col-resize"
    // the panel sits on the right, so dragging its left edge leftwards widens it
    const move = (ev: PointerEvent) => setWidth(w0 - (ev.clientX - x0))
    const up = () => {
      document.body.style.cursor = ""
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }
  // keep the newest message in view
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" })
  }, [history.length, collapsed, extra.length])
  // keep following a reply as it streams in, unless the user scrolled up
  const lastNode = extra.at(-1)?.node
  useEffect(() => {
    const el = list.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight
  }, [lastNode])

  if (collapsed) return null
  const historyRow = (h: HistoryItem) => {
          const name = nameOf(h.slideId)
          const generating = isGenerating(h)
          const current = isCurrent(h)
          return (
            <div key={h.id} className="flex flex-col gap-2">
              {/* the prompt, like a sent message */}
              <div className="ml-6 flex flex-col gap-2 self-end rounded-2xl rounded-br-md bg-background/60 p-3 ring-1 ring-foreground/5">
                <TargetChip name={name ?? "Removed variation"} removed={!name} onClick={name ? () => onSelect(h.slideId) : undefined} />
                {h.prompt && <p className="whitespace-pre-line text-sm leading-relaxed">{h.prompt}</p>}
                {(h.fromReference || h.refs.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {h.fromReference && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">From the reference video</span>}
                    {h.refs.map((r, i) => (
                      <button key={i} type="button" onClick={() => setViewing({ h: h.id, i })} aria-label={`View ${r.name}`} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <RefStill r={r} className="size-9 rounded-lg object-cover ring-1 ring-foreground/10" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* the result */}
              <button
                type="button"
                disabled={!name}
                onClick={() => name && onSelect(h.slideId)}
                className="mr-10 flex items-center gap-3 rounded-2xl p-1.5 pr-3 text-left outline-none hover:bg-background/70 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none"
              >
                <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
                  {generating ? (
                    <>
                      <span aria-hidden className="generating-gradient absolute inset-[-50%]" />
                      <HugeiconsIcon icon={Loading03Icon} className="relative size-4 animate-spin text-primary" />
                    </>
                  ) : (
                    <img src={posterOf(h.video)} alt="" className={cn("absolute inset-0 size-full object-cover", !current && "opacity-50 grayscale")} />
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{generating ? "Generating…" : current ? "Video ready" : "Replaced"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {generating ? `${name ?? "Video"}${h.batch ? ", after the reference video" : ""}` : current ? `Showing on ${name}` : "A newer video replaced this one"}
                  </span>
                </span>
              </button>
            </div>
          )
  }


  return (
    <aside
      aria-label="Prompts"
      style={{ width }}
      // a shade darker than the editor, with a thicker edge, so it reads as its own space
      className="relative flex shrink-0 flex-col border-l-2 border-foreground/10 bg-[color-mix(in_oklch,var(--muted),var(--foreground)_4%)]"
    >
      {/* drag to resize; double-click resets */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize prompts panel"
        aria-valuemin={MIN_W}
        aria-valuemax={MAX_W}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={startResize}
        onDoubleClick={() => setWidth(DEFAULT_W)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") (e.preventDefault(), setWidth((w) => clampW(w + 16)))
          if (e.key === "ArrowRight") (e.preventDefault(), setWidth((w) => clampW(w - 16)))
        }}
        className="group/resize absolute inset-y-0 -left-[5px] z-20 w-2 cursor-col-resize outline-none"
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary opacity-0 transition-opacity group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100 group-active/resize:opacity-100" />
      </div>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-foreground/5 pl-4 pr-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {badge}
        {onCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Hide prompts" onClick={onCollapse} className="ml-auto text-muted-foreground">
                <HugeiconsIcon icon={PanelRightCloseIcon} className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">Hide prompts</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div ref={list} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4 pt-3">
        {history.length === 0 && extra.length === 0 && <p className="px-1 pt-2 text-sm text-muted-foreground">{emptyText}</p>}
        {[
          ...history.map((h) => ({ key: h.id, at: h.at ?? h.startedAt, h })),
          ...extra.map((x) => ({ ...x, h: undefined })),
        ]
          .sort((a, b) => a.at - b.at)
          .map((row) => (row.h ? historyRow(row.h) : <div key={row.key} className="flex flex-col">{row.node}</div>))}
      </div>

      {/* composer: says which video it's writing for */}
      <div className="shrink-0 border-t-2 border-foreground/10 p-3">
        {head ?? (
          <div className="flex items-center gap-2 px-1 pb-2 text-xs text-muted-foreground">
            <span>Creating for</span>
            <TargetChip name={target.name} poster={target.poster} />
          </div>
        )}
        <div data-composer className={cn("rounded-2xl transition-[opacity,box-shadow] duration-300 data-[flash]:ring-2 data-[flash]:ring-primary data-[flash]:ring-offset-2 data-[flash]:ring-offset-background", busy && "pointer-events-none opacity-60")} aria-disabled={busy}>
          {composer}
        </div>
      </div>
      <MediaViewer
        items={viewRefs.map((r, i) => ({ id: String(i), kind: r.media === "video" ? "video" : "image", src: r.url, poster: r.poster, name: r.name, details: [["Source", "Uploaded"], ["Type", r.media === "video" ? "Video" : "Image"]] }))}
        index={viewing ? viewing.i : null}
        onIndex={(i) => viewing && setViewing({ ...viewing, i })}
        onClose={() => setViewing(null)}
      />
    </aside>
  )
}

export function TargetChip({ name, poster, removed, onClick }: { name: string; poster?: string; removed?: boolean; onClick?: () => void }) {
  const body = (
    <>
      {poster ? <img src={poster} alt="" className="size-4 rounded object-cover" /> : <HugeiconsIcon icon={removed ? Alert02Icon : SparklesIcon} className="size-3" />}
      <span className="truncate">{name}</span>
    </>
  )
  const cls = "inline-flex h-6 max-w-40 items-center gap-1.5 self-start rounded-md bg-muted px-1.5 text-xs font-medium text-foreground"
  return onClick ? (
    <Button variant="ghost" size="xs" onClick={onClick} className={cn(cls, "hover:bg-muted/70")}>
      {body}
    </Button>
  ) : (
    <span className={cn(cls, removed && "text-muted-foreground")}>{body}</span>
  )
}

/** a history entry's image references, from the prompt box's references */
export const refsOf = (refs: Reference[] | undefined) => (refs ?? []).filter((r) => !r.loading).map((r) => ({ url: r.url, name: r.name, media: r.media, poster: r.poster }))

/**
 * Bring the prompt box into focus from elsewhere (a tip, the strip). With a label, it's also
 * spotlit for a moment: the rest dims and a label says what to write ("Describe Variation 2 here").
 */
export function focusPromptBox(label?: string) {
  setTimeout(() => {
    const box = document.querySelector<HTMLElement>('aside[aria-label="Prompts"] [data-composer]')
    if (!box) return
    box.querySelector<HTMLTextAreaElement>("textarea")?.focus()
    box.dataset.flash = ""
    setTimeout(() => delete box.dataset.flash, 700)
    if (label) window.dispatchEvent(new CustomEvent("flam:prompt-spotlight", { detail: label }))
  }, 80)
}

/** The prompt box cue: the page dims a little, with a ring on the box and a small label above it for about a second. Fades on its own, or on typing or a click. */
export function PromptSpotlight() {
  const [spot, setSpot] = useState<{ label: string; rect: DOMRect; n: number } | null>(null)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const on = (e: Event) => {
      const box = document.querySelector<HTMLElement>('aside[aria-label="Prompts"] [data-composer]')
      if (!box) return
      setLeaving(false)
      setSpot((s) => ({ label: (e as CustomEvent<string>).detail, rect: box.getBoundingClientRect(), n: (s?.n ?? 0) + 1 }))
    }
    window.addEventListener("flam:prompt-spotlight", on)
    return () => window.removeEventListener("flam:prompt-spotlight", on)
  }, [])
  useEffect(() => {
    if (!spot) return
    const fade = () => setLeaving(true)
    const t1 = setTimeout(fade, 700)
    window.addEventListener("keydown", fade, { once: true })
    window.addEventListener("pointerdown", fade, { once: true })
    return () => (clearTimeout(t1), window.removeEventListener("keydown", fade), window.removeEventListener("pointerdown", fade))
  }, [spot?.n])
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setSpot(null), 200)
    return () => clearTimeout(t)
  }, [leaving])
  if (!spot) return null
  const r = spot.rect
  const pad = 6
  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 z-[60] transition-opacity duration-200 animate-in fade-in-0", leaving && "opacity-0")}>
      {/* everything else dims a little */}
      <div className="absolute rounded-[20px]" style={{ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.2)" }} />
      <span
        className="absolute flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-md animate-in slide-in-from-bottom-1 duration-200"
        style={{ left: r.left + r.width / 2, top: r.top - pad - 12, transform: "translate(-50%, -100%)" }}
      >
        {spot.label}
      </span>
    </div>
  )
}
