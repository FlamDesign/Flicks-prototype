import { WELCOME_CREDITS } from "@/components/welcome-gift-page"
import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, ArrowLeft01Icon, Loading03Icon, MailOpen01Icon, Moon02Icon, Sun03Icon, TimeQuarterPassIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FlicksLogo } from "@/components/brand"
import { useDevState } from "@/dev/state"
import { useDevAction } from "@/dev/dev-actions"
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

type Step = "email" | "sent" | "expired"
const RESEND_AFTER = 30
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** A few links in a row is fine; past this, ask them to wait. */
const MAX_SENDS = 4
/** Common slips in the domain, and what was meant. */
const TYPOS: [RegExp, string][] = [
  [/\.(con|cmo|ocm|vom|comm|coom|cm)$/, ".com"],
  [/\.(nte|ent|nett)$/, ".net"],
  [/\.(ogr|rog|orgg)$/, ".org"],
]

/** What's wrong with an email, if anything, and a likely fix. */
function checkEmail(raw: string): { error?: string; suggestion?: string } {
  const v = raw.trim()
  if (!v) return { error: "Enter your email." }
  if (/\s/.test(v)) return { error: "Email addresses can’t have spaces." }
  if (!v.includes("@")) return { error: "Add the @ and the rest of the address, like you@example.com." }
  if (!EMAIL.test(v)) return { error: "That doesn’t look like a full email. Try you@example.com." }
  const [user, domain] = [v.slice(0, v.lastIndexOf("@")), v.slice(v.lastIndexOf("@") + 1).toLowerCase()]
  for (const [re, fix] of TYPOS) if (re.test(domain)) return { error: "Check the end of the address.", suggestion: `${user}@${domain.replace(re, fix)}` }
  return {}
}

/**
 * Sign in: any email gets a one-time sign-in link (no passwords), or Google.
 * The other half is a live Flick: one escalator shot, four people, switching in sync.
 */
