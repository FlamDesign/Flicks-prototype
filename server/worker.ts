/**
 * Flicks AI server: a small Cloudflare Worker between the prototype (GitHub Pages) and the two
 * services it uses. It holds the keys, so they never reach the browser or the public repo.
 *
 *   GET  /health          is the server set up? (and today's usage)
 *   POST /chat            Claude Messages API, streamed back as server-sent events
 *   POST /image           starts a Higgsfield image; returns { id }
 *   GET  /image/:id       that image's status; { status, url? }
 *
 * Every request needs the passcode (x-flicks-pass header). Daily caps limit spend if it leaks.
 * Secrets (set by the deploy action): ANTHROPIC_API_KEY, HIGGSFIELD_KEY_ID, HIGGSFIELD_KEY_SECRET, PASSCODE.
 */

interface KV {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}

export interface Env {
  ANTHROPIC_API_KEY?: string
  HIGGSFIELD_KEY_ID?: string
  HIGGSFIELD_KEY_SECRET?: string
  PASSCODE?: string
  /** comma-separated origins allowed to call from a browser */
  ALLOWED_ORIGINS?: string
  DAILY_IMAGE_CAP?: string
  DAILY_CHAT_CAP?: string
  /** Higgsfield image model path, e.g. /higgsfield-ai/soul/standard */
  HF_IMAGE_PATH?: string
  USAGE?: KV
}

const MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"]
const MAX_TOKENS = 4096
const ASPECTS = ["1:1", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "16:9", "9:16", "21:9"]
const ANTHROPIC = "https://api.anthropic.com/v1/messages"
const HIGGSFIELD = "https://api.higgsfield.ai"

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("origin")
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    // browsers from other sites are turned away; scripts outside a browser still need the passcode
    if (origin && allowed.length && !allowed.includes(origin)) return json({ error: "origin_not_allowed" }, 403)
    const cors = corsHeaders(origin && (allowed.length === 0 || allowed.includes(origin)) ? origin : null)
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors })

    try {
      if (!env.PASSCODE) return json({ error: "server_not_set_up", message: "PASSCODE is not set" }, 500, cors)
      if (!same(req.headers.get("x-flicks-pass") ?? "", env.PASSCODE)) return json({ error: "wrong_passcode" }, 401, cors)

      const url = new URL(req.url)
      const day = new Date().toISOString().slice(0, 10)
      const caps = { images: num(env.DAILY_IMAGE_CAP, 50), chats: num(env.DAILY_CHAT_CAP, 500) }

      if (req.method === "GET" && url.pathname === "/health") {
        return json(
          {
            ok: true,
            claude: !!env.ANTHROPIC_API_KEY,
            images: !!(env.HIGGSFIELD_KEY_ID && env.HIGGSFIELD_KEY_SECRET),
            models: MODELS,
            caps,
            used: { images: await count(env, `img:${day}`), chats: await count(env, `chat:${day}`) },
          },
          200,
          cors,
        )
      }

      if (req.method === "POST" && url.pathname === "/chat") {
        if (!env.ANTHROPIC_API_KEY) return json({ error: "claude_not_set_up" }, 503, cors)
        if (!(await take(env, `chat:${day}`, caps.chats))) return json({ error: "daily_limit", what: "chat" }, 429, cors)
        const body = (await req.json()) as Record<string, unknown>
        const model = MODELS.includes(String(body.model)) ? String(body.model) : MODELS[0]
        const upstream = await fetch(ANTHROPIC, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model,
            max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS),
            system: body.system,
            messages: body.messages,
            tools: body.tools,
            stream: true,
          }),
        })
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text()
          return json({ error: "claude_error", status: upstream.status, message: text.slice(0, 500) }, 502, cors)
        }
        return new Response(upstream.body, { headers: { ...cors, "content-type": "text/event-stream", "cache-control": "no-store" } })
      }

      if (req.method === "POST" && url.pathname === "/image") {
        if (!env.HIGGSFIELD_KEY_ID || !env.HIGGSFIELD_KEY_SECRET) return json({ error: "images_not_set_up" }, 503, cors)
        const body = (await req.json()) as { prompt?: string; aspect_ratio?: string }
        const prompt = String(body.prompt ?? "").trim().slice(0, 2000)
        if (!prompt) return json({ error: "no_prompt" }, 400, cors)
        if (!(await take(env, `img:${day}`, caps.images))) return json({ error: "daily_limit", what: "images" }, 429, cors)
        const aspect = ASPECTS.includes(String(body.aspect_ratio)) ? String(body.aspect_ratio) : "1:1"
        // the configured model first, then the documented ones; a model that rejects aspect_ratio gets the prompt alone
        const paths = [...new Set([env.HF_IMAGE_PATH, "/higgsfield-ai/soul/v2/standard", "/higgsfield-ai/soul/standard"].filter((p): p is string => !!p))]
        let last = { status: 0, text: "" }
        for (const path of paths) {
          for (const payload of [{ prompt, aspect_ratio: aspect }, { prompt }]) {
            const res = await fetch(HIGGSFIELD + path, {
              method: "POST",
              headers: { ...hfAuth(env), "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
              body: JSON.stringify(payload),
            })
            const text = await res.text()
            let out: { request_id?: string } = {}
            try {
              out = JSON.parse(text)
            } catch {
              /* not JSON */
            }
            if (res.ok && out.request_id) return json({ id: out.request_id }, 200, cors)
            last = { status: res.status, text }
            console.log("higgsfield submit failed", path, Object.keys(payload).join("+"), res.status, text.slice(0, 300))
            // auth, balance and rate problems won't change with another model or payload
            if ([401, 402, 403, 429].includes(res.status)) return json({ error: "image_error", status: res.status, message: hfMessage(res.status, text) }, 502, cors)
            if (res.status === 404) break
          }
        }
        return json({ error: "image_error", status: last.status, message: hfMessage(last.status, last.text) }, 502, cors)
      }

      const m = url.pathname.match(/^\/image\/([\w-]{8,64})$/)
      if (req.method === "GET" && m) {
        if (!env.HIGGSFIELD_KEY_ID || !env.HIGGSFIELD_KEY_SECRET) return json({ error: "images_not_set_up" }, 503, cors)
        const res = await fetch(`${HIGGSFIELD}/requests/${m[1]}/status`, { headers: hfAuth(env) })
        const text = await res.text()
        let out: { status?: string; images?: { url?: string }[]; image?: { url?: string }; output?: { url?: string }[] } = {}
        try {
          out = JSON.parse(text)
        } catch {
          /* not JSON */
        }
        if (!res.ok) {
          console.log("higgsfield status failed", res.status, text.slice(0, 300))
          return json({ error: "image_error", status: res.status, message: hfMessage(res.status, text) }, 502, cors)
        }
        const url = out.images?.[0]?.url ?? out.image?.url ?? out.output?.[0]?.url
        if (out.status === "completed" && !url) console.log("higgsfield completed without an image url", text.slice(0, 300))
        return json({ status: out.status ?? "unknown", url }, 200, cors)
      }

      return json({ error: "not_found" }, 404, cors)
    } catch (e) {
      return json({ error: "server_error", message: e instanceof Error ? e.message : String(e) }, 500, cors)
    }
  },
}

