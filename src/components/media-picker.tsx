import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CloudUploadIcon, PauseIcon, PlayIcon, Scissor01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui-extra/toaster"
import { GENERATED_VIDEOS, SAMPLE_UPLOADS, SAMPLE_VIDEO_COUNT } from "@/components/editor/elements"
import { SAMPLE_ASSETS } from "@/components/assets-page"
import { isLive, library, type LibraryItem } from "@/ai/client"
import { MAX_REF_SECONDS, MAX_VIDEO_MB, clock, cutClip, length, isVideoFile, probeVideo, sessionUploads, stillsAt, useSessionUploads, type MediaItem, type PickedMedia } from "@/lib/media"
import { cn } from "@/lib/utils"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]
/** previews and option images aren't final work: left out of Generated */
const DRAFT = /preview|idea|option|draft|look/i

/** The server library as picker items: uploads, and final generated work with its prompt and references. */
const fromLibrary = (x: LibraryItem): MediaItem | null => {
  if (!x.file) return null
  const upload = x.purpose === "upload" || x.model === "upload"
  if (!upload && DRAFT.test(x.purpose ?? "")) return null
  const kind = x.kind === "video" || (x.type ?? "").startsWith("video/") ? "video" : "image"
  return {
    id: x.id,
    kind,
    name: upload ? x.prompt || "Upload" : [x.project, x.variation, x.purpose].filter(Boolean).join(" · ") || (kind === "video" ? "Video" : "Image"),
    url: x.file,
    source: upload ? "upload" : "generated",
    project: x.project,
    prompt: upload ? undefined : x.prompt,
    refs: upload ? undefined : x.refs,
    created: x.created,
  }
}

/** Without the AI server: the sample uploads and sample videos (with what each was made from). */
const SAMPLES: MediaItem[] = [
  ...SAMPLE_UPLOADS.map((u, i) => ({ id: `s-${u.id}`, kind: "image" as const, name: u.name, url: u.src, source: "upload" as const, project: "Samples", created: Date.now() - (i + 2) * 3_600_000 })),
  ...Array.from({ length: SAMPLE_VIDEO_COUNT }, (_, v) => {
    const a = SAMPLE_ASSETS.find((x) => x.video === v)
    const g = GENERATED_VIDEOS[v]
    return { id: `s-v${v}`, kind: "video" as const, name: `${g.name}.mp4`, url: g.mp4, poster: g.poster, source: "generated" as const, project: "Samples", prompt: a?.prompt, refs: a?.refs.map((r) => r.poster ?? r.src), created: a?.createdAt ?? Date.now() - v * 60_000, duration: a?.duration }
  }),
]

/**
 * Adds photos and videos to a prompt box: the picker (uploads and generated work, with search and
 * filters), plus drops and pastes. Videos over 15 seconds are trimmed first; the clip is used here only.
 */
