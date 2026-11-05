import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Film01Icon, MountainIcon, PlayCircleIcon, ShoppingBag01Icon, SparklesIcon, Tick02Icon, UserSwitchIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Dropzone } from "@/components/dropzone"
import { useMediaAdd } from "@/components/media-picker"
import type { Reference } from "@/components/prompt-composer"
import { asFile, blobUrl, length, probeVideo, type PickedMedia } from "@/lib/media"
import { cn } from "@/lib/utils"
import { RECIPES, recipeMessage, type Recipe, type RecipeId, type Slot } from "@/recipes"

const ICON: Record<RecipeId, typeof Film01Icon> = { "product-swap": ShoppingBag01Icon, recast: UserSwitchIcon, "scene-shift": MountainIcon, "make-it-move": PlayCircleIcon, "clips-to-flick": Film01Icon }

/** what Start hands to the chat: the first message, the files, and the Flick's size and length from them */
export type RecipeStart = { recipe: { id: RecipeId; frame?: "start" | "end" }; prompt: string; refs: Reference[]; size: string; duration: number }

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/** a counter that moves on every `ms` (paused while `on` is false) */
function useTick(ms: number, on = true) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => setN((x) => x + 1), ms)
    return () => clearInterval(t)
  }, [ms, on])
  return n
}

/**
 * A recipe's clips on one shared timeline, like a Flick being tapped through: every clip plays in
 * step from 0, and the one that owns the moment shows (three clips over 5 s: 0 to 1.6, 1.6 to 3.2,
 * 3.2 to 5), then all start again together. The clips are the same shot, so the motion carries
 * straight through each swap. The switch follows the first clip's own clock, so it lands on the
 * right frame. Starts once every clip can play, after `delay` (so cards don't cut together).
 */
function useSyncedClips(count: number, on: boolean, delay = 0) {
  const vids = useRef<(HTMLVideoElement | null)[]>([])
  const [at, setAt] = useState(0)
  useEffect(() => {
    const list = () => vids.current.slice(0, count).filter((v): v is HTMLVideoElement => !!v)
    if (!on || reduced()) return void list().forEach((v) => v.pause())
    let stop = false
    let raf = 0
    const tick = () => {
      if (stop) return
      const vs = list()
      const lead = vs[0]
      if (lead?.duration) {
        const t = lead.currentTime
        for (const v of vs.slice(1)) {
          if (Math.abs(v.currentTime - t) > 0.12) v.currentTime = t
          if (v.paused) v.play().catch(() => {})
        }
        const k = Math.min(count - 1, Math.floor(t / (lead.duration / count)))
        setAt((p) => (p === k ? p : k))
      }
      raf = requestAnimationFrame(tick)
    }
    const since = Date.now()
    const wait = () => {
      if (stop) return
      const vs = list()
      if (vs.length === count && vs.every((v) => v.readyState >= 3) && Date.now() - since >= delay) {
        vs.forEach((v) => ((v.currentTime = 0), v.play().catch(() => {})))
        tick()
      } else setTimeout(wait, 150)
    }
    wait()
    return () => {
      stop = true
      cancelAnimationFrame(raf)
      list().forEach((v) => v.pause())
    }
  }, [count, on, delay])
  return { at, ref: (i: number) => (el: HTMLVideoElement | null) => void (vids.current[i] = el) }
}

/** the recipe's clips on their shared timeline; plays only while on screen */
function Reel({ r, delay = 0, className }: { r: Recipe; delay?: number; className?: string }) {
  const { clips, posters } = r.media
  const box = useRef<HTMLSpanElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const { at, ref } = useSyncedClips(clips.length, seen, delay)
  return (
    <span ref={box} className={cn("absolute inset-0 block overflow-hidden bg-muted", className)}>
      {clips.map((c, i) => (
        <video key={c} ref={ref(i)} src={c} poster={posters[i]} muted loop playsInline preload="auto" className={cn("absolute inset-0 size-full object-cover", i === at ? "visible" : "invisible")} />
      ))}
    </span>
  )
}

/** the sites a recipe's clips usually come from, by their own icons */
function FromLogos({ r, className }: { r: Recipe; className?: string }) {
  if (!r.from?.length) return null
  return (
    <span className={cn("flex items-center gap-1", className)}>
      {r.from.map((f) => (
        <img key={f.domain} src={`https://www.google.com/s2/favicons?domain=${f.domain}&sz=64`} alt={f.name} title={f.name} loading="lazy" className="size-6 rounded-md bg-white p-0.5 shadow-sm" />
      ))}
    </span>
  )
}

