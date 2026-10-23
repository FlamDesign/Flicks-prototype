import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Joystick01Icon, Loading03Icon, Megaphone01Icon, Moon02Icon, Share08Icon, Sun03Icon, Tick02Icon, Video01Icon, WebDesign01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FlicksLogo } from "@/components/brand"
import { FlickShowcase } from "@/components/login-page"
import { INDUSTRIES } from "@/data"
import { cn } from "@/lib/utils"

export type Profile = {
  name: string
  company: string
  website: string
  goals: string[]
  type: string
  size: string
  industry: string
}

/** What people come to Flicks for; more than one can apply. */
export const GOALS = [
  { id: "ads", title: "Run interactive ads", hint: "Campaigns people tap through to pick a product", icon: Megaphone01Icon },
  { id: "videos", title: "Create product videos", hint: "From a prompt and a few product photos", icon: Video01Icon },
  { id: "website", title: "Add Flicks to my website", hint: "Shoppable videos on product and landing pages", icon: WebDesign01Icon },
  { id: "social", title: "Make videos for social", hint: "Short videos for feeds and stories", icon: Share08Icon },
  { id: "explore", title: "Just exploring", hint: "Play around and see what it can do", icon: Joystick01Icon },
]
export const TYPES = ["Brand", "Agency", "Publisher", "Freelancer or creator"]
export const SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"]
export const INDUSTRY_OPTIONS = [...new Set([...INDUSTRIES, "Sports & fitness", "Media & entertainment", "Finance", "Other"])]
const PERSONAL = ["gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com"]

type Errors = Partial<Record<keyof Profile, string>>
const STEPS = 3

/**
 * First sign-in only, one short question set at a time: you and your company, what you're here for,
 * the company itself, then where you are. A live Flick plays alongside.
 */