export function useMediaAdd(onAdd: (items: PickedMedia[]) => void, opts: { project?: string } = {}) {
  const [open, setOpen] = useState(false)
  const [trimming, setTrimming] = useState<MediaItem[]>([])
  const done = useRef<PickedMedia[]>([])
  const toast = useToast()

  /** new files: checked, kept as this session's uploads, then added (long videos trimmed first) */
  const intake = async (files: Iterable<File> | ArrayLike<File>, direct = true): Promise<MediaItem[]> => {
    const list = Array.from(files)
    const bad = list.filter((f) => ![...IMAGE_TYPES, ...VIDEO_TYPES].includes(f.type))
    const big = list.filter((f) => (isVideoFile(f) ? f.size > MAX_VIDEO_MB * 1_048_576 : f.size > 20 * 1_048_576))
    if (bad.length) toast({ kind: "error", title: bad.length === 1 ? `${bad[0].name} can’t be added` : `${bad.length} files can’t be added`, description: "Use JPG, PNG, WebP or GIF photos, or MP4, MOV or WebM videos." })
    if (big.length) toast({ kind: "error", title: big.length === 1 ? `${big[0].name} is too large` : `${big.length} files are too large`, description: `Photos up to 20 MB, videos up to ${MAX_VIDEO_MB} MB.` })
    const ok = list.filter((f) => !bad.includes(f) && !big.includes(f))
    const items: MediaItem[] = []
    for (const f of ok) {
      const url = URL.createObjectURL(f)
      const it: MediaItem = { id: crypto.randomUUID(), kind: isVideoFile(f) ? "video" : "image", name: f.name, url, source: "upload", project: opts.project, created: Date.now(), file: f }
      if (it.kind === "video") {
        try {
          it.duration = (await probeVideo(url)).duration
          it.poster = URL.createObjectURL((await stillsAt(url, [Math.min(0.5, it.duration / 2)], 480))[0])
        } catch {
          toast({ kind: "error", title: `${f.name} can’t be read`, description: "Try an MP4 or MOV file." })
          continue
        }
      }
      items.push(it)
    }
    if (items.length) sessionUploads.add(items)
    if (direct) choose(items)
    return items
  }

  /** chosen items: short ones go straight in; long videos open the trimmer one by one */
  const choose = (items: MediaItem[]) => {
    const long = items.filter((i) => i.kind === "video" && (i.duration ?? 0) > MAX_REF_SECONDS + 0.05)
    const ready = items.filter((i) => !long.includes(i))
    if (!long.length) return ready.length && onAdd(ready)
    done.current = ready
    setTrimming(long)
  }
  const trimmed = (clip: PickedMedia | null) => {
    if (clip) done.current.push(clip)
    const rest = trimming.slice(1)
    setTrimming(rest)
    if (!rest.length && done.current.length) (onAdd(done.current), (done.current = []))
  }

  const ui = (
    <>
      <MediaPicker open={open} onOpenChange={setOpen} project={opts.project} onUpload={(f) => intake(f, false)} onAdd={(items) => (setOpen(false), choose(items))} />
      <VideoTrimmer item={trimming[0] ?? null} onDone={trimmed} />
    </>
  )
  return { openPicker: () => setOpen(true), addFiles: (f: Iterable<File> | ArrayLike<File>) => void intake(f), ui }
}

type Tab = "all" | "image" | "video" | "generated" | "upload"

