import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Cancel01Icon, Film01Icon, ImageAdd01Icon, MountainIcon, PlayCircleIcon, ShoppingBag01Icon, UserSwitchIcon, Video01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useMediaAdd } from "@/components/media-picker"
import type { Reference } from "@/components/prompt-composer"
import { asFile, blobUrl, probeVideo, type PickedMedia } from "@/lib/media"
import { cn } from "@/lib/utils"
import { RECIPES, recipeMessage, type Recipe, type RecipeId, type Slot } from "@/recipes"

const ICON: Record<RecipeId, typeof Film01Icon> = { "product-swap": ShoppingBag01Icon, recast: UserSwitchIcon, "scene-shift": MountainIcon, "make-it-move": PlayCircleIcon, "clips-to-flick": Film01Icon }

/** where each placeholder banner's light comes from */
const LIGHT: Record<RecipeId, [string, string]> = { "product-swap": ["20% 20%", "85% 90%"], recast: ["80% 15%", "15% 90%"], "scene-shift": ["50% 100%", "50% 0%"], "make-it-move": ["15% 80%", "85% 15%"], "clips-to-flick": ["50% 0%", "50% 100%"] }

/** what Start hands to the chat: the first message, the files, and the Flick's size and length from them */
export type RecipeStart = { recipe: { id: RecipeId; frame?: "start" | "end" }; prompt: string; refs: Reference[]; size: string; duration: number }

/** a recipe's banner until the real ones are made: its theme tint, soft light and its icon */
function Banner({ r, className }: { r: Recipe; className?: string }) {
  const tone = r.tone === "brand" ? "var(--brand)" : `var(--${r.tone})`
  return (
    <span
      aria-hidden
      className={cn("relative grid place-items-center overflow-hidden bg-muted", className)}
      style={{
        // each recipe lit from its own side, so the placeholders tell apart in one theme
        backgroundImage: `radial-gradient(circle at ${LIGHT[r.id][0]}, color-mix(in oklch, ${tone} 60%, transparent), transparent 60%), radial-gradient(circle at ${LIGHT[r.id][1]}, color-mix(in oklch, var(--foreground) 10%, transparent), transparent 55%), linear-gradient(135deg, color-mix(in oklch, ${tone} 10%, var(--muted)), var(--muted))`,
      }}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-background/70 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur">
        <HugeiconsIcon icon={ICON[r.id]} className="size-6" />
      </span>
    </span>
  )
}

/** the sites a recipe's clips usually come from, by their own icons */
function FromLogos({ r, className }: { r: Recipe; className?: string }) {
  if (!r.from?.length) return null
  return (
    <span className={cn("flex items-center gap-1", className)}>
      {r.from.map((f) => (
        <img key={f.domain} src={`https://www.google.com/s2/favicons?domain=${f.domain}&sz=64`} alt={f.name} title={f.name} loading="lazy" className="size-5 rounded-md bg-background p-0.5 ring-1 ring-foreground/10" />
      ))}
    </span>
  )
}

/** Recipes on Create: a row of cards; each opens its short form, and Start hands everything to the chat. */
export function RecipeCards({ onStart }: { onStart: (s: RecipeStart) => void }) {
  const [open, setOpen] = useState<Recipe | null>(null)
  return (
    <section aria-labelledby="recipes-title" className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="recipes-title" className="text-sm font-medium">
          Recipes <span className="font-normal text-muted-foreground">· start from what you have</span>
        </h2>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {RECIPES.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setOpen(r)}
              className="group/r flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card text-left ring-1 ring-foreground/10 outline-none transition-shadow hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="relative block">
                <Banner r={r} className="aspect-[16/10] w-full transition-transform duration-500 group-hover/r:scale-[1.03]" />
                <FromLogos r={r} className="absolute right-2 top-2" />
              </span>
              <span className="flex flex-col gap-0.5 p-3">
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-xs leading-snug text-muted-foreground">{r.line}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && <RecipeForm key={open.id} recipe={open} onClose={() => setOpen(null)} onStart={(s) => (setOpen(null), onStart(s))} />}
    </section>
  )
}

