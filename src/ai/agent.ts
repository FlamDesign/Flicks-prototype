/**
 * The chat that plans and designs a Flick. Claude (through the AI server) decides what to ask and
 * what to build, calling the tools below; the editor carries them out. Without a connection, a
 * scripted stand-in calls the same tools, so the flow can always be demoed.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { AiError, aspectOf, keepable, generateImage, imageBlock, library, shareable, sharedNow, type LibraryItem, isLive, readWebsite, siteImage, streamChat, type Block, type Message, type SiteRead, type Tool } from "@/ai/client"
import type { Paint, ShapeKind } from "@/components/editor/elements"
import { shotPrompt, type Brand, type Design, type Plan, type PlanVariation, type Shot, type VideoMode } from "@/ai/design"
import { mockReply } from "@/ai/mock"
import { findSkill, SKILLS } from "@/ai/skills"
import { loadSaved, saver } from "@/ai/sync"
import { blobUrl, probeVideo, sameUrl, stillsAt } from "@/lib/media"
import { elements as elementStore, elementsIn, plainMentions, type FlickElement } from "@/lib/elements"
const elementsList = () => elementStore.get()

/* ---------- what the editor offers the chat ---------- */

export type ProjectImage = { id: string; name: string; url: string; from: "upload" | "generated" | "website" | "library"; kind?: string; /** videos: a still, the frame size and the length */ poster?: string; width?: number; height?: number; duration?: number }
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
  /** a picture of the Flick as viewers see it, for one variation (Variation 1 when not named) */
  shot(variation?: string): Promise<{ blob: Blob; name: string; note: string }>
  /** where it runs, as a size (width×height) and optionally a length */
  setFormat(size: string, seconds?: number): string
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
  type?: "text" | "button" | "image" | "shape"
  /** shapes */
  shape?: ShapeKind
  fill?: Paint
  stroke?: Paint
  stroke_width?: number
  height?: number
  points?: number
  opacity?: number
  /** "back" puts it behind everything else (a backdrop), "front" on top */
  layer?: "front" | "back"
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
export type Display = "chips" | "cards" | "palettes" | "layouts" | "thumbnails" | "pictures" | "sizes" | "concepts"
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
  /** pictures: what the app draws for this answer */
  image_prompt?: string
  /** sizes: width×height in pixels */
  size?: string
}

type Base = { id: string; at: number }
export type Item = Base &
  (
    | { kind: "user"; text: string; images: string[] }
    | { kind: "assistant"; text: string; streaming?: boolean; activity?: string }
    | { kind: "question"; toolId: string; question: string; options: Choice[]; display: Display; step?: Step; multi: boolean; custom: boolean; answer?: string; purpose?: string }
    | { kind: "assets"; toolId: string; message: string; kinds: string[]; done?: "added" | "skipped"; images?: string[] }
    | { kind: "brand"; brand: Brand }
    | { kind: "plan"; toolId: string; plan: Plan; state: "open" | "approved" | "skipped"; previews?: (string | undefined)[]; frames?: (string | undefined)[] }
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
    image_ids: { type: "array", items: { type: "string" }, description: "Project image ids (or a product sheet) showing exactly how this variation's changed thing looks; in its prompt they are [Image 1], [Image 2]… in this order" },
    prompt: { type: "string", description: "Only what changes from the reference video, naming its inputs: e.g. 'Replace the boot with the black boot from [Image 1].' Every variation is an edit of the approved reference video (same shot, camera, people and timing), so describe the change only. One or two sentences." },
    video_id: { type: "string", description: "Only when the user gave a finished video for this variation: its project video id. It's used as it is: nothing is generated for it, and its prompt can be empty." },
    thumbnail_id: { type: "string", description: "Only when the user gave a thumbnail image for this variation: its project image id. It's placed as the thumbnail; don't make one." },
    label: { type: "string", description: "Optional on-screen label for this variation, e.g. 'Gold lenses'" },
    price: { type: "string", description: "Optional price with currency, e.g. '$189'" },
    link: { type: "string", description: "Optional URL the button opens for this variation" },
    headline: { type: "string", description: "Only if this variation's headline should differ from the design's" },
    subheading: { type: "string", description: "Only if it should differ per variation" },
    cta: { type: "string", description: "Only if this variation's button text should differ" },
  },
  required: ["name"],
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
        size: { type: "string", description: "For sizes: width×height in pixels, e.g. '300×250'" },
        image_prompt: { type: "string", description: "For pictures: a visual description of this answer (setting, light, mood, styling); the app makes a quick picture of it with the user's product" },
      },
      required: ["label"],
    },
  ],
}

/**
 * How the variations were settled; concepts and plans are refused until they are. Flat fields (not a
 * nested object): nested objects in tool input sometimes came back garbled, losing their fields.
 */
const variationsFrom = {
  variations_basis: { type: "string", enum: ["asked", "user_message"], description: "How you know what changes between variations. asked: the user answered your ask_user with purpose 'variations' (also how you confirm products seen in the images); user_message: the user said it themselves in a message" },
  variations_quote: { type: "string", description: "For user_message: the user's own words naming what varies, copied exactly" },
}

