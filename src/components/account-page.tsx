import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, LockIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui-extra/toaster"
import { Field, profileFieldError, type Profile } from "@/components/onboarding-page"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { PageShell } from "@/components/page-kit"

type Errors = Partial<Record<keyof Profile, string>>
const EDITABLE: (keyof Profile)[] = ["name", "company", "website"]

/**
 * Account: your details and your company's name and website, all editable except the sign-in email.
 * What onboarding asks once (company type, size, industry, what you use Flicks for) isn't shown here.
 * Changes collect until Save changes (a bar appears at the bottom); Discard puts everything back.
 */
export function AccountPage({
  email,
  profile,
  photo,
  onSave,
  onPhoto,
  onSignOut,
}: {
  email: string
  profile: Profile
  photo?: string
  onSave: (p: Profile) => void
  onPhoto: (src: string | undefined) => void
  onSignOut: () => void
}) {
  const toast = useToast()
  const [p, setP] = useState<Profile>(profile)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => setP(profile), [profile])

  const dirty = JSON.stringify(p) !== JSON.stringify(profile)
  const initials = (p.name.trim() || email).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setP((x) => ({ ...x, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const blur = (k: keyof Profile) => () => setErrors((e) => ({ ...e, [k]: profileFieldError(k, p) }))
  const save = () => {
    const found: Errors = {}
    for (const k of EDITABLE) {
      const err = profileFieldError(k, p)
      if (err) found[k] = err
    }
    setErrors(found)
    const first = EDITABLE.find((k) => found[k])
    // after the click has settled, so focus isn't left on the Save button
    if (first) return void setTimeout(() => document.getElementById(`ob-${first}`)?.focus(), 0)
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      onSave({ ...p, name: p.name.trim(), company: p.company.trim(), website: p.website.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase() })
      toast("Changes saved")
    }, 700)
  }
  const discard = () => (setP(profile), setErrors({}))
  const pickPhoto = (f: File | undefined) => {
    if (!f) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return toast({ kind: "error", title: `${f.name} can’t be used`, description: "Use a JPG, PNG or WebP image." })
    if (f.size > 5 * 1024 * 1024) return toast({ kind: "error", title: `${f.name} is too large`, description: "Photos can be up to 5 MB." })
    onPhoto(URL.createObjectURL(f))
    toast("Photo updated")
  }

  return (
    <PageShell title="Account" description="Your details and your company’s.">

      {/* you */}
      <Section title="Profile" description="How you appear across Flicks.">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 rounded-2xl after:rounded-2xl">
            {photo && <AvatarImage src={photo} alt="" className="rounded-2xl object-cover" />}
            <AvatarFallback className="rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => file.current?.click()}>
                {photo ? "Change photo" : "Upload photo"}
              </Button>
              {photo && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => (onPhoto(undefined), toast("Photo removed"))}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</p>
          </div>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => (pickPhoto(e.target.files?.[0]), (e.target.value = ""))} />
        </div>

        <Field id="name" label="Full name" error={errors.name}>
          <Input id="ob-name" maxLength={60} value={p.name} onChange={(e) => set("name", e.target.value)} onBlur={blur("name")} autoComplete="name" aria-invalid={!!errors.name || undefined} className="h-11" />
        </Field>

        <Field id="email" label="Email">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-11 items-center gap-2 rounded-2xl bg-muted/60 px-3 text-sm text-muted-foreground" aria-readonly>
                <span id="ob-email" className="min-w-0 flex-1 truncate">
                  {email}
                </span>
                <HugeiconsIcon icon={LockIcon} className="size-4 shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Your sign-in email can’t be changed</TooltipContent>
          </Tooltip>
        </Field>

      </Section>

      {/* the company */}
      <Section title="Company" description="Your company or brand, and its website.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="company" label="Company or brand" error={errors.company}>
            <Input id="ob-company" maxLength={80} value={p.company} onChange={(e) => set("company", e.target.value)} onBlur={blur("company")} autoComplete="organization" aria-invalid={!!errors.company || undefined} className="h-11" />
          </Field>
          <Field id="website" label="Website" error={errors.website}>
            <div className={cn("flex h-11 items-center overflow-hidden rounded-2xl bg-input/50 focus-within:ring-3 focus-within:ring-ring/30", errors.website && "ring-3 ring-destructive/20")}>
              <span className="flex h-full items-center pl-3 text-sm text-muted-foreground">https://</span>
              <input
                id="ob-website"
                maxLength={120}
                inputMode="url"
                value={p.website}
                onChange={(e) => set("website", e.target.value.replace(/^https?:\/\//, ""))}
                onBlur={blur("website")}
                placeholder="company.com"
                aria-invalid={!!errors.website || undefined}
                className="h-full min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </Field>
        </div>
      </Section>

      {/* the only place to log out */}
      <Section title="Log out" description={`Signed in as ${email}.`}>
        <Button variant="outline" className="self-start" onClick={onSignOut}>
          Log out
        </Button>
      </Section>

      {/* unsaved changes: sticks to the bottom while scrolling, on the right */}
      <div
        className={cn(
          "sticky bottom-6 z-30 ml-auto flex w-fit items-center gap-3 rounded-2xl bg-popover py-2 pl-4 pr-2 shadow-xl ring-1 ring-foreground/10 transition-all duration-200",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
        role="region"
        aria-label="Unsaved changes"
        aria-hidden={!dirty}
      >
        <span className="text-sm">You have unsaved changes</span>
        <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={discard} disabled={saving}>
          Discard
        </Button>
        <Button
          size="sm"
          // keep focus in the field: its blur check would shift the page under the pointer and swallow the click
          onMouseDown={(e) => e.preventDefault()}
          onClick={save}
          disabled={saving}
          className="gap-1.5"
        >
          {saving && <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </PageShell>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardContent className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex max-w-xl flex-col gap-6">{children}</div>
      </CardContent>
    </Card>
  )
}
