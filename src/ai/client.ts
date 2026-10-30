/**
 * Talking to the Flicks AI server (server/worker.ts): Claude chat, streamed, and Higgsfield images.
 * Images and videos (720p) come from Higgsfield.
 * The server address comes from the build (VITE_AI_URL) or dev tools; the passcode is typed in dev
 * tools and kept only on this device. With no address or passcode, the chat runs its scripted demo.
 */
import { useSyncExternalStore } from "react"

export type AiConfig = { url: string; passcode: string; model: string }
export const AI_MODELS = [
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: "Fast, good default" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "Best, slower" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", hint: "Fastest" },
]
const KEY = "flam.ai"
/** the deployed AI server (public address; the passcode is what protects it). A build can point elsewhere with VITE_AI_URL. */
const DEFAULT_URL = "https://flicks-ai.flick-prototype.workers.dev"
const BUILD_URL = (import.meta.env.VITE_AI_URL as string | undefined) || DEFAULT_URL

let config: AiConfig = load()
const listeners = new Set<() => void>()

function load(): AiConfig {
  const base = { url: BUILD_URL, passcode: "", model: AI_MODELS[0].id }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<AiConfig>
    return { ...base, ...saved, url: saved.url || BUILD_URL }
  } catch {
    return base
  }
}

export const aiConfig = {
  get: () => config,
  set(patch: Partial<AiConfig>) {
    config = { ...config, ...patch }
    try {
      localStorage.setItem(KEY, JSON.stringify(config))
    } catch {
      /* storage unavailable: kept for this visit */
    }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
}
export const useAiConfig = () => useSyncExternalStore(aiConfig.subscribe, aiConfig.get)
/** live AI is on when there's somewhere to call and a passcode to call it with */
export const isLive = (c: AiConfig = config) => !!(c.url.trim() && c.passcode.trim())

const base = () => config.url.trim().replace(/\/+$/, "")
const headers = () => ({ "content-type": "application/json", "x-flicks-pass": config.passcode.trim() })

export class AiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
  }
}
const MESSAGES: Record<string, string> = {
  wrong_passcode: "The passcode isn't right. Check it in dev tools.",
  origin_not_allowed: "The AI server doesn't accept requests from this site.",
  daily_limit: "Today's AI limit is reached. Try again tomorrow.",
  claude_not_set_up: "The AI server has no Claude key yet.",
  images_not_set_up: "The AI server has no Higgsfield key yet.",
  server_not_set_up: "The AI server isn't set up yet (no passcode).",
  network: "Couldn't reach the AI server. Check your connection and try again.",
}
async function fail(res: Response): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string; what?: string }
  const code = body.error ?? `http_${res.status}`
  throw new AiError(code, MESSAGES[code] ?? body.message ?? `The AI server answered ${res.status}.`)
}
async function call(path: string, init?: RequestInit) {
  let res: Response
  try {
    res = await fetch(base() + path, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } })
  } catch {
    throw new AiError("network", MESSAGES.network)
  }
  if (!res.ok) await fail(res)
  return res
}

export type Health = { ok: boolean; claude: boolean; images: boolean; videos?: boolean; image_model?: string; images_key?: "ok" | "invalid" | "missing" | "unknown"; caps: { images: number; chats: number; videos?: number }; used: { images: number; chats: number; videos?: number } }
export const health = async () => (await (await call("/health")).json()) as Health

/* ---------- chat ---------- */

export type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string | Block[]; is_error?: boolean }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  /** web search and page reads Claude runs itself (kept exactly as received: the API needs them back) */
  | { type: "server_tool_use" | "web_search_tool_result" | "web_fetch_tool_result"; id?: string; name?: string; input?: Record<string, unknown>; [k: string]: unknown }
  /** Claude's own reasoning; sent back unchanged with its signature */
  | { type: "thinking"; thinking: string; signature?: string }
  | { type: "redacted_thinking"; data: string }
/** The API refuses empty text blocks and thinking blocks without their text or signature */
export const keepable = (b: Block | undefined): b is Block =>
  !!b && !(b.type === "text" && !b.text.trim()) && !(b.type === "thinking" && (!b.thinking || !b.signature))
export type Message = { role: "user" | "assistant"; content: Block[] }
export type Tool = { name: string; description?: string; input_schema?: Record<string, unknown>; type?: string; [k: string]: unknown }
export type ChatRequest = { system: string; messages: Message[]; tools: Tool[]; max_tokens?: number }
export type ChatResult = { content: Block[]; stop: string }

