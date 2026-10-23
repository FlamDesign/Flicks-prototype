import { PizzaIcon, ShirtIcon, SpoonAndForkIcon, BeerIcon, DrinkIcon } from "@hugeicons/core-free-icons"
import { GENERATED_VIDEOS, newStrip, type CanvasElement, type Feed } from "@/components/editor/elements"
import type { Slide } from "@/components/editor/slides-strip"
import type { Template } from "@/data"
import { asset, type BrandSet } from "@/templates/brand-assets"

/**
 * Brand templates built from real campaign assets (Omnicom pitch Flicks): each opens as a complete
 * project. The reference video is included in the Flick, so viewers switch between all three
 * products. Five feeds change per product: title, subtitle, price, CTA copy and CTA link.
 * Fonts are the closest editor fonts to each brand's type; colours come from the brand assets.
 */

type Product = { name: string; title: string; subtitle: string; price: string; cta: string; link: string; thumb: string; color: string }
type Ids = { title: string; subtitle: string; price: string; cta: string; link: string }
type Layout = (ids: Ids, first: Product, count: number) => CanvasElement[]

const FEED_NAMES: [keyof Ids, string, Feed["type"]][] = [
  ["title", "title", "text"],
  ["subtitle", "subtitle", "text"],
  ["price", "price", "text"],
  ["cta", "cta", "text"],
  ["link", "cta-link", "link"],
]

const SQUARE = 1
const TALL = 1080 / 1920

/** an image element centred at x, y, `w` % of the frame wide, keeping the image's shape */
const image = (id: string, src: string, x: number, y: number, w: number, ar: number, ratio: number): CanvasElement => ({
  id,
  kind: "image",
  src,
  x,
  y,
  w,
  h: (w * ratio) / ar,
  ar,
  lock: true,
  fit: "cover",
  radius: 0,
  crop: { t: 0, r: 0, b: 0, l: 0 },
})

/** full-width shade behind text: `h` % of the frame tall, from the top or the bottom edge */
const scrim = (id: string, file: string, top: boolean, h: number, ratio: number): CanvasElement =>
  image(id, asset(file), 50, top ? h / 2 : 100 - h / 2, 100, (100 * ratio) / h, ratio)

function brandTemplate(o: {
  id: string
  set: BrandSet
  title: string
  description: string
  industry: string
  brand: string
  headline: string
  size: string
  ratio: number
  icon: Template["icon"]
  bg: [string, string]
  prompt: string
  card: string
  duration: number
  products: Product[]
  layout: Layout
}): Template {
  const base = GENERATED_VIDEOS.findIndex((v) => v.set === o.set)
  const ids = Object.fromEntries(FEED_NAMES.map(([k]) => [k, `${o.id}-${k}`])) as Ids
  const feeds: Feed[] = FEED_NAMES.map(([k, name, type]) => ({ id: ids[k], name, type }))
  const values = (p: Product) => ({ [ids.title]: p.title, [ids.subtitle]: p.subtitle, [ids.price]: p.price, [ids.cta]: p.cta, [ids.link]: p.link })
  const slides: Slide[] = o.products.map((p, i) => ({
    id: i === 0 ? "main" : `${o.id}-${i}`,
    ...(i ? { n: i } : {}),
    name: p.name,
    prompt: "",
    refs: [],
    video: base + i,
    startedAt: 1,
    thumb: p.thumb,
    feeds: values(p),
    used: { prompt: i === 0 ? o.prompt : `Same scene, ${p.name}`, refs: [], fromReference: i > 0 },
  }))
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    mechanic: "Variants",
    industry: o.industry,
    size: o.size,
    sizes: [o.size],
    brand: o.brand,
    headline: o.headline,
    cta: o.products[0].cta,
    icon: o.icon,
    bg: o.bg,
    variants: o.products.map((p) => ({ label: p.name, color: p.color })),
    prompt: o.prompt,
    image: o.card,
    video: base,
    duration: o.duration,
    saved: { elements: o.layout(ids, o.products[0], o.products.length), slides, feeds, start: "main", includeRef: true },
  }
}

/* ---------- GAP: clean studio frames, navy on white, Gap's serif logo with a Helvetica-like sans ---------- */

