import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * How far a generation is: 0 to 0.95 from the time it started against how long it usually takes
 * (it holds at 95% until the video actually arrives). Ticks each second.
 */
export function useGenerationProgress(startedAt: number | undefined, expectedMs: number, queued?: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return queued || !startedAt ? 0 : Math.min(0.95, Math.max(0, (now - startedAt) / expectedMs))
}

/**
 * The theme's colours as the canvas sees them (re-read when light/dark changes). The stage is dark
 * in both themes, like the video it stands in for, so the design on top (often white text) reads.
 */
function readColours(el: HTMLElement) {
  const css = getComputedStyle(el)
  const v = (name: string) => css.getPropertyValue(name).trim()
  const dark = document.documentElement.classList.contains("dark")
  return { primary: v("--primary"), fg: dark ? v("--foreground") : v("--background"), bg: dark ? v("--muted") : v("--foreground") }
}

/**
 * The generating background: on a dark stage, a field of dots rippling on a loop, and a glowing
 * tide that rises from the bottom as the video renders. Dots under the tide light up in the
 * primary colour; along its bright, wavy edge they swell and sparkle. The height of the tide is the progress, shown without a
 * number. It fills its parent and sits behind whatever is on top (the design stays editable).
 * `progress` 0 to 1; `waiting` keeps the tide low and calm.
 */
export function GeneratingField({ progress, waiting, spacing = 16, className }: { progress: number; waiting?: boolean; spacing?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  // the drawing reads this each frame, so the tide eases to new values instead of jumping
  const target = useRef(progress)
  target.current = waiting ? 0.03 : Math.max(0.03, progress)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext("2d")!
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    let w = 0
    let h = 0
    let dpr = 1
    let level = target.current
    let colours = readColours(canvas)
    const size = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(2, devicePixelRatio || 1)
      w = r.width
      h = r.height
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(canvas)
    // light/dark switches change the class on <html>
    const mo = new MutationObserver(() => (colours = readColours(canvas)))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    const t0 = performance.now()
    const paint = (now: number) => {
      const t = still ? 0 : (now - t0) / 1000
      level = still ? target.current : level + (target.current - level) * 0.05
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1
      ctx.fillStyle = colours.bg
      ctx.fillRect(0, 0, w, h)

      // the tide's edge: two slow waves across the width
      const base = h * (1 - level)
      const edge = (x: number) => base + Math.sin(x / (w * 0.16 + 1) + t * 1.3) * h * 0.022 + Math.sin(x / (w * 0.06 + 1) - t * 2) * h * 0.01
      // a soft glow filling the tide
      const glow = ctx.createLinearGradient(0, base - h * 0.05, 0, h)
      glow.addColorStop(0, "transparent")
      glow.addColorStop(0.15, colours.primary)
      glow.addColorStop(1, colours.primary)
      ctx.globalAlpha = 0.22
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, edge(x))
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fillStyle = glow
      ctx.fill()
      // the tide's bright edge, softly glowing
      ctx.globalAlpha = 0.85
      ctx.lineWidth = 1.5
      ctx.strokeStyle = colours.primary
      ctx.shadowColor = colours.primary
      ctx.shadowBlur = 10
      ctx.beginPath()
      for (let x = 0; x <= w + 8; x += 8) (x ? ctx.lineTo(x, edge(x)) : ctx.moveTo(x, edge(x)))
      ctx.stroke()
      ctx.shadowBlur = 0

      const s = spacing
      const cols = Math.ceil(w / s) + 1
      const rows = Math.ceil(h / s) + 1
      const ox = (w - (cols - 1) * s) / 2
      const oy = (h - (rows - 1) * s) / 2
      for (let j = 0; j < rows; j++) {
        const y = oy + j * s
        for (let i = 0; i < cols; i++) {
          const x = ox + i * s
          // a ripple travelling diagonally across the whole field
          const ripple = 0.5 + 0.5 * Math.sin((x + y) / (s * 5) - t * 2.2)
          const d = y - edge(x) // > 0: under the tide
          if (d > 0) {
            // lit dots add up, so they glow where they gather
            ctx.globalCompositeOperation = "lighter"
            const near = Math.max(0, 1 - d / (h * 0.14 + 1))
            const sparkle = near * (0.5 + 0.5 * Math.sin(i * 12.9898 + j * 78.233 + t * 6))
            ctx.globalAlpha = 0.3 + 0.3 * ripple + 0.4 * sparkle
            ctx.fillStyle = colours.primary
            ctx.beginPath()
            ctx.arc(x, y, s * (0.08 + 0.04 * ripple + 0.1 * sparkle), 0, Math.PI * 2)
            ctx.fill()
            ctx.globalCompositeOperation = "source-over"
          } else {
            ctx.globalAlpha = 0.1 + 0.14 * ripple
            ctx.fillStyle = colours.fg
            ctx.beginPath()
            ctx.arc(x, y, s * (0.055 + 0.035 * ripple), 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }

    let raf = 0
    let last = 0
    let tick: ReturnType<typeof setInterval> | undefined
    if (still) {
      // less motion: a still picture, redrawn each second as the tide rises
      paint(performance.now())
      tick = setInterval(() => paint(performance.now()), 1000)
    } else {
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop)
        // about 30 frames a second is plenty, and kinder to the laptop
        if (now - last < 33) return
        last = now
        paint(now)
      }
      raf = requestAnimationFrame(loop)
    }
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(tick)
      ro.disconnect()
      mo.disconnect()
    }
  }, [spacing])
  return <canvas ref={ref} aria-hidden className={cn("absolute inset-0 size-full", className)} />
}

/** The field, with the progress worked out from when the video started. */
export function GeneratingBackground({
  startedAt,
  expectedMs,
  queued,
  waiting,
  spacing,
  className,
}: {
  startedAt?: number
  expectedMs: number
  queued?: boolean
  waiting?: boolean
  spacing?: number
  className?: string
}) {
  const f = useGenerationProgress(startedAt, expectedMs, queued)
  return <GeneratingField progress={f} waiting={waiting || queued} spacing={spacing} className={className} />
}
