import { useSyncExternalStore } from "react"
import { shareAs } from "@/ai/client"

/** Longest video a reference can be, in seconds; longer ones are trimmed first. */
export const MAX_REF_SECONDS = 15
/** Largest video that can be added (before trimming), in MB. */
export const MAX_VIDEO_MB = 100

/** A photo or video that can be picked as a reference: uploaded, or made in the app. */
export type MediaItem = {
  id: string
  kind: "image" | "video"
  name: string
  url: string
  poster?: string
  source: "upload" | "generated"
  project?: string
  /** generated: the final prompt it was made from */
  prompt?: string
  /** generated: the final references it was made from (addresses) */
  refs?: string[]
  created: number
  /** seconds, for videos, once known */
  duration?: number
  /** this session's uploads keep their file */
  file?: File
  /** this session's uploads: their address on the AI server once saved there */
  saved?: string
}

/**
 * What the picker hands back. A trimmed video is added straight away: `clip` resolves to the cut
 * file once it's made (in the background), and the prompt box shows it as uploading till then.
 */
export type PickedMedia = MediaItem & { trim?: { start: number; end: number }; clip?: Promise<File> }

// this session's uploads, newest first (with the AI server on, they're also in its library)
let local: MediaItem[] = []
const subs = new Set<() => void>()
export const sessionUploads = {
  add(items: MediaItem[]) {
    local = [...items, ...local]
    subs.forEach((f) => f())
  },
  update(id: string, p: Partial<MediaItem>) {
    local = local.map((x) => (x.id === id ? { ...x, ...p } : x))
    subs.forEach((f) => f())
  },
  get: () => local,
}
export const useSessionUploads = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => local)

export const isVideoFile = (f: File) => f.type.startsWith("video/")

/**
 * One blob: address per file, shared by the prompt boxes, the chat and the server sync, so a file
 * is uploaded to the AI server once however many places use it.
 */
const blobUrls = new WeakMap<Blob, string>()
export const blobUrl = (f: Blob) => blobUrls.get(f) ?? (blobUrls.set(f, URL.createObjectURL(f)), blobUrls.get(f)!)
/** a file rebuilt from an existing address keeps that address (so it isn't uploaded twice) */
/**
 * A file rebuilt from an address keeps it, so it isn't uploaded again: a blob: address is reused as
 * is; a file fetched from the server (or the web) is known to live there already.
 */
export const sameUrl = <T extends Blob>(f: T, url: string): T => {
  if (url.startsWith("blob:")) blobUrls.set(f, url)
  else if (/^https?:\/\//.test(url)) shareAs(blobUrl(f), Promise.resolve(url))
  return f
}

/** A video's length and size, read from its metadata. */
export function probeVideo(url: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((ok, no) => {
    const v = document.createElement("video")
    v.preload = "metadata"
    v.muted = true
    v.crossOrigin = "anonymous"
    v.onloadedmetadata = () => ok({ duration: v.duration, width: v.videoWidth, height: v.videoHeight })
    v.onerror = () => no(new Error("This video can't be read."))
    v.src = url
  })
}

/** Stills at the given times (seconds), as JPEG blobs, longest side up to `size`. */
export async function stillsAt(url: string, times: number[], size = 320): Promise<Blob[]> {
  const v = document.createElement("video")
  v.muted = true
  v.crossOrigin = "anonymous"
  v.preload = "auto"
  v.src = url
  await new Promise<void>((ok, no) => ((v.onloadeddata = () => ok()), (v.onerror = () => no(new Error("This video can't be read.")))))
  const s = Math.min(1, size / Math.max(v.videoWidth, v.videoHeight))
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round(v.videoWidth * s))
  c.height = Math.max(1, Math.round(v.videoHeight * s))
  const ctx = c.getContext("2d")!
  const out: Blob[] = []
  for (const t of times) {
    await new Promise<void>((ok) => {
      const done = () => ok()
      v.onseeked = done
      v.currentTime = Math.min(Math.max(0, t), Math.max(0, v.duration - 0.05))
      setTimeout(done, 1500)
    })
    ctx.drawImage(v, 0, 0, c.width, c.height)
    out.push(await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), "image/jpeg", 0.8)))
  }
  v.removeAttribute("src")
  v.load()
  return out
}

const RECORD_TYPES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"]

