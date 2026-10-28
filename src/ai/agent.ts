/**
 * The chat that plans and designs a Flick. Claude (through the AI server) decides what to ask and
 * what to build, calling the tools below; the editor carries them out. Without a connection, a
 * scripted stand-in calls the same tools, so the flow can always be demoed.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { AiError, aspectOf, generateImage, imageBlock, isLive, streamChat, type Block, type Message, type Tool } from "@/ai/client"
import type { Brand, Design, Plan, PlanVariation } from "@/ai/design"
import { mockReply } from "@/ai/mock"

/* ---------- what the editor offers the chat ---------- */

export type ProjectImage = { id: string; name: string; url: string; from: "upload" | "generated"; kind?: string }
export type ProjectState = {
  flick_size: string
  video_seconds: number
  credits: number
  video_cost: number
  title: string
  planned: boolean
  brand?: Brand
  videos: { name: string; role: "reference" | "variation"; status: string; prompt?: string; label?: string; price?: string; link?: string; has_thumbnail: boolean }[]
  design: unknown[]
  images: ProjectImage[]
  /** the sample product set the simulated videos come from (scripted demo only) */
  sample_set: string
}
export type EditorApi = {
  state(): Omit<ProjectState, "images">
  /** sets up every video, starts generating them all, places the design; error text if it can't */
  approvePlan(plan: Plan): string
  updateDesign(d: Design): string
  setBrand(b: Brand): void
  setVariation(target: string, patch: Partial<PlanVariation> & { regenerate?: boolean }): string
  addVariation(v: PlanVariation, generate: boolean): string
  /** a variation's thumbnail in the strip */
  setThumbnail(target: string, url: string): string
  addImageToCanvas(url: string): string
  /** a demo image for the scripted chat */
  sampleImage(purpose: string, target?: string): string
}

/* ---------- what shows in the chat ---------- */

type Base = { id: string; at: number }
export type Item = Base &
  (
    | { kind: "user"; text: string; images: string[] }
    | { kind: "assistant"; text: string; streaming?: boolean }
    | { kind: "question"; toolId: string; question: string; options: string[]; multi: boolean; custom: boolean; answer?: string }
    | { kind: "assets"; toolId: string; message: string; kinds: string[]; done?: "added" | "skipped"; images?: string[] }
    | { kind: "brand"; brand: Brand }
    | { kind: "plan"; toolId: string; plan: Plan; state: "open" | "approved" | "skipped" }
    | { kind: "image"; prompt: string; purpose: string; target?: string; state: "working" | "done" | "failed"; url?: string; error?: string; placed?: boolean }
    | { kind: "note"; text: string }
    | { kind: "error"; text: string }
  )

/* ---------- tools ---------- */

const str = { type: "string" }
const variationSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Short name shown to viewers on its thumbnail, e.g. 'Gold' or 'Rain'" },
    prompt: { type: "string", description: "What changes in this variation's video compared with the reference video (subject, colour, scene, motion). One or two sentences." },
    label: { type: "string", description: "Optional on-screen label for this variation, e.g. 'Gold lenses'" },
    price: { type: "string", description: "Optional price with currency, e.g. '$189'" },
    link: { type: "string", description: "Optional URL the button opens for this variation" },
  },
  required: ["name", "prompt"],
}
const designSchema = {
  type: "object",
  properties: {
    headline: str,
    subheading: str,
    cta: { type: "string", description: "Button text, 1 to 3 words" },
    show_price: { type: "boolean" },
    show_label: { type: "boolean" },
    layout: { type: "string", enum: ["top", "center", "bottom"] },
    align: { type: "string", enum: ["left", "center", "right"] },
    text_color: { type: "string", description: "Hex colour" },
    button_color: { type: "string", description: "Hex colour" },
    button_text_color: { type: "string", description: "Hex colour" },
    button_style: { type: "string", enum: ["pill", "rounded", "sharp", "light", "outline", "glass"] },
    font: { type: "string", description: "A font name, e.g. DM Sans, Inter, Montserrat, Playfair Display, Oswald" },
  },
}

