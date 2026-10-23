import camera from "@/assets/templates/camera.jpg"
import tools from "@/assets/templates/tools.jpg"
import shades from "@/assets/templates/shades.jpg"
import coffee from "@/assets/templates/coffee.jpg"
import maison from "@/assets/templates/maison.jpg"
import wildHaven from "@/assets/templates/wild-haven.jpg"
import linea from "@/assets/templates/linea.jpg"
import sportPoster from "@/assets/video/poster-3.jpg"
import bootRain from "@/assets/video/shoe-1-wheat.jpg"
import bootColours from "@/assets/uploads/boot-black-classic.jpg"
import bootDetail from "@/assets/uploads/boot-pro-brown.jpg"
import gownRust from "@/assets/video/dress-1-rust.jpg"
import gownOmbre from "@/assets/video/dress-2-ombre.jpg"
import {
  Camera01Icon,
  DrillIcon,
  SunglassesIcon,
  CoffeeBeansIcon,
  RunningShoesIcon,
  Car01Icon,
  HeadphonesIcon,
  PerfumeIcon,
  Layers01Icon,
  ArrowLeftRightIcon,
  Album02Icon,
  Target02Icon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons"
import { BRAND_TEMPLATES } from "@/templates/brands"

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
  /** which sample video the template opens with (its product set); sunglasses when unset */
  video?: number
  /** saved by the user from the editor: the full project, opened ready to edit */
  saved?: unknown
  /** video length in seconds, when the template has its own videos */
  duration?: number
}

