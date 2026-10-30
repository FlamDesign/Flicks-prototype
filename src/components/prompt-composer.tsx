import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  PlayIcon,
  ArrowDown01Icon,
  SparklesIcon,
  Cancel01Icon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SIZES, SIZE_GROUPS, type Template } from "@/data"
import { RatioGlyph } from "@/components/ratio-glyph"
import { cn } from "@/lib/utils"
import { useImageUploads } from "@/lib/uploads"
import { useMediaAdd } from "@/components/media-picker"
import type { PickedMedia } from "@/lib/media"
import { MediaViewer, type ViewerItem } from "@/components/media-viewer"
import { videoCost } from "@/components/credits-card"

/** A photo or video added to a prompt box. Videos are at most 15 seconds (longer ones are trimmed when added). */
export type Reference = { id: string; name: string; url: string; loading: boolean; failed?: boolean; media?: "image" | "video"; poster?: string; duration?: number }


/** Video lengths offered in the composer, in seconds. */
const DURATIONS = [6, 8, 10, 12, 15]

export function PromptComposer({
  template,
  onClearTemplate,
  prompt,
  setPrompt,
  size,
  setSize,
  pulse,
  credits,
  onSpend,
  onGetCredits,
  onGenerate,
  chat,
}: {
  /** the chat plans the Flick first: Start opens it, nothing is charged yet (not for templates) */
  chat?: boolean
  onGenerate: (g: { prompt: string; size: string; duration: number; references: number; refs: Reference[] }) => void
  credits: number
  onSpend: (n: number) => void
  onGetCredits: () => void
  template: Template | null
  onClearTemplate: () => void
  prompt: string
  setPrompt: (v: string) => void
  size: string
  setSize: (v: string) => void
  pulse: number
}) {
  const [refs, setRefs] = useState<Reference[]>([])
  const [sending, setSending] = useState(false)
  const [flash, setFlash] = useState(false)
  const [sizeFlash, setSizeFlash] = useState(false)
  // video length in seconds
  const [duration, setDuration] = useState(8)
  const [dragging, setDragging] = useState(false)
  const firstSize = useRef(true)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!pulse) return
    setFlash(true)
    ref.current?.focus()
    const id = setTimeout(() => setFlash(false), 900)
    return () => clearTimeout(id)
  }, [pulse])

  // Highlight the size pill whenever the size changes (e.g. a template sets it)
  useEffect(() => {
    if (firstSize.current) {
      firstSize.current = false
      return
    }
    setSizeFlash(true)
    const id = setTimeout(() => setSizeFlash(false), 1200)
    return () => clearTimeout(id)
  }, [size])

  const sizeInfo = SIZES.find((s) => s.value === size)
  const uploading = refs.some((r) => r.loading)
  const canSend = (prompt.trim().length > 0 || !!template) && !uploading && !refs.some((r) => r.failed)

  const refUploads = useReferenceUploads(setRefs)
  const [viewing, setViewing] = useState<number | null>(null)
  const failedRefs = refs.some((r) => r.failed)
  const media = useMediaAdd(refUploads.addPicked)
  const addFiles = (files: FileList | File[]) => media.addFiles(files)

  const remove = (id: string) =>
    // the image may still be in use by a generated video's prompt box, so its URL is kept
    setRefs((r) => r.filter((x) => x.id !== id))

  // what this video costs: depends on its size and length
  const COST = videoCost(size, duration)
  // shown on Generate once there's something to generate
  const planFirst = !!chat && !template
  const showCost = !planFirst && (prompt.trim().length > 0 || !!template)
  const short = credits < COST

  const send = () => {
    if (!canSend) return
    if (short && !planFirst) return onGetCredits() // not enough credits: open Get credits instead
    setSending(true)
    if (!planFirst) onSpend(COST)
    // brief spinner on the button, then hand off to the generation canvas
    setTimeout(() => {
      setSending(false)
      onGenerate({ prompt: prompt.trim(), size, duration, references: refs.length, refs })
      // the editor keeps them now, so the home prompt box starts fresh
      setPrompt("")
      setRefs([])
    }, 600)
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-4">
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault()
            setDragging(true)
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "relative w-full rounded-3xl border bg-background/85 p-2 shadow-[0_12px_40px_-12px_color-mix(in_oklch,var(--shadow-ink)_18%,transparent)] backdrop-blur-xl transition-shadow duration-500",
          flash && "ring-2 ring-ring ring-offset-2 ring-offset-transparent",
          dragging && "border-primary ring-2 ring-primary/30",
        )}
      >
        {media.ui}

        {/* References + template */}
        {(template || refs.length > 0) && (
          <div className="flex items-center gap-2 overflow-x-auto px-1 pb-1 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onWheel={scrollSideways}>
            {refs.map((r) => (
              <ReferenceThumb key={r.id} r={r} onRemove={() => remove(r.id)} onRetry={() => refUploads.retry([r])} onOpen={() => setViewing(refs.filter((x) => !x.loading && !x.failed).findIndex((x) => x.id === r.id))} />
            ))}
            {template && (
              <Badge variant="secondary" className="h-7 gap-1.5 pl-1 pr-1 font-medium">
                {template.image && <img src={template.image} alt="" className="size-5 rounded-lg object-cover" />}
                {template.title}
                <Button variant="ghost" size="icon-xs" className="size-5" onClick={onClearTemplate} aria-label="Remove template">
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
        <FailedRefsNote refs={refs} onRetry={refUploads.retry} />

        <Textarea
          ref={ref}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault()
              addFiles(e.clipboardData.files)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send()
          }}
          placeholder="Describe the video you want to create"
          rows={2}
          className="field-sizing-content min-h-[72px] max-h-[200px] overflow-y-auto resize-none rounded-none border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-1 pb-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Add photos or videos" onClick={media.openPicker}>
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add photos or videos</TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          {/* video length, 6 to 15 seconds */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1.5 pl-3 pr-2 font-normal" aria-label={`Length: ${duration} seconds`}>
                    <span className="text-muted-foreground">Length</span>
                    <span className="font-medium tabular-nums">{duration}s</span>
                    <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Choose length</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-40" onCloseAutoFocus={(e) => (e.preventDefault(), ref.current?.focus({ preventScroll: true }))}>
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Video length</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                {DURATIONS.map((d) => (
                  <DropdownMenuRadioItem key={d} value={String(d)} className="pr-2 data-[state=checked]:bg-foreground/5 [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden">
                    <span className="tabular-nums">{d} seconds</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "gap-1.5 pl-3 pr-2 font-normal transition-all duration-300",
                      sizeFlash && "border-primary bg-primary/10 ring-2 ring-primary/30",
                    )}
                    aria-label={`Size: ${size} ${sizeInfo?.label ?? ""}`}
                  >
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium tabular-nums">{size}</span>
                    <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Choose size</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-64" onCloseAutoFocus={(e) => (e.preventDefault(), ref.current?.focus({ preventScroll: true }))}>
              <DropdownMenuRadioGroup value={size} onValueChange={setSize}>
                {SIZE_GROUPS.map((g, gi) => (
                  <DropdownMenuGroup key={g}>
                    {gi > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{g}</DropdownMenuLabel>
                    {SIZES.filter((s) => s.group === g).map((s) => (
                      <DropdownMenuRadioItem key={s.value} value={s.value} className="gap-2.5 pr-2 data-[state=checked]:bg-foreground/5 [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden">
                        <RatioGlyph size={s.value} className="text-muted-foreground" />
                        <span className="tabular-nums">{s.value}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{s.label}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={canSend ? -1 : 0}>
                <Button disabled={!canSend || sending} onClick={send} className={cn("gap-2 pl-3", showCost ? "pr-1.5" : "pr-3")} aria-label={planFirst ? "Start" : showCost ? `Generate video, uses ${COST} credits` : "Generate video"}>
                  <HugeiconsIcon icon={sending ? Loading03Icon : SparklesIcon} className={cn("size-4", sending && "animate-spin")} />
                  {planFirst ? (sending ? "Starting…" : "Start") : sending ? "Generating…" : "Generate"}
                  {showCost && (
                    <span className="flex items-center gap-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-medium tabular-nums leading-none animate-in fade-in zoom-in-95">
                      {COST}
                    </span>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{uploading ? "Uploading images" : failedRefs ? "Retry or remove the images that didn’t upload" : planFirst ? "Plan it in the chat first. Credits are used when you generate." : "Generate video"}</TooltipContent>
          </Tooltip>
        </div>

        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl bg-background/80 text-sm font-medium backdrop-blur-sm">
            Drop images to add as references
          </div>
        )}
      </div>

      <ReferenceViewer refs={refs} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
    </div>
  )
}

/**
 * Adds images as references with a simulated upload: a shimmer while uploading, then the image,
 * or a failed thumbnail (retry on it, and in the toast). No limit: the row scrolls.
 */
export function useReferenceUploads(setRefs: (fn: (r: Reference[]) => Reference[]) => void) {
  const uploads = useImageUploads()
  const settle = (id: string, ok: boolean) => setRefs((r) => r.map((x) => (x.id === id ? { ...x, loading: false, failed: !ok } : x)))
  const retry = (items: { id: string; name: string }[]) => {
    const ids = items.map((i) => i.id)
    setRefs((r) => r.map((x) => (ids.includes(x.id) ? { ...x, loading: true, failed: false } : x)))
    uploads.run(items, settle, retry)
  }
  /**
   * Picked photos and videos go in at once. New files upload (shimmer, then the thumbnail); a trimmed
   * clip shows as uploading while it's cut, then uploads; library items are ready.
   */
  const addPicked = (items: PickedMedia[]) => {
    if (!items.length) return
    const refs: Reference[] = items.map((m) => ({ id: crypto.randomUUID(), name: m.name, url: m.url, media: m.kind, poster: m.poster, duration: m.duration, loading: !!m.file || !!m.clip }))
    setRefs((r) => [...r, ...refs])
    uploads.run(refs.filter((r, i) => r.loading && !items[i].clip).map((r) => ({ id: r.id, name: r.name })), settle, retry)
    items.forEach((m, i) => {
      if (!m.clip) return
      const r = refs[i]
      m.clip.then(
        (file) => {
          setRefs((list) => list.map((x) => (x.id === r.id ? { ...x, url: URL.createObjectURL(file), name: file.name } : x)))
          uploads.run([{ id: r.id, name: file.name }], settle, retry)
        },
        () => settle(r.id, false),
      )
    })
  }
  return { addPicked, retry }
}

/** No scrollbar on the references row: a mouse wheel scrolls it sideways (trackpads already do). */
export const scrollSideways = (e: React.WheelEvent<HTMLElement>) => {
  const el = e.currentTarget
  if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY
}

/** A short red line under a prompt box while references failed to upload. */
export function FailedRefsNote({ refs, onRetry }: { refs: Reference[]; onRetry: (items: { id: string; name: string }[]) => void }) {
  const failed = refs.filter((r) => r.failed)
  if (!failed.length) return null
  return (
    <p className="flex items-center gap-1.5 px-1.5 pt-1 text-xs text-destructive">
      {failed.length === 1 ? "1 image didn’t upload." : `${failed.length} images didn’t upload.`}
      <button type="button" onClick={() => onRetry(failed)} className="font-medium underline-offset-2 hover:underline">
        {failed.length === 1 ? "Retry" : "Retry all"}
      </button>
    </p>
  )
}

/** 56px reference thumbnail. Shimmer while uploading, a retry state if it failed, remove button on hover. */
export function ReferenceThumb({ r, onRemove, onRetry, onOpen }: { r: Reference; onRemove: () => void; onRetry?: () => void; onOpen?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group/thumb relative size-14 shrink-0">
          {r.loading ? (
            <Skeleton className="shimmer size-14 animate-none rounded-xl" aria-label={`Uploading ${r.name}`} />
          ) : r.failed ? (
            // failed: the image tinted red, retry in the middle
            <button
              type="button"
              onClick={onRetry}
              aria-label={`Retry uploading ${r.name}`}
              className="relative block size-14 overflow-hidden rounded-xl ring-2 ring-destructive/60 outline-none focus-visible:ring-ring"
            >
              <img src={r.poster ?? r.url} alt="" className="size-full object-cover opacity-50 grayscale" />
              <span className="absolute inset-0 grid place-items-center bg-destructive/25 text-white">
                <span className="grid size-6 place-items-center rounded-full bg-destructive shadow-sm">
                  <HugeiconsIcon icon={RefreshIcon} className="size-3.5" strokeWidth={2.25} />
                </span>
              </span>
            </button>
          ) : (
            <button type="button" onClick={onOpen} disabled={!onOpen} aria-label={`View ${r.name}`} className="block size-14 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
              <img
                src={r.poster ?? r.url}
                alt={r.name}
                className="animate-in fade-in-0 zoom-in-95 size-14 rounded-xl object-cover ring-1 ring-foreground/10 duration-300"
              />
              {r.media === "video" && (
                <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] font-medium text-white tabular-nums">
                  <HugeiconsIcon icon={PlayIcon} className="size-2.5" />
                  {r.duration ? `${Math.round(r.duration)}s` : ""}
                </span>
              )}
            </button>
          )}
          <Button
            variant="secondary"
            size="icon-xs"
            onClick={onRemove}
            aria-label={`Remove ${r.name}`}
            className={cn("absolute -right-1.5 -top-1.5 size-5 rounded-full shadow-sm ring-1 ring-foreground/10 transition-opacity focus-visible:opacity-100", r.failed ? "opacity-100" : "opacity-0 group-hover/thumb:opacity-100")}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>{r.loading ? "Uploading…" : r.failed ? "Couldn’t upload. Click to retry." : r.name}</TooltipContent>
    </Tooltip>
  )
}

/** The references in a prompt box, in the shared viewer. */
export function ReferenceViewer({ refs, index, onIndex, onClose }: { refs: Reference[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const ready = refs.filter((r) => !r.loading && !r.failed)
  const items: ViewerItem[] = ready.map((r) => ({
    id: r.id,
    ...(r.media === "video" ? { kind: "video" as const, src: r.url, poster: r.poster } : { kind: "image" as const, src: r.url }),
    name: r.name,
    details: [
      ["Type", r.media === "video" ? `Video${r.duration ? ` · ${r.duration.toFixed(1)}s` : ""}` : "Photo"],
      ["Format", (r.name.split(".").pop() ?? "png").toUpperCase().replace("JPEG", "JPG")],
    ],
  }))
  return <MediaViewer items={items} index={index} onIndex={onIndex} onClose={onClose} />
}
