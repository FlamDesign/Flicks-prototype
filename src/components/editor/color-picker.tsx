import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ColorPickerIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** Checkerboard shown behind anything with transparency. */
export const CHECKER = "repeating-conic-gradient(#d4d4d8 0 25%, #fff 0 50%) 50% / 8px 8px"

/** A swatch background that shows transparency over the checkerboard. */
export const swatchBg = (c: string) => `linear-gradient(${c}, ${c}), ${CHECKER}`

type HSVA = { h: number; s: number; v: number; a: number } // h 0–360, s/v/a 0–1

/**
 * Colour picker panel: saturation/brightness area, hue and transparency sliders, hex and opacity fields.
 * Values are hex strings: #rrggbb, or #rrggbbaa when partly transparent. "transparent" is read as 0% opacity.
 */
/**
 * Open state for a popover holding a ColorPanel: it steps out of the way while the eyedropper
 * is picking (so you can see what you're sampling) and comes back once a colour is picked.
 */
export function useColorPopover() {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const pickingRef = useRef(false)
  const onPicking = (p: boolean) => {
    setPicking(p)
    if (p) pickingRef.current = true
    else {
      setOpen(true)
      // the click that picked can still reach the popover as an outside click
      setTimeout(() => (pickingRef.current = false), 150)
    }
  }
  const onOpenChange = (o: boolean) => {
    if (!o && pickingRef.current) return
    setOpen(o)
  }
  return { open, onOpenChange, picking, onPicking }
}

export function ColorPanel({ value, onChange, onPicking }: { value: string; onChange: (v: string) => void; onPicking?: (active: boolean) => void }) {
  const [c, setC] = useState<HSVA>(() => parse(value))
  // follow outside changes (swatches, another element) without losing the hue on greys
  useEffect(() => {
    if (toHex(c) !== normalise(value)) setC((prev) => ({ ...parse(value), ...(parse(value).s === 0 ? { h: prev.h } : {}) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const set = (patch: Partial<HSVA>) => {
    const next = { ...c, ...patch }
    setC(next)
    onChange(toHex(next))
  }
  const rgb = hsvToRgb(c)
  const solid = `rgb(${rgb.join(" ")})`
  const [hex, setHex] = useState(toHex(c).slice(1, 7))
  useEffect(() => setHex(toHex(c).slice(1, 7)), [c])

  return (
    <div className="flex flex-col gap-3">
      {/* Saturation / brightness */}
      <Area
        label="Saturation and brightness"
        x={c.s}
        y={1 - c.v}
        onChange={(x, y) => set({ s: x, v: 1 - y })}
        className="h-36 rounded-lg"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${c.h} 100% 50%)`,
        }}
        thumb={solid}
      />
      {/* Hue */}
      <Track
        label="Hue"
        value={c.h / 360}
        onChange={(t) => set({ h: t * 360 })}
        background="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
        thumb={`hsl(${c.h} 100% 50%)`}
      />
      {/* Transparency: fully transparent to the actual colour */}
      <Track
        label="Opacity"
        value={c.a}
        onChange={(t) => set({ a: t })}
        background={`linear-gradient(to right, rgb(${rgb.join(" ")} / 0), ${solid}), ${CHECKER}`}
        thumb={swatchBg(`rgb(${rgb.join(" ")} / ${c.a})`)}
      />
      {/* Eyedropper + hex + opacity fields */}
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Pick colour from canvas"
              className="size-8 shrink-0 rounded-lg"
              onClick={async () => {
                onPicking?.(true)
                document.body.dataset.picking = "1"
                const picked = await pickFromScreen()
                if (picked) set({ ...parse(picked), a: c.a || 1 })
                onPicking?.(false)
                // the picking click's pointerup/click still follow
                setTimeout(() => delete document.body.dataset.picking, 300)
              }}
            >
              <HugeiconsIcon icon={ColorPickerIcon} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pick from canvas</TooltipContent>
        </Tooltip>
        <label className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 text-sm ring-1 ring-foreground/10 focus-within:ring-2 focus-within:ring-ring/50">
          <span className="size-4 shrink-0 rounded-[4px] ring-1 ring-foreground/15" style={{ background: swatchBg(toHex(c)) }} />
          <span className="text-muted-foreground">#</span>
          <input
            aria-label="Hex colour"
            value={hex}
            maxLength={6}
            spellCheck={false}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9a-f]/gi, "")
              setHex(v)
              if (v.length === 6 || v.length === 3) set({ ...parse(`#${v}`), a: c.a })
            }}
            className="w-full min-w-0 bg-transparent font-mono text-[13px] uppercase outline-none"
          />
        </label>
        <label className="flex h-8 w-[4.5rem] items-center gap-0.5 rounded-lg px-2 text-sm ring-1 ring-foreground/10 focus-within:ring-2 focus-within:ring-ring/50">
          <input
            aria-label="Opacity percent"
            inputMode="numeric"
            value={Math.round(c.a * 100)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""))
              if (!Number.isNaN(n)) set({ a: Math.min(100, n) / 100 })
            }}
            className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
          />
          <span className="text-muted-foreground">%</span>
        </label>
      </div>
    </div>
  )
}

/* ---------- pieces ---------- */

