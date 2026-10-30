/**
 * The chat that plans and designs a Flick. Claude (through the AI server) decides what to ask and
 * what to build, calling the tools below; the editor carries them out. Without a connection, a
 * scripted stand-in calls the same tools, so the flow can always be demoed.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { AiError, aspectOf, generateImage, imageBlock, shareable, isLive, readWebsite, siteImage, streamChat, type Block, type Message, type SiteRead, type Tool } from "@/ai/client"
import type { Brand, Design, Plan, PlanVariation } from "@/ai/design"
import { mockReply } from "@/ai/mock"
import { findSkill, SKILLS, skillIndex } from "@/ai/skills"

/* ---------- what the editor offers the chat ---------- */

export type ProjectImage = { id: string; name: string; url: string; from: "upload" | "generated" | "website"; kind?: string }
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
  /** every feed: what uses it and each video's value */
  feeds: { name: string; type: string; used_by: string[]; values: Record<string, string> }[]
  /** empty values viewers would see */
  issues: string[]
  /** skills already read in this chat */
  skills_read: string[]
  images: ProjectImage[]
  /** the sample product set the simulated videos come from (scripted demo only) */
  sample_set: string
}
export type EditorApi = {
  state(): Omit<ProjectState, "images" | "skills_read">
  /** sets up every video, starts generating them all, places the design; error text if it can't */
  approvePlan(plan: Plan): string
  updateDesign(d: Design): string
  setBrand(b: Brand): void
  /** one variation: its name, prompt (regenerate), any on-screen field, or values by feed name */
  setVariation(target: string, patch: Partial<PlanVariation> & { regenerate?: boolean; values?: Record<string, string> }): string
  addVariation(v: PlanVariation & { values?: Record<string, string> }, generate: boolean): string
  /** make a field (or a named feed) differ per variation, or change its values */
  varyField(field: string | undefined, feed: string | undefined, values: Record<string, string>): string
  /** back to one value for every variation */
  sameForAll(field: string | undefined, feed: string | undefined, value?: string): string
  renameFeed(from: string, to: string): string
  /** any text, button or image on the canvas: add, change (move, resize, restyle) or remove; ids from the design list */
  addElement(spec: ElementSpec): string
  editElement(id: string, spec: ElementSpec): string
  removeElement(id: string): string
  /** a variation's thumbnail in the strip */
  setThumbnail(target: string, url: string): string
  addImageToCanvas(url: string): string
  /** the review skill's checks: what passes, what to fix */
  review(): { pass: string[]; fail: string[] }
  /** a demo website read, for the scripted chat */
  sampleSite(url: string): SiteRead
  /** a demo image for the scripted chat */
  sampleImage(purpose: string, target?: string): string
}

/** an element as the chat describes it: positions are % of the frame (x, y = its anchor point) */
export type ElementSpec = {
  type?: "text" | "button" | "image"
  text?: string
  style?: string
  /** an image: a project image's url (the hook resolves image_id to this) */
  url?: string
  x?: number
  y?: number
  position?: "top" | "upper" | "center" | "lower" | "bottom"
  align?: "left" | "center" | "right"
  width?: number
  size?: number
  color?: string
  background?: string
  font?: string
  bold?: boolean
  italic?: boolean
  link?: string
  radius?: number
  hidden?: boolean
}

/* ---------- what shows in the chat ---------- */

/** how a question's answers show: words, cards, colour palettes, layout previews or thumbnail styles */
export type Display = "chips" | "cards" | "palettes" | "layouts" | "thumbnails"
/** where the user is in making the Flick */
export type Step = "idea" | "look" | "plan" | "build"
/** one answer: its words, and what it looks like when the answer is visual */
export type Choice = { label: string; description?: string; colors?: string[]; design?: Design }

