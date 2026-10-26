import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import softPink from "@/assets/flicks/escalator/soft-pink.mp4"
import softPinkWebm from "@/assets/flicks/escalator/soft-pink.webm"
import softPinkPoster from "@/assets/flicks/escalator/soft-pink-poster.webp"
import softPinkThumb from "@/assets/flicks/escalator/soft-pink-thumb.webp"
import street from "@/assets/flicks/escalator/street.mp4"
import streetWebm from "@/assets/flicks/escalator/street.webm"
import streetPoster from "@/assets/flicks/escalator/street-poster.webp"
import streetThumb from "@/assets/flicks/escalator/street-thumb.webp"
import office from "@/assets/flicks/escalator/office.mp4"
import officeWebm from "@/assets/flicks/escalator/office.webm"
import officePoster from "@/assets/flicks/escalator/office-poster.webp"
import officeThumb from "@/assets/flicks/escalator/office-thumb.webp"
import court from "@/assets/flicks/escalator/court.mp4"
import courtWebm from "@/assets/flicks/escalator/court.webm"
import courtPoster from "@/assets/flicks/escalator/court-poster.webp"
import courtThumb from "@/assets/flicks/escalator/court-thumb.webp"
import refModel from "@/assets/intro/ref-model.webp"
import refBag from "@/assets/intro/ref-bag.webp"
import refShades from "@/assets/intro/ref-shades.webp"

/**
 * "How Flicks work": a feature intro popup.
 * Four steps, each with its own short scene built from the escalator Flick (real videos and stills):
 * one video → variations → one Flick → ads, website or link.
 * Steps auto-advance until the viewer takes over. Theme tokens only, so it follows light and dark mode.
 */

const STEPS = [
  { title: "Start with one video", body: "Describe your idea and add reference images. We generate your first video from them.", ms: 9000 },
  { title: "Create variations", body: "Change the person, outfit, product or scene. Everything else remains the same.", ms: 8000 },
  { title: "Export as one Flick", body: "All variations are exported in one Flick. Viewers tap to switch between them.", ms: 8500 },
  { title: "Run it anywhere", body: "Serve it in ads, add it to your website, or share it as a link.", ms: 10000 },
] as const

const LOOKS = [
  { name: "Original", mp4: softPink, webm: softPinkWebm, poster: softPinkPoster, thumb: softPinkThumb },
  { name: "Streetwear", mp4: street, webm: streetWebm, poster: streetPoster, thumb: streetThumb },
  { name: "Office", mp4: office, webm: officeWebm, poster: officePoster, thumb: officeThumb },
  { name: "Tennis", mp4: court, webm: courtWebm, poster: courtPoster, thumb: courtThumb },
]

/* ---------- layout: a 520 × 280 stage, sized in container units so it scales as one ---------- */

const u = (n: number) => `${(n / 5.2).toFixed(3)}cqw`
const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ position: "absolute", left: u(x), top: u(y), width: u(w), height: u(h) })

const EASE = "cubic-bezier(.2,.7,.2,1)"
const SPRING = "cubic-bezier(.34,1.45,.5,1)"
const anim = (name: string, dur: number, delay = 0, ease = EASE, fill = "both") => `${name} ${dur}s ${ease} ${delay}s ${fill}`
const a = (name: string, dur: number, delay = 0, ease = EASE): CSSProperties => ({ animation: anim(name, dur, delay, ease) })