/** The media picker: everything uploaded or made, to pick references from. */
export function MediaPicker({
  open,
  onOpenChange,
  onAdd,
  onUpload,
  project,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (items: MediaItem[]) => void
  /** new files from the Upload tile or a drop; resolves to the items they became */
  onUpload: (files: File[]) => Promise<MediaItem[]>
  /** the project this prompt box belongs to, for the "This project" filter */
  project?: string
}) {
  const session = useSessionUploads()
  const [server, setServer] = useState<MediaItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<Tab>("all")
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [over, setOver] = useState(false)
  const [durations, setDurations] = useState<Record<string, number>>({})
  const [showing, setShowing] = useState<MediaItem | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const live = isLive()

  useEffect(() => {
    if (!open) return
    setPicked([])
    if (!live) return setServer([])
    setServer(null)
    setFailed(false)
    library()
      .then((list) => setServer(list.map(fromLibrary).filter((x): x is MediaItem => !!x)))
      .catch(() => (setFailed(true), setServer([])))
  }, [open, live])

  const all = useMemo(() => {
    const seen = new Set<string>()
    const list = [...session, ...(server ?? []), ...(live ? [] : SAMPLES)].filter((x) => !seen.has(x.url) && seen.add(x.url))
    return list.map((x) => (durations[x.id] && !x.duration ? { ...x, duration: durations[x.id] } : x))
  }, [session, server, live, durations])
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = all
    .filter((x) => tab === "all" || x.kind === tab || x.source === tab)
    .filter((x) => words.every((w) => `${x.name} ${x.prompt ?? ""} ${x.project ?? ""}`.toLowerCase().includes(w)))
    .sort((a, b) => b.created - a.created)
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const upload = async (files: FileList | File[]) => {
    const items = await onUpload([...files])
    setPicked((p) => [...p, ...items.map((i) => i.id)])
  }
  const loading = server === null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(720px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onDragOver={(e) => e.dataTransfer.types.includes("Files") && (e.preventDefault(), setOver(true))}
        onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
        onDrop={(e) => (e.preventDefault(), setOver(false), upload(e.dataTransfer.files))}
      >
        <DialogHeader className="gap-3 border-b px-5 pb-4 pt-5">
          <DialogTitle>Add photos and videos</DialogTitle>
          <DialogDescription className="sr-only">Pick from your uploads and generated work, or upload new files. Videos over {MAX_REF_SECONDS} seconds are trimmed first.</DialogDescription>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:max-w-72">
              <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, prompts, projects" aria-label="Search media" className="pl-8" />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="image">Images</TabsTrigger>
                <TabsTrigger value="video">Videos</TabsTrigger>
                <TabsTrigger value="generated">Generated</TabsTrigger>
                <TabsTrigger value="upload">Uploaded</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{loading ? "Loading…" : `${shown.length} item${shown.length === 1 ? "" : "s"}`}</span>
          </div>
        </DialogHeader>

        <div className={cn("relative min-h-0 flex-1 overflow-y-auto p-4", over && "bg-primary/5")}>
          <input ref={file} type="file" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")} multiple hidden onChange={(e) => (e.target.files && upload(e.target.files), (e.target.value = ""))} />
          {failed && <p className="mb-3 text-xs text-destructive">Couldn’t load your library. Uploads from this session still show.</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            <button
              type="button"
              onClick={() => file.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/20 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <HugeiconsIcon icon={CloudUploadIcon} className="size-5" />
              Upload file
              <span className="px-3 text-center text-xs">Photos, or videos up to {MAX_VIDEO_MB} MB</span>
            </button>
            {loading
              ? Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)
              : shown.map((x) => (
                  <Tile key={x.id} x={x} on={picked.includes(x.id)} onToggle={() => toggle(x.id)} onInfo={() => setShowing(x)} onDuration={(d) => setDurations((m) => (m[x.id] ? m : { ...m, [x.id]: d }))} />
                ))}
          </div>
          {!loading && !shown.length && <p className="py-10 text-center text-sm text-muted-foreground">{all.length ? "Nothing matches. Try other filters." : "Nothing here yet. Upload photos or videos to start."}</p>}
          {over && <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-xl border-2 border-dashed border-primary text-sm font-medium text-primary">Drop to upload</div>}
        </div>

        <DialogFooter className="items-center border-t px-5 py-3 sm:justify-between">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {picked.length ? (
              <>
                <span className="tabular-nums">{picked.length} selected</span>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setPicked([])}>
                  Clear
                </Button>
              </>
            ) : (
              `Videos over ${MAX_REF_SECONDS} s are trimmed when added`
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!picked.length} onClick={() => onAdd(picked.map((id) => all.find((x) => x.id === id)).filter((x): x is MediaItem => !!x))}>
              Add{picked.length > 1 ? ` ${picked.length}` : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <MadeFrom item={showing} onClose={() => setShowing(null)} />
    </Dialog>
  )
}

/** One item: thumbnail, a check when picked, a video's length; generated work opens what it was made from. */
function Tile({ x, on, onToggle, onInfo, onDuration }: { x: MediaItem; on: boolean; onToggle: () => void; onInfo: () => void; onDuration: (s: number) => void }) {
  const long = x.kind === "video" && (x.duration ?? 0) > MAX_REF_SECONDS + 0.05
  return (
    <div className="group/tile relative">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        aria-label={`${on ? "Unselect" : "Select"} ${x.name}`}
        className={cn("relative block aspect-square w-full overflow-hidden rounded-xl bg-muted outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring", on && "ring-2 ring-primary")}
      >
        {x.kind === "video" && !x.poster ? (
          <video src={x.url} muted preload="metadata" crossOrigin="anonymous" onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)} className="size-full object-cover" />
        ) : (
          <img src={x.poster ?? x.url} alt="" loading="lazy" className="size-full object-cover" />
        )}
        {x.kind === "video" && x.poster && x.duration === undefined && <video src={x.url} muted preload="metadata" crossOrigin="anonymous" onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)} className="hidden" />}
        {x.kind === "video" && (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums backdrop-blur-sm">
            <HugeiconsIcon icon={long ? Scissor01Icon : PlayIcon} className="size-3" />
            {x.duration !== undefined ? length(x.duration) : "Video"}
          </span>
        )}
        <span className={cn("absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full border-2 border-white/90 shadow-sm transition-opacity", on ? "bg-primary text-primary-foreground opacity-100" : "bg-black/20 opacity-0 group-hover/tile:opacity-100")}>
          {on && <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} />}
        </span>
      </button>
      <div className="mt-1 flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={x.name}>
          {x.name}
        </span>
        {x.source === "generated" && (x.prompt || x.refs?.length) && (
          <Button variant="link" size="sm" className="h-auto shrink-0 p-0 text-xs" onClick={onInfo}>
            Prompt
          </Button>
        )}
      </div>
    </div>
  )
}