type Base = { id: string; at: number }
export type Item = Base &
  (
    | { kind: "user"; text: string; images: string[] }
    | { kind: "assistant"; text: string; streaming?: boolean; activity?: string }
    | { kind: "question"; toolId: string; question: string; options: Choice[]; display: Display; step?: Step; multi: boolean; custom: boolean; answer?: string }
    | { kind: "assets"; toolId: string; message: string; kinds: string[]; done?: "added" | "skipped"; images?: string[] }
    | { kind: "brand"; brand: Brand }
    | { kind: "plan"; toolId: string; plan: Plan; state: "open" | "approved" | "skipped" }
    | { kind: "image"; prompt: string; purpose: string; target?: string; aspect?: string; state: "working" | "done" | "failed"; url?: string; error?: string; placed?: boolean; status?: string; startedAt?: number }
    | { kind: "note"; text: string }
    /** skills the chat read (shown as one line) */
    | { kind: "skill"; names: string[] }
    /** the review's result */
    | { kind: "review"; pass: number; fail: string[] }
    /** a website the chat read: what it found and the images it can use */
    | { kind: "site"; url: string; state: "working" | "done" | "failed"; title?: string; site?: string; price?: string; images: string[]; reason?: string }
    /** the build after Generate all: its progress is read live from the editor */
    | { kind: "build"; count: number }
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
    headline: { type: "string", description: "Only if this variation's headline should differ from the design's" },
    subheading: { type: "string", description: "Only if it should differ per variation" },
    cta: { type: "string", description: "Only if this variation's button text should differ" },
  },
  required: ["name", "prompt"],
}
const fieldEnum = { type: "string", enum: ["headline", "subheading", "label", "price", "cta", "link"], description: "cta is the button text, link the button's link" }
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
    thumbnails: {
      type: "object",
      description: "The thumbnail strip viewers tap to switch variations",
      properties: {
        position: { type: "string", enum: ["bottom", "top", "left", "right"] },
        shape: { type: "string", enum: ["square", "rounded", "circle"] },
        size: { type: "string", enum: ["small", "medium", "large"] },
        highlight_color: { type: "string", description: "Hex colour of the ring on the active thumbnail" },
      },
    },
  },
}
const choiceSchema = {
  anyOf: [
    { type: "string" },
    {
      type: "object",
      properties: {
        label: { type: "string", description: "1 to 4 words" },
        description: { type: "string", description: "One short line" },
        colors: { type: "array", items: str, description: "Hex colours, for palettes: primary, accent, text" },
        design: { ...designSchema, description: "For layouts and thumbnails: the design this answer applies (layout, align, button_style, thumbnails…)" },
      },
      required: ["label"],
    },
  ],
}