const GAP_NAVY = "#002b5f"
const gap = brandTemplate({
  id: "brand-gap",
  set: "gap",
  title: "GAP Men’s Layers",
  description: "Shirt, jacket or sweater: viewers switch the layer on the same model, each with its own price and link.",
  industry: "Fashion",
  brand: "GAP",
  headline: "Men’s new layers",
  size: "1080×1080",
  ratio: SQUARE,
  icon: ShirtIcon,
  bg: ["#e7e5e4", "#f5f5f4"],
  prompt: "Man walks into a white studio, turns and adjusts his shoulder bag, slow push-in on the outfit",
  card: asset("gap-card.webp"),
  duration: 12,
  products: [
    { name: "Denim shirt", title: "Denim Relaxed Shirt", subtitle: "Easy fit in a medium wash. Made to layer.", price: "$69.95", cta: "Shop the shirt", link: "https://www.gap.com/browse/product.do?pid=901884002", thumb: asset("gap-thumb-1.webp"), color: "#6f8fb4" },
    { name: "Brown jacket", title: "Brown Trucker Jacket", subtitle: "A rugged layer for cooler days.", price: "New in", cta: "Shop the jacket", link: "https://www.gap.com/browse/product.do?pid=913461022", thumb: asset("gap-thumb-2.webp"), color: "#4a3328" },
    { name: "Burgundy sweater", title: "Burgundy Crewneck Sweater", subtitle: "Soft knit in a rich fall shade.", price: "New in", cta: "Shop sweaters", link: "https://www.gap.com/browse/men/sweaters?cid=5180", thumb: asset("gap-thumb-3.webp"), color: "#6b1f2a" },
  ],
  layout: (f, p, n) => [
    // white wash from the left keeps the navy copy readable over any layer
    image("gap-wash", asset("scrim-left-white-sq.png"), 31, 50, 62, 318 / 512, SQUARE),
    image("gap-logo", asset("gap-logo.png"), 10, 10, 11, 1, SQUARE),
    { id: "gap-label", kind: "text", variant: "label", text: "Men’s new layers", x: 5, y: 19.5, align: "left", font: "Inter", size: 2.1, color: GAP_NAVY },
    { id: "gap-title", kind: "text", variant: "heading", text: p.title, feed: f.title, x: 5, y: 66, align: "left", w: 44, font: "Inter", size: 4.6, color: GAP_NAVY, bold: true },
    { id: "gap-subtitle", kind: "text", variant: "body", text: p.subtitle, feed: f.subtitle, x: 5, y: 75, align: "left", w: 40, font: "Inter", size: 2.5, color: "#3f3f46" },
    { id: "gap-price", kind: "text", variant: "subheading", text: p.price, feed: f.price, x: 5, y: 82, align: "left", font: "Inter", size: 3.6, color: GAP_NAVY, bold: true },
    { id: "gap-cta", kind: "button", variant: "sharp", text: p.cta, feed: f.cta, linkFeed: f.link, x: 5, y: 91, align: "left", font: "Inter", size: 2.4, bg: GAP_NAVY, color: "#ffffff" },
    { ...newStrip(n, "horizontal", SQUARE), id: "gap-strip", x: 58, y: 80, size: 11, gap: 14, radius: 100, highlight: GAP_NAVY, highlightWidth: 6, bg: "#ffffffb3" },
  ],
})

/* ---------- Diageo: warm golden-hour film, white caps headline, black sharp CTA, round bottle thumbnails ---------- */

