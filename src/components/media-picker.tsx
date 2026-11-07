import { EmptyState } from "@/components/empty-state"
import { useEffect, useMemo, useRef, useState } from "react"
import { MediaTile, TileBadge } from "@/components/media-tile"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowExpand01Icon, CloudUploadIcon, PauseIcon, PlayIcon, Scissor01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui-extra/toaster"
import { MediaViewer, type ViewerItem } from "@/components/media-viewer"
import { isLive, library, NOT_CONNECTED, shareAs, shareable, type LibraryItem } from "@/ai/client"
import { isFinalImage, isFinalVideo, isUpload, isVideo, nameOf } from "@/lib/library"

/** a video's length and a still from its start (left as it is if it can't be read in time) */
const withStill = (i: MediaItem): Promise<MediaItem> =>
  Promise.race([
    (async () => {
      const { duration } = await probeVideo(i.url)
      const poster = i.poster ?? URL.createObjectURL((await stillsAt(i.url, [Math.min(0.1, duration / 2)], 480))[0])
      return { ...i, duration: i.duration ?? duration, poster }
    })(),
    new Promise<MediaItem>((ok) => setTimeout(() => ok(i), 6000)),
  ]).catch(() => i)

/**
 * A short video, saved as it is when it's small enough for the server (up to 20 MB); a bigger one
 * (4K phone video) is saved as a 1280 px copy made in the browser, under the same name.
 */
const saveVideo = (it: MediaItem) => {
  if (!it.file || it.file.size <= 20 * 1_048_576) return save(it.id, it.url, it.name, it.project)
  const job = cutClip(it.url, it.name, 0, it.duration ?? MAX_REF_SECONDS)
    .then((f) => shareable(blobUrl(f), { name: it.name, purpose: "upload", project: it.project }))
  shareAs(it.url, job)
    .then((saved) => sessionUploads.update(it.id, { saved }))
    .catch(() => {})
}

/** keeps a session upload on the AI server; the picker then knows its server copy */
const save = (id: string, url: string, name: string, project?: string) =>
  shareable(url, { name, purpose: "upload", project })
    .then((saved) => sessionUploads.update(id, { saved }))
    .catch(() => {})
