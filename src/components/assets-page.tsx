import { useEffect, useMemo, useState } from "react"
import { CardsSkeleton, Loading, PendingButton } from "@/components/page-skeletons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon, Video01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui-extra/toaster"
import { ALL_DATES, DateFilter, inDateFilter, type DateFilterValue } from "@/components/ui-extra/date-filter"
import { download, MediaViewer, type ViewerItem } from "@/components/media-viewer"
import { GENERATED_VIDEOS, SAMPLE_UPLOADS, SAMPLE_VIDEO_COUNT } from "@/components/editor/elements"
import { useDevState } from "@/dev/state"

/** What a video was made from: an uploaded image, or the reference video (for variations). */
export type AssetRef = { kind: "image" | "video"; name: string; src: string; poster?: string }
export type Asset = {
  id: string
  /** which sample video */
  video: number
  prompt: string
  refs: AssetRef[]
  size: string
  /** length in seconds */
  duration: number
  createdAt: number
}

const DAY = 86_400_000
const at = (daysAgo: number, h: number, m: number) => {
  const d = new Date(Date.now() - daysAgo * DAY)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}
const up = (i: number): AssetRef => ({ kind: "image", name: SAMPLE_UPLOADS[i].name, src: SAMPLE_UPLOADS[i].src })
const refVideo = (i: number): AssetRef => ({ kind: "video", name: `${GENERATED_VIDEOS[i].name}.mp4`, src: GENERATED_VIDEOS[i].mp4, poster: GENERATED_VIDEOS[i].poster })

/**
 * What each sample video was made from, so prompt, references and video match.
 * Reference videos (0 sunglasses, 5 boots, 8 dress) come from images; the rest are variations of them.
 */
const MADE_FROM: { prompts: string[]; refs: AssetRef[] }[] = [
  {
    prompts: [
      "Athlete in black tee against a sunlit concrete wall, slow push-in, gold-lens sport sunglasses, then a street run at golden hour",
      "Wide shot of the city at dawn, the runner enters frame from the left, lenses flash as he passes the camera, slow motion on the turn, then cut to a tight close-up of the frames with the skyline reflected in the lenses. Keep the colour warm and the grain subtle, like a film commercial from the nineties. End on the product held up to the light.",
    ],
    refs: [up(2), up(0)],
  },
  { prompts: ["Same runner, black frame with red lenses, quicker cuts"], refs: [refVideo(0), up(1)] },
  { prompts: ["Same runner, sapphire mirrored lenses catching the low sun"], refs: [refVideo(0), up(3)] },
  { prompts: ["Swap to the white frame with orange lenses, keep the wall and light"], refs: [refVideo(0), up(5)] },
  { prompts: ["Classic black frame with clear lenses, softer light, calmer pace"], refs: [refVideo(0), up(4)] },
  {
    prompts: ["Wheat leather 6-inch boot on wet black rock in heavy rain, slow macro push along the stitching, then a splash as the boot lands, moody storm light"],
    refs: [up(7), up(9)],
  },
  { prompts: ["Same rain scene, swap to the black nubuck boot"], refs: [refVideo(5), up(8)] },
  { prompts: ["Same scene in the dark brown leather boot, keep the splash"], refs: [refVideo(5), up(9)] },
  {
    prompts: ["Model in a rust tiered halter gown walking a sunlit stone alley, smiles to camera, then a slow twirl seen from above, warm golden light"],
    refs: [up(10)],
  },
  { prompts: ["Same walk and twirl in the ombré strapless gown"], refs: [refVideo(8), up(11)] },
]

/** Sample library for the filled state: 20 today, 15 yesterday, 12 a few days ago, across all three product sets. */
const SAMPLE_ASSETS: Asset[] = [
  [0, 20],
  [1, 15],
  [4, 12],
].flatMap(([day, n]) =>
  Array.from({ length: n }, (_, i) => {
    const k = day * 7 + i
    const video = k % SAMPLE_VIDEO_COUNT
    const from = MADE_FROM[video]
    return {
      id: `a${day}-${i}`,
      video,
      prompt: from.prompts[Math.floor(k / SAMPLE_VIDEO_COUNT) % from.prompts.length],
      refs: from.refs,
      size: GENERATED_VIDEOS[video].size,
      duration: [8, 6, 10, 12, 15, 8, 10][k % 7],
      // today: spread back from now; earlier days: through the afternoon
      createdAt: day === 0 ? Date.now() - (i + 1) * 9 * 60_000 : at(day, 18 - Math.floor(i / 2), (i * 17) % 60),
    }
  }),
)

const dayKey = (t: number) => new Date(t).toDateString()
/** Today, Yesterday, then the date (with the year only when it isn't this year). */
const dayLabel = (t: number) => {
  const d = new Date(t)
  const today = new Date()
  if (dayKey(t) === today.toDateString()) return "Today"
  if (dayKey(t) === new Date(Date.now() - DAY).toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }) })
}
const timeLabel = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
const fullLabel = (t: number) => `${new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}, ${timeLabel(t)}`

const fileName = (a: Asset) => `flicks-video-${a.id}.mp4`

/**
 * Assets: every video generated, newest first, grouped by day. Each card plays on hover;
 * open one to see what it was made from (prompt, references), download it or delete it.
 */