const TEMPLATE_BASE: Template[] = [
  {
    id: "maison",
    title: "Maison Living",
    description: "Warm interior hero for a home goods drop.",
    mechanic: "Hotspots",
    industry: "Home & living",
    size: "1920×1080",
    sizes: ["1920×1080"],
    brand: "MAISON",
    headline: "Objects of quiet beauty.",
    cta: "Shop now",
    icon: Camera01Icon,
    bg: ["#78716c", "#d6d3d1"],
    variants: [{ label: "Lamp", color: "#b45309" }, { label: "Sofa", color: "#71717a" }, { label: "Table", color: "#92400e" }],
    prompt: "Slow push-in across a sunlit living room, the brass lamp and linen cushions catch the light",
    image: maison,
  },
  {
    id: "wild-haven",
    title: "Wild Haven",
    description: "Cinematic outdoor scene for a travel booking.",
    mechanic: "Video",
    industry: "Travel",
    size: "1920×1080",
    sizes: ["1920×1080"],
    brand: "WILD HAVEN",
    headline: "Disconnect to reconnect.",
    cta: "Book now",
    icon: Car01Icon,
    bg: ["#14532d", "#4d7c0f"],
    variants: [{ label: "Dawn", color: "#fbbf24" }, { label: "Dusk", color: "#ea580c" }, { label: "Night", color: "#1e3a8a" }],
    prompt: "Mist drifts over a lakeside tent in the forest, the camera glides toward the glowing entrance",
    image: wildHaven,
  },
  {
    id: "linea",
    title: "Linea Jewelry",
    description: "Editorial close-ups for a jewelry collection.",
    mechanic: "Carousel",
    industry: "Fashion",
    size: "1920×1080",
    sizes: ["1920×1080"],
    brand: "LINEA",
    headline: "Organic forms.",
    cta: "Shop",
    icon: SunglassesIcon,
    bg: ["#1c1917", "#57534e"],
    variants: [{ label: "Earrings", color: "#d6d3d1" }, { label: "Bracelet", color: "#a8a29e" }, { label: "Rings", color: "#e7e5e4" }],
    prompt: "Soft window light moves across a silver earring and chain bracelet, slow cinematic close-ups",
    image: linea,
  },
  {
    id: "camera",
    title: "Camera Variants",
    description: "Shopper taps a swatch to switch the camera colorway.",
    mechanic: "Variants",
    industry: "Electronics",
    size: "1080×1080",
    sizes: ["1080×1080", "300×250", "1080×1920"],
    brand: "HALO CAM",
    headline: "Capture everything.",
    cta: "Buy now",
    icon: Camera01Icon,
    bg: ["#18181b", "#3f3f46"],
    variants: [
      { label: "Graphite", color: "#a1a1aa" },
      { label: "Ember", color: "#f97316" },
      { label: "Glacier", color: "#7dd3fc" },
    ],
    prompt: "Action camera on volcanic rock, shopper switches between 3 colorways",
    image: camera,
  },
  {
    id: "tools",
    title: "Tool Swap",
    description: "Tap a tool on the bench to swap it into the hero shot.",
    mechanic: "Swap",
    industry: "Retail",
    size: "1080×1080",
    sizes: ["1080×1080", "300×600"],
    brand: "NORTHBOUND",
    headline: "More power to you.",
    cta: "Shop now",
    icon: DrillIcon,
    bg: ["#78350f", "#b45309"],
    variants: [
      { label: "Drill", color: "#fde68a" },
      { label: "Saw", color: "#fca5a5" },
      { label: "Driver", color: "#fdba74" },
    ],
    prompt: "Workshop bench with power tools, tap each tool to swap it into focus",
    isNew: true,
    image: tools,
  },
  {
    id: "shades",
    title: "Shades Variants",
    description: "Try three tints on the model without leaving the ad.",
    mechanic: "Variants",
    industry: "Fashion",
    size: "1080×1080",
    sizes: ["1080×1080"],
    brand: "LUMEN",
    headline: "See it your way.",
    cta: "Shop now",
    icon: SunglassesIcon,
    bg: ["#fce7f3", "#fbcfe8"],
    variants: [
      { label: "Classic pink", color: "#ec4899" },
      { label: "Wave", color: "#8b5cf6" },
      { label: "Noir", color: "#18181b" },
    ],
    prompt: "Editorial portrait with sunglasses, shopper switches between 3 lens tints",
    image: shades,
  },
  {
    id: "coffee",
    title: "Coffee Flavours",
    description: "Swipe through roasts with tasting notes on each card.",
    mechanic: "Carousel",
    industry: "Food & beverage",
    size: "1080×1920",
    sizes: ["1080×1920", "320×480"],
    brand: "KISSA ROASTERS",
    headline: "Find your roast.",
    cta: "Order beans",
    icon: CoffeeBeansIcon,
    bg: ["#292524", "#57534e"],
    variants: [
      { label: "Golden", color: "#fbbf24" },
      { label: "Dark", color: "#a16207" },
      { label: "Decaf", color: "#d6d3d1" },
    ],
    prompt: "Coffee bag with falling beans, swipe between 3 roasts with tasting notes",
    image: coffee,
  },
  {
    id: "sneaker",
    title: "Sneaker Drop",
    description: "Tap hotspots to reveal sole, upper and lace details.",
    mechanic: "Hotspots",
    industry: "Fashion",
    size: "1080×1080",
    sizes: ["1080×1080", "300×250"],
    brand: "STRATA",
    headline: "Built for the drop.",
    cta: "Notify me",
    icon: RunningShoesIcon,
    bg: ["#d9f99d", "#84cc16"],
    variants: [
      { label: "Sole", color: "#18181b" },
      { label: "Upper", color: "#18181b" },
      { label: "Laces", color: "#18181b" },
    ],
    prompt: "Floating sneaker on lime backdrop with 3 tappable feature hotspots",
    isNew: true,
  },
  {
    id: "ev",
    title: "EV Snow Reveal",
    description: "Cinematic Flick with a tap-to-pick trim end card.",
    mechanic: "Video",
    industry: "Automotive",
    size: "1920×1080",
    sizes: ["1920×1080", "1080×1920"],
    brand: "AURORA",
    headline: "Drift into winter.",
    cta: "Book a drive",
    icon: Car01Icon,
    bg: ["#0c4a6e", "#7dd3fc"],
    variants: [
      { label: "Polar", color: "#f8fafc" },
      { label: "Slate", color: "#64748b" },
      { label: "Crimson", color: "#dc2626" },
    ],
    prompt: "Our new SUV drifts through falling snow with a cinematic motion",
  },
  {
    id: "audio",
    title: "Headphone Colors",
    description: "Compact display unit with swatch switching.",
    mechanic: "Variants",
    industry: "Electronics",
    size: "300×250",
    sizes: ["300×250", "336×280"],
    brand: "PULSE",
    headline: "Hear every color.",
    cta: "Shop",
    icon: HeadphonesIcon,
    bg: ["#ede9fe", "#c4b5fd"],
    variants: [
      { label: "Lilac", color: "#7c3aed" },
      { label: "Sand", color: "#d6b98c" },
      { label: "Black", color: "#18181b" },
    ],
    prompt: "Over-ear headphones on pastel backdrop, switch between 3 colors",
  },
  {
    id: "fragrance",
    title: "Scent Finder",
    description: "Swap bottles to match the mood of the scene.",
    mechanic: "Swap",
    industry: "Beauty",
    size: "1080×1920",
    sizes: ["1080×1920", "1080×1080"],
    brand: "MAISON VALE",
    headline: "Wear the moment.",
    cta: "Discover",
    icon: PerfumeIcon,
    bg: ["#fef3c7", "#f59e0b"],
    variants: [
      { label: "Amber", color: "#b45309" },
      { label: "Rose", color: "#e11d48" },
      { label: "Vetiver", color: "#15803d" },
    ],
    prompt: "Perfume bottle in golden light, tap to swap between 3 scents",
  },
  {
    id: "sport-lens",
    title: "Sport Lens Switch",
    description: "Runners tap a lens colour and the video switches with it.",
    mechanic: "Variants",
    industry: "Sports & fitness",
    size: "300×250",
    sizes: ["300×250"],
    brand: "PACE",
    headline: "See the line.",
    cta: "Shop lenses",
    icon: SunglassesIcon,
    bg: ["#292524", "#a8a29e"],
    variants: [{ label: "Gold", color: "#f59e0b" }, { label: "Sapphire", color: "#2563eb" }, { label: "Black", color: "#18181b" }],
    prompt: "Athlete against a sunlit concrete wall, slow push-in on sport sunglasses, then a street run at golden hour",
    image: sportPoster,
    video: 0,
  },
  {
    id: "rain-boots",
    title: "Rain-Ready Boots",
    description: "Moody storm scene for a waterproof boot launch.",
    mechanic: "Video",
    industry: "Footwear",
    size: "1920×1080",
    sizes: ["1920×1080"],
    brand: "TRAILHEAD",
    headline: "Built for the downpour.",
    cta: "Shop boots",
    icon: RunningShoesIcon,
    bg: ["#1c1917", "#57534e"],
    variants: [{ label: "Wheat", color: "#d97706" }, { label: "Black", color: "#18181b" }, { label: "Brown", color: "#7c2d12" }],
    prompt: "Wheat leather boot on wet black rock in heavy rain, slow macro push along the stitching, then a splash as it lands",
    image: bootRain,
    video: 5,
  },
  {
    id: "boot-colours",
    title: "Boot Colourways",
    description: "One boot, every colourway: shoppers tap to switch.",
    mechanic: "Variants",
    industry: "Footwear",
    size: "250×250",
    sizes: ["250×250"],
    brand: "TRAILHEAD",
    headline: "Pick your pair.",
    cta: "Buy now",
    icon: RunningShoesIcon,
    bg: ["#f5f5f4", "#d6d3d1"],
    variants: [{ label: "Black", color: "#18181b" }, { label: "Brown", color: "#7c2d12" }, { label: "Wheat", color: "#d97706" }],
    prompt: "Classic 6-inch boot turning on a clean studio set, switching between black, brown and wheat leather",
    image: bootColours,
    video: 5,
  },
  {
    id: "work-boot",
    title: "Work Boot Details",
    description: "Tap points on the boot to show its sole, collar and stitching.",
    mechanic: "Hotspots",
    industry: "Retail",
    size: "336×280",
    sizes: ["336×280"],
    brand: "GROUNDWORK",
    headline: "Made to work.",
    cta: "See details",
    icon: RunningShoesIcon,
    bg: ["#fafaf9", "#e7e5e4"],
    variants: [{ label: "Sole", color: "#27272a" }, { label: "Collar", color: "#44403c" }, { label: "Stitching", color: "#a16207" }],
    prompt: "Dark brown work boot in a bright studio, the camera circles to the sole, padded collar and triple stitching",
    image: bootDetail,
    video: 5,
  },
  {
    id: "summer-gown",
    title: "Summer Gown",
    description: "Sunlit walk and twirl for a resort wear drop.",
    mechanic: "Video",
    industry: "Fashion",
    size: "1080×1080",
    sizes: ["1080×1080"],
    brand: "SOLENNE",
    headline: "Golden hour, all day.",
    cta: "Shop the edit",
    icon: PerfumeIcon,
    bg: ["#9a3412", "#fdba74"],
    variants: [{ label: "Rust", color: "#c2410c" }, { label: "Ombré", color: "#fda4af" }, { label: "Sand", color: "#d6d3d1" }],
    prompt: "Model in a rust tiered halter gown walking a sunlit stone alley, smiles to camera, then a slow twirl from above",
    image: gownRust,
    video: 8,
  },
  {
    id: "evening-edit",
    title: "Evening Edit",
    description: "Swipe through gowns for a luxury occasion-wear campaign.",
    mechanic: "Carousel",
    industry: "Luxury",
    size: "300×600",
    sizes: ["300×600"],
    brand: "SOLENNE",
    headline: "Made for the moment.",
    cta: "Discover",
    icon: PerfumeIcon,
    bg: ["#fff7ed", "#fecaca"],
    variants: [{ label: "Ombré", color: "#fda4af" }, { label: "Rust", color: "#c2410c" }, { label: "Ivory", color: "#f5f5f4" }],
    prompt: "Ombré strapless gown in warm afternoon light, the skirt sweeps as she turns on the stone steps",
    image: gownOmbre,
    video: 8,
  },
]

