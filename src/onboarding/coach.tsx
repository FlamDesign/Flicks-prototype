import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { onboarding, TIPS, TOUR, useOnboarding, type Coach } from "@/onboarding/onboarding"
import { cn } from "@/lib/utils"

const CARD_W = 300
const GAP = 12

/**
 * One coach mark at a time, over everything: a tour stop (Back, Next, Skip tour), a "Show me"
 * spotlight, or a one-time tip (Got it). It points at its target and follows it; the tour and
 * spotlights dim the rest, tips don't. With no target on screen it waits (or centres, in the editor).
 */
export function CoachLayer() {
  const ob = useOnboarding()
  const mode = ob.tour !== null ? "tour" : ob.spot ? "spot" : ob.tip ? "tip" : null
  const coach: Coach | null = ob.tour !== null ? TOUR[ob.tour] : ob.spot ?? (ob.tip ? TIPS[ob.tip] : null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [inEditor, setInEditor] = useState(false)
  const [waited, setWaited] = useState(false)
  // a tip whose target has gone (deselected, closed) is done; it never jumps to something else
  const seen = useRef(false)

  useEffect(() => {
    if (!coach) return
    setWaited(false)
    seen.current = false
    const measure = () => {
      // never point at the dev tools
      const el = [...document.querySelectorAll(coach.target)].find((e) => !e.closest('[aria-label="Dev tools"]'))
      const r = el?.getBoundingClientRect()
      const found = !!r && r.width > 0
      if (found) seen.current = true
      else if (seen.current && mode === "tip") return onboarding.closeTip()
      setRect(found ? r : null)
      setInEditor(!!document.querySelector('[data-tour="frame"]'))
    }
    measure()
    const id = setInterval(measure, 250)
    const w = setTimeout(() => setWaited(true), 1200)
    window.addEventListener("resize", measure)
    return () => (clearInterval(id), clearTimeout(w), window.removeEventListener("resize", measure))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.target, coach?.title])

  useEffect(() => {
    if (!mode) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  if (!coach || !mode) return null
  // the tour belongs to the editor; tips need their target; a spotlight centres if its target never shows
  if (!rect && !(mode === "tour" && inEditor) && !(mode === "spot" && waited)) return null

  function close() {
    if (mode === "tour") onboarding.endTour()
    else if (mode === "spot") onboarding.spotlight(null)
    else onboarding.closeTip()
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  let pos: { left: number; top: number }
  if (!rect) pos = { left: vw / 2 - CARD_W / 2, top: vh / 2 - 90 }
  else {
    const below = vh - rect.bottom
    const clampX = (x: number) => Math.min(vw - CARD_W - GAP, Math.max(GAP, x))
    const clampY = (y: number) => Math.min(vh - 200, Math.max(GAP, y))
    if (below >= 200) pos = { left: clampX(rect.left + rect.width / 2 - CARD_W / 2), top: rect.bottom + GAP }
    else if (rect.top >= 200) pos = { left: clampX(rect.left + rect.width / 2 - CARD_W / 2), top: rect.top - GAP - 170 }
    else if (rect.left >= CARD_W + GAP * 2) pos = { left: rect.left - CARD_W - GAP, top: clampY(rect.top) }
    else pos = { left: clampX(rect.right + GAP), top: clampY(rect.top) }
  }
  const dim = mode !== "tip"
  const pad = 6

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]" data-keep-selection>
      {rect ? (
        <div
          aria-hidden
          className={cn("absolute rounded-xl ring-2 ring-primary transition-all duration-300", !dim && "animate-pulse")}
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: dim ? "0 0 0 9999px rgb(0 0 0 / 0.35)" : undefined,
          }}
        />
      ) : (
        dim && <div aria-hidden className="absolute inset-0 bg-black/35" />
      )}
      <div
        role="dialog"
        aria-label={coach.title}
        className="pointer-events-auto absolute flex flex-col gap-2 rounded-2xl bg-popover p-4 text-popover-foreground shadow-xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ width: CARD_W, left: pos.left, top: pos.top }}
      >
        <p className="text-sm font-medium">{coach.title}</p>
        <p className="text-sm text-muted-foreground">{coach.text}</p>
        {mode === "tour" ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {ob.tour! + 1} of {TOUR.length}
            </span>
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => onboarding.endTour()}>
              Skip tour
            </Button>
            {ob.tour! > 0 && (
              <Button variant="outline" size="sm" onClick={() => onboarding.backTour()}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={() => onboarding.nextTour()}>
              {ob.tour! + 1 === TOUR.length ? "Done" : "Next"}
            </Button>
          </div>
        ) : (
          <Button size="sm" className="mt-1 self-end" onClick={close}>
            Got it
          </Button>
        )}
      </div>
    </div>,
    document.body,
  )
}