function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = ref.current!
    el.setPointerCapture(e.pointerId)
    el.focus()
    const at = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      onMove(clamp01((ev.clientX - r.left) / r.width), clamp01((ev.clientY - r.top) / r.height))
    }
    at(e)
    const move = (ev: PointerEvent) => at(ev)
    const up = () => (el.removeEventListener("pointermove", move), el.removeEventListener("pointerup", up))
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
  }
  return { ref, onPointerDown }
}

function Area({
  label,
  x,
  y,
  onChange,
  className,
  style,
  thumb,
}: {
  label: string
  x: number
  y: number
  onChange: (x: number, y: number) => void
  className?: string
  style?: React.CSSProperties
  thumb: string
}) {
  const drag = useDrag(onChange)
  const step = 0.02
  return (
    <div
      {...drag}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={`Saturation ${Math.round(x * 100)}%, brightness ${Math.round((1 - y) * 100)}%`}
      onKeyDown={(e) => {
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
        if (d) (e.preventDefault(), onChange(clamp01(x + d[0]), clamp01(y + d[1])))
      }}
      className={cn("relative cursor-crosshair touch-none outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring", className)}
      style={style}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.2),0_1px_3px_rgb(0_0_0/0.3)]"
        style={{ left: `${x * 100}%`, top: `${y * 100}%`, background: thumb }}
      />
    </div>
  )
}

/** A thick slider track whose background shows what the value means. */
function Track({ label, value, onChange, background, thumb }: { label: string; value: number; onChange: (v: number) => void; background: string; thumb: string }) {
  const drag = useDrag((x) => onChange(x))
  return (
    <div
      {...drag}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onKeyDown={(e) => {
        const d = { ArrowLeft: -0.01, ArrowDown: -0.01, ArrowRight: 0.01, ArrowUp: 0.01 }[e.key]
        if (d) (e.preventDefault(), onChange(clamp01(value + d)))
      }}
      className="relative mx-2 h-3.5 cursor-pointer touch-none rounded-full outline-none focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-ring"
    >
      <span aria-hidden className="absolute -inset-x-2 inset-y-0 rounded-full ring-1 ring-foreground/10" style={{ background }} />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.2),0_1px_3px_rgb(0_0_0/0.3)]"
        style={{ left: `${value * 100}%`, background: thumb }}
      />
    </div>
  )
}

/* ---------- colour maths ---------- */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function normalise(v: string) {
  return toHex(parse(v))
}

export function parse(v: string): HSVA {
  if (!v || v === "transparent") return { h: 0, s: 0, v: 1, a: 0 }
  let hex = v.replace("#", "")
  if (hex.length === 3 || hex.length === 4) hex = [...hex].map((ch) => ch + ch).join("")
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16)
  const [r, g, b] = [n(0), n(2), n(4)].map((x) => (Number.isNaN(x) ? 255 : x))
  const a = hex.length === 8 ? n(6) / 255 : 1
  return { ...rgbToHsv(r, g, b), a }
}

export function toHex({ h, s, v, a }: HSVA) {
  const hx = (x: number) => Math.round(x).toString(16).padStart(2, "0")
  const [r, g, b] = hsvToRgb({ h, s, v, a })
  return `#${hx(r)}${hx(g)}${hx(b)}${a < 1 ? hx(a * 255) : ""}`
}

function hsvToRgb({ h, s, v }: HSVA): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
  }
  return [f(5), f(3), f(1)]
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max }
}

/* ---------- eyedropper ---------- */

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }

/**
 * Picks a colour from anywhere on screen with the browser eyedropper.
 * Where that isn't supported, the next click on the canvas samples the video frame under the pointer.
 */
async function pickFromScreen(): Promise<string | null> {
  const ED = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
  if (ED) {
    try {
      return toHexString((await new ED().open()).sRGBHex)
    } catch {
      return null // cancelled with Esc
    }
  }
  return new Promise((resolve) => {
    const prev = document.body.style.cursor
    document.body.style.cursor = "crosshair"
    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      document.removeEventListener("pointerdown", onDown, true)
      document.body.style.cursor = prev
      const video = document.querySelector<HTMLVideoElement>("[data-frame] video")
      if (!video || !video.videoWidth) return resolve(null)
      const r = video.getBoundingClientRect()
      // the video is object-fit: cover
      const k = Math.max(r.width / video.videoWidth, r.height / video.videoHeight)
      const sx = (e.clientX - r.left - (r.width - video.videoWidth * k) / 2) / k
      const sy = (e.clientY - r.top - (r.height - video.videoHeight * k) / 2) / k
      if (sx < 0 || sy < 0 || sx >= video.videoWidth || sy >= video.videoHeight) return resolve(null)
      try {
        const cv = document.createElement("canvas")
        cv.width = cv.height = 1
        const ctx = cv.getContext("2d")!
        ctx.drawImage(video, sx, sy, 1, 1, 0, 0, 1, 1)
        const [red, g, b] = ctx.getImageData(0, 0, 1, 1).data
        resolve(toHexString(`rgb(${red}, ${g}, ${b})`))
      } catch {
        resolve(null) // the frame can't be read (e.g. cross-origin video)
      }
    }
    document.addEventListener("pointerdown", onDown, true)
  })
}

function toHexString(v: string) {
  if (v.startsWith("#")) return v
  const m = v.match(/\d+/g)
  if (!m) return null
  return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("")
}