const diageo = brandTemplate({
  id: "brand-diageo",
  set: "diageo",
  title: "Diageo Moments",
  description: "Tanqueray, Johnnie Walker or Don Julio: one golden-hour film, poured three ways.",
  industry: "Food & beverage",
  brand: "DIAGEO",
  headline: "Crafting iconic drinks chosen for life’s moments",
  size: "1080×1080",
  ratio: SQUARE,
  icon: DrinkIcon,
  bg: ["#3b2416", "#c08a4a"],
  prompt: "A hand lifts a bottle from a wooden crate at sunset, opens it, and friends raise their glasses",
  card: asset("diageo-card.webp"),
  duration: 14,
  products: [
    { name: "Tanqueray", title: "Tanqueray London Dry Gin", subtitle: "Four botanicals. Distilled since 1830.", price: "750 mL · $23.84", cta: "Shop Tanqueray", link: "https://www.walmart.com/ip/12167200", thumb: asset("diageo-thumb-1.webp"), color: "#1f7a3a" },
    { name: "Black Label", title: "Johnnie Walker Black Label", subtitle: "Blended Scotch whisky, aged 12 years.", price: "750 mL · $34.87", cta: "Shop Black Label", link: "https://www.walmart.com/ip/12167198", thumb: asset("diageo-thumb-2.webp"), color: "#1c1917" },
    { name: "Don Julio", title: "Don Julio Reposado", subtitle: "Tequila rested 8 months in American white oak.", price: "750 mL · $49.87", cta: "Shop Don Julio", link: "https://www.walmart.com/ip/103194642", thumb: asset("diageo-thumb-3.webp"), color: "#b5733a" },
  ],
  layout: (f, p, n) => [
    scrim("diageo-shade-top", "scrim-top-sq.png", true, 32, SQUARE),
    scrim("diageo-shade", "scrim-bottom-sq.png", false, 45, SQUARE),
    image("diageo-logo", asset("diageo-logo.png"), 17, 8, 24, 480 / 103, SQUARE),
    { id: "diageo-label", kind: "text", variant: "label", text: "Crafting iconic drinks chosen for life’s moments", x: 5, y: 62, align: "left", w: 70, font: "Montserrat", size: 2, color: "#f5e6d3" },
    { id: "diageo-title", kind: "text", variant: "heading", text: p.title, feed: f.title, x: 5, y: 70, align: "left", w: 72, font: "Montserrat", size: 5, color: "#ffffff", bold: true },
    { id: "diageo-subtitle", kind: "text", variant: "body", text: p.subtitle, feed: f.subtitle, x: 5, y: 78, align: "left", w: 70, font: "Montserrat", size: 2.6, color: "#e7e5e4" },
    { id: "diageo-price", kind: "text", variant: "subheading", text: p.price, feed: f.price, x: 5, y: 87, align: "left", font: "Montserrat", size: 3.4, color: "#ffffff", bold: true },
    { id: "diageo-cta", kind: "button", variant: "sharp", text: p.cta, feed: f.cta, linkFeed: f.link, x: 95, y: 87, align: "right", font: "Montserrat", size: 2.3, bg: "#000000", color: "#ffffff" },
    { id: "diageo-legal", kind: "text", variant: "caption", text: "Please drink responsibly.", x: 5, y: 95, align: "left", font: "Montserrat", size: 1.7, color: "#d6d3d1" },
    { ...newStrip(n, "vertical", SQUARE), id: "diageo-strip", x: 83, y: 16, size: 12, gap: 16, radius: 100, highlight: "#ffffff", highlightWidth: 6, bg: "#ffffffb3" },
  ],
})

/* ---------- Little Caesars: bold, loud, orange; chunky caps over the cheese pull ---------- */

const LC_ORANGE = "#e66200"
const littleCaesars = brandTemplate({
  id: "brand-little-caesars",
  set: "little-caesars",
  title: "Little Caesars Hot-N-Ready",
  description: "Pepperoni, cheese or veggie: the same cheese pull, three pizzas, each with its price.",
  industry: "Food & beverage",
  brand: "LITTLE CAESARS",
  headline: "Pizza! Pizza!",
  size: "1080×1080",
  ratio: SQUARE,
  icon: PizzaIcon,
  bg: ["#7c2d12", "#e66200"],
  prompt: "Macro over bubbling cheese, a slice pulls away with long cheese strings, the whole pizza on a wooden table",
  card: asset("lc-card.webp"),
  duration: 10,
  products: [
    { name: "Pepperoni", title: "Classic Pepperoni", subtitle: "Hot-N-Ready. No call-ahead needed.", price: "From $5.99", cta: "Order now", link: "https://littlecaesars.com/en-us/", thumb: asset("lc-thumb-1.webp"), color: "#b91c1c" },
    { name: "Cheese", title: "Classic Cheese", subtitle: "Hot-N-Ready. No call-ahead needed.", price: "From $5.59", cta: "Order now", link: "https://littlecaesars.com/en-us/", thumb: asset("lc-thumb-2.webp"), color: "#f59e0b" },
    { name: "Veggie", title: "Veggie", subtitle: "Mushrooms, onions, green peppers and black olives.", price: "From $7.50", cta: "Order now", link: "https://littlecaesars.com/en-us/", thumb: asset("lc-thumb-3.webp"), color: "#16a34a" },
  ],
  layout: (f, p, n) => [
    scrim("lc-shade-top", "scrim-top-sq.png", true, 32, SQUARE),
    scrim("lc-shade", "scrim-bottom-sq.png", false, 45, SQUARE),
    image("lc-logo", asset("lc-logo.png"), 17, 10, 26, 520 / 282, SQUARE),
    { id: "lc-label", kind: "text", variant: "label", text: "Pizza! Pizza!", x: 95, y: 9, align: "right", font: "Bowlby One", size: 3.2, color: "#ff8a2a", bold: false },
    { id: "lc-title", kind: "text", variant: "heading", text: p.title, feed: f.title, x: 5, y: 56, align: "left", w: 70, font: "Bowlby One", size: 6, color: "#ffffff", bold: false },
    { id: "lc-subtitle", kind: "text", variant: "body", text: p.subtitle, feed: f.subtitle, x: 5, y: 64, align: "left", w: 62, font: "Rubik", size: 2.7, color: "#fafaf9" },
    { id: "lc-price", kind: "text", variant: "subheading", text: p.price, feed: f.price, x: 5, y: 73, align: "left", font: "Bowlby One", size: 4.6, color: "#ff8a2a", bold: false },
    { id: "lc-cta", kind: "button", variant: "pill", text: p.cta, feed: f.cta, linkFeed: f.link, x: 95, y: 73, align: "right", font: "Rubik", size: 3, bg: LC_ORANGE, color: "#ffffff", bold: true },
    { ...newStrip(n, "horizontal", SQUARE), id: "lc-strip", size: 11, gap: 18, radius: 100, highlight: LC_ORANGE, highlightWidth: 7, bg: "#ffffffb3", x: (100 - (3 * 11 + 2 * (18 / 10.8))) / 2, y: 83 },
    { id: "lc-legal", kind: "text", variant: "caption", text: "Prices vary by location.", x: 50, y: 97.5, align: "center", font: "Rubik", size: 1.6, color: "#d6d3d1" },
  ],
})