import { MAX_REF_SECONDS, MAX_VIDEO_MB, blobUrl, clock, cutClip, length, isVideoFile, probeVideo, sessionUploads, stillsAt, useSessionUploads, type MediaItem, type PickedMedia } from "@/lib/media"
import { cn } from "@/lib/utils"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]
/** The server library as picker items: the user's uploads, and final generated work with its prompt and references. */
const fromLibrary = (x: LibraryItem): MediaItem | null => {
  if (!x.file) return null
  const upload = isUpload(x)
  if (!upload && !isFinalVideo(x) && !isFinalImage(x)) return null
  return {
    id: x.id,
    kind: isVideo(x) ? "video" : "image",
    name: nameOf(x),
    url: x.file,
    source: upload ? "upload" : "generated",
    project: x.project,
    prompt: upload ? undefined : x.prompt,
    refs: upload ? undefined : x.refs,
    created: x.created,
  }
}

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
      const url = blobUrl(f)
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
    // saved on the AI server right away: photos, and videos short enough to use as they are
    // (long originals aren't; their trimmed clips are, once cut)
    if (isLive())
      for (const it of items) {
        if (it.kind === "image") save(it.id, it.url, it.name, it.project)
        else if ((it.duration ?? Infinity) <= MAX_REF_SECONDS + 0.05) saveVideo(it)
      }
    if (direct) choose(items)
    return items
  }

  /** chosen items: short ones go straight in; long videos open the trimmer one by one */
  const choose = async (picked: MediaItem[]) => {
    // videos from the library come without a length or a still: read both first (a second or so),
    // so long ones are trimmed and every thumbnail has a picture
    const items = await Promise.all(picked.map((i) => (i.kind === "video" && (i.duration === undefined || !i.poster) ? withStill(i) : i)))
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

type Type = "all" | "image" | "video"
type Source = "all" | "generated" | "upload"

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
  const [type, setType] = useState<Type>("all")
  const [source, setSource] = useState<Source>("all")
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [over, setOver] = useState(false)
  const [durations, setDurations] = useState<Record<string, number>>({})
  const [viewing, setViewing] = useState<number | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const live = isLive()

  useEffect(() => {
    if (!open) return
    setPicked([])
    if (!live) return (setServer([]), setFailed(true))
    setServer(null)
    setFailed(false)
    library()
      .then((list) => setServer(list.map(fromLibrary).filter((x): x is MediaItem => !!x)))
      .catch(() => (setFailed(true), setServer([])))
  }, [open, live])

  const all = useMemo(() => {
    // a session upload already saved on the server shows once (as the session's copy)
    const seen = new Set<string>(session.flatMap((x) => (x.saved ? [x.saved] : [])))
    const list = [...session.filter((x) => !seen.has(x.url)), ...(server ?? [])].filter((x) => !seen.has(x.url) && seen.add(x.url))
    return list.map((x) => (durations[x.id] && !x.duration ? { ...x, duration: durations[x.id] } : x))
  }, [session, server, live, durations])
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = all
    .filter((x) => type === "all" || x.kind === type)
    .filter((x) => source === "all" || x.source === source)
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
            <Tabs value={type} onValueChange={(v) => setType(v as Type)}>
              <TabsList aria-label="Type">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="image">Images</TabsTrigger>
                <TabsTrigger value="video">Videos</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={source} onValueChange={(v) => setSource(v as Source)}>
              <TabsList aria-label="Source">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="generated">Generated</TabsTrigger>
                <TabsTrigger value="upload">Uploaded</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{loading ? "Loading…" : `${shown.length} item${shown.length === 1 ? "" : "s"}`}</span>
          </div>
        </DialogHeader>

        <div className={cn("relative min-h-0 flex-1 overflow-y-auto p-4", over && "bg-brand/10")}>
          <input ref={file} type="file" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")} multiple hidden onChange={(e) => (e.target.files && upload(e.target.files), (e.target.value = ""))} />
          {failed && <p className="mb-3 text-xs text-destructive">{NOT_CONNECTED} Uploads from this session still show.</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            <button
              type="button"
              onClick={() => file.current?.click()}
              className="group/up flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-foreground/20 bg-muted/30 px-3 text-center transition-colors hover:border-foreground/30 hover:bg-muted focus-ring"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-background text-foreground shadow-sm ring-1 ring-foreground/10 transition-transform group-hover/up:-translate-y-0.5">
                <HugeiconsIcon icon={CloudUploadIcon} className="size-5" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Upload</span>
                <span className="text-xs text-muted-foreground">Drop files or click · photos, videos up to {MAX_VIDEO_MB} MB</span>
              </span>
            </button>
            {loading
              ? Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)
              : shown.map((x) => (
                  <Tile key={x.id} x={x} on={picked.includes(x.id)} onToggle={() => toggle(x.id)} onOpen={() => setViewing(shown.indexOf(x))} onDuration={(d) => setDurations((m) => (m[x.id] ? m : { ...m, [x.id]: d }))} />
                ))}
          </div>
          {!loading && !shown.length && (
            <EmptyState
              art={all.length ? "search" : "media"}
              title={all.length ? "Nothing matches" : "Nothing here yet"}
              text={all.length ? "Try another search or filter." : "Upload photos or videos to start."}
              className="mt-3 border-0 py-8"
            />
          )}
          {over && <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-xl border-2 border-dashed border-brand text-sm font-medium text-brand">Drop to upload</div>}
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
            ) : null}
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
      <MediaViewer
        items={shown.map(toViewer)}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
        useLabel="Select"
        onUse={(v) => (setPicked((p) => (p.includes(v.id) ? p : [...p, v.id])), setViewing(null))}
      />
    </Dialog>
  )
}

/** For the full-screen viewer: the media, and for generated work its final prompt and references. */
const toViewer = (x: MediaItem): ViewerItem => ({
  id: x.id,
  kind: x.kind,
  src: x.url,
  poster: x.poster,
  name: x.name,
  prompt: x.prompt,
  refs: x.refs?.map((r, i) => ({ kind: "image" as const, src: r, name: `Reference ${i + 1}`, source: "Uploaded" as const })),
  details: [
    ["Source", x.source === "upload" ? "Uploaded" : "Generated"],
    ["Type", x.kind === "video" ? `Video${x.duration ? ` · ${length(x.duration)}` : ""}` : "Image"],
    ...(x.project ? [["Project", x.project] as [string, string]] : []),
    ["Added", new Date(x.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })],
  ],
})

