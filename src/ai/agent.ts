/**
 * The chat that plans and designs a Flick. Claude (through the AI server) decides what to ask and
 * what to build, calling the tools below; the editor carries them out. Without a connection, a
 * scripted stand-in calls the same tools, so the flow can always be demoed.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { AiError, aspectOf, keepable, generateImage, imageBlock, library, shareable, type LibraryItem, isLive, readWebsite, siteImage, streamChat, type Block, type Message, type SiteRead, type Tool } from "@/ai/client"
import type { Brand, Design, Plan, PlanVariation } from "@/ai/design"
import { mockReply } from "@/ai/mock"
import { findSkill, SKILLS } from "@/ai/skills"
import { loadSaved, saver } from "@/ai/sync"
import { blobUrl, probeVideo, sameUrl, stillsAt } from "@/lib/media"

/* ---------- what the editor offers the chat ---------- */

export type ProjectImage = { id: string; name: string; url: string; from: "upload" | "generated" | "website" | "library"; kind?: string }
export type ProjectState = {
  flick_size: string
  video_seconds: number
  credits: number
  video_cost: number
  title: string
  planned: boolean
  /** real videos: where the reference video's review stands */
  reference_review?: string
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
export type Display = "chips" | "cards" | "palettes" | "layouts" | "thumbnails" | "concepts"
/** where the user is in making the Flick */
export type Step = "idea" | "look" | "plan" | "build"
/** one answer: its words, and what it looks like when the answer is visual */
export type Choice = {
  label: string
  description?: string
  colors?: string[]
  design?: Design
  /** concepts: a preview image of the style, what changes, the variations and the story beats */
  image?: string
  question?: string
  swap?: string
  variations?: string[]
  beats?: string[]
}

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
    image_ids: { type: "array", items: { type: "string" }, description: "Project image ids showing exactly how this variation's changed thing looks (its product, colour, person or place); the video is made to match them" },
    method: { type: "string", enum: ["edit", "regenerate"], description: "How it's made from the approved reference video: 'edit' (default) edits the reference, keeping everything but the change; 'regenerate' makes a new video that follows the reference, for bigger changes such as a different shape or a new setting" },
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

/** how the variations were settled; concepts and plans are refused until they are */
const variationsFrom = {
  type: "object",
  description: "How you know what changes between variations",
  properties: {
    basis: { type: "string", enum: ["asked", "user_message"], description: "asked: the user answered your ask_user with purpose 'variations' (also how you confirm products seen in the images); user_message: the user said it themselves in a message" },
    quote: { type: "string", description: "For user_message: the user's own words naming what varies, copied exactly" },
  },
  required: ["basis"],
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
    name: "propose_concepts",
    description:
      "Show the user up to 3 concepts to choose from before the plan: each with a title, the idea in one line, the question the tap answers, what changes, the variations, the story in 2 or 3 beats, and a prompt for a quick preview image of its style (the app makes the previews). The user picks one, or types a mix or a change; that comes back as the result. Always use this before propose_plan unless the user already gave a complete concept or asked to skip ideas.",
    input_schema: {
      type: "object",
      properties: {
        variations_from: variationsFrom,
        concepts: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "2 to 5 words" },
              idea: { type: "string", description: "The hook in one sentence" },
              question: { type: "string", description: "The question the tap answers, e.g. 'Which flavour is yours?'" },
              swap: { type: "string", description: "What changes between variations" },
              variations: { type: "array", items: { type: "string" }, description: "2 to 5 variation names" },
              beats: { type: "array", items: { type: "string" }, description: "The story in 2 or 3 short beats" },
              image_prompt: { type: "string", description: "A detailed description of one frame in this concept's style, for the preview image (no text)" },
              reference_image_ids: { type: "array", items: { type: "string" }, description: "Project images this concept's preview must stay true to (the user's product, person or style); defaults to the user's own images" },
            },
            required: ["title", "idea", "variations", "image_prompt"],
          },
        },
      },
      required: ["variations_from", "concepts"],
    },
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
        purpose: { type: "string", enum: ["variations", "other"], description: "'variations' when asking what changes between variations" },
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
    description: "Record the brand kit: name, colours, font, tone, plus short notes from its guidelines (logo rules, do and don't) and the pages you took it from. Shows a brand card with its sources and styles the design. Call it as soon as you've found or been given the brand, before concepts.",
    input_schema: {
      type: "object",
      properties: {
        name: str,
        primary_color: str,
        secondary_color: str,
        text_color: str,
        font: str,
        tone: str,
        notes: { type: "string", description: "Key guideline points in one or two lines (logo use, photography style, do and don't)" },
        sources: { type: "array", items: { type: "string" }, description: "Addresses of the pages the brand details came from" },
      },
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
        reference: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "The reference video: subject, setting, camera motion, light, style. 1 to 3 sentences." },
            first_frame_id: { type: "string", description: "A project image id to open the video on, exactly (the user's shot, or an approved look frame)" },
            last_frame_id: { type: "string", description: "Optional: a project image id the video ends on (a controlled reveal); needs first_frame_id" },
            image_ids: { type: "array", items: { type: "string" }, description: "Project image ids the video must stay true to (product, person, style) when there's no first frame" },
          },
          required: ["prompt"],
        },
        variations_from: variationsFrom,
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
        has_text: { type: "boolean", description: "True when the image must show readable words (a badge, an offer, a sign); a model that renders text well makes it" },
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
    name: "search_library",
    description:
      "Search everything made before with this tool (images and videos from earlier projects, kept on Flam's side): each result has an id, kind, date, project, variation, purpose and the prompt that made it. Use it when the user mentions earlier work, wants something like a previous Flick, or for references and prompts that worked.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Words to match in prompts, projects or variations; empty for the latest" }, kind: { type: "string", enum: ["image", "video"] }, limit: { type: "number" } },
    },
  },
  {
    name: "use_library",
    description: "Bring library items into this project by id: images become project images (usable in use_image, view_image and as reference_image_ids, and you see them); videos come back with the prompt that made them, to reuse or adapt.",
    input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"] },
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
  propose_concepts: "Sketching concepts",
  request_assets: "Preparing a question",
  propose_plan: "Writing the plan",
  set_brand: "Setting the brand",
  generate_image: "Describing an image",
  read_website: "Reading the website",
  web_search: "Searching the web",
  web_fetch: "Reading a page",
  view_image: "Looking at images",
  search_library: "Searching the library",
  use_library: "Bringing in earlier work",
  review_flick: "Reviewing the Flick",
  update_design: "Designing",
  add_element: "Designing",
  edit_element: "Designing",
}