/* ---------- General Mills: warm and friendly; handwritten headline, Big G blue CTA, cereal boxes as thumbnails ---------- */

const GM_BLUE = "#234291"
const generalMills = brandTemplate({
  id: "brand-general-mills",
  set: "general-mills",
  title: "General Mills Breakfast",
  description: "Lucky Charms, Honey Nut Cheerios or Cinnamon Toast Crunch: pick a box, see your bowl.",
  industry: "Food & beverage",
  brand: "GENERAL MILLS",
  headline: "We serve the world by making food people love",
  size: "1080×1080",
  ratio: SQUARE,
  icon: SpoonAndForkIcon,
  bg: ["#1e3a8a", "#f59e0b"],
  prompt: "Camera dives through a swirl of milk to a glowing cereal box, then a spoonful lifts from a bowl",
  card: asset("gm-card.webp"),
  duration: 14,
  products: [
    { name: "Lucky Charms", title: "Lucky Charms", subtitle: "They’re Magically Delicious!", price: "10.5 oz · $3.16", cta: "Shop Lucky Charms", link: "https://www.walmart.com/ip/394624478", thumb: asset("gm-thumb-1.webp"), color: "#c8102e" },
    { name: "Honey Nut Cheerios", title: "Honey Nut Cheerios", subtitle: "Made with real honey.", price: "10.8 oz · $2.97", cta: "Shop Cheerios", link: "https://www.walmart.com/ip/944068996", thumb: asset("gm-thumb-2.webp"), color: "#f2a900" },
    { name: "Cinnamon Toast Crunch", title: "Cinnamon Toast Crunch", subtitle: "Blasted with real cinnamon.", price: "12 oz · $3.16", cta: "Shop Toast Crunch", link: "https://www.walmart.com/ip/218223637", thumb: asset("gm-thumb-3.webp"), color: "#a0522d" },
  ],
  layout: (f, p, n) => [
    scrim("gm-shade", "scrim-bottom-sq-55.png", false, 55, SQUARE),
    image("gm-logo", asset("gm-logo.png"), 14, 10, 20, 520 / 330, SQUARE),
    { id: "gm-label", kind: "text", variant: "body", text: "We serve the world by making food people love", x: 5, y: 60, align: "left", w: 66, font: "Kalam", size: 3, color: "#fde68a" },
    { id: "gm-title", kind: "text", variant: "heading", text: p.title, feed: f.title, x: 5, y: 68, align: "left", w: 70, font: "Kalam", size: 6, color: "#ffffff", bold: true },
    { id: "gm-subtitle", kind: "text", variant: "body", text: p.subtitle, feed: f.subtitle, x: 5, y: 76, align: "left", w: 66, font: "Nunito", size: 2.8, color: "#fafaf9" },
    { id: "gm-price", kind: "text", variant: "subheading", text: p.price, feed: f.price, x: 5, y: 83, align: "left", font: "Nunito", size: 3.4, color: "#ffffff", bold: true },
    { id: "gm-cta", kind: "button", variant: "rounded", text: p.cta, feed: f.cta, linkFeed: f.link, x: 5, y: 92, align: "left", font: "Nunito", size: 2.7, bg: GM_BLUE, color: "#ffffff", bold: true },
    { ...newStrip(n, "vertical", SQUARE), id: "gm-strip", x: 82, y: 22, size: 13, gap: 16, radius: 24, highlight: "#ffffff", highlightWidth: 6, bg: "#ffffffe6" },
  ],
})