/** Length as m:ss, like 0:09. */
export const clockLabel = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`
const linkOf = (a: Asset) => `https://flicks.flamapp.ai/a/${a.id}`

export function AssetsPage({ onCreate, onUse }: { onCreate: () => void; onUse: (a: Asset) => void }) {
  const { state: dev } = useDevState()
  const toast = useToast()
  const [assets, setAssets] = useState<Asset[]>(dev.assetsEmpty ? [] : SAMPLE_ASSETS)
  useEffect(() => setAssets(dev.assetsEmpty ? [] : SAMPLE_ASSETS), [dev.assetsEmpty])
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Asset | null>(null)

  const [sizeFilter, setSizeFilter] = useState("all")
  const [dates, setDates] = useState<DateFilterValue>(ALL_DATES)
  // only the sizes there are videos in
  const sizes = useMemo(() => [...new Set(assets.map((a) => a.size))].sort((x, y) => x.localeCompare(y, undefined, { numeric: true })), [assets])
  const shown = useMemo(() => assets.filter((a) => (sizeFilter === "all" || a.size === sizeFilter) && inDateFilter(a.createdAt, dates)), [assets, sizeFilter, dates])
  const filtering = sizeFilter !== "all" || dates.preset !== "all"
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
        const v = GENERATED_VIDEOS[a.video]
        return {
          id: a.id,
          kind: "video",
          src: v.mp4,
          webm: v.webm,
          poster: v.poster,
          name: fileName(a),
          prompt: a.prompt,
          refs: a.refs.map((r) => ({ ...r, kind: r.kind, src: r.src, poster: r.poster, source: r.kind === "video" ? "Generated" : "Uploaded" })),
          details: [
            ["Type", "Video"],
            ["Size", a.size.replace("×", " × ")],
            ["Length", `${a.duration} seconds`],
            ["Created", fullLabel(a.createdAt)],
          ],
          link: linkOf(a),
        } satisfies ViewerItem
      }),
    [ordered],
  )

  const remove = (a: Asset) => {
    setAssets((l) => l.filter((x) => x.id !== a.id))
    setConfirm(null)
    // keep the viewer open on the next one, if there is one
    if (openId === a.id) {
      const i = ordered.findIndex((x) => x.id === a.id)
      setOpenId(ordered[i + 1]?.id ?? ordered[i - 1]?.id ?? null)
    }
    toast("Video deleted")
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-medium tracking-tight">Assets</h1>
          {assets.length > 0 && <span className="text-sm text-muted-foreground">{shown.length === 1 ? "1 video" : `${shown.length} videos`}</span>}
        </div>
        {assets.length > 0 && (
          <div className="flex gap-2">
            <DateFilter value={dates} onChange={setDates} />
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-[150px]" aria-label="Size"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sizes</SelectItem>
                {sizes.map((sz) => <SelectItem key={sz} value={sz}><span className="tabular-nums">{sz}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* filtering fetches again */}
      <Loading k={[sizeFilter, dates]} skipFirst skeleton={<div className="mt-6"><CardsSkeleton count={12} cols="grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" aspect="aspect-[9/16]" lines={0} /></div>}>
      {assets.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed py-20 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <HugeiconsIcon icon={Video01Icon} className="size-6" />
          </span>
          <p className="mt-2 text-sm font-medium">No videos yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">Every video you generate shows up here, with the prompt and references it was made from.</p>
          <Button size="sm" className="mt-3" onClick={onCreate}>
            Create a video
          </Button>
        </div>
      ) : shown.length === 0 && filtering ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed py-20 text-center">
          <p className="text-sm font-medium">No videos match these filters</p>
          <p className="max-w-xs text-sm text-muted-foreground">Try another date or size.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => (setSizeFilter("all"), setDates(ALL_DATES))}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-10">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{g.label}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <AssetCard a={a} onOpen={() => setOpenId(a.id)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      </Loading>

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
            <DialogTitle>Delete this video?</DialogTitle>
            <DialogDescription>It’s removed from Assets. Flicks using this video won’t be affected.</DialogDescription>
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

/** A video in the grid: a uniform square tile that plays on hover; length and size bottom-right, download top-right. */
function AssetCard({ a, onOpen }: { a: Asset; onOpen: () => void }) {
  const v = GENERATED_VIDEOS[a.video]
  const [hover, setHover] = useState(false)
  const corner = "size-7 rounded-lg bg-background/90 opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-background group-hover/asset:opacity-100 focus-visible:opacity-100"
  return (
    <div className="group/asset" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open video: ${a.prompt}`}
          className="relative block aspect-square w-full overflow-hidden rounded-xl bg-muted outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src={v.poster} alt="" className="absolute inset-0 size-full object-cover" />
          {hover && (
            <video autoPlay muted loop playsInline poster={v.poster} className="absolute inset-0 size-full object-cover">
              {v.webm && <source src={v.webm} type="video/webm" />}
              <source src={v.mp4} type="video/mp4" />
            </video>
          )}
          {/* on hover: length and size */}
          <span className="pointer-events-none absolute bottom-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover/asset:opacity-100 group-focus-within/asset:opacity-100">
            <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">{clockLabel(a.duration)}</span>
            <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">{a.size}</span>
          </span>
        </button>
        <div className="absolute right-2 top-2 flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon-xs" aria-label="Download" onClick={() => download(v.mp4, fileName(a))} className={corner}>
                <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
