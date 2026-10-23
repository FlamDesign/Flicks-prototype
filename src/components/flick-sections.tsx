/** Pieces shared by the editor (Save as template) and the Flick page (link, embed). */
import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, ArrowUpRight01Icon, Copy01Icon, Delete02Icon, ImageAdd01Icon, RefreshIcon, Loading03Icon, Tick02Icon, Upload01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ToastInput } from "@/components/ui-extra/toaster"
import type { LinkSettings } from "@/library"
import { cn } from "@/lib/utils"

export type Issue = { text: string; blocking?: boolean }
export type TemplateDraft<S> = { name: string; description: string; thumb?: string; snap: S }

export const DOMAIN = "flamapp.ai/f/"

export function IconAction({ label, icon, onClick, href }: { label: string; icon: typeof Copy01Icon; onClick?: () => void; href?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button variant="ghost" size="icon-sm" aria-label={label} className="size-7 text-muted-foreground" asChild>
            <a href={href} target="_blank" rel="noreferrer">
              <HugeiconsIcon icon={icon} className="size-4" />
            </a>
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={label} className="size-7 text-muted-foreground" onClick={onClick}>
            <HugeiconsIcon icon={icon} className="size-4" />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/* ---------- template ---------- */

export function TemplateSection({ title, thumbs, onSave }: { title: string; thumbs: string[]; onSave: (d: { name: string; description: string; thumb?: string }) => void }) {
  const [name, setName] = useState(title)
  const [description, setDescription] = useState("")
  const [upload, setUpload] = useState<string>()
  const [thumb, setThumb] = useState<string | undefined>(thumbs[0])
  const file = useRef<HTMLInputElement>(null)
  const options = [...thumbs, ...(upload ? [upload] : [])]

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">Saves this project as it is now, with its variations, elements and feeds. Start new projects from it in Templates.</p>
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={title} maxLength={60} aria-label="Template name" />
      </Field>
      <Field label="Description">
        <CountedTextarea value={description} onChange={setDescription} max={160} placeholder="What it’s for, like a product launch with three colourways" label="Template description" />
      </Field>
      <Field label="Thumbnail">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Template thumbnail">
          {options.map((src) => (
            <Button
              key={src}
              variant="ghost"
              role="radio"
              aria-checked={thumb === src}
              onClick={() => setThumb(src)}
              className={cn("size-20 overflow-hidden rounded-xl p-0 ring-1 ring-foreground/10", thumb === src && "ring-2 ring-primary")}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </Button>
          ))}
          <Button variant="outline" onClick={() => file.current?.click()} className="size-20 flex-col gap-1 rounded-xl border-dashed text-xs font-normal text-muted-foreground">
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            Upload
          </Button>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                const url = URL.createObjectURL(f)
                setUpload(url)
                setThumb(url)
              }
              e.target.value = ""
            }}
          />
        </div>
      </Field>
      <Button className="self-end" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), description: description.trim(), thumb })}>
        Save template
      </Button>
    </div>
  )
}

/** Textarea with a character count, built from the standard input group. */
export function CountedTextarea({ value, onChange, max, placeholder, label }: { value: string; onChange: (v: string) => void; max: number; placeholder: string; label: string }) {
  return (
    <InputGroup>
      <InputGroupTextarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} placeholder={placeholder} aria-label={label} className="min-h-20 resize-none" />
      <InputGroupAddon align="block-end">
        <InputGroupText className="ml-auto text-xs tabular-nums">
          {value.length}/{max}
        </InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

/* ---------- link ---------- */

/** Edit a Flick's link: its ending, and how it unfurls (image, title, description). The Flick itself never changes. */
export function ShareSection({
  share,
  setShare,
  link,
  fallbackTitle,
  fallbackImage,
  onToast,
  live,
}: {
  live: boolean
  share: LinkSettings
  setShare: (patch: Partial<LinkSettings>) => void
  link: string
  fallbackTitle: string
  fallbackImage?: string
  onToast: (t: ToastInput | string) => void
}) {
  const imageInput = useRef<HTMLInputElement>(null)
  const [slug, setSlug] = useState(share.slug)
  const [copied, setCopied] = useState(false)
  const valid = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)
  const avail = useAvailability(slug, valid && slug !== share.slug)
  const changed = slug !== share.slug
  const save = () => {
    if (valid && avail === "free") {
      setShare({ slug })
      onToast("Link updated")
    }
  }
  const image = share.image === undefined ? fallbackImage : share.image
  const title = share.title.trim() || fallbackTitle
  const description = share.description.trim() || "Tap to explore every variation."

  return (
    <div className="flex flex-col gap-6">
      {/* link preview, as it unfurls in messages and social posts */}
      <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
        <div className="relative aspect-[1200/630] bg-muted">
          {image && <img src={image} alt="" className="absolute inset-0 size-full object-cover" />}
          {!image && <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">No image</span>}
          <div className="absolute right-3 top-3 flex gap-1.5">
            {image && <ImageAction label="Remove image" icon={Delete02Icon} onClick={() => setShare({ image: null })} />}
            <ImageAction label={image ? "Replace image" : "Add image"} icon={image ? RefreshIcon : ImageAdd01Icon} onClick={() => imageInput.current?.click()} />
          </div>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setShare({ image: URL.createObjectURL(f) })
              e.target.value = ""
            }}
          />
        </div>
        <div className="flex flex-col gap-0.5 bg-muted/50 px-4 py-3">
          <span className="text-xs text-muted-foreground">flamapp.ai</span>
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>
        </div>
      </div>

      <Field label="Link">
        <div className="flex gap-2">
          <label
            className={cn(
              "flex h-10 min-w-0 flex-1 items-center rounded-xl bg-muted/70 pl-3.5 text-sm focus-within:ring-2 focus-within:ring-ring/50",
              changed && (!valid || avail === "taken") && "ring-2 ring-destructive/40",
            )}
          >
            <span className="shrink-0 text-muted-foreground">{DOMAIN}</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") save()
                if (e.key === "Escape") setSlug(share.slug)
              }}
              aria-label="Link ending"
              className="h-full min-w-0 flex-1 bg-transparent font-medium outline-none"
            />
            {changed && valid && (
              <span className="flex shrink-0 items-center gap-1 pr-3 text-xs">
                {avail === "checking" && (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Checking</span>
                  </>
                )}
                {avail === "free" && <HugeiconsIcon icon={Tick02Icon} className="size-4 text-emerald-600" aria-label="Available" />}
                {avail === "taken" && <span className="text-destructive">Taken</span>}
              </span>
            )}
          </label>
          {changed ? (
            <>
              <SquareIcon label="Cancel" icon={Cancel01Icon} variant="ghost" onClick={() => setSlug(share.slug)} />
              <SquareIcon label="Save link" icon={Tick02Icon} variant="secondary" disabled={!valid || avail !== "free"} onClick={save} />
            </>
          ) : (
            live && (
              <SquareIcon
                label={copied ? "Copied" : "Copy link"}
                icon={copied ? Tick02Icon : Copy01Icon}
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(link)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              />
            )
          )}
        </div>
        {changed && !valid && <p className="text-xs text-destructive">Use 3–40 lowercase letters, numbers or hyphens.</p>}
        {changed && valid && avail === "taken" && <p className="text-xs text-destructive">That link is in use. Try another ending.</p>}
        {changed && valid && avail === "free" && live && <p className="text-xs text-muted-foreground">The old link stops working once you save.</p>}
      </Field>

      <Field label="Preview title">
        <Input value={share.title} onChange={(e) => setShare({ title: e.target.value })} placeholder={fallbackTitle} maxLength={70} aria-label="Preview title" />
      </Field>
      <Field label="Preview description">
        <CountedTextarea value={share.description} onChange={(description) => setShare({ description })} max={160} placeholder="Tap to explore every variation." label="Preview description" />
      </Field>
    </div>
  )
}