const CSS = `
@keyframes hfw-up { from { opacity: 0; transform: translateY(${u(10)}) } to { opacity: 1; transform: none } }
@keyframes hfw-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes hfw-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes hfw-pop { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: none } }
@keyframes hfw-in { from { opacity: 0; transform: scale(.92) } to { opacity: 1; transform: none } }
@keyframes hfw-on { from { opacity: 0 } to { opacity: 1 } }
@keyframes hfw-off { from { opacity: 1 } to { opacity: 0 } }
@keyframes hfw-press { 0%,100% { transform: scale(1) } 50% { transform: scale(.9) } }
@keyframes hfw-shimmer { from { transform: translateX(-100%) } to { transform: translateX(100%) } }
@keyframes hfw-kb { from { transform: scale(1) } to { transform: scale(1.08) } }
@keyframes hfw-fan { from { opacity: 0; transform: translateX(var(--fx)) scale(.9) } 25% { opacity: 1 } to { opacity: 1; transform: none } }
@keyframes hfw-merge { from { transform: translate(var(--fx), var(--fy)) scale(var(--fs)) } to { transform: none } }
@keyframes hfw-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
@keyframes hfw-ripple { from { opacity: .8; transform: scale(.3) } to { opacity: 0; transform: scale(2) } }
@keyframes hfw-c1 { 0%,24.9% { opacity: 1 } 25%,100% { opacity: 0 } }
@keyframes hfw-c2 { 0%,24.9% { opacity: 0 } 25%,49.9% { opacity: 1 } 50%,100% { opacity: 0 } }
@keyframes hfw-c3 { 0%,49.9% { opacity: 0 } 50%,74.9% { opacity: 1 } 75%,100% { opacity: 0 } }
@keyframes hfw-c4 { 0%,74.9% { opacity: 0 } 75%,100% { opacity: 1 } }
@keyframes hfw-cursor {
  0%,32% { opacity: 0; transform: translate(${u(470)}, ${u(250)}) }
  38% { opacity: 1; transform: translate(${u(470)}, ${u(250)}) }
  50% { transform: translate(${u(378)}, ${u(110)}) scale(1) }
  53% { transform: translate(${u(378)}, ${u(110)}) scale(.85) }
  56% { transform: translate(${u(378)}, ${u(110)}) scale(1) }
  70% { transform: translate(${u(378)}, ${u(148)}) scale(1) }
  73% { transform: translate(${u(378)}, ${u(148)}) scale(.85) }
  76%,100% { opacity: 1; transform: translate(${u(378)}, ${u(148)}) scale(1) }
}
@media (prefers-reduced-motion: reduce) {
  .hfw *, .hfw *::before { animation-duration: .01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
}
`

/* ---------- pieces ---------- */

/** A video tile: a real looping clip, or a still with a slow push-in. */
function Clip({ look, video, round = 12, className, style }: { look: (typeof LOOKS)[number]; video?: boolean; round?: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("overflow-hidden bg-muted", className)} style={{ borderRadius: u(round), ...style }}>
      {video ? (
        <video autoPlay muted loop playsInline poster={look.poster} className="size-full object-cover">
          <source src={look.webm} type="video/webm" />
          <source src={look.mp4} type="video/mp4" />
        </video>
      ) : (
        <img src={look.poster} alt="" className="size-full object-cover" style={{ animation: "hfw-kb 6s ease-out both" }} />
      )}
    </div>
  )
}

/** A label pill centred on x. `style` animates the pill itself, so centring never fights the animation. */
function Chip({ cx, y, children, className, style }: { cx: number; y: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className="absolute -translate-x-1/2" style={{ left: u(cx), top: u(y) }}>
      <div
        className={cn("flex items-center justify-center gap-[0.4em] whitespace-nowrap rounded-full bg-background/85 font-medium text-foreground/80 shadow-[0_4px_12px_-6px_rgb(0_0_0/0.2)] ring-1 ring-foreground/[0.07] backdrop-blur", className)}
        style={{ fontSize: u(11), height: u(22), paddingInline: u(10), ...style }}
      >
        {children}
      </div>
    </div>
  )
}

const Sparkle = ({ className, style }: { className?: string; style?: CSSProperties }) => (
  <svg viewBox="0 0 16 16" className={className} style={style} aria-hidden>
    <path d="M8 0.5l1.9 5.6 5.6 1.9-5.6 1.9L8 15.5 6.1 9.9 0.5 8l5.6-1.9z" fill="currentColor" />
  </svg>
)

