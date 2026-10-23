import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

/** Width of a box, kept current. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** One floating tooltip: values lead, labels follow; rows keyed with a short line of the series colour. */
type Tip = { x: number; y: number; title: string; rows: { label: string; value: string; color?: string; dashed?: boolean }[] }
function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null
  const left = Math.min(window.innerWidth - 220, tip.x + 14)
  return createPortal(
    <div role="tooltip" className="pointer-events-none fixed z-50 min-w-36 rounded-xl bg-popover px-3 py-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10" style={{ left, top: tip.y + 14 }}>
      <p className="mb-1 text-xs text-muted-foreground">{tip.title}</p>
      {tip.rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-xs">
          {r.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color, opacity: r.dashed ? 0.7 : 1 }} />}
          <span className="font-semibold tabular-nums">{r.value}</span>
          <span className="text-muted-foreground">{r.label}</span>
        </p>
      ))}
    </div>,
    document.body,
  )
}

const nice = (max: number) => {
  if (max <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(max))
  // tops whose quarters read cleanly (25, 50, 75 / 1.5, 3, 4.5 …)
  return [1, 2, 4, 6, 8, 10].map((m) => m * p).find((v) => v >= max) ?? max
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          {i.line ? (
            <svg width="16" height="4" aria-hidden>
              <line x1="0" x2="16" y1="2" y2="2" stroke={i.color} strokeWidth="2" strokeDasharray={i.dashed ? "4 3" : undefined} />
            </svg>
          ) : (
            <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Horizontal bars, labelled directly: name on the left, value on the right. Hover shows the detail. */
export function BarList({
  items,
  format,
  color = "var(--series-1)",
  detail,
}: {
  items: { label: string; value: number; color?: string; note?: string }[]
  format: (n: number) => string
  color?: string
  detail?: (i: number) => { label: string; value: string }[]
}) {
  const [tip, setTip] = useState<Tip | null>(null)
  const max = Math.max(...items.map((i) => i.value), 0) || 1
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li
          key={it.label}
          tabIndex={detail ? 0 : undefined}
          className="group flex flex-col gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerMove={detail ? (e) => setTip({ x: e.clientX, y: e.clientY, title: it.label, rows: detail(i) }) : undefined}
          onPointerLeave={() => setTip(null)}
        >
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{it.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {format(it.value)}
              {it.note && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{it.note}</span>}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div className="h-full rounded-full transition-[width,filter] duration-500 group-hover:brightness-110" style={{ width: `${Math.max(1.5, (it.value / max) * 100)}%`, background: it.color ?? color }} />
          </div>
        </li>
      ))}
      <Tooltip tip={tip} />
    </ul>
  )
}