/* ---------- Modelo: 9:16, gold on deep shadow, crest-style serif caps, bottle buttons ---------- */

const MODELO_GOLD = "#d4a64a"
const modelo = brandTemplate({
  id: "brand-modelo",
  set: "modelo",
  title: "Modelo Three Legacies",
  description: "Oro, Negra or Especial: one ice-cold pour, three beers, in a full-screen 9:16.",
  industry: "Food & beverage",
  brand: "MODELO",
  headline: "Three legacies. One extraordinary taste.",
  size: "1080×1920",
  ratio: TALL,
  icon: BeerIcon,
  bg: ["#1c1206", "#d4a64a"],
  prompt: "Macro on an ice-cold Modelo bottle, the cap pops off, beer pours into a branded glass in golden light",
  card: asset("modelo-card.webp"),
  duration: 14,
  products: [
    { name: "Oro", title: "Modelo Oro", subtitle: "The gold standard light beer.", price: "12-pack bottles · $14.99", cta: "Find Modelo Oro", link: "https://www.modelousa.com/products/modelo-oro", thumb: asset("modelo-thumb-1.webp"), color: "#e8c25a" },
    { name: "Negra", title: "Modelo Negra", subtitle: "Munich Dunkel-style lager.", price: "12-pack bottles · $15.99", cta: "Find Modelo Negra", link: "https://www.modelousa.com/products/negra", thumb: asset("modelo-thumb-2.webp"), color: "#5b2a12" },
    { name: "Especial", title: "Modelo Especial", subtitle: "Pilsner-style lager.", price: "12-pack bottles · $15.99", cta: "Find Modelo Especial", link: "https://www.modelousa.com/products/especial", thumb: asset("modelo-thumb-3.webp"), color: "#d9a520" },
  ],
  layout: (f, p, n) => [
    scrim("modelo-shade-top", "scrim-top-tall.png", true, 30, TALL),
    scrim("modelo-shade", "scrim-bottom-tall.png", false, 55, TALL),
    { id: "modelo-label", kind: "text", variant: "label", text: "Cerveza Modelo · 1925", x: 50, y: 5, align: "center", font: "Cinzel", size: 3.2, color: MODELO_GOLD },
    { id: "modelo-headline", kind: "text", variant: "subheading", text: "Three legacies. One extraordinary taste.", x: 50, y: 10.5, align: "center", w: 80, font: "Cinzel", size: 4.6, color: "#f6ebd0", bold: true },
    { id: "modelo-title", kind: "text", variant: "heading", text: p.title, feed: f.title, x: 50, y: 63, align: "center", w: 90, font: "Cinzel", size: 8.4, color: "#f6ebd0", bold: true },
    { id: "modelo-subtitle", kind: "text", variant: "body", text: p.subtitle, feed: f.subtitle, x: 50, y: 68, align: "center", w: 84, font: "Source Serif 4", size: 4, color: "#f5f5f4", italic: true },
    { id: "modelo-price", kind: "text", variant: "subheading", text: p.price, feed: f.price, x: 50, y: 72.5, align: "center", font: "Source Serif 4", size: 4, color: MODELO_GOLD, bold: true },
    { id: "modelo-cta", kind: "button", variant: "pill", text: p.cta, feed: f.cta, linkFeed: f.link, x: 50, y: 78.5, align: "center", font: "Cinzel", size: 3.8, bg: MODELO_GOLD, color: "#1c1206", bold: true },
    { ...newStrip(n, "horizontal", TALL), id: "modelo-strip", size: 17, gap: 22, radius: 22, highlight: MODELO_GOLD, highlightWidth: 7, bg: "#00000080", x: (100 - (3 * 17 + 2 * (22 / 10.8))) / 2, y: 84 },
    { id: "modelo-legal", kind: "text", variant: "caption", text: "Please drink responsibly.", x: 50, y: 97.6, align: "center", font: "Source Serif 4", size: 2.4, color: "#d6d3d1" },
  ],
})

export const BRAND_TEMPLATES: Template[] = [gap, diageo, littleCaesars, generalMills, modelo]