function ImageAction({ label, icon, onClick }: { label: string; icon: typeof Copy01Icon; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="secondary" aria-label={label} onClick={onClick} className="bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background">
          <HugeiconsIcon icon={icon} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Simulated availability check for a link ending: a short delay, then free or taken. */
const TAKEN = ["flick", "flam", "demo", "test", "sale", "launch", "new", "home", "maison-living", "wild-haven", "linea-jewelry"]
function useAvailability(slug: string, active: boolean): "checking" | "free" | "taken" {
  const [result, setResult] = useState<{ slug: string; free: boolean } | null>(null)
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => setResult({ slug, free: !TAKEN.includes(slug) }), 600)
    return () => clearTimeout(id)
  }, [slug, active])
  if (!active || result?.slug !== slug) return "checking"
  return result.free ? "free" : "taken"
}

/* ---------- embed ---------- */

const embedCode = (link: string) => `<script src="https://flamapp.ai/embed.js" async></script>\n<flam-flick src="${link}"></flam-flick>`

export function EmbedSection({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Paste this where the Flick should play. It fits the space it’s placed in and keeps viewers on your page.</p>
      <div className="overflow-hidden rounded-xl bg-muted/70">
          <div className="flex items-center justify-between border-b border-foreground/5 py-1.5 pl-4 pr-1.5">
            <span className="text-xs text-muted-foreground">Script tag</span>
            <Button
              size="sm"
              variant="ghost"
              className={cn("gap-1.5 text-muted-foreground transition-colors", copied && "text-emerald-700 hover:text-emerald-700 dark:text-emerald-400")}
              onClick={() => {
                navigator.clipboard?.writeText(embedCode(link))
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              <HugeiconsIcon key={String(copied)} icon={copied ? Tick02Icon : Copy01Icon} className="size-3.5 animate-in zoom-in-50 fade-in-0 duration-200" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed [scrollbar-width:thin]">
            <code>{embedCode(link)}</code>
          </pre>
        </div>
      <Button variant="link" asChild className="h-auto gap-1 self-start px-0">
        <a href="https://docs.flamapp.ai/embed" target="_blank" rel="noreferrer">
          Read the embed docs for web, iOS and Android
          <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
        </a>
      </Button>
    </div>
  )
}

/* ---------- shared pieces ---------- */

export function SquareIcon({ label, icon, variant, disabled, onClick }: { label: string; icon: typeof Copy01Icon; variant: "ghost" | "secondary"; disabled?: boolean; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon" aria-label={label} disabled={disabled} onClick={onClick} className="size-10 shrink-0 rounded-xl">
          <HugeiconsIcon key={label} icon={icon} className="size-4 animate-in zoom-in-50 fade-in-0 duration-200" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{label}</h3>
        {hint && <span className="text-xs tabular-nums text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

export function Empty({ title, text }: { title?: string; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      {title && <h3 className="text-sm font-medium">{title}</h3>}
      <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export function Issues({ issues }: { issues: Issue[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {issues.map((x) => (
        <li key={x.text} className={cn("text-xs", x.blocking ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400")}>
          {x.text}
        </li>
      ))}
    </ul>
  )
}

/* ---------- copy helpers ---------- */

export const when = (t: number) => `${new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · ${ago(t)}`
export function ago(t: number) {
  const s = (Date.now() - t) / 1000
  if (s < 45) return "just now"
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`
  return new Date(t).toLocaleDateString()
}
