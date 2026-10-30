/**
 * Flicks AI server: a small Cloudflare Worker between the prototype (GitHub Pages) and the two
 * services it uses. It holds the keys, so they never reach the browser or the public repo.
 *
 *   GET  /health          is the server set up? (and today's usage)
 *   POST /chat            Claude Messages API, streamed back as server-sent events
 *   POST /image           starts a Higgsfield image; with image_urls, one that keeps those images (the product); returns { id }
 *   GET  /image/:id       that image's status; { status, url? }
 *   POST /video           starts a video (Higgsfield, 720p only); returns { id }
 *   GET  /video/:id       that video's status; { status, url?, poster? }
 *   POST /upload          keeps an image the user added (in the library too) and returns a public address for it, so Higgsfield can use it
 *   GET  /file/:id        a kept image or video (public: the address is unguessable)
 *   GET  /media?u=        a generated video, passed through (Higgsfield's hosts only), for poster frames
 *   GET  /store/:key      saved app data: "state" (projects, Flicks, made videos) or "chat-<project id>"
 *   PUT  /store/:key      saves it (JSON, whole value replaced)
 *   GET  /library         every image and video made here, newest first (each kept on our side once it finishes)
 *   POST /library/import  keeps copies of finished images or videos the app still has links to
 *   POST /read            reads a public web page for the chat: product, prices, images, colours, text
 *   GET  /img?u=          a website's image, passed through (sites often refuse to be shown elsewhere)
 *
 * Every request needs the passcode (x-flicks-pass header). Daily caps limit spend if it leaks.
 * Secrets (set by the deploy action): ANTHROPIC_API_KEY, HIGGSFIELD_API_KEY (or HIGGSFIELD_KEY_ID + HIGGSFIELD_KEY_SECRET), PASSCODE.
 */

interface KV {
  get(key: string): Promise<string | null>
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>
  getWithMetadata<M>(key: string, type: "arrayBuffer"): Promise<{ value: ArrayBuffer | null; metadata: M | null }>
  put(key: string, value: string | ArrayBuffer, opts?: { expirationTtl?: number; metadata?: unknown }): Promise<void>
  list(opts: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>
}

export interface Env {
  ANTHROPIC_API_KEY?: string
  HIGGSFIELD_KEY_ID?: string
  HIGGSFIELD_KEY_SECRET?: string
  /** the single key open.higgsfield.ai gives (it holds the ID and secret, joined by a colon); preferred when set */
  HIGGSFIELD_API_KEY?: string
  PASSCODE?: string
  /** comma-separated origins allowed to call from a browser */
  ALLOWED_ORIGINS?: string
  DAILY_IMAGE_CAP?: string
  DAILY_CHAT_CAP?: string
  DAILY_VIDEO_CAP?: string
  /** Higgsfield image models that take images: the main one and the fallback */
  HF_IMAGE_REF_PATH?: string
  HF_IMAGE_EDIT_PATH?: string
  /** Higgsfield video model paths (text-to-video and image-to-video) */
  HF_VIDEO_PATH?: string
  HF_VIDEO_IMAGE_PATH?: string
  /** Higgsfield image model path, e.g. /higgsfield-ai/soul/standard */
  HF_IMAGE_PATH?: string
  /** Higgsfield API host, if a key needs a different one */
  HF_BASE?: string
  USAGE?: KV
}

const MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"]
const MAX_TOKENS = 4096
const ASPECTS = ["1:1", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "16:9", "9:16", "21:9"]
const VIDEO_ASPECTS = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]
const ANTHROPIC = "https://api.anthropic.com/v1/messages"
const HIGGSFIELD_DEFAULT = "https://api.higgsfield.ai"