/** The Flicks player chrome around a stack of looks: one is shown, the rail switches between them. */
function Rail({ x, y, size, gap, active, style }: { x: number; y: number; size: number; gap: number; active: (i: number) => CSSProperties; style?: CSSProperties }) {
  return (
    <div style={style}>
      {LOOKS.map((l, i) => (
        <div key={l.name} style={{ ...box(x, y + i * (size + gap), size, size) }}>
          <img src={l.thumb} alt="" className="size-full object-cover shadow-md" style={{ borderRadius: u(size * 0.28) }} />
          <div className="absolute inset-[-2px] border-2 border-white shadow" style={{ borderRadius: u(size * 0.32), ...active(i) }} />
        </div>
      ))}
    </div>
  )
}

/* ---------- scenes ---------- */

const PROMPT = "A model on an escalator sipping iced coffee, her bag and heart shades on the steps below".split(" ")

function SceneVideo() {
  const typed = 0.35
  const per = 0.07
  const refsAt = typed + PROMPT.length * per + 0.15
  const goAt = refsAt + 0.75
  const vidAt = goAt + 0.9
  return (
    <>
      {/* composer */}
      <div className="rounded-[4cqw] bg-card ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_28px_-14px_rgb(0_0_0/0.22)]" style={{ ...box(18, 40, 270, 168), ...a("hfw-up", 0.5) }}>
        <p className="absolute leading-snug text-foreground" style={{ left: u(16), top: u(14), right: u(16), fontSize: u(12.5) }}>
          {PROMPT.map((w, i) => (
            <span key={i} style={a("hfw-fade", 0.12, typed + i * per, "linear")}>
              {w}{" "}
            </span>
          ))}
        </p>
        {/* reference images */}
        <div className="absolute flex items-center" style={{ left: u(14), bottom: u(14), gap: u(6) }}>
          <div className="flex items-center justify-center rounded-[1.6cqw] border border-dashed text-muted-foreground" style={{ width: u(34), height: u(34), fontSize: u(16) }}>
            +
          </div>
          {[refModel, refBag, refShades].map((src, i) => (
            <img key={src} src={src} alt="" className="rounded-[1.6cqw] object-cover shadow-sm ring-1 ring-foreground/10" style={{ width: u(34), height: u(34), ...a("hfw-pop", 0.4, refsAt + i * 0.18, SPRING) }} />
          ))}
        </div>
        <div
          className="absolute flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
          style={{ ...box(270 - 14 - 32, 168 - 14 - 32, 32, 32), animation: anim("hfw-press", 0.35, goAt) }}
          aria-label="Generate"
        >
          <Sparkle style={{ width: u(13), height: u(13) }} />
        </div>
      </div>

      {/* connector */}
      <svg viewBox="0 0 520 280" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <path d="M296 124 H 318" fill="none" strokeDasharray="3 4" strokeLinecap="round" strokeWidth={1.5} className="stroke-foreground/15" />
      </svg>

      {/* the video: slot → generating → playing */}
      <div className="rounded-[2.6cqw] border border-dashed" style={box(326, 38, 172, 172)} />
      <div className="overflow-hidden rounded-[2.6cqw] bg-muted" style={{ ...box(326, 38, 172, 172), ...a("hfw-fade", 0.25, goAt + 0.25) }}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" style={{ animation: `hfw-shimmer 1s linear ${goAt + 0.25}s infinite` }} />
      </div>
      <div style={{ ...box(326, 38, 172, 172), ...a("hfw-in", 0.55, vidAt, SPRING) }}>
        <Clip look={LOOKS[0]} video round={14} className="size-full shadow-xl" />
      </div>
      <Chip cx={326 + 86} y={222} style={a("hfw-up", 0.4, vidAt + 0.4)}>
        <span className="size-[0.55em] rounded-full bg-emerald-500" />
        Your video
      </Chip>
    </>
  )
}

const ROW = { x: 22, y: 64, size: 110, gap: 10 }
const rowX = (i: number) => ROW.x + i * (ROW.size + ROW.gap)