/** One item: thumbnail, a check when picked, a video's length; generated work opens what it was made from. */
function Tile({ x, on, onToggle, onOpen, onDuration }: { x: MediaItem; on: boolean; onToggle: () => void; onOpen: () => void; onDuration: (s: number) => void }) {
  const long = x.kind === "video" && (x.duration ?? 0) > MAX_REF_SECONDS + 0.05
  const probe = (e: React.SyntheticEvent<HTMLVideoElement>) => onDuration(e.currentTarget.duration)
  return (
    <MediaTile
      src={x.kind === "video" && !x.poster ? undefined : (x.poster ?? x.url)}
      video={x.kind === "video" ? { mp4: x.url } : undefined}
      selected={on}
      badges={
        x.kind === "video" && (
          <TileBadge>
            <HugeiconsIcon icon={long ? Scissor01Icon : PlayIcon} className="size-3" />
            {long && <span className="sr-only">Trimmed to {MAX_REF_SECONDS} seconds when added,</span>}
            {x.duration !== undefined ? length(x.duration) : "Video"}
          </TileBadge>
        )
      }
      actions={
        <>
          {/* full screen, left of the select mark */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon-xs" onClick={onOpen} aria-label={`View ${x.name} full screen`} className="size-6 bg-black/50 text-white opacity-0 shadow-sm backdrop-blur-sm hover:bg-black/70 focus-visible:opacity-100 group-hover/tile:opacity-100">
                <HugeiconsIcon icon={ArrowExpand01Icon} className="size-3" strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Full screen</TooltipContent>
          </Tooltip>
          {/* the select mark: the same size as the button beside it, and a click on it selects */}
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={on}
            aria-label={`${on ? "Unselect" : "Select"} ${x.name}`}
            className={cn("grid size-6 place-items-center rounded-full border-2 border-white/90 shadow-sm transition-opacity focus-visible:opacity-100 focus-ring", on ? "bg-brand text-brand-foreground opacity-100" : "bg-black/30 opacity-0 hover:bg-black/50 group-hover/tile:opacity-100")}
          >
            {on && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={3} />}
          </button>
        </>
      }
    >
      {/* a calm placeholder until the picture or video frame arrives */}
      {x.kind === "video" && !x.poster && <span aria-hidden className="shimmer absolute inset-0" />}
      {x.kind === "video" && !x.poster && <video src={`${x.url}#t=0.1`} muted playsInline preload="metadata" crossOrigin="anonymous" onLoadedMetadata={probe} className="absolute inset-0 size-full object-cover" />}
      {x.kind === "video" && x.poster && x.duration === undefined && <video src={`${x.url}#t=0.1`} muted playsInline preload="metadata" crossOrigin="anonymous" onLoadedMetadata={probe} className="hidden" />}
      <button type="button" tabIndex={-1} onClick={onToggle} aria-hidden className="absolute inset-0 rounded-xl outline-none" />
    </MediaTile>
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
  const [at, setAt] = useState(0)
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
    // the clip is saved on the AI server once it's cut (the original video isn't)
    if (isLive()) clip.then((f) => shareable(blobUrl(f), { name: f.name, purpose: "upload" })).catch(() => {})
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
              <video ref={video} src={item.url} poster={item.poster} muted playsInline crossOrigin="anonymous" className="mx-auto max-h-80 w-full object-contain" onEnded={() => setPlaying(false)} onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)} />
              <Button variant="secondary" size="icon" onClick={toggle} aria-label={playing ? "Pause" : "Play the selection"} className="absolute bottom-3 left-3 bg-background/90 shadow-md backdrop-blur-sm">
                <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} className="size-4" />
              </Button>
            </div>
            <div ref={track} className="relative h-14 touch-none select-none overflow-hidden rounded-lg bg-muted" onPointerMove={onMove} onPointerUp={() => (drag.current = null)}>
              <div className="flex h-full">{strip.length ? strip.map((s, i) => <img loading="lazy" decoding="async" key={i} src={s} alt="" className="h-full min-w-0 flex-1 object-cover" />) : <Skeleton className="size-full rounded-none" />}</div>
              <div className="absolute inset-y-0 left-0 bg-background/70" style={{ width: `${pct(range[0])}%` }} />
              <div className="absolute inset-y-0 right-0 bg-background/70" style={{ width: `${100 - pct(range[1])}%` }} />
              <div className="absolute inset-y-0 cursor-grab rounded-md border-2 border-brand transition-[left,width] duration-75 active:cursor-grabbing" style={{ left: `${pct(range[0])}%`, width: `${pct(len)}%` }} onPointerDown={grab("move")} aria-hidden>
                <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-md bg-brand px-1.5 text-xs font-medium text-brand-foreground tabular-nums">{len.toFixed(1)}s</span>
              </div>
              {/* where the preview is, while it plays */}
              {playing && <span aria-hidden className="pointer-events-none absolute inset-y-1 z-10 w-0.5 -translate-x-1/2 rounded-full bg-white shadow-sm" style={{ left: `${pct(Math.min(Math.max(at, range[0]), range[1]))}%` }} />}
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
                  className="absolute inset-y-0 z-10 w-3 -translate-x-1/2 cursor-ew-resize rounded-sm bg-brand focus-ring"
                  style={{ left: `${pct(range[i])}%` }}
                >
                  <span className="absolute left-1/2 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-brand-foreground/80" />
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