/**
 * Cuts start..end out of a video, in the browser, with no sound (the video models don't use it) and
 * the longest side up to 1280 px. Fast: decodes and encodes with the browser's video hardware
 * (WebCodecs), much quicker than the clip's length, and copies the frames untouched when no
 * re-encode is needed. If the browser can't, it falls back to playing the part once and recording it.
 */
export async function cutClip(url: string, name: string, start: number, end: number, onProgress?: (done: number) => void): Promise<File> {
  try {
    return await fastCut(url, name, start, end, onProgress)
  } catch (e) {
    console.info("[Flicks] fast trim unavailable, recording instead", e)
    return recordCut(url, name, start, end, onProgress)
  }
}

async function fastCut(url: string, name: string, start: number, end: number, onProgress?: (done: number) => void): Promise<File> {
  const mb = await import("mediabunny")
  const blob = await (await fetch(url)).blob()
  const input = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS })
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new Error("no video track")
  // MP4 with H.264 where the browser can encode it (it plays everywhere); WebM with VP9 otherwise
  const mp4 = await mb.canEncodeVideo("avc")
  const target = new mb.BufferTarget()
  const output = new mb.Output({ format: mp4 ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(), target })
  const w = track.displayWidth
  const h = track.displayHeight
  const big = Math.max(w, h) > 1280
  const conversion = await mb.Conversion.init({
    input,
    output,
    trim: { start, end },
    audio: { discard: true },
    video: { codec: mp4 ? "avc" : "vp9", ...(big ? (w >= h ? { width: 1280 } : { height: 1280 }) : {}), bitrate: mb.QUALITY_HIGH },
  })
  if (!conversion.isValid) throw new Error("can't convert this video")
  conversion.onProgress = (p) => onProgress?.(p)
  await conversion.execute()
  const base = name.replace(/\.[^.]+$/, "")
  return new File([target.buffer!], `${base}-clip.${mp4 ? "mp4" : "webm"}`, { type: mp4 ? "video/mp4" : "video/webm" })
}

/** the fallback: plays the part once and records it, so it takes as long as the clip */
async function recordCut(url: string, name: string, start: number, end: number, onProgress?: (done: number) => void): Promise<File> {
  const v = document.createElement("video")
  v.muted = true
  v.playsInline = true
  v.crossOrigin = "anonymous"
  v.src = url
  await new Promise<void>((ok, no) => ((v.onloadeddata = () => ok()), (v.onerror = () => no(new Error("This video can't be read.")))))
  const s = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight))
  const c = document.createElement("canvas")
  c.width = Math.round((v.videoWidth * s) / 2) * 2
  c.height = Math.round((v.videoHeight * s) / 2) * 2
  const ctx = c.getContext("2d")!
  await new Promise<void>((ok) => ((v.onseeked = () => ok()), (v.currentTime = start)))
  const type = RECORD_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm"
  const rec = new MediaRecorder(c.captureStream(30), { mimeType: type, videoBitsPerSecond: 6_000_000 })
  const parts: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data)
  const stopped = new Promise<void>((ok) => (rec.onstop = () => ok()))
  ctx.drawImage(v, 0, 0, c.width, c.height)
  rec.start(250)
  await v.play()
  await new Promise<void>((ok) => {
    const tick = () => {
      ctx.drawImage(v, 0, 0, c.width, c.height)
      onProgress?.(Math.min(1, (v.currentTime - start) / (end - start)))
      if (v.currentTime >= end || v.ended) return ok()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  v.pause()
  rec.stop()
  await stopped
  const ext = type.includes("mp4") ? "mp4" : "webm"
  const base = name.replace(/\.[^.]+$/, "")
  return new File(parts, `${base}-clip.${ext}`, { type: type.split(";")[0] })
}

/** A picked item as a file (fetched when it isn't one already). */
export async function asFile(m: PickedMedia): Promise<File> {
  if (m.clip) return m.clip
  if (m.file) return m.file
  const blob = await (await fetch(m.url)).blob()
  return sameUrl(new File([blob], m.name, { type: blob.type || (m.kind === "video" ? "video/mp4" : "image/jpeg") }), m.url)
}

/** 1:05.3 (to a tenth; rounded first, so 119.97 s reads 2:00.0, not 1:60.0) */
export const clock = (s: number) => {
  const t = Math.round(s * 10)
  return `${Math.floor(t / 600)}:${((t % 600) / 10).toFixed(1).padStart(4, "0")}`
}
/** 2:00 (whole seconds, for lengths on thumbnails) */
export const length = (s: number) => {
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`
}