export default {
  async fetch(req: Request, env: Env, ctx?: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const origin = req.headers.get("origin")
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    // browsers from other sites are turned away; scripts outside a browser still need the passcode
    if (origin && allowed.length && !allowed.includes(origin)) return json({ error: "origin_not_allowed" }, 403)
    const cors = corsHeaders(origin && (allowed.length === 0 || allowed.includes(origin)) ? origin : null)
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors })

    try {
      // images made here: public, so <img> and the video model can load them
      const file = new URL(req.url).pathname.match(/^\/file\/([\w-]{20,64})$/)
      if (req.method === "GET" && file) {
        const got = await env.USAGE?.getWithMetadata<{ type?: string }>(`file:${file[1]}`, "arrayBuffer")
        if (!got?.value) return json({ error: "not_found" }, 404, cors)
        return new Response(got.value, { headers: { ...cors, "access-control-allow-origin": "*", "content-type": got.metadata?.type ?? "image/png", "cache-control": "public, max-age=604800, immutable" } })
      }
      if (!env.PASSCODE) return json({ error: "server_not_set_up", message: "PASSCODE is not set" }, 500, cors)
      if (!same(req.headers.get("x-flicks-pass") ?? "", env.PASSCODE)) return json({ error: "wrong_passcode" }, 401, cors)

      const url = new URL(req.url)
      const day = new Date().toISOString().slice(0, 10)
      const caps = { images: num(env.DAILY_IMAGE_CAP, 50), chats: num(env.DAILY_CHAT_CAP, 500), videos: num(env.DAILY_VIDEO_CAP, 20) }
      // the library: every generation is recorded when it starts and copied here when it finishes
      // (Higgsfield deletes its copies after 7 days and can't list past requests)
      type Meta = { project?: string; variation?: string; purpose?: string }
      const started = async (kind: "image" | "video", id: string, prompt: string, model: string, meta: Meta = {}, refs: string[] = []) => {
        await env.USAGE?.put(`lib:${id}`, JSON.stringify({ id, kind, prompt, model, refs, ...pick(meta), created: Date.now(), saved: false }))
        return json({ id }, 200, cors)
      }
      const finished = (id: string, media?: string) => {
        if (media && ctx) ctx.waitUntil(keep(env, id, media).catch((e) => console.log("library save failed", id, String(e))))
      }

      if (req.method === "GET" && url.pathname === "/health") {
        return json(
          {
            ok: true,
            claude: !!env.ANTHROPIC_API_KEY,
            images: hasHf(env),
            videos: hasHf(env),
            // asks Higgsfield about a request that doesn't exist: 401 means the key is wrong
            images_key: hasHf(env) ? await hfKeyCheck(env) : "missing",
            models: MODELS,
            caps,
            used: { images: await count(env, `img:${day}`), chats: await count(env, `chat:${day}`), videos: await count(env, `vid:${day}`) },
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

      if (req.method === "POST" && url.pathname === "/upload") {
        if (!(await take(env, `up:${day}`, 300))) return json({ error: "daily_limit", what: "uploads" }, 429, cors)
        const type = (req.headers.get("content-type") ?? "").split(";")[0]
        if (!/^image\/(png|jpeg|webp|gif)$/.test(type)) return json({ error: "not_an_image" }, 400, cors)
        const bytes = await req.arrayBuffer()
        if (bytes.byteLength > 8_000_000) return json({ error: "too_large" }, 413, cors)
        const id = `up-${crypto.randomUUID()}`
        // kept for good and listed in the library, like everything made here
        await env.USAGE?.put(`file:${id}`, bytes, { metadata: { type } })
        const q = url.searchParams
        await env.USAGE?.put(`lib:${id}`, JSON.stringify({ id, kind: "image", prompt: (q.get("name") ?? "Uploaded image").slice(0, 200), model: "upload", refs: [], ...pick({ project: q.get("project") ?? undefined, purpose: "upload" }), created: Date.now(), saved: true, bytes: bytes.byteLength, type }))
        return json({ url: `${url.origin}/file/${id}` }, 200, cors)
      }

      if (req.method === "POST" && url.pathname === "/image") {
        if (!hasHf(env)) return json({ error: "images_not_set_up" }, 503, cors)
        const body = (await req.json()) as { prompt?: string; aspect_ratio?: string; image_urls?: string[]; meta?: Meta }
        const prompt = String(body.prompt ?? "").trim().slice(0, 2000)
        if (!prompt) return json({ error: "no_prompt" }, 400, cors)
        if (!(await take(env, `img:${day}`, caps.images))) return json({ error: "daily_limit", what: "images" }, 429, cors)
        const aspect = ASPECTS.includes(String(body.aspect_ratio)) ? String(body.aspect_ratio) : "1:1"
        const refs = (body.image_urls ?? []).filter((u) => typeof u === "string" && /^https:\/\//.test(u)).slice(0, 3)
        // with images: a model that keeps them (the product stays theirs; the prompt says what changes)
        if (refs.length) {
          const near = (list: string[]) => (list.includes(aspect) ? aspect : aspect === "4:5" || aspect === "2:3" ? "3:4" : aspect === "5:4" ? "4:3" : "1:1")
          const tries: [string, Record<string, unknown>][] = [
            [env.HF_IMAGE_REF_PATH || "/marketing-studio/image", { prompt, image_urls: refs, aspect_ratio: near(["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"]), resolution: "1k" }],
            [env.HF_IMAGE_EDIT_PATH || "/alibaba/qwen-image-3/edit", { prompt, image_urls: refs, aspect_ratio: near(["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"]), resolution: "1k" }],
          ]
          let lastRef = { status: 0, text: "" }
          for (const [path, payload] of tries) {
            const res = await hf(env, hfBase(env) + path, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(payload) })
            const text = await res.text()
            let out: { request_id?: string } = {}
            try {
              out = JSON.parse(text)
            } catch {
              /* not JSON */
            }
            if (res.ok && out.request_id) return started("image", out.request_id, prompt, path, body.meta, refs)
            lastRef = { status: res.status, text }
            console.log("higgsfield reference image failed", path, res.status, text.slice(0, 300))
            if ([401, 402, 403, 429].includes(res.status)) return json({ error: "image_error", status: res.status, message: hfMessage(res.status, text) }, 502, cors)
          }
          return json({ error: "image_error", status: lastRef.status, message: hfMessage(lastRef.status, lastRef.text) }, 502, cors)
        }
        // the configured model first, then the documented ones; a model that rejects aspect_ratio gets the prompt alone
        const paths = [...new Set([env.HF_IMAGE_PATH, "/higgsfield-ai/soul/v2/standard", "/higgsfield-ai/soul/standard"].filter((p): p is string => !!p))]
        let last = { status: 0, text: "" }
        for (const path of paths) {
          for (const payload of [{ prompt, aspect_ratio: aspect }, { prompt }]) {
            const res = await hf(env, hfBase(env) + path, {
              method: "POST",
              headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
              body: JSON.stringify(payload),
            })
            const text = await res.text()
            let out: { request_id?: string } = {}
            try {
              out = JSON.parse(text)
            } catch {
              /* not JSON */
            }
            if (res.ok && out.request_id) return started("image", out.request_id, prompt, path, body.meta)
            last = { status: res.status, text }
            console.log("higgsfield submit failed", path, Object.keys(payload).join("+"), res.status, text.slice(0, 300))
            // auth, balance and rate problems won't change with another model or payload
            if ([401, 402, 403, 429].includes(res.status)) return json({ error: "image_error", status: res.status, message: hfMessage(res.status, text) }, 502, cors)
            if (res.status === 404) break
          }
        }
        return json({ error: "image_error", status: last.status, message: hfMessage(last.status, last.text) }, 502, cors)
      }

      if (req.method === "POST" && url.pathname === "/read") {
        if (!(await take(env, `chat:${day}`, caps.chats))) return json({ error: "daily_limit", what: "chat" }, 429, cors)
        const body = (await req.json()) as { url?: string }
        const target = safeUrl(body.url)
        if (!target) return json({ error: "bad_url", message: "That isn't a public web address." }, 400, cors)
        return json(await readSite(target), 200, cors)
      }

      // a website's image, passed through: other sites often refuse to show their images elsewhere
      if (req.method === "GET" && url.pathname === "/img") {
        const target = safeUrl(url.searchParams.get("u") ?? undefined)
        if (!target) return json({ error: "bad_url" }, 400, cors)
        const res = await fetch(target, { headers: { "user-agent": UA, accept: "image/*" }, redirect: "follow" })
        const type = res.headers.get("content-type") ?? ""
        if (!res.ok || !type.startsWith("image/")) return json({ error: "not_an_image", status: res.status }, 502, cors)
        const len = Number(res.headers.get("content-length") ?? 0)
        if (len > 8_000_000) return json({ error: "too_large" }, 413, cors)
        return new Response(res.body, { headers: { ...cors, "content-type": type, "cache-control": "public, max-age=86400" } })
      }

      const m = url.pathname.match(/^\/image\/([\w-]{8,64})$/)

      if (req.method === "POST" && url.pathname === "/video") {
        if (!hasHf(env)) return json({ error: "videos_not_set_up" }, 503, cors)
        const body = (await req.json()) as { prompt?: string; aspect_ratio?: string; duration?: number; image_url?: string; meta?: Meta }
        const prompt = String(body.prompt ?? "").trim().slice(0, 2000)
        if (!prompt) return json({ error: "no_prompt" }, 400, cors)
        if (!(await take(env, `vid:${day}`, caps.videos))) return json({ error: "daily_limit", what: "videos" }, 429, cors)
        const aspect = VIDEO_ASPECTS.includes(String(body.aspect_ratio)) ? String(body.aspect_ratio) : "16:9"
        const duration = Math.max(4, Math.min(15, Math.round(Number(body.duration) || 8)))
        const image = body.image_url && /^https:\/\//.test(body.image_url) ? body.image_url : undefined
        // 720p only, no sound: Flicks play muted
        const payload = { prompt, duration, resolution: "720p", generate_audio: false, ...(image ? { image_url: image } : { aspect_ratio: aspect }) }
        const path = image ? env.HF_VIDEO_IMAGE_PATH || "/bytedance/seedance-2.5/image-to-video" : env.HF_VIDEO_PATH || "/bytedance/seedance-2.5/text-to-video"
        const res = await hf(env, hfBase(env) + path, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(payload) })
        const text = await res.text()
        let out: { request_id?: string } = {}
        try {
          out = JSON.parse(text)
        } catch {
          /* not JSON */
        }
        if (res.ok && out.request_id) return started("video", out.request_id, prompt, path, body.meta, image ? [image] : [])
        console.log("higgsfield video submit failed", path, res.status, text.slice(0, 300))
        return json({ error: "video_error", status: res.status, message: hfMessage(res.status, text) }, 502, cors)
      }

      const v = url.pathname.match(/^\/video\/([\w-]{8,64})$/)
      if (req.method === "GET" && v) {
        const res = await hf(env, `${hfBase(env)}/requests/${v[1]}/status`)
        const text = await res.text()
        if (!res.ok) return json({ error: "video_error", status: res.status, message: hfMessage(res.status, text) }, 502, cors)
        let out: Record<string, unknown> = {}
        try {
          out = JSON.parse(text)
        } catch {
          /* not JSON */
        }
        const urls = urlsIn(out)
        const video = urls.find((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u)) ?? urlsIn(out.video)[0]
        const poster = urls.find((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u))
        if (out.status === "completed" && !video) console.log("higgsfield video completed without a url", text.slice(0, 400))
        if (out.status === "completed") finished(v[1], video)
        return json({ status: out.status ?? "unknown", url: video, poster }, 200, cors)
      }

      // saved app data, so projects and chats survive a reload and follow you to other devices
      const st = url.pathname.match(/^\/store\/(state|chat-[\w-]{4,80})$/)
      if (st && req.method === "GET") return new Response((await env.USAGE?.get(`store:${st[1]}`)) ?? "null", { headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" } })
      if (st && req.method === "PUT") {
        const text = await req.text()
        if (text.length > 20_000_000) return json({ error: "too_large" }, 413, cors)
        try {
          JSON.parse(text)
        } catch {
          return json({ error: "not_json" }, 400, cors)
        }
        await env.USAGE?.put(`store:${st[1]}`, text)
        return json({ ok: true }, 200, cors)
      }

      if (req.method === "GET" && url.pathname === "/library") {
        const keys: string[] = []
        let cursor: string | undefined
        do {
          const page = await env.USAGE!.list({ prefix: "lib:", limit: 1000, cursor })
          keys.push(...page.keys.map((k) => k.name))
          cursor = page.list_complete ? undefined : page.cursor
        } while (cursor && keys.length < 5000)
        const items = (await Promise.all(keys.map((k) => env.USAGE!.get(k)))).flatMap((x) => (x ? [JSON.parse(x) as { created: number; id: string; saved?: boolean }] : []))
        items.sort((a, b) => b.created - a.created)
        return json({ items: items.map((x) => ({ ...x, file: x.saved ? `${url.origin}/file/${x.id}` : undefined })) }, 200, cors)
      }

      if (req.method === "POST" && url.pathname === "/library/import") {
        const body = (await req.json()) as { items?: { url?: string; kind?: string; prompt?: string; name?: string; created?: number }[] }
        const done: string[] = []
        for (const it of (body.items ?? []).slice(0, 20)) {
          const target = safeUrl(it.url)
          if (!target) continue
          const id = `imp-${(await sha(target)).slice(0, 24)}`
          if (await env.USAGE?.get(`lib:${id}`)) continue
          await env.USAGE?.put(`lib:${id}`, JSON.stringify({ id, kind: it.kind === "image" ? "image" : "video", prompt: it.prompt ?? it.name ?? "", model: "imported", refs: [], created: it.created || Date.now(), saved: false }))
          try {
            await keep(env, id, target)
            done.push(id)
          } catch (e) {
            console.log("import failed", target, String(e))
          }
        }
        return json({ imported: done.length }, 200, cors)
      }

      // a generated video passed through, so the app can take a frame from it for the poster
      if (req.method === "GET" && url.pathname === "/media") {
        const target = safeUrl(url.searchParams.get("u") ?? undefined)
        if (!target || !/(^|\.)(higgsfield\.ai|cloudfront\.net|amazonaws\.com|r2\.dev)$/.test(new URL(target).hostname)) return json({ error: "bad_url" }, 400, cors)
        const res = await fetch(target, { redirect: "follow" })
        const type = res.headers.get("content-type") ?? ""
        if (!res.ok || !(type.startsWith("video/") || type === "application/octet-stream")) return json({ error: "not_a_video", status: res.status }, 502, cors)
        return new Response(res.body, { headers: { ...cors, "content-type": type.startsWith("video/") ? type : "video/mp4", "cache-control": "public, max-age=86400" } })
      }

      if (req.method === "GET" && m) {
        if (!hasHf(env)) return json({ error: "images_not_set_up" }, 503, cors)
        const res = await hf(env, `${hfBase(env)}/requests/${m[1]}/status`)
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
        const url = out.images?.[0]?.url ?? out.image?.url ?? out.output?.[0]?.url ?? urlsIn(out).find((u) => /\.(png|jpe?g|webp)(\?|$)/i.test(u))
        if (out.status === "completed" && !url) console.log("higgsfield completed without an image url", text.slice(0, 300))
        if (out.status === "completed") finished(m[1], url)
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
        "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
        "access-control-allow-headers": "content-type, x-flicks-pass",
        "access-control-max-age": "86400",
        vary: "origin",
      }
    : {}
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "content-type": "application/json" } })
}

/** a readable reason for a Higgsfield failure (codes per docs.higgsfield.ai: 401 bad key, 403 no balance) */
function hfMessage(status: number, text: string) {
  let detail = ""
  try {
    const d = (JSON.parse(text) as { detail?: unknown }).detail
    detail = typeof d === "string" ? d : d ? JSON.stringify(d).slice(0, 160) : ""
  } catch {
    detail = text.slice(0, 160)
  }
  const said = detail ? ` (Higgsfield: "${detail}")` : ""
  if (status === 401) return `Higgsfield didn't accept the key. Put the whole key from open.higgsfield.ai in the HIGGSFIELD_API_KEY secret, then re-run the AI server workflow.${said}`
  if (status === 403 || status === 402) return `The Higgsfield API account has no balance. Add funds in console.higgsfield.ai, then try again.${said}`
  if (status === 429) return `Higgsfield is rate limiting. Try again in a minute.${said}`
  return `Higgsfield answered ${status || "nothing"}${said || `: ${text.slice(0, 160)}`}`
}

async function hfKeyCheck(env: Env) {
  try {
    const res = await hf(env, `${hfBase(env)}/requests/00000000-0000-0000-0000-000000000000/status`)
    return res.status === 401 ? "invalid" : "ok"
  } catch {
    return "unknown"
  }
}

/**
 * The Higgsfield credential, however it was set: one combined key (id:secret), or the ID and
 * secret separately. Trimmed: a pasted key often carries a stray space or newline.
 */
function hfKey(env: Env) {
  const one = env.HIGGSFIELD_API_KEY?.trim()
  const id = env.HIGGSFIELD_KEY_ID?.trim()
  const secret = env.HIGGSFIELD_KEY_SECRET?.trim()
  if (one) return one
  if (id?.includes(":")) return id
  if (secret?.includes(":")) return secret
  return id && secret ? `${id}:${secret}` : (id ?? secret ?? "")
}
const hfBase = (env: Env) => (env.HF_BASE?.trim() || HIGGSFIELD_DEFAULT).replace(/\/+$/, "")
const hfAuth = (env: Env, scheme: "Key" | "Bearer" = "Key") => ({ authorization: `${scheme} ${hfKey(env)}` })
const hasHf = (env: Env) => !!hfKey(env)
/** a Higgsfield call; a key the documented "Key" scheme refuses is tried once as a Bearer token */
async function hf(env: Env, url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), ...hfAuth(env) } })
  if (res.status !== 401) return res
  const again = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), ...hfAuth(env, "Bearer") } })
  return again.status === 401 ? res : again
}
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