export type Project = { id: string; title: string; size: string; editedMinsAgo: number; image: string }

export const RECENT: Project[] = [
  { id: "r1", title: "Holiday camera bundle", size: "1080×1080", editedMinsAgo: 12, image: camera },
  { id: "r2", title: "Power tools spring sale", size: "1080×1080", editedMinsAgo: 140, image: tools },
  { id: "r3", title: "Roast of the month", size: "1080×1920", editedMinsAgo: 60 * 26, image: coffee },
  { id: "r4", title: "Pink tint eyewear launch", size: "1080×1080", editedMinsAgo: 60 * 24 * 6, image: shades },
]

export const CAMPAIGNS = ["Holiday 2026", "Spring launch", "Always-on retail"]

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

export const STARTERS = [
  "Sneaker spins on a lime backdrop, slow push-in",
  "Lipstick swatches glide across a marble table",
  "Coffee beans fall around the bag in slow motion",
  "SUV drifts through falling snow at dusk",
  "Perfume bottle catches golden morning light",
  "Model turns to camera wearing pink-tint sunglasses",
]

export const PLACEHOLDERS = [
  "Our new SUV drifts through falling snow with a cinematic motion",
  "A sneaker floats on a lime backdrop, tap to reveal the sole",
  "Three lipstick shades the shopper can switch between",
  "Coffee beans fall around the bag, swipe to change the roast",
]