export function OnboardingPage({
  email,
  initialName,
  onDone,
  onSignOut,
  dark,
  onToggleTheme,
}: {
  email: string
  /** known already when signing in with Google */
  initialName?: string
  onDone: (p: Profile) => void
  onSignOut: () => void
  dark: boolean
  onToggleTheme: () => void
}) {
  const domain = email.split("@")[1]?.toLowerCase() ?? ""
  const [p, setP] = useState<Profile>({
    name: initialName ?? "",
    company: "",
    // a work email's domain is usually the company site
    website: domain && !PERSONAL.includes(domain) ? domain : "",
    goals: [],
    type: "",
    size: "",
    industry: "",
  })
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const main = useRef<HTMLDivElement>(null)
  const company = p.company.trim() || "your company"

  // each step starts at its first field
  useEffect(() => {
    const first = main.current?.querySelector<HTMLElement>("input:not([type=hidden]), [role=checkbox], [role=radio], button[role=combobox]")
    first?.focus({ preventScroll: true })
  }, [step])

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setP((x) => ({ ...x, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const fieldError = (k: keyof Profile, x: Profile = p) => profileFieldError(k, x)
  /** The fields on each step, in order. */
  const STEP_FIELDS: (keyof Profile)[][] = [["name", "company", "website"], ["goals"], ["type", "size", "industry"]]
  const check = (s: number): Errors => {
    const e: Errors = {}
    for (const k of STEP_FIELDS[s]) {
      const err = fieldError(k)
      if (err) e[k] = err
    }
    return e
  }
  /** On leaving a text field: show its problem, if it has one. */
  const blur = (k: keyof Profile) => () => {
    // an untouched empty field waits for Continue
    if (!String(p[k]).trim() && !errors[k]) return
    const err = fieldError(k)
    setErrors((e) => ({ ...e, [k]: err }))
  }
  const next = (e?: React.FormEvent) => {
    e?.preventDefault()
    const found = check(step)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) return document.getElementById(`ob-${first}`)?.focus()
    if (step < STEPS - 1) return setStep(step + 1)
    setSaving(true)
    setTimeout(
      () =>
        onDone({
          ...p,
          website: p.website.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase(),
        }),
      900,
    )
  }
  const back = () => (setErrors({}), setStep((s) => Math.max(0, s - 1)))
  const toggleGoal = (id: string) =>
    set("goals", p.goals.includes(id) ? p.goals.filter((g) => g !== id) : [...p.goals, id])

  const titles = [
    ["Let’s set up your workspace", "A few quick questions so templates and examples fit your brand. You can change any of this later."],
    ["What brings you to Flicks?", "Pick all that apply. We’ll start you in the right place."],
    [`Tell us about ${company}`, "This helps us suggest the right templates and plan."],
  ]

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
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

        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
          {/* progress: one segment per step */}
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label="Setup progress">
              {Array.from({ length: STEPS }, (_, i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {step + 1} of {STEPS}
            </span>
          </div>

          <div key={step} ref={main} className="animate-in fade-in-0 slide-in-from-right-2 mt-8 duration-300">
            <h1 className="text-balance text-[28px] font-medium leading-[1.15] tracking-tight">{titles[step][0]}</h1>
            <p className="mt-2.5 text-pretty text-sm text-muted-foreground">{titles[step][1]}</p>

            {/* not a <form>: sandboxed previews block form submits, so Enter and the button call next directly */}
              <div
                role="form"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
                    e.preventDefault()
                    next()
                  }
                }}
                className="mt-8 flex flex-col gap-6"
              >
              {step === 0 && (
                <>
                  <Field id="name" label="Your name" error={errors.name}>
                    <Input id="ob-name" maxLength={60} onBlur={blur("name")} value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Alex Morgan" autoComplete="name" aria-invalid={!!errors.name || undefined} className="h-11" />
                  </Field>
                  <Field id="company" label="Company or brand" hint={errors.company ? undefined : "Working for yourself? Use your own name or your studio’s."} error={errors.company}>
                    <Input id="ob-company" maxLength={80} onBlur={blur("company")} value={p.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme" autoComplete="organization" aria-invalid={!!errors.company || undefined} className="h-11" />
                  </Field>
                  <Field id="website" label="Company website" error={errors.website}>
                    <div className={cn("flex h-11 items-center overflow-hidden rounded-2xl bg-input/50 focus-within:ring-3 focus-within:ring-ring/30", errors.website && "ring-3 ring-destructive/20")}>
                      <span className="flex h-full items-center pl-3 text-sm text-muted-foreground">https://</span>
                      <input
                        id="ob-website"
                        maxLength={120}
                        onBlur={blur("website")}
                        inputMode="url"
                        autoComplete="url"
                        value={p.website}
                        onChange={(e) => set("website", e.target.value.replace(/^https?:\/\//, ""))}
                        placeholder="company.com"
                        aria-invalid={!!errors.website || undefined}
                        className="h-full min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </Field>
                </>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-2">
                  <div id="ob-goals" tabIndex={-1} className="flex flex-col gap-2 outline-none" aria-label="What brings you to Flicks" role="group">
                    {GOALS.map((g) => {
                      const on = p.goals.includes(g.id)
                      return (
                        <button
                          key={g.id}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => toggleGoal(g.id)}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl p-3 text-left outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                            on ? "bg-primary/5 ring-primary/50" : errors.goals ? "ring-destructive/40 hover:bg-muted/60" : "ring-foreground/10 hover:bg-muted/60",
                          )}
                        >
                          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            <HugeiconsIcon icon={g.icon} className="size-5" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-medium">{g.title}</span>
                            <span className="text-xs text-muted-foreground">{g.hint}</span>
                          </span>
                          <span className={cn("grid size-5 shrink-0 place-items-center rounded-md ring-1 transition-colors", on ? "bg-primary text-primary-foreground ring-primary" : "ring-foreground/20")}>
                            {on && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.5} />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.goals && <p className="text-xs text-destructive">{errors.goals}</p>}
                </div>
              )}

              {step === 2 && (
                <>
                  <Field id="type" label={`${p.company.trim() || "Your company"} is a`} error={errors.type}>
                    <Chips id="ob-type" options={TYPES} value={p.type} onChange={(v) => set("type", v)} invalid={!!errors.type} />
                  </Field>
                  <Field id="size" label="How many people work there?" error={errors.size}>
                    <Chips id="ob-size" options={SIZES} value={p.size} onChange={(v) => set("size", v)} invalid={!!errors.size} suffix=" people" />
                  </Field>
                  <Field id="industry" label="Industry" error={errors.industry}>
                    <Select value={p.industry} onValueChange={(v) => set("industry", v)}>
                      <SelectTrigger id="ob-industry" aria-invalid={!!errors.industry || undefined} className="h-11! w-full">
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((x) => (
                          <SelectItem key={x} value={x}>
                            {x}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}

              <div className="mt-2 flex items-center gap-2">
                {step > 0 && (
                  <Button type="button" variant="ghost" size="lg" onClick={back} disabled={saving} className="h-11 gap-1.5 px-3 text-muted-foreground">
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                    Back
                  </Button>
                )}
                <Button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => next()} size="lg" disabled={saving} className="h-11 flex-1 gap-2">
                  {saving && <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />}
                  {saving ? "Setting up your workspace…" : step < STEPS - 1 ? "Continue" : "Finish and open Flicks"}
                </Button>
              </div>
            </div>
          </div>
        </main>

        <footer className="pb-1 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email}</span>.{" "}
          <button type="button" onClick={onSignOut} className="underline underline-offset-4 hover:text-foreground">
            Not you?
          </button>
        </footer>
      </div>

      {/* on the left on wide screens; the form stays first in the page order, for phones and screen readers */}
      <div className="hidden p-3 lg:order-first lg:block">
        <FlickShowcase />
      </div>
    </div>
  )
}

export function Field({ id, label, optional, hint, error, children }: { id: string; label: string; optional?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`ob-${id}`}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {(error || hint) && <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>{error ?? hint}</p>}
    </div>
  )
}

/** One choice from a short list, as chips. */
export function Chips({ id, options, value, onChange, invalid, suffix }: { id: string; options: string[]; value: string; onChange: (v: string) => void; invalid?: boolean; suffix?: string }) {
  return (
    <div role="radiogroup" id={id} tabIndex={-1} aria-invalid={invalid || undefined} className="flex flex-wrap gap-2 outline-none">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          aria-label={suffix && /\d/.test(o) ? `${o}${suffix}` : o}
          onClick={() => onChange(o)}
          className={cn(
            "h-9 rounded-full px-3.5 text-sm outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
            value === o ? "bg-primary/10 font-medium text-primary ring-primary/40" : invalid ? "ring-destructive/40 hover:bg-muted" : "ring-foreground/10 hover:bg-muted",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/** Standard checks for one profile field (shared by onboarding and the account page). */
export function profileFieldError(k: keyof Profile, x: Profile): string | undefined {
  const v = typeof x[k] === "string" ? (x[k] as string).trim() : ""
  switch (k) {
    case "name":
      if (!v) return "Enter your name."
      if (v.length < 2) return "Enter your full name."
      if (!/^[\p{L}\p{M}][\p{L}\p{M}'’ .-]*$/u.test(v)) return "Use letters, spaces, hyphens or apostrophes only."
      return
    case "company":
      if (!v) return "Enter your company or brand name."
      if (v.length < 2) return "Company names need at least 2 characters."
      return
    case "website": {
      if (!v) return "Enter your company’s website."
      const site = v.replace(/^https?:\/\//i, "").replace(/\/$/, "")
      if (/\s/.test(site) || !/^([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(site)) return "Enter a website like company.com."
      return
    }
    case "goals":
      return x.goals.length ? undefined : "Pick at least one."
    case "type":
      return v ? undefined : "Pick one."
    case "size":
      return v ? undefined : "Pick a size."
    case "industry":
      return v ? undefined : "Pick an industry."
  }
}
