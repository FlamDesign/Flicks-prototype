import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

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
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((v) => v >= max) ?? max
}

/**
 * A line over the period, with the previous period dashed behind it (same axis, same measure).
 * Crosshair snaps to the nearest day; one tooltip lists both.
 */
export function TrendChart({
  current,
  previous,
  labels,
  format,
  axisFormat = format,
  height = 220,
  name,
}: {
  current: number[]
  previous?: number[]
  labels: string[]
  format: (n: number) => string
  axisFormat?: (n: number) => string
  height?: number
  name: string
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const pad = { l: 44, r: 8, t: 10, b: 24 }
  const iw = Math.max(10, w - pad.l - pad.r)
  const ih = height - pad.t - pad.b
  const max = nice(Math.max(...current, ...(previous ?? []), 0) * 1.08)
  const n = current.length
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => pad.t + ih - (v / max) * ih
  const path = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("")
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * max)
  const every = Math.ceil(n / Math.max(2, Math.floor(iw / 70)))

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - pad.l) / iw) * (n - 1))))
    setHover(i)
    setTip({
      x: e.clientX,
      y: e.clientY,
      title: labels[i],
      rows: [{ label: name, value: format(current[i]), color: "var(--series-1)" }, ...(previous ? [{ label: "Previous period", value: format(previous[i] ?? 0), color: "var(--viz-prev)", dashed: true }] : [])],
    })
  }

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={w}
        height={height}
        role="img"
        aria-label={`${name} by day`}
        className="block touch-none select-none"
        onPointerMove={move}
        onPointerLeave={() => (setHover(null), setTip(null))}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {axisFormat(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 || (i === n - 1 && (n - 1) % every >= every / 2) ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-muted-foreground text-[11px]">
              {l}
            </text>
          ) : null,
        )}
        {previous && <path d={path(previous)} fill="none" stroke="var(--viz-prev)" strokeWidth={2} strokeDasharray="4 4" strokeLinejoin="round" />}
        <path d={`${path(current)}L${x(n - 1)},${pad.t + ih}L${x(0)},${pad.t + ih}Z`} fill="var(--series-1)" opacity={0.08} />
        <path d={path(current)} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--viz-axis)" />
            {previous && <circle cx={x(hover)} cy={y(previous[hover] ?? 0)} r={4} fill="var(--card)" stroke="var(--viz-prev)" strokeWidth={2} />}
            <circle cx={x(hover)} cy={y(current[hover])} r={4.5} fill="var(--series-1)" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
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

