import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, GiftIcon, Layers01Icon, Moon02Icon, Share08Icon, Sun03Icon, Tick02Icon, Video01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FlicksLogo } from "@/components/brand"
import { VIDEO_COST } from "@/components/credits-card"
import { cn } from "@/lib/utils"

export const WELCOME_CREDITS = 1000
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Once, right after workspace setup: a 1,000-credit welcome gift. The gift card waits to be opened;
 * Claim adds it to the balance (the number counts up, confetti), then Start creating goes to Create.
 */
export function WelcomeGiftPage({ name, onClaim, onDone, dark, onToggleTheme }: { name: string; onClaim: () => void; onDone: () => void; dark: boolean; onToggleTheme: () => void }) {
  const [claimed, setClaimed] = useState(false)
  const shown = useCount(claimed ? WELCOME_CREDITS : 0, 1100)
  const videos = Math.floor(WELCOME_CREDITS / VIDEO_COST)
  const flicks = Math.floor(videos / 5)
  const cta = useRef<HTMLButtonElement>(null)

  const claim = () => {
    if (claimed) return
    setClaimed(true)
    onClaim()
  }
  useEffect(() => {
    if (claimed) setTimeout(() => cta.current?.focus(), 50)
  }, [claimed])

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background px-6 py-5 text-foreground sm:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <header className="relative flex items-center justify-between">
        <FlicksLogo className="h-7 text-foreground" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={dark ? "Light theme" : "Dark theme"} onClick={onToggleTheme} className="text-muted-foreground">
              <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{dark ? "Light theme" : "Dark theme"}</TooltipContent>
        </Tooltip>
      </header>

      <main className="relative mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
        <div className="flex flex-col items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <HugeiconsIcon icon={GiftIcon} className="size-3.5" />
            Welcome gift
          </span>
          <h1 className="text-balance text-[32px] font-medium leading-[1.1] tracking-tight sm:text-[40px]">
            {claimed ? "It’s in your balance" : `${name ? `${name}, here’s` : "Here’s"} 1,000 credits on us`}
          </h1>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">
            {claimed ? "Make your first video. The cost shows before you generate." : `Enough for about ${videos} videos, or ${flicks} complete Flicks. Make something and see how it works.`}
          </p>
        </div>

        {/* the gift card */}
        <div className="relative [perspective:1200px]">
          {claimed && <Confetti />}
          <button
            type="button"
            onClick={claim}
            disabled={claimed}
            aria-label={claimed ? `${WELCOME_CREDITS.toLocaleString()} credits added` : `Claim ${WELCOME_CREDITS.toLocaleString()} credits`}
            className={cn(
              "group relative block aspect-[1.6] w-[min(360px,82vw)] overflow-hidden rounded-[28px] text-left text-white outline-none transition-transform duration-700 ease-[cubic-bezier(.2,.9,.3,1.2)] focus-visible:ring-4 focus-visible:ring-ring/40",
              "bg-[radial-gradient(120%_140%_at_0%_0%,oklch(0.78_0.17_55),oklch(0.6_0.2_38)_45%,oklch(0.36_0.13_30))] shadow-[0_30px_60px_-20px_oklch(0.5_0.18_40/0.55),0_0_0_1px_oklch(1_0_0/0.12)_inset]",
              claimed ? "scale-[1.04] [transform:rotateX(0deg)]" : "animate-[gift-float_5s_ease-in-out_infinite] hover:scale-[1.02] cursor-pointer",
            )}
          >
            {/* sheen and texture */}
            <span aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(115deg,transparent_0_18px,oklch(1_0_0/0.04)_18px_19px)]" />
            <span aria-hidden className={cn("absolute -inset-y-6 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent", claimed ? "animate-[gift-sheen_900ms_ease-out_1]" : "animate-[gift-sheen_3.6s_ease-in-out_infinite]")} />
            {/* a ribbon until it's opened */}
            <span aria-hidden className={cn("absolute inset-y-0 right-[22%] w-7 bg-white/20 shadow-[inset_1px_0_0_oklch(1_0_0/0.25),inset_-1px_0_0_oklch(1_0_0/0.25)] transition-all duration-500", claimed && "translate-y-full opacity-0")} />

            <span className="absolute inset-0 flex flex-col justify-between p-6">
              <span className="flex items-center justify-between">
                <FlicksLogo className="h-6 text-white" />
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">{claimed ? "Added" : "Welcome gift"}</span>
              </span>
              <span className="flex flex-col">
                <span className="text-[64px] font-semibold leading-none tracking-tight tabular-nums">{(claimed ? shown : WELCOME_CREDITS).toLocaleString()}</span>
                <span className="mt-1.5 text-sm text-white/80">Credits</span>
              </span>
            </span>

            {claimed && (
              <span aria-hidden className="absolute right-5 bottom-5 grid size-10 place-items-center rounded-full bg-white text-primary shadow-lg animate-in zoom-in-50 fade-in-0 duration-300">
                <HugeiconsIcon icon={Tick02Icon} className="size-5" />
              </span>
            )}
          </button>
        </div>

        {/* what it makes */}
        <ul className="grid w-full gap-2 text-left sm:grid-cols-3">
          <Perk icon={Video01Icon} title={`About ${videos} videos`} text="8 seconds, 1080×1920" />
          <Perk icon={Layers01Icon} title={`${flicks} complete Flicks`} text="A reference video and 4 variations each" />
          <Perk icon={Share08Icon} title="Share for free" text="Links and embeds cost nothing" />
        </ul>

        <div className="flex w-full flex-col items-center gap-2" aria-live="polite">
          {claimed ? (
            <Button ref={cta} size="lg" className="h-11 w-full max-w-xs gap-2 animate-in fade-in-0 duration-300" onClick={onDone}>
              Start creating
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>
          ) : (
            <Button size="lg" className="h-11 w-full max-w-xs gap-2" onClick={claim}>
              <HugeiconsIcon icon={GiftIcon} className="size-4" />
              Claim 1,000 credits
            </Button>
          )}
          <p className="text-xs text-muted-foreground">{claimed ? `Balance: ${WELCOME_CREDITS.toLocaleString()} credits. Get more any time from the sidebar.` : "One per account. Added to your credits balance."}</p>
        </div>
      </main>
    </div>
  )
}

function Perk({ icon, title, text }: { icon: typeof GiftIcon; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-card/70 p-3 ring-1 ring-foreground/5 backdrop-blur sm:flex-col sm:gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} className="size-4" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{text}</span>
      </span>
    </li>
  )
}

/** Counts up to `to` over `ms` (eased); instant with reduced motion. */
function useCount(to: number, ms: number) {
  const [n, setN] = useState(to)
  const from = useRef(to)
  useEffect(() => {
    if (reduced()) return setN(to)
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      setN(Math.round(a + (to - a) * e))
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return n
}

/** A one-off burst from behind the card. */
function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.3
        const dist = 160 + Math.random() * 140
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.75 - 40,
          r: Math.random() * 720 - 360,
          c: ["var(--primary)", "oklch(0.82 0.15 75)", "oklch(0.72 0.17 30)", "var(--chart-2)", "var(--foreground)"][i % 5],
          w: 6 + Math.random() * 6,
          d: Math.random() * 120,
        }
      }),
    [],
  )
  if (reduced()) return null
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-[2px]"
          style={
            {
              width: b.w,
              height: b.w * 0.45,
              background: b.c,
              "--x": `${b.x}px`,
              "--y": `${b.y}px`,
              "--r": `${b.r}deg`,
              animation: `gift-confetti 1300ms cubic-bezier(.15,.7,.3,1) ${b.d}ms both`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}