/* ---------- reading a website ---------- */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 FlicksBot/1.0"

/** only public http(s) pages: no local, private or metadata addresses */
export function safeUrl(raw?: string) {
  try {
    const u = new URL(String(raw ?? "").trim().replace(/^(?!https?:\/\/)/i, "https://"))
    if (!/^https?:$/.test(u.protocol)) return null
    const h = u.hostname.toLowerCase()
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".")) return null
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.startsWith("[")) return null
    return u.toString()
  } catch {
    return null
  }
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim()

/** what the chat needs from a page: product, prices, images, brand colour and the page's words */
export async function readSite(target: string) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12_000)
  let res: Response
  try {
    res = await fetch(target, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en" }, redirect: "follow", signal: ctrl.signal })
  } catch {
    return { ok: false, url: target, reason: "The site didn't answer." }
  } finally {
    clearTimeout(t)
  }
  if (!res.ok) return { ok: false, url: target, reason: `The site answered ${res.status}${res.status === 403 || res.status === 429 || res.status === 503 ? " (it blocks automated visitors)" : ""}.` }
  if (!(res.headers.get("content-type") ?? "").includes("html")) return { ok: false, url: target, reason: "That address isn't a web page." }
  const html = (await res.text()).slice(0, 2_000_000)
  const base = res.url || target
  const abs = (u?: string) => {
    if (!u) return undefined
    try {
      return new URL(decode(u), base).toString()
    } catch {
      return undefined
    }
  }
  const meta = (key: string) => {
    const r = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*>`, "i").exec(html)?.[0]
    return r ? decode(/content=["']([^"']*)["']/i.exec(r)?.[1] ?? "") || undefined : undefined
  }
  // structured product data, when the page has it
  const products: Record<string, unknown>[] = []
  let org: Record<string, unknown> | undefined
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim())
      const walk = (x: unknown): void => {
        if (Array.isArray(x)) return x.forEach(walk)
        if (!x || typeof x !== "object") return
        const o = x as Record<string, unknown>
        const type = ([] as unknown[]).concat(o["@type"] ?? []).map(String)
        if (type.includes("Product")) products.push(o)
        if (type.includes("Organization") && !org) org = o
        if (o["@graph"]) walk(o["@graph"])
        if (type.includes("ProductGroup") && o.hasVariant) walk(o.hasVariant)
      }
      walk(data)
    } catch {
      /* broken JSON-LD */
    }
  }
  const imgsOf = (x: unknown): string[] => (Array.isArray(x) ? x.flatMap(imgsOf) : typeof x === "string" ? [x] : x && typeof x === "object" ? imgsOf((x as { url?: unknown }).url) : [])
  const offer = (p: Record<string, unknown>) => {
    const o = ([] as unknown[]).concat(p.offers ?? [])[0] as Record<string, unknown> | undefined
    const price = o?.price ?? o?.lowPrice
    return price !== undefined ? `${o?.priceCurrency ?? ""} ${price}`.trim() : undefined
  }
  const productList = products.slice(0, 8).map((p) => ({
    name: typeof p.name === "string" ? decode(p.name) : undefined,
    price: offer(p),
    color: typeof p.color === "string" ? p.color : undefined,
    description: typeof p.description === "string" ? decode(p.description).slice(0, 300) : undefined,
    url: abs(typeof p.url === "string" ? p.url : undefined),
    images: imgsOf(p.image).map(abs).filter(Boolean).slice(0, 4) as string[],
  }))
  // images: share image, product images, then large page images
  const pageImgs = [...html.matchAll(/<img[^>]+>/gi)]
    .map((m) => {
      const tag = m[0]
      const src = /\s(?:data-src|src)=["']([^"']+)["']/i.exec(tag)?.[1] ?? /\ssrcset=["']([^"',\s]+)/i.exec(tag)?.[1]
      const w = Number(/\swidth=["']?(\d+)/i.exec(tag)?.[1] ?? 0)
      const alt = decode(/\salt=["']([^"']*)["']/i.exec(tag)?.[1] ?? "")
      return { src: abs(src), w, alt }
    })
    .filter((i) => i.src && !/\.svg(\?|$)|sprite|pixel|tracking|logo|icon|favicon|\/ads?\//i.test(i.src) && (i.w === 0 || i.w >= 200))
  const images = [
    ...new Set(
      [abs(meta("og:image") ?? meta("twitter:image")), ...productList.flatMap((p) => p.images), ...pageImgs.map((i) => i.src)].filter((x): x is string => !!x && /^https?:/.test(x)),
    ),
  ].slice(0, 12)
  const logo = abs(typeof org?.logo === "string" ? org.logo : imgsOf(org?.logo)[0]) ?? abs(/<link[^>]+rel=["'](?:apple-touch-icon|icon)["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1])
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).slice(0, 2500)
  return {
    ok: true,
    url: base,
    site: meta("og:site_name") ?? new URL(base).hostname.replace(/^www\./, ""),
    title: meta("og:title") ?? decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ""),
    description: meta("og:description") ?? meta("description"),
    price: meta("product:price:amount") ? `${meta("product:price:currency") ?? ""} ${meta("product:price:amount")}`.trim() : productList.find((p) => p.price)?.price,
    theme_color: meta("theme-color"),
    logo,
    products: productList,
    images,
    text,
  }
}

/** every https address anywhere in a JSON value, in order */
function urlsIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") {
    if (/^https:\/\//.test(v)) out.push(v)
  } else if (Array.isArray(v)) v.forEach((x) => urlsIn(x, out))
  else if (v && typeof v === "object") Object.values(v).forEach((x) => urlsIn(x, out))
  return out
}

const pick = (m: { project?: string; variation?: string; purpose?: string }) =>
  Object.fromEntries(Object.entries(m ?? {}).filter(([k, v]) => ["project", "variation", "purpose"].includes(k) && typeof v === "string").map(([k, v]) => [k, (v as string).slice(0, 120)]))

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

/** copies a finished image or video into our storage (once), and marks it saved in the library */
async function keep(env: Env, id: string, media: string) {
  const raw = await env.USAGE?.get(`lib:${id}`)
  if (!raw) return
  const entry = JSON.parse(raw) as Record<string, unknown>
  if (entry.saved) return
  const res = await fetch(media, { redirect: "follow" })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const bytes = await res.arrayBuffer()
  // a stored value can be at most 25 MB
  if (bytes.byteLength > 24_000_000) throw new Error("too large to keep")
  const type = res.headers.get("content-type") ?? (entry.kind === "video" ? "video/mp4" : "image/png")
  await env.USAGE?.put(`file:${id}`, bytes, { metadata: { type } })
  await env.USAGE?.put(`lib:${id}`, JSON.stringify({ ...entry, saved: true, bytes: bytes.byteLength, type, source: media }))
}