function SceneVariations() {
  return (
    <>
      <Chip className="text-muted-foreground" cx={260} y={22} style={a("hfw-up", 0.4, 0.1)}>
        <Sparkle className="text-muted-foreground" style={{ width: u(10), height: u(10) }} />
        Same motion, new person and outfit
      </Chip>
      {LOOKS.map((l, i) => (
        <div
          key={l.name}
          style={{
            ...box(rowX(i), ROW.y, ROW.size, ROW.size),
            zIndex: 4 - i,
            ["--fx" as string]: u(-(rowX(i) - ROW.x)),
            ...(i === 0 ? {} : a("hfw-fan", 0.75, 0.3 + i * 0.22, SPRING)),
          }}
        >
          <Clip look={l} video={i === 0} className="size-full shadow-lg" />
        </div>
      ))}
      {LOOKS.map((l, i) => (
        <Chip
          key={l.name}
          className={i === 0 ? "text-muted-foreground" : undefined}
          cx={rowX(i) + ROW.size / 2} y={ROW.y + ROW.size + 12} style={a("hfw-up", 0.35, 0.9 + i * 0.2)}
        >
          {l.name}
        </Chip>
      ))}
    </>
  )
}

const FRAME = { x: 150, y: 26, size: 200 }
const RAIL = { x: FRAME.x + FRAME.size + 14, size: 30, gap: 8 }
const railY = FRAME.y + (FRAME.size - (4 * RAIL.size + 3 * RAIL.gap)) / 2

/** When each look shows in the Flick scene (seconds): taps on Streetwear then Office. */
const SWAP = [2.15, 3.05]

function SceneFlick() {
  const s = ROW.size / FRAME.size
  const shown = (i: number): CSSProperties =>
    i === 0 ? { animation: anim("hfw-off", 0.01, SWAP[0], "linear") } : i === 1 ? { animation: `${anim("hfw-on", 0.01, SWAP[0], "linear")}, ${anim("hfw-off", 0.01, SWAP[1], "linear", "forwards")}` } : i === 2 ? { animation: anim("hfw-on", 0.01, SWAP[1], "linear") } : { opacity: 0 }
  return (
    <>
      {/* the four variations fly into one frame */}
      {LOOKS.map((l, i) => (
        <div
          key={l.name}
          style={{
            ...box(FRAME.x, FRAME.y, FRAME.size, FRAME.size),
            zIndex: i === 0 ? 5 : 4 - i,
            transformOrigin: "0 0",
            ["--fx" as string]: u(rowX(i) - FRAME.x),
            ["--fy" as string]: u(ROW.y - FRAME.y),
            ["--fs" as string]: String(s),
            animation: i === 0 ? anim("hfw-merge", 0.6, 0.05) : `${anim("hfw-merge", 0.6, 0.05 + i * 0.07)}, ${anim("hfw-out", 0.15, 0.7 + i * 0.05)}`,
          }}
        >
          <Clip look={l} round={12} className="size-full" />
        </div>
      ))}
      {/* the Flick: live clips, one shown at a time (swaps are instant, like the real player) */}
      <div className="overflow-hidden shadow-2xl" style={{ ...box(FRAME.x, FRAME.y, FRAME.size, FRAME.size), borderRadius: u(14), zIndex: 6, ...a("hfw-on", 0.01, 0.65, "linear") }}>
        {LOOKS.map((l, i) => (
          <div key={l.name} className="absolute inset-0" style={shown(i)}>
            <Clip look={l} video round={0} className="size-full" />
          </div>
        ))}
      </div>
      <div className="rounded-[3.4cqw] bg-white shadow-[0_24px_48px_-20px_rgb(0_0_0/0.45)] ring-1 ring-black/5 dark:bg-white/10" style={{ ...box(FRAME.x - 6, FRAME.y - 6, FRAME.size + 12, FRAME.size + 12), zIndex: 1, ...a("hfw-pop", 0.45, 0.75, SPRING) }} />
      <div className="absolute -translate-x-1/2" style={{ left: u(FRAME.x + FRAME.size / 2), top: u(FRAME.y - 13), zIndex: 8 }}>
        <div className="rounded-full bg-black/70 font-semibold text-white shadow ring-1 ring-white/15 backdrop-blur-md" style={{ fontSize: u(10), paddingInline: u(9), lineHeight: u(18), ...a("hfw-up", 0.4, 0.85) }}>
          Flick
        </div>
      </div>
      <Rail
        x={RAIL.x}
        y={railY}
        size={RAIL.size}
        gap={RAIL.gap}
        style={a("hfw-up", 0.45, 1.0)}
        active={(i) => (i === 0 ? { animation: anim("hfw-off", 0.01, SWAP[0], "linear") } : shown(i).animation ? shown(i) : { opacity: 0 })}
      />
      {/* taps */}
      {SWAP.map((t, k) => (
        <div key={t} className="rounded-full bg-white/70" style={{ ...box(RAIL.x + RAIL.size / 2 - 12, railY + (k + 1) * (RAIL.size + RAIL.gap) + RAIL.size / 2 - 12, 24, 24), zIndex: 9, ...a("hfw-ripple", 0.5, t - 0.05, "ease-out") }} />
      ))}
      <svg viewBox="0 0 14 20" className="absolute left-0 top-0 drop-shadow" style={{ width: u(14), height: u(20), zIndex: 10, transformOrigin: "0 0", animation: "hfw-cursor 4s linear both" }} aria-hidden>
        <path d="M1 1 L1 17 L5.4 12.8 L8.4 19.2 L11 18.1 L8 11.8 L13.6 11.8 Z" className="fill-foreground stroke-background" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
      <Chip cx={FRAME.x + FRAME.size / 2} y={FRAME.y + FRAME.size + 16} style={a("hfw-up", 0.4, 1.3)}>Tap to switch</Chip>
    </>
  )
}

