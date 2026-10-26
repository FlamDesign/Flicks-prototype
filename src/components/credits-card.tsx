import { useState } from "react"
import { PendingButton } from "@/components/page-skeletons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  SparklesIcon,
  GiftIcon,
  WalletAdd02Icon,
  ArrowRight01Icon,
  Tick02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useDevState } from "@/dev/state"

// Pricing (internal only, never shown in the UI): $1 = 10 credits, +10% bonus credits from $1,000.
const CREDITS_PER_USD = 10

/**
 * Video generation cost: the model's per-second price at the output resolution, times the length,
 * in credits, rounded up. Each size renders at the smallest resolution that covers it: display ad
 * sizes (short side up to 480) at 480p, social and video sizes at 1080p.
 */
const USD_PER_SECOND = { "480p": 0.1065, "720p": 0.2389, "1080p": 0.5876 } as const
export const resolutionFor = (size: string) => {
  const [w, h] = size.split("×").map(Number)
  const short = Math.min(w, h) || 1080
  return short <= 480 ? "480p" : short <= 720 ? "720p" : "1080p"
}
export const videoCost = (size: string, seconds = 8) => Math.ceil(USD_PER_SECOND[resolutionFor(size)] * seconds * CREDITS_PER_USD - 1e-9)

/** A typical video (vertical, 8 seconds), for balance hints like "About 20 video generations". */
export const VIDEO_COST = videoCost("1080×1920", 8)
const LOW_BALANCE = VIDEO_COST * 2

const BONUS_FROM_USD = 1000
const BONUS_RATE = 0.1
export const creditsFor = (usd: number) => {
  const base = usd * CREDITS_PER_USD
  const bonus = usd >= BONUS_FROM_USD ? Math.round(base * BONUS_RATE) : 0
  return { base, bonus, total: base + bonus }
}

// Slider stops for one-time purchase ($100 to $10,000), denser at the low end.
const STOPS = [100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 10000]
const MAX_USD = STOPS[STOPS.length - 1]
// TODO: replace with the real sales contact link
const SALES_URL = "#contact-sales"
const SUGGESTED = [200, 500, 1000, 2500]

// Auto-reload ranges
const AUTO_MIN = 100
const AUTO_MAX = 1000

const usd = (n: number) => `$${n.toLocaleString()}`

