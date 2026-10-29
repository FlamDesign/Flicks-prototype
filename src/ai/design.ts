/**
 * What the chat plans and designs, and how a design becomes canvas elements. Pure functions: the
 * editor applies the results.
 */
import { BUTTON_SIZE, BUTTON_TEXT, FONTS, TEXT_STYLES, type Align, type CanvasElement, type ButtonVariant } from "@/components/editor/elements"

/** on-screen text that can differ per variation (each becomes a feed when it does) */
export const FIELDS = ["headline", "subheading", "label", "price", "cta", "link"] as const
export type Field = (typeof FIELDS)[number]
/** what a field's feed is called, and its type */
export const FIELD_FEED: Record<Field, { name: string; type: "text" | "link" }> = {
  headline: { name: "headline", type: "text" },
  subheading: { name: "subheading", type: "text" },
  label: { name: "label", type: "text" },
  price: { name: "price", type: "text" },
  cta: { name: "button", type: "text" },
  link: { name: "link", type: "link" },
}
export type PlanVariation = { name: string; prompt: string } & Partial<Record<Field, string>>
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
  opts: { ratio: number; count: number; feeds: Partial<Record<Field, string>>; brand?: Brand },
): CanvasElement[] {
  const t = d.thumbnails ?? {}
  const strip = stripFor(t, opts.count, opts.ratio, opts.brand)
  // text never sits on the same side as a side strip
  const align: Align = (d.align === "left" && t.position === "left") || (d.align === "right" && t.position === "right") ? "center" : (d.align ?? "center")
  const x = align === "left" ? 8 : align === "right" ? 92 : 50
  const font = fontName(d.font) ?? fontName(opts.brand?.font)
  const ink = color(d.text_color) ?? color(opts.brand?.text_color)
  const parts: { role: Role; h: number }[] = []
  // label and price show when they have values (unless turned off); headline and subheading when set or varied
  if (d.show_label !== false && opts.feeds.label) parts.push({ role: "label", h: H.label })
  if (d.headline || opts.feeds.headline) parts.push({ role: "headline", h: H.headline })
  if (d.subheading || opts.feeds.subheading) parts.push({ role: "subheading", h: H.subheading })
  if (d.show_price !== false && opts.feeds.price) parts.push({ role: "price", h: H.price })
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
      ...(opts.feeds.cta ? { feed: opts.feeds.cta } : {}),
      ...(bg ? { bg } : {}),
      ...(fg ? { color: fg } : {}),
      ...(font ? { font } : {}),
    } as CanvasElement
  }
  for (const p of parts) {
    const cy = y + p.h / 2
    y += p.h
    if (p.role === "label") out.push(text("label", "label", "", opts.feeds.label, cy))
    else if (p.role === "headline") out.push(text("headline", "heading", d.headline ?? "", opts.feeds.headline, cy))
    else if (p.role === "subheading") out.push(text("subheading", "subheading", d.subheading ?? "", opts.feeds.subheading, cy))
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

/** the element that shows a field: by the role the chat gave it, else the first that fits */
export function elementFor(els: CanvasElement[], f: Field) {
  const role = f === "link" ? "cta" : f
  const byRole = els.find((e) => (e.kind === "text" || e.kind === "button") && roleOf(e) === role)
  if (byRole) return byRole as Extract<CanvasElement, { kind: "text" | "button" }>
  if (f === "cta" || f === "link") return els.find((e) => e.kind === "button") as Extract<CanvasElement, { kind: "button" }> | undefined
  if (f === "headline") return els.find((e) => e.kind === "text" && e.variant === "heading") as Extract<CanvasElement, { kind: "text" }> | undefined
  return undefined
}
/** the feed a field's element uses, if any */
export function feedOfField(els: CanvasElement[], f: Field) {
  const el = elementFor(els, f)
  if (!el) return undefined
  return f === "link" ? (el.kind === "button" ? el.linkFeed : undefined) : el.feed
}

/** What the chat sees of the canvas design: each element with a short id, so it can move or change it. */
export function describeDesign(els: CanvasElement[], feedName: (id?: string) => string | undefined) {
  const r = (n: number) => Math.round(n * 10) / 10
  return els
    .filter((e) => !e.hidden)
    .map((e) => {
      const id = e.id.slice(0, 6)
      if (e.kind === "text")
        return { id, type: "text", role: roleOf(e), style: e.variant, text: e.feed ? `{${feedName(e.feed)}}` : e.text, x: r(e.x), y: r(e.y), align: e.align, size: e.size, color: e.color, font: e.font, width: e.w }
      if (e.kind === "button")
        return { id, type: "button", role: roleOf(e), style: e.variant, text: e.feed ? `{${feedName(e.feed)}}` : e.text, link: e.linkFeed ? `{${feedName(e.linkFeed)}}` : e.link, x: r(e.x), y: r(e.y), bg: e.bg, color: e.color }
      if (e.kind === "strip") return { id, type: "thumbnail strip", layout: e.layout, x: r(e.x), y: r(e.y), size: r(e.size) }
      return { id, type: "image", x: r(e.x), y: r(e.y), width: r(e.w), height: r(e.h), radius: e.radius }
    })
}

/**
 * Re-spaces the chat's text stack (label, headline, subheading, price, button) so lines that wrap
 * never overlap: each part's height comes from its longest text across variations. The stack keeps
 * its anchor: the bottom edge for a stack in the lower half, the top edge otherwise.
 */
export function restack(els: CanvasElement[], longest: (el: Extract<CanvasElement, { kind: "text" | "button" }>) => string, ratio: number): CanvasElement[] {
  type T = Extract<CanvasElement, { kind: "text" | "button" }>
  const ORDER = ["label", "headline", "subheading", "price", "cta"]
  const stack = els.filter((e): e is T => (e.kind === "text" || e.kind === "button") && !e.hidden && ORDER.includes(roleOf(e) ?? "")).sort((a, b) => a.y - b.y)
  if (stack.length < 2) return els
  // a button far below the text (the top layout) isn't part of the stack
  const parts = stack.filter((e, i) => i === 0 || e.y - stack[i - 1].y < 25)
  const heightOf = (e: T) => {
    const size = e.size ?? (e.kind === "text" ? TEXT_STYLES.find((t) => t.variant === e.variant)!.size : BUTTON_SIZE)
    if (e.kind === "button") return size * 2.5 * ratio + 2
    const avail = e.w ?? (e.align === "center" ? 84 : 76)
    const chars = Math.max(1, longest(e).length)
    const perChar = e.variant === "label" ? 0.75 : 0.52
    const lines = Math.max(1, Math.ceil((chars * perChar * size) / avail))
    return lines * size * 1.12 * ratio + 1.6
  }
  const hs = parts.map(heightOf)
  const total = hs.reduce((a, b) => a + b, 0)
  const top0 = parts[0].y - hs[0] / 2
  const last = parts.length - 1
  const bottom0 = parts[last].y + hs[last] / 2
  // stay clear of a strip along the bottom or top
  const strip = els.find((e): e is Extract<CanvasElement, { kind: "strip" }> => e.kind === "strip" && e.layout === "horizontal")
  const floor = strip && strip.y > 50 ? strip.y - 2.5 : 97
  const ceil = strip && strip.y <= 50 ? strip.y + strip.size * ratio + 2.5 : 3
  let y = parts[0].y > 50 ? Math.min(floor, bottom0) - total : Math.max(ceil, top0)
  y = Math.max(ceil, Math.min(floor - total, y))
  const moved = new Map<string, number>()
  parts.forEach((e, i) => {
    moved.set(e.id, y + hs[i] / 2)
    y += hs[i]
  })
  return els.map((e) => (moved.has(e.id) ? ({ ...e, y: moved.get(e.id)! } as CanvasElement) : e))
}

/** an element's approximate box, in % of the frame (text measured from its characters) */
export function boxOf(e: CanvasElement, ratio: number, text?: string) {
  if (e.kind === "strip") {
    const span = 0 // the strip's length is set by its count; a generous box is enough here
    return e.layout === "horizontal" ? { l: 0, r: 100, t: e.y, b: e.y + e.size * ratio + 1 + span } : { l: e.x, r: e.x + e.size, t: 0, b: 100 }
  }
  const align = e.kind === "image" ? "center" : (e.align ?? "center")
  let w: number
  let h: number
  if (e.kind === "image") (w = e.w), (h = e.h)
  else {
    const size = e.size ?? (e.kind === "text" ? TEXT_STYLES.find((t) => t.variant === e.variant)!.size : BUTTON_SIZE)
    const chars = Math.max(1, (text ?? e.text ?? "").length)
    const perChar = e.kind === "text" && e.variant === "label" ? 0.75 : 0.55
    const raw = chars * perChar * size + (e.kind === "button" ? size * 2.4 : 0)
    const max = e.kind === "text" ? (e.w ?? 84) : 90
    const lines = Math.max(1, Math.ceil(raw / max))
    w = Math.min(raw, max)
    h = e.kind === "button" ? size * 2.5 * ratio : lines * size * 1.15 * ratio
  }
  const l = align === "left" ? e.x : align === "right" ? e.x - w : e.x - w / 2
  return { l, r: l + w, t: e.y - h / 2, b: e.y + h / 2 }
}

/**
 * Where a new element fits: the requested height if it's free, else the nearest free height
 * (searching outward), so added text and images don't land on top of what's there.
 */
export function freeY(others: CanvasElement[], el: CanvasElement, ratio: number, text: (e: CanvasElement) => string | undefined) {
  const me = boxOf(el, ratio, text(el))
  const h = me.b - me.t
  const taken = others.filter((o) => !o.hidden).map((o) => boxOf(o, ratio, text(o)))
  const clash = (y: number) => taken.find((b) => me.l < b.r && me.r > b.l && y - h / 2 - 1 < b.b && y + h / 2 + 1 > b.t)
  if (!clash(el.y)) return { y: el.y, moved: false }
  for (let d = 2; d < 96; d += 2)
    for (const y of [el.y + d, el.y - d]) if (y - h / 2 >= 3 && y + h / 2 <= 97 && !clash(y)) return { y, moved: true }
  return { y: el.y, moved: false, overlaps: true }
}
