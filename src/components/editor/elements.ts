import socialIcon from "@/assets/social-icon.png"
import { BRAND_VIDEOS, type BrandSet } from "@/templates/brand-assets"
import { REAL_VIDEOS, type RealSlug } from "@/templates/real-media"

/**
 * Every video is known by one key that never changes: a video that comes with the app (a brand
 * template's, a real Flick's) by its name, a video made or uploaded through the AI server by its
 * address. Slides, Flicks and templates keep the key; nothing is ever addressed by a position.
 */
export type VideoKey = string
export type SampleVideo = { key: VideoKey; name: string; set: "made" | BrandSet | `real-${RealSlug}`; size: string; mp4: string; poster: string }

/** the videos that come with the app, by name */
const builtIn = new Map<VideoKey, SampleVideo>([...BRAND_VIDEOS, ...REAL_VIDEOS].map((v) => [v.name, { ...v, key: v.name }]))
/** videos made or uploaded through the AI server, by address: what's known about them here (name, size, still) */
const made = new Map<VideoKey, SampleVideo>()

/** A plain gray frame for a video whose still isn't known here. */
export const MISSING_POSTER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#d6d3d1"/></svg>')
/** neutral frames for a mock-up before any video exists (storyboard previews): three soft tones */
export const PLACEHOLDER_FRAMES = ["#d6d3d1", "#a8a29e", "#78716c"].map((c) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="${c}"/></svg>`))
const MISSING: SampleVideo = { key: "", name: "missing", set: "made", size: "1080×1080", mp4: "", poster: MISSING_POSTER }

const isAddress = (k: string) => /^(https?:|blob:)/.test(k)

/** a video made or uploaded through the server joins the list; its key is its address */
export function addMadeVideo(v: { name: string; size: string; mp4: string; poster: string }): VideoKey {
  const old = made.get(v.mp4)
  made.set(v.mp4, { ...v, set: "made", key: v.mp4, poster: v.poster || old?.poster || MISSING_POSTER })
  return v.mp4
}
/** the made videos known here, for saving (newest last) */
export const madeVideos = () => [...made.values()].map(({ key: _k, ...v }) => v)
/** made videos another device saved: added here (a known still is never replaced by a missing one) */
export function mergeMadeVideos(list: { name: string; size: string; mp4: string; poster?: string }[] = []) {
  for (const v of list) if (typeof v?.mp4 === "string" && v.mp4) addMadeVideo({ ...v, poster: v.poster ?? "" })
}
/** a made video (one with an address), as opposed to a template's or none at all */
export const isMadeVideo = (key?: VideoKey): key is VideoKey => typeof key === "string" && isAddress(key)

/**
 * The video for a key. A made video not listed here still plays from its address (its still is a
 * gray frame); a missing key gives a gray stand-in, so a project always opens.
 */
export const videoAt = (key?: VideoKey): SampleVideo => {
  // a number is a position from before keys (an old tab still open): never someone else's video
  if (!key || typeof key !== "string") return MISSING
  const v = builtIn.get(key) ?? made.get(key)
  if (v) return v
  return isAddress(key) ? { key, name: "made", set: "made", size: "", mp4: key, poster: MISSING_POSTER } : MISSING
}

export type Align = "left" | "center" | "right"

export type TextVariant = "heading" | "subheading" | "body" | "caption" | "label"
export type ButtonVariant =
  | "icon"
  | "pill"
  | "rounded"
  | "sharp"
  | "arrow"
  | "light"
  | "lightSharp"
  | "outline"
  | "outlineSharp"
  | "glass"
  | "block"
  | "link"

/** Font options shared by text and buttons. Undefined values fall back to the style's defaults. */
export type FontProps = {
  font?: string
  size?: number // cqw (percent of frame width)
  color?: string
  align?: Align
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

/** A feed: a named value (text or link) that every variation sets for itself, used by text and buttons. */
export type Feed = { id: string; name: string; type: "text" | "link" }

export type Crop = { t: number; r: number; b: number; l: number } // % inset from each side

/** Any element on the canvas; `hidden` keeps it out of the Flick without deleting it (Layers panel). */
export type CanvasElement = BaseElement & { hidden?: boolean; /** what the chat placed it as (headline, price, cta…) so it can find it again */ role?: string }
type BaseElement =
  | ({
      id: string
      kind: "text"
      variant: TextVariant
      text: string
      x: number
      y: number
      feed?: string // text feed id
      /** box width, % of frame width, once a side handle sets it; text wraps inside (unset = fits the text) */
      w?: number
      rotation?: number // degrees, clockwise
    } & FontProps)
  | ({
      id: string
      kind: "button"
      variant: ButtonVariant
      text: string
      x: number
      y: number
      bg?: string // "transparent" allowed
      radius?: number // % of the largest possible radius (100 = pill)
      border?: string // border color
      borderWidth?: number // px at 1080 wide; 0 = none
      w?: number // % of frame width, set once the button is resized
      h?: number // % of frame height
      bgImage?: string
      bgFit?: "cover" | "contain" // fill / fit
      feed?: string // text feed id for the label
      link?: string // where the button goes
      linkFeed?: string // link feed id, overrides `link`
    } & FontProps)
  | {
      id: string
      kind: "image"
      src: string
      x: number
      y: number
      w: number // % of frame width
      h: number // % of frame height
      ar: number // natural width / height
      lock: boolean
      fit: "cover" | "contain"
      radius: number // % of the largest possible radius (100 = fully round)
      crop: Crop
      rotation?: number // degrees, clockwise
    }
  | {
      /** A shape: rectangle, circle, triangle, star, polygon, line, arrow or heart. */
      id: string
      kind: "shape"
      shape: ShapeKind
      x: number // center (by align), % of frame width
      y: number // center, % of frame height
      w: number // % of frame width
      h: number // % of frame height
      ar: number // the shape's natural width / height
      lock: boolean
      fill: Paint
      stroke: Paint
      strokeWidth: number // px at 1080 wide; 0 = none
      radius: number // rectangles: % of the largest possible corner radius
      points?: number // stars: points; polygons: sides
      d?: string // "path": SVG path data in a 100×100 box, stretched to the shape's box
      opacity?: number // 0 to 1
      fillImage?: string // a picture filling the shape (over the fill color)
      fillFit?: "cover" | "contain"
      rotation?: number // degrees, clockwise
    }
  | {
      /** One thumbnail per video (main + variations); viewers tap one to switch videos. */
      id: string
      kind: "strip"
      x: number // top-left, % of frame width
      y: number // top-left, % of frame height
      layout: "horizontal" | "vertical" | "free"
      size: number // thumbnail width in cqw (thumbnails are square, whatever the frame's shape)
      gap: number // px at 1080 wide
      highlight: string // active thumbnail outline color
      highlightWidth: number // px at 1080 wide
      bg: string // thumbnail background (shows until a video is ready); its opacity also sets how faded the other thumbnails are
      radius: number // % of the largest possible radius
      free?: { x: number; y: number }[] // free layout: each thumbnail's offset from the top-left, in cqw
      /** the last free arrangement, kept while another layout is on so switching back restores it */
      savedFree?: { x: number; y: number; size: number; free: { x: number; y: number }[] }
    }

export type ShapeKind = "rect" | "ellipse" | "triangle" | "star" | "polygon" | "line" | "arrow" | "heart" | "play" | "path"
/** a solid color (hex, or "transparent"), or a gradient (the chat can set these; the editor offers solid colors) */
export type Paint = string | { type: "linear" | "radial"; angle?: number; stops: { color: string; at: number }[] }
export const isGradient = (p: Paint | undefined): p is Exclude<Paint, string> => !!p && typeof p === "object"
/** elements sized as a box (width and height), not by their content */
export const isBox = (e: CanvasElement): e is Extract<CanvasElement, { kind: "image" | "shape" }> => e.kind === "image" || e.kind === "shape"
/** the shapes the editor offers, with their natural shape and look */
export const SHAPES: { id: string; shape: ShapeKind; label: string; ar: number; filled: boolean; points?: number }[] = [
  { id: "rect", shape: "rect", label: "Rectangle", ar: 1, filled: true },
  { id: "ellipse", shape: "ellipse", label: "Circle", ar: 1, filled: true },
  { id: "triangle", shape: "triangle", label: "Triangle", ar: 1.15, filled: true },
  { id: "hexagon", shape: "polygon", label: "Hexagon", ar: 1.15, filled: true, points: 6 },
  { id: "star4", shape: "star", label: "4-point star", ar: 1, filled: true, points: 4 },
  { id: "star5", shape: "star", label: "5-point star", ar: 1, filled: true, points: 5 },
  { id: "star6", shape: "star", label: "6-point star", ar: 1, filled: true, points: 6 },
  { id: "star8", shape: "star", label: "8-point star", ar: 1, filled: true, points: 8 },
  { id: "heart", shape: "heart", label: "Heart", ar: 1.1, filled: true },
  { id: "play", shape: "play", label: "Play button", ar: 1, filled: true },
  { id: "line", shape: "line", label: "Line", ar: 12, filled: false },
  { id: "arrow", shape: "arrow", label: "Arrow", ar: 6, filled: false },
]
/** the color new shapes start in */
export const SHAPE_GREY = "#a8a29e"
export const shapeLabel = (s: ShapeKind, points?: number) =>
  s === "path" ? "Custom shape" : s === "star" ? `${points ?? 5}-point star` : s === "polygon" ? (({ 3: "Triangle", 4: "Diamond", 5: "Pentagon", 6: "Hexagon", 8: "Octagon" }) as Record<number, string>)[points ?? 6] ?? `${points}-sided shape` : (SHAPES.find((x) => x.shape === s)?.label ?? "Shape")
/** elements that turn by the rotation handles */
export const canRotate = (e: CanvasElement) => e.kind === "text" || e.kind === "image" || e.kind === "shape"

/** Fonts offered in the editor, grouped for the picker. Google fonts load on demand (src/lib/fonts.ts); system fonts need no download. */
export type FontOption = { name: string; stack: string; google?: boolean }
export const FONT_GROUPS: { group: string; fonts: FontOption[] }[] = [
  { group: "Sans serif", fonts: [
    { name: "DM Sans", stack: '"DM Sans Variable", ui-sans-serif, system-ui, sans-serif' },
    { name: "Inter", stack: '"Inter", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Roboto", stack: '"Roboto", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Open Sans", stack: '"Open Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Montserrat", stack: '"Montserrat", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Poppins", stack: '"Poppins", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Lato", stack: '"Lato", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Raleway", stack: '"Raleway", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Nunito", stack: '"Nunito", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Work Sans", stack: '"Work Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Rubik", stack: '"Rubik", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Manrope", stack: '"Manrope", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Plus Jakarta Sans", stack: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Outfit", stack: '"Outfit", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Figtree", stack: '"Figtree", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Space Grotesk", stack: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Golos Text", stack: '"Golos Text", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Barlow", stack: '"Barlow", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Kanit", stack: '"Kanit", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Josefin Sans", stack: '"Josefin Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Mulish", stack: '"Mulish", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Source Sans 3", stack: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Noto Sans", stack: '"Noto Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "IBM Plex Sans", stack: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Archivo", stack: '"Archivo", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Sora", stack: '"Sora", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Urbanist", stack: '"Urbanist", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Lexend", stack: '"Lexend", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Quicksand", stack: '"Quicksand", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Karla", stack: '"Karla", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Fira Sans", stack: '"Fira Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "PT Sans", stack: '"PT Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Ubuntu", stack: '"Ubuntu", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Cabin", stack: '"Cabin", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Heebo", stack: '"Heebo", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Instrument Sans", stack: '"Instrument Sans", ui-sans-serif, system-ui, sans-serif', google: true },
    { name: "Geist", stack: '"Geist", ui-sans-serif, system-ui, sans-serif', google: true },
  ] },
  { group: "Serif", fonts: [
    { name: "Playfair Display", stack: '"Playfair Display", Georgia, serif', google: true },
    { name: "Merriweather", stack: '"Merriweather", Georgia, serif', google: true },
    { name: "Lora", stack: '"Lora", Georgia, serif', google: true },
    { name: "Libre Baskerville", stack: '"Libre Baskerville", Georgia, serif', google: true },
    { name: "Cormorant Garamond", stack: '"Cormorant Garamond", Georgia, serif', google: true },
    { name: "EB Garamond", stack: '"EB Garamond", Georgia, serif', google: true },
    { name: "Crimson Text", stack: '"Crimson Text", Georgia, serif', google: true },
    { name: "PT Serif", stack: '"PT Serif", Georgia, serif', google: true },
    { name: "Noto Serif", stack: '"Noto Serif", Georgia, serif', google: true },
    { name: "Source Serif 4", stack: '"Source Serif 4", Georgia, serif', google: true },
    { name: "DM Serif Display", stack: '"DM Serif Display", Georgia, serif', google: true },
    { name: "Fraunces", stack: '"Fraunces", Georgia, serif', google: true },
    { name: "Bodoni Moda", stack: '"Bodoni Moda", Georgia, serif', google: true },
    { name: "Instrument Serif", stack: '"Instrument Serif", Georgia, serif', google: true },
    { name: "Spectral", stack: '"Spectral", Georgia, serif', google: true },
    { name: "Roboto Slab", stack: '"Roboto Slab", Georgia, serif', google: true },
    { name: "Zilla Slab", stack: '"Zilla Slab", Georgia, serif', google: true },
    { name: "Cinzel", stack: '"Cinzel", Georgia, serif', google: true },
    { name: "Libre Caslon Text", stack: '"Libre Caslon Text", Georgia, serif', google: true },
    { name: "Newsreader", stack: '"Newsreader", Georgia, serif', google: true },
  ] },
  { group: "Display", fonts: [
    { name: "Bebas Neue", stack: '"Bebas Neue", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Archivo Black", stack: '"Archivo Black", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Anton", stack: '"Anton", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Oswald", stack: '"Oswald", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Abril Fatface", stack: '"Abril Fatface", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Alfa Slab One", stack: '"Alfa Slab One", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Righteous", stack: '"Righteous", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Lobster", stack: '"Lobster", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Bungee", stack: '"Bungee", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Titan One", stack: '"Titan One", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Russo One", stack: '"Russo One", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Fredoka", stack: '"Fredoka", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Syne", stack: '"Syne", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Unbounded", stack: '"Unbounded", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Big Shoulders Display", stack: '"Big Shoulders Display", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Monoton", stack: '"Monoton", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Bowlby One", stack: '"Bowlby One", Impact, ui-sans-serif, sans-serif', google: true },
    { name: "Black Han Sans", stack: '"Black Han Sans", Impact, ui-sans-serif, sans-serif', google: true },
  ] },
  { group: "Handwriting", fonts: [
    { name: "Caveat", stack: '"Caveat", cursive', google: true },
    { name: "Dancing Script", stack: '"Dancing Script", cursive', google: true },
    { name: "Pacifico", stack: '"Pacifico", cursive', google: true },
    { name: "Great Vibes", stack: '"Great Vibes", cursive', google: true },
    { name: "Satisfy", stack: '"Satisfy", cursive', google: true },
    { name: "Shadows Into Light", stack: '"Shadows Into Light", cursive', google: true },
    { name: "Permanent Marker", stack: '"Permanent Marker", cursive', google: true },
    { name: "Indie Flower", stack: '"Indie Flower", cursive', google: true },
    { name: "Kalam", stack: '"Kalam", cursive', google: true },
    { name: "Sacramento", stack: '"Sacramento", cursive', google: true },
    { name: "Amatic SC", stack: '"Amatic SC", cursive', google: true },
    { name: "Homemade Apple", stack: '"Homemade Apple", cursive', google: true },
  ] },
  { group: "Monospace", fonts: [
    { name: "DM Mono", stack: '"DM Mono", ui-monospace, monospace', google: true },
    { name: "JetBrains Mono", stack: '"JetBrains Mono", ui-monospace, monospace', google: true },
    { name: "Roboto Mono", stack: '"Roboto Mono", ui-monospace, monospace', google: true },
    { name: "Fira Code", stack: '"Fira Code", ui-monospace, monospace', google: true },
    { name: "Space Mono", stack: '"Space Mono", ui-monospace, monospace', google: true },
    { name: "IBM Plex Mono", stack: '"IBM Plex Mono", ui-monospace, monospace', google: true },
    { name: "Source Code Pro", stack: '"Source Code Pro", ui-monospace, monospace', google: true },
    { name: "Courier Prime", stack: '"Courier Prime", ui-monospace, monospace', google: true },
  ] },
  { group: "Other languages", fonts: [
    { name: "Noto Sans JP", stack: '"Noto Sans JP", system-ui, sans-serif', google: true },
    { name: "Noto Serif JP", stack: '"Noto Serif JP", system-ui, sans-serif', google: true },
    { name: "M PLUS Rounded 1c", stack: '"M PLUS Rounded 1c", system-ui, sans-serif', google: true },
    { name: "Noto Sans KR", stack: '"Noto Sans KR", system-ui, sans-serif', google: true },
    { name: "Noto Sans SC", stack: '"Noto Sans SC", system-ui, sans-serif', google: true },
    { name: "Noto Sans Arabic", stack: '"Noto Sans Arabic", system-ui, sans-serif', google: true },
    { name: "Cairo", stack: '"Cairo", system-ui, sans-serif', google: true },
    { name: "Tajawal", stack: '"Tajawal", system-ui, sans-serif', google: true },
    { name: "Noto Sans Devanagari", stack: '"Noto Sans Devanagari", system-ui, sans-serif', google: true },
    { name: "Hind", stack: '"Hind", system-ui, sans-serif', google: true },
    { name: "Noto Sans Thai", stack: '"Noto Sans Thai", system-ui, sans-serif', google: true },
    { name: "Prompt", stack: '"Prompt", system-ui, sans-serif', google: true },
    { name: "Be Vietnam Pro", stack: '"Be Vietnam Pro", system-ui, sans-serif', google: true },
  ] },
  { group: "System", fonts: [
    { name: "Arial", stack: "Arial, Helvetica, sans-serif" },
    { name: "Helvetica", stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
    { name: "Verdana", stack: "Verdana, Geneva, sans-serif" },
    { name: "Trebuchet MS", stack: '"Trebuchet MS", sans-serif' },
    { name: "Georgia", stack: "Georgia, serif" },
    { name: "Times New Roman", stack: '"Times New Roman", Times, serif' },
    { name: "Courier New", stack: '"Courier New", Courier, monospace' },
    { name: "Impact", stack: "Impact, Haettenschweiler, sans-serif" },
  ] },
]

export const FONTS: FontOption[] = FONT_GROUPS.flatMap((g) => g.fonts)

export const BUTTON_SIZE = 3.2 // default button font size in cqw
export const DEFAULT_BOLD: Record<TextVariant, boolean> = { heading: true, subheading: false, body: false, caption: false, label: true }

/** Color swatches for text and button fills. */
export const SWATCHES = ["#ffffff", "#f4f4f5", "#a1a1aa", "#3f3f46", "#09090b", "#f59e0b", "#ea580c", "#dc2626", "#db2777", "#7c3aed", "#2563eb", "#0891b2", "#16a34a", "#65a30d"]

/** Text styles. Sizes are in cqw (percent of the frame width) so they scale with any format. */
export const TEXT_STYLES: { variant: TextVariant; name: string; sample: string; size: number; className: string }[] = [
  { variant: "heading", name: "Heading", sample: "Add a heading", size: 8, className: "font-semibold leading-[1.05] tracking-tight" },
  { variant: "subheading", name: "Subheading", sample: "Add a subheading", size: 5, className: "font-medium leading-tight" },
  { variant: "body", name: "Body", sample: "Add a little bit of body text", size: 3.4, className: "leading-snug" },
  { variant: "caption", name: "Caption", sample: "Add a caption", size: 2.6, className: "leading-snug opacity-90" },
  { variant: "label", name: "Label", sample: "Add a label", size: 2.4, className: "font-semibold uppercase tracking-[0.18em]" },
]

/**
 * Neutral (black / white) button designs for ad creatives.
 * `className` is how the button renders on the video; `panelClassName` is the preview in the white panel,
 * where white-on-video styles are shown in black so they stay visible.
 */
export const BUTTON_STYLES: { variant: ButtonVariant; name: string; className: string; panelClassName?: string; arrow?: boolean }[] = [
  { variant: "pill", name: "Pill", className: "rounded-full bg-zinc-950 text-white" },
  { variant: "rounded", name: "Rounded", className: "rounded-[0.5em] bg-zinc-950 text-white" },
  { variant: "sharp", name: "Sharp", className: "rounded-none bg-zinc-950 text-white uppercase tracking-[0.12em]" },
  { variant: "arrow", name: "Pill with arrow", className: "rounded-full bg-zinc-950 text-white", arrow: true },
  { variant: "light", name: "Light pill", className: "rounded-full bg-white text-zinc-950", panelClassName: "rounded-full bg-white text-zinc-950 ring-1 ring-zinc-300" },
  { variant: "lightSharp", name: "Light sharp", className: "rounded-none bg-white text-zinc-950 uppercase tracking-[0.12em]", panelClassName: "rounded-none bg-white text-zinc-950 uppercase tracking-[0.12em] ring-1 ring-zinc-300" },
  { variant: "outline", name: "Outline", className: "rounded-full border-[0.12em] border-white text-white", panelClassName: "rounded-full border-[0.12em] border-zinc-950 text-zinc-950" },
  { variant: "outlineSharp", name: "Outline sharp", className: "rounded-none border-[0.12em] border-white text-white", panelClassName: "rounded-none border-[0.12em] border-zinc-950 text-zinc-950" },
  { variant: "glass", name: "Glass", className: "rounded-full border border-white/50 bg-white/20 text-white backdrop-blur-md", panelClassName: "rounded-full border border-zinc-950/15 bg-zinc-950/5 text-zinc-950" },
  { variant: "block", name: "Block shadow", className: "rounded-none border-[0.12em] border-zinc-950 bg-white text-zinc-950 shadow-[0.25em_0.25em_0_0_rgb(9_9_11)]" },
  // image only, no label: only its image and link change
  { variant: "icon", name: "Icon", className: "rounded-full" },
  { variant: "link", name: "Text link", className: "rounded-none px-0! text-white underline decoration-[0.08em] underline-offset-[0.3em]", panelClassName: "rounded-none px-0! text-zinc-950 underline decoration-[0.08em] underline-offset-[0.3em]", arrow: true },
]

export const BUTTON_TEXT = "Shop now"

/** Default image for a new icon button: a generic social icon (PNG) to replace with the brand's own. */
export const DEFAULT_ICON = socialIcon

export type Upload = { id: string; name: string; src: string; loading: boolean; failed?: boolean; /** kept in the server library (Assets) */ server?: boolean }

const uid = () => crypto.randomUUID()
const text = (variant: TextVariant, x: number, y: number, align: Align = "center") =>
  ({ id: uid(), kind: "text", variant, text: TEXT_STYLES.find((t) => t.variant === variant)!.sample, x, y, align }) as CanvasElement
const button = (variant: ButtonVariant, x: number, y: number, align: Align = "center") =>
  ({ id: uid(), kind: "button", variant, text: BUTTON_TEXT, x, y, align }) as CanvasElement

type LayoutPart = { kind: "text"; variant: TextVariant } | { kind: "button"; variant: ButtonVariant }

/** Layout presets: a stack of text and button styles, imported at a set position and alignment. */
type LayoutDef = { id: string; name: string; parts: LayoutPart[]; at: number; align: Align }
const LAYOUT_DEFS: LayoutDef[] = [
  { id: "hero", name: "Bottom left hero", align: "left", at: 78, parts: [{ kind: "text", variant: "label" }, { kind: "text", variant: "heading" }, { kind: "button", variant: "pill" }] },
  { id: "story", name: "Centered story", align: "center", at: 50, parts: [{ kind: "text", variant: "heading" }, { kind: "text", variant: "body" }, { kind: "button", variant: "rounded" }] },
  { id: "title", name: "Top left title", align: "left", at: 13, parts: [{ kind: "text", variant: "heading" }, { kind: "text", variant: "subheading" }] },
  { id: "promo", name: "Top right promo", align: "right", at: 16, parts: [{ kind: "text", variant: "label" }, { kind: "text", variant: "subheading" }, { kind: "text", variant: "caption" }] },
  { id: "cta", name: "Bottom call to action", align: "center", at: 87, parts: [{ kind: "text", variant: "caption" }, { kind: "button", variant: "light" }] },
  { id: "statement", name: "Left statement", align: "left", at: 50, parts: [{ kind: "text", variant: "heading" }, { kind: "button", variant: "link" }] },
  { id: "offer", name: "Bottom right offer", align: "right", at: 85, parts: [{ kind: "text", variant: "subheading" }, { kind: "button", variant: "lightSharp" }] },
]
export const LAYOUTS = LAYOUT_DEFS.map((l) => ({ ...l, build: () => stack(l.parts, l.at, l.align) }))

const EDGE = 8 // side margin (% of frame width) for left/right aligned layouts
const xFor = (align: Align) => (align === "left" ? EDGE : align === "right" ? 100 - EDGE : 50)

/** Places parts top to bottom around a vertical anchor (% of frame height), spacing by element size. */
function stack(parts: LayoutPart[], at: number, align: Align): CanvasElement[] {
  const gap: Record<string, number> = { heading: 9, subheading: 6.5, body: 5, caption: 4, label: 4, button: 9 }
  const heights = parts.map((p) => (p.kind === "button" ? gap.button : gap[p.variant]))
  const total = heights.reduce((a, b) => a + b, 0)
  let y = Math.min(96 - total, Math.max(4, at - total / 2))
  const x = xFor(align)
  return parts.map((p, i) => {
    const cy = y + heights[i] / 2
    y += heights[i]
    return p.kind === "button" ? button(p.variant, x, cy, align) : text(p.variant, x, cy, align)
  })
}

/** Colors a style renders with by default, so the toolbar swatches match the canvas. */
export function defaultInk(el: Extract<CanvasElement, { kind: "text" | "button" }>) {
  if (el.kind === "text") return "#ffffff"
  return BUTTON_STYLES.find((b) => b.variant === el.variant)!.className.includes("text-zinc-950") ? "#09090b" : "#ffffff"
}
export function defaultFill(el: Extract<CanvasElement, { kind: "button" }>) {
  const c = BUTTON_STYLES.find((b) => b.variant === el.variant)!.className
  if (c.includes("bg-zinc-950")) return "#09090b"
  if (c.includes("bg-white ")) return "#ffffff"
  if (c.includes("bg-white/20")) return "#ffffff33"
  return "transparent"
}

/** Radius a button style starts with, as % of the largest possible radius. */
export function defaultRadius(el: Extract<CanvasElement, { kind: "button" }>) {
  const c = BUTTON_STYLES.find((b) => b.variant === el.variant)!.className
  return c.includes("rounded-full") ? 100 : c.includes("rounded-[0.5em]") ? 40 : 0
}

/** Border a button style starts with (width in px at 1080 wide). */
export function defaultBorder(el: Extract<CanvasElement, { kind: "button" }>) {
  const c = BUTTON_STYLES.find((b) => b.variant === el.variant)!.className
  const size = el.size ?? BUTTON_SIZE
  if (c.includes("border-[0.12em]")) return { width: Math.round(0.12 * size * 10.8), color: c.includes("border-white") ? "#ffffff" : "#09090b" }
  if (c.includes("border-white/50")) return { width: 1, color: "#ffffff66" }
  return { width: 0, color: "#ffffff" }
}

/** Default thumbnail strip, centered near the bottom of the frame for `count` thumbnails. */
export function newStrip(count: number, layout: "horizontal" | "vertical" = "horizontal", ratio = 9 / 16): Omit<Extract<CanvasElement, { kind: "strip" }>, "id"> {
  const size = layout === "horizontal" ? 12 : 10
  const gap = 16
  const span = count * size + (count - 1) * (gap / 10.8)
  return {
    kind: "strip",
    layout,
    size,
    gap,
    highlight: "#ffffff",
    highlightWidth: 6,
    bg: "#a1a1aab3", // gray at 70%
    radius: 20,
    // thumbnails are square: `size` cqw tall, which is size * ratio in % of frame height
    x: layout === "horizontal" ? (100 - span) / 2 : 100 - size - 5,
    y: layout === "horizontal" ? 100 - size * ratio - 6 : 20,
  }
}

/** Keeps a strip inside the frame when its layout changes: centers it along its new direction and shrinks it if needed. */
export function fitStrip(el: Extract<CanvasElement, { kind: "strip" }>, layout: "horizontal" | "vertical", count: number, ratio: number) {
  const g = el.gap / 10.8
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  if (layout === "horizontal") {
    // widths in % of frame width (= cqw)
    const size = Math.min(el.size, (90 - (count - 1) * g) / count)
    const span = count * size + (count - 1) * g
    return { size, x: (100 - span) / 2, y: clamp(el.y, 0, 100 - size * ratio) }
  }
  // heights in % of frame height: a square thumbnail is size * ratio tall, a gap is g * ratio
  const size = Math.min(el.size, (90 - (count - 1) * g * ratio) / (count * ratio))
  const span = count * size * ratio + (count - 1) * g * ratio
  return { size, y: (100 - span) / 2, x: clamp(el.x, 0, 100 - size) }
}

/**
 * Keeps a thumbnail strip fully on the frame: shrinks it if it's too big, then nudges it back inside.
 * Sizes: widths in % of frame width (= cqw), heights in % of frame height; a square thumbnail is size * ratio tall in %H.
 */
/** A strip's width (% of frame width) and height (% of frame height). */
export function stripExtent(s: Extract<CanvasElement, { kind: "strip" }>, count: number, ratio: number) {
  const g = s.gap / 10.8
  if (s.layout === "horizontal") return { w: count * s.size + (count - 1) * g, h: s.size * ratio }
  if (s.layout === "vertical") return { w: s.size, h: (count * s.size + (count - 1) * g) * ratio }
  const fr = Array.from({ length: count }, (_, i) => s.free?.[i] ?? { x: i * (s.size + g), y: 0 })
  return { w: Math.max(...fr.map((o) => o.x)) + s.size, h: (Math.max(...fr.map((o) => o.y)) + s.size) * ratio }
}

export function clampStrip(el: Extract<CanvasElement, { kind: "strip" }>, count: number, ratio: number): Extract<CanvasElement, { kind: "strip" }> {
  const extent = (s: typeof el) => stripExtent(s, count, ratio)
  // room for the active highlight, which sits outside the thumbnail
  const mw = el.highlightWidth / 10.8
  const mh = mw * ratio
  let s = el
  const e0 = extent(s)
  const k = Math.min(1, (100 - 2 * mw) / e0.w, (100 - 2 * mh) / e0.h)
  if (k < 1) s = { ...s, size: s.size * k, gap: s.gap * k, free: s.free?.map((o) => ({ x: o.x * k, y: o.y * k })) }
  const { w, h } = extent(s)
  const x = Math.min(100 - w - mw, Math.max(mw, s.x))
  const y = Math.min(100 - h - mh, Math.max(mh, s.y))
  return x === s.x && y === s.y && s === el ? el : { ...s, x, y }
}