export function systemPrompt(s: ProjectState) {
  // the two skills every turn needs are always in the prompt; the rest are read when their step comes
  const always = ["flicks", "brief"].map((n) => findSkill(n)).filter((x): x is NonNullable<ReturnType<typeof findSkill>> => !!x)
  return `You are the creative partner inside Flicks by Flam, an AI interactive content tool. You help the user make a Flick with them, step by step.

Flam's skills decide WHAT you ask, suggest and make; follow them over your own habits and over any example in these instructions. The flicks and brief skills are below in full. Read every other skill with read_skill right before the step it covers (categories once you know the category, concepts before ideas and storylines, brand when the brand comes up or there's no brand kit, shots before the shot plan, video and models before video prompts, images and models before any image, design before any on-screen design or copy, review before approvals and handing over); skip ones listed in skills_read.

The order of work (always):
1. Read everything the user gave: the prompt, every image, every link. When there are images, your first reply opens with a short read-out: one line per image (what it is), then what you conclude (one product in several views, several different products = the variations, a logo, a style reference...). Follow the brief skill's table for what to ask next.
2. Brand and products, before any concept: if there's any hint of the brand (a name in the prompt, a logo, text on packaging, a website or product name), look it up yourself with web_search and web_fetch: the official site, brand guidelines, the product pages (names, variants, prices, links, images; read_website gets a product page's images). Record it with set_brand (with notes and sources) and say in a line what you found. If there's no hint, ask for the brand name or website (or "no brand"), with options.
   Look up the product range too: the brand's other products, versions, flavours or colours, with their names and images.
3. What changes between variations, settled with the user before concepts. If the inputs show different products, name them as the variations and ask to confirm. If they show one product (several views) and the user hasn't said what varies, ask with ask_user (purpose "variations"), options built from your research, e.g. "Across the range: Red, Black, Gold, Blue Label", "Red Label only: different serves", "Red Label only: moods or occasions", "I'll add more products". If they pick other products, ask for their pack shots (request_assets) or offer to take the official ones from the brand's site (read_website); never generate a product you have no image of. propose_concepts and propose_plan are refused until this is settled.
4. Ask anything else still missing (brief skill), then show concepts built on what you found (propose_concepts), then the plan.

How the app works (the mechanics, not what to ask):
- Concepts: propose_concepts shows up to 3 concepts as cards with preview images; use it before every plan unless the user already gave a full concept or asked to skip ideas.
- Videos the user adds (vid-1, vid-2...) arrive as three stills (start, middle, end) with their length (15 seconds at most; longer ones were trimmed). Say what happens in each. Plans can't use a user's video yet: ask what it's for (a reference to change, a style to follow, or frames to use), note the answer, and plan with images and prompts for now.
- Questions: ask_user shows tappable answers. display "chips" for words; "layouts", "palettes" or "thumbnails" for visual choices; step "idea", "look" or "plan" moves the progress bar. Several ask_user calls in one reply show together. request_assets asks for files.
- Web: web_search finds pages; web_fetch reads a page or PDF (text) that appeared in the conversation or in search results; read_website reads a product page for its products, prices, colours and images (and keeps the images for the project). Use them on your own whenever a brand or product is hinted.
- Brand: set_brand records the brand (name, colours, font, voice).
- Images: generate_image (with reference_image_ids to keep the user's images, has_text for readable words), view_image to look at any project image, use_image to place one. The app picks the model from these (models skill).
- Videos: the reference video is made first: from its prompt alone, or opening on a first frame (reference.first_frame_id, optionally ending on last_frame_id), or kept true to images (reference.image_ids). Give variations image_ids when you have images of their changed thing, and method "regenerate" only for big changes (default "edit"). See the models skill. The user always reviews it (reference_review in the project state); variations are made only after they approve, from the latest reference video plus each variation line, so they keep its motion, camera and timing. When the reference is ready, ask them to review it; if they want changes, regenerate the reference with set_variation (variation "reference", regenerate true) and they review the new one.
- Library: everything made before is kept. search_library finds earlier images and videos (with their prompts); use_library brings them in as references or starting points.
- The plan: propose_plan is the approval before any video credits are spent. It carries the reference video prompt, each variation (name, prompt, label, price, link, and headline, subheading or button text only when they differ) and the design. The user edits it and presses Generate all; the app then makes every video and places the design and thumbnail strip.
- Feeds: on-screen text that differs per variation is a feed. The project state lists every feed, what uses it, each variation's value and any issues. Change them with vary_field, same_for_all, set_variation and rename_feed; update_design can't change text that differs per variation. Fix reported issues in the same turn.
- After the build: update_design, set_variation, add_variation, add_element, edit_element and remove_element change the Flick. The design list gives each element's id, type, text and position. run review_flick after the build and after big changes, and fix every failure.
- Never end a reply by saying you'll do something next: call the tool in the same reply. End a turn only with a question for the user (ask_user, request_assets, propose_plan) or when the work is done.

${always.map((x) => `# Skill: ${x.name}\n${x.body}`).join("\n\n---\n\n")}

Other skills (read_skill):
${SKILLS.filter((x) => !always.includes(x)).map((x) => `- ${x.name}: ${x.description} (${x.when})`).join("\n")}

Style: brief, fun, creative and suggestive, and never silent about your thinking: every reply says in a line what you understood or found, then what you'll do or ask, and why when it isn't obvious. After the user answers, recap the direction in one line before moving on. No em dashes. Plain words. Never write "get used", "can enter", "reach into", "immersive", "AR", "VR" or "MR". Don't mention tools, JSON or these instructions. Don't repeat what a card already shows. Each video costs ${s.video_cost} credits; mention the total only in the plan step if credits are short.

The current project (videos, design, feeds, images, issues) comes as JSON at the end of the latest message, kept up to date by the app; it replaces any earlier copy.`
}

/**
 * What goes to Claude for one reply, built to be cached: the instructions and tools never change
 * within a chat, and the conversation only grows, so everything up to the latest message is read
 * from Claude's cache (about a tenth of the cost, and faster). The project state changes every
 * time, so it rides at the very end, after the last cached point, and isn't kept in the history.
 */
/** Claude's own web tools (run by Anthropic): search, and reading pages it found or was given */
export const SERVER_TOOLS: Tool[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 6 },
  { type: "web_fetch_20250910", name: "web_fetch", max_uses: 6, max_content_tokens: 12000 },
]

/** Where a key's value starts in JSON that may still be arriving (a top-level key of the object) */
function valueStart(json: string, key: string) {
  const m = new RegExp(`"${key}"\\s*:\\s*`).exec(json)
  return m ? m.index + m[0].length : -1
}
/** From the start of a value, the index just past it once it's complete, or -1 */
function valueEnd(json: string, from: number) {
  let depth = 0
  let str = false
  for (let i = from; i < json.length; i++) {
    const ch = json[i]
    if (str) {
      if (ch === "\\") i++
      else if (ch === '"') str = false
      continue
    }
    if (ch === '"') str = true
    else if (ch === "{" || ch === "[") depth++
    else if (ch === "}" || ch === "]") {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return -1
}
/** A key's value from partial JSON, once that value is complete */
export function finishedValue(json: string, key: string): unknown {
  const start = valueStart(json, key)
  if (start < 0) return undefined
  const end = valueEnd(json, start)
  if (end < 0) return undefined
  try {
    return JSON.parse(json.slice(start, end))
  } catch {
    return undefined
  }
}
/** The items of an array (under key) that are complete so far, in partial JSON */
export function finishedItems(json: string, key: string): unknown[] {
  const start = valueStart(json, key)
  if (start < 0 || json[start] !== "[") return []
  const out: unknown[] = []
  let i = start + 1
  for (;;) {
    while (i < json.length && /[\s,]/.test(json[i])) i++
    if (i >= json.length || json[i] === "]" || json[i] !== "{") return out
    const end = valueEnd(json, i)
    if (end < 0) return out
    try {
      out.push(JSON.parse(json.slice(i, end)))
    } catch {
      return out
    }
    i = end
  }
}

/**
 * Tool inputs sometimes carry stray call markup inside a text field ('<parameter name="prompt">…').
 * A field that is only that markup becomes the fields it names; any leftover tags are removed.
 */
export function cleanInput(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(cleanInput)
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cleanInput(x)]))
  if (typeof v !== "string" || !/<\/?(parameter|invoke)\b/.test(v)) return v
  const parts = [...v.matchAll(/<parameter name="([\w-]+)">([\s\S]*?)(?=<\/parameter>|<parameter name=|$)/g)]
  if (parts.length && !v.slice(0, v.indexOf("<parameter")).trim()) return Object.fromEntries(parts.map((m) => [m[1], m[2].replace(/<\/?(parameter|invoke)[^>]*>/g, "").trim()]))
  return v.replace(/<\/?(parameter|invoke)[^>]*>/g, "").trim()
}

export function cachedRequest(system: string, raw: Message[], state: unknown, flatten = false) {
  // saved chats can hold blocks the API refuses (empty thinking from older builds); drop them
  const msgs = raw.map((m) => {
    // a chat saved by an older build lost its thinking signatures; its web searches then can't be
    // sent back as they were, so they become plain notes of what was searched
    const broken = flatten || m.content.some((b) => b.type === "thinking" && !b.signature)
    const content = (broken ? m.content.flatMap((b): Block[] => (b.type === "thinking" || b.type === "redacted_thinking" ? (flatten ? [] : [b]) : b.type === "server_tool_use" ? [{ type: "text", text: `(Searched the web: ${String((b.input as { query?: string; url?: string } | undefined)?.query ?? (b.input as { url?: string } | undefined)?.url ?? "")})` }] : b.type === "web_search_tool_result" || b.type === "web_fetch_tool_result" ? [] : [b])) : m.content).filter(keepable)
    return { ...m, content: content.length ? content : [{ type: "text", text: "(thinking)" } as Block] }
  })
  const cache = { cache_control: { type: "ephemeral" } }
  const tools = [...SERVER_TOOLS, ...TOOLS]
  const last = msgs[msgs.length - 1]
  // a paused turn (a long web search) continues from Claude's own message, sent back unchanged
  if (last.role === "assistant") return { system: [{ type: "text", text: system, ...cache }] as unknown as string, messages: msgs, tools: tools.map((t, i) => (i === tools.length - 1 ? { ...t, ...cache } : t)) }
  const tail: Message = { ...last, content: [...last.content.slice(0, -1), { ...last.content[last.content.length - 1], ...cache } as Block, { type: "text", text: `Current project (JSON):\n${JSON.stringify(state)}` }] }
  return {
    system: [{ type: "text", text: system, ...cache }] as unknown as string,
    messages: [...msgs.slice(0, -1), tail],
    tools: tools.map((t, i) => (i === tools.length - 1 ? { ...t, ...cache } : t)),
  }
}

/**
 * Old images leave the history (a line says where they were; view_image brings any back). Done in
 * batches, once the oldest image is far back, so the cached history only changes now and then.
 */
export function dropOldImages(msgs: Message[], { far = 12, keep = 4 } = {}) {
  const has = (c: Block[]): boolean => c.some((b) => b.type === "image" || (b.type === "tool_result" && Array.isArray(b.content) && has(b.content)))
  const oldest = msgs.findIndex((m) => has(m.content))
  if (oldest < 0 || oldest > msgs.length - 1 - far) return false
  const strip = (c: Block[]): Block[] =>
    c.map((b) =>
      b.type === "image"
        ? { type: "text", text: "[An image was here. It's still in the project: view_image shows it again.]" }
        : b.type === "tool_result" && Array.isArray(b.content)
          ? { ...b, content: strip(b.content) }
          : b,
    )
  for (let i = 0; i < msgs.length - keep; i++) if (has(msgs[i].content)) msgs[i] = { ...msgs[i], content: strip(msgs[i].content) }
  return true
}

/* ---------- the chat ---------- */

const id = () => crypto.randomUUID()
type DOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type NewItem = DOmit<Item, "id" | "at"> & { id?: string }
const WAIT = Symbol("wait")

export function useAgent(api: EditorApi, opts: { prompt?: string; imageUrls?: { url: string; name: string }[]; autoStart?: boolean; projectId?: string }) {
  const apiRef = useRef(api)
  apiRef.current = api
  const [items, setItems] = useState<Item[]>([])
  const itemsRef = useRef<Item[]>([])
  itemsRef.current = items
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
  /** library items the chat has seen in search results, by id */
  const libSeen = useRef(new Map<string, LibraryItem>())
  const state = (): ProjectState => ({ ...apiRef.current.state(), images: images.current, skills_read: [...read.current] })
  const keep = (url: string, name: string, from: ProjectImage["from"], kind?: string) => {
    const img = { id: `img-${images.current.length + 1}`, name, url, from, ...(kind ? { kind } : {}) }
    images.current.push(img)
    // the user's own images are kept in the library too (and are then ready to share with Higgsfield)
    if (from === "upload" && live.current) shareable(url, { name, project: apiRef.current.state().title }).catch(() => {})
    return img
  }

  /**
   * Files the user added, for Claude: photos as they are; videos as three stills (start, middle,
   * end) plus their id and length. Returns the blocks, a line naming them, and what to show in the chat.
   */
  const attach = async (files: File[], kind?: string) => {
    const blocks: Block[] = []
    const names: string[] = []
    const shows: string[] = []
    for (const f of files) {
      const url = blobUrl(f)
      if (!f.type.startsWith("video/")) {
        const it = keep(url, f.name, "upload", kind)
        blocks.push(await imageBlock(f))
        names.push(`${it.id} (${f.name})`)
        shows.push(url)
        continue
      }
      try {
        const { duration } = await probeVideo(url)
        const stills = await stillsAt(url, [0.1, 0.5, 0.9].map((k) => k * duration), 768)
        const it = { id: `vid-${images.current.filter((x) => x.kind === "video").length + 1}`, name: f.name, url, from: "upload" as const, kind: "video" }
        images.current.push(it)
        if (live.current) shareable(url, { name: f.name, project: apiRef.current.state().title }).catch(() => {})
        for (const b of stills) blocks.push(await imageBlock(b))
        names.push(`${it.id} (${f.name}, a ${duration.toFixed(1)} s video; the 3 stills above are its start, middle and end)`)
        shows.push(URL.createObjectURL(stills[0]))
      } catch {
        names.push(`${f.name} (a video that couldn't be read)`)
      }
    }
    return { blocks, line: names.length ? `[Added: ${names.join(", ")}]` : "", shows }
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
      refs().then((urls) => generateImage(prompt, aspect, undefined, (status) => patch(itemId, { status } as Partial<Item>), urls, { project: apiRef.current.state().title, variation: target, purpose }, { text: !!input.has_text, quality: purpose === "idea" ? "draft" : "final" })).then((url) => {
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

  /**
   * Concept previews: a quick image of each concept's style, using the user's own images (product,
   * person, style) as references so it shows their real product. Started as soon as each concept is
   * written (see onToolJson), so they're under way while Claude writes the rest.
   */
  const previews = useRef(new Map<string, { prompt: string; job: Promise<string> }>())
  const previewFor = (toolId: string, i: number, c: Record<string, unknown>) => {
    const prompt = String(c.image_prompt ?? c.idea ?? "")
    const key = `${toolId}:${i}`
    const known = previews.current.get(key)
    if (known && known.prompt === prompt) return known.job
    const own = images.current.filter((x) => x.from === "upload" || x.from === "website" || x.from === "library").slice(0, 3)
    const picked = ((c.reference_image_ids as string[] | undefined) ?? []).map((r) => images.current.find((x) => x.id === r)).filter((x): x is ProjectImage => !!x)
    const refs = (picked.length ? picked : own).slice(0, 3)
    const job = Promise.all(refs.map((r) => shareable(r.url).catch(() => null))).then((urls) =>
      generateImage(prompt, aspectOf(state().flick_size), undefined, undefined, urls.filter((x): x is string => !!x), { project: state().title, purpose: "concept preview" }, { quality: "draft" }),
    )
    job.catch(() => previews.current.delete(key))
    previews.current.set(key, { prompt, job })
    return job
  }
  /** while propose_concepts streams in: start a preview for each concept that's complete (only once what varies is settled) */
  const onToolJson = (id: string, name: string, json: string) => {
    if (name !== "propose_concepts" || !live.current) return
    const done = finishedItems(json, "concepts")
    if (!done.length) return
    const from = finishedValue(json, "variations_from")
    if (!variationsSettled(from, false)) return
    done.forEach((c, i) => {
      if (i < 3 && c && typeof c === "object" && (c as { image_prompt?: unknown }).image_prompt) previewFor(id, i, c as Record<string, unknown>).catch(() => {})
    })
  }

  /** concepts and plans wait until what varies is settled: a variations question answered, or the user's own words */
  const variationsSettled = (from: unknown, forPlan: boolean) => {
    const answered = new Set(msgs.current.flatMap((m) => (m.role === "user" ? m.content.flatMap((b) => (b.type === "tool_result" ? [b.tool_use_id] : [])) : [])))
    const calls = msgs.current.flatMap((m) => (m.role === "assistant" ? m.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use") : []))
    if (calls.some((c) => c.name === "ask_user" && (c.input as { purpose?: string }).purpose === "variations" && answered.has(c.id))) return true
    if (forPlan && calls.some((c) => c.name === "propose_concepts" && answered.has(c.id))) return true
    const quote = String((from as { quote?: string } | undefined)?.quote ?? "").trim().toLowerCase()
    if ((from as { basis?: string } | undefined)?.basis === "user_message" && quote.length >= 3) {
      const said = msgs.current.flatMap((m) => (m.role === "user" ? m.content.flatMap((b) => (b.type === "text" && !b.text.startsWith("(Go ahead") ? [b.text.toLowerCase()] : [])) : [])).join("\n")
      return said.includes(quote)
    }
    return false
  }
  const NOT_SETTLED =
    "Not shown: what changes between variations isn't settled yet. Ask first with ask_user (purpose \"variations\"): if the inputs show different products, name them and ask to confirm; if they show one product, offer options from your research (other products in the brand's range by name, or this product only with different serves, scenes, moods, people or offers, and \"I'll add more products\"). Then come back to this."

  const runTool = async (u: Extract<Block, { type: "tool_use" }>): Promise<string | Block[] | typeof WAIT> => {
    const a = apiRef.current
    const input = cleanInput(u.input ?? {}) as Record<string, unknown>
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
        case "propose_concepts": {
          if (live.current && !variationsSettled(input.variations_from, false)) return NOT_SETTLED
          const list = ((input.concepts as Record<string, unknown>[]) ?? []).slice(0, 3)
          if (!list.length) return "Error: Give 1 to 3 concepts."
          const options: Choice[] = list.map((c) => ({
            label: String(c.title ?? "Concept"),
            description: String(c.idea ?? ""),
            question: c.question ? String(c.question) : undefined,
            swap: c.swap ? String(c.swap) : undefined,
            variations: ((c.variations as string[]) ?? []).map(String).slice(0, 5),
            beats: ((c.beats as string[]) ?? []).map(String).slice(0, 4),
          }))
          const itemId = add({ kind: "question", toolId: u.id, question: "Pick a concept", options, display: "concepts", step: "idea", multi: false, custom: true })
          pending.current.push({ toolId: u.id, itemId })
          // previews fill in as they arrive; most already started while Claude was still writing the concepts
          list.forEach((c, i) => {
            const fill = (url: string) => setItems((all) => all.map((x) => (x.id === itemId && x.kind === "question" ? { ...x, options: x.options.map((o, j) => (j === i ? { ...o, image: url } : o)) } : x)))
            if (live.current) previewFor(u.id, i, c).then(fill, () => {})
            else setTimeout(() => fill(apiRef.current.sampleImage("idea", undefined)), 1200 + i * 600)
          })
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
          if (live.current && !variationsSettled(input.variations_from, true)) return NOT_SETTLED
          // a reference given as bare text is its prompt
          if (typeof input.reference === "string") input.reference = { prompt: input.reference }
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
        case "search_library": {
          if (!live.current) return "The library needs the AI server; nothing is saved in the demo."
          const all = await library()
          const words = String(input.query ?? "").toLowerCase().split(/\s+/).filter(Boolean)
          const found = all
            .filter((x) => x.saved && (!input.kind || x.kind === input.kind))
            .filter((x) => words.every((w) => `${x.prompt} ${x.project ?? ""} ${x.variation ?? ""} ${x.purpose ?? ""}`.toLowerCase().includes(w)))
            .slice(0, Math.min(Number(input.limit) || 12, 30))
          libSeen.current = new Map([...libSeen.current, ...found.map((x) => [x.id, x] as const)])
          if (!found.length) return words.length ? "Nothing in the library matches." : "The library is empty."
          return found.map((x) => `- ${x.id} · ${x.kind} · ${new Date(x.created).toISOString().slice(0, 10)}${x.project ? ` · ${x.project}` : ""}${x.variation ? ` · ${x.variation}` : ""}${x.purpose ? ` · ${x.purpose}` : ""}\n  ${x.prompt.slice(0, 220)}`).join("\n")
        }
        case "use_library": {
          const ids = ((input.ids as string[]) ?? []).slice(0, 6)
          const known = ids.map((x) => libSeen.current.get(x)).filter((x): x is LibraryItem => !!x?.file)
          if (!known.length) return "Error: Search the library first, then use ids from the results."
          const out: Block[] = []
          for (const x of known) {
            if (x.kind === "image") {
              const img = keep(x.file!, (x.variation ?? x.prompt).slice(0, 40), "library")
              out.push({ type: "text", text: `${x.id} is now project image ${img.id}. Prompt: ${x.prompt}` })
              try {
                out.push(await imageBlock(await (await fetch(x.file!)).blob()))
              } catch {
                /* shown without the picture */
              }
            } else out.push({ type: "text", text: `${x.id} (video${x.project ? `, ${x.project}` : ""}${x.variation ? `, ${x.variation}` : ""}) was made from: ${x.prompt}` })
          }
          add({ kind: "note", text: `Brought ${known.length} item${known.length === 1 ? "" : "s"} from the library` })
          return out
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
        dropOldImages(msgs.current)
        const now = state()
        const req = cachedRequest(systemPrompt(now), msgs.current, now)
        const itemId = add({ kind: "assistant", text: "", streaming: true })
        const onText = (text: string) => patch(itemId, { text } as Partial<Item>)
        // what it's doing while it writes a tool call (a plan can take a while, with no words to show)
        const onTool = (name: string) => patch(itemId, { activity: ACTIVITY[name] ?? "Working" } as Partial<Item>)
        const ask = (r: typeof req) => (live.current ? streamChat(r, onText, abort.current!.signal, onTool, onToolJson) : mockReply(msgs.current, state(), onText))
        // if the API refuses how earlier searches or thinking were sent back, send them once more as plain notes
        const res = await ask(req).catch((e) => {
          if (e instanceof Error && /tool_result|thinking|signature/i.test(e.message)) return ask(cachedRequest(systemPrompt(now), msgs.current, now, true))
          throw e
        })
        const text = res.content.flatMap((b) => (b.type === "text" && !b.text.startsWith("(Started a web") ? [b.text] : [])).join("\n\n")
        if (text.trim()) patch(itemId, { text, streaming: false } as Partial<Item>)
        else setItems((list) => list.filter((x) => x.id !== itemId))
        msgs.current.push({ role: "assistant", content: res.content })
        // what it looked up on the web, shown as quiet lines
        for (const b of res.content)
          if (b.type === "server_tool_use") {
            const q = (b.input ?? {}) as { query?: string; url?: string }
            add({ kind: "note", text: b.name === "web_search" ? `Searched the web: ${q.query ?? ""}` : `Read ${String(q.url ?? "a page").replace(/^https?:\/\//, "").slice(0, 60)}` })
          }
        // a long search can pause the turn: send it back as it is to carry on
        if (res.stop === "pause_turn") continue
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
    held.current = {}
    return content
  }
  /** answers to questions asked together, kept until every one of them is answered */
  const held = useRef<Record<string, string | Block[]>>({})
  /** keeps one card's answer; true when every question and image request asked together has one */
  const hold = (toolId: string, value: string | Block[]) => {
    held.current[toolId] = value
    return !pending.current.some((p) => !(p.toolId in held.current) && ["question", "assets"].includes(itemsRef.current.find((x) => x.id === p.itemId)?.kind ?? ""))
  }

  const send = useCallback(
    async (text: string, files: File[] = []) => {
      if (busy) return
      const itemId = add({ kind: "user", text, images: [] })
      const blocks: Block[] = settle({ ...held.current })
      const got = await attach(files)
      patch(itemId, { images: got.shows } as Partial<Item>)
      blocks.push(...got.blocks)
      blocks.push({ type: "text", text: (text || "(files added)") + (got.line ? `\n\n${got.line}` : "") })
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
      // questions and image requests asked together go back together, once all are answered (or skipped)
      if (!hold(it.toolId, value + detail)) return
      msgs.current.push({ role: "user", content: settle({ ...held.current }) })
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
        if (!hold(it.toolId, "Skipped: no images.")) return
        msgs.current.push({ role: "user", content: settle({ ...held.current }) })
        return turn()
      }
      const got = await attach(files, kind)
      patch(itemId, { done: "added", images: got.shows } as Partial<Item>)
      const result: Block[] = [{ type: "text", text: got.line }, ...got.blocks]
      if (!hold(it.toolId, result)) return
      msgs.current.push({ role: "user", content: settle({ ...held.current }) })
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
      // image ids become addresses the video model can use
      const url = (id?: string) => (id ? images.current.find((i) => i.id === id)?.url : undefined)
      const urls = (ids?: string[]) => (ids ?? []).map(url).filter((u): u is string => !!u).slice(0, 4)
      const r = apiRef.current.approvePlan({
        ...plan,
        reference: { ...plan.reference, media: { first_frame: url(plan.reference.first_frame_id), last_frame: url(plan.reference.last_frame_id), images: urls(plan.reference.image_ids) } },
        variations: plan.variations.map((v) => ({ ...v, media: { images: urls(v.image_ids), method: v.method } })),
      })
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

  // the chat is saved with its project (with the AI server connected): reopening it picks up here
  type SavedChat = { items: Item[]; msgs: Message[]; pending: typeof pending.current; ready: Block[]; held: Record<string, string | Block[]>; images: ProjectImage[]; read: string[]; draft: Design }
  const restored = useRef<"no" | "loading" | "done">("no")
  const saveChat = useRef<((v: unknown) => void) | null>(null)
  useEffect(() => {
    if (!opts.projectId || !live.current) return
    saveChat.current = saver(`chat-${opts.projectId}`)
  }, [opts.projectId])
  useEffect(() => {
    // save once the chat settles (not mid-reply), and only after loading what was saved
    if (!saveChat.current || busy || restored.current === "loading" || !items.length) return
    saveChat.current({ items: items.map((x) => (x.kind === "assistant" ? { ...x, streaming: false } : x)), msgs: msgs.current, pending: pending.current, ready: ready.current, held: held.current, images: images.current, read: [...read.current], draft: draft.current } satisfies SavedChat)
  }, [items, busy])

  // the first message: what the user typed on Create (unless this chat was saved before)
  useEffect(() => {
    if (started.current || !opts.autoStart || !opts.prompt?.trim()) return
    started.current = true
    if (opts.projectId && live.current) {
      restored.current = "loading"
      loadSaved<SavedChat>(`chat-${opts.projectId}`)
        .catch(() => null)
        .then((saved) => {
          restored.current = "done"
          if (saved?.items?.length) {
            msgs.current = saved.msgs
            pending.current = saved.pending ?? []
            ready.current = saved.ready ?? []
            held.current = saved.held ?? {}
            images.current = saved.images ?? []
            read.current = new Set(saved.read ?? [])
            if (saved.draft) mergeDraft(saved.draft)
            setItems(saved.items)
          } else begin()
        })
      return
    }
    begin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const begin = () => {
    // images added on Create come along as files
    Promise.all(
      (opts.imageUrls ?? []).map(async (r) => {
        try {
          const blob = await (await fetch(r.url)).blob()
          return sameUrl(new File([blob], r.name, { type: blob.type || "image/jpeg" }), r.url) as File
        } catch {
          return null
        }
      }),
    ).then((files) => send(opts.prompt!.trim(), files.filter((f): f is File => !!f)))
  }

  return { items, busy, send, answer, pendingIds: pending.current.map((p) => p.itemId), addAssets, decidePlan, editPlan, retryImage, stop, retry, waiting: pending.current.length > 0, draft: draftView, plan: plan?.plan, step }
}
