/**
 * What the chat plans and designs, and how a design becomes canvas elements. Pure functions: the
 * editor applies the results.
 */
import { BUTTON_TEXT, FONTS, type Align, type CanvasElement, type ButtonVariant } from "@/components/editor/elements"

export type PlanVariation = { name: string; prompt: string; label?: string; price?: string; link?: string }
/** the thumbnail strip viewers tap to switch: where it sits and how it looks */
export type Thumbs = {
  position?: "bottom" | "top" | "left" | "right"
  shape?: "square" | "rounded" | "circle"
  size?: "small" | "medium" | "large"
  highlight_color?: string
}
export type Design = {
  headline?: string
  subheading?: string
  cta?: string
  show_price?: boolean
  show_label?: boolean
  layout?: "top" | "center" | "bottom"
  align?: Align
  text_color?: string
  button_color?: string
  button_text_color?: string
  button_style?: "pill" | "rounded" | "sharp" | "light" | "outline" | "glass"
  font?: string
  thumbnails?: Thumbs
}
export type Plan = {
  title: string
  reference: { prompt: string }
  variations: PlanVariation[]
  design: Design
}
export type Brand = { name?: string; primary_color?: string; secondary_color?: string; text_color?: string; font?: string; tone?: string }

/** roles the chat finds its elements by */
export type Role = "headline" | "subheading" | "label" | "price" | "cta"
export const roleOf = (el: CanvasElement) => (el as { role?: Role }).role

const uid = () => crypto.randomUUID()
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
export const color = (v?: string) => (v && HEX.test(v.trim()) ? v.trim() : undefined)
export const fontName = (v?: string) => (v ? FONTS.find((f) => f.name.toLowerCase() === v.trim().toLowerCase())?.name : undefined)
const BUTTONS: Record<NonNullable<Design["button_style"]>, ButtonVariant> = { pill: "pill", rounded: "rounded", sharp: "sharp", light: "light", outline: "outline", glass: "glass" }

const SIZES = { small: 10, medium: 12, large: 15 }
const RADII = { square: 8, rounded: 24, circle: 100 }
type Strip = Extract<CanvasElement, { kind: "strip" }>
/** the strip for a thumbnails style: layout, size, shape, highlight and position */
export function stripFor(t: Thumbs = {}, count: number, ratio: number, brand?: Brand): Omit<Strip, "id"> {
  const size = SIZES[t.size ?? "medium"] ?? 12
  const gap = 16
  const span = count * size + (count - 1) * (gap / 10.8)
  const vertical = t.position === "left" || t.position === "right"
  return {
    kind: "strip",
    layout: vertical ? "vertical" : "horizontal",
    size,
    gap,
    highlight: color(t.highlight_color) ?? color(brand?.primary_color) ?? "#ffffff",
    highlightWidth: 6,
    bg: "#a1a1aab3",
    radius: RADII[t.shape ?? "rounded"] ?? 24,
    x: vertical ? (t.position === "left" ? 5 : 100 - size - 5) : (100 - span) / 2,
    y: vertical ? Math.max(4, (100 - span * ratio) / 2) : t.position === "top" ? 5 : 100 - size * ratio - 6,
  }
}

/** heights (% of a 9:16 frame) that each part takes in a stack */
const H = { label: 4.5, headline: 9, subheading: 6, price: 6, cta: 9 }

/**
 * The Flick's on-screen design: label, headline, subheading, price and CTA, stacked at the top,
 * centre or bottom, plus the thumbnail strip. Label and price use feeds (a value per variation);
 * the button's link uses the link feed.
 */