/** one upload slot: its files as tiles, plus a tile to add more (from uploads or the library) */
function SlotField({ slot, items, setItems }: { slot: Slot; items: PickedMedia[]; setItems: (f: (x: PickedMedia[]) => PickedMedia[]) => void }) {
  const media = useMediaAdd((got) => setItems((x) => [...x, ...got.filter((g) => g.kind === slot.kind)].slice(0, slot.max)))
  const [over, setOver] = useState(false)
  const full = items.length >= slot.max
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          {slot.label}
          {slot.min === 0 && <span className="font-normal text-muted-foreground"> · optional</span>}
        </span>
        {slot.max > 1 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {items.length}/{slot.max}
          </span>
        )}
      </div>
      <ul
        className={cn("flex flex-wrap gap-2 rounded-xl p-1 transition-colors", over && "bg-brand/10 ring-2 ring-brand/40")}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => (e.preventDefault(), setOver(false), media.addFiles(e.dataTransfer.files))}
      >
        {items.map((m) => (
          <li key={m.id} className="group/t relative size-20 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
            <img src={m.kind === "video" ? (m.poster ?? "") : m.url} alt={m.name} decoding="async" className="size-full object-cover" />
            {m.kind === "video" && (
              <span className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-md bg-black/50 text-white backdrop-blur-sm">
                <HugeiconsIcon icon={Video01Icon} className="size-3" />
              </span>
            )}
            <Button variant="ghost" size="icon-xs" aria-label={`Remove ${m.name}`} onClick={() => setItems((x) => x.filter((y) => y.id !== m.id))} className="absolute right-1 top-1 size-5 rounded-full bg-background/90 opacity-0 shadow-sm group-hover/t:opacity-100 focus-visible:opacity-100">
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </Button>
          </li>
        ))}
        {!full && (
          <li>
            <button type="button" onClick={media.openPicker} className={cn("flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-foreground/20 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", !items.length && slot.max === 1 && "w-44")}>
              <HugeiconsIcon icon={items.length ? Add01Icon : slot.kind === "video" ? Video01Icon : ImageAdd01Icon} className="size-4" />
              {items.length ? "Add" : slot.kind === "video" ? (slot.max > 1 ? "Add videos" : "Add a video") : slot.max > 1 ? "Add images" : "Add an image"}
            </button>
          </li>
        )}
      </ul>
      <p className="text-xs text-muted-foreground">{slot.hint}</p>
      {media.ui}
    </div>
  )
}

/** a picture's own size */
const imageSize = (url: string) =>
  new Promise<{ width: number; height: number }>((ok, no) => {
    const i = new Image()
    i.onload = () => ok({ width: i.naturalWidth, height: i.naturalHeight })
    i.onerror = () => no(new Error("unreadable"))
    i.src = url
  })

/** A recipe's short form: just what it needs, then Start opens the chat with it all. */
function RecipeForm({ recipe: r, onClose, onStart }: { recipe: Recipe; onClose: () => void; onStart: (s: RecipeStart) => void }) {
  const [files, setFiles] = useState<Record<string, PickedMedia[]>>({})
  const [frame, setFrame] = useState<"start" | "end">("start")
  const [seconds, setSeconds] = useState(8)
  const [note, setNote] = useState("")
  const [starting, setStarting] = useState(false)
  const ready = r.slots.every((s) => (files[s.key]?.length ?? 0) >= s.min)
  const start = async () => {
    setStarting(true)
    try {
      // videos first, then images, in slot order: the message's @Video n and @Image n count them that way
      const all = r.slots.flatMap((s) => files[s.key] ?? [])
      const picked = [...all.filter((m) => m.kind === "video"), ...all.filter((m) => m.kind === "image")]
      const refs: Reference[] = await Promise.all(
        picked.map(async (m) => {
          const f = await asFile(m)
          return { id: m.id, name: m.name, url: blobUrl(f), loading: false, media: m.kind, poster: m.poster, duration: m.duration }
        }),
      )
      // the Flick takes the size and length of what was given: the (first) video, or the image
      const first = refs[0]
      let size = "1080×1080"
      let duration = seconds
      if (first?.media === "video") {
        const p = await probeVideo(first.url)
        size = `${p.width}×${p.height}`
        duration = Math.max(4, Math.min(15, Math.round(p.duration)))
      } else if (first) {
        const p = await imageSize(first.url)
        size = `${p.width}×${p.height}`
      }
      const videos = refs.filter((x) => x.media === "video").length
      const images = refs.length - videos
      onStart({ recipe: { id: r.id, ...(r.frame ? { frame } : {}) }, prompt: recipeMessage(r, { videos, images, frame, seconds, note }), refs, size, duration })
    } catch {
      setStarting(false)
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Banner r={r} className="size-12 shrink-0 rounded-xl [&>span]:size-8 [&>span]:rounded-lg [&_svg]:size-4" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <DialogTitle className="flex items-center gap-2">
                {r.name}
                <FromLogos r={r} />
              </DialogTitle>
              <DialogDescription>{r.line}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {r.slots.map((s) => (
          <SlotField key={s.key} slot={s} items={files[s.key] ?? []} setItems={(f) => setFiles((x) => ({ ...x, [s.key]: f(x[s.key] ?? []) }))} />
        ))}
        {r.frame && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Your image is</span>
            <div role="radiogroup" aria-label="Your image is" className="grid grid-cols-2 gap-2">
              {(
                [
                  ["start", "Where it starts", "The video opens on your image."],
                  ["end", "Where it ends", "The video builds up to your image."],
                ] as const
              ).map(([v, label, hint]) => (
                <button key={v} type="button" role="radio" aria-checked={frame === v} onClick={() => setFrame(v)} className={cn("flex flex-col gap-0.5 rounded-xl p-3 text-left ring-1 ring-foreground/10 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring", frame === v && "bg-brand/10 ring-2 ring-brand")}>
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {r.lengths && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Length</span>
            <div role="radiogroup" aria-label="Length" className="flex gap-2">
              {r.lengths.map((n) => (
                <Button key={n} type="button" role="radio" aria-checked={seconds === n} variant={seconds === n ? "default" : "outline"} size="sm" onClick={() => setSeconds(n)} className="tabular-nums">
                  {n}s
                </Button>
              ))}
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Notes <span className="font-normal text-muted-foreground">· optional</span>
          </span>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={r.note} rows={2} className="resize-none" />
        </label>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ready || starting} onClick={start}>
            {starting ? "Starting…" : "Start"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
