import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { GiftIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FlicksLogo } from "@/components/brand"
import { VIDEO_COST } from "@/components/credits-card"
import { cn } from "@/lib/utils"

export const WELCOME_CREDITS = 1000
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches

/** How long the celebration plays before it closes into Create. */
const CELEBRATE_MS = 1200

const CSS = `
@keyframes wg-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
@keyframes wg-breathe { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
@keyframes wg-sheen { 0% { transform: translateX(-60%) rotate(12deg) } 55%,100% { transform: translateX(520%) rotate(12deg) } }
@keyframes wg-rise { 0% { opacity: 0; transform: translateY(0) scale(.5) } 20% { opacity: .9 } 100% { opacity: 0; transform: translateY(-140px) scale(1) } }
@keyframes wg-focus { from { opacity: 0; filter: blur(14px); transform: translateY(10px) scale(1.18) } 60% { opacity: 1 } to { opacity: 1; filter: blur(0); transform: none } }
@keyframes wg-glow { 0%,100% { filter: drop-shadow(0 0 0 oklch(1 0 0 / 0)) } 45% { filter: drop-shadow(0 0 22px oklch(1 0 0 / .55)) } }
@keyframes wg-tick { from { opacity: 0; transform: scale(.4) } to { opacity: 1; transform: none } }
@keyframes wg-label { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) { .wg *, .wg, .wg-b, .wg-b * { animation: none !important; transition: none !important; } }
`

/**
 * Once, right after How Flicks work on a new account: a 1,000-credit welcome gift, as a popup card.
 * One step: Claim and start creating adds the credits, the button shows a tick, then it closes into Create.
 */
export function WelcomeGiftDialog({ open, name, onClaim, onDone }: { open: boolean; name: string; onClaim: () => void; onDone: () => void }) {
  const [claimed, setClaimed] = useState(false)
  const videos = Math.floor(WELCOME_CREDITS / VIDEO_COST)

  const claim = () => {
    if (claimed) return
    setClaimed(true)
    onClaim()
    setTimeout(onDone, reduced() ? 250 : CELEBRATE_MS)
  }

  // closing without claiming still claims: it's free, and it's one per account
  const close = () => {
    if (!claimed) onClaim()
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <style>{CSS}</style>
        {/* stage: the gift fills the whole area; it stays calm, the button carries the moment */}
        <div
          className={cn(
            "wg relative grid aspect-[520/280] w-full place-items-center overflow-hidden text-white",
            "bg-[radial-gradient(120%_140%_at_0%_0%,oklch(0.78_0.17_55),oklch(0.6_0.2_38)_45%,oklch(0.36_0.13_30))]",
          )}
        >
          {/* texture, a breathing glow and a slow sheen */}
          <span aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(115deg,transparent_0_22px,oklch(1_0_0/0.045)_22px_23px)]" />
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_60%_at_50%_45%,oklch(1_0_0/0.22),transparent_70%)]" style={{ animation: "wg-breathe 4s ease-in-out infinite" }} />
          <span aria-hidden className="absolute -inset-y-10 left-0 w-1/5 bg-gradient-to-r from-transparent via-white/25 to-transparent" style={{ animation: "wg-sheen 5s cubic-bezier(.4,0,.2,1) 1.6s infinite" }} />
          <Sparkles />
          <FlicksLogo className="absolute left-6 top-5 h-5 text-white" />
          <span className="relative flex flex-col items-center" style={{ animation: "wg-float 5s ease-in-out 1.8s infinite" }}>
            <FocusNumber value={WELCOME_CREDITS.toLocaleString()} className="text-[clamp(72px,22vw,128px)] font-semibold tracking-[-0.04em] drop-shadow-[0_8px_24px_oklch(0.3_0.12_30/0.45)]" />
            <span className="mt-2 text-sm font-medium tracking-wide text-white/85" style={{ animation: "wg-label .5s ease-out .75s both" }}>
              credits
            </span>
          </span>
        </div>

        {/* copy */}
        <div className="flex flex-col gap-5 px-6 pb-5 pt-5">
          <div className="space-y-1.5">
            <DialogTitle className="text-xl font-medium tracking-tight">{`${name ? `${name}, your` : "Your"} first 1,000 credits are on us`}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{`That\u2019s about ${videos} videos. Go make something great.`}</DialogDescription>
          </div>

          <div className="flex justify-end" aria-live="polite">
            <ClaimButton claimed={claimed} onClick={claim} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Claiming swaps the label for a tick; the width stays put. */
function ClaimButton({ claimed, onClick }: { claimed: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={claimed} aria-label={claimed ? "1,000 credits added" : undefined} className="wg-b disabled:opacity-100">
      <span className="grid">
        <span className={cn("col-start-1 row-start-1 flex items-center justify-center gap-1.5 transition-opacity duration-150", claimed && "opacity-0")}>
          <HugeiconsIcon icon={GiftIcon} className="size-4" />
          Claim and start creating
        </span>
        {claimed && (
          <span className="col-start-1 row-start-1 flex items-center justify-center gap-1.5">
            <HugeiconsIcon icon={Tick02Icon} className="size-4" strokeWidth={2.5} style={{ animation: "wg-tick .4s cubic-bezier(.34,1.56,.64,1) .1s both" }} />
            <span style={{ animation: "wg-label .35s ease-out .2s both" }}>Credits added</span>
          </span>
        )}
      </span>
    </Button>
  )
}

/** The number comes into focus: each character sharpens out of a soft blur, then one gentle glow. */
function FocusNumber({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("flex tabular-nums", className)} style={{ lineHeight: 1 }} aria-label={value}>
      <span className="flex" style={{ animation: "wg-glow 1.6s ease-in-out 1s both" }}>
        {value.split("").map((ch, i) => (
          <span key={i} aria-hidden className="inline-block" style={{ animation: `wg-focus 1s cubic-bezier(.2,.7,.2,1) ${0.18 + i * 0.07}s both` }}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  )
}

/** Small sparkles drifting up through the panel. */
function Sparkles() {
  const bits = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        left: 6 + ((i * 37) % 88),
        bottom: 4 + ((i * 23) % 30),
        size: 4 + (i % 3) * 2,
        dur: 3.6 + (i % 5) * 0.7,
        delay: -((i * 0.83) % 5),
      })),
    [],
  )
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {bits.map((b, i) => (
        <svg
          key={i}
          viewBox="0 0 16 16"
          className="absolute text-white/60"
          style={{ left: `${b.left}%`, bottom: `${b.bottom}%`, width: b.size, height: b.size, animation: `wg-rise ${b.dur}s ease-out ${b.delay}s infinite` }}
        >
          <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="currentColor" />
        </svg>
      ))}
    </span>
  )
}
