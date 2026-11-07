import { Arrive } from "@/components/arrive"
import { Shortcut } from "@/components/shortcut"
import { GeneratingGradient } from "@/components/editor/generation-progress"
import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, PanelRightCloseIcon, SparklesIcon } from "@hugeicons/core-free-icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MOD } from "@/lib/keys"
import { Badge } from "@/components/ui/badge"
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
const DEFAULT_W = 380
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
  emptyText = "Ask for a change: a headline, a color, another variation.",
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
  // the bottom area grows (a question deck, an approval, suggestion chips): the thread keeps its place at the end
  const foot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = foot.current
    const l = list.current
    if (!el || !l) return
    let last = el.offsetHeight
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight
      if (h > last && l.scrollHeight - l.scrollTop - l.clientHeight < 160 + (h - last)) l.scrollTop = l.scrollHeight
      last = h
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [collapsed])

  if (collapsed) return null
  const historyRow = (h: HistoryItem) => {
          const name = nameOf(h.slideId)
          const generating = isGenerating(h)
          const current = isCurrent(h)
          return (
            <div key={h.id} className="flex flex-col gap-2">
              {/* the prompt, like a sent message */}
              <div className="ml-6 flex flex-col gap-2 self-end rounded-2xl rounded-br-md bg-muted p-3">
                <TargetChip name={name ?? "Removed variation"} removed={!name} onClick={name ? () => onSelect(h.slideId) : undefined} />
                {h.prompt && <p className="whitespace-pre-line text-sm leading-relaxed">{h.prompt}</p>}
                {(h.fromReference || h.refs.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {h.fromReference && <Badge variant="subtle">From Variation 1</Badge>}
                    {h.refs.map((r, i) => (
                      <button key={i} type="button" onClick={() => setViewing({ h: h.id, i })} aria-label={`View ${r.name}`} className="rounded-lg focus-ring">
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
                className="mr-10 flex items-center gap-3 rounded-2xl p-1.5 pr-3 text-left hover:bg-muted focus-ring disabled:pointer-events-none"
              >
                <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
                  {generating ? (
                    <GeneratingGradient spinner />
                  ) : (
                    <img loading="lazy" decoding="async" src={posterOf(h.video)} alt="" className={cn("absolute inset-0 size-full object-cover", !current && "opacity-50 grayscale")} />
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{generating ? "Generating…" : current ? "Video ready" : "Replaced"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {generating ? `${name ?? "Video"}${h.batch ? ", after Variation 1" : ""}` : current ? `Showing on ${name}` : "A newer video replaced this one"}
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
      // the preset's side-panel surface, so it reads as its own space
      className="relative flex shrink-0 flex-col border-l bg-background"
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
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-brand opacity-0 transition-opacity group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100 group-active/resize:opacity-100" />
      </div>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b pl-4 pr-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {badge}
        {onCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Hide prompts" onClick={onCollapse} className="ml-auto text-muted-foreground">
                <HugeiconsIcon icon={PanelRightCloseIcon} className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="flex items-center gap-2">Hide prompts<Shortcut keys={[MOD, "\\"]} /></TooltipContent>
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
          .map((row) => (row.h ? <Arrive key={row.key}>{historyRow(row.h)}</Arrive> : <Arrive key={row.key} className="flex flex-col">{row.node}</Arrive>))}
      </div>

      {/* composer: says which video it's writing for */}
      <div ref={foot} className="shrink-0 border-t p-3">
        {head ?? (
          <div className="flex items-center gap-2 px-1 pb-2 text-xs text-muted-foreground">
            <span>Creating for</span>
            <TargetChip name={target.name} poster={target.poster} />
          </div>
        )}
        <div data-composer className={cn("rounded-2xl transition-[opacity,box-shadow] duration-300 data-[flash]:ring-2 data-[flash]:ring-brand data-[flash]:ring-offset-2 data-[flash]:ring-offset-background", busy && "pointer-events-none opacity-70")} aria-disabled={busy}>
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
      {poster ? <img loading="lazy" decoding="async" src={poster} alt="" className="size-4 rounded object-cover" /> : <HugeiconsIcon icon={removed ? Alert02Icon : SparklesIcon} className="size-3" />}
      <span className="truncate">{name}</span>
    </>
  )
  const cls = "inline-flex h-6 max-w-40 items-center gap-1.5 self-start rounded-md bg-muted px-1.5 text-xs font-medium text-foreground"
  return onClick ? (
    <Button variant="ghost" size="xs" onClick={onClick} className={cn(cls, "hover:bg-muted/50")}>
      {body}
    </Button>
  ) : (
    <span className={cn(cls, removed && "text-muted-foreground")}>{body}</span>
  )
}

/** a history entry's image references, from the prompt box's references */
export const refsOf = (refs: Reference[] | undefined) => (refs ?? []).filter((r) => !r.loading).map((r) => ({ url: r.url, name: r.name, media: r.media, poster: r.poster }))

/** Bring the prompt box into focus from elsewhere (a tip, the strip, the canvas). */
export function focusPromptBox() {
  setTimeout(() => {
    document.querySelector<HTMLTextAreaElement>('aside[aria-label="Prompts"] [data-composer] textarea')?.focus()
  }, 80)
}
