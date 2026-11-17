import { AiError, bakeFlick, flickStatus, isLive, mockVideos, shareable } from "@/ai/client"
import { library, type FlickRecord } from "@/library"
import { videoAt, type CanvasElement } from "@/components/editor/elements"

/**
 * Export on the Flicks API. With the server set up and real videos, an export sends the included
 * variations' videos (public addresses) and thumbnails to the API, which bakes them into a Flick
 * with a share page; the watcher in App follows it there. With Sample videos on (or no server) the
 * export is the prototype's timer, as before.
 */

/** Dev switch: exports go to the Flicks API (off by default until export is ready for production) */
export const liveExportOn = () => {
  try {
    return localStorage.getItem("flam.liveExport") === "1"
  } catch {
    return false
  }
}
export const setLiveExport = (on: boolean) => {
  try {
    localStorage.setItem("flam.liveExport", on ? "1" : "0")
  } catch {
    /* no storage */
  }
}
/** real exports: the switch is on, the server is set up and the videos aren't samples */
export const liveExport = () => liveExportOn() && isLive() && !mockVideos()

/** how long a bake usually takes on the API (the progress bar's length; it waits past this) */
export const BAKE_MS = 120_000

/** the API's request for these variations: each video's public address and its thumbnail */
export async function bakeRequest(name: string, size: string, variants: { video: number; poster?: string }[]): Promise<NonNullable<FlickRecord["remote"]>["request"]> {
  const videos = await Promise.all(
    variants.map(async (v) => {
      const m = videoAt(v.video)
      if (!m.mp4) throw new AiError("no_video", "A variation has no video to export.")
      const video_url = await shareable(new URL(m.mp4, location.href).href)
      const thumb = v.poster && !v.poster.startsWith("data:image/svg") ? await shareable(new URL(v.poster, location.href).href).catch(() => undefined) : undefined
      return { video_url, ...(thumb && /^https:/.test(thumb) ? { thumbnail_url: thumb } : {}) }
    }),
  )
  // our videos aren't the API's own generations, so it needs the Flick's shape: its exact size as a
  // ratio (300×250 → 6:5), which the share page frames the videos in
  return { name, aspect_ratio: aspectOf(size), videos }
}

/** "300×250" → "6:5": the Flick's own shape, reduced */
export function aspectOf(size: string) {
  const [w, h] = size.split("×").map(Number)
  if (!w || !h) return "16:9"
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  const g = gcd(w, h)
  return `${w / g}:${h / g}`
}

/** sends the bake and records the API's id on the Flick (or the failure, with Try again) */
export async function startBake(flickId: string, request: NonNullable<FlickRecord["remote"]>["request"]) {
  try {
    const r = await bakeFlick(request)
    library.setRemote(flickId, { id: r.id, status: "processing" })
  } catch (e) {
    library.setRemote(flickId, { status: "failed", error: e instanceof Error ? e.message : "The export didn't start." })
  }
}

/** one look at a bake in progress: ready (with its share page), failed, or still going */
export async function checkBake(f: FlickRecord): Promise<"ready" | "failed" | "waiting"> {
  if (!f.remote?.id) return "waiting"
  let s
  try {
    s = await flickStatus(f.remote.id)
  } catch (e) {
    // the server being briefly unreachable isn't a failed bake; a missing Flick is
    if (e instanceof AiError && e.code !== "network" && e.code !== "not_connected") {
      library.setRemote(f.id, { status: "failed", error: e.message })
      return "failed"
    }
    return "waiting"
  }
  if (s.status === "completed" && s.url) {
    library.finishExport(f.id, { ...f.remote, status: "completed", url: s.url })
    return "ready"
  }
  if (s.status === "failed" || s.status === "completed") {
    library.setRemote(f.id, { status: "failed", error: s.error ?? "The Flick couldn't be made." })
    return "failed"
  }
  return "waiting"
}

/**
 * The layout a Flick keeps must outlive this browser: an image placed from a file before its
 * upload finished still points at a blob: or data: address, so it is kept on the server now and
 * the element rewritten. Elements already on https stay as they are.
 */
export async function durableElements(elements: CanvasElement[]): Promise<CanvasElement[]> {
  if (!isLive()) return elements
  return Promise.all(
    elements.map(async (el) => {
      if (el.kind !== "image" || !/^(blob:|data:)/.test(el.src)) return el
      const src = await shareable(el.src, { purpose: "upload" }).catch(() => el.src)
      return src === el.src ? el : ({ ...el, src } as CanvasElement)
    }),
  )
}