export function LoginPage({
  onSignIn,
  dark,
  onToggleTheme,
}: {
  /** signed in with this email (and name, from Google) */
  onSignIn: (email: string, name?: string) => void
  dark: boolean
  onToggleTheme: () => void
}) {
  const { state: dev } = useDevState()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  // problems after the email itself is fine: the link didn't send, Google failed, too many links
  const [sendError, setSendError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [sends, setSends] = useState(0)
  const [sending, setSending] = useState(false)
  const [google, setGoogle] = useState(false)
  const [, setOpening] = useState(false)
  const [wait, setWait] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  // resend countdown
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  /** Validates, then sends (or resends) the link. Failures stay on the current screen with a reason. */
  const deliver = (onSent: () => void) => {
    if (sends >= MAX_SENDS) return setSendError("You’ve asked for several links. Wait 10 minutes, or use the most recent one.")
    if (!navigator.onLine) return setSendError("You’re offline. Reconnect, then try again.")
    setSendError(null)
    setGoogleError(null)
    setSending(true)
    // stand-in for the request
    setTimeout(() => {
      setSending(false)
      if (dev.signinSendFails) return setSendError("We couldn’t send the link. Check your connection and try again.")
      setSends((n) => n + 1)
      onSent()
    }, 900)
  }
  const validate = (value = email) => {
    const r = checkEmail(value)
    setError(r.error ?? null)
    setSuggestion(r.suggestion ?? null)
    return !r.error
  }
  const send = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!validate()) return input.current?.focus()
    deliver(() => {
      setStep("sent")
      setWait(RESEND_AFTER)
    })
  }
  const resend = () =>
    deliver(() => {
      setStep("sent")
      setWait(RESEND_AFTER)
    })
  // prototype only: what happens when the emailed link is opened
  const openLink = () => {
    setOpening(true)
    setTimeout(() => {
      setOpening(false)
      if (dev.linkExpired) setStep("expired")
      else onSignIn(email.trim())
    }, 700)
  }
  // prototype only: the dev tools offer "Open sign-in link" while a link is out
  useDevAction(step === "sent" ? { id: "open-link", label: "Open sign-in link", run: openLink } : null)
  const withGoogle = () => {
    setGoogleError(null)
    setSendError(null)
    setGoogle(true)
    setTimeout(() => {
      if (!dev.googleFails) return onSignIn("divyansh@flamapp.ai", "Divyansh Gupta")
      setGoogle(false)
      setGoogleError("Couldn’t sign in with Google. Try again, or use your email.")
    }, 1100)
  }
  const reset = () => {
    setSendError(null)
    setStep("email")
    setWait(0)
    setTimeout(() => input.current?.focus(), 0)
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* sign in */}
      <div className="flex min-h-screen flex-col px-6 py-5 sm:px-10">
        <header className="flex items-center justify-between">
          <FlicksLogo className="h-7 text-foreground" />
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={dark ? "Light theme" : "Dark theme"} onClick={onToggleTheme} className="text-muted-foreground">
                  <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{dark ? "Light theme" : "Dark theme"}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          {step === "email" && (
            <div key="email" className="animate-in fade-in-0 slide-in-from-bottom-1 flex flex-col duration-300">
              <h1 className="text-balance text-[28px] font-medium leading-[1.15] tracking-tight">Welcome to Flicks</h1>
              <p className="mt-2.5 text-pretty text-sm text-muted-foreground">
                Sign up and get {WELCOME_CREDITS.toLocaleString()} free credits.
              </p>

              {/* not a <form>: sandboxed previews block form submits, so Enter and the button call send directly */}
              <div
                role="form"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
                    e.preventDefault()
                    send()
                  }
                }}
                className="mt-8 flex flex-col gap-2"
              >
                <Label htmlFor="login-email">Email</Label>
                <Input
                  ref={input}
                  id="login-email"
                  maxLength={254}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) (setError(null), setSuggestion(null))
                    if (sendError) setSendError(null)
                  }}
                  // check once they leave the field, if they typed something
                  onBlur={(e) => email.trim() && !(e.relatedTarget as HTMLElement | null)?.closest("[data-no-validate]") && validate()}
                  placeholder="you@example.com"
                  aria-invalid={!!error || undefined}
                  aria-describedby="login-email-hint"
                  className="h-11"
                />
                <p id="login-email-hint" className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
                  {error ?? "No password needed. We’ll email you a link to sign in."}
                  {suggestion && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(suggestion)
                          validate(suggestion)
                          input.current?.focus()
                        }}
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        Use {suggestion}
                      </button>
                    </>
                  )}
                </p>
                <Button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => send()} size="lg" disabled={sending || google} className="mt-2 h-11 gap-2">
                  {sending && <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />}
                  {sending ? "Sending link…" : "Email me a sign-in link"}
                </Button>
                {sendError && <Problem>{sendError}</Problem>}
              </div>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" size="lg" disabled={sending || google} onClick={withGoogle} data-no-validate className="h-11 gap-2">
                {google ? <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" /> : <GoogleLogo className="size-4" />}
                {google ? "Connecting to Google…" : "Continue with Google"}
              </Button>
              {googleError && <Problem className="mt-2">{googleError}</Problem>}
            </div>
          )}

          {step === "sent" && (
            <div key="sent" className="animate-in fade-in-0 slide-in-from-bottom-1 flex flex-col duration-300">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={MailOpen01Icon} className="size-6" />
              </span>
              <h1 className="mt-6 text-[28px] font-medium leading-[1.15] tracking-tight">Check your inbox</h1>
              <p className="mt-2.5 text-pretty text-sm text-muted-foreground">
                We sent a sign-in link to <span className="font-medium text-foreground">{email.trim()}</span>. Open it on this device. It works once, for 15 minutes.
              </p>


              <div className="mt-6 flex flex-col gap-1 text-sm">
                <p className="text-muted-foreground">
                  Nothing yet? Check spam or promotions, or{" "}
                  {wait > 0 ? (
                    <span className="tabular-nums">resend in {wait}s</span>
                  ) : (
                    <button type="button" onClick={resend} disabled={sending} className="font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-60">
                      {sending ? "sending…" : "send it again"}
                    </button>
                  )}
                  .
                </p>
                {sendError && <Problem className="mt-2">{sendError}</Problem>}
              </div>
              <Button variant="ghost" className="mt-6 gap-1.5 self-start px-2 text-muted-foreground" onClick={reset}>
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                Use a different email
              </Button>
            </div>
          )}

          {step === "expired" && (
            <div key="expired" className="animate-in fade-in-0 slide-in-from-bottom-1 flex flex-col duration-300">
              <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-500">
                <HugeiconsIcon icon={TimeQuarterPassIcon} className="size-6" />
              </span>
              <h1 className="mt-6 text-[28px] font-medium leading-[1.15] tracking-tight">This link has expired</h1>
              <p className="mt-2.5 text-pretty text-sm text-muted-foreground">
                Sign-in links work once, for 15 minutes. We’ll send a fresh one to <span className="font-medium text-foreground">{email.trim()}</span>.
              </p>
              <Button size="lg" className="mt-8 h-11 gap-2" disabled={sending} onClick={resend}>
                {sending && <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />}
                {sending ? "Sending link…" : "Email me a new link"}
              </Button>
              {sendError && <Problem className="mt-2">{sendError}</Problem>}
              <Button variant="ghost" className="mt-3 gap-1.5 self-start px-2 text-muted-foreground" onClick={reset}>
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                Use a different email
              </Button>
            </div>
          )}
        </main>

        <footer className="pb-1 text-xs text-muted-foreground">
          By continuing, you agree to Flam’s{" "}
          <a href="https://flamapp.ai/legal/terms" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-primary">
            Terms of Use
          </a>{" "}
          and{" "}
          <a href="https://flamapp.ai/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </footer>
      </div>

      {/* a Flick, live */}
      {/* on the left on wide screens; the form stays first in the page order, for phones and screen readers */}
      <div className="hidden p-3 lg:order-first lg:block">
        <FlickShowcase />
      </div>
    </div>
  )
}