/** A small Flick that cycles through the looks on its own. */
function MiniFlick({ x, y, size, rail = true }: { x: number; y: number; size: number; rail?: boolean }) {
  return (
    <div className="overflow-hidden" style={{ ...box(x, y, size, size), borderRadius: u(Math.max(4, size * 0.08)) }}>
      {LOOKS.map((l, i) => (
        <img key={l.name} src={l.poster} alt="" className="absolute inset-0 size-full object-cover" style={{ animation: `hfw-c${i + 1} 4.8s linear 0.6s infinite both` }} />
      ))}
      {rail && (
        <div className="absolute flex flex-col" style={{ right: u(size * 0.05), top: "50%", transform: "translateY(-50%)", gap: u(size * 0.03) }}>
          {LOOKS.map((l, i) => (
            <div key={l.name} className="relative" style={{ width: u(size * 0.14), height: u(size * 0.14) }}>
              <img src={l.thumb} alt="" className="size-full object-cover" style={{ borderRadius: u(size * 0.035) }} />
              <div className="absolute inset-[-1px] border border-white" style={{ borderRadius: u(size * 0.04), animation: `hfw-c${i + 1} 4.8s linear 0.6s infinite both` }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const OUTS = [
  { y: 22, title: "Ads", sub: "Serve it in your campaigns" },
  { y: 106, title: "Website", sub: "Add it to any page" },
  { y: 190, title: "Link", sub: "Share it anywhere" },
]
const OUT_X = 232
const OUT_W = 252

function OutIcon({ i }: { i: number }) {
  return (
    <svg viewBox="0 0 28 28" className="size-full" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {i === 0 && (
        <g className="stroke-foreground">
          <path d="M8 12 h3 l6 -4 v12 l-6 -4 h-3 z" className="fill-foreground" />
          <path d="M20 11.5 q2 2.5 0 5" />
        </g>
      )}
      {i === 1 && (
        <g className="stroke-foreground">
          <rect x={6.5} y={8} width={15} height={12} rx={2.5} />
          <path d="M6.5 11.5 h15" />
        </g>
      )}
      {i === 2 && (
        <g className="stroke-foreground">
          <path d="M13 16.5 l-2 2 a3 3 0 0 1 -4.2 -4.2 l3 -3 a3 3 0 0 1 4.2 0" />
          <path d="M15 11.5 l2 -2 a3 3 0 0 1 4.2 4.2 l-3 3 a3 3 0 0 1 -4.2 0" />
        </g>
      )}
    </svg>
  )
}

function SceneAnywhere() {
  const F = { x: 26, y: 62, size: 156 }
  return (
    <>
      <div style={a("hfw-in", 0.45, 0)}>
        <div className="rounded-[3.2cqw] bg-white shadow-[0_24px_48px_-20px_rgb(0_0_0/0.45)] ring-1 ring-black/5 dark:bg-white/10" style={box(F.x - 5, F.y - 5, F.size + 10, F.size + 10)} />
        <div className="shadow-xl" style={{ borderRadius: u(12) }}>
          <MiniFlick x={F.x} y={F.y} size={F.size} />
        </div>
        <div
          className="absolute rounded-full bg-black/70 font-semibold text-white shadow ring-1 ring-white/15 backdrop-blur-md"
          style={{ left: u(F.x + F.size / 2), top: u(F.y - 12), transform: "translateX(-50%)", fontSize: u(10), paddingInline: u(9), lineHeight: u(18) }}
        >
          Flick
        </div>
      </div>
      <svg viewBox="0 0 520 280" className="absolute inset-0 size-full" aria-hidden>
        {OUTS.map((o, i) => (
          <path
            key={o.title}
            d={`M${F.x + F.size + 6} ${F.y + F.size / 2} C ${F.x + F.size + 34} ${F.y + F.size / 2}, ${OUT_X - 30} ${o.y + 36}, ${OUT_X - 2} ${o.y + 36}`}
            fill="none"
            strokeWidth={1.6}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            className="stroke-foreground/15"
            style={a("hfw-draw", 0.45, 0.35 + i * 0.25)}
          />
        ))}
      </svg>
      {OUTS.map((o, i) => {
        const d = 0.6 + i * 0.25
        return (
          <div key={o.title} className="rounded-[2.6cqw] bg-card ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_28px_-14px_rgb(0_0_0/0.22)]" style={{ ...box(OUT_X, o.y, OUT_W, 72), ...a("hfw-up", 0.45, d) }}>
            <div className="absolute rounded-[1.6cqw] bg-foreground/[0.04] ring-1 ring-foreground/[0.05]" style={box(12, 22, 28, 28)}>
              <OutIcon i={i} />
            </div>
            <p className="absolute font-semibold text-foreground" style={{ left: u(50), top: u(18), fontSize: u(13) }}>{o.title}</p>
            <p className="absolute text-muted-foreground" style={{ left: u(50), top: u(37), fontSize: u(11) }}>{o.sub}</p>
            {i === 0 && (
              // a feed post in a phone
              <div className="absolute overflow-hidden bg-background ring-1 ring-foreground/10" style={{ ...box(OUT_W - 60, 6, 48, 60), borderRadius: u(8) }}>
                <div className="flex items-center" style={{ ...box(4, 4, 40, 8), gap: u(2) }}>
                  <span className="rounded-full bg-muted-foreground/50" style={{ width: u(6), height: u(6) }} />
                  <span className="text-muted-foreground" style={{ fontSize: u(5.5) }}>Sponsored</span>
                </div>
                <MiniFlick x={4} y={14} size={40} rail={false} />
                <div className="rounded-full bg-muted" style={box(4, 56, 26, 2.5)} />
              </div>
            )}
            {i === 1 && (
              // a web page with the Flick on it
              <div className="absolute overflow-hidden bg-background ring-1 ring-foreground/10" style={{ ...box(OUT_W - 96, 8, 84, 56), borderRadius: u(6) }}>
                <div className="flex items-center border-b border-foreground/[0.06]" style={{ ...box(0, 0, 84, 9), gap: u(2.5), paddingLeft: u(4) }}>
                  {[0, 1, 2].map((k) => <span key={k} className="rounded-full bg-muted-foreground/50" style={{ width: u(3), height: u(3) }} />)}
                </div>
                <div className="rounded-full bg-muted" style={box(6, 16, 30, 4)} />
                <div className="rounded-full bg-muted" style={box(6, 24, 22, 4)} />
                <div className="rounded-full bg-foreground/80" style={box(6, 36, 18, 7)} />
                <MiniFlick x={44} y={14} size={36} rail={false} />
              </div>
            )}
            {i === 2 && (
              <div className="absolute flex items-center justify-center rounded-full bg-background font-medium ring-1 ring-foreground/10" style={{ ...box(OUT_W - 92, 24, 80, 24), fontSize: u(11) }}>
                <span className="absolute text-foreground" style={a("hfw-off", 0.01, 2.7, "linear")}>Copy link</span>
                <span className="absolute font-semibold text-foreground" style={a("hfw-pop", 0.35, 2.7, SPRING)}>Copied ✓</span>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

const SCENES = [SceneVideo, SceneVariations, SceneFlick, SceneAnywhere]

function Stage({ step }: { step: number }) {
  const Scene = SCENES[step]
  return (
    <div key={step} className="hfw absolute inset-0" style={{ containerType: "inline-size" }}>
      <style>{CSS}</style>
      <Scene />
    </div>
  )
}

/* ---------- popup ---------- */

export function HowFlicksWork({ open, onOpenChange, onStart }: { open: boolean; onOpenChange: (o: boolean) => void; onStart?: () => void }) {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  const last = step === STEPS.length - 1

  // restart from the top each time it opens
  useEffect(() => {
    if (open) (setStep(0), setAuto(true))
  }, [open])

  useEffect(() => {
    if (!open || !auto || last) return
    const t = setTimeout(() => setStep((s) => s + 1), STEPS[step].ms)
    return () => clearTimeout(t)
  }, [open, auto, step, last])

  const go = (n: number) => (setAuto(false), setStep(Math.max(0, Math.min(STEPS.length - 1, n))))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        {/* stage */}
        <div
          className="relative aspect-[520/280] w-full overflow-hidden border-b border-foreground/[0.06]"
          style={{ background: "radial-gradient(70% 80% at 50% 30%, color-mix(in oklch, var(--primary) 7%, var(--background)) 0%, color-mix(in oklch, var(--primary) 3%, var(--muted)) 100%)" }}
        >
          <div className="absolute inset-x-[3%] inset-y-[4%]">
            <Stage step={step} />
          </div>
        </div>

        {/* copy */}
        <div className="flex flex-col gap-4 px-6 pb-5 pt-5">
          <div className="min-h-[92px] space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              How Flicks work
            </p>
            <DialogTitle className="text-xl font-medium tracking-tight">{STEPS[step].title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{STEPS[step].body}</DialogDescription>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* progress: past full, current fills while auto-playing; each jumps to its step */}
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Steps">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={i === step}
                  aria-label={s.title}
                  onClick={() => go(i)}
                  className={cn("relative h-1.5 overflow-hidden rounded-full bg-foreground/10 transition-[width] duration-300", i === step ? "w-8" : "w-4")}
                >
                  {i < step && <span className="absolute inset-0 bg-foreground/25" />}
                  {i === step && (
                    <span
                      key={`${step}-${auto}`}
                      className="absolute inset-y-0 left-0 bg-primary"
                      style={auto && !last ? { animation: `hfw-bar ${s.ms}ms linear both` } : { width: "100%" }}
                    />
                  )}
                </button>
              ))}
              <style>{`@keyframes hfw-bar { from { width: 0 } to { width: 100% } }`}</style>
            </div>

            <div className="flex items-center gap-2">
              {step === 0 ? (
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Skip
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => go(step - 1)}>
                  Back
                </Button>
              )}
              {last ? <Button onClick={() => (onOpenChange(false), onStart?.())}>Start creating</Button> : <Button onClick={() => go(step + 1)}>Next</Button>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
