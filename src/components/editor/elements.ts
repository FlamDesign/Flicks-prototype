import gen1mp4 from "@/assets/video/gen-1.mp4"
import socialIcon from "@/assets/social-icon.png"
import gen2mp4 from "@/assets/video/gen-2.mp4"
import gen3mp4 from "@/assets/video/gen-3.mp4"
import gen4mp4 from "@/assets/video/gen-4.mp4"
import gen5mp4 from "@/assets/video/gen-5.mp4"
import gen1webm from "@/assets/video/gen-1.webm"
import gen2webm from "@/assets/video/gen-2.webm"
import gen3webm from "@/assets/video/gen-3.webm"
import gen4webm from "@/assets/video/gen-4.webm"
import gen5webm from "@/assets/video/gen-5.webm"
import poster1 from "@/assets/video/poster-1.jpg"
import poster2 from "@/assets/video/poster-2.jpg"
import poster3 from "@/assets/video/poster-3.jpg"
import poster4 from "@/assets/video/poster-4.jpg"
import poster5 from "@/assets/video/poster-5.jpg"
import up1 from "@/assets/uploads/hstn-clear-brown.jpg"
import up2 from "@/assets/uploads/hstn-black-red.jpg"
import up3 from "@/assets/uploads/vanguard-black.jpg"
import up4 from "@/assets/uploads/vanguard-white-blue.jpg"
import up5 from "@/assets/uploads/hstn-black-clear.jpg"
import up6 from "@/assets/uploads/hstn-white-orange.jpg"
import up7 from "@/assets/uploads/meta-logo.png"
import shoe1mp4 from "@/assets/video/shoe-1-wheat.mp4"
import shoe2mp4 from "@/assets/video/shoe-2-black.mp4"
import shoe3mp4 from "@/assets/video/shoe-3-brown.mp4"
import dress1mp4 from "@/assets/video/dress-1-rust.mp4"
import dress2mp4 from "@/assets/video/dress-2-ombre.mp4"
import shoe1poster from "@/assets/video/shoe-1-wheat.jpg"
import shoe2poster from "@/assets/video/shoe-2-black.jpg"
import shoe3poster from "@/assets/video/shoe-3-brown.jpg"
import dress1poster from "@/assets/video/dress-1-rust.jpg"
import dress2poster from "@/assets/video/dress-2-ombre.jpg"
import up8 from "@/assets/uploads/boot-brown-classic.jpg"
import up9 from "@/assets/uploads/boot-black-classic.jpg"
import up10 from "@/assets/uploads/boot-pro-brown.jpg"
import up11 from "@/assets/uploads/dress-rust-tiered.jpg"
import up12 from "@/assets/uploads/dress-ombre-gown.jpg"
import { BRAND_VIDEOS, type BrandSet } from "@/templates/brand-assets"

export type SampleVideo = { name: string; set: "sunglasses" | "boots" | "dress" | BrandSet; size: string; mp4: string; webm?: string; poster: string }
/**
 * Sample generated videos, in three product sets. The first of each set is its reference video;
 * the rest are its variations. Sunglasses are 9:16 with WebM + MP4; boots and dresses are MP4 only.
 */
export const GENERATED_VIDEOS: SampleVideo[] = [
  { name: "sunglasses-1-gold", set: "sunglasses", size: "1080×1920", webm: gen1webm, mp4: gen1mp4, poster: poster1 },
  { name: "sunglasses-2", set: "sunglasses", size: "1080×1920", webm: gen2webm, mp4: gen2mp4, poster: poster2 },
  { name: "sunglasses-3-sapphire", set: "sunglasses", size: "1080×1920", webm: gen3webm, mp4: gen3mp4, poster: poster3 },
  { name: "sunglasses-4-white", set: "sunglasses", size: "1080×1920", webm: gen4webm, mp4: gen4mp4, poster: poster4 },
  { name: "sunglasses-5-black", set: "sunglasses", size: "1080×1920", webm: gen5webm, mp4: gen5mp4, poster: poster5 },
  { name: "shoe-1-wheat", set: "boots", size: "1920×1080", mp4: shoe1mp4, poster: shoe1poster },
  { name: "shoe-2-black", set: "boots", size: "1440×1440", mp4: shoe2mp4, poster: shoe2poster },
  { name: "shoe-3-brown", set: "boots", size: "1440×1440", mp4: shoe3mp4, poster: shoe3poster },
  { name: "dress-1-rust", set: "dress", size: "1440×1440", mp4: dress1mp4, poster: dress1poster },
  { name: "dress-2-ombre", set: "dress", size: "1440×1440", mp4: dress2mp4, poster: dress2poster },
  // brand templates' videos come after the samples (see templates/brand-assets.ts)
  ...BRAND_VIDEOS,
]
/** How many of GENERATED_VIDEOS are the generic samples (the rest belong to brand templates). */
export const SAMPLE_VIDEO_COUNT = 10
/** Each new generation from the home box starts the next set: sunglasses, boots, dresses. */
export const REFERENCE_VIDEOS = [0, 5, 8]
/** The video `step` places along from `base` within its set, so variations stay the same product. */
export const inSet = (base: number, step: number) => {
  const set = GENERATED_VIDEOS[base]?.set ?? "sunglasses"
  const ids = GENERATED_VIDEOS.flatMap((v, i) => (v.set === set ? [i] : []))
  return ids[(Math.max(0, ids.indexOf(base)) + step) % ids.length]
}