/** Recipes on Create: big cards that play what each one makes; each opens its form, and Start hands everything to the chat. */
export function RecipeCards({ onStart }: { onStart: (s: RecipeStart) => void }) {
  const [open, setOpen] = useState<Recipe | null>(null)
  return (
    <section aria-label="Recipes" className="@container flex w-full flex-col">
      <ul className="grid grid-cols-2 gap-3 @xl:grid-cols-4 @3xl:grid-rows-2">
        {RECIPES.map((r, k) => {
          const big = k === 0
          return (
            <li key={r.id} className={cn(big && "col-span-2 @xl:col-span-4 @3xl:col-span-2 @3xl:row-span-2")}>
              <button
                type="button"
                onClick={() => setOpen(r)}
                className={cn(
                  "group/r relative block w-full overflow-hidden rounded-2xl bg-muted text-left shadow-xs ring-1 ring-foreground/10 outline-none transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring",
                  big ? "aspect-[16/9] @3xl:aspect-auto @3xl:h-full" : "aspect-[3/4] @3xl:aspect-[4/5]",
                )}
              >
                {/* every card keeps playing; each starts a beat after the one before, so they don't cut together */}
                <Reel r={r} delay={k * 900} className="transition-transform duration-700 group-hover/r:scale-[1.04]" />
                {!big && (
                  <span aria-hidden className="absolute right-3.5 top-3.5 grid size-8 place-items-center rounded-full bg-white text-black opacity-0 shadow-sm transition-[opacity,transform] duration-300 group-hover/r:opacity-100 group-focus-visible/r:opacity-100 -translate-y-1 group-hover/r:translate-y-0">
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                  </span>
                )}
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <span className={cn("absolute inset-x-0 bottom-0 flex flex-col text-white", big ? "gap-2 p-5 @3xl:p-6" : "gap-1 p-3 @3xl:p-3.5")}>
                  <FromLogos r={r} className="mb-1" />
                  <span className={cn("font-semibold leading-tight tracking-tight", big ? "text-2xl @3xl:text-3xl" : "text-base @3xl:text-lg")}>
                    {r.name}
                  </span>
                  <span className={cn("leading-snug text-white/70", big ? "max-w-sm text-base" : "line-clamp-2 text-xs @3xl:text-sm")}>{r.line}</span>
                  {big && (
                    <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-transform group-hover/r:translate-x-0.5">
                      <HugeiconsIcon icon={SparklesIcon} className="size-4" />
                      Try it
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {open && <RecipeForm key={open.id} recipe={open} onClose={() => setOpen(null)} onStart={(s) => (setOpen(null), onStart(s))} />}
    </section>
  )
}

/**
 * How a recipe works, animated: three steps that play in turn (what you add, what you choose, what
 * viewers get), drawn with the recipe's own clips, with the step list underneath following along.
 */
function HowItWorks({ r }: { r: Recipe }) {
  const still = !!r.media.still
  const step = useTick(3600, !reduced()) % 3
  const { clips, posters } = r.media
  // the same timeline as the card, so the swaps match
  const { at, ref } = useSyncedClips(clips.length, true)
  const layer = (n: number) => cn("absolute inset-0 grid place-items-center p-8 transition-[opacity,transform] duration-500", step === n ? "opacity-100 translate-y-0" : "pointer-events-none translate-y-2 opacity-0")
  const frame = "relative aspect-[3/4] w-[min(72%,300px)] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
  return (
    <div className="relative flex h-full min-h-80 flex-col overflow-hidden bg-neutral-950 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, color-mix(in oklch, var(--brand) 35%, transparent), transparent 55%), radial-gradient(circle at 80% 90%, color-mix(in oklch, var(--chart-2) 25%, transparent), transparent 50%)" }} />
      <p className="relative px-6 pt-6 text-xs font-medium uppercase tracking-wider text-white/70">How it works</p>
      <div aria-hidden className="relative min-h-0 flex-1">
        {/* 1: what you add drops into place */}
        <div className={layer(0)}>
          <div className={cn(frame, "grid place-items-center border border-dashed border-white/20 bg-white/10")}>
            {(r.id === "clips-to-flick" ? posters : [still ? r.media.still! : posters[0]]).map((p, i) => (
              <img
                key={p}
                src={p}
                alt=""
                className={cn("absolute w-[70%] rounded-xl object-cover shadow-xl ring-1 ring-white/20 transition-[transform,opacity] duration-700", step === 0 ? "opacity-100" : "opacity-0")}
                style={{ aspectRatio: "3 / 4", transform: step === 0 ? `translate(${(i - 1) * (r.id === "clips-to-flick" ? 18 : 0)}%, ${i * 4}%) rotate(${(i - 1) * (r.id === "clips-to-flick" ? 6 : 0)}deg)` : "translate(30%, -40%) rotate(8deg)", transitionDelay: `${i * 140}ms` }}
              />
            ))}
          </div>
        </div>
        {/* 2: what you choose */}
        <div className={layer(1)}>
          {still ? (
            <div className="flex items-center gap-4">
              {["Starts on it", "Ends on it"].map((t, i) => (
                <div key={t} className={cn("flex w-44 flex-col gap-2.5 rounded-2xl p-2.5 ring-1 transition-colors", i === 0 ? "bg-white/10 ring-white/50" : "bg-white/10 ring-white/10")}>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((k) => (
                      <span key={k} className={cn("aspect-[3/4] flex-1 overflow-hidden rounded-md", (i === 0 ? k === 0 : k === 2) ? "ring-2 ring-brand" : "opacity-40")}>
                        <img src={r.media.still} alt="" className="size-full object-cover" style={{ filter: (i === 0 ? k === 0 : k === 2) ? undefined : "blur(1px) saturate(.6)" }} />
                      </span>
                    ))}
                  </div>
                  <span className="text-center text-sm">{t}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-4">
              <div className="relative aspect-[3/4] w-44 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20">
                <img src={posters[0]} alt="" className="size-full object-cover" />
                <span className="absolute bottom-1 left-1 rounded-md bg-black/50 px-1.5 py-0.5 text-xs">{r.id === "clips-to-flick" ? "Clip" : "Yours"}</span>
              </div>
              <div className="flex flex-col gap-2">
                {posters.slice(r.id === "clips-to-flick" ? 0 : 1).map((p, i) => (
                  <div key={p} className={cn("flex items-center gap-2.5 rounded-xl bg-white/10 p-2 pr-3.5 ring-1 ring-white/10 transition-[transform,opacity] duration-500", step === 1 ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0")} style={{ transitionDelay: `${200 + i * 220}ms` }}>
                    <img src={p} alt="" className="size-12 rounded-lg object-cover" />
                    <span className="text-sm">{r.media.labels[r.id === "clips-to-flick" ? i : i + 1]}</span>
                    <span className="grid size-4 place-items-center rounded-full bg-brand text-brand-foreground">
                      <HugeiconsIcon icon={Tick02Icon} className="size-2.5" strokeWidth={3} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* 3: what viewers get: the Flick, switching as they tap */}
        <div className={layer(2)}>
          <div className={frame}>
            {clips.map((c, i) => (
              <video key={c} ref={ref(i)} src={c} poster={posters[i]} muted loop playsInline preload="auto" className={cn("absolute inset-0 size-full object-cover", i === at ? "visible" : "invisible")} />
            ))}
            {clips.length > 1 && (
              <span className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                {posters.map((p, i) => (
                  <span key={p} className={cn("relative size-10 overflow-hidden rounded-lg ring-2 transition-[box-shadow,transform]", i === at ? "scale-110 ring-white" : "ring-white/20")}>
                    <img src={p} alt="" className="size-full object-cover" />
                    {i === at && <span className="absolute inset-0 m-auto size-3 animate-ping rounded-full bg-white/70" />}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
      <ol className="relative grid grid-cols-3 gap-3 border-t border-white/10 px-6 py-5">
        {r.steps.map(([t, d], i) => (
          <li key={t} className={cn("flex flex-col gap-1 transition-opacity duration-300", step === i ? "opacity-100" : "opacity-45")}>
            <span className="h-0.5 overflow-hidden rounded-full bg-white/10">
              <span className={cn("block h-full rounded-full bg-white", step === i ? "w-full transition-[width] duration-[3600ms] ease-linear" : step > i ? "w-full" : "w-0")} />
            </span>
            <span className="mt-1.5 text-xs text-white/70">Step {i + 1}</span>
            <span className="text-sm font-medium leading-snug">{t}</span>
            <span className="text-xs leading-snug text-white/70">{d}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** one upload slot, in the shared uploader */
function SlotField({ slot, n, items, setItems }: { slot: Slot; n: number; items: PickedMedia[]; setItems: (f: (x: PickedMedia[]) => PickedMedia[]) => void }) {
  const media = useMediaAdd((got) => setItems((x) => [...x, ...got.filter((g) => g.kind === slot.kind)].slice(0, slot.max)))
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums", items.length >= Math.max(1, slot.min) ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground")}>
          {items.length >= Math.max(1, slot.min) ? <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} /> : n}
        </span>
        <span className="text-sm font-medium">
          {slot.label}
          {slot.min === 0 && <span className="font-normal text-muted-foreground"> · optional</span>}
        </span>
      </div>
      <Dropzone
        accept={slot.kind}
        max={slot.max}
        size={slot.min > 0 ? "lg" : "md"}
        hint={slot.hint}
        title={slot.kind === "video" ? (slot.max > 1 ? "Drop your clips here" : "Drop your video here") : slot.max > 1 ? "Drop images here" : "Drop your image here"}
        items={items.map((m) => ({ id: m.id, name: m.name, url: m.url, poster: m.poster, kind: m.kind, meta: m.kind === "video" && m.duration ? length(Math.min(m.duration, 15)) : undefined }))}
        onBrowse={media.openPicker}
        onFiles={(f) => media.addFiles(f)}
        onRemove={(id) => setItems((x) => x.filter((y) => y.id !== id))}
      />
      {media.ui}
    </section>
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

/** A recipe's form: how it works on the left, animated; on the right, just what it needs, then Start opens the chat. */
function RecipeForm({ recipe: r, onClose, onStart }: { recipe: Recipe; onClose: () => void; onStart: (s: RecipeStart) => void }) {
  const [files, setFiles] = useState<Record<string, PickedMedia[]>>({})
  const [frame, setFrame] = useState<"start" | "end">("start")
  const [seconds, setSeconds] = useState(8)
  const [note, setNote] = useState("")
  const [starting, setStarting] = useState(false)
  const ready = r.slots.every((s) => (files[s.key]?.length ?? 0) >= s.min)
  const missing = r.slots.find((s) => (files[s.key]?.length ?? 0) < s.min)
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
      <DialogContent className="grid h-[min(760px,92vh)] max-w-[min(1080px,calc(100vw-2rem))] gap-0 overflow-hidden p-0 sm:max-w-[min(1080px,calc(100vw-2rem))] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="hidden md:block">
          <HowItWorks r={r} />
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-6 pb-6 pt-7 sm:px-8">
            <header className="flex flex-col gap-2 pr-8">
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-brand">
                <HugeiconsIcon icon={ICON[r.id]} className="size-3.5" />
                Recipe
                <FromLogos r={r} className="ml-1 [&_img]:size-5" />
              </span>
              <DialogTitle className="text-2xl font-semibold tracking-tight">{r.name}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">{r.line}</DialogDescription>
            </header>
            {r.slots.map((s, i) => (
              <SlotField key={s.key} n={i + 1} slot={s} items={files[s.key] ?? []} setItems={(f) => setFiles((x) => ({ ...x, [s.key]: f(x[s.key] ?? []) }))} />
            ))}
            {r.frame && (
              <section className="flex flex-col gap-2.5">
                <span className="text-sm font-medium">Your image is</span>
                <div role="radiogroup" aria-label="Your image is" className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      ["start", "Where it starts", "The video opens on your image."],
                      ["end", "Where it ends", "The video builds up to your image."],
                    ] as const
                  ).map(([v, label, hint]) => (
                    <button key={v} type="button" role="radio" aria-checked={frame === v} onClick={() => setFrame(v)} className={cn("flex flex-col gap-0.5 rounded-xl p-3.5 text-left ring-1 ring-foreground/10 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring", frame === v && "bg-brand/10 ring-2 ring-brand")}>
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{hint}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {r.lengths && (
              <section className="flex flex-col gap-2.5">
                <span className="text-sm font-medium">Length</span>
                <div role="radiogroup" aria-label="Length" className="flex gap-2">
                  {r.lengths.map((n) => (
                    <Button key={n} type="button" role="radio" aria-checked={seconds === n} variant={seconds === n ? "default" : "outline"} size="sm" onClick={() => setSeconds(n)} className="min-w-14 tabular-nums">
                      {n}s
                    </Button>
                  ))}
                </div>
              </section>
            )}
            <label className="flex flex-col gap-2.5">
              <span className="text-sm font-medium">
                Notes <span className="font-normal text-muted-foreground">· optional</span>
              </span>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={r.note} rows={3} className="resize-none" />
            </label>
          </div>
          <footer className="flex items-center gap-3 border-t bg-muted/30 px-6 py-4 sm:px-8">
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{missing ? `Add ${missing.label.toLowerCase()} to start` : "The AI takes it from here, in the chat"}</span>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!ready || starting} onClick={start} className="gap-1.5">
              <HugeiconsIcon icon={SparklesIcon} className="size-4" />
              {starting ? "Starting…" : "Start"}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}
