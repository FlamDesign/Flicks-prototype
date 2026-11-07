import { EmptyState } from "@/components/empty-state"
import { PAGE, PageHeader } from "@/components/page-kit"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MediaTile } from "@/components/media-tile"
import { CardsSkeleton, Loading, PendingButton } from "@/components/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui-extra/toaster"
import { ALL_DATES, DateFilter, inDateFilter, type DateFilterValue } from "@/components/ui-extra/date-filter"
import { download, MediaViewer, type ViewerItem } from "@/components/media-viewer"
import { hideFromLibrary, isLive, NOT_CONNECTED, useAiConfig } from "@/ai/client"
import { isFinalVideo, isThumbnail, isUpload, isVideo, loadLibrary, nameOf, type LibraryRef } from "@/lib/library"
import { useDevState } from "@/dev/state"

/** What a video was made from: an uploaded image, or the reference video (for variations). */
export type AssetRef = LibraryRef
/** A video made for the user, or a photo or clip they uploaded, as kept on the server. */
export type Asset = {
  id: string
  kind: "video" | "image"
  name: string
  url: string
  prompt: string
  refs: AssetRef[]
  project?: string
  source: "Uploaded" | "Generated"
  createdAt: number
  type?: string
}
/** a video's size and length, once its metadata has loaded */
type VideoMeta = { size: string; duration: number }

const DAY = 86_400_000
const dayKey = (t: number) => new Date(t).toDateString()
/** Today, Yesterday, then the date (with the year only when it isn't this year). */
const dayLabel = (t: number) => {
  const d = new Date(t)
  const today = new Date()
  if (dayKey(t) === today.toDateString()) return "Today"
  if (dayKey(t) === new Date(Date.now() - DAY).toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }) })
}
const timeLabel = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
const fullLabel = (t: number) => `${new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${timeLabel(t)}`

const ext = (a: Asset) => (a.type?.split("/")[1] ?? (a.kind === "video" ? "mp4" : "png")).replace("jpeg", "jpg").replace("quicktime", "mov")
const fileName = (a: Asset) => (a.source === "Uploaded" && /\.\w{2,4}$/.test(a.name) ? a.name : `flicks-${a.kind}-${a.id.slice(0, 8)}.${ext(a)}`)

type Kind = "all" | "video" | "image"
type Source = "all" | "Uploaded" | "Generated"

/** true once the element has scrolled into view (and stays true), so a grid of hundreds loads only what shows */
function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: "200px" })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return { ref, seen }
}

/**
 * Assets: every video made for the user and every photo or clip they uploaded, from the server's library,
 * newest first and grouped by day. Each card plays on hover; open one to see what it was made from
 * (prompt, references), download it, delete it or start a new project from it.
 */