export const TOOLS: Tool[] = [
  {
    name: "read_skill",
    description: "Read one or more of Flam's skills (playbooks for making great Flicks) in full. Read each before the step it covers; the list is in your instructions.",
    input_schema: { type: "object", properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] },
  },
  {
    name: "review_flick",
    description: "Check the built Flick against the review skill: text fits the format, nothing overlaps or leaves the frame, buttons readable and linked, feeds filled, every variation has a thumbnail and a distinct name. Returns what passes and what to fix.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "ask_user",
    description:
      "Ask the user one short question with tappable answers; the choice comes back as the result. display picks how the answers look: 'chips' (words), 'cards' (a label and a line each), 'palettes' (colour swatches; give colors), 'layouts' (mini Flick previews; give design with layout, align, button_style and thumbnails), 'thumbnails' (thumbnail strip styles; give design.thumbnails). Visual answers update the live preview as soon as they're picked. step tags where the user is: idea, look or plan.",
    input_schema: {
      type: "object",
      properties: {
        question: str,
        options: { type: "array", items: choiceSchema, minItems: 2, maxItems: 6 },
        display: { type: "string", enum: ["chips", "cards", "palettes", "layouts", "thumbnails"] },
        step: { type: "string", enum: ["idea", "look", "plan"] },
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
      "Generate one image (Higgsfield; 10 to 60 seconds; runs in the background). purpose 'thumbnail' with a variation name sets that variation's thumbnail in the strip; 'canvas' adds it to the design; 'idea' just shows it. Pass reference_image_ids (the user's product photos, a website's product images) whenever the image shows their product: the model keeps the real product and changes the scene. Use sparingly.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "A detailed visual description" },
        purpose: { type: "string", enum: ["thumbnail", "canvas", "idea"] },
        variation: { type: "string", description: "Variation name, for thumbnails" },
        aspect_ratio: { type: "string", enum: ["1:1", "4:5", "3:4", "9:16", "16:9"] },
        reference_image_ids: { type: "array", items: { type: "string" }, description: "Up to 3 project image ids to keep true to (product first, then a model or scene)" },
      },
      required: ["prompt", "purpose"],
    },
  },
  {
    name: "read_website",
    description:
      "Read a web page (a product page, a brand's site) through the app's server: returns the title, description, price, products with prices and colours, brand colour, logo, the page's text and its images (kept as project images; the first few attached so you can see them). The user never leaves the app.",
    input_schema: { type: "object", properties: { url: { type: "string", description: "The page's address" } }, required: ["url"] },
  },
  {
    name: "view_image",
    description: "Look at project images by id (from the project state): generated images, uploads, website images. Use it to check a generated thumbnail before keeping it, or to describe a photo you haven't seen.",
    input_schema: { type: "object", properties: { image_ids: { type: "array", items: { type: "string" } } }, required: ["image_ids"] },
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
    description: "Change the on-screen design after the plan is approved: headline, subheading, button text, colours, button style, font, thumbnails (position, shape, size, highlight). Only send what changes.",
    input_schema: designSchema,
  },
  {
    name: "set_variation",
    description: "Change one video: its name, label, price, link or prompt. With regenerate true, it generates again with the new prompt.",
    input_schema: {
      type: "object",
      properties: {
        variation: { type: "string", description: "Variation name, or 'reference'" },
        name: str,
        prompt: str,
        headline: str,
        subheading: str,
        label: str,
        price: str,
        cta: str,
        link: str,
        values: { type: "object", additionalProperties: { type: "string" }, description: "Values for other feeds, by feed name (see feeds in the project state)" },
        regenerate: { type: "boolean" },
      },
      required: ["variation"],
    },
  },
  {
    name: "add_variation",
    description: "Add a variation (up to 5) and generate it. Give a value for every feed in use (fields or values by feed name); missing ones are copied from the first variation.",
    input_schema: {
      ...variationSchema,
      properties: { ...variationSchema.properties, values: { type: "object", additionalProperties: { type: "string" } }, generate: { type: "boolean" } },
    },
  },
  {
    name: "vary_field",
    description:
      "Make on-screen text differ per variation (it becomes a feed), or change the per-variation values of one that already does. Give field (headline, subheading, label, price, cta, link) or feed (an existing feed's name). values maps variation names to text; 'reference' is the reference video. Adds a label or price line if the design has none.",
    input_schema: {
      type: "object",
      properties: { field: fieldEnum, feed: str, values: { type: "object", additionalProperties: { type: "string" } } },
      required: ["values"],
    },
  },
  {
    name: "same_for_all",
    description: "Make a field or feed the same on every variation again (removes the feed). value is the text to keep; without it, the value shown now stays.",
    input_schema: { type: "object", properties: { field: fieldEnum, feed: str, value: str } },
  },
  {
    name: "add_element",
    description:
      "Add any text, button or image to the canvas (on every variation). Text styles: heading, subheading, body, caption, label. Button styles: pill, rounded, sharp, light, outline, glass, link. Images: image_id of a project image (uploaded, from a website or generated; a logo, a product shot). Place it with position (top, upper, center, lower, bottom) and align (left, center, right), or exact x and y (% of the frame; x is the left edge, centre or right edge by align, y the middle). width: % of the frame (images, or a text box that wraps). size: font size in % of frame width (heading is 8, body 3.4). Keep clear of other elements and the thumbnail strip (see design). Returns the new element's id.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["text", "button", "image"] },
        text: str,
        style: str,
        image_id: str,
        position: { type: "string", enum: ["top", "upper", "center", "lower", "bottom"] },
        align: { type: "string", enum: ["left", "center", "right"] },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        size: { type: "number" },
        color: { type: "string", description: "Hex text colour" },
        background: { type: "string", description: "Hex button colour" },
        font: str,
        bold: { type: "boolean" },
        italic: { type: "boolean" },
        link: { type: "string", description: "Where a button goes" },
        radius: { type: "number", description: "Image corner rounding, 0 to 100" },
      },
      required: ["type"],
    },
  },
  {
    name: "edit_element",
    description:
      "Change one element by its id from the design list: move (position/align or x/y), resize (width, size), restyle (style, color, background, font, bold, italic, radius), change its text or link, swap an image (image_id), or hide it. Text that differs per variation is changed with vary_field instead.",
    input_schema: {
      type: "object",
      properties: {
        id: str,
        text: str,
        style: str,
        image_id: str,
        position: { type: "string", enum: ["top", "upper", "center", "lower", "bottom"] },
        align: { type: "string", enum: ["left", "center", "right"] },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        size: { type: "number" },
        color: str,
        background: str,
        font: str,
        bold: { type: "boolean" },
        italic: { type: "boolean" },
        link: str,
        radius: { type: "number" },
        hidden: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_element",
    description: "Remove one element by its id (the thumbnail strip stays).",
    input_schema: { type: "object", properties: { id: str }, required: ["id"] },
  },
  {
    name: "rename_feed",
    description: "Rename a feed.",
    input_schema: { type: "object", properties: { from: str, to: str }, required: ["from", "to"] },
  },
]


const ACTIVITY: Record<string, string> = {
  read_skill: "Reading Flam’s guides",
  ask_user: "Preparing a question",
  request_assets: "Preparing a question",
  propose_plan: "Writing the plan",
  set_brand: "Setting the brand",
  generate_image: "Describing an image",
  read_website: "Reading the website",
  view_image: "Looking at images",
  review_flick: "Reviewing the Flick",
  update_design: "Designing",
  add_element: "Designing",
  edit_element: "Designing",
}

export function systemPrompt(s: ProjectState) {
  return `You are the creative partner inside Flicks by Flam, an AI interactive content tool. You help the user make a Flick: one interactive video where viewers tap thumbnails to switch between variations (colours, products, people, scenes or offers) and tap a button to shop. A Flick has one reference video plus 2 to 5 variations made from it; each variation can have its own label, price and link. Flicks run in ads, on websites, or as a shareable link.

How you work (the user builds the Flick with you, step by step; a live preview beside the chat shows it taking shape):
0. Whenever the user gives a web address (or their product's page would help and they named one), call read_website first and use what it finds: real product names, prices, colours, links, images and the brand's colour. Don't ask for what the page already told you.
1. Idea: understand the brief. Ask at most 2 short questions with ask_user (step "idea"; include a "Decide for me" option when useful): what should change between variations, where it runs. Skip anything the user already said. Ask for product photos or a logo with request_assets when they would help.
2. Look: ask one visual question (step "look") with display "layouts": 3 options, each a design with layout, align, button_style and thumbnails (position, shape, size) that suit the product. If the brand's colours aren't known, follow with display "palettes" (3 options, colors as hex). Then record the brand with set_brand.
3. Plan: call propose_plan with everything: video prompts (the reference prompt describes the scene, subject, camera motion and light; each variation prompt says what changes), names, labels, prices, links, and the design, carrying over the chosen look and thumbnails (headline under 6 words, CTA 1 to 3 words, colours that read on video). The user edits it in place and presses Generate all.
4. Build: after approval the app generates every video and places the design and thumbnail strip. Give each variation a thumbnail image: use_image with the user's photos if they fit, otherwise generate_image (purpose thumbnail, 1:1, a close-up that matches the variation). Then say in one or two sentences what happens next.
Feeds: any on-screen text that differs per variation is a feed (a named value each variation sets). The project state lists every feed (including ones the user or a template made), what uses it and each variation's value, plus issues (empty values). In the plan, give each variation its label, price and link, and a headline, subheading or button text only when it should differ. Afterwards use vary_field to make text differ or change its values, same_for_all to make it one value again, set_variation for one variation, and rename_feed. update_design can't change text that differs per variation; it says so. When a result or the state reports issues, fix them in the same turn (fill every empty value).
5. Afterwards, make the changes the user asks for with update_design (including thumbnails), set_variation, add_variation, vary_field and same_for_all. To put anything else on the canvas (a logo, a product image, a badge like "New", a disclaimer, an extra button) use add_element; move, resize or restyle any element with edit_element, and remove_element. The design list gives each element's id, type, text and position; place new things where they don't overlap. Keep them small and confirm in one line. Offer visual choices with ask_user when the user is unsure.

Skills: Flam's playbooks for making the best Flicks. Follow them over your own habits. Read craft and flick-studio-no-blender before planning, and read each skill right before the step it covers (read_skill; several at once is fine; skip ones listed in skills_read). flick-studio-no-blender is a production playbook written for a longer pipeline: use its thinking here (detect the category and say it in one line, lock one swap: product, character or environment, plan up to 3 shots with its Shot Grammar terms, camera, swap and sync rules), and turn its shot plan into the plan's reference prompt (the master) and each variation's prompt (only the swap changes). Ask for approval through propose_plan, which is its first gate. Skip what this app doesn't have: project folders, look frames, Nano Banana, video_edit, per-shot masters, browser, ffmpeg and QA steps; this app makes one silent 720p video per variation from your prompts. Never name the video model to the user. After the build and after big changes, run review_flick and fix every failure before handing back. Never end a reply by saying you'll do something next: call the tool in the same reply. End a turn only with a question for the user (ask_user, request_assets, propose_plan) or when the work is done.
${skillIndex()}

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
  // what the user picked so far (looks, palettes): the live preview shows it before there's a plan
  const draft = useRef<Design>({})
  const [draftView, setDraftView] = useState<Design>({})
  const mergeDraft = (d: Design) => {
    draft.current = { ...draft.current, ...d, thumbnails: { ...draft.current.thumbnails, ...d.thumbnails } }
    setDraftView(draft.current)
  }
  const msgs = useRef<Message[]>([])
  // skills already read in this chat (listed in the state so they aren't read twice)
  const read = useRef(new Set<string>())
  // results ready to send with the user's next answer (tools that ran alongside a waiting one)
  const ready = useRef<Block[]>([])
  const pending = useRef<{ toolId: string; itemId: string }[]>([])
  const abort = useRef<AbortController | null>(null)
  const started = useRef(false)
  const live = useRef(isLive())
  // images the chat can use by id: what the user added, and what it generated
  const images = useRef<ProjectImage[]>([])
  const state = (): ProjectState => ({ ...apiRef.current.state(), images: images.current, skills_read: [...read.current] })
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

  /** variations whose thumbnail is still generating (the review doesn't count them as missing) */
  const pendingThumbs = useRef(new Set<string>())
  const runImage = (input: Record<string, unknown>, reuse?: string) => {
    const purpose = String(input.purpose ?? "idea")
    const target = input.variation ? String(input.variation) : undefined
    const prompt = String(input.prompt ?? "")
    const aspect = String(input.aspect_ratio ?? (purpose === "canvas" ? aspectOf(state().flick_size) : "1:1"))
    const startedAt = Date.now()
    const itemId = reuse ?? add({ kind: "image", prompt, purpose, target, aspect, state: "working", status: "starting", startedAt })
    if (reuse) patch(reuse, { state: "working", status: "starting", startedAt, error: undefined } as Partial<Item>)
    const key = purpose === "thumbnail" && target ? target.trim().toLowerCase() : ""
    if (key) pendingThumbs.current.add(key)
    const done = (url: string) => {
      if (key) pendingThumbs.current.delete(key)
      let placed = false
      if (purpose === "thumbnail" && target) placed = !apiRef.current.setThumbnail(target, url).startsWith("Error")
      if (purpose === "canvas") placed = !apiRef.current.addImageToCanvas(url).startsWith("Error")
      keep(url, prompt.slice(0, 40), "generated")
      patch(itemId, { state: "done", url, placed } as Partial<Item>)
    }
    const fail = (e: unknown) => (key && pendingThumbs.current.delete(key), patch(itemId, { state: "failed", error: e instanceof Error ? e.message : "The image failed." } as Partial<Item>))
    const refIds = ((input.reference_image_ids as string[] | undefined) ?? []).slice(0, 3)
    const refImages = refIds.map((r) => images.current.find((i) => i.id === r)).filter((i): i is ProjectImage => !!i)
    // the images to keep, at addresses Higgsfield can open (uploads go to the server first)
    const refs = () => Promise.all(refImages.map((i) => shareable(i.url).catch(() => null))).then((u) => u.filter((x): x is string => !!x))
    if (live.current)
      refs().then((urls) => generateImage(prompt, aspect, undefined, (status) => patch(itemId, { status } as Partial<Item>), urls)).then((url) => {
        try {
          done(url)
        } catch (e) {
          fail(e)
        }
      }, fail)
    else setTimeout(() => done(apiRef.current.sampleImage(purpose, target)), 1800 + Math.random() * 1200)
    return `Started. It shows in the chat when ready${purpose === "thumbnail" && target ? ` and becomes ${target}'s thumbnail` : purpose === "canvas" ? " and is added to the canvas" : ""}.`
  }

  /**
   * Reads a page through the server (or the demo's sample), shows what it found, keeps its images
   * as project images, and hands Claude the facts plus a look at the first few images.
   */
  const readSite = async (raw: string): Promise<string | Block[]> => {
    const url = raw.trim()
    if (!url) return "Error: No address given."
    const itemId = add({ kind: "site", url, state: "working", images: [] })
    try {
      const r = live.current ? await readWebsite(url) : apiRef.current.sampleSite(url)
      if (!r.ok) {
        patch(itemId, { state: "failed", reason: r.reason } as Partial<Item>)
        return `Couldn't read ${url}: ${r.reason ?? "no content"}. Ask the user to add product images instead.`
      }
      // images come through the server, so they show even where the site blocks embedding
      const found = (r.images ?? []).slice(0, 8)
      const blobs = await Promise.all(
        found.map(async (src) => {
          if (!live.current) return { src, blob: null as Blob | null, show: src }
          try {
            const blob = await siteImage(src)
            return { src, blob, show: URL.createObjectURL(blob) }
          } catch {
            return null
          }
        }),
      )
      const ok = blobs.filter((b): b is { src: string; blob: Blob | null; show: string } => !!b)
      const kept = ok.map((b, i) => keep(b.show, `${r.site ?? "site"} image ${i + 1}`, "website"))
      patch(itemId, { state: "done", title: r.title, site: r.site, price: r.price, images: ok.map((b) => b.show) } as Partial<Item>)
      const facts = {
        site: r.site,
        title: r.title,
        description: r.description,
        price: r.price,
        theme_color: r.theme_color,
        logo: r.logo,
        products: r.products,
        images: kept.map((k, i) => ({ id: k.id, from: ok[i].src })),
        text: r.text,
      }
      const blocks: Block[] = [{ type: "text", text: `Read ${r.url}. ${JSON.stringify(facts)}\nThe images are kept with these ids (use_image can set them as thumbnails). The first ones are attached so you can see them.` }]
      for (const b of ok.slice(0, 4)) {
        try {
          blocks.push(await imageBlock(b.blob ?? (await (await fetch(b.show)).blob())))
        } catch {
          /* an image Claude can't see is still listed */
        }
      }
      return blocks
    } catch (e) {
      patch(itemId, { state: "failed", reason: e instanceof Error ? e.message : "It didn't load." } as Partial<Item>)
      return `Couldn't read ${url}: ${e instanceof Error ? e.message : "it didn't load"}. Ask the user to add product images instead.`
    }
  }

  const runTool = async (u: Extract<Block, { type: "tool_use" }>): Promise<string | Block[] | typeof WAIT> => {
    const a = apiRef.current
    const input = u.input ?? {}
    try {
      switch (u.name) {
        case "ask_user": {
          const options: Choice[] = ((input.options as (string | Choice)[] | undefined) ?? [])
            .map((o) => (typeof o === "string" ? { label: o } : o && typeof o.label === "string" ? o : null))
            .filter((o): o is Choice => !!o && !!o.label.trim())
            .slice(0, 6)
          const display = (["chips", "cards", "palettes", "layouts", "thumbnails"] as Display[]).includes(input.display as Display) ? (input.display as Display) : "chips"
          const step = (["idea", "look", "plan"] as Step[]).includes(input.step as Step) ? (input.step as Step) : undefined
          const itemId = add({ kind: "question", toolId: u.id, question: String(input.question ?? ""), options, display, step, multi: !!input.multi_select && display === "chips", custom: input.allow_custom !== false && display === "chips" })
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
          const raw = input as unknown as Plan
          if (!raw.variations?.length) return "Error: a plan needs at least two variations."
          // the look the user picked carries into the plan's design
          const plan = { ...raw, design: { ...draft.current, ...(raw.design ?? {}), thumbnails: { ...draft.current.thumbnails, ...(raw.design?.thumbnails ?? {}) } } }
          const itemId = add({ kind: "plan", toolId: u.id, plan: { ...plan, variations: plan.variations.slice(0, 5), design: plan.design ?? {} }, state: "open" })
          pending.current.push({ toolId: u.id, itemId })
          return WAIT
        }
        case "set_brand": {
          a.setBrand(input as Brand)
          const b = input as Brand
          if (b.primary_color || b.text_color || b.font) mergeDraft({ ...(b.primary_color ? { button_color: b.primary_color } : {}), ...(b.text_color ? { text_color: b.text_color } : {}), ...(b.font ? { font: b.font } : {}) })
          add({ kind: "brand", brand: input as Brand })
          return "Saved. The brand card shows it."
        }
        case "generate_image":
          return runImage(input)
        case "read_skill": {
          const names = ((input.names as string[]) ?? []).map(String)
          const found = names.map((n) => findSkill(n)).filter((x): x is NonNullable<ReturnType<typeof findSkill>> => !!x)
          if (!found.length) return `Error: No skill called ${names.join(", ")}. Skills: ${SKILLS.map((x) => x.name).join(", ")}.`
          found.forEach((f) => read.current.add(f.name))
          // one quiet line in the chat, merged with the last one if it was also skills
          setItems((list) => {
            const last = list.at(-1)
            if (last?.kind === "skill") return [...list.slice(0, -1), { ...last, names: [...new Set([...last.names, ...found.map((f) => f.name)])] }]
            return [...list, { id: id(), at: Date.now(), kind: "skill", names: found.map((f) => f.name) }]
          })
          return found.map((f) => `# Skill: ${f.name}\n${f.body}`).join("\n\n---\n\n")
        }
        case "review_flick": {
          const r = a.review()
          // thumbnails still generating aren't missing: they're on their way
          const pending = pendingThumbs.current
          r.fail = r.fail.flatMap((f) => {
            if (!f.startsWith("No thumbnail: ") || !pending.size) return [f]
            const left = f.slice(14).replace(/\.$/, "").split(", ").filter((n) => !pending.has(n.trim().toLowerCase()))
            if (!left.length) return (r.pass.push("Thumbnails are on their way"), [])
            return [`No thumbnail: ${left.join(", ")}.`]
          })
          add({ kind: "review", pass: r.pass.length, fail: r.fail })
          return r.fail.length ? `Fix these, then run review_flick again:\n- ${r.fail.join("\n- ")}\n(Passing: ${r.pass.length} checks.)` : `All ${r.pass.length} checks pass.`
        }
        case "view_image": {
          const ids = ((input.image_ids as string[]) ?? []).slice(0, 4)
          const found = ids.map((x) => images.current.find((i) => i.id === x)).filter((i): i is ProjectImage => !!i)
          if (!found.length) return "Error: No images with those ids."
          const blocks: Block[] = []
          for (const i of found) {
            try {
              // generated images live on Higgsfield's servers, which may not share with the browser: the AI server passes them through
              const blob = await fetch(i.url).then((r) => (r.ok ? r.blob() : Promise.reject()), () => Promise.reject()).catch(() => siteImage(i.url))
              blocks.push({ type: "text", text: `${i.id}: ${i.name} (${i.from})` }, await imageBlock(blob))
            } catch {
              blocks.push({ type: "text", text: `${i.id}: couldn't load this image.` })
            }
          }
          return blocks
        }
        case "read_website":
          return readSite(String(input.url ?? ""))
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
          if (!r.startsWith("Error")) add({ kind: "note", text: r.replace(/ Check: .*$/, "") })
          return r
        }
        case "vary_field":
        case "same_for_all":
        case "rename_feed": {
          const r =
            u.name === "vary_field"
              ? a.varyField(input.field as string | undefined, input.feed as string | undefined, (input.values as Record<string, string>) ?? {})
              : u.name === "same_for_all"
                ? a.sameForAll(input.field as string | undefined, input.feed as string | undefined, input.value as string | undefined)
                : a.renameFeed(String(input.from ?? ""), String(input.to ?? ""))
          if (!r.startsWith("Error") && !r.startsWith("Nothing")) add({ kind: "note", text: r.replace(/ Check: .*$/, "") })
          return r
        }
        case "add_element":
        case "edit_element":
        case "remove_element": {
          const spec = { ...(input as ElementSpec & { image_id?: string; id?: string }) }
          if ((input as { image_id?: string }).image_id) {
            const img = images.current.find((i) => i.id === (input as { image_id?: string }).image_id)
            if (!img) return "Error: no image with that id."
            spec.url = img.url
            spec.type = spec.type ?? "image"
          }
          const r = u.name === "add_element" ? a.addElement(spec) : u.name === "edit_element" ? a.editElement(String(input.id ?? ""), spec) : a.removeElement(String(input.id ?? ""))
          if (!r.startsWith("Error") && !r.startsWith("Nothing")) add({ kind: "note", text: r.replace(/ \(id [^)]*\)/, "") })
          return r
        }
        case "add_variation": {
          const r = a.addVariation(input as unknown as PlanVariation, input.generate !== false)
          if (!r.startsWith("Error")) add({ kind: "note", text: r.replace(/ Check: .*$/, "") })
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
      const seen = new Set<string>()
      let nudged = false
      for (let step = 0; step < 8; step++) {
        // let the editor re-render after the last tools, so the state sent is current
        await new Promise((r) => setTimeout(r, 60))
        const req = { system: systemPrompt(state()), messages: msgs.current, tools: TOOLS }
        const itemId = add({ kind: "assistant", text: "", streaming: true })
        const onText = (text: string) => patch(itemId, { text } as Partial<Item>)
        // what it's doing while it writes a tool call (a plan can take a while, with no words to show)
        const onTool = (name: string) => patch(itemId, { activity: ACTIVITY[name] ?? "Working" } as Partial<Item>)
        const res = live.current ? await streamChat(req, onText, abort.current.signal, onTool) : await mockReply(msgs.current, state(), onText)
        const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n\n")
        if (text.trim()) patch(itemId, { text, streaming: false } as Partial<Item>)
        else setItems((list) => list.filter((x) => x.id !== itemId))
        msgs.current.push({ role: "assistant", content: res.content })
        const uses = res.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use")
        if (!uses.length) {
          // it said it would do something, then stopped: once per message, tell it to go ahead
          const last = text.trim().split(/(?<=[.!?:])\s+/).at(-1) ?? ""
          if (!nudged && !pending.current.length && (/:$/.test(text.trim()) || /\b(I'll|I will|Let me|I'm going to|Next,? I|Now I|Give me a moment|One moment)\b/i.test(last))) {
            nudged = true
            msgs.current.push({ role: "user", content: [{ type: "text", text: "(Go ahead: do it now with your tools, in this turn.)" }] })
            continue
          }
          break
        }
        // the same call again in one reply means it's going round in circles: stop it
        const sigs = uses.map((u) => u.name + JSON.stringify(u.input))
        const repeated = sigs.some((x) => seen.has(x))
        sigs.forEach((x) => seen.add(x))
        if (repeated && step > 0) {
          msgs.current.push({ role: "user", content: uses.map((u) => ({ type: "tool_result" as const, tool_use_id: u.id, content: "Not run: this repeats an earlier call. Stop and tell the user what's left." })) })
          add({ kind: "note", text: "Stopped a repeated step. Tell me what to change next." })
          break
        }
        const results: Block[] = []
        let waiting = false
        for (const u of uses) {
          const r = await runTool(u)
          if (r === WAIT) waiting = true
          else results.push({ type: "tool_result", tool_use_id: u.id, content: r, ...(typeof r === "string" && r.startsWith("Error") ? { is_error: true } : {}) })
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
    async (itemId: string, value: string, choice?: Choice) => {
      const it = items.find((x) => x.id === itemId)
      if (!it || it.kind !== "question" || busy) return
      patch(itemId, { answer: value } as Partial<Item>)
      // a visual answer shows in the preview straight away
      if (choice?.design) mergeDraft(choice.design)
      if (choice?.colors?.length) mergeDraft({ button_color: choice.colors[0], ...(choice.colors[2] ? { text_color: choice.colors[2] } : {}) })
      const detail = choice && (choice.design || choice.colors) ? ` (${JSON.stringify({ ...(choice.design ? { design: choice.design } : {}), ...(choice.colors ? { colors: choice.colors } : {}) })})` : ""
      msgs.current.push({ role: "user", content: settle({ [it.toolId]: value + detail }) })
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
      add({ kind: "build", count: plan.variations.length })
      msgs.current.push({ role: "user", content: settle({ [it.toolId]: `Approved${JSON.stringify(plan) !== JSON.stringify(it.plan) ? " with edits" : ""}. ${r}` }) })
      await turn()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, busy, turn],
  )

  /** edits in the plan card: kept on the card and shown in the preview as they're typed */
  const editPlan = (itemId: string, plan: Plan) => patch(itemId, { plan } as Partial<Item>)

  // where the user is: idea, look, plan, build
  const plan = [...items].reverse().find((x): x is Extract<Item, { kind: "plan" }> => x.kind === "plan" && x.state !== "skipped")
  const lookDone = items.some((x) => (x.kind === "question" && x.step === "look" && x.answer !== undefined) || x.kind === "brand")
  const step: Step = plan?.state === "approved" ? "build" : plan ? "plan" : lookDone || items.some((x) => x.kind === "question" && x.step === "look") ? "look" : "idea"

  /** a failed image, tried again with the same description */
  const retryImage = (itemId: string) => {
    const it = items.find((x) => x.id === itemId)
    if (!it || it.kind !== "image") return
    live.current = isLive()
    runImage({ prompt: it.prompt, purpose: it.purpose, variation: it.target, aspect_ratio: it.aspect }, itemId)
  }

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

  return { items, busy, send, answer, addAssets, decidePlan, editPlan, retryImage, stop, retry, waiting: pending.current.length > 0, draft: draftView, plan: plan?.plan, step }
}