function corsHeaders(origin: string | null): Record<string, string> {
  return origin
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type, x-flicks-pass",
        "access-control-max-age": "86400",
        vary: "origin",
      }
    : {}
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "content-type": "application/json" } })
}

/** a readable reason for a Higgsfield failure */
function hfMessage(status: number, text: string) {
  if (status === 401 || status === 403) return "Higgsfield refused the key. Check HIGGSFIELD_KEY_ID and HIGGSFIELD_KEY_SECRET."
  if (status === 402) return "The Higgsfield account is out of balance."
  if (status === 429) return "Higgsfield is rate limiting. Try again in a minute."
  return `Higgsfield answered ${status || "nothing"}: ${text.slice(0, 200)}`
}

const hfAuth = (env: Env) => ({ authorization: `Key ${env.HIGGSFIELD_KEY_ID}:${env.HIGGSFIELD_KEY_SECRET}` })
const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d)

/** compare without leaking how much matched */
function same(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

async function count(env: Env, key: string) {
  return env.USAGE ? Number(await env.USAGE.get(key)) || 0 : 0
}
/** count one use; false once today's cap is reached (KV is eventually consistent: a cap, not an exact meter) */
async function take(env: Env, key: string, cap: number) {
  if (!env.USAGE) return true
  const n = await count(env, key)
  if (n >= cap) return false
  await env.USAGE.put(key, String(n + 1), { expirationTtl: 60 * 60 * 48 })
  return true
}