/**
 * One Claude reply, streamed: `onText` gets the reply's text so far; tool calls come back whole in
 * the result. Parses the Messages API's server-sent events.
 */
export async function streamChat(req: ChatRequest, onText: (text: string) => void, signal?: AbortSignal, onTool?: (name: string) => void): Promise<ChatResult> {
  const res = await call("/chat", { method: "POST", body: JSON.stringify({ ...req, model: config.model }), signal })
  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  const blocks: (Block & { json?: string })[] = []
  let buf = ""
  let stop = "end_turn"
  let text = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i)
      buf = buf.slice(i + 2)
      const data = chunk
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("")
      if (!data) continue
      let ev: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        ev = JSON.parse(data)
      } catch {
        continue
      }
      // how much came from Claude's cache (visible in the browser console)
      if (ev.type === "message_start" && ev.message?.usage) {
        const u = ev.message.usage
        console.info(`[Flicks AI] input ${u.input_tokens} new, ${u.cache_read_input_tokens ?? 0} from cache, ${u.cache_creation_input_tokens ?? 0} cached now`)
      }
      if (ev.type === "content_block_start") {
        const b = ev.content_block
        // tool calls stream their input; web search and page-read blocks arrive whole and are kept as they are
        blocks[ev.index] =
          b.type === "tool_use" ? { type: "tool_use", id: b.id, name: b.name, input: {}, json: "" }
          : b.type === "server_tool_use" ? { ...b, input: {}, json: "" }
          : b.type === "text" ? { type: "text", text: "" }
          : { ...b }
        if (b.type === "tool_use" || b.type === "server_tool_use") onTool?.(b.name)
      } else if (ev.type === "content_block_delta") {
        const b = blocks[ev.index]
        if (ev.delta.type === "text_delta" && b?.type === "text") {
          b.text += ev.delta.text
          text += ev.delta.text
          onText(text)
        } else if (ev.delta.type === "input_json_delta" && b) b.json += ev.delta.partial_json
        else if (ev.delta.type === "thinking_delta" && b?.type === "thinking") b.thinking += ev.delta.thinking
        else if (ev.delta.type === "signature_delta" && b?.type === "thinking") b.signature = (b.signature ?? "") + ev.delta.signature
        else if (ev.delta.type === "citations_delta" && b?.type === "text") (b as { citations?: unknown[] }).citations = [...((b as { citations?: unknown[] }).citations ?? []), ev.delta.citation]
      } else if (ev.type === "content_block_stop") {
        const b = blocks[ev.index]
        if (b?.type === "tool_use" || b?.type === "server_tool_use") {
          try {
            b.input = b.json ? JSON.parse(b.json) : {}
          } catch {
            b.input = {}
          }
          delete b.json
        }
      } else if (ev.type === "message_delta" && ev.delta?.stop_reason) stop = ev.delta.stop_reason
      else if (ev.type === "error") throw new AiError("claude_error", ev.error?.message ?? "Claude returned an error.")
    }
  }
  // the API refuses empty text blocks when they're sent back
  return { content: blocks.filter(keepable), stop }
}

/* ---------- images ---------- */

/** Starts a Higgsfield image and waits for it (polling with backoff, up to about 3 minutes). */
/** a call that rides out a dropped connection (a server redeploy, flaky wifi): up to 3 tries */
async function steady(path: string, init?: RequestInit) {
  for (let i = 0; ; i++) {
    try {
      return await call(path, init)
    } catch (e) {
      if (!(e instanceof AiError && e.code === "network") || i >= 2 || init?.signal?.aborted) throw e
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
}

/** imageUrls: public addresses of the user's photos or a website's images (see shareable), so the product in the picture is theirs */
/** what a generation is for: kept with it in the library */
export type GenMeta = { project?: string; variation?: string; purpose?: string }
/** opts.text: the image must carry readable text (another model renders it); opts.quality: "draft" for previews */
export async function generateImage(prompt: string, aspect: string, signal?: AbortSignal, onStatus?: (status: string) => void, imageUrls: string[] = [], meta: GenMeta = {}, opts: { text?: boolean; quality?: "draft" | "final" } = {}): Promise<string> {
  const { id } = (await (await steady("/image", { method: "POST", body: JSON.stringify({ prompt, aspect_ratio: aspect, image_urls: imageUrls, meta, ...opts }), signal })).json()) as { id: string }
  onStatus?.("queued")
  const until = Date.now() + 240_000
  let wait = 2000
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, wait))
    if (signal?.aborted) throw new AiError("aborted", "Stopped.")
    const s = (await (await steady(`/image/${id}`, { signal })).json()) as { status: string; url?: string }
    onStatus?.(s.status)
    if (s.status === "completed" && s.url) return s.url
    if (s.status === "completed") throw new AiError("image_failed", "Higgsfield finished but sent no image. Try again.")
    if (s.status === "failed" || s.status === "canceled") throw new AiError("image_failed", "The image didn't generate. Try again.")
    if (s.status === "nsfw") throw new AiError("image_blocked", "Higgsfield blocked this image. Try a different description.")
    wait = Math.min(wait * 1.4, 6000)
  }
  throw new AiError("image_timeout", "The image is taking too long. Try again.")
}

