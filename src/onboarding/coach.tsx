import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { onboarding, TIPS, TOUR, useOnboarding, type Coach } from "@/onboarding/onboarding"
import { CoachArt } from "@/onboarding/coach-art"
import { cn } from "@/lib/utils"

const CARD_W = 320
const GAP = 14
const PAD = 6

type Box = { left: number; top: number; width: number; height: number }

/**
 * One coach mark at a time, over everything: a tour stop (dots, Skip, Back, Next), a "Show me"
 * spotlight, or a one-time tip (Got it). The tour and spotlights dim the page and cut a soft hole
 * around each target (it glides from stop to stop); tips light their target without dimming.
 * A card carries an optional looping illustration. With no target on screen it waits (or centres, in the editor).
 */
export function CoachLayer() {
  const ob = useOnboarding()
  const mode = ob.tour !== null ? "tour" : ob.spot ? "spot" : ob.tip ? "tip" : null
  const coach: Coach | null = ob.tour !== null ? TOUR[ob.tour] : ob.spot ?? (ob.tip ? TIPS[ob.tip] : null)
  const targets: readonly string[] = coach ? (typeof coach.target === "string" ? [coach.target] : coach.target) : []
  const key = targets.join("|")
  const [boxes, setBoxes] = useState<Box[]>([])
  const [inEditor, setInEditor] = useState(false)
  const [waited, setWaited] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(200)
  // a tip whose target has gone (deselected, closed) is done; it never jumps to something else
  const seen = useRef(false)

  useEffect(() => {
    if (!coach) return
    setWaited(false)
    seen.current = false
    const measure = () => {
      const found: Box[] = []
      for (const sel of targets) {
        // never point at the dev tools
        const el = [...document.querySelectorAll(sel)].find((e) => !e.closest('[aria-label="Dev tools"]'))
        const r = el?.getBoundingClientRect()
        if (r && r.width > 0) found.push({ left: r.left, top: r.top, width: r.width, height: r.height })
      }
      if (found.length) seen.current = true
      else if (seen.current && mode === "tip") return onboarding.closeTip()
      setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(found) ? prev : found))
      setInEditor(!!document.querySelector('[data-tour="frame"]'))
    }
    measure()
    const id = setInterval(measure, 200)
    const w = setTimeout(() => setWaited(true), 1200)
    window.addEventListener("resize", measure)
    return () => (clearInterval(id), clearTimeout(w), window.removeEventListener("resize", measure))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, coach?.title])

  useLayoutEffect(() => {
    if (card.current && Math.abs(card.current.offsetHeight - cardH) > 1) setCardH(card.current.offsetHeight)
  })

  useEffect(() => {
    if (!mode) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  if (!coach || !mode) return null
  const has = boxes.length > 0
  // the tour belongs to the editor; tips need their target; a spotlight centres if its target never shows
  if (!has && !(mode === "tour" && inEditor) && !(mode === "spot" && waited)) return null

  function close() {
    if (mode === "tour") onboarding.endTour()
    else if (mode === "spot") onboarding.spotlight(null)
    else onboarding.closeTip()
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  // the card sits by its targets when they sit together, else by the first one
  const u = has
    ? boxes.reduce((x, b) => ({ l: Math.min(x.l, b.left), t: Math.min(x.t, b.top), r: Math.max(x.r, b.left + b.width), b: Math.max(x.b, b.top + b.height) }), { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity })
    : null
  const near: Box | undefined = u && u.r - u.l < vw * 0.5 && u.b - u.t < vh * 0.6 ? { left: u.l, top: u.t, width: u.r - u.l, height: u.b - u.t } : boxes[0]
  let pos: { left: number; top: number }
  if (!near) pos = { left: vw / 2 - CARD_W / 2, top: vh / 2 - cardH / 2 }
  else {
    const clampX = (x: number) => Math.min(vw - CARD_W - GAP, Math.max(GAP, x))
    const clampY = (y: number) => Math.min(vh - cardH - GAP, Math.max(GAP, y))
    const cx = near.left + near.width / 2 - CARD_W / 2
    // a tip sits beside its (usually small) target so it doesn't cover what it's about
    if (mode === "tip" && vw - (near.left + near.width) >= CARD_W + GAP * 2) pos = { left: near.left + near.width + GAP, top: clampY(near.top - 24) }
    else if (mode === "tip" && near.left >= CARD_W + GAP * 2) pos = { left: near.left - CARD_W - GAP, top: clampY(near.top - 24) }
    else if (vh - (near.top + near.height) >= cardH + GAP * 2) pos = { left: clampX(cx), top: near.top + near.height + GAP }
    else if (near.top >= cardH + GAP * 2) pos = { left: clampX(cx), top: near.top - GAP - cardH }
    else if (vw - (near.left + near.width) >= CARD_W + GAP * 2) pos = { left: near.left + near.width + GAP, top: clampY(near.top) }
    else if (near.left >= CARD_W + GAP * 2) pos = { left: near.left - CARD_W - GAP, top: clampY(near.top) }
    else pos = { left: clampX(cx), top: clampY(near.top + near.height / 2 - cardH / 2) }
  }
  const dim = mode !== "tip"
  const step = ob.tour ?? 0
  const ease = "transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)]"

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]" data-keep-selection>
      {/* dim with soft holes around each target; the holes glide from stop to stop */}
      {dim && (
        <svg className="absolute inset-0 size-full animate-in fade-in-0 duration-300" aria-hidden>
          <defs>
            <mask id="coach-holes">
              <rect width="100%" height="100%" fill="white" />
              {boxes.map((b, i) => (
                <rect key={i} rx={12} fill="black" className={ease} style={{ x: b.left - PAD, y: b.top - PAD, width: b.width + PAD * 2, height: b.height + PAD * 2 } as React.CSSProperties} />
              ))}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgb(10 10 12 / 0.5)" mask="url(#coach-holes)" />
        </svg>
      )}
      {/* a light ring on each target */}
      {boxes.map((b, i) => (
        <div
          key={i}
          aria-hidden
          className={cn("absolute rounded-xl", ease, dim ? "ring-2 ring-white/90" : "ring-2 ring-primary animate-pulse")}
          style={{ left: b.left - PAD, top: b.top - PAD, width: b.width + PAD * 2, height: b.height + PAD * 2 }}
        />
      ))}

      <div
        ref={card}
        role="dialog"
        aria-label={coach.title}
        className={cn("pointer-events-auto absolute flex flex-col gap-3 rounded-2xl bg-popover p-3 text-popover-foreground shadow-2xl ring-1 ring-foreground/10", ease)}
        style={{ width: CARD_W, left: pos.left, top: pos.top }}
      >
        {/* content fades in per stop; the card itself glides */}
        <div key={`${mode}-${coach.title}`} className="flex flex-col gap-3 animate-in fade-in-0 duration-300">
          {coach.art && <CoachArt art={coach.art} />}
          <div className="flex flex-col gap-1 px-1">
            <p className="text-sm font-medium">{coach.title}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{coach.text}</p>
          </div>
        </div>
        {mode === "tour" ? (
          <div className="flex items-center gap-2 px-1 pb-0.5">
            <div className="flex items-center gap-1" role="img" aria-label={`Step ${step + 1} of ${TOUR.length}`}>
              {TOUR.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i === step ? "w-4 bg-foreground" : "w-1.5 bg-foreground/20")} />
              ))}
            </div>
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => onboarding.endTour()}>
              Skip
            </Button>
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => onboarding.backTour()}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={() => onboarding.nextTour()}>
              {step + 1 === TOUR.length ? "Done" : "Next"}
            </Button>
          </div>
        ) : (
          <Button size="sm" className="mb-0.5 mr-1 self-end" onClick={close}>
            Got it
          </Button>
        )}
      </div>
    </div>,
    document.body,
  )
}
