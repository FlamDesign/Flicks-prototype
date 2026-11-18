import {
  Camera01Icon,
  Layers01Icon,
  ArrowLeftRightIcon,
  Album02Icon,
  Target02Icon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons"
import { BRAND_TEMPLATES } from "@/templates/brands"
import { REAL_CARDS, REAL_TEMPLATES } from "@/templates/real-flicks"

export type Mechanic = "Variants" | "Swap" | "Carousel" | "Hotspots" | "Video"

export const MECHANICS: { value: Mechanic; icon: typeof Layers01Icon; hint: string }[] = [
  { value: "Variants", icon: Layers01Icon, hint: "Shopper switches colors or models in-ad" },
  { value: "Swap", icon: ArrowLeftRightIcon, hint: "Tap to swap the product in the scene" },
  { value: "Carousel", icon: Album02Icon, hint: "Swipe through products or flavours" },
  { value: "Hotspots", icon: Target02Icon, hint: "Tap points to reveal features" },
  { value: "Video", icon: PlayCircleIcon, hint: "Interactive video Flick" },
]

export const mechanicIcon = (m: Mechanic) => MECHANICS.find((x) => x.value === m)!.icon

export type SizeGroup = "Display" | "Social" | "Video"
export type Size = { value: string; label: string; group: SizeGroup }

// Matches the size list in Figma (Flam Interactive Experience Platform, node 5281:41511)
export const SIZE_GROUPS: SizeGroup[] = ["Display", "Social", "Video"]

export const SIZES: Size[] = [
  { value: "250×250", label: "Square", group: "Display" },
  { value: "300×250", label: "Medium rectangle", group: "Display" },
  { value: "336×280", label: "Large rectangle", group: "Display" },
  { value: "320×480", label: "Mobile interstitial", group: "Display" },
  { value: "480×320", label: "Mobile interstitial", group: "Display" },
  { value: "300×600", label: "Half page", group: "Display" },
  { value: "1080×1080", label: "Square (1:1)", group: "Social" },
  { value: "1920×1080", label: "Horizontal (16:9)", group: "Video" },
  { value: "1080×1920", label: "Vertical (9:16)", group: "Social" },
]

export const INDUSTRIES = ["Home & living", "Travel", "Fashion", "Footwear", "Luxury", "Sports & fitness", "Electronics", "Retail", "Food & beverage", "Automotive", "Beauty"]

/** what the chat is told about a template the user picked with Use as reference: the pattern, never the sample brand or its video */
export type TemplateRef = { id: string; title: string; mechanic: Mechanic; description: string; size: string; duration: number; variants: string[]; headline: string; cta: string; image?: string }
export const templateRef = (t: Template): TemplateRef => ({ id: t.id, title: t.title, mechanic: t.mechanic, description: t.description, size: t.size, duration: t.duration ?? 8, variants: t.variants.map((v) => v.label), headline: t.headline, cta: t.cta, image: t.image })

export type Template = {
  id: string
  title: string
  description: string
  mechanic: Mechanic
  industry: string
  size: string
  sizes: string[]
  brand: string
  headline: string
  cta: string
  icon: typeof Camera01Icon
  bg: [string, string]
  variants: { label: string; color: string }[]
  prompt: string
  isNew?: boolean
  image?: string
  /** the video the template opens with, by key */
  video?: string
  /** saved by the user from the editor: the full project, opened ready to edit */
  saved?: unknown
  /** video length in seconds, when the template has its own videos */
  duration?: number
  /** the card's shape in the templates grid (e.g. "3/4"); square when unset */
  cardRatio?: string
  /** the card's headline color: light on a dark card, dark on a light one */
  cardInk?: "light" | "dark"
  /** the brand as written (e.g. "Paramount+"), on the card */
  brandName?: string
  /** a shorter line for the card, when the headline is long */
  cardHeadline?: string
}

export const timeAgo = (mins: number) => {
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return "yesterday"
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}


/** the order cards appear in: mixed shapes and colors so the masonry reads well */
const TEMPLATE_ORDER = ["real-coach", "real-amazon", "brand-gap", "real-ulta", "real-geico", "brand-modelo", "real-sony", "real-wwe2k", "brand-diageo", "real-lovesac", "real-homedepot", "brand-little-caesars", "real-amex", "real-paramount", "brand-general-mills", "real-redbull"]
/** every template is a real Flick (16 brands), each a complete project with its own videos */
export const TEMPLATES: Template[] = [...BRAND_TEMPLATES.map((t) => ({ ...t, ...(REAL_CARDS[t.id] ? { image: REAL_CARDS[t.id].card, cardRatio: REAL_CARDS[t.id].cardRatio, cardInk: REAL_CARDS[t.id].cardInk, brandName: REAL_CARDS[t.id].name, cardHeadline: REAL_CARDS[t.id].line } : {}) })), ...REAL_TEMPLATES].sort(
  (a, b) => TEMPLATE_ORDER.indexOf(a.id) - TEMPLATE_ORDER.indexOf(b.id),
)

/**
 * An exported Flick: fixed once made; change it by remixing it into a new project.
 * `video`: its reference video's key.
 */
export type Flick = { id: string; name: string; size: string; editedAt: number; image: string; campaign?: string; video?: string; projectId?: string }

const MIN = 60_000

/** Relative time for the first week ("5m ago", "Yesterday"), then the date ("Sep 12" or "Sep 12, 2025"). */
export const formatEdited = (ts: number, now = Date.now()) => {
  const mins = Math.floor((now - ts) / MIN)
  if (mins < 1) return "Edited just now"
  if (mins < 60) return `Edited ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Edited ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Edited yesterday"
  if (days < 7) return `Edited ${days}d ago`
  const d = new Date(ts)
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return `Edited ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) })}`
}

export const fullDate = (ts: number) =>
  new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