export function AssetsPage({ onCreate, onUse }: { onCreate: () => void; onUse: (a: Asset) => void }) {
  const { state: dev } = useDevState()
  const toast = useToast()
  const live = isLive(useAiConfig())
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)
  const [metas, setMetas] = useState<Record<string, VideoMeta>>({})
  const noteMeta = useCallback((id: string, m: VideoMeta) => setMetas((all) => (all[id] ? all : { ...all, [id]: m })), [])

  useEffect(() => {
    if (!live) return void (setAssets([]), setFailed(true))
    let on = true
    setAssets(null)
    setFailed(false)
    loadLibrary()
      .then((lib) => {
        if (!on) return
        setAssets(
          lib.items
            .filter((x) => isFinalVideo(x) || isThumbnail(x) || isUpload(x))
            .map((x) => ({
              id: x.id,
              kind: isVideo(x) ? "video" : "image",
              name: nameOf(x),
              url: x.file!,
              prompt: isUpload(x) ? "" : x.prompt,
              refs: isUpload(x) ? [] : lib.refs(x),
              project: x.project || undefined,
              source: x.model === "upload" ? "Uploaded" : "Generated",
              createdAt: x.created,
              type: x.type,
            })),
        )
      })
      .catch(() => on && (setFailed(true), setAssets([])))
    return () => void (on = false)
  }, [live, tries])
  const list = useMemo(() => (dev.assetsEmpty ? [] : (assets ?? [])), [assets, dev.assetsEmpty])

  const [openId, setOpenId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Asset | null>(null)
  const [kind, setKind] = useState<Kind>("all")
  const [source, setSource] = useState<Source>("all")
  const [dates, setDates] = useState<DateFilterValue>(ALL_DATES)
  const shown = useMemo(() => list.filter((a) => (kind === "all" || a.kind === kind) && (source === "all" || a.source === source) && inDateFilter(a.createdAt, dates)), [list, kind, source, dates])
  const filtering = kind !== "all" || source !== "all" || dates.preset !== "all"
  const groups = useMemo(() => {
    const sorted = [...shown].sort((a, b) => b.createdAt - a.createdAt)
    const out: { label: string; items: Asset[] }[] = []
    for (const a of sorted) {
      const label = dayLabel(a.createdAt)
      const last = out[out.length - 1]
      if (last?.label === label) last.items.push(a)
      else out.push({ label, items: [a] })
    }
    return out
  }, [shown])
  const ordered = groups.flatMap((g) => g.items)
  const openIndex = ordered.findIndex((a) => a.id === openId)
  const viewerItems: ViewerItem[] = useMemo(
    () =>
      ordered.map((a) => {
        const m = metas[a.id]
        return {
          id: a.id,
          kind: a.kind,
          src: a.url,
          name: fileName(a),
          prompt: a.prompt || undefined,
          refs: a.refs.map((r) => ({ kind: r.kind, src: r.src, name: r.name, source: r.source })),
          details: [
            ["Source", a.source],
            ["Type", a.kind === "video" ? "Video" : "Image"],
            ...(a.project ? [["Project", a.project] as [string, string]] : []),
            ...(m ? ([["Size", m.size.replace("×", " × ")], ["Length", `${Math.round(m.duration)} seconds`]] as [string, string][]) : []),
            ["Created", fullLabel(a.createdAt)],
          ],
          link: a.url,
        } satisfies ViewerItem
      }),
    [ordered, metas],
  )

  const remove = async (a: Asset) => {
    try {
      await hideFromLibrary(a.id)
    } catch {
      setConfirm(null)
      return void toast({ kind: "error", title: `Couldn’t delete this ${a.kind}`, description: NOT_CONNECTED })
    }
    setAssets((l) => (l ?? []).filter((x) => x.id !== a.id))
    setConfirm(null)
    // keep the viewer open on the next one, if there is one
    if (openId === a.id) {
      const i = ordered.findIndex((x) => x.id === a.id)
      setOpenId(ordered[i + 1]?.id ?? ordered[i - 1]?.id ?? null)
    }
    toast(a.kind === "video" ? "Video deleted" : "Image deleted")
  }

  const videos = shown.filter((a) => a.kind === "video").length
  const count = kind === "image" ? `${shown.length} image${shown.length === 1 ? "" : "s"}` : kind === "video" || videos === shown.length ? `${shown.length} video${shown.length === 1 ? "" : "s"}` : `${shown.length} item${shown.length === 1 ? "" : "s"}`
  const grid = "grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"

  return (
    <div className={PAGE}>
      <PageHeader
        title="Assets"
        count={list.length > 0 ? count : undefined}
        toolbar={
          assets === null && !dev.assetsEmpty ? (
            // the filters' places while the library loads, so nothing jumps when it arrives
            <>
              <Skeleton className="h-8 w-[150px] rounded-2xl" />
              <Skeleton className="h-8 w-[190px] rounded-2xl" />
              <Skeleton className="h-8 w-[230px] rounded-2xl" />
            </>
          ) : list.length > 0 && (
            <>
              <DateFilter value={dates} onChange={setDates} className="w-[150px]" />
              <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <TabsList aria-label="Type">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="video">Videos</TabsTrigger>
                  <TabsTrigger value="image">Images</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={source} onValueChange={(v) => setSource(v as Source)}>
                <TabsList aria-label="Source">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="Generated">Generated</TabsTrigger>
                  <TabsTrigger value="Uploaded">Uploaded</TabsTrigger>
                </TabsList>
              </Tabs>
            </>
          )
        }
      />

      {assets === null && !dev.assetsEmpty ? (
        <div className="mt-6"><CardsSkeleton count={12} cols={grid} aspect="aspect-square" lines={0} /></div>
      ) : failed && !dev.assetsEmpty ? (
        <EmptyState
          className="mt-6"
          art="media"
          title={NOT_CONNECTED}
          text="Your videos and uploads are kept on the AI server. Check the connection and try again."
          action={<Button size="sm" variant="outline" onClick={() => setTries((t) => t + 1)}>Try again</Button>}
        />
      ) : (
      /* filtering fetches again */
      <Loading k={`${kind}|${source}|${JSON.stringify(dates)}`} skipFirst skeleton={<div className="mt-6"><CardsSkeleton count={12} cols={grid} aspect="aspect-square" lines={0} /></div>}>
      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          art="media"
          title="No videos yet"
          text="Every video you make and every photo or clip you add shows up here, with the prompt and references it was made from."
          action={<Button size="sm" onClick={onCreate}>Create</Button>}
        />
      ) : shown.length === 0 && filtering ? (
        <EmptyState
          className="mt-6"
          art="search"
          title="Nothing matches these filters"
          text="Try another date, type or source."
          action={<Button size="sm" variant="outline" onClick={() => (setKind("all"), setSource("all"), setDates(ALL_DATES))}>Clear filters</Button>}
        />
      ) : (
        <div className="mt-6 flex flex-col gap-10">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{g.label}</h2>
              <ul className={`grid ${grid}`}>
                {g.items.map((a) => (
                  <li key={a.id}>
                    <AssetCard a={a} onOpen={() => setOpenId(a.id)} onMeta={noteMeta} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      </Loading>
      )}

      <MediaViewer
        items={viewerItems}
        index={openIndex < 0 ? null : openIndex}
        onIndex={(i) => setOpenId(ordered[i].id)}
        onClose={() => setOpenId(null)}
        onDelete={(it) => setConfirm(ordered.find((x) => x.id === it.id) ?? null)}
        onUse={(it) => {
          const a = ordered.find((x) => x.id === it.id)
          if (!a) return
          setOpenId(null)
          onUse(a)
        }}
        useLabel="Use in Flicks"
      />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this {confirm?.kind === "image" ? "image" : "video"}?</DialogTitle>
            <DialogDescription>It’s removed from Assets. Flicks using it won’t be affected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <PendingButton variant="destructive" onClick={() => confirm && remove(confirm)}>
              Delete
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * One asset in the grid: the shared tile. A video plays on hover; its metadata (size, length) goes to the
 * viewer's details. The prompt (or file name) slides up on hover; download top-right.
 */
function AssetCard({ a, onOpen, onMeta }: { a: Asset; onOpen: () => void; onMeta: (id: string, m: VideoMeta) => void }) {
  const { ref, seen } = useSeen<HTMLDivElement>()
  const label = a.prompt || a.name
  const corner = "size-7 rounded-lg bg-background/90 opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-background group-hover/tile:opacity-100 focus-visible:opacity-100"
  return (
    <div ref={ref}>
      <MediaTile
        src={a.kind === "image" && seen ? a.url : undefined}
        video={a.kind === "video" ? { mp4: a.url } : undefined}
        details={<p className="line-clamp-3">{label}</p>}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon-xs" aria-label="Download" onClick={() => download(a.url, fileName(a))} className={corner}>
                <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        }
      >
        {/* a video has no poster of its own on the server: its first frame stands in until it plays, and its metadata gives the length and size */}
        {a.kind === "video" && seen && (
          <video
            src={`${a.url}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            aria-hidden
            onLoadedMetadata={(e) => {
              const v = e.currentTarget
              onMeta(a.id, { size: `${v.videoWidth}×${v.videoHeight}`, duration: v.duration })
            }}
            className="pointer-events-none absolute inset-0 size-full object-cover"
          />
        )}
        <button type="button" onClick={onOpen} aria-label={`Open ${a.kind}: ${label}`} className="absolute inset-0 rounded-xl focus-ring" />
      </MediaTile>
    </div>
  )
}
