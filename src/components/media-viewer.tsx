import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon, Copy01Icon, Delete02Icon, Download01Icon, SparklesIcon, Tick02Icon, Video01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui-extra/toaster"
import { cn } from "@/lib/utils"
import { VideoPlayer } from "@/components/video-player"

/** A picture or a video, as shown in the viewer. */
export type ViewerMedia = { kind: "video" | "image"; src: string; webm?: string; poster?: string; name: string }
/** What something was made from: an upload, or a generated video (the reference video). */
export type ViewerRef = ViewerMedia & { source: "Uploaded" | "Generated" }
export type ViewerItem = ViewerMedia & {
  id: string
  prompt?: string
  refs?: ViewerRef[]
  /** label / value rows, in order (Type, Size, Created…) */
  details: [string, string][]
  /** shareable link copied for videos (browsers can't put video files on the clipboard) */
  link?: string
}

const formatOf = (m: ViewerMedia) => {
  const ext = m.name.split(".").pop()?.toUpperCase()
  return ext && ext.length <= 4 && ext !== m.name.toUpperCase() ? (ext === "JPEG" ? "JPG" : ext) : m.kind === "video" ? "MP4" : "PNG"
}

/** Saves a file under a given name. */
export function download(src: string, name: string) {
  const a = document.createElement("a")
  a.href = src
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * The full-screen viewer used everywhere media opens (Assets, the slides strip, uploads, prompt references).
 * Always dark, in either theme: the media on the left, details on the right. A reference opens in place,
 * with Back to return. Long prompts are clamped with See more.
 */
export function MediaViewer({
  items,
  index,
  onIndex,
  onClose,
  onDelete,
  onUse,
  useLabel,
}: {
  /** the primary action, e.g. Use in Flicks (Download moves to an icon) */
  onUse?: (item: ViewerItem) => void
  useLabel?: string
  items: ViewerItem[]
  /** which one is open; null closes */
  index: number | null
  onIndex?: (i: number) => void
  onClose: () => void
  onDelete?: (item: ViewerItem) => void
}) {
  const item = index === null ? undefined : items[index]
  const [ref, setRef] = useState<ViewerRef | null>(null)
  useEffect(() => setRef(null), [item?.id])
  const shown: ViewerMedia | undefined = ref ?? item
  const canStep = !ref && !!onIndex && items.length > 1 && index !== null
  const step = (d: 1 | -1) => canStep && onIndex!((index! + d + items.length) % items.length)

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return
      if (e.key === "ArrowRight") step(1)
      if (e.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-keep-selection
        onOpenAutoFocus={(e) => e.preventDefault()}
        // Esc steps back out of a reference before closing
        onEscapeKeyDown={(e) => ref && (e.preventDefault(), setRef(null))}
        className="dark fixed inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-3 rounded-none bg-black/90 p-3 text-foreground shadow-none ring-0 backdrop-blur-sm sm:max-w-none"
      >
        <DialogTitle className="sr-only">{shown?.name}</DialogTitle>
        <DialogDescription className="sr-only">Full-screen view with details</DialogDescription>

        {/* media */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center p-12">
          {shown && <Media key={shown.src} m={shown} />}
          {ref && (
            <Button variant="outline" onClick={() => setRef(null)} className="absolute left-3 top-3 gap-1.5 rounded-full border-white/15 bg-background/60 backdrop-blur-md">
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              Back
            </Button>
          )}
          {canStep && (
            <>
              <Step side="left" onClick={() => step(-1)} />
              <Step side="right" onClick={() => step(1)} />
            </>
          )}
        </div>

        {/* details */}
        {item && (
          <aside aria-label="Details" className="flex w-[360px] shrink-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between pl-2">
              <p className="truncate text-sm font-medium">{ref ? ref.name : item.kind === "video" ? "Video" : "Image"}</p>
              <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose} className="rounded-full">
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {!ref && (item.prompt || item.refs?.length) ? (
                <Block title="Prompt" action={item.prompt ? <CopyText text={item.prompt} /> : undefined}>
                  {!!item.refs?.length && (
                    <ul className="flex flex-wrap gap-2">
                      {item.refs.map((r) => (
                        <li key={r.src + r.name}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setRef(r)}
                                aria-label={`View ${r.name}`}
                                className={cn("relative block size-16 overflow-hidden rounded-lg outline-none ring-1 ring-foreground/15 transition hover:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring", r.kind === "image" && "bg-white")}
                              >
                                <img src={r.kind === "video" ? r.poster : r.src} alt="" className={cn("size-full", r.kind === "video" ? "object-cover" : "object-contain p-1")} />
                                {r.kind === "video" && (
                                  <span className="absolute bottom-1 left-1 grid size-4 place-items-center rounded bg-black/60 text-white">
                                    <HugeiconsIcon icon={Video01Icon} className="size-2.5" />
                                  </span>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{r.name}</TooltipContent>
                          </Tooltip>
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.prompt && <Clamped text={item.prompt} />}
                </Block>
              ) : null}

              <Block title="Details">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                  {(ref ? ([["Source", ref.source], ["Type", ref.kind === "video" ? "Video" : "Image"], ["Format", formatOf(ref)]] as [string, string][]) : item.details).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="truncate text-right tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Block>
            </div>

            {shown && <Actions m={shown} link={ref ? undefined : item.link} onDelete={!ref && onDelete ? () => onDelete(item) : undefined} onUse={!ref && onUse ? () => onUse(item) : undefined} useLabel={useLabel} />}
          </aside>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Media({ m }: { m: ViewerMedia }) {
  return m.kind === "video" ? (
    <VideoPlayer src={m.src} webm={m.webm} poster={m.poster} />
  ) : (
    <img src={m.src} alt={m.name} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
  )
}

function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-muted/50 p-3">
      <div className="flex h-7 items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Up to six lines; See more opens the rest in a scroll area (no visible scrollbar). */
function Clamped({ text }: { text: string }) {
  const box = useRef<HTMLParagraphElement>(null)
  const [long, setLong] = useState(false)
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => {
    const el = box.current
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1)
  }, [text, open])
  useEffect(() => setOpen(false), [text])
  return (
    <div className="flex flex-col items-start gap-1.5">
      <p
        ref={box}
        className={cn(
          "whitespace-pre-wrap break-words text-sm leading-6",
          open ? "max-h-64 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "line-clamp-6",
        )}
      >
        {text}
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {open ? "See less" : "See more"}
        </button>
      )}
    </div>
  )
}

function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => {
        navigator.clipboard?.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1400)
      }}
      className="gap-1 text-muted-foreground"
    >
      <HugeiconsIcon icon={done ? Tick02Icon : Copy01Icon} className="size-3.5" />
      {done ? "Copied" : "Copy"}
    </Button>
  )
}

/** An image as PNG on the clipboard (the format browsers accept). */
async function copyImage(src: string) {
  const img = new Image()
  img.crossOrigin = "anonymous"
  img.src = src
  await img.decode()
  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  c.getContext("2d")!.drawImage(img, 0, 0)
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/png"))
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
}

/** Download, copy (the image itself, or a link for videos) and delete. */
function Actions({ m, link, onDelete, onUse, useLabel = "Use" }: { m: ViewerMedia; link?: string; onDelete?: () => void; onUse?: () => void; useLabel?: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const isVideo = m.kind === "video"
  const copy = async () => {
    try {
      if (isVideo) await navigator.clipboard.writeText(link ?? m.src)
      else await copyImage(m.src)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      toast({ kind: "error", title: isVideo ? "Couldn’t copy the link" : "Couldn’t copy the image", description: "Your browser blocked the clipboard. Try Download instead." })
    }
  }
  const save = () => download(m.src, isVideo && !m.name.endsWith(".mp4") ? `${m.name}.mp4` : m.name)
  return (
    <div className="flex items-center gap-2">
      {onUse ? (
        <>
          <Button className="h-10 flex-1 gap-2" onClick={onUse}>
            <HugeiconsIcon icon={SparklesIcon} className="size-4" />
            {useLabel}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" className="size-10" aria-label="Download" onClick={save}>
                <HugeiconsIcon icon={Download01Icon} className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <Button className="h-10 flex-1 gap-2" onClick={save}>
          <HugeiconsIcon icon={Download01Icon} className="size-4" />
          Download
        </Button>
      )}
      {/* images can be copied; videos have Download (and Use in Flicks in Assets) */}
      {!isVideo && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" className="size-10" aria-label="Copy image" onClick={copy}>
            <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied" : "Copy image"}</TooltipContent>
      </Tooltip>
      )}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" className="size-10 hover:text-destructive" aria-label="Delete" onClick={onDelete}>
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function Step({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={side === "left" ? "Previous" : "Next"}
      onClick={onClick}
      className={cn("absolute inset-y-0 my-auto rounded-full border-white/15 bg-background/60 backdrop-blur-md", side === "left" ? "left-3" : "right-3")}
    >
      <HugeiconsIcon icon={side === "left" ? ArrowLeft01Icon : ArrowRight01Icon} className="size-4" />
    </Button>
  )
}
