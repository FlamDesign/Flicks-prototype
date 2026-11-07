import { useId, useLayoutEffect, useRef, useState } from "react"
import { isGradient, type CanvasElement, type Paint } from "@/components/editor/elements"

type ShapeEl = Extract<CanvasElement, { kind: "shape" }>

/** points around an ellipse: n tips, every other one pulled in for stars */
function ring(w: number, h: number, n: number, inner?: number) {
  const cx = w / 2
  const cy = h / 2
  const count = inner ? n * 2 : n
  return Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count
    const k = inner && i % 2 ? inner : 1
    return `${cx + Math.cos(a) * (w / 2) * k},${cy + Math.sin(a) * (h / 2) * k}`
  }).join(" ")
}

/** the shape's outline in the box's own pixels, so strokes keep their width whatever the box's shape */
function outline(el: ShapeEl, w: number, h: number, sw: number) {
  // inset by half the stroke so it isn't cut off at the edges
  const i = sw / 2
  const W = Math.max(1, w - sw)
  const H = Math.max(1, h - sw)
  const at = (pts: string) => pts.split(" ").map((p) => p.split(",").map(Number)).map(([x, y]) => `${x + i},${y + i}`).join(" ")
  switch (el.shape) {
    case "ellipse":
      return <ellipse cx={w / 2} cy={h / 2} rx={W / 2} ry={H / 2} />
    case "triangle":
      return <polygon points={`${w / 2},${i} ${w - i},${h - i} ${i},${h - i}`} />
    case "star": {
      const n = Math.max(3, el.points ?? 5)
      return <polygon points={at(ring(W, H, n, n <= 4 ? 0.4 : n === 5 ? 0.45 : n === 6 ? 0.55 : 0.62))} />
    }
    case "play":
      return <ellipse cx={w / 2} cy={h / 2} rx={W / 2} ry={H / 2} />
    case "polygon":
      return <polygon points={at(ring(W, H, Math.max(3, el.points ?? 6)))} />
    case "heart": {
      const x = (f: number) => i + f * W
      const y = (f: number) => i + f * H
      return <path d={`M${x(0.5)},${y(0.28)} C${x(0.5)},${y(0.08)} ${x(0.12)},${y(-0.02)} ${x(0.03)},${y(0.25)} C${x(-0.06)},${y(0.55)} ${x(0.32)},${y(0.78)} ${x(0.5)},${y(1)} C${x(0.68)},${y(0.78)} ${x(1.06)},${y(0.55)} ${x(0.97)},${y(0.25)} C${x(0.88)},${y(-0.02)} ${x(0.5)},${y(0.08)} ${x(0.5)},${y(0.28)} Z`} />
    }
    case "path":
      // drawn in a 100×100 box, stretched to the shape's own box; the line keeps its width
      return <path d={el.d ?? ""} transform={`translate(${i} ${i}) scale(${W / 100} ${H / 100})`} vectorEffect="non-scaling-stroke" />
    case "line":
      return <line x1={i} y1={h / 2} x2={w - i} y2={h / 2} />
    case "arrow": {
      const head = Math.min(h * 0.5, W * 0.3, Math.max(sw * 3, 8))
      return (
        <>
          <line x1={i} y1={h / 2} x2={w - i - sw / 2} y2={h / 2} />
          <polyline points={`${w - i - head},${h / 2 - head} ${w - i},${h / 2} ${w - i - head},${h / 2 + head}`} />
        </>
      )
    }
    default: {
      const r = (Math.min(W, H) / 2) * ((el.radius ?? 0) / 100)
      return <rect x={i} y={i} width={W} height={H} rx={r} ry={r} />
    }
  }
}

/** a gradient as SVG paint: its definition and the url that points at it */
function gradient(p: Exclude<Paint, string>, id: string) {
  const stops = [...p.stops].sort((a, b) => a.at - b.at).map((s, k) => <stop key={k} offset={`${s.at}%`} stopColor={s.color} />)
  const def =
    p.type === "radial" ? (
      <radialGradient id={id} cx="50%" cy="50%" r="50%">
        {stops}
      </radialGradient>
    ) : (
      // angle as in CSS: 0 runs bottom to top, 90 left to right
      <linearGradient id={id} gradientUnits="objectBoundingBox" gradientTransform={`rotate(${(p.angle ?? 180) - 90} 0.5 0.5)`}>
        {stops}
      </linearGradient>
    )
  return { def, url: `url(#${id})` }
}

/**
 * A shape element, drawn as SVG in its box's real pixels. Fill and stroke take a color or (from the
 * chat) a gradient; the stroke width is in px at 1080 wide, like the other elements' borders.
 */
export function ShapeView({ el }: { el: ShapeEl }) {
  const box = useRef<HTMLSpanElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0, frame: 1080 })
  useLayoutEffect(() => {
    const node = box.current
    if (!node) return
    const read = () => {
      const frame = node.closest<HTMLElement>("[data-frame]")?.offsetWidth || (node.closest<HTMLElement>("[data-el]")?.parentElement?.offsetWidth ?? 1080)
      setSize({ w: node.offsetWidth, h: node.offsetHeight, frame })
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])
  const uid = useId().replace(/:/g, "")
  const sw = (el.strokeWidth * size.frame) / 1080
  const open = el.shape === "line" || el.shape === "arrow"
  const paint = (p: Paint, key: string) => (isGradient(p) ? gradient(p, `${uid}-${key}`) : { def: null, url: !p || p === "transparent" ? "none" : p })
  const fill = open ? { def: null, url: "none" } : paint(el.fill, "f")
  const stroke = el.strokeWidth > 0 ? paint(el.stroke, "s") : { def: null, url: "none" }
  return (
    <span ref={box} className="block h-full w-full" style={{ opacity: el.opacity ?? 1 }}>
      {size.w > 0 && (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} overflow="visible" className="block" aria-hidden>
          {(fill.def || stroke.def) && (
            <defs>
              {fill.def}
              {stroke.def}
            </defs>
          )}
          {/* a picture fills the shape over its color (cover or fit, centered) */}
          {el.fillImage && !open && (
            <defs>
              <pattern id={`${uid}-img`} patternUnits="userSpaceOnUse" width={size.w} height={size.h}>
                <rect width={size.w} height={size.h} fill={isGradient(el.fill) ? `url(#${uid}-f)` : el.fill && el.fill !== "transparent" ? el.fill : "none"} />
                <image href={el.fillImage} width={size.w} height={size.h} preserveAspectRatio={el.fillFit === "contain" ? "xMidYMid meet" : "xMidYMid slice"} />
              </pattern>
            </defs>
          )}
          <g fill={el.fillImage && !open ? `url(#${uid}-img)` : fill.url} stroke={stroke.url} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
            {outline(el, size.w, size.h, open ? 0 : sw)}
          </g>
          {/* the play button's triangle, white on the circle */}
          {el.shape === "play" && (
            <polygon
              fill="#ffffff"
              points={(() => {
                const r = Math.min(size.w, size.h) * 0.22
                const cx = size.w / 2 + r * 0.18
                const cy = size.h / 2
                return `${cx - r * 0.75},${cy - r} ${cx + r},${cy} ${cx - r * 0.75},${cy + r}`
              })()}
              strokeLinejoin="round"
              stroke="#ffffff"
              strokeWidth={Math.min(size.w, size.h) * 0.03}
            />
          )}
        </svg>
      )}
    </span>
  )
}