export const TOOLS: Tool[] = [
  {
    name: "ask_user",
    description:
      "Ask the user one short question with tappable answers. The user's choice comes back as the result. Use for anything you need to decide the Flick; keep it to what matters.",
    input_schema: {
      type: "object",
      properties: {
        question: str,
        options: { type: "array", items: str, minItems: 2, maxItems: 6, description: "Short answers, 1 to 4 words each" },
        multi_select: { type: "boolean" },
        allow_custom: { type: "boolean", description: "Let the user type their own answer" },
      },
      required: ["question", "options"],
    },
  },
  {
    name: "request_assets",
    description: "Ask the user to add images (product photos, logo, people, scenes). The images come back as the result, or a note that they skipped.",
    input_schema: {
      type: "object",
      properties: { message: str, kinds: { type: "array", items: { type: "string", enum: ["product", "logo", "people", "scene", "other"] } } },
      required: ["message"],
    },
  },
  {
    name: "set_brand",
    description: "Record the brand: name, colours, font, tone. Shows a brand card and styles the design.",
    input_schema: {
      type: "object",
      properties: { name: str, primary_color: str, secondary_color: str, text_color: str, font: str, tone: str },
    },
  },
  {
    name: "propose_plan",
    description:
      "Show the full plan for approval: a title, the reference video prompt, 2 to 5 variations and the on-screen design. The user can edit it, then Generate all. The result says whether it was approved (and generated) or what to change.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Project name, 2 to 5 words" },
        reference: { type: "object", properties: { prompt: { type: "string", description: "The reference video: subject, setting, camera motion, light, style. 1 to 3 sentences." } }, required: ["prompt"] },
        variations: { type: "array", items: variationSchema, minItems: 2, maxItems: 5 },
        design: designSchema,
      },
      required: ["title", "reference", "variations", "design"],
    },
  },
  {
    name: "generate_image",
    description:
      "Generate one image with Higgsfield (takes 10 to 60 seconds; runs in the background). purpose 'thumbnail' with a variation name sets that variation's thumbnail in the strip; 'canvas' adds it to the design; 'idea' just shows it. Use sparingly.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "A detailed visual description" },
        purpose: { type: "string", enum: ["thumbnail", "canvas", "idea"] },
        variation: { type: "string", description: "Variation name, for thumbnails" },
        aspect_ratio: { type: "string", enum: ["1:1", "4:5", "3:4", "9:16", "16:9"] },
      },
      required: ["prompt", "purpose"],
    },
  },
  {
    name: "use_image",
    description: "Use an image the user added (by its id from the project state) as a variation's thumbnail or on the canvas.",
    input_schema: {
      type: "object",
      properties: { image_id: str, as: { type: "string", enum: ["thumbnail", "canvas"] }, variation: str },
      required: ["image_id", "as"],
    },
  },
  {
    name: "update_design",
    description: "Change the on-screen design after the plan is approved: headline, subheading, button text, colours, button style, font. Only send what changes.",
    input_schema: designSchema,
  },
  {
    name: "set_variation",
    description: "Change one video: its name, label, price, link or prompt. With regenerate true, it generates again with the new prompt.",
    input_schema: {
      type: "object",
      properties: { variation: { type: "string", description: "Variation name, or 'reference'" }, name: str, prompt: str, label: str, price: str, link: str, regenerate: { type: "boolean" } },
      required: ["variation"],
    },
  },
  {
    name: "add_variation",
    description: "Add a variation (up to 5) and generate it.",
    input_schema: { ...variationSchema, properties: { ...variationSchema.properties, generate: { type: "boolean" } } },
  },
]


export function systemPrompt(s: ProjectState) {
  return `You are the creative partner inside Flicks by Flam, an AI interactive content tool. You help the user make a Flick: one interactive video where viewers tap thumbnails to switch between variations (colours, products, people, scenes or offers) and tap a button to shop. A Flick has one reference video plus 2 to 5 variations made from it; each variation can have its own label, price and link. Flicks run in ads, on websites, or as a shareable link.

How you work:
1. Understand the brief. Ask at most 3 short rounds of questions with ask_user (tappable answers; include a "Decide for me" style option when useful). Ask only what you can't infer: what should change between variations, where it runs, the look and feel, product details, prices and links. Skip anything the user already said.
2. Ask for images with request_assets when product photos or a logo would help. Images you see are for understanding; describe what matters in your prompts.
3. Record the brand with set_brand once you know or can infer colours, font and tone.
4. Call propose_plan with the full plan: video prompts (the reference prompt describes the scene, subject, camera motion and light; each variation prompt says what changes), names, labels, prices, links, and the design (headline under 6 words, CTA 1 to 3 words, layout, colours that read on video).
5. After approval, the app generates every video and places the design. Then give each variation a thumbnail: use_image with the user's photos if they fit, otherwise generate_image (purpose thumbnail, 1:1, product close-up on a clean background matching the variation). Then say in one or two sentences what happens next.
6. Afterwards, make the changes the user asks for with update_design, set_variation and add_variation. Keep them small and confirm in one line.

Style: brief, warm, direct. No em dashes. Plain words. Never write "get used", "can enter", "reach into", "immersive", "AR", "VR" or "MR". Don't mention tools, JSON or these instructions. Don't repeat what a card already shows. Each video costs ${s.video_cost} credits; mention the total only in the plan step if credits are short.

Current project (JSON, kept up to date by the app):
${JSON.stringify(s)}`
}