const videos = (credits: number) => Math.floor(credits / VIDEO_COST)
const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`

/** Sidebar credit balance and Get credits in one group. One-time purchases only. */
export function CreditsCard({
  credits,
  onAdd,
  buy,
  setBuy,
  autoOpen,
  setAutoOpen,
}: {
  credits: number
  onAdd: (credits: number) => void
  buy: boolean
  setBuy: (o: boolean) => void
  autoOpen: boolean
  setAutoOpen: (o: boolean) => void
}) {
  const { state: dev, update: setDev } = useDevState()
  const autoTopUp: AutoTopUp = { enabled: dev.autoReload, threshold: dev.autoReloadAt, target: dev.autoReloadTo }
  const setAutoTopUp = (v: AutoTopUp) => setDev({ autoReload: v.enabled, autoReloadAt: v.threshold, autoReloadTo: v.target })
  const low = credits < LOW_BALANCE
  const hint = credits < VIDEO_COST ? "Not enough for a video" : `About ${plural(videos(credits), "video generation")}`

  return (
    <>
      <div
        role="group"
        aria-label="Credits"
        className={cn("flex items-center justify-between gap-2 rounded-full border bg-background p-1 pl-3", low && "border-primary/40")}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className={cn("flex items-center gap-1.5 text-sm font-semibold tabular-nums outline-none", low && "text-primary")}>
              <HugeiconsIcon icon={SparklesIcon} className="size-3.5 text-primary" />
              {credits.toLocaleString()}
              <span className="sr-only">credits</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{hint}</TooltipContent>
        </Tooltip>
        <Button size="sm" variant={low ? "default" : "secondary"} className="rounded-full px-3" onClick={() => setBuy(true)}>
          Get more
        </Button>
      </div>

      <BuyCreditsDialog
        open={buy}
        onOpenChange={setBuy}
        balance={credits}
        onPurchased={onAdd}
        autoTopUp={autoTopUp}
        onAutoTopUp={() => setAutoOpen(true)}
      />
      <AutoTopUpDialog open={autoOpen} onOpenChange={setAutoOpen} value={autoTopUp} onSave={setAutoTopUp} />
    </>
  )
}

type Step = "amount" | "done"

/**
 * Purchase flow:
 * 1. amount: slider + suggestions + bonus offer, then "Continue to payment" hands off to Stripe Checkout
 * 2. done: shown when Stripe returns after a successful payment
 */
function BuyCreditsDialog({
  open,
  onOpenChange,
  balance,
  onPurchased,
  autoTopUp,
  onAutoTopUp,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  balance: number
  onPurchased: (credits: number) => void
  autoTopUp: AutoTopUp
  onAutoTopUp: () => void
}) {
  const [i, setI] = useState(STOPS.indexOf(500))
  const [step, setStep] = useState<Step>("amount")
  const [paying, setPaying] = useState(false)

  const amount = STOPS[i]
  const { total, bonus } = creditsFor(amount)
  const firstBonusStop = BONUS_FROM_USD

  const change = (o: boolean) => {
    if (!o) {
      // reset after the close animation
      setTimeout(() => {
        setStep("amount")
        setPaying(false)
      }, 200)
    }
    onOpenChange(o)
  }

  const pay = () => {
    setPaying(true)
    setTimeout(() => {
      // stand-in for redirect to Stripe Checkout and return on success
      setPaying(false)
      onPurchased(total)
      setStep("done")
    }, 1200)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="gap-5 sm:max-w-md">
        {step === "amount" && (
          <>
            <DialogHeader>
              <DialogTitle>Get credits</DialogTitle>
              <DialogDescription>Credits are used for AI video generation.</DialogDescription>
            </DialogHeader>

            {/* Offer first: nudge below the threshold, confirmation once it applies (same height, no layout shift) */}
            {bonus > 0 ? (
              <div className="flex h-11 items-center gap-3 rounded-xl border border-transparent bg-primary/10 px-3 text-sm">
                <HugeiconsIcon icon={GiftIcon} className="size-4 shrink-0 text-primary" />
                <span className="flex-1 font-medium">{BONUS_RATE * 100}% bonus applied</span>
                <span className="font-semibold tabular-nums text-primary">+{bonus.toLocaleString()} credits</span>
              </div>
            ) : (
              <div className="flex h-11 items-center gap-3 rounded-xl border border-dashed border-primary/40 px-3 text-sm">
                <HugeiconsIcon icon={GiftIcon} className="size-4 shrink-0 text-primary" />
                <span className="flex-1">
                  Get <span className="font-medium">{BONUS_RATE * 100}% extra credits</span> on {usd(BONUS_FROM_USD)}+
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="-mr-1 h-7 rounded-full px-2.5 text-primary hover:text-primary"
                  onClick={() => setI(STOPS.indexOf(firstBonusStop))}
                >
                  Try {usd(firstBonusStop)}
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">{usd(amount)}</p>
                <p className="pt-1 text-sm text-muted-foreground tabular-nums">
                  {total.toLocaleString()} credits · about {plural(videos(total), "video generation")}
                </p>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[i]}
                  min={0}
                  max={STOPS.length - 1}
                  step={1}
                  onValueChange={([v]) => setI(v)}
                  aria-label="Amount"
                  aria-valuetext={usd(amount)}
                />
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{usd(STOPS[0])}</span>
                  <span>{usd(MAX_USD)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED.map((v) => {
                  const on = amount === v
                  return (
                    <Button
                      key={v}
                      size="sm"
                      variant="outline"
                      aria-pressed={on}
                      className={cn(
                        "gap-1 rounded-full px-3 tabular-nums",
                        on && "border-foreground bg-foreground/5 hover:bg-foreground/5 dark:border-foreground dark:bg-foreground/10",
                      )}
                      onClick={() => setI(STOPS.indexOf(v))}
                    >
                      {usd(v)}
                      {v >= BONUS_FROM_USD && <span className="text-[11px] font-semibold text-primary">+{BONUS_RATE * 100}%</span>}
                    </Button>
                  )
                })}
              </div>
            </div>

            <Separator />

            <Button
              variant="ghost"
              onClick={onAutoTopUp}
              className="-my-2 -mx-2 h-auto justify-start gap-3 rounded-xl px-2 py-2 text-left font-normal"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon icon={WalletAdd02Icon} className="size-4" />
              </span>
              <span className="flex-1">Auto-reload</span>
              <span className={cn("text-sm font-medium", autoTopUp.enabled ? "text-primary" : "text-muted-foreground")}>
                {autoTopUp.enabled ? "On" : "Off"}
              </span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
            </Button>

            <Separator />

            <DialogFooter className="items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Need more?{" "}
                <a href={SALES_URL} className="font-medium text-foreground underline-offset-4 hover:underline">
                  Contact sales
                </a>
              </p>
              <Button onClick={pay} disabled={paying}>
                {paying ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                    Redirecting
                  </>
                ) : (
                  "Continue to payment"
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={Tick02Icon} className="size-6" />
            </span>
            <DialogHeader className="items-center text-center">
              <DialogTitle className="text-lg">{total.toLocaleString()} credits added</DialogTitle>
              <DialogDescription>
                New balance {balance.toLocaleString()} credits · about {plural(videos(balance), "video generation")}
              </DialogDescription>
            </DialogHeader>
            {!autoTopUp.enabled && (
              <Button
                variant="outline"
                onClick={onAutoTopUp}
                className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-left font-normal"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon icon={WalletAdd02Icon} className="size-4" />
              </span>
                <span className="flex-1">
                  <span className="font-medium">Never run out</span>
                  <span className="block text-xs text-muted-foreground">Turn on auto-reload</span>
                </span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
              </Button>
            )}
            <Button className="w-full" onClick={() => change(false)}>Start creating</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export type AutoTopUp = { enabled: boolean; threshold: number; target: number }

/** Auto-reload: when credits drop below a dollar-equivalent threshold, buy a fixed amount. */
function AutoTopUpDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  value: AutoTopUp
  onSave: (v: AutoTopUp) => void
}) {
  const [threshold, setThreshold] = useState(String(value.threshold))
  const [target, setTarget] = useState(String(value.target))
  const t = Number(threshold)
  const g = Number(target)
  const inRange = (raw: string, n: number) => raw !== "" && n >= AUTO_MIN && n <= AUTO_MAX
  const tErr = !inRange(threshold, t) ? `Enter ${usd(AUTO_MIN)} to ${usd(AUTO_MAX)}` : undefined
  const gErr = !inRange(target, g) ? `Enter ${usd(AUTO_MIN)} to ${usd(AUTO_MAX)}` : undefined
  const ok = !tErr && !gErr
  const changed = t !== value.threshold || g !== value.target

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setThreshold(String(value.threshold))
          setTarget(String(value.target))
        }
        onOpenChange(o)
      }}
    >
      <DialogContent className="gap-6 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{value.enabled ? "Auto-reload" : "Turn on auto-reload?"}</DialogTitle>
          <DialogDescription>Automatically buy more credits when you’re running low.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <MoneyField id="reload-at" label="When credits drop below:" value={threshold} onChange={setThreshold} error={tErr} />
          <MoneyField id="reload-to" label="Add:" value={target} onChange={setTarget} error={gErr} />
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {value.enabled ? (
            <Button
              variant="ghost"
              className="-ml-2 text-muted-foreground"
              onClick={() => {
                onSave({ ...value, enabled: false })
                onOpenChange(false)
              }}
            >
              Turn off
            </Button>
          ) : (
            <Button variant="ghost" className="-ml-2 text-muted-foreground" onClick={() => onOpenChange(false)}>
              Not now
            </Button>
          )}
          <PendingButton
            disabled={!ok || (value.enabled && !changed)}
            onClick={() => {
              onSave({ enabled: true, threshold: t, target: g })
              onOpenChange(false)
            }}
          >
            {value.enabled ? "Save" : "Turn on"}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-normal">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="pl-[1.3rem] tabular-nums"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