export const TOOLS: Tool[] = [
  {
    name: "read_skill",
    description: "Read one or more of Flam's skills (playbooks for making great Flicks) in full. Read each before the step it covers; the list is in your instructions.",
    input_schema: { type: "object", properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] },
  },
  {
    name: "review_flick",
    description: "Check the built Flick against the review skill: text fits the format, nothing overlaps or leaves the frame, buttons readable and linked, feeds filled, every variation has a thumbnail and a distinct name. Returns what passes and what to fix, plus a picture of the Flick as viewers see it (Variation 1, and any variation with its own copy): look at it for what the checks can't measure.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "view_flick",
    description: "See the built Flick as viewers see it: a frame of a variation's video with every element (text, buttons, logo, thumbnail strip) drawn on top, at the Flick's shape. Use it after big design changes, before handing over, and when the user says something looks off. Check by eye: text readable over the video, nothing covering the product or faces, not crowded, the strip clear of the action.",
    input_schema: { type: "object", properties: { variation: { type: "string", description: "Its name; Variation 1 when left out" } } },
  },
  {
    name: "propose_concepts",
    description:
      "Show the user up to 3 concepts to choose from before the plan: each with a title, the idea in one line, the question the tap answers, what changes, the variations, the story in 2 or 3 beats, and a prompt for a quick preview image of its style (the app makes the previews). The user picks one, or types a mix or a change; that comes back as the result. Always use this before propose_plan unless the user already gave a complete concept or asked to skip ideas.",
    input_schema: {
      type: "object",
      properties: {
        ...variationsFrom,
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
      required: ["variations_basis", "concepts"],
    },
  },
  {
    name: "ask_user",
    description:
      "Ask the user one short question with tappable answers; the choice comes back as the result. display picks how the answers look: 'chips' (words), 'cards' (a label and a line each), 'palettes' (colour swatches; give colors), 'layouts' (mini Flick previews; give design with layout, align, button_style and thumbnails), 'thumbnails' (thumbnail strip styles; give design.thumbnails), 'pictures' (a picture per answer; give image_prompt; use it for anything the user judges by eye: setting, mood, light, styling, people, props), 'sizes' (frame shapes drawn to scale; give size; with purpose 'size' the picked or typed size is applied to the Flick). Visual answers update the live preview as soon as they're picked. step tags where the user is: idea, look or plan.",
    input_schema: {
      type: "object",
      properties: {
        question: str,
        options: { type: "array", items: choiceSchema, minItems: 2, maxItems: 9, description: "Up to 6; up to 9 for sizes" },
        display: { type: "string", enum: ["chips", "cards", "palettes", "layouts", "thumbnails", "pictures", "sizes"] },
        step: { type: "string", enum: ["idea", "look", "plan"] },
        purpose: { type: "string", enum: ["variations", "placement", "size", "other"], description: "'variations' when asking what changes between variations; 'placement' for where it will run; 'size' for the Flick's size (the answer is applied)" },
        multi_select: { type: "boolean" },
        allow_custom: { type: "boolean", description: "Let the user type their own answer" },
      },
      required: ["question", "options"],
    },
  },
  {
    name: "set_format",
    description: "Set the Flick's size (width×height in pixels) and, only if the user asked, its length. Use it when the user names a size in their own words; a size question (purpose 'size') applies the answer by itself. Videos are made in the closest shape the video model makes and cover the frame, centred.",
    input_schema: { type: "object", properties: { size: { type: "string", description: "e.g. '300×250' or '728×90'" }, seconds: { type: "number", description: "4 to 15; only when the user asked for a length" } }, required: ["size"] },
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
      "Show the full plan for approval: a title, the reference video prompt, 2 to 5 variations and the on-screen design. The reference video IS Variation 1: variations[0] is it (its name, label, price, link; its prompt is reference_prompt), and variations[1..] are made from it. So 3 variations means 3 videos. The user can edit it, then Generate all. The result says whether it was approved (and generated) or what to change.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Project name, 2 to 5 words" },
        reference_mode: {
          type: "string",
          enum: ["reference", "edit", "animate"],
          description:
            "How the reference video is made. 'reference' (default): a new video that stays true to reference_image_ids / reference_video_ids (the product, characters, style; uploaded, from a website, an approved suggested look or a sheet). 'edit': the user gave a video and asked to change it: source_video_id is changed, keeping the rest. 'animate': the user gave an image to be turned into video as it is (or a photo you edited first): first_frame_id opens the video exactly.",
        },
        shot: {
          type: "object",
          description: "The reference video's prompt in parts. Name inputs as [Image n] / [Video n] by their position in reference_image_ids / reference_video_ids (in edit, the user's video is 'the video').",
          properties: {
            subject: { type: "string", description: "What appears and from which input: e.g. 'The bottle from [Image 1] on the bar from [Image 2], styled like [Video 1]'" },
            action: { type: "string", description: "What happens, in order" },
            camera: { type: "string", description: "Shot, movement and speed, e.g. 'Slow push-in, eye level, shallow focus'" },
            setting: { type: "string", description: "Place, time, light and mood" },
            keep: { type: "string", description: "What must stay exact, e.g. 'the label and bottle shape exactly as in [Image 1]'" },
          },
          required: ["subject", "action", "camera"],
        },
        storyboard: {
          type: "array",
          minItems: 3,
          maxItems: 4,
          description: "The reference video as 3 or 4 frames in order, shown to the user as a storyboard with a quick picture each: what happens in that moment and how it's framed. Plain words, no [Image n].",
          items: { type: "object", properties: { action: { type: "string", description: "What we see, under 10 words" }, camera: { type: "string", description: "Framing or move, 2 to 4 words" } }, required: ["action"] },
        },
        reference_prompt: { type: "string", description: "Only if you don't give shot: the reference video in 1 to 3 sentences, naming inputs as [Image n] / [Video n]." },
        reference_image_ids: { type: "array", items: { type: "string" }, description: "In order, the project images the reference video must stay true to: the user's product or people photos, website images, an approved suggested look, product or character sheets. They are [Image 1], [Image 2]… in the prompt. Required for 'reference' unless reference_video_ids is given." },
        reference_video_ids: { type: "array", items: { type: "string" }, description: "In order, the user's videos to follow for motion, camera or style ('reference' mode): [Video 1], [Video 2]…" },
        source_video_id: { type: "string", description: "'edit' only: the user's video to change" },
        first_frame_id: { type: "string", description: "'animate' only: the user's image (or your edit of it) that the video opens on exactly" },
        last_frame_id: { type: "string", description: "'animate' only, optional: an image the video ends on" },
        videos_mismatch_ok: { type: "boolean", description: "Only after the user said to go on with their videos even though their sizes or lengths differ" },
        ...variationsFrom,
        variations: { type: "array", items: variationSchema, minItems: 2, maxItems: 5, description: "Every variation in the Flick, in order. The first is the reference video itself (Variation 1): give its name, label, price and link; its prompt can repeat reference_prompt. The others say only what changes from it." },
        design: designSchema,
      },
      required: ["title", "variations", "design"],
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
        purpose: { type: "string", enum: ["thumbnail", "canvas", "idea", "look", "edit"], description: "'look': a suggested reference image for the video when the user gave nothing; 'edit': the user's photo changed (keep it in reference_image_ids) before animating it; 'idea': just to show" },
        variation: { type: "string", description: "Variation name, for thumbnails" },
        aspect_ratio: { type: "string", enum: ["1:1", "4:5", "3:4", "9:16", "16:9"] },
        reference_image_ids: { type: "array", items: { type: "string" }, description: "Project image ids to keep true to (product first, then a model or scene), up to 16. A video id works too: the app sends a still from it" },
        has_text: { type: "boolean", description: "True when the image must show readable words (a badge, an offer, a sign); a model that renders text well makes it" },
      },
      required: ["prompt", "purpose"],
    },
  },
  {
    name: "make_sheet",
    description:
      "Make a product sheet or character sheet from the user's images: the same product or person from several angles on a clean background, so they stay the same in every video. Waits until it's made (10 to 60 seconds) and returns its image id, shown in the chat. Use it in reference_image_ids and variations' image_ids.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["product", "character"] },
        name: { type: "string", description: "What it is, e.g. 'Samba OG' or 'Runner'" },
        image_ids: { type: "array", items: { type: "string" }, description: "The user's photos of it (project image ids), best first" },
        notes: { type: "string", description: "Optional: details to get right, e.g. 'gold three stripes, gum sole'" },
      },
      required: ["kind", "name", "image_ids"],
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
      "Add any text, button, image or shape to the canvas (on every variation). Shapes (rect with radius, ellipse, triangle, star, polygon, line, arrow, heart) take fill and stroke as a colour or a gradient, stroke_width, points, opacity, width and height: use them for badges, backdrops behind text, dividers, frames and pointers, under the text they support (add them first or say so). Text styles: heading, subheading, body, caption, label. Button styles: pill, rounded, sharp, light, outline, glass, link. Images: image_id of a project image (uploaded, from a website or generated; a logo, a product shot). Place it with position (top, upper, center, lower, bottom) and align (left, center, right), or exact x and y (% of the frame; x is the left edge, centre or right edge by align, y the middle). width: % of the frame (images, or a text box that wraps). size: font size in % of frame width (heading is 8, body 3.4). Keep clear of other elements and the thumbnail strip (see design). Returns the new element's id.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["text", "button", "image", "shape"] },
        shape: { type: "string", enum: ["rect", "ellipse", "triangle", "star", "polygon", "line", "arrow", "heart"], description: "Shapes: which one" },
        fill: { description: "A hex colour, 'transparent', or a gradient: {type: 'linear' or 'radial', angle (degrees, CSS style: 90 = left to right), stops: [{color, at (0 to 100)}]}", anyOf: [{ type: "string" }, { type: "object", properties: { type: { type: "string", enum: ["linear", "radial"] }, angle: { type: "number" }, stops: { type: "array", items: { type: "object", properties: { color: { type: "string" }, at: { type: "number" } }, required: ["color", "at"] } } }, required: ["type", "stops"] }] },
        stroke: { description: "A hex colour, 'transparent', or a gradient: {type: 'linear' or 'radial', angle (degrees, CSS style: 90 = left to right), stops: [{color, at (0 to 100)}]}", anyOf: [{ type: "string" }, { type: "object", properties: { type: { type: "string", enum: ["linear", "radial"] }, angle: { type: "number" }, stops: { type: "array", items: { type: "object", properties: { color: { type: "string" }, at: { type: "number" } }, required: ["color", "at"] } } }, required: ["type", "stops"] }] },
        stroke_width: { type: "number", description: "Shapes: outline or line width in px at 1080 wide (0 = none)" },
        height: { type: "number", description: "Shapes: height in % of the frame height (width sets it by the shape's proportions when left out)" },
        points: { type: "number", description: "Stars: points; polygons: sides (3 to 12)" },
        opacity: { type: "number", description: "Shapes: 0 to 1" },
        layer: { type: "string", enum: ["front", "back"], description: "'back' puts it behind every other element (backdrops behind text); default front" },
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
      "Change one element by its id from the design list: move (position/align or x/y), resize (width, size; shapes also height), restyle (style, color, background, font, bold, italic, radius; shapes: fill, stroke, stroke_width, points, opacity), change its text or link, swap an image (image_id), or hide it. Text that differs per variation is changed with vary_field instead.",
    input_schema: {
      type: "object",
      properties: {
        id: str,
        text: str,
        style: str,
        image_id: str,
        fill: { description: "A hex colour, 'transparent', or a gradient: {type: 'linear' or 'radial', angle (degrees, CSS style: 90 = left to right), stops: [{color, at (0 to 100)}]}", anyOf: [{ type: "string" }, { type: "object", properties: { type: { type: "string", enum: ["linear", "radial"] }, angle: { type: "number" }, stops: { type: "array", items: { type: "object", properties: { color: { type: "string" }, at: { type: "number" } }, required: ["color", "at"] } } }, required: ["type", "stops"] }] },
        stroke: { description: "A hex colour, 'transparent', or a gradient: {type: 'linear' or 'radial', angle (degrees, CSS style: 90 = left to right), stops: [{color, at (0 to 100)}]}", anyOf: [{ type: "string" }, { type: "object", properties: { type: { type: "string", enum: ["linear", "radial"] }, angle: { type: "number" }, stops: { type: "array", items: { type: "object", properties: { color: { type: "string" }, at: { type: "number" } }, required: ["color", "at"] } } }, required: ["type", "stops"] }] },
        stroke_width: { type: "number" },
        height: { type: "number" },
        points: { type: "number" },
        opacity: { type: "number" },
        layer: { type: "string", enum: ["front", "back"] },
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
  set_format: "Setting the size",
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
  view_flick: "Looking at the Flick",
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
- The user's own variation videos: when the user gives a finished video for each variation (e.g. 'here are my 3 videos'), nothing needs generating. Skip concepts, looks, sheets, shots and storyboards: settle only what's missing for the design (names, copy, prices, links), then propose_plan with each variation's video_id (and thumbnail_id when they gave thumbnails); no shot or reference fields. The app checks the videos match each other and the Flick in frame shape and length, and tells you if they don't. After approval, make thumbnails only for variations without one; if every variation has a thumbnail, make none. If only some variations have a video, the rest are made as usual (from Variation 1).
- Pictures over words: when a question is about something the user judges by eye (setting, mood, light, styling, people, props), ask with display 'pictures' and an image_prompt per answer (up to 4); the app draws each with their product.
- Storyboard: every plan gives storyboard, the reference video as 3 or 4 frames (what happens, how it's framed); the app draws a quick still per frame.
- Concepts: propose_concepts shows up to 3 concepts as cards with preview images; use it before every plan unless the user already gave a full concept or asked to skip ideas.
- Videos the user adds (vid-1, vid-2...) arrive as three stills (start, middle, end) with their length (15 seconds at most; longer ones were trimmed). Say what happens in each. Decide from the context what each upload is for, and say it in a line: a video to change (plan reference_mode "edit", source_video_id), a video or image to follow for style, characters or the product (reference_video_ids / reference_image_ids), or an image to bring to life as it is (reference_mode "animate", first_frame_id). Ask only when it's truly unclear.
- Mentions: the user can type @ to point at things. @Image 1 / @Video 1 are that message's own files in order; @<element name> is a saved element (a product, character, logo or style saved once with its images, listed in saved_elements); it arrives with its images, kept as project images, and a [Mentions: ...] line maps each @name to image ids: use exactly those ids (reference_image_ids, a variation's image_ids, generate_image reference_image_ids). @<variation name> means that variation, @Brand the brand kit. You can suggest saved elements by name ("use @Samba OG?").
- Questions: ask_user shows tappable answers. display "chips" for words; "layouts", "palettes" or "thumbnails" for visual choices; step "idea", "look" or "plan" moves the progress bar. Several ask_user calls in one reply show together. request_assets asks for files.
- Web: web_search finds pages; web_fetch reads a page or PDF (text) that appeared in the conversation or in search results; read_website reads a product page for its products, prices, colours and images (and keeps the images for the project). Use them on your own whenever a brand or product is hinted.
- Brand: set_brand records the brand (name, colours, font, voice).
- Images: generate_image (with reference_image_ids to keep the user's images, has_text for readable words), view_image to look at any project image, use_image to place one. The app picks the model from these (models skill). When the user gave nothing to work from, suggest looks first: concept previews (propose_concepts) and generate_image purpose "look" make reference images; the picked or approved one goes into the plan's reference_image_ids. To change a user's photo before animating it, generate_image purpose "edit" with that photo in reference_image_ids, then plan reference_mode "animate" with the result as first_frame_id.
- Sheets: make_sheet makes a product sheet or character sheet (several views on a clean background) from the user's images, so a product or person stays the same in every video. Make one when a product or person must stay consistent across videos, or when there's only one photo of it; use it in reference_image_ids and variations' image_ids. Ask the user to approve it (ask_user) when getting it right matters (a hero product, a face).
- Videos: the reference video is Variation 1 (the first video in state.videos, role "reference"): it is in the Flick like the others, with its own name, label, thumbnail and link, and the other variations are made from it. It is made first, one of three ways (reference_mode): "reference" (default) stays true to reference_image_ids and reference_video_ids (product, characters, style); "edit" changes the user's own video (source_video_id); "animate" brings the user's image to life as it is (first_frame_id). There is no prompt-only video: with nothing given, suggest looks first. Write the reference prompt as shot (subject, action, camera, setting, keep) and name inputs by position: [Image 1], [Image 2]… for reference_image_ids, [Video 1]… for reference_video_ids, "the video" for the one being edited. When the user has product or people images, the reference video must use them; a plan without them is refused. The user always reviews it (reference_review in the project state); variations are made only after they approve, each one an edit of the latest reference video: same shot, camera, people and timing, with only its change (its prompt says the change, naming its image_ids as [Image 1]…). See the models skill. When the reference is ready, ask them to review it; if they want changes, regenerate the reference with set_variation (variation "reference", regenerate true) and they review the new one.
- Library: everything made before is kept. search_library finds earlier images and videos (with their prompts); use_library brings them in as references or starting points.
- The plan: propose_plan is the approval before any video credits are spent. It carries the reference video prompt (that video is Variation 1, the first in the list, not an extra one), each variation (name, prompt, label, price, link, and headline, subheading or button text only when they differ) and the design. The user edits it and presses Generate all; the app then makes every video and places the design and thumbnail strip.
- Feeds: on-screen text that differs per variation is a feed. The project state lists every feed, what uses it, each variation's value and any issues. Change them with vary_field, same_for_all, set_variation and rename_feed; update_design can't change text that differs per variation. Fix reported issues in the same turn.
- After the build: update_design, set_variation, add_variation, add_element, edit_element and remove_element change the Flick. The design list gives each element's id, type, text and position. run review_flick after the build and after big changes, and fix every failure, including what you see in its picture. view_flick shows any variation as viewers see it: use it after design changes and whenever the user says something looks off, and fix what you see (text over a busy area, covering the product or a face, crowding, the strip over the action). A screenshot the user pastes is their canvas: edit from it.
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
    if (from === "upload" && live.current) shareable(url, { name, project: apiRef.current.state().title, purpose: "upload" }).catch(() => {})
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
    // ids in the order added, photos and videos counted apart (for @Image 1, @Video 1)
    const photoIds: string[] = []
    const videoIds: string[] = []
    for (const f of files) {
      const url = blobUrl(f)
      if (!f.type.startsWith("video/")) {
        const it = keep(url, f.name, "upload", kind)
        blocks.push(await imageBlock(f))
        names.push(`${it.id} (${f.name})`)
        shows.push(url)
        photoIds.push(it.id)
        continue
      }
      try {
        const { duration, width, height } = await probeVideo(url)
        const stills = await stillsAt(url, [0.1, 0.5, 0.9].map((k) => k * duration), 768)
        const it: ProjectImage = { id: `vid-${images.current.filter((x) => x.kind === "video").length + 1}`, name: f.name, url, from: "upload", kind: "video", poster: URL.createObjectURL(stills[0]), width, height, duration }
        images.current.push(it)
        if (live.current) {
          shareable(url, { name: f.name, project: apiRef.current.state().title, purpose: "upload" }).catch(() => {})
          shareable(it.poster!).catch(() => {})
        }
        for (const b of stills) blocks.push(await imageBlock(b))
        names.push(`${it.id} (${f.name}, a ${duration.toFixed(1)} s video, ${width}×${height}; the 3 stills above are its start, middle and end)`)
        shows.push(it.poster!)
        videoIds.push(it.id)
      } catch {
        names.push(`${f.name} (a video that couldn't be read)`)
      }
    }
    return { blocks, line: names.length ? `[Added: ${names.join(", ")}]` : "", shows, photoIds, videoIds }
  }

  /**
   * Elements the user @mentioned: their images join the project (kept as library images, so nothing
   * is uploaded again) and go to Claude, with a line saying which ids each element is.
   */
  const attachElements = async (els: FlickElement[]) => {
    const blocks: Block[] = []
    const lines: string[] = []
    for (const el of els) {
      const ids: string[] = []
      for (const [i, im] of el.images.slice(0, 3).entries()) {
        const it = images.current.find((x) => x.url === im.url) ?? keep(im.url, `${el.name} ${i + 1}`, "library", el.kind)
        ids.push(it.id)
        try {
          blocks.push(await imageBlock(await (await fetch(im.url)).blob()))
        } catch {
          /* listed even if it can't be shown */
        }
      }
      lines.push(`@${el.name} = the ${el.kind} element "${el.name}": ${ids.join(", ")}`)
    }
    return { blocks, lines }
  }

  const add = (it: NewItem) => {
    const full = { id: it.id ?? id(), at: Date.now(), ...it } as Item
    setItems((list) => [...list, full])
    return full.id
  }
  const patch = (itemId: string, p: Partial<Item>) => setItems((list) => list.map((x) => (x.id === itemId ? ({ ...x, ...p } as Item) : x)))

  /** variations whose thumbnail is still generating (the review doesn't count them as missing) */
  const pendingThumbs = useRef(new Set<string>())
  const runImage = (input: Record<string, unknown>, reuse?: string): string | Promise<string> => {
    const purpose = String(input.purpose ?? "idea")
    const target = input.variation ? String(input.variation) : undefined
    const prompt = String(input.prompt ?? "")
    const aspect = String(input.aspect_ratio ?? (purpose === "canvas" || purpose === "look" || purpose === "edit" ? aspectOf(state().flick_size) : "1:1"))
    const startedAt = Date.now()
    const itemId = reuse ?? add({ kind: "image", prompt, purpose, target, aspect, state: "working", status: "starting", startedAt })
    if (reuse) patch(reuse, { state: "working", status: "starting", startedAt, error: undefined } as Partial<Item>)
    const key = purpose === "thumbnail" && target ? target.trim().toLowerCase() : ""
    if (key) pendingThumbs.current.add(key)
    const name = String(input.name ?? "").trim() || prompt.slice(0, 40)
    const done = (url: string) => {
      if (key) pendingThumbs.current.delete(key)
      let placed = false
      if (purpose === "thumbnail" && target) placed = !apiRef.current.setThumbnail(target, url).startsWith("Error")
      if (purpose === "canvas") placed = !apiRef.current.addImageToCanvas(url).startsWith("Error")
      const kept = keep(url, name, "generated", purpose === "sheet" ? String(input.sheet_kind ?? "product") : undefined)
      patch(itemId, { state: "done", url, placed } as Partial<Item>)
      return kept
    }
    const fail = (e: unknown) => (key && pendingThumbs.current.delete(key), patch(itemId, { state: "failed", error: e instanceof Error ? e.message : "The image failed." } as Partial<Item>))
    const refIds = ((input.reference_image_ids as string[] | undefined) ?? []).slice(0, 16)
    const refImages = refIds.map((r) => images.current.find((i) => i.id === r)).filter((i): i is ProjectImage => !!i)
    // the images to keep, at addresses Higgsfield can open (uploads go to the server first)
    // a video given as a reference goes as a still from it: the image models take pictures only
    // a reference that can't be opened (a file from an earlier visit that only lived in that browser) stops
    // the image rather than making it without the product
    const refs = () =>
      Promise.all(refImages.map((i) => pictureOf(i).then((u) => shareable(u)).catch(() => null))).then((u) => {
        const lost = refImages.filter((_, k) => !u[k]).map((i) => i.name)
        if (lost.length) throw new Error(`Couldn't open ${lost.join(", ")} (added in an earlier visit and no longer in this browser). Add ${lost.length === 1 ? "it" : "them"} again.`)
        return u.filter((x): x is string => !!x)
      })
    const made: Promise<ProjectImage> = live.current
      ? refs()
          .then((urls) => generateImage(prompt, aspect, undefined, (status) => patch(itemId, { status } as Partial<Item>), urls, { project: apiRef.current.state().title, variation: target, purpose }, { text: !!input.has_text, quality: purpose === "idea" ? "draft" : "final" }))
          .then(done)
      : new Promise((ok) => setTimeout(() => ok(done(apiRef.current.sampleImage(purpose === "sheet" || purpose === "look" || purpose === "edit" ? "idea" : purpose, target))), 1800 + Math.random() * 1200))
    made.catch(fail)
    // images the plan builds on come back with their id, so the next step can use them
    if (purpose === "look" || purpose === "edit" || purpose === "sheet")
      return made.then(
        (img) => `Done: ${img.id} (${purpose === "sheet" ? `${input.sheet_kind ?? "product"} sheet` : purpose === "edit" ? "edited photo" : "suggested look"}), shown in the chat. ${purpose === "edit" ? "Animate it with reference_mode \"animate\" and first_frame_id." : "Use it in reference_image_ids (and variations' image_ids for a sheet)."}`,
        (e) => `Error: ${e instanceof Error ? e.message : "The image failed."}`,
      )
    return `Started. It shows in the chat when ready${purpose === "thumbnail" && target ? ` and becomes ${target}'s thumbnail` : purpose === "canvas" ? " and is added to the canvas" : ""}.`
  }

  /** a product or character sheet: the same item from several angles, from the user's images */
  const runSheet = (input: Record<string, unknown>) => {
    const kind = input.kind === "character" ? "character" : "product"
    const name = String(input.name ?? (kind === "character" ? "Character" : "Product")).trim()
    const ids = ((input.image_ids as string[] | undefined) ?? []).filter((x) => images.current.some((i) => i.id === x))
    if (!ids.length) return "Error: give image_ids: the user's photos of this " + kind + "."
    const views =
      kind === "character"
        ? "a character reference sheet of the person in the images: full body front, three-quarter and side views, plus a head-and-shoulders close-up, same face, hair, body and outfit in every view"
        : "a product reference sheet of the product in the images: front, three-quarter, side and back views, plus a close-up of the label or key detail, identical shape, colours, materials and markings in every view"
    return runImage({
      purpose: "sheet",
      sheet_kind: kind,
      name: `${name} ${kind} sheet`,
      aspect_ratio: "16:9",
      reference_image_ids: ids,
      prompt: `${views}. Evenly spaced on a plain light grey studio background, soft even light, no text, no labels, no props.${input.notes ? ` ${String(input.notes)}` : ""}`,
    })
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
    const job = Promise.all(refs.map((r) => pictureOf(r).then((u) => shareable(u)).catch(() => null))).then((urls) =>
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
    const from = { basis: finishedValue(json, "variations_basis"), quote: finishedValue(json, "variations_quote") }
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

  /** what varies, from the flat fields (or the older nested shape) */
  const fromOf = (input: Record<string, unknown>) => {
    const old = input.variations_from as { basis?: string; quote?: string } | undefined
    return { basis: (input.variations_basis as string | undefined) ?? old?.basis, quote: (input.variations_quote as string | undefined) ?? old?.quote }
  }
  /** the reference video, from the flat fields, the older nested object, or a garbled mix of both */
  const referenceOf = (input: Record<string, unknown>): Plan["reference"] => {
    const r = input.reference
    const nested = (r && typeof r === "object" ? r : typeof r === "string" ? { prompt: r } : {}) as Partial<Plan["reference"]>
    const ids = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : undefined)
    const shot = ((input.shot && typeof input.shot === "object" ? input.shot : nested.shot) ?? undefined) as Shot | undefined
    const first = (input.first_frame_id as string | undefined) ?? nested.first_frame_id
    const source = (input.source_video_id as string | undefined) ?? nested.source_video_id
    const asked = (input.reference_mode as VideoMode | undefined) ?? nested.mode
    // the mode follows what was given when it isn't said (an older plan had no mode)
    const mode: VideoMode = asked === "edit" && source ? "edit" : asked === "animate" && first ? "animate" : asked ? "reference" : source ? "edit" : first ? "animate" : "reference"
    return {
      prompt: (shotPrompt(shot) || String(input.reference_prompt ?? nested.prompt ?? "")).trim(),
      mode,
      shot,
      first_frame_id: first,
      last_frame_id: (input.last_frame_id as string | undefined) ?? nested.last_frame_id,
      image_ids: ids(input.reference_image_ids) ?? ids(nested.image_ids) ?? ids(input.image_ids),
      video_ids: ids(input.reference_video_ids) ?? ids(nested.video_ids),
      source_video_id: source,
      storyboard: framesOf(input.storyboard ?? nested.storyboard),
    }
  }
  /** the storyboard's frames: 2 to 4 with something happening in each */
  const framesOf = (v: unknown): Plan["reference"]["storyboard"] => {
    const list = (Array.isArray(v) ? v : [])
      .map((f) => (typeof f === "string" ? { action: f } : f && typeof f === "object" ? { action: String((f as { action?: unknown }).action ?? ""), camera: (f as { camera?: unknown }).camera ? String((f as { camera?: unknown }).camera) : undefined } : null))
      .filter((f): f is { action: string; camera?: string } => !!f && !!f.action.trim())
      .slice(0, 4)
    return list.length >= 2 ? list : undefined
  }

  /**
   * The plan card shows the Flick with stills standing in for the videos: one quick draft image per
   * variation that has no image of its own, made from the reference shot plus that variation's
   * change, with the user's images as references so it's their product.
   */
  const planPreviews = (itemId: string, plan: Plan) => {
    const fill = (i: number, url: string) =>
      setItems((list) => list.map((x) => (x.id === itemId && x.kind === "plan" ? { ...x, previews: Object.assign([...(x.previews ?? [])], { [i]: url }) } : x)))
    const own = images.current.filter((x) => x.kind !== "video" && (x.from === "upload" || x.from === "website" || x.from === "library"))
    const refIds = [plan.reference.first_frame_id, ...(plan.reference.image_ids ?? [])].filter((x): x is string => !!x)
    const refs = (refIds.length ? refIds.map((r) => images.current.find((x) => x.id === r)).filter((x): x is ProjectImage => !!x) : own).slice(0, 3)
    plan.variations.forEach((v, i) => {
      // the user's own video: its first frame
      const mine = v.video_id ? images.current.find((x) => x.id === v.video_id)?.poster : undefined
      if (mine) return fill(i, mine)
      if (v.image_ids?.length || v.video_id) return
      if (!live.current) return void setTimeout(() => fill(i, apiRef.current.sampleImage("variation", String(i))), 900 + i * 500)
      Promise.all(refs.map((r) => shareable(r.url).catch(() => null)))
        .then((urls) =>
          generateImage((i === 0 ? plan.reference.prompt : `${plan.reference.prompt} ${v.prompt}`).trim(), aspectOf(state().flick_size), undefined, undefined, urls.filter((x): x is string => !!x), { project: state().title, variation: v.name, purpose: "plan preview" }, { quality: "draft" }),
        )
        .then((url) => fill(i, url), () => {})
    })
  }

  /** pictures of the Flick for Claude, one per variation asked for, each shown small in the chat too */
  const lookAt = async (variations: (string | undefined)[]): Promise<Block[]> => {
    const out: Block[] = []
    for (const v of variations) {
      try {
        const shot = await apiRef.current.shot(v)
        out.push({ type: "text", text: shot.note }, await imageBlock(shot.blob))
        add({ kind: "image", prompt: shot.note, purpose: "view", target: shot.name, state: "done", url: URL.createObjectURL(shot.blob), placed: true })
      } catch {
        /* not built yet, or it couldn't be drawn */
      }
    }
    return out
  }

  /** a picture of a project item for the image models: itself, or for a video a still from it (kept) */
  const pictureOf = async (i: ProjectImage) => {
    if (i.kind !== "video") return i.url
    if (i.poster) return i.poster
    const len = i.duration ?? (await probeVideo(i.url).catch(() => undefined))?.duration ?? 2
    i.poster = URL.createObjectURL((await stillsAt(i.url, [Math.min(1, len / 2)], 1024))[0])
    return i.poster
  }

  /**
   * The user's own videos, checked against each other and the Flick: same frame shape and the same
   * length (half a second either way). Returns what doesn't match, in plain words, or nothing.
   */
  const videoMismatch = async (list: { name: string; it: ProjectImage }[]) => {
    const got = await Promise.all(
      list.map(async ({ name, it }) => {
        if (!it.width || !it.duration) {
          const p = await probeVideo(it.url).catch(() => undefined)
          if (p) Object.assign(it, { width: p.width, height: p.height, duration: p.duration })
        }
        return { name, w: it.width ?? 0, h: it.height ?? 0, s: it.duration ?? 0 }
      }),
    )
    const say = (x: (typeof got)[number]) => `${x.name} is ${x.w}×${x.h}, ${x.s.toFixed(1)} s`
    const shape = (x: (typeof got)[number]) => (x.h ? x.w / x.h : 0)
    const problems: string[] = []
    const [fw, fh] = state().flick_size.split(/[×x]/).map(Number)
    const flick = fw && fh ? fw / fh : 0
    if (got.some((x) => Math.abs(shape(x) - shape(got[0])) > 0.02 * shape(got[0]))) problems.push("their frame shapes differ")
    else if (flick && Math.abs(shape(got[0]) - flick) > 0.02 * flick) problems.push(`they're ${got[0].w}×${got[0].h} but the Flick is ${state().flick_size}`)
    const lens = got.map((x) => x.s)
    if (Math.max(...lens) - Math.min(...lens) > 0.5) problems.push("their lengths differ")
    const text = problems.join("; ")
    return problems.length ? `${text.charAt(0).toUpperCase()}${text.slice(1)} (${got.map(say).join("; ")}).` : ""
  }

  /**
   * The storyboard's pictures: one quick draft still per frame of the reference video, with the
   * shot's subject and setting so the frames read as one scene, and the plan's references so it's
   * their product.
   */
  const planFrames = (itemId: string, plan: Plan) => {
    const frames = plan.reference.storyboard ?? []
    if (!frames.length || plan.variations[0]?.video_id) return
    const fill = (i: number, url: string) =>
      setItems((list) => list.map((x) => (x.id === itemId && x.kind === "plan" ? { ...x, frames: Object.assign([...(x.frames ?? [])], { [i]: url }) } : x)))
    const shot = plan.reference.shot
    const refIds = [plan.reference.first_frame_id, ...(plan.reference.image_ids ?? [])].filter((x): x is string => !!x)
    const own = images.current.filter((x) => x.kind !== "video" && (x.from === "upload" || x.from === "website" || x.from === "library"))
    const refs = (refIds.length ? refIds.map((r) => images.current.find((x) => x.id === r)).filter((x): x is ProjectImage => !!x) : own).slice(0, 3)
    const tidy = (t?: string) => (t ?? "").replace(/\[(Image|Video) \d+\]/g, "the reference").trim()
    frames.forEach((f, i) => {
      if (!live.current) return void setTimeout(() => fill(i, apiRef.current.sampleImage("variation", String(i % Math.max(2, plan.variations.length)))), 700 + i * 450)
      const prompt = [tidy(shot?.subject), f.action, f.camera, tidy(shot?.setting)].filter(Boolean).join(". ") || `${plan.reference.prompt} ${f.action}`
      Promise.all(refs.map((r) => shareable(r.url).catch(() => null)))
        .then((urls) => generateImage(prompt, aspectOf(state().flick_size), undefined, undefined, urls.filter((x): x is string => !!x), { project: state().title, purpose: "storyboard frame" }, { quality: "draft" }))
        .then((url) => fill(i, url), () => {})
    })
  }

  const runTool = async (u: Extract<Block, { type: "tool_use" }>): Promise<string | Block[] | typeof WAIT> => {
    const a = apiRef.current
    const input = cleanInput(u.input ?? {}) as Record<string, unknown>
    try {
      switch (u.name) {
        case "ask_user": {
          const options: Choice[] = ((input.options as (string | Choice)[] | undefined) ?? [])
            .map((o) => (typeof o === "string" ? { label: o } : o && typeof o.label === "string" ? o : null))
            .filter((o): o is Choice => !!o && !!o.label.trim())
            .slice(0, input.display === "sizes" ? 9 : 6)
          const display = (["chips", "cards", "palettes", "layouts", "thumbnails", "pictures", "sizes"] as Display[]).includes(input.display as Display) ? (input.display as Display) : "chips"
          const step = (["idea", "look", "plan"] as Step[]).includes(input.step as Step) ? (input.step as Step) : undefined
          const pictures = display === "pictures"
          const shown = pictures ? options.slice(0, 4) : options
          const itemId = add({ kind: "question", toolId: u.id, question: String(input.question ?? ""), options: shown, display, step, multi: !!input.multi_select && display === "chips", custom: input.allow_custom !== false && (display === "chips" || pictures || display === "sizes"), purpose: typeof input.purpose === "string" ? input.purpose : undefined })
          pending.current.push({ toolId: u.id, itemId })
          // pictures fill in as they're made: a quick draft of each answer, with the user's product in it
          if (pictures)
            shown.forEach((o, i) => {
              const fill = (url: string) => setItems((all) => all.map((x) => (x.id === itemId && x.kind === "question" ? { ...x, options: x.options.map((c, j) => (j === i ? { ...c, image: url } : c)) } : x)))
              if (!live.current) return void setTimeout(() => fill(apiRef.current.sampleImage("variation", String(i))), 800 + i * 500)
              previewFor(u.id, i, { image_prompt: o.image_prompt || `${String(input.question ?? "")}: ${o.label}. ${o.description ?? ""}` }).then(fill, () => {})
            })
          return WAIT
        }
        case "set_format":
          return apiRef.current.setFormat(String(input.size ?? ""), typeof input.seconds === "number" ? input.seconds : undefined)
        case "propose_concepts": {
          if (live.current && !variationsSettled(fromOf(input), false)) return NOT_SETTLED
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
          const raw = { ...(input as unknown as Plan), reference: referenceOf(input) }
          if (!raw.variations?.length) return "Error: a plan needs at least two variations."
          raw.variations = raw.variations.map((v) => ({ ...v, prompt: String(v.prompt ?? "") }))
          // the user's own finished videos and thumbnails: used as they are
          const byId = (x?: string) => (x ? images.current.find((i) => i.id === x) : undefined)
          for (const v of raw.variations) {
            if (v.video_id && byId(v.video_id)?.kind !== "video") return `Error: ${v.name}: video_id ${v.video_id} isn't one of the user's videos.`
            if (v.thumbnail_id && (!byId(v.thumbnail_id) || byId(v.thumbnail_id)?.kind === "video")) return `Error: ${v.name}: thumbnail_id ${v.thumbnail_id} isn't one of the project's images.`
          }
          const given = raw.variations.filter((v) => v.video_id)
          if (given.length) {
            const mismatch = await videoMismatch(given.map((v) => ({ name: v.name, it: byId(v.video_id)! })))
            if (mismatch && !input.videos_mismatch_ok)
              return `Not shown: the user's videos don't match. ${mismatch} Tell the user this plainly and ask how to go on (ask_user): replace the odd one(s) with a matching video, or go on anyway (videos are cropped to fill the Flick's frame; a shorter one ends sooner). If they go on, propose the plan again with videos_mismatch_ok true.`
          }
          // the reference video and what it's made from matter only when Variation 1 is generated
          if (raw.variations[0].video_id) {
            if (!raw.reference.prompt) raw.reference = { ...raw.reference, prompt: "The user's own video." }
          } else {
            if (live.current && !variationsSettled(fromOf(input), true)) return NOT_SETTLED
            if (!raw.reference.prompt) return "Error: give the reference video's prompt (shot)."
            const ref = raw.reference
            const known = (x?: string) => !!x && images.current.some((i) => i.id === x)
            if (ref.mode === "edit" && !known(ref.source_video_id)) return "Error: 'edit' needs source_video_id: the user's video to change (a project video id)."
            if (ref.mode === "animate" && !known(ref.first_frame_id)) return "Error: 'animate' needs first_frame_id: the user's image (or your edit of it) to open on."
            // nothing to work from: suggest looks first, then make the video from the one the user approves
            if (live.current && ref.mode === "reference" && !ref.image_ids?.length && !ref.video_ids?.length)
              return "Not shown: the reference video has nothing to work from. Suggest looks first (propose_concepts makes a preview image per concept; or generate_image purpose 'look'), let the user pick or approve one, then propose the plan with it in reference_image_ids."
            // the user's own product or people images must shape the reference video
            const theirs = images.current.filter((x) => x.kind !== "video" && (x.from === "upload" || x.from === "website" || x.from === "library"))
            if (live.current && theirs.length && ref.mode === "reference" && !ref.image_ids?.some((x) => theirs.some((t) => t.id === x)) && !ref.video_ids?.length)
              return `Not shown: the reference video doesn't use the user's images, so the product wouldn't match. Put the product or person to keep in reference_image_ids (${theirs.slice(0, 8).map((x) => `${x.id} ${x.name}`).join(", ")}), or their sheet, then propose the plan again.`
          }
          // the look the user picked carries into the plan's design
          const plan = { ...raw, design: { ...draft.current, ...(raw.design ?? {}), thumbnails: { ...draft.current.thumbnails, ...(raw.design?.thumbnails ?? {}) } } }
          const vars = plan.variations.slice(0, 5)
          const itemId = add({ kind: "plan", toolId: u.id, plan: { ...plan, variations: vars, design: plan.design ?? {} }, state: "open", previews: [] })
          pending.current.push({ toolId: u.id, itemId })
          planPreviews(itemId, { ...plan, variations: vars })
          planFrames(itemId, plan)
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
        case "make_sheet":
          return runSheet(input)
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
          const verdict = r.fail.length ? `Fix these, then run review_flick again:\n- ${r.fail.join("\n- ")}\n(Passing: ${r.pass.length} checks.)` : `All ${r.pass.length} checks pass.`
          // and a look: Variation 1, plus the variations with their own copy (headline, subheading, button text)
          const st = a.state() as unknown as { feeds?: { used_by?: string[]; values?: Record<string, string> }[] }
          const ownCopy = (st.feeds ?? []).some((f) => f.used_by?.some((u) => /headline|subheading|button text/i.test(u)))
          const names = ownCopy ? [...new Set((st.feeds ?? []).flatMap((f) => Object.keys(f.values ?? {})))].slice(0, 3) : []
          const looks = await lookAt(names.length ? names : [undefined])
          return looks.length ? [{ type: "text", text: `${verdict}\nHow it looks (check by eye: readable text, nothing over the product or faces, not crowded, strip clear of the action):` }, ...looks] : verdict
        }
        case "view_flick": {
          const looks = await lookAt([input.variation ? String(input.variation) : undefined])
          return looks.length ? looks : "Error: couldn't draw the Flick (is it built yet?)."
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
        // saved elements the user can @mention (their images come with a mention)
        const saved = elementsList()
        const now = saved.length ? ({ ...state(), saved_elements: saved.map((e) => ({ name: e.name, kind: e.kind, images: e.images.length })) } as ReturnType<typeof state>) : state()
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
    async (text: string, files: File[] = [], mentioned: FlickElement[] = []) => {
      if (busy) return
      const itemId = add({ kind: "user", text, images: [] })
      const blocks: Block[] = settle({ ...held.current })
      const got = await attach(files)
      const els = await attachElements(mentioned)
      patch(itemId, { images: [...got.shows, ...mentioned.flatMap((e) => e.images.slice(0, 1).map((i) => i.url))] } as Partial<Item>)
      blocks.push(...got.blocks, ...els.blocks)
      // what each @mention points at, so Claude reads them exactly
      const refs = [
        ...[...text.matchAll(/@Image (\d+)/gi)].flatMap((m) => (got.photoIds[+m[1] - 1] ? [`@Image ${m[1]} = ${got.photoIds[+m[1] - 1]}`] : [])),
        ...[...text.matchAll(/@Video (\d+)/gi)].flatMap((m) => (got.videoIds[+m[1] - 1] ? [`@Video ${m[1]} = ${got.videoIds[+m[1] - 1]}`] : [])),
        ...els.lines,
      ]
      const mentionLine = refs.length ? `[Mentions: ${[...new Set(refs)].join("; ")}. @<variation name> means that variation; @Brand means the brand kit.]` : ""
      blocks.push({ type: "text", text: (text || "(files added)") + [got.line, mentionLine].filter(Boolean).map((l) => `\n\n${l}`).join("") })
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
      // a picked concept's preview becomes a project image: the suggested look the video can be made from
      const shown = it.display === "concepts" ? (choice?.image ?? it.options.find((o) => o.label === value)?.image) : undefined
      const look = shown ? (images.current.find((x) => x.url === shown) ?? keep(shown, `Look: ${value}`.slice(0, 40), "generated")) : undefined
      const lookLine = look ? ` (its preview image is ${look.id}: the suggested look; use it in reference_image_ids when the video should look like it)` : ""
      // the Flick's size: a picked size, or one the user typed ("728x90"), is applied straight away
      let sizeLine = ""
      if (it.purpose === "size" || it.display === "sizes") {
        const typed = value.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})/i)
        const size = choice?.size ?? it.options.find((o) => o.label === value)?.size ?? (typed ? `${typed[1]}×${typed[2]}` : undefined)
        sizeLine = size ? ` (${apiRef.current.setFormat(size)})` : " (no size in that answer: ask again or call set_format)"
      }
      // questions and image requests asked together go back together, once all are answered (or skipped)
      if (!hold(it.toolId, value + detail + lookLine + sizeLine)) return
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
      const urls = (ids?: string[], max = 30) => (ids ?? []).map(url).filter((u): u is string => !!u).slice(0, max)
      // @mentioned elements in a prompt: their images go with that video, first; the @ is dropped from the text
      const elementIds = (text: string) =>
        elementsIn(text).flatMap((el) => el.images.slice(0, 3).map((im, i) => (images.current.find((x) => x.url === im.url) ?? keep(im.url, `${el.name} ${i + 1}`, "library", el.kind)).id))
      const withEls = (text: string, ids?: string[]) => [...new Set([...elementIds(text), ...(ids ?? [])])]
      // the user's own videos and thumbnails go in as they are (kept on the server, so they last)
      const lasting = async (u?: string) => (u && live.current ? await shareable(u).catch(() => u) : u)
      const own = await Promise.all(
        plan.variations.map(async (v) => {
          const vid = images.current.find((x) => x.id === v.video_id)
          const th = images.current.find((x) => x.id === v.thumbnail_id)
          return vid || th ? { video: await lasting(vid?.url), poster: await lasting(vid?.poster), thumb: await lasting(th?.url) } : undefined
        }),
      )
      const r = apiRef.current.approvePlan({
        ...plan,
        reference: {
          ...plan.reference,
          prompt: plainMentions(plan.reference.prompt),
          media: {
            mode: plan.reference.mode ?? "reference",
            first_frame: url(plan.reference.first_frame_id),
            last_frame: url(plan.reference.last_frame_id),
            // the given images keep their order ([Image 1]…); @mentioned elements' images follow them
            images: urls([...new Set([...(plan.reference.image_ids ?? []), ...withEls(plan.reference.prompt)])]),
            videos: urls(plan.reference.video_ids, 10),
            source: url(plan.reference.source_video_id),
          },
        },
        // every other variation edits the approved reference video
        variations: plan.variations.map((v, i) => ({ ...v, own: own[i], method: undefined, prompt: plainMentions(v.prompt), media: { images: urls(i === 0 ? [] : [...new Set([...(v.image_ids ?? []), ...withEls(v.prompt)])]) } })),
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
  // files that only live in this browser are saved by their server address, so they still open after a reload
  const lasting = (i: ProjectImage): ProjectImage => ({ ...i, url: /^blob:/.test(i.url) ? (sharedNow(i.url) ?? i.url) : i.url, ...(i.poster && /^blob:/.test(i.poster) ? { poster: sharedNow(i.poster) ?? i.poster } : {}) })
  const restored = useRef<"no" | "loading" | "done">("no")
  const saveChat = useRef<((v: unknown) => void) | null>(null)
  useEffect(() => {
    if (!opts.projectId || !live.current) return
    saveChat.current = saver(`chat-${opts.projectId}`)
  }, [opts.projectId])
  useEffect(() => {
    // save once the chat settles (not mid-reply), and only after loading what was saved
    if (!saveChat.current || busy || restored.current === "loading" || !items.length) return
    saveChat.current({ items: items.map((x) => (x.kind === "assistant" ? { ...x, streaming: false } : x)), msgs: msgs.current, pending: pending.current, ready: ready.current, held: held.current, images: images.current.map(lasting), read: [...read.current], draft: draft.current } satisfies SavedChat)
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
          return sameUrl(new File([blob], r.name, { type: blob.type || "image/jpeg" }), r.url)
        } catch {
          return null
        }
      }),
    ).then((files) => send(opts.prompt!.trim(), files.filter((f): f is File => !!f), elementsIn(opts.prompt!)))
  }

  /** a project image's address by id (for the plan's preview) */
  const imageUrl = (imageId?: string) => (imageId ? images.current.find((x) => x.id === imageId)?.url : undefined)
  /** a project image or video by id: its address, whether it's a video, and its name */
  const media = (imageId?: string) => {
    const x = imageId ? images.current.find((i) => i.id === imageId) : undefined
    return x ? { url: x.url, video: x.kind === "video", name: x.name } : undefined
  }
  /** the user's own images, newest last (a fallback picture for the plan's preview) */
  const ownImages = () => images.current.filter((x) => x.kind !== "video" && (x.from === "upload" || x.from === "library" || x.from === "website")).map((x) => x.url)

  return { imageUrl, media, ownImages, items, busy, send, answer, pendingIds: pending.current.map((p) => p.itemId), addAssets, decidePlan, editPlan, retryImage, stop, retry, waiting: pending.current.length > 0, draft: draftView, plan: plan?.plan, step }
}