/* ---------- sharing images ---------- */

const shared = new Map<string, Promise<string>>()
/**
 * A public address for an image, so Higgsfield can use it: one already on the web stays as it is;
 * one that only lives in this browser (an upload, a blob) is kept by the server for 7 days.
 */
export function shareable(src: string, about: { name?: string; project?: string } = {}): Promise<string> {
  if (/^https:\/\//.test(src) && !src.startsWith(location.origin)) return Promise.resolve(src)
  const known = shared.get(src)
  if (known) return known
  const job = (async () => {
    const blob = await (await fetch(src)).blob()
    // big photos are scaled down first (the models don't need more than 2048 px)
    const small = blob.size > 2_500_000 || !/^image\/(png|jpeg|webp)$/.test(blob.type) ? await shrink(blob) : blob
    const q = new URLSearchParams(Object.entries(about).filter((e): e is [string, string] => !!e[1]))
    const res = await steady(`/upload?${q}`, { method: "POST", body: small, headers: { "content-type": small.type } })
    return ((await res.json()) as { url: string }).url
  })()
  shared.set(src, job)
  job.catch(() => shared.delete(src))
  return job
}
async function shrink(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, 2048 / Math.max(bmp.width, bmp.height))
  const c = document.createElement("canvas")
  c.width = Math.round(bmp.width * s)
  c.height = Math.round(bmp.height * s)
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("encode"))), "image/jpeg", 0.9))
}

/* ---------- videos ---------- */

/** "1080×1920" → "9:16": the closest shape the video model makes */
export function videoAspectOf(size: string) {
  const [w, h] = size.split("×").map(Number)
  if (!w || !h) return "16:9"
  const options: [string, number][] = [["1:1", 1], ["3:4", 0.75], ["9:16", 9 / 16], ["4:3", 4 / 3], ["16:9", 16 / 9], ["21:9", 21 / 9]]
  return options.reduce((a, b) => (Math.abs(Math.log(b[1] / (w / h))) < Math.abs(Math.log(a[1] / (w / h))) ? b : a))[0]
}

/** Starts a real video (720p) and waits for it: a few minutes. `image` (a public https address) becomes the first frame. */
/**
 * What a video is made from. text: the prompt alone; image: opens on `image` (and may end on
 * `endImage`); reference: stays true to `images` (and follows `video` when given); edit: edits
 * `video`, matching `images` for the change.
 */
export type VideoInput = { mode: "text" | "image" | "reference" | "edit"; prompt: string; image?: string; endImage?: string; images?: string[]; video?: string }
export async function generateVideo(input: VideoInput & { aspect: string; seconds: number; meta?: GenMeta; resume?: string; onId?: (id: string) => void }, onStatus?: (status: string) => void, signal?: AbortSignal): Promise<{ url: string; poster?: string }> {
  // a video started before a reload carries on from its id
  const { id } = input.resume ? { id: input.resume } : ((await (
    await steady("/video", { method: "POST", body: JSON.stringify({ mode: input.mode, prompt: input.prompt, aspect_ratio: input.aspect, duration: input.seconds, image_url: input.image, end_image_url: input.endImage, image_urls: input.images, video_url: input.video, meta: input.meta }), signal })
  ).json()) as { id: string })
  input.onId?.(id)
  onStatus?.("queued")
  const until = Date.now() + 15 * 60_000
  let wait = 5000
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, wait))
    if (signal?.aborted) throw new AiError("aborted", "Stopped.")
    const s = (await (await steady(`/video/${id}`, { signal })).json()) as { status: string; url?: string; poster?: string }
    onStatus?.(s.status)
    if (s.status === "completed" && s.url) return { url: s.url, poster: s.poster }
    if (s.status === "completed") throw new AiError("video_failed", "The video finished but no file came back. Try again.")
    if (s.status === "failed" || s.status === "canceled") throw new AiError("video_failed", "The video didn't generate. Try again.")
    if (s.status === "nsfw") throw new AiError("video_blocked", "This video was blocked. Try a different description.")
    wait = Math.min(wait * 1.3, 15000)
  }
  throw new AiError("video_timeout", "The video is taking too long. Try again.")
}