/** Horizontal anchor: x is the element's left edge, centre or right edge. */
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
      border?: string // border colour
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
      highlight: string // active thumbnail outline colour
      highlightWidth: number // px at 1080 wide
      bg: string // thumbnail background (shows until a video is ready); its opacity also sets how faded the other thumbnails are
      radius: number // % of the largest possible radius
      free?: { x: number; y: number }[] // free layout: each thumbnail's offset from the top-left, in cqw
      /** the last free arrangement, kept while another layout is on so switching back restores it */
      savedFree?: { x: number; y: number; size: number; free: { x: number; y: number }[] }
    }

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

/** Colour swatches for text and button fills. */
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
  { variant: "glass", name: "Glass", className: "rounded-full border border-white/40 bg-white/20 text-white backdrop-blur-md", panelClassName: "rounded-full border border-zinc-950/15 bg-zinc-950/5 text-zinc-950" },
  { variant: "block", name: "Block shadow", className: "rounded-none border-[0.12em] border-zinc-950 bg-white text-zinc-950 shadow-[0.25em_0.25em_0_0_rgb(9_9_11)]" },
  // image only, no label: only its image and link change
  { variant: "icon", name: "Icon", className: "rounded-full" },
  { variant: "link", name: "Text link", className: "rounded-none px-0! text-white underline decoration-[0.08em] underline-offset-[0.3em]", panelClassName: "rounded-none px-0! text-zinc-950 underline decoration-[0.08em] underline-offset-[0.3em]", arrow: true },
]

export const BUTTON_TEXT = "Shop now"

/** Default image for a new icon button: a generic social icon (PNG) to replace with the brand's own. */
export const DEFAULT_ICON = socialIcon

export type Upload = { id: string; name: string; src: string; loading: boolean; failed?: boolean }

export const SAMPLE_UPLOADS: Upload[] = [
  { id: "u1", name: "hstn-clear-brown.jpg", src: up1, loading: false },
  { id: "u2", name: "hstn-black-red.jpg", src: up2, loading: false },
  { id: "u3", name: "vanguard-black.jpg", src: up3, loading: false },
  { id: "u4", name: "vanguard-white-blue.jpg", src: up4, loading: false },
  { id: "u5", name: "hstn-black-clear.jpg", src: up5, loading: false },
  { id: "u6", name: "hstn-white-orange.jpg", src: up6, loading: false },
  { id: "u7", name: "meta-logo.png", src: up7, loading: false },
  { id: "u8", name: "boot-brown-classic.jpg", src: up8, loading: false },
  { id: "u9", name: "boot-black-classic.jpg", src: up9, loading: false },
  { id: "u10", name: "boot-pro-brown.jpg", src: up10, loading: false },
  { id: "u11", name: "dress-rust-tiered.jpg", src: up11, loading: false },
  { id: "u12", name: "dress-ombre-gown.jpg", src: up12, loading: false },
]

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
  { id: "story", name: "Centred story", align: "center", at: 50, parts: [{ kind: "text", variant: "heading" }, { kind: "text", variant: "body" }, { kind: "button", variant: "rounded" }] },
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

/** Colours a style renders with by default, so the toolbar swatches match the canvas. */
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
  if (c.includes("border-white/40")) return { width: 1, color: "#ffffff66" }
  return { width: 0, color: "#ffffff" }
}

/** Default thumbnail strip, centred near the bottom of the frame for `count` thumbnails. */
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
    bg: "#a1a1aab3", // grey at 70%
    radius: 20,
    // thumbnails are square: `size` cqw tall, which is size * ratio in % of frame height
    x: layout === "horizontal" ? (100 - span) / 2 : 100 - size - 5,
    y: layout === "horizontal" ? 100 - size * ratio - 6 : 20,
  }
}

/** Keeps a strip inside the frame when its layout changes: centres it along its new direction and shrinks it if needed. */
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
export function clampStrip(el: Extract<CanvasElement, { kind: "strip" }>, count: number, ratio: number): Extract<CanvasElement, { kind: "strip" }> {
  const extent = (s: typeof el) => {
    const g = s.gap / 10.8
    if (s.layout === "horizontal") return { w: count * s.size + (count - 1) * g, h: s.size * ratio }
    if (s.layout === "vertical") return { w: s.size, h: (count * s.size + (count - 1) * g) * ratio }
    const fr = Array.from({ length: count }, (_, i) => s.free?.[i] ?? { x: i * (s.size + g), y: 0 })
    return { w: Math.max(...fr.map((o) => o.x)) + s.size, h: (Math.max(...fr.map((o) => o.y)) + s.size) * ratio }
  }
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