/* ---------- the chat ---------- */

const id = () => crypto.randomUUID()
type DOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type NewItem = DOmit<Item, "id" | "at"> & { id?: string }
const WAIT = Symbol("wait")

export function useAgent(api: EditorApi, opts: { prompt?: string; imageUrls?: { url: string; name: string }[]; autoStart?: boolean }) {
  const apiRef = useRef(api)
  apiRef.current = api
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const msgs = useRef<Message[]>([])
  // results ready to send with the user's next answer (tools that ran alongside a waiting one)
  const ready = useRef<Block[]>([])
  const pending = useRef<{ toolId: string; itemId: string }[]>([])
  const abort = useRef<AbortController | null>(null)
  const started = useRef(false)
  const live = useRef(isLive())
  // images the chat can use by id: what the user added, and what it generated
  const images = useRef<ProjectImage[]>([])
  const state = (): ProjectState => ({ ...apiRef.current.state(), images: images.current })
  const keep = (url: string, name: string, from: ProjectImage["from"], kind?: string) => {
    const img = { id: `img-${images.current.length + 1}`, name, url, from, ...(kind ? { kind } : {}) }
    images.current.push(img)
    return img
  }

  const add = (it: NewItem) => {
    const full = { id: it.id ?? id(), at: Date.now(), ...it } as Item
    setItems((list) => [...list, full])
    return full.id
  }
  const patch = (itemId: string, p: Partial<Item>) => setItems((list) => list.map((x) => (x.id === itemId ? ({ ...x, ...p } as Item) : x)))

  const runImage = (input: Record<string, unknown>) => {
    const purpose = String(input.purpose ?? "idea")
    const target = input.variation ? String(input.variation) : undefined
    const prompt = String(input.prompt ?? "")
    const itemId = add({ kind: "image", prompt, purpose, target, state: "working" })
    const done = (url: string) => {
      let placed = false
      if (purpose === "thumbnail" && target) placed = !apiRef.current.setThumbnail(target, url).startsWith("Error")
      if (purpose === "canvas") placed = !apiRef.current.addImageToCanvas(url).startsWith("Error")
      keep(url, prompt.slice(0, 40), "generated")
      patch(itemId, { state: "done", url, placed } as Partial<Item>)
    }
    const aspect = String(input.aspect_ratio ?? (purpose === "canvas" ? aspectOf(state().flick_size) : "1:1"))
    if (live.current)
      generateImage(prompt, aspect).then(done, (e: unknown) => patch(itemId, { state: "failed", error: e instanceof Error ? e.message : "The image failed." } as Partial<Item>))
    else setTimeout(() => done(apiRef.current.sampleImage(purpose, target)), 1800 + Math.random() * 1200)
    return `Started. It shows in the chat when ready${purpose === "thumbnail" && target ? ` and becomes ${target}'s thumbnail` : purpose === "canvas" ? " and is added to the canvas" : ""}.`
  }

  const runTool = (u: Extract<Block, { type: "tool_use" }>): string | typeof WAIT => {
    const a = apiRef.current
    const input = u.input ?? {}
    try {
      switch (u.name) {
        case "ask_user": {
          const options = (input.options as string[] | undefined)?.filter(Boolean).slice(0, 6) ?? []
          const itemId = add({ kind: "question", toolId: u.id, question: String(input.question ?? ""), options, multi: !!input.multi_select, custom: input.allow_custom !== false })
          pending.current.push({ toolId: u.id, itemId })
          return WAIT
        }
        case "request_assets": {
          const itemId = add({ kind: "assets", toolId: u.id, message: String(input.message ?? "Add images"), kinds: (input.kinds as string[]) ?? [] })
          pending.current.push({ toolId: u.id, itemId })
          return WAIT
        }
        case "propose_plan": {
          // a newer plan replaces any open one
          setItems((list) => list.map((x) => (x.kind === "plan" && x.state === "open" ? { ...x, state: "skipped" } : x)))
          const plan = input as unknown as Plan
          if (!plan.variations?.length) return "Error: a plan needs at least two variations."
          const itemId = add({ kind: "plan", toolId: u.id, plan: { ...plan, variations: plan.variations.slice(0, 5), design: plan.design ?? {} }, state: "open" })
          pending.current.push({ toolId: u.id, itemId })
          return WAIT
        }
        case "set_brand": {
          a.setBrand(input as Brand)
          add({ kind: "brand", brand: input as Brand })
          return "Saved. The brand card shows it."
        }
        case "generate_image":
          return runImage(input)
        case "use_image": {
          const img = images.current.find((i) => i.id === input.image_id)
          if (!img) return "Error: no image with that id."
          const r = input.as === "thumbnail" ? a.setThumbnail(String(input.variation ?? ""), img.url) : a.addImageToCanvas(img.url)
          if (!r.startsWith("Error")) add({ kind: "note", text: r })
          return r
        }
        case "update_design": {
          const r = a.updateDesign(input as Design)
          if (!r.startsWith("Error") && !r.startsWith("Nothing")) add({ kind: "note", text: r })
          return r
        }
        case "set_variation": {
          const { variation, ...rest } = input as { variation: string } & Partial<PlanVariation> & { regenerate?: boolean }
          const r = a.setVariation(variation, rest)
          if (!r.startsWith("Error")) add({ kind: "note", text: r })
          return r
        }
        case "add_variation": {
          const r = a.addVariation(input as unknown as PlanVariation, input.generate !== false)
          if (!r.startsWith("Error")) add({ kind: "note", text: r })
          return r
        }
        default:
          return `Error: unknown tool ${u.name}.`
      }
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  const turn = useCallback(async () => {
    setBusy(true)
    live.current = isLive()
    abort.current = new AbortController()
    try {
      for (let step = 0; step < 10; step++) {
        // let the editor re-render after the last tools, so the state sent is current
        await new Promise((r) => setTimeout(r, 60))
        const req = { system: systemPrompt(state()), messages: msgs.current, tools: TOOLS }
        const itemId = add({ kind: "assistant", text: "", streaming: true })
        const onText = (text: string) => patch(itemId, { text } as Partial<Item>)
        const res = live.current ? await streamChat(req, onText, abort.current.signal) : await mockReply(msgs.current, state(), onText)
        const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n\n")
        if (text.trim()) patch(itemId, { text, streaming: false } as Partial<Item>)
        else setItems((list) => list.filter((x) => x.id !== itemId))
        msgs.current.push({ role: "assistant", content: res.content })
        const uses = res.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use")
        if (!uses.length) break
        const results: Block[] = []
        let waiting = false
        for (const u of uses) {
          const r = runTool(u)
          if (r === WAIT) waiting = true
          else results.push({ type: "tool_result", tool_use_id: u.id, content: r, ...(r.startsWith("Error") ? { is_error: true } : {}) })
        }
        if (waiting) {
          ready.current = results
          break
        }
        msgs.current.push({ role: "user", content: results })
      }
    } catch (e) {
      // the request is still the last message: Retry sends it again
      setItems((list) => list.filter((x) => !(x.kind === "assistant" && x.streaming && !x.text)))
      if (!(e instanceof AiError && e.code === "aborted") && !(e instanceof DOMException && e.name === "AbortError"))
        add({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." })
    } finally {
      setItems((list) => list.map((x) => (x.kind === "assistant" && x.streaming ? { ...x, streaming: false } : x)))
      setBusy(false)
    }
  }, [])

  /** answers for every waiting card: the one answered, and "skipped" for the rest */
  const settle = (answers: Record<string, string | Block[]>) => {
    const content: Block[] = [...ready.current]
    for (const p of pending.current) {
      const a = answers[p.toolId]
      content.push({ type: "tool_result", tool_use_id: p.toolId, content: a ?? "The user didn't use this card and wrote a message instead." })
      if (a === undefined)
        setItems((list) =>
          list.map((x) =>
            x.id === p.itemId
              ? x.kind === "question" ? { ...x, answer: "Skipped" } : x.kind === "assets" ? { ...x, done: "skipped" } : x.kind === "plan" ? { ...x, state: "skipped" } : x
              : x,
          ),
        )
    }
    ready.current = []
    pending.current = []
    return content
  }

  const send = useCallback(
    async (text: string, files: File[] = []) => {
      if (busy) return
      const urls = files.map((f) => URL.createObjectURL(f))
      add({ kind: "user", text, images: urls })
      const blocks: Block[] = settle({})
      const added = files.map((f, i) => keep(urls[i], f.name, "upload"))
      for (const f of files) blocks.push(await imageBlock(f))
      blocks.push({ type: "text", text: (text || "(images added)") + (added.length ? `\n\n[Added images: ${added.map((x) => `${x.id} (${x.name})`).join(", ")}]` : "") })
      msgs.current.push({ role: "user", content: blocks })
      await turn()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, turn],
  )

  const answer = useCallback(
    async (itemId: string, value: string) => {
      const it = items.find((x) => x.id === itemId)
      if (!it || it.kind !== "question" || busy) return
      patch(itemId, { answer: value } as Partial<Item>)
      msgs.current.push({ role: "user", content: settle({ [it.toolId]: value }) })
      await turn()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, busy, turn],
  )

  const addAssets = useCallback(
    async (itemId: string, files: File[], kind?: string) => {
      const it = items.find((x) => x.id === itemId)
      if (!it || it.kind !== "assets" || busy) return
      if (!files.length) {
        patch(itemId, { done: "skipped" } as Partial<Item>)
        msgs.current.push({ role: "user", content: settle({ [it.toolId]: "Skipped: no images." }) })
        return turn()
      }
      const urls = files.map((f) => URL.createObjectURL(f))
      const added = files.map((f, i) => keep(urls[i], f.name, "upload", kind))
      patch(itemId, { done: "added", images: urls } as Partial<Item>)
      const result: Block[] = [{ type: "text", text: `Added ${files.length} image${files.length > 1 ? "s" : ""}: ${added.map((x) => `${x.id} (${x.name})`).join(", ")}.` }]
      for (const f of files) result.push(await imageBlock(f))
      msgs.current.push({ role: "user", content: settle({ [it.toolId]: result }) })
      await turn()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, busy, turn],
  )

  const decidePlan = useCallback(
    async (itemId: string, plan: Plan | null) => {
      const it = items.find((x) => x.id === itemId)
      if (!it || it.kind !== "plan" || busy) return
      if (!plan) {
        // the user wants changes: they say what in the chat
        return
      }
      const r = apiRef.current.approvePlan(plan)
      if (r.startsWith("Error")) {
        add({ kind: "error", text: r.replace(/^Error: /, "") })
        return
      }
      patch(itemId, { state: "approved", plan } as Partial<Item>)
      msgs.current.push({ role: "user", content: settle({ [it.toolId]: `Approved${JSON.stringify(plan) !== JSON.stringify(it.plan) ? " with edits" : ""}. ${r}` }) })
      await turn()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, busy, turn],
  )

  const stop = () => abort.current?.abort()
  const retry = useCallback(() => {
    setItems((list) => list.filter((x) => x.kind !== "error"))
    // only when the last thing sent is still waiting for a reply
    if (msgs.current.at(-1)?.role === "user") turn()
  }, [turn])

  // the first message: what the user typed on Create
  useEffect(() => {
    if (started.current || !opts.autoStart || !opts.prompt?.trim()) return
    started.current = true
    // images added on Create come along as files
    Promise.all(
      (opts.imageUrls ?? []).map(async (r) => {
        try {
          const blob = await (await fetch(r.url)).blob()
          return new File([blob], r.name, { type: blob.type || "image/jpeg" })
        } catch {
          return null
        }
      }),
    ).then((files) => send(opts.prompt!.trim(), files.filter((f): f is File => !!f)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { items, busy, send, answer, addAssets, decidePlan, stop, retry, waiting: pending.current.length > 0 }
}