/** Generated work: the final prompt and references it was made from. */
function MadeFrom({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{item?.name}</DialogTitle>
          <DialogDescription>The final prompt and references it was made from.</DialogDescription>
        </DialogHeader>
        {item && (
          <div className="grid gap-4">
            {item.kind === "video" ? <video src={item.url} poster={item.poster} controls muted className="max-h-64 w-full rounded-xl bg-black object-contain" /> : <img src={item.url} alt="" className="max-h-64 w-full rounded-xl object-contain" />}
            {item.prompt && <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.prompt}</p>}
            {!!item.refs?.length && (
              <div className="flex flex-wrap gap-2">
                {item.refs.map((r) => (
                  <img key={r} src={r} alt="Reference" className="size-14 rounded-lg object-cover ring-1 ring-foreground/10" />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Trims a long video to at most 15 seconds: a player that loops the chosen part, a filmstrip with a
 * window you drag or resize, and the start, end and length. The clip is made in the browser.
 */
export function VideoTrimmer({ item, onDone }: { item: MediaItem | null; onDone: (clip: PickedMedia | null) => void }) {
  const [dur, setDur] = useState(0)
  const [range, setRange] = useState<[number, number]>([0, MAX_REF_SECONDS])
  const [strip, setStrip] = useState<string[]>([])
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState("")
  const video = useRef<HTMLVideoElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ what: "start" | "end" | "move"; x: number; r: [number, number] } | null>(null)

  useEffect(() => {
    if (!item) return
    setStrip([])
    setError("")
    setPlaying(false)
    let gone = false
    probeVideo(item.url)
      .then(async ({ duration }) => {
        if (gone) return
        setDur(duration)
        setRange([0, Math.min(duration, MAX_REF_SECONDS)])
        const n = 12
        const stills = await stillsAt(item.url, Array.from({ length: n }, (_, i) => ((i + 0.5) * duration) / n), 160)
        if (!gone) setStrip(stills.map((b) => URL.createObjectURL(b)))
      })
      .catch(() => setError("This video can’t be read. Try an MP4 or MOV file."))
    return () => void (gone = true)
  }, [item])

  // the player loops the chosen part
  useEffect(() => {
    const v = video.current
    if (!v) return
    const loop = () => {
      if (v.currentTime >= range[1] || v.currentTime < range[0] - 0.2) v.currentTime = range[0]
    }
    v.addEventListener("timeupdate", loop)
    return () => v.removeEventListener("timeupdate", loop)
  }, [range])

  const len = range[1] - range[0]
  const pct = (t: number) => (dur ? (t / dur) * 100 : 0)
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !track.current || !dur) return
    const dt = ((e.clientX - d.x) / track.current.clientWidth) * dur
    let [s, en] = d.r
    if (d.what === "move") {
      const l = en - s
      s = Math.min(Math.max(0, s + dt), dur - l)
      en = s + l
    } else if (d.what === "start") s = Math.min(Math.max(0, en - MAX_REF_SECONDS, s + dt), en - 1)
    else en = Math.max(Math.min(dur, s + MAX_REF_SECONDS, en + dt), s + 1)
    setRange([s, en])
    if (video.current) video.current.currentTime = d.what === "end" ? en - 0.05 : s
  }
  const grab = (what: "start" | "end" | "move") => (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { what, x: e.clientX, r: range }
  }
  const nudge = (which: 0 | 1) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 1 : 0.1
    const d = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0
    if (!d) return
    e.preventDefault()
    setRange(([s, en]) => (which === 0 ? [Math.min(Math.max(0, en - MAX_REF_SECONDS, s + d), en - 1), en] : [s, Math.max(Math.min(dur, s + MAX_REF_SECONDS, en + d), s + 1)]))
  }
  const toggle = () => {
    const v = video.current
    if (!v) return
    if (v.paused) {
      if (v.currentTime < range[0] || v.currentTime >= range[1]) v.currentTime = range[0]
      v.play()
      setPlaying(true)
    } else (v.pause(), setPlaying(false))
  }
  /** adds the clip straight away; it's cut in the background and shows as uploading till it's ready */
  const use = async () => {
    if (!item) return
    video.current?.pause()
    setPlaying(false)
    const [start, end] = range
    const poster = await stillsAt(item.url, [start + 0.05], 480)
      .then((b) => URL.createObjectURL(b[0]))
      .catch(() => item.poster)
    const clip = cutClip(item.url, item.name, start, end)
    onDone({ ...item, id: crypto.randomUUID(), name: item.name.replace(/\.[^.]+$/, "") + "-clip", duration: end - start, trim: { start, end }, poster, file: undefined, clip })
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onDone(null)}>
      <DialogContent className="sm:max-w-2xl" >
        <DialogHeader>
          <DialogTitle>Trim your video</DialogTitle>
          <DialogDescription>
            Pick up to {MAX_REF_SECONDS} seconds to use as a reference. {item?.duration ? `This one is ${length(item.duration)}.` : ""}
          </DialogDescription>
        </DialogHeader>
        {item && (
          <div className="grid gap-4">
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video ref={video} src={item.url} poster={item.poster} muted playsInline crossOrigin="anonymous" className="mx-auto max-h-80 w-full object-contain" onEnded={() => setPlaying(false)} />
              <Button variant="secondary" size="icon-sm" onClick={toggle} aria-label={playing ? "Pause" : "Play the selection"} className="absolute bottom-3 left-3 rounded-full">
                <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} className="size-4" />
              </Button>
            </div>
            <div ref={track} className="relative h-14 touch-none select-none overflow-hidden rounded-lg bg-muted" onPointerMove={onMove} onPointerUp={() => (drag.current = null)}>
              <div className="flex h-full">{strip.length ? strip.map((s, i) => <img key={i} src={s} alt="" className="h-full min-w-0 flex-1 object-cover" />) : <Skeleton className="size-full rounded-none" />}</div>
              <div className="absolute inset-y-0 left-0 bg-background/70" style={{ width: `${pct(range[0])}%` }} />
              <div className="absolute inset-y-0 right-0 bg-background/70" style={{ width: `${100 - pct(range[1])}%` }} />
              <div className="absolute inset-y-0 cursor-grab rounded-md border-2 border-primary active:cursor-grabbing" style={{ left: `${pct(range[0])}%`, width: `${pct(len)}%` }} onPointerDown={grab("move")} aria-hidden>
                <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-md bg-primary px-1.5 text-[11px] font-medium text-primary-foreground tabular-nums">{len.toFixed(1)}s</span>
              </div>
              {(["start", "end"] as const).map((w, i) => (
                <div
                  key={w}
                  role="slider"
                  tabIndex={0}
                  aria-label={w === "start" ? "Clip start" : "Clip end"}
                  aria-valuemin={0}
                  aria-valuemax={Math.round(dur * 10) / 10}
                  aria-valuenow={Math.round(range[i] * 10) / 10}
                  aria-valuetext={clock(range[i])}
                  onPointerDown={grab(w)}
                  onKeyDown={nudge(i as 0 | 1)}
                  className="absolute inset-y-0 z-10 w-3 -translate-x-1/2 cursor-ew-resize rounded-sm bg-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ left: `${pct(range[i])}%` }}
                >
                  <span className="absolute left-1/2 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-primary-foreground/80" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm tabular-nums">
              <span>
                <span className="text-muted-foreground">Start </span>
                {clock(range[0])}
              </span>
              <span>
                <span className="text-muted-foreground">End </span>
                {clock(range[1])}
              </span>
              <span>
                <span className="text-muted-foreground">Length </span>
                {len.toFixed(1)}s of {MAX_REF_SECONDS}s
              </span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onDone(null)}>
            Skip this video
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled={!dur || !!error} onClick={use}>
                <HugeiconsIcon icon={Scissor01Icon} className="size-4" />
                Use clip
              </Button>
            </TooltipTrigger>
            <TooltipContent>Uses this part here; your upload stays as it is</TooltipContent>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
