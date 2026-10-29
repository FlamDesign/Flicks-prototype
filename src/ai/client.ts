/**
 * Talking to the Flicks AI server (server/worker.ts): Claude chat, streamed, and Higgsfield images.
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

export type Health = { ok: boolean; claude: boolean; images: boolean; images_key?: "ok" | "invalid" | "missing" | "unknown"; caps: { images: number; chats: number }; used: { images: number; chats: number } }
export const health = async () => (await (await call("/health")).json()) as Health

/* ---------- chat ---------- */

export type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string | Block[]; is_error?: boolean }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
export type Message = { role: "user" | "assistant"; content: Block[] }
export type Tool = { name: string; description: string; input_schema: Record<string, unknown> }
export type ChatRequest = { system: string; messages: Message[]; tools: Tool[]; max_tokens?: number }
export type ChatResult = { content: Block[]; stop: string }

/**
 * One Claude reply, streamed: `onText` gets the reply's text so far; tool calls come back whole in
 * the result. Parses the Messages API's server-sent events.
 */
export async function streamChat(req: ChatRequest, onText: (text: string) => void, signal?: AbortSignal): Promise<ChatResult> {
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
      if (ev.type === "content_block_start") {
        const b = ev.content_block
        blocks[ev.index] = b.type === "tool_use" ? { type: "tool_use", id: b.id, name: b.name, input: {}, json: "" } : { type: "text", text: "" }
      } else if (ev.type === "content_block_delta") {
        const b = blocks[ev.index]
        if (ev.delta.type === "text_delta" && b?.type === "text") {
          b.text += ev.delta.text
          text += ev.delta.text
          onText(text)
        } else if (ev.delta.type === "input_json_delta" && b) b.json += ev.delta.partial_json
      } else if (ev.type === "content_block_stop") {
        const b = blocks[ev.index]
        if (b?.type === "tool_use") {
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
  return { content: blocks.filter((b) => b && !(b.type === "text" && !b.text.trim())), stop }
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

export async function generateImage(prompt: string, aspect: string, signal?: AbortSignal, onStatus?: (status: string) => void): Promise<string> {
  const { id } = (await (await steady("/image", { method: "POST", body: JSON.stringify({ prompt, aspect_ratio: aspect }), signal })).json()) as { id: string }
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