/** a still from a generated video (through the server, so the browser may read its pixels) */
export async function posterOf(videoUrl: string): Promise<string | undefined> {
  try {
    const blob = await (await steady(`/media?u=${encodeURIComponent(videoUrl)}`)).blob()
    const src = URL.createObjectURL(blob)
    const v = document.createElement("video")
    v.muted = true
    v.preload = "auto"
    v.src = src
    await new Promise<void>((ok, no) => ((v.onloadeddata = () => ok()), (v.onerror = () => no()), setTimeout(no, 20000)))
    v.currentTime = Math.min(0.5, (v.duration || 1) / 2)
    await new Promise<void>((ok) => ((v.onseeked = () => ok()), setTimeout(ok, 3000)))
    const c = document.createElement("canvas")
    const s = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight))
    c.width = Math.round(v.videoWidth * s)
    c.height = Math.round(v.videoHeight * s)
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height)
    URL.revokeObjectURL(src)
    return c.toDataURL("image/jpeg", 0.8)
  } catch {
    return undefined
  }
}

/* ---------- library ---------- */

/** an image or video made through the AI server; `file` is our own copy, once it's saved */
export type LibraryItem = { id: string; kind: "image" | "video"; prompt: string; model: string; created: number; saved: boolean; file?: string; project?: string; variation?: string; purpose?: string; refs?: string[]; bytes?: number; type?: string }
export const library = async () => ((await (await call("/library")).json()) as { items: LibraryItem[] }).items
/** keeps copies of finished media the app still has links to (Higgsfield deletes its own after 7 days) */
export const importToLibrary = async (items: { url: string; kind: "image" | "video"; prompt?: string; name?: string; created?: number }[]) =>
  ((await (await call("/library/import", { method: "POST", body: JSON.stringify({ items }) })).json()) as { imported: number }).imported

/* ---------- websites ---------- */

export type SiteRead = {
  ok: boolean
  url: string
  reason?: string
  site?: string
  title?: string
  description?: string
  price?: string
  theme_color?: string
  logo?: string
  products?: { name?: string; price?: string; color?: string; description?: string; url?: string; images: string[] }[]
  images?: string[]
  text?: string
}
/** the server reads the page (the browser never opens it) */
export const readWebsite = async (url: string) => (await (await call("/read", { method: "POST", body: JSON.stringify({ url }) })).json()) as SiteRead
/** a website's image, through the server (sites often refuse to show their images elsewhere) */
export async function siteImage(url: string): Promise<Blob> {
  const res = await steady(`/img?u=${encodeURIComponent(url)}`)
  return res.blob()
}

/** "1080×1920" → "9:16": the closest aspect Higgsfield offers */
export function aspectOf(size: string) {
  const [w, h] = size.split("×").map(Number)
  if (!w || !h) return "1:1"
  const options: [string, number][] = [["1:1", 1], ["4:5", 0.8], ["3:4", 0.75], ["2:3", 2 / 3], ["9:16", 9 / 16], ["5:4", 1.25], ["4:3", 4 / 3], ["3:2", 1.5], ["16:9", 16 / 9], ["21:9", 21 / 9]]
  const r = w / h
  return options.reduce((a, b) => (Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a))[0]
}

/** An image file, scaled down (max 1024 px) as base64 JPEG, for Claude to see. */
export async function imageBlock(file: Blob): Promise<Block> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, 1024 / Math.max(bmp.width, bmp.height))
  const c = document.createElement("canvas")
  c.width = Math.round(bmp.width * s)
  c.height = Math.round(bmp.height * s)
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  const data = c.toDataURL("image/jpeg", 0.85).split(",")[1]
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data } }
}