/** A hollow pie: each slice a share of the total, the total in the middle, and a legend with values and shares. Hover shows the detail. */
export function Donut({
  items,
  format,
  centerLabel,
  detail,
}: {
  items: { label: string; value: number; color: string }[]
  format: (n: number) => string
  centerLabel: string
  detail?: (i: number) => { label: string; value: string }[]
}) {
  const [tip, setTip] = useState<Tip | null>(null)
  const [hot, setHot] = useState<number | null>(null)
  const total = items.reduce((a, i) => a + i.value, 0) || 1
  const r = 42
  const c = 2 * Math.PI * r
  const gap = items.length > 1 ? 1.2 : 0
  let at = 0
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`
  const enter = (i: number) => (e: React.PointerEvent) => {
    setHot(i)
    if (detail) setTip({ x: e.clientX, y: e.clientY, title: items[i].label, rows: detail(i) })
  }
  const leave = () => {
    setHot(null)
    setTip(null)
  }
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative size-44 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={items.map((i) => `${i.label} ${pct(i.value)}`).join(", ")}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
          {items.map((it, i) => {
            const len = (it.value / total) * c
            const dash = Math.max(0.5, len - gap)
            const el = (
              <circle
                key={it.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth={hot === i ? 14 : 12}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-at}
                className="cursor-default transition-[stroke-width,opacity] duration-200"
                style={{ opacity: hot === null || hot === i ? 1 : 0.45 }}
                onPointerMove={enter(i)}
                onPointerLeave={leave}
              />
            )
            at += len
            return el
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums tracking-tight">{format(hot === null ? total : items[hot].value)}</span>
          <span className="text-xs text-muted-foreground">{hot === null ? centerLabel : items[hot].label}</span>
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-2">
        {items.map((it, i) => (
          <li key={it.label} className={"flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition-colors " + (hot === i ? "bg-muted" : "")} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)}>
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: it.color }} />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            <span className="font-medium tabular-nums">{format(it.value)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pct(it.value)}</span>
          </li>
        ))}
      </ul>
      <Tooltip tip={tip} />
    </div>
  )
}

/** A tiny trend line for table rows. */
export function Spark({ values, className, color = "var(--series-1)" }: { values: number[]; className?: string; color?: string }) {
  const w = 72
  const h = 22
  const max = Math.max(...values, 0) || 1
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / Math.max(1, values.length - 1)) * w).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join("")
  return (
    <svg width={w} height={h} aria-hidden className={className}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}

export type Line = { name: string; color: string; values: number[]; dashed?: boolean; area?: boolean }

/**
 * Lines over hours or days on one axis (one measure). Lines may stop early (the rest of today, of this week). The crosshair snaps to the nearest point and one tooltip
 * lists every line, values first. Dashed lines are for comparisons (the previous period).
 */
export function LinesChart({ lines, labels, format, axisFormat = format, height = 240, label }: { lines: Line[]; labels: string[]; format: (n: number) => string; axisFormat?: (n: number) => string; height?: number; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const pad = { l: 48, r: 8, t: 10, b: 24 }
  const iw = Math.max(10, w - pad.l - pad.r)
  const ih = height - pad.t - pad.b
  const max = nice(Math.max(0, ...lines.flatMap((l) => l.values)) * 1.08)
  const n = labels.length
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => pad.t + ih - (v / max) * ih
  const path = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("")
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * max)
  const every = Math.ceil(n / Math.max(2, Math.floor(iw / 70)))
  const solid = lines.filter((l) => !l.dashed)

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - pad.l) / iw) * (n - 1))))
    setHover(i)
    setTip({ x: e.clientX, y: e.clientY, title: labels[i], rows: lines.filter((l) => l.values[i] !== undefined).map((l) => ({ label: l.name, value: format(l.values[i]), color: l.color, dashed: l.dashed })) })
  }

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label={label} className="block touch-none select-none" onPointerMove={move} onPointerLeave={() => (setHover(null), setTip(null))}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {axisFormat(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 || (i === n - 1 && (n - 1) % every >= Math.max(2, every * 0.8)) ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-muted-foreground text-[11px]">
              {l}
            </text>
          ) : null,
        )}
        {lines
          .filter((l) => l.dashed)
          .map((l) => (
            <path key={l.name} d={path(l.values)} fill="none" stroke={l.color} strokeWidth={2} strokeDasharray="4 4" strokeLinejoin="round" />
          ))}
        {solid.length === 1 && solid[0].area !== false && <path d={`${path(solid[0].values)}L${x(solid[0].values.length - 1)},${pad.t + ih}L${x(0)},${pad.t + ih}Z`} fill={solid[0].color} opacity={0.08} />}
        {solid.map((l) => (
          <path key={l.name} d={path(l.values)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--viz-axis)" />
            {lines.filter((l) => l.values[hover] !== undefined).map((l) => (
              <circle key={l.name} cx={x(hover)} cy={y(l.values[hover] ?? 0)} r={l.dashed ? 3.5 : 4.5} fill={l.dashed ? "var(--card)" : l.color} stroke={l.dashed ? l.color : "var(--card)"} strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}