/** The Google mark from the shadcn sign-in blocks (single colour, follows the text). */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  )
}

/** A problem after the email itself was fine: a short line with a warning icon. */
function Problem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn("flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive", className)}>
      <HugeiconsIcon icon={Alert02Icon} className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  )
}

/** The escalator Flick: one shot, four people. Every variation has the same moves at the same moment, so a tap swaps who is in it, not where they are. */
const LOOKS = [
  { name: "Soft pink", video: softPink, webm: softPinkWebm, poster: softPinkPoster, thumb: softPinkThumb },
  { name: "Street", video: street, webm: streetWebm, poster: streetPoster, thumb: streetThumb },
  { name: "Office", video: office, webm: officeWebm, poster: officePoster, thumb: officeThumb },
  { name: "Court", video: court, webm: courtWebm, poster: courtPoster, thumb: courtThumb },
]
const CYCLE = 4000

/** One Flick, every look: tap a look and the video switches in place, in sync; it moves on by itself until tapped. */
export function FlickShowcase() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const videos = useRef<(HTMLVideoElement | null)[]>([])
  // keep the incoming video on the same frame as the one showing, so the swap is seamless
  const show = (i: number) =>
    setActive((cur) => {
      const from = videos.current[cur]
      const to = videos.current[i]
      if (from && to && i !== cur) {
        to.currentTime = from.currentTime
        void to.play().catch(() => {})
      }
      return i
    })
  useEffect(() => {
    if (!auto) return
    const t = setTimeout(() => show((active + 1) % LOOKS.length), CYCLE)
    return () => clearTimeout(t)
  }, [active, auto])
  // after a tap, wait a while before moving on again
  useEffect(() => {
    if (auto) return
    const t = setTimeout(() => setAuto(true), 12000)
    return () => clearTimeout(t)
  }, [auto, active])

  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-[28px] bg-neutral-200 dark:bg-neutral-800">
      {/* behind the square: the same scene, blurred, so any panel shape is filled without black bars */}
      {LOOKS.map((l, i) => (
        <img
          key={l.name}
          src={l.poster}
          alt=""
          aria-hidden
          className={cn("absolute inset-0 size-full scale-110 object-cover blur-2xl", i === active ? "opacity-100" : "opacity-0")}
        />
      ))}
      <div aria-hidden className="absolute inset-0 bg-black/10" />

      {/* the Flick: the whole square shows, head to the items on the bottom step, whatever the panel shape */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ containerType: "size" }}>
        <div
          className="relative overflow-hidden"
          // soft edges so the square melts into the blurred scene instead of a hard line
          style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)", maskImage: "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent), linear-gradient(to right, transparent, black 5%, black 95%, transparent)", maskComposite: "intersect", WebkitMaskComposite: "source-in" }}
        >
          {LOOKS.map((l, i) => (
            <video
              key={l.name}
              ref={(el) => {
                videos.current[i] = el
              }}
              poster={l.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
              className={cn("absolute inset-0 size-full object-cover", i === active ? "opacity-100" : "opacity-0")}
            >
              <source src={l.webm} type="video/webm" />
              <source src={l.video} type="video/mp4" />
            </video>
          ))}
        </div>
      </div>

      {/* what it is, small, top left */}
      <p className="absolute left-4 top-4 max-w-[60%] rounded-full bg-black/35 px-3 py-1.5 text-xs text-white backdrop-blur-md">Tap a thumbnail to try it</p>

      {/* the looks: the same strip viewers tap in a Flick, floating over the steel on the right */}
      <div role="radiogroup" aria-label="Looks in this Flick" className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2 rounded-[22px] bg-white/20 p-1.5 ring-1 ring-white/30 backdrop-blur-xl">
        {LOOKS.map((l, i) => (
          <button
            key={l.name}
            type="button"
            role="radio"
            aria-checked={i === active}
            aria-label={l.name}
            onClick={() => (show(i), setAuto(false))}
            className={cn(
              "relative size-14 overflow-hidden rounded-2xl outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white",
              i === active ? "ring-2 ring-white" : "opacity-70 hover:opacity-100",
            )}
          >
            <img src={l.thumb} alt="" className="size-full object-cover" />
            {/* time until it moves on */}
            {i === active && auto && <span key={active} className="showcase-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary" style={{ animationDuration: `${CYCLE}ms` }} />}
          </button>
        ))}
      </div>
    </div>
  )
}
