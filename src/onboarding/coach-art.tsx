import type { CSSProperties, ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ImageAdd01Icon, LockIcon, PlayIcon, RefreshIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import type { Art } from "@/onboarding/onboarding"
import softPink from "@/assets/flicks/escalator/soft-pink-poster.webp"
import street from "@/assets/flicks/escalator/street-poster.webp"
import office from "@/assets/flicks/escalator/office-poster.webp"
import court from "@/assets/flicks/escalator/court-poster.webp"
import refBag from "@/assets/intro/ref-bag.webp"

/**
 * Small looping illustrations for the editor tour and tips: neutral shapes, one accent, CSS only.
 * Each scene is 288 × 132 and loops every few seconds; reduced motion shows its end state.
 */
export function CoachArt({ art }: { art: Art }) {
  const Scene = SCENES[art]
  return (
    <div aria-hidden className="ca relative h-[132px] w-full overflow-hidden rounded-xl bg-muted/70 ring-1 ring-foreground/5">
      <style>{CSS}</style>
      <Scene />
    </div>
  )
}

const L = 4.8 // seconds per loop
const loop = (name: string, delay = 0, dur = L): CSSProperties => ({ animation: `${name} ${dur}s cubic-bezier(.2,.7,.2,1) ${delay}s infinite both` })

const CSS = `
.ca * { box-sizing: border-box; }
@keyframes ca-pulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--primary) 40%, transparent) } 50% { box-shadow: 0 0 0 6px color-mix(in oklch, var(--primary) 0%, transparent) } }
@keyframes ca-ghost { 0%,15% { opacity: 0; transform: translateX(-10px) } 30%,85% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-draw { 0%,10% { transform: scaleX(0) } 28%,85% { transform: scaleX(1) } 100% { transform: scaleX(1); opacity: 0 } }
@keyframes ca-press { 0%,8% { transform: scale(1) } 12% { transform: scale(.86) } 16%,100% { transform: scale(1) } }
@keyframes ca-bubble { 0%,14% { opacity: 0; transform: translateY(6px) } 20%,88% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-type { 0%,20% { clip-path: inset(0 100% 0 0) } 45%,100% { clip-path: inset(0 0 0 0) } }
@keyframes ca-newthumb { 0%,46% { opacity: 0; transform: scale(.7) } 52%,92% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-fill { 0%,62% { opacity: 0 } 70%,92% { opacity: 1 } 100% { opacity: 0 } }
@keyframes ca-shimmer { from { transform: translateX(-100%) } to { transform: translateX(100%) } }
@keyframes ca-drop { 0%,12% { opacity: 0; transform: translateY(-14px) } 22%,88% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-drop3 { 0%,58% { opacity: 0; transform: translateY(-10px) scale(.8) } 68%,88% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-drop2 { 0%,36% { opacity: 0; transform: translateY(-10px) } 46%,88% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-cursor-design { 0%,6% { transform: translate(150px, 120px); opacity: 0 } 10% { opacity: 1 } 18% { transform: translate(60px, 104px) } 21% { transform: translate(60px, 104px) scale(.85) } 24% { transform: translate(60px, 104px) scale(1) } 38% { transform: translate(58px, 30px) } 41% { transform: translate(58px, 30px) scale(.85) } 44% { transform: translate(58px, 30px) scale(1) } 60% { transform: translate(76px, 52px) } 63% { transform: translate(76px, 52px) scale(.85) } 66%,85% { transform: translate(76px, 52px) scale(1); opacity: 1 } 100% { opacity: 0 } }
@keyframes ca-play { 0%,20% { transform: scaleX(0) } 50%,100% { transform: scaleX(1) } }
@keyframes ca-on { 0%,57% { opacity: 0; transform: scale(.6) } 63%,90% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-c1 { 0%,33.2% { opacity: 1 } 33.3%,100% { opacity: 0 } }
@keyframes ca-c2 { 0%,33.2% { opacity: 0 } 33.3%,66.5% { opacity: 1 } 66.6%,100% { opacity: 0 } }
@keyframes ca-c3 { 0%,66.5% { opacity: 0 } 66.6%,100% { opacity: 1 } }
@keyframes ca-swap1 { 0%,18% { opacity: 0 } 26%,94% { opacity: 1 } 100% { opacity: 0 } }
@keyframes ca-dim { 0%,26% { opacity: 1 } 32%,62% { opacity: .45 } 72%,100% { opacity: 1 } }
@keyframes ca-swap2 { 0%,66% { opacity: 0 } 72%,94% { opacity: 1 } 100% { opacity: 0 } }
@keyframes ca-dot { 0%,26% { opacity: 0; transform: scale(0) } 32%,64% { opacity: 1; transform: none } 70%,100% { opacity: 0; transform: scale(0) } }
@keyframes ca-spin { 0%,40% { transform: rotate(0) } 66%,100% { transform: rotate(360deg) } }
@keyframes ca-x-cursor { 0%,3% { transform: translate(250px, 120px); opacity: 0 } 6% { opacity: 1 } 13% { transform: translate(70px, 18px) } 15% { transform: translate(70px, 18px) scale(.85) } 17% { transform: translate(70px, 18px) scale(1) } 26% { transform: translate(122px, 116px) } 28% { transform: translate(122px, 116px) scale(.85) } 30% { transform: translate(122px, 116px) scale(1) } 37% { transform: translate(128px, 116px) } 39% { transform: translate(128px, 116px) scale(.85) } 41% { transform: translate(128px, 116px) scale(1) } 52% { transform: translate(250px, 18px) } 54% { transform: translate(250px, 18px) scale(.85) } 56%,90% { transform: translate(250px, 18px) scale(1); opacity: 1 } 100% { opacity: 0 } }
@keyframes ca-x-mode { 0%,15% { transform: translateX(0) } 19%,92% { transform: translateX(42px) } 98%,100% { transform: translateX(0) } }
@keyframes ca-x-shot1 { 0%,28% { opacity: 1 } 28.1%,100% { opacity: 0 } }
@keyframes ca-x-shot2 { 0%,28% { opacity: 0 } 28.1%,39% { opacity: 1 } 39.1%,100% { opacity: 0 } }
@keyframes ca-x-shot3 { 0%,39% { opacity: 0 } 39.1%,100% { opacity: 1 } }
@keyframes ca-x-progress { 0%,55% { transform: scaleX(0) } 70% { transform: scaleX(1); opacity: 1 } 72%,100% { transform: scaleX(1); opacity: 0 } }
@keyframes ca-x-label1 { 0%,70% { opacity: 1 } 72%,96% { opacity: 0 } 100% { opacity: 1 } }
@keyframes ca-x-label2 { 0%,70% { opacity: 0; transform: scale(.5) } 74%,96% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-x-lock { 0%,72% { opacity: 0 } 78%,96% { opacity: 1 } 100% { opacity: 0 } }
@keyframes ca-x-note { 0%,74% { opacity: 0; transform: translateY(4px) } 80%,96% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-s-cursor { 0%,3% { transform: translate(250px, 130px); opacity: 0 } 6% { opacity: 1 } 13% { transform: translate(128px, 115px) } 14.5% { transform: translate(128px, 115px) scale(.85) } 16% { transform: translate(128px, 115px) scale(1) } 26% { transform: translate(112px, 17px) } 27.5% { transform: translate(112px, 17px) scale(.85) } 29% { transform: translate(112px, 17px) scale(1) } 43% { transform: translate(148px, 115px) } 44.5% { transform: translate(148px, 115px) scale(.85) } 46% { transform: translate(148px, 115px) scale(1) } 56% { transform: translate(112px, 17px) } 57.5% { transform: translate(112px, 17px) scale(.85) } 59% { transform: translate(112px, 17px) scale(1) } 70%,90% { transform: translate(236px, 70px); opacity: 1 } 95%,100% { transform: translate(236px, 70px); opacity: 0 } }
@keyframes ca-s-v0 { 0%,45% { opacity: 1 } 45.5%,100% { opacity: 0 } }
@keyframes ca-s-v1 { 0%,45% { opacity: 0 } 45.5%,100% { opacity: 1 } }
@keyframes ca-s-on0 { 0%,15% { opacity: 0 } 15.5%,45% { opacity: 1 } 45.5%,100% { opacity: 0 } }
@keyframes ca-s-on1 { 0%,45% { opacity: 0 } 45.5%,95% { opacity: 1 } 100% { opacity: 0 } }
@keyframes ca-s-bar { 0%,15% { opacity: 0; transform: translateY(4px) } 19%,95% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-s-fill0 { 0%,29% { opacity: 0; transform: scale(.5) } 33%,95% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-s-fill1 { 0%,59% { opacity: 0; transform: scale(.5) } 63%,95% { opacity: 1; transform: none } 100% { opacity: 0 } }
@keyframes ca-s-tb0 { 0%,29% { opacity: 0 } 31%,45% { opacity: 1 } 45.5%,100% { opacity: 0 } }
@keyframes ca-s-tb1 { 0%,59% { opacity: 0 } 61%,95% { opacity: 1 } 100% { opacity: 0 } }
@keyframes ca-s-add { 0%,29% { opacity: 1 } 29.5%,45% { opacity: 0 } 45.5%,59% { opacity: 1 } 59.5%,100% { opacity: 0 } }
@keyframes ca-s-chg { 0%,29% { opacity: 0 } 29.5%,45% { opacity: 1 } 45.5%,59% { opacity: 0 } 59.5%,100% { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .ca *, .ca *::before { animation-duration: .01s !important; animation-iteration-count: 1 !important; animation-delay: 0s !important; } }
`

/* ---------- pieces ---------- */

/** The escalator Flick: one shot, four people (the same footage as the sign-in page and How Flicks work). */
const SHOTS = [softPink, street, office, court]

/** A video frame: a real still from the escalator Flick. */
function Frame({ x, y, w, h, tone = 0, style, children, className = "" }: { x: number; y: number; w: number; h: number; tone?: number; style?: CSSProperties; children?: ReactNode; className?: string }) {
  return (
    <div className={`absolute overflow-hidden rounded-md bg-muted shadow-sm ring-1 ring-black/5 ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>
      <img src={SHOTS[tone % SHOTS.length]} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
      {children}
    </div>
  )
}

function Pill({ x, y, children, style, dark }: { x: number; y: number; children: ReactNode; style?: CSSProperties; dark?: boolean }) {
  return (
    <div
      className={`absolute flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10px] font-medium shadow-sm ${dark ? "bg-neutral-800 text-white" : "bg-background text-foreground ring-1 ring-foreground/10"}`}
      style={{ left: x, top: y, ...style }}
    >
      {children}
    </div>
  )
}

function Cursor({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 14 20" className="absolute left-0 top-0 h-[18px] w-[13px] drop-shadow" style={{ transformOrigin: "0 0", ...loop(name, 0) }}>
      <path d="M1 1 L1 17 L5.4 12.8 L8.4 19.2 L11 18.1 L8 11.8 L13.6 11.8 Z" className="fill-foreground stroke-background" strokeWidth={1.3} strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- scenes ---------- */

function Reference() {
  return (
    <>
      <Frame x={52} y={18} w={54} h={96} tone={0} style={{ ...loop("ca-pulse", 0, 2.4), borderRadius: 8 }}>
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid size-5 place-items-center rounded-full bg-white/85 text-neutral-800">
            <HugeiconsIcon icon={PlayIcon} className="size-2.5 fill-current" />
          </span>
        </div>
      </Frame>
      <Pill x={46} y={6} dark>
        Reference
      </Pill>
      {/* variations made from it */}
      <div className="absolute left-[112px] top-[65px] h-px w-[34px] origin-left border-t border-dashed border-foreground/30" style={loop("ca-draw", 0)} />
      {[1, 2, 3].map((t, i) => (
        <Frame key={t} x={150 + i * 40} y={36 + (i % 2) * 6} w={34} h={60} tone={t} style={loop("ca-ghost", i * 0.25)} />
      ))}
    </>
  )
}

function Variations() {
  return (
    <>
      {/* the strip */}
      <div className="absolute bottom-3 left-3.5 flex items-end gap-1">
        {[0, 1, 2].map((t) => (
          <Frame key={t} x={0} y={0} w={22} h={40} tone={t} className="!relative" />
        ))}
        <div className="relative h-[40px] w-[22px]">
          <div className="absolute inset-0 overflow-hidden rounded-md bg-background ring-1 ring-foreground/10" style={loop("ca-newthumb")}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" style={{ animation: "ca-shimmer 1s linear infinite" }} />
            <Frame x={0} y={0} w={22} h={40} tone={3} style={loop("ca-fill")} />
          </div>
        </div>
        <div className="grid h-[40px] w-[22px] place-items-center rounded-md border border-dashed border-foreground/25 text-muted-foreground" style={loop("ca-press")}>
          <HugeiconsIcon icon={Add01Icon} className="size-3" />
        </div>
      </div>
      {/* the chat */}
      <div className="absolute right-3 top-3 bottom-3 w-[110px] rounded-lg bg-background p-2 shadow-sm ring-1 ring-foreground/10">
        <div className="mb-1.5 h-1.5 w-12 rounded-full bg-foreground/10" />
        <div className="ml-auto w-[86px] rounded-lg rounded-tr-sm bg-muted px-2 py-1.5 text-[9.5px] leading-tight text-foreground" style={loop("ca-bubble")}>
          <span className="block" style={loop("ca-type")}>
            Tennis outfit, same shot
          </span>
        </div>
        <div className="absolute inset-x-2 bottom-2 flex h-6 items-center justify-end rounded-md bg-muted/70 px-1">
          <span className="grid size-4 place-items-center rounded bg-neutral-800 text-white" style={loop("ca-press", 0.85)}>
            <HugeiconsIcon icon={Tick02Icon} className="size-2.5" />
          </span>
        </div>
      </div>
    </>
  )
}

function Design() {
  return (
    <>
      {[0, 1, 2].map((t, i) => (
        <Frame key={t} x={30 + i * 82} y={16} w={56} h={100} tone={t}>
          <div className="absolute inset-x-0 top-2.5 text-center text-[9px] font-semibold leading-none text-white drop-shadow" style={loop("ca-drop2")}>New in</div>
          <img src={refBag} alt="" className="absolute right-1.5 top-[30px] size-5 rounded-[4px] object-cover shadow ring-1 ring-white/80" style={loop("ca-drop3")} />
          <div className="absolute bottom-2.5 left-1/2 flex h-4 -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-white px-2 text-[8px] font-semibold text-neutral-900 shadow" style={loop("ca-drop")}>Shop now</div>
        </Frame>
      ))}
      <Cursor name="ca-cursor-design" />
    </>
  )
}

/** Preview, then export: switch to Preview, try the Flick, export it, and it's locked. */
function Export() {
  const D = 6.4
  const l = (n: string) => loop(n, 0, D)
  return (
    <>
      {/* a mini top bar: Design | Preview, and Export */}
      <div className="absolute inset-x-3 top-2.5 flex h-6 items-center justify-between">
        <div className="relative flex h-5 items-center rounded-full bg-background p-0.5 text-[9px] font-medium shadow-sm ring-1 ring-foreground/10">
          <span className="absolute inset-y-0.5 left-0.5 w-[42px] rounded-full bg-muted" style={l("ca-x-mode")} />
          <span className="relative w-[42px] text-center">Design</span>
          <span className="relative w-[42px] text-center">Preview</span>
        </div>
        <div className="relative flex h-5 w-[58px] items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-[9px] font-medium text-white shadow-sm">
          <span className="absolute inset-y-0 left-0 w-full origin-left bg-white/25" style={l("ca-x-progress")} />
          <span className="relative" style={l("ca-x-label1")}>Export</span>
          <span className="absolute inset-0 grid place-items-center" style={l("ca-x-label2")}>
            <HugeiconsIcon icon={Tick02Icon} className="size-3" />
          </span>
        </div>
      </div>
      {/* the Flick: viewers tap the thumbnails */}
      <div className="absolute left-[92px] top-[38px] h-[86px] w-[50px] overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
        {[0, 1, 2].map((t) => (
          <img key={t} src={SHOTS[t]} alt="" className="absolute inset-0 size-full object-cover" style={l(`ca-x-shot${t + 1}`)} />
        ))}
        <div className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
          {[0, 1, 2].map((t) => (
            <span key={t} className="relative size-2.5 overflow-hidden rounded-[2px] ring-1 ring-white/70">
              <img src={SHOTS[t]} alt="" className="size-full object-cover" />
            </span>
          ))}
        </div>
        {/* exported: locked */}
        <div className="absolute inset-0 grid place-items-center bg-black/35" style={l("ca-x-lock")}>
          <span className="grid size-6 place-items-center rounded-full bg-white text-neutral-900 shadow">
            <HugeiconsIcon icon={LockIcon} className="size-3" />
          </span>
        </div>
      </div>
      <span className="absolute left-[150px] top-[96px] flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground" style={l("ca-x-note")}>
        Exported.
      </span>
      <svg viewBox="0 0 14 20" className="absolute left-0 top-0 h-[18px] w-[13px] drop-shadow" style={{ transformOrigin: "0 0", ...l("ca-x-cursor") }}>
        <path d="M1 1 L1 17 L5.4 12.8 L8.4 19.2 L11 18.1 L8 11.8 L13.6 11.8 Z" className="fill-foreground stroke-background" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  )
}

/** Thumbnail strip: the thumbnails start empty; pick one, then add its image from the toolbar. Picking one shows its variation. */
function Strip() {
  const D = 8
  const t = (name: string): CSSProperties => ({ animation: `${name} ${D}s linear infinite both` })
  return (
    <>
      {/* the strip's toolbar, as on the canvas */}
      <div className="absolute left-[148px] top-[6px] -translate-x-1/2">
      <div className="flex h-6 items-center gap-1 whitespace-nowrap rounded-lg bg-background pl-0.5 pr-1.5 shadow-sm ring-1 ring-foreground/10" style={t("ca-s-bar")}>
        <span className="relative grid size-5 place-items-center overflow-hidden rounded-[5px] bg-muted text-muted-foreground ring-1 ring-foreground/10">
          <HugeiconsIcon icon={ImageAdd01Icon} className="size-3" />
          <img src={SHOTS[0]} alt="" className="absolute inset-0 size-full object-cover object-[50%_25%]" style={t("ca-s-tb0")} />
          <img src={SHOTS[1]} alt="" className="absolute inset-0 size-full object-cover object-[50%_25%]" style={t("ca-s-tb1")} />
        </span>
        <span className="relative h-3 w-[88px] text-[10px] leading-3">
          <span className="absolute inset-0" style={t("ca-s-add")}>Add thumbnail</span>
          <span className="absolute inset-0" style={t("ca-s-chg")}>Change thumbnail</span>
        </span>
        <span className="mx-0.5 h-3 w-px bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/20" />
        <span className="size-2.5 rounded-[3px] bg-foreground/20" />
      </div>
      </div>
      <div className="absolute left-[116px] top-[34px] h-[94px] w-[64px] overflow-hidden rounded-md bg-muted shadow-sm ring-1 ring-black/5">
        {/* picking a thumbnail shows its variation */}
        {[0, 1].map((i) => (
          <img key={i} src={SHOTS[i]} alt="" className="absolute inset-0 size-full object-cover" style={t(`ca-s-v${i}`)} draggable={false} />
        ))}
        {/* the strip on the frame: empty to start */}
        <div className="absolute inset-x-0 bottom-[5px] flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="relative grid size-4 place-items-center rounded-[3px] border border-dashed border-white/85 bg-black/35 text-white">
              <HugeiconsIcon icon={ImageAdd01Icon} className="size-2.5" />
              {i < 2 && <img src={SHOTS[i]} alt="" className="absolute -inset-px size-[calc(100%+2px)] max-w-none rounded-[3px] object-cover object-[50%_25%]" style={t(`ca-s-fill${i}`)} draggable={false} />}
              {i < 2 && <span className="absolute -inset-[3px] rounded-[5px] ring-[1.5px] ring-white" style={t(`ca-s-on${i}`)} />}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 14 20" className="absolute left-0 top-0 h-[18px] w-[13px] drop-shadow" style={{ transformOrigin: "0 0", ...t("ca-s-cursor") }}>
        <path d="M1 1 L1 17 L5.4 12.8 L8.4 19.2 L11 18.1 L8 11.8 L13.6 11.8 Z" className="fill-foreground stroke-background" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  )
}

const PRICES = ["$189", "$199", "$179"]
function Feed() {
  const cyc = (i: number): CSSProperties => ({ animation: `ca-c${i + 1} 4.2s steps(1) infinite both` })
  return (
    <>
      <div className="absolute left-[34px] top-[12px] h-[108px] w-[60px]">
        {[0, 1, 2].map((t) => (
          <Frame key={t} x={0} y={0} w={60} h={108} tone={t} style={cyc(t)} />
        ))}
        {/* the feed tab and its value */}
        <div className="absolute left-1/2 top-[30px] -translate-x-1/2">
          <div className="absolute bottom-full left-0 rounded-t-[4px] bg-neutral-800 px-1.5 py-0.5 text-[8px] font-medium leading-none text-white">price</div>
          <div className="relative rounded-[3px] bg-black/25 px-1.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/80">
            {PRICES.map((p, i) => (
              <span key={p} className={i ? "absolute inset-x-1.5" : ""} style={cyc(i)}>
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* the variations, one picked at a time */}
      <div className="absolute left-[118px] top-[22px] flex flex-col gap-1.5">
        {[0, 1, 2].map((t) => (
          <div key={t} className="flex items-center gap-2">
            <div className="relative size-6 overflow-hidden rounded-[5px]">
              <Frame x={0} y={0} w={24} h={24} tone={t} />
              <div className="absolute inset-0 rounded-[5px] ring-2 ring-inset ring-primary" style={cyc(t)} />
            </div>
            <div className="relative flex h-6 w-[120px] items-center rounded-md bg-background px-2 text-[10px] text-foreground ring-1 ring-foreground/10">
              {PRICES[t]}
              <span className="absolute right-2 h-3 w-px bg-foreground" style={cyc(t)} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function Stale() {
  return (
    <>
      {/* the reference changes… */}
      <div className="absolute left-[40px] top-[16px] h-[96px] w-[54px] overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
        <img src={SHOTS[0]} alt="" className="absolute inset-0 size-full object-cover" />
        <img src={SHOTS[1]} alt="" className="absolute inset-0 size-full object-cover" style={loop("ca-swap1")} />
      </div>
      <Pill x={34} y={4} dark>
        Reference
      </Pill>
      <div className="absolute left-[106px] top-[62px] h-px w-[44px] border-t border-dashed border-foreground/30" />
      {/* …so its variation needs regenerating, then matches */}
      <div className="absolute left-[160px] top-[30px] flex flex-col items-center gap-1.5">
        <div className="relative h-[64px] w-[36px] overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
          <img src={SHOTS[2]} alt="" className="absolute inset-0 size-full object-cover" style={loop("ca-dim")} />
          <img src={SHOTS[3]} alt="" className="absolute inset-0 size-full object-cover" style={loop("ca-swap2")} />
        </div>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-red-500" style={loop("ca-dot")} />
          Variation 1
        </span>
      </div>
      <span className="absolute left-[208px] top-[50px] grid size-6 place-items-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-foreground/10">
        <HugeiconsIcon icon={RefreshIcon} className="size-3.5" style={loop("ca-spin")} />
      </span>
    </>
  )
}

const SCENES: Record<Art, () => ReactNode> = { reference: Reference, variations: Variations, design: Design, export: Export, feed: Feed, stale: Stale, strip: Strip }