/** Each template's size, so the gallery covers every size. */
const TEMPLATE_SIZES: Record<string, string> = {
  maison: "300×600",
  "wild-haven": "1080×1920",
  linea: "336×280",
  camera: "1080×1080",
  tools: "480×320",
  shades: "320×480",
  coffee: "1080×1920",
}
export const TEMPLATES: Template[] = [
  // brand templates first: complete projects from real campaign assets
  ...BRAND_TEMPLATES,
  ...TEMPLATE_BASE.filter((t) => t.image).map((t) => {
    const size = TEMPLATE_SIZES[t.id] ?? t.size
    return { ...t, size, sizes: [size] }
  }),
]

/**
 * An exported Flick: fixed once made; change it by remixing it into a new project.
 * `video`: which sample product set it plays (its reference video); by position when unset.
 */
export type Flick = { id: string; name: string; size: string; editedAt: number; image: string; campaign?: string; video?: number; projectId?: string }
/** A project: an editable draft in the editor. Exporting it makes a Flick. */
export type ProjectSample = { id: string; name: string; size: string; editedAt: number; image: string; video: number }

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR
const ago = (ms: number) => Date.now() - ms

export const FLICKS: Flick[] = [
  { id: "f1", name: "Quiet Beauty living room", size: "1920×1080", editedAt: ago(8 * MIN), image: maison, campaign: "Holiday 2026", video: 0 },
  { id: "f3", name: "Linea fall collection", size: "1080×1080", editedAt: ago(26 * HOUR), image: linea, campaign: "Spring launch", video: 8 },
  { id: "f4", name: "Holiday camera bundle", size: "300×250", editedAt: ago(3 * DAY), image: camera, campaign: "Holiday 2026", video: 0 },
  { id: "f6", name: "Roast of the month", size: "1080×1920", editedAt: ago(12 * DAY), image: coffee, campaign: "Always-on retail", video: 5 },
  { id: "f9", name: "Rain-ready boots launch", size: "1920×1080", editedAt: ago(2 * DAY), image: bootRain, campaign: "Spring launch", video: 5, projectId: "p5" },
  { id: "f10", name: "Summer gown edit", size: "1080×1080", editedAt: ago(4 * DAY), image: gownRust, video: 8, projectId: "p6" },
  { id: "f11", name: "Boot colourways", size: "300×250", editedAt: ago(9 * DAY), image: bootColours, video: 5 },
  { id: "f12", name: "Sport lens switch", size: "1080×1920", editedAt: ago(15 * DAY), image: sportPoster, video: 0 },
]

export const PROJECTS: ProjectSample[] = [
  { id: "p1", name: "Wild Haven weekend escape", size: "1080×1920", editedAt: ago(3 * HOUR), image: wildHaven, video: 5 },
  { id: "p5", name: "Rain-ready boots launch", size: "1920×1080", editedAt: ago(2 * DAY), image: bootRain, video: 5 },
  { id: "p6", name: "Summer gown edit", size: "1080×1080", editedAt: ago(4 * DAY), image: gownRust, video: 8 },
  { id: "p2", name: "Power tools spring sale", size: "300×600", editedAt: ago(6 * DAY), image: tools, video: 8 },
  { id: "p3", name: "Pink tint eyewear launch", size: "336×280", editedAt: ago(25 * DAY), image: shades, video: 0 },
  { id: "p4", name: "Maison holiday edit", size: "1080×1080", editedAt: ago(40 * DAY), image: maison, video: 0 },
]

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