/** A funnel: ordinal steps of one hue, each with its share of the first step and of the step before. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const first = steps[0]?.value || 1
  const last = steps[steps.length - 1]
  return (
    <div className="flex flex-col gap-3">
    <ol className="flex flex-col gap-2">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].value : s.value
        const share = s.value / first
        return (
          <li key={s.label} className="grid grid-cols-[110px_minmax(0,1fr)_96px] items-center gap-3 text-sm max-sm:grid-cols-[88px_minmax(0,1fr)_80px]">
            <span className="text-muted-foreground">{s.label}</span>
            <div className="h-7 rounded-md bg-muted">
              <div
                className="flex h-full items-center rounded-md px-2 text-xs font-medium text-primary-foreground transition-[width] duration-500"
                style={{ width: `${Math.max(2, share * 100)}%`, background: `color-mix(in oklch, var(--primary) ${100 - i * 14}%, var(--card))` }}
              >
                {share >= 0.12 && `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`}
              </div>
            </div>
            <span className="text-right tabular-nums">
              <span className="font-medium">{Math.round(s.value).toLocaleString()}</span>
              {i > 0 && <span className="block text-[11px] text-muted-foreground">↓ {(100 - (s.value / (prev || 1)) * 100).toFixed(0)}% drop</span>}
            </span>
          </li>
        )
      })}
    </ol>
    {last && (
      <p className="border-t border-foreground/5 pt-3 text-sm">
        <span className="font-semibold tabular-nums">{((last.value / first) * 100).toFixed(1)}%</span> <span className="text-muted-foreground">of loads end in a click, overall.</span>
      </p>
    )}
    </div>
  )
}

/** Which variation people switch from (rows) to (columns): one hue, darker is more. */
export function SwitchGrid({ names, matrix, total }: { names: string[]; matrix: number[][]; total: number }) {
  const [tip, setTip] = useState<Tip | null>(null)
  // each row's switches are weighted by how often people start from that variation (evenly here)
  const cells = matrix.map((row) => row.map((v) => v / names.length))
  const max = Math.max(...cells.flat(), 0.0001)
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-xs">
        <thead>
          <tr>
            <th className="text-left font-normal text-muted-foreground">From ↓ To →</th>
            {names.map((n) => (
              <th key={n} className="px-1 pb-1 text-center font-medium">
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, a) => (
            <tr key={a}>
              <th className="pr-2 text-left font-medium">{names[a]}</th>
              {row.map((v, b) => {
                const k = v / max
                const same = a === b
                return (
                  <td
                    key={b}
                    tabIndex={same ? undefined : 0}
                    onPointerMove={same ? undefined : (e) => setTip({ x: e.clientX, y: e.clientY, title: `${names[a]} → ${names[b]}`, rows: [{ label: "switches", value: Math.round(v * total).toLocaleString() }, { label: "of all switches", value: `${(v * 100).toFixed(1)}%` }] })}
                    onPointerLeave={() => setTip(null)}
                    className={cn("h-10 min-w-16 rounded-md text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring", same ? "bg-muted/40 text-muted-foreground/50" : "hover:ring-2 hover:ring-foreground/20")}
                    style={same ? undefined : { background: `color-mix(in oklch, var(--seq-hi) ${Math.round(12 + k * 78)}%, var(--seq-lo))`, color: k > 0.55 ? "var(--primary-foreground)" : "var(--foreground)" }}
                  >
                    {same ? "—" : `${(v * 100).toFixed(0)}%`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Tooltip tip={tip} />
    </div>
  )
}

/** When in the video people switch: half-second columns over the video's length. */
export function MomentChart({ bins, seconds, total, active, onActive }: { bins: number[]; seconds: number; total: number; active?: number | null; onActive?: (i: number | null) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [tip, setTip] = useState<Tip | null>(null)
  const [hoverRaw, setHoverRaw] = useState<number | null>(null)
  const hover = active !== undefined ? active : hoverRaw
  const setHover = (i: number | null) => (setHoverRaw(i), onActive?.(i))
  const h = 140
  const pad = { l: 4, r: 4, t: 8, b: 22 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const max = Math.max(...bins) || 1
  const bw = iw / bins.length
  const peak = bins.indexOf(max)
  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={h} role="img" aria-label="Switches by moment in the video" className="block">
        <line x1={pad.l} x2={w - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--viz-axis)" />
        {bins.map((b, i) => {
          const bh = (b / max) * ih
          return (
            <g key={i}>
              <rect
                x={pad.l + i * bw + 1}
                y={pad.t + ih - bh}
                width={Math.max(1, bw - 2)}
                height={bh}
                rx={Math.min(4, bw / 3)}
                fill={i === peak ? "var(--series-2)" : "var(--series-1)"}
                opacity={hover === null || hover === i ? 1 : 0.55}
              />
              <rect
                x={pad.l + i * bw}
                y={pad.t}
                width={bw}
                height={ih}
                fill="transparent"
                onPointerMove={(e) => (setHover(i), setTip({ x: e.clientX, y: e.clientY, title: `${(i / 2).toFixed(1)}–${((i + 1) / 2).toFixed(1)}s`, rows: [{ label: "switches", value: Math.round(b * total).toLocaleString() }, { label: "of switches", value: `${(b * 100).toFixed(1)}%` }] }))}
                onPointerLeave={() => (setHover(null), setTip(null))}
              />
            </g>
          )
        })}
        {Array.from({ length: seconds + 1 }, (_, s) => (
          <text key={s} x={pad.l + s * 2 * bw} y={h - 6} textAnchor={s === 0 ? "start" : s === seconds ? "end" : "middle"} className="fill-muted-foreground text-[11px] tabular-nums">
            {s}s
          </text>
        ))}
      </svg>
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
 * Lines over days on one axis (one measure). The crosshair snaps to the nearest day and one tooltip
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
    setTip({ x: e.clientX, y: e.clientY, title: labels[i], rows: lines.map((l) => ({ label: l.name, value: format(l.values[i] ?? 0), color: l.color, dashed: l.dashed })) })
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
          i % every === 0 || (i === n - 1 && (n - 1) % every >= every / 2) ? (
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
        {solid.length === 1 && solid[0].area !== false && <path d={`${path(solid[0].values)}L${x(n - 1)},${pad.t + ih}L${x(0)},${pad.t + ih}Z`} fill={solid[0].color} opacity={0.08} />}
        {solid.map((l) => (
          <path key={l.name} d={path(l.values)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--viz-axis)" />
            {lines.map((l) => (
              <circle key={l.name} cx={x(hover)} cy={y(l.values[hover] ?? 0)} r={l.dashed ? 3.5 : 4.5} fill={l.dashed ? "var(--card)" : l.color} stroke={l.dashed ? l.color : "var(--card)"} strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}