export function buildDesign(
  d: Design,
  opts: { ratio: number; count: number; feeds: { label?: string; price?: string; link?: string }; brand?: Brand },
): CanvasElement[] {
  const t = d.thumbnails ?? {}
  const strip = stripFor(t, opts.count, opts.ratio, opts.brand)
  // text never sits on the same side as a side strip
  const align: Align = (d.align === "left" && t.position === "left") || (d.align === "right" && t.position === "right") ? "center" : (d.align ?? "center")
  const x = align === "left" ? 8 : align === "right" ? 92 : 50
  const font = fontName(d.font) ?? fontName(opts.brand?.font)
  const ink = color(d.text_color) ?? color(opts.brand?.text_color)
  const parts: { role: Role; h: number }[] = []
  if (d.show_label && opts.feeds.label) parts.push({ role: "label", h: H.label })
  if (d.headline) parts.push({ role: "headline", h: H.headline })
  if (d.subheading) parts.push({ role: "subheading", h: H.subheading })
  if (d.show_price && opts.feeds.price) parts.push({ role: "price", h: H.price })
  const layout = d.layout ?? "bottom"
  // the CTA sits in the stack at the bottom; above the strip otherwise
  const ctaInStack = layout === "bottom"
  if (d.cta !== "" && ctaInStack) parts.push({ role: "cta", h: H.cta })
  const total = parts.reduce((a, p) => a + p.h, 0)
  // the stack keeps clear of a strip along the top or bottom
  const stripH = strip.layout === "horizontal" ? strip.size * opts.ratio : 0
  const bottomEdge = strip.layout === "horizontal" && t.position !== "top" ? strip.y - 3 : 94
  const topEdge = strip.layout === "horizontal" && t.position === "top" ? strip.y + stripH + 4 : 6
  const stripTop = bottomEdge + 3
  const at = layout === "top" ? topEdge + total / 2 : layout === "center" ? 46 : bottomEdge - total / 2
  let y = Math.max(4, at - total / 2)
  const out: CanvasElement[] = []
  const text = (role: Role, variant: "heading" | "subheading" | "label", value: string, feed?: string, cy = y) =>
    ({ id: uid(), kind: "text", variant, text: value, x, y: cy, align, feed, role, ...(font ? { font } : {}), ...(ink ? { color: ink } : {}) }) as CanvasElement
  const cta = (cy: number) => {
    const variant = BUTTONS[d.button_style ?? "pill"] ?? "pill"
    const bg = color(d.button_color) ?? color(opts.brand?.primary_color)
    const fg = color(d.button_text_color)
    return {
      id: uid(),
      kind: "button",
      variant,
      text: d.cta || BUTTON_TEXT,
      x,
      y: cy,
      align,
      role: "cta",
      ...(opts.feeds.link ? { linkFeed: opts.feeds.link } : {}),
      ...(bg ? { bg } : {}),
      ...(fg ? { color: fg } : {}),
      ...(font ? { font } : {}),
    } as CanvasElement
  }
  for (const p of parts) {
    const cy = y + p.h / 2
    y += p.h
    if (p.role === "label") out.push(text("label", "label", "", opts.feeds.label, cy))
    else if (p.role === "headline") out.push(text("headline", "heading", d.headline!, undefined, cy))
    else if (p.role === "subheading") out.push(text("subheading", "subheading", d.subheading!, undefined, cy))
    else if (p.role === "price") out.push(text("price", "subheading", "", opts.feeds.price, cy))
    else if (p.role === "cta") out.push(cta(cy))
  }
  if (d.cta !== "" && !ctaInStack) out.push(cta(stripTop - 7))
  out.push({ ...strip, id: uid() } as CanvasElement)
  return out
}

/** Changes the chat asks for on the existing design; returns the new elements and what changed. */
export function patchDesign(els: CanvasElement[], d: Design, brand?: Brand, opts?: { count: number; ratio: number }): { elements: CanvasElement[]; changed: string[] } {
  const changed: string[] = []
  const font = fontName(d.font)
  const ink = color(d.text_color)
  const bg = color(d.button_color)
  const fg = color(d.button_text_color)
  const elements = els.map((el) => {
    if (el.kind === "strip" && d.thumbnails && opts) {
      changed.push("thumbnails")
      const t = d.thumbnails
      // a style change keeps the strip where it is; a new position moves it
      const next = stripFor({ ...t, highlight_color: t.highlight_color ?? el.highlight }, opts.count, opts.ratio, brand)
      return { ...el, ...next, ...(t.position ? {} : { x: el.x, y: el.y, layout: el.layout }), ...(t.size ? {} : { size: el.size }), ...(t.shape ? {} : { radius: el.radius }) } as CanvasElement
    }
    if (el.kind !== "text" && el.kind !== "button") return el
    const role = roleOf(el)
    let next = { ...el } as CanvasElement & { role?: Role }
    if (role === "headline" && d.headline !== undefined && d.headline !== el.text) (next = { ...next, text: d.headline } as typeof next), changed.push("headline")
    if (role === "subheading" && d.subheading !== undefined && d.subheading !== el.text) (next = { ...next, text: d.subheading } as typeof next), changed.push("subheading")
    if (el.kind === "button" && (role === "cta" || !role)) {
      if (d.cta && d.cta !== el.text) (next = { ...next, text: d.cta } as typeof next), changed.push("button text")
      if (bg) (next = { ...next, bg } as typeof next), changed.push("button colour")
      if (fg) (next = { ...next, color: fg } as typeof next), changed.push("button text colour")
      if (d.button_style && BUTTONS[d.button_style]) (next = { ...next, variant: BUTTONS[d.button_style] } as typeof next), changed.push("button style")
    }
    if (el.kind === "text" && ink) (next = { ...next, color: ink } as typeof next), changed.push("text colour")
    if (font) (next = { ...next, font } as typeof next), changed.push("font")
    return next
  })
  return { elements, changed: [...new Set(changed)] }
}

/** What the chat sees of the canvas design. */
export function describeDesign(els: CanvasElement[], feedName: (id?: string) => string | undefined) {
  return els
    .filter((e) => !e.hidden)
    .map((e) =>
      e.kind === "text"
        ? { type: "text", role: roleOf(e), text: e.feed ? `{${feedName(e.feed)}}` : e.text, color: e.color, font: e.font, y: Math.round(e.y) }
        : e.kind === "button"
          ? { type: "button", role: roleOf(e), text: e.feed ? `{${feedName(e.feed)}}` : e.text, link: e.linkFeed ? `{${feedName(e.linkFeed)}}` : e.link, bg: e.bg, y: Math.round(e.y) }
          : e.kind === "strip"
            ? { type: "thumbnail strip" }
            : { type: "image", y: Math.round(e.y) },
    )
}
