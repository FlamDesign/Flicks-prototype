import { createContext, useContext, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Alert02Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon, BookOpen01Icon, CheckmarkBadge01Icon, Globe02Icon, ArrowUp02Icon, ImageAdd01Icon, Loading03Icon, PencilEdit01Icon, LeftToRightListNumberIcon, PaintBoardIcon, RefreshIcon, SparklesIcon, StopIcon, Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Choice, Item, useAgent } from "@/ai/agent"
import type { Brand, Plan, PlanVariation } from "@/ai/design"
import { FlickPreview } from "@/components/editor/flick-preview"
import { skillTitle } from "@/ai/skills"
import { cn } from "@/lib/utils"

type Agent = ReturnType<typeof useAgent>
export type AgentCtx = {
  videoCost: number
  credits: number
  addToCanvas: (url: string) => void
  focusComposer: () => void
  /** for visual answers: the frame shape, sample frames and the brand */
  ratio: number
  posters: string[]
  brand?: Brand
  /** the build's steps, read live */
  progress: () => { label: string; state: "done" | "working" | "waiting" }[]
}

/** true inside the choices panel (planning, beside the chat): cards get room, options become numbered rows */
export const StageContext = createContext(false)
/** cards still waiting for the user: unanswered questions, image requests, a plan to approve */
export const isOpenChoice = (it: Item) => (it.kind === "question" && it.answer === undefined) || (it.kind === "assets" && !it.done) || (it.kind === "plan" && it.state === "open")

/** in the chat, where a choice opened in the panel: one line that points to it */
export function ChoicePointer({ item, onShow }: { item: Item; onShow: () => void }) {
  const what = item.kind === "question" ? item.question : item.kind === "assets" ? item.message : item.kind === "plan" ? item.plan.title : ""
  return (
    <button type="button" onClick={onShow} className="flex items-start gap-2 rounded-lg px-1 text-left text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
      <HugeiconsIcon icon={LeftToRightListNumberIcon} className="mt-px size-3.5 shrink-0" />
      <span>
        {item.kind === "plan" ? "Opened the plan" : item.kind === "assets" ? "Asked for images" : "Opened a choice"}: <span className="text-foreground">{what}</span>
      </span>
    </button>
  )
}

const FIELD_LABEL = { label: "Label", headline: "Headline", subheading: "Subheading", cta: "Button" } as const

/** One chat item: the chat's words, its questions and cards, and the user's messages. */
export function AgentItemView({ item, agent, ctx }: { item: Item; agent: Agent; ctx: AgentCtx }) {
  switch (item.kind) {
    case "user":
      return (
        <div className="ml-8 flex flex-col gap-2 self-end rounded-2xl rounded-br-md bg-background/60 p-3 ring-1 ring-foreground/5">
          {item.images.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.images.map((u) => (
                <img key={u} src={u} alt="" className="size-12 rounded-lg object-cover ring-1 ring-foreground/10" />
              ))}
            </div>
          )}
          {item.text && <p className="whitespace-pre-line text-sm leading-relaxed">{item.text}</p>}
        </div>
      )
    case "assistant":
      return (
        <div className="flex flex-col gap-2">
          {(item.text || !item.streaming) && <Said text={item.text} />}
          {item.streaming && (
            <span aria-live="polite" className="flex h-6 items-center gap-2 px-1 text-xs text-muted-foreground">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 animate-pulse rounded-full bg-foreground/40" style={{ animationDelay: `${i * 160}ms` }} />
                ))}
              </span>
              {item.activity && <span className="animate-in fade-in-0">{item.activity}…</span>}
            </span>
          )}
        </div>
      )
    case "question":
      return <Question item={item} agent={agent} ctx={ctx} />
    case "assets":
      return <Assets item={item} agent={agent} />
    case "brand":
      return <BrandCard item={item} />
    case "plan":
      return <PlanCard item={item} agent={agent} ctx={ctx} />
    case "image":
      return <ImageCard item={item} ctx={ctx} agent={agent} />
    case "build":
      return <BuildCard ctx={ctx} />
    case "site":
      return <SiteCard item={item} />
    case "skill":
      return (
        <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <HugeiconsIcon icon={BookOpen01Icon} className="size-3.5" />
          Following Flam’s guides: {item.names.map(skillTitle).join(" · ")}
        </p>
      )
    case "review":
      return item.fail.length ? (
        <Card className="gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-4 text-muted-foreground" />
            Review: {item.fail.length} to fix
            <span className="ml-auto text-xs font-normal text-muted-foreground">{item.pass} pass</span>
          </p>
          <ul className="flex flex-col gap-1 pl-5 text-xs text-muted-foreground">
            {item.fail.map((f) => (
              <li key={f} className="list-disc">{f.replace(/ \(id [^)]*\)/g, "")}</li>
            ))}
          </ul>
        </Card>
      ) : (
        <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-3.5 text-emerald-600" />
          Review passed: all {item.pass} checks
        </p>
      )
    case "note":
      return (
        <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Tick02Icon} className="size-3.5 text-foreground/60" />
          {item.text}
        </p>
      )
    case "error":
      return (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/5 p-3 text-sm ring-1 ring-destructive/20">
          <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="flex-1">{item.text}</p>
          <Button size="xs" variant="outline" onClick={agent.retry} className="gap-1">
            <HugeiconsIcon icon={RefreshIcon} className="size-3" />
            Retry
          </Button>
        </div>
      )
  }
}

/** the chat's own words: paragraphs, bullets and **bold** */
function Said({ text, streaming }: { text: string; streaming?: boolean }) {
  if (!text && streaming)
    return (
      <span aria-label="Thinking" className="flex h-6 items-center gap-1 px-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-pulse rounded-full bg-foreground/40" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </span>
    )
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-medium">{p.slice(2, -2)}</strong> : p))
  return (
    <div className="mr-6 flex flex-col gap-2 px-1 text-sm leading-relaxed">
      {text.split(/\n{2,}/).map((para, i) =>
        /^\s*[-•] /m.test(para) ? (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-4">
            {para.split("\n").map((l, j) => <li key={j}>{bold(l.replace(/^\s*[-•]\s*/, ""))}</li>)}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">{bold(para)}</p>
        ),
      )}
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  const stage = useContext(StageContext)
  return <div className={cn("mr-2 flex flex-col gap-3 rounded-2xl bg-background p-3 shadow-xs ring-1 ring-foreground/10", className, stage && "mr-0 gap-4 p-5")}>{children}</div>
}

function Question({ item, agent, ctx }: { item: Extract<Item, { kind: "question" }>; agent: Agent; ctx: AgentCtx }) {
  const [picked, setPicked] = useState<string[]>([])
  const [other, setOther] = useState("")
  const stage = useContext(StageContext)
  // text answers: a numbered vertical list, everywhere (number keys pick only in the choices panel)
  const rows = item.display === "chips"
  const open = item.answer === undefined
  // in the panel, number keys pick (the first open question only)
  const self = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!rows || !open || !stage) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, [contenteditable]")) return
      const first = document.querySelector("[data-open-question]")
      if (first !== self.current) return
      const n = Number(e.key)
      if (n >= 1 && n <= item.options.length) (e.preventDefault(), pickRef.current(item.options[n - 1]))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [rows, open, stage, item.options])
  const pickRef = useRef((_: Choice) => {})
  // answered: just the question and the answer, nothing left to press
  if (item.answer !== undefined)
    return (
      <div className="flex flex-col gap-1 px-1">
        <p className="text-xs text-muted-foreground">{item.question}</p>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <HugeiconsIcon icon={Tick02Icon} className="size-3.5 text-muted-foreground" />
          {item.answer === "Skipped" ? <span className="font-normal text-muted-foreground">Skipped</span> : item.answer}
        </p>
      </div>
    )
  const pick = (o: Choice) => (item.multi ? setPicked((p) => (p.includes(o.label) ? p.filter((x) => x !== o.label) : [...p, o.label])) : agent.answer(item.id, o.label, o))
  pickRef.current = pick
  const visual = item.display === "layouts" || item.display === "thumbnails"
  const send = () => agent.answer(item.id, [...picked, ...(other.trim() ? [other.trim()] : [])].join(", "))
  return (
    <div ref={self} data-open-question={rows ? "" : undefined} className="flex flex-col">
    <Card className={cn("animate-in fade-in-0 slide-in-from-bottom-1 duration-300", rows && "gap-2 px-2 pb-2")}>
      <p className={cn("text-sm font-medium", stage && "text-lg", rows && "px-3")}>
        {item.question}
        {rows && item.multi && <span className="ml-2 text-xs font-normal text-muted-foreground">Pick any</span>}
      </p>
      {rows ? (
        <div className="flex flex-col" role={item.multi ? "group" : "radiogroup"} aria-label={item.question}>
          {item.options.map((o, i) => {
            const on = picked.includes(o.label)
            return (
              <button
                key={o.label}
                type="button"
                role={item.multi ? "checkbox" : "radio"}
                aria-checked={on}
                disabled={agent.busy}
                onClick={() => pick(o)}
                className={cn(
                  "group/row relative flex items-center gap-3 px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  stage ? "py-3 text-[15px]" : "py-2.5 text-sm",
                  // a hairline between rows, hidden around the hovered or picked one
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-foreground/8 hover:rounded-lg hover:bg-muted/70 hover:after:opacity-0",
                  on && "rounded-lg bg-primary/10 text-primary after:opacity-0 hover:bg-primary/12",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-md text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-foreground/10",
                    on && "bg-primary text-primary-foreground ring-primary",
                  )}
                >
                  {on && item.multi ? <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className="flex flex-col">
                  {o.label}
                  {o.description && <span className="text-xs text-muted-foreground">{o.description}</span>}
                </span>
              </button>
            )
          })}
          {item.custom && (
            <label className={cn("flex items-center gap-3 rounded-lg px-3 transition-colors focus-within:bg-muted/50 hover:bg-muted/50", stage ? "py-2" : "py-1.5")}>
              <span className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground ring-1 ring-foreground/10">
                <HugeiconsIcon icon={PencilEdit01Icon} className="size-3.5" />
              </span>
              <input
                value={other}
                onChange={(e) => setOther(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && other.trim() && send()}
                placeholder="Something else…"
                aria-label="Your own answer"
                className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          )}
          {(item.multi ? picked.length > 0 || other.trim() : other.trim()) && (
            <Button size="sm" onClick={send} disabled={agent.busy} className="mx-3 mt-2 self-end">
              Continue
            </Button>
          )}
        </div>
      ) : item.display === "chips" ? (
        <div className="flex flex-wrap gap-1.5" role={item.multi ? "group" : "radiogroup"} aria-label={item.question}>
          {item.options.map((o) => (
            <Button
              key={o.label}
              size="sm"
              variant="outline"
              aria-pressed={picked.includes(o.label)}
              onClick={() => pick(o)}
              className={cn("h-8 rounded-full font-normal", picked.includes(o.label) && "border-foreground bg-foreground/5")}
            >
              {picked.includes(o.label) && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />}
              {o.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className={cn("grid gap-2", visual || item.display === "palettes" ? "grid-cols-3" : "grid-cols-2")} role="radiogroup" aria-label={item.question}>
          {item.options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => pick(o)}
              disabled={agent.busy}
              className="group/opt flex flex-col gap-1.5 rounded-xl p-1.5 text-left outline-none ring-1 ring-foreground/10 transition-[box-shadow,background-color] hover:bg-muted/60 hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {visual && (
                <FlickPreview
                  design={{ headline: "Headline", cta: "Shop now", show_price: true, ...o.design }}
                  brand={ctx.brand}
                  ratio={ctx.ratio}
                  posters={ctx.posters}
                  active={i % Math.max(1, ctx.posters.length)}
                  values={{ label: "Label", price: "$99" }}
                  className="w-full rounded-lg shadow-none"
                />
              )}
              {item.display === "palettes" && (
                <span className="flex h-12 overflow-hidden rounded-lg ring-1 ring-foreground/10">
                  {(o.colors?.length ? o.colors : ["#e4e4e7"]).slice(0, 4).map((c, k) => (
                    <span key={k} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
              )}
              <span className="px-1 text-xs font-medium leading-tight">{o.label}</span>
              {o.description && <span className="px-1 pb-0.5 text-[11px] leading-snug text-muted-foreground">{o.description}</span>}
            </button>
          ))}
        </div>
      )}
      {!rows && (item.custom || item.multi) && (
        <div className="flex gap-2">
          {item.custom && (
            <Input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && other.trim() && agent.answer(item.id, [...picked, other.trim()].join(", "))}
              placeholder="Or type your own"
              aria-label="Your own answer"
              className="h-8 flex-1 text-sm"
            />
          )}
          {item.multi && (picked.length > 0 || other.trim()) && (
            <Button size="sm" onClick={() => agent.answer(item.id, [...picked, ...(other.trim() ? [other.trim()] : [])].join(", "))} className="ml-auto">
              Continue
            </Button>
          )}
        </div>
      )}
    </Card>
    </div>
  )
}

function Assets({ item, agent, bare }: { item: Extract<Item, { kind: "assets" }>; agent: Agent; bare?: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const previews = useRef(new Map<File, string>())
  const url = (f: File) => previews.current.get(f) ?? (previews.current.set(f, URL.createObjectURL(f)), previews.current.get(f)!)
  const addFiles = (list: FileList | File[]) => setFiles((f) => [...f, ...[...list].filter((x) => x.type.startsWith("image/"))].slice(0, 8))
  if (item.done)
    return (
      <div className="flex flex-col gap-1.5 px-1">
        <p className="text-xs text-muted-foreground">{item.message}</p>
        {item.done === "added" ? (
          <div className="flex flex-wrap gap-1.5">
            {item.images?.map((u) => <img key={u} src={u} alt="" className="size-10 rounded-lg object-cover ring-1 ring-foreground/10" />)}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
            Skipped
          </p>
        )}
      </div>
    )
  const body = (
    <>
      {!bare && <p className="text-sm font-medium">{item.message}</p>}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (e.target.files && addFiles(e.target.files), (e.target.value = ""))} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => (e.preventDefault(), setOver(false), addFiles(e.dataTransfer.files))}
        className={cn(
          "flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/20 p-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
          over && "border-primary bg-primary/5",
        )}
      >
        {files.length ? (
          <>
            {files.map((f) => <img key={url(f)} src={url(f)} alt={f.name} className="size-14 rounded-lg object-cover ring-1 ring-foreground/10" />)}
            <span className="grid size-14 place-items-center rounded-lg border border-dashed border-foreground/20">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <HugeiconsIcon icon={ImageAdd01Icon} className="size-5" />
            Drop images or click to add
            {item.kinds.length > 0 && <span className="text-xs">{item.kinds.join(", ")}</span>}
          </span>
        )}
      </button>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" disabled={agent.busy} onClick={() => agent.addAssets(item.id, [])}>
          Skip
        </Button>
        <Button size="sm" disabled={agent.busy || !files.length} onClick={() => agent.addAssets(item.id, files)}>
          Add {files.length > 0 ? files.length : ""} image{files.length === 1 ? "" : "s"}
        </Button>
      </div>
    </>
  )
  return bare ? <div className="flex flex-col gap-3 px-4 pb-3">{body}</div> : <Card>{body}</Card>
}

function BrandCard({ item }: { item: Extract<Item, { kind: "brand" }> }) {
  const b = item.brand
  const swatches = [b.primary_color, b.secondary_color, b.text_color].filter((c): c is string => !!c && /^#/.test(c))
  return (
    <Card className="flex-row items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={PaintBoardIcon} className="size-4.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{b.name || "Brand"}</span>
        <span className="truncate text-xs text-muted-foreground">{[b.font, b.tone].filter(Boolean).join(" · ") || "Colours saved"}</span>
      </div>
      <div className="flex -space-x-1.5">
        {swatches.map((c) => (
          <span key={c} title={c} className="size-6 rounded-full ring-2 ring-background" style={{ background: c }} />
        ))}
      </div>
    </Card>
  )
}

function PlanCard({ item, agent, ctx }: { item: Extract<Item, { kind: "plan" }>; agent: Agent; ctx: AgentCtx }) {
  const plan = item.plan
  const set = (p: Partial<Plan>) => agent.editPlan(item.id, { ...plan, ...p })
  const setVar = (i: number, p: Partial<PlanVariation>) => set({ variations: plan.variations.map((v, j) => (j === i ? { ...v, ...p } : v)) })
  const [open, setOpen] = useState(false)
  const videos = 1 + plan.variations.length
  const total = videos * ctx.videoCost
  // fields some variation sets for itself: every variation gets a box for them
  const perVar = (["label", "headline", "subheading", "cta"] as const).filter((f) => plan.variations.some((v) => v[f] !== undefined))
  const short = ctx.credits < total
  // approved (or replaced): one line, opens to read
  if (item.state !== "open")
    return (
      <div className="flex flex-col gap-2 px-1">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <HugeiconsIcon icon={item.state === "approved" ? Tick02Icon : Cancel01Icon} className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{plan.title}</span>
          <span className="text-xs text-muted-foreground">
            {item.state === "approved" ? `${plan.variations.length} variations` : "Replaced by a newer plan"}
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} className={cn("ml-auto size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <ol className="flex flex-col gap-1 border-l pl-3 text-xs text-muted-foreground">
            <li>Reference: {plan.reference.prompt}</li>
            {plan.variations.map((v, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{v.name}</span>
                {v.price ? ` · ${v.price}` : ""}: {v.prompt}
              </li>
            ))}
          </ol>
        )}
      </div>
    )
  const quiet = "rounded-md border-0 bg-transparent px-1.5 shadow-none outline-none transition-colors hover:bg-muted/70 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-transparent"
  return (
    <Card className="gap-0 overflow-hidden p-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Plan</span>
          <input value={plan.title} onChange={(e) => set({ title: e.target.value })} aria-label="Project name" className={cn(quiet, "h-7 min-w-0 flex-1 text-sm font-medium")} />
        </div>
        {/* the outline: one card per video, edited in place */}
        <ol className="flex flex-col gap-1.5">
          <li className="flex gap-2.5 rounded-xl bg-muted/50 p-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-background text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/10">R</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="px-1.5 text-xs font-medium text-muted-foreground">Reference video</span>
              <textarea value={plan.reference.prompt} onChange={(e) => set({ reference: { prompt: e.target.value } })} aria-label="Reference video prompt" rows={1} className={cn(quiet, "field-sizing-content min-h-0 resize-none py-0.5 text-sm leading-relaxed")} />
            </div>
          </li>
          {plan.variations.map((v, i) => (
            <li key={i} className="group/v relative flex gap-2.5 rounded-xl bg-muted/50 p-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-background text-[11px] font-medium tabular-nums ring-1 ring-foreground/10">{i + 1}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <input value={v.name} onChange={(e) => setVar(i, { name: e.target.value })} aria-label={`Variation ${i + 1} name`} className={cn(quiet, "h-6 min-w-0 flex-1 text-sm font-medium")} />
                  <input value={v.price ?? ""} onChange={(e) => setVar(i, { price: e.target.value || undefined })} placeholder="Price" aria-label={`${v.name} price`} className={cn(quiet, "h-6 w-16 text-right text-sm tabular-nums placeholder:text-muted-foreground/60")} />
                </div>
                <textarea value={v.prompt} onChange={(e) => setVar(i, { prompt: e.target.value })} aria-label={`${v.name} prompt`} rows={1} className={cn(quiet, "field-sizing-content min-h-0 resize-none py-0.5 text-sm leading-relaxed text-foreground/80")} />
                {/* on-screen text this plan sets per variation (feeds) */}
                {perVar.length > 0 && (
                  <div className="flex flex-wrap gap-x-1">
                    {perVar.map((f) => (
                      <label key={f} className="flex min-w-0 flex-1 basis-32 items-center gap-1 text-xs text-muted-foreground">
                        <span className="shrink-0 pl-1.5">{FIELD_LABEL[f]}</span>
                        <input value={v[f] ?? ""} onChange={(e) => setVar(i, { [f]: e.target.value })} aria-label={`${v.name} ${FIELD_LABEL[f]}`} className={cn(quiet, "h-6 min-w-0 flex-1 text-xs text-foreground")} />
                      </label>
                    ))}
                  </div>
                )}
                <input value={v.link ?? ""} onChange={(e) => setVar(i, { link: e.target.value || undefined })} placeholder="Add a link for the button" aria-label={`${v.name} link`} className={cn(quiet, "h-6 text-xs text-muted-foreground placeholder:text-muted-foreground/60")} />
              </div>
              {plan.variations.length > 2 && (
                <Button variant="ghost" size="icon-xs" aria-label={`Remove ${v.name}`} onClick={() => set({ variations: plan.variations.filter((_, j) => j !== i) })} className="absolute -right-1.5 -top-1.5 size-5 rounded-full bg-background opacity-0 shadow-sm ring-1 ring-foreground/10 group-hover/v:opacity-100 focus-visible:opacity-100">
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </Button>
              )}
            </li>
          ))}
        </ol>
        {plan.variations.length < 5 && (
          <button
            type="button"
            onClick={() => set({ variations: [...plan.variations, { name: `Variation ${plan.variations.length + 1}`, prompt: "Same scene, " }] })}
            className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-dashed border-foreground/15 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
            Add variation
          </button>
        )}
        <div className="flex flex-col gap-1">
          <span className="px-1.5 text-xs font-medium text-muted-foreground">On screen</span>
          <div className="flex gap-1.5">
            <input value={plan.design.headline ?? ""} onChange={(e) => set({ design: { ...plan.design, headline: e.target.value } })} placeholder="Headline" aria-label="Headline" className={cn(quiet, "h-8 min-w-0 flex-1 bg-muted/50 text-sm")} />
            <input value={plan.design.cta ?? ""} onChange={(e) => set({ design: { ...plan.design, cta: e.target.value } })} placeholder="Button" aria-label="Button text" className={cn(quiet, "h-8 w-28 bg-muted/50 text-sm")} />
          </div>
        </div>
      </div>
      {/* like Gamma: the count and the one action, always at the bottom */}
      <div className="flex items-center gap-3 border-t bg-muted/40 px-3 py-2.5">
        <span className="text-xs text-muted-foreground">
          {videos} videos · {total.toLocaleString()} credits
          {short && <span className="text-destructive"> · you have {ctx.credits.toLocaleString()}</span>}
        </span>
        <Button size="sm" className="ml-auto gap-1.5" disabled={agent.busy} onClick={() => agent.decidePlan(item.id, plan)}>
          <HugeiconsIcon icon={SparklesIcon} className="size-4" />
          Generate all
        </Button>
      </div>
    </Card>
  )
}

/** A page the chat read through the server: the site, what it found, and the images it kept. */
function SiteCard({ item }: { item: Extract<Item, { kind: "site" }> }) {
  let host = item.url
  try {
    host = new URL(/^https?:/.test(item.url) ? item.url : `https://${item.url}`).hostname.replace(/^www\./, "")
  } catch {
    /* show it as typed */
  }
  return (
    <Card className="gap-2.5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <HugeiconsIcon icon={item.state === "working" ? Loading03Icon : item.state === "failed" ? Alert02Icon : Globe02Icon} className={cn("size-3.5", item.state === "working" && "animate-spin")} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{item.state === "working" ? `Reading ${host}…` : item.state === "failed" ? `Couldn't read ${host}` : (item.title || host)}</span>
          <span className="truncate text-xs text-muted-foreground">
            {item.state === "failed" ? item.reason : item.state === "done" ? [host, item.price, `${item.images.length} image${item.images.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ") : "Through the app, without leaving it"}
          </span>
        </div>
      </div>
      {item.state === "working" && (
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="shimmer aspect-square rounded-lg bg-muted" />
          ))}
        </div>
      )}
      {item.state === "done" && item.images.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {item.images.map((u) => (
            <img key={u} src={u} alt="" className="aspect-square w-full rounded-lg object-cover ring-1 ring-foreground/10 animate-in fade-in-0 duration-300" />
          ))}
        </div>
      )}
    </Card>
  )
}

/** After Generate all: each part of the Flick, ticking off as it's ready. */
function BuildCard({ ctx }: { ctx: AgentCtx }) {
  const steps = ctx.progress()
  const done = steps.filter((x) => x.state === "done").length
  return (
    <Card className="gap-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{done === steps.length ? "Your Flick is ready" : "Building your Flick"}</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {done}/{steps.length}
        </span>
      </div>
      <ol className="flex flex-col gap-1.5">
        {steps.map((x) => (
          <li key={x.label} className="flex items-center gap-2 text-sm">
            <span className={cn("grid size-4 shrink-0 place-items-center rounded-full", x.state === "done" ? "bg-foreground text-background" : "ring-1 ring-foreground/20")}>
              {x.state === "done" ? <HugeiconsIcon icon={Tick02Icon} className="size-2.5" strokeWidth={3} /> : x.state === "working" ? <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin text-primary" /> : null}
            </span>
            <span className={cn(x.state === "waiting" && "text-muted-foreground")}>{x.label}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

const STATUS: Record<string, string> = { starting: "starting", queued: "waiting in Higgsfield's queue", in_progress: "generating", completed: "finishing" }
/** seconds since an image started, ticking */
function Elapsed({ since }: { since: number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.round((Date.now() - since) / 1000)
  return <>{s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`} · usually 20 to 60s</>
}

function ImageCard({ item, ctx, agent }: { item: Extract<Item, { kind: "image" }>; ctx: AgentCtx; agent: Agent }) {
  const what = item.purpose === "thumbnail" && item.target ? `Thumbnail for ${item.target}` : item.purpose === "canvas" ? "For the canvas" : "Image idea"
  const [added, setAdded] = useState(false)
  return (
    <div className="mr-10 flex items-center gap-3 rounded-2xl p-1.5 pr-3">
      <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
        {item.state === "working" ? (
          <>
            <span aria-hidden className="generating-gradient absolute inset-[-50%]" />
            <HugeiconsIcon icon={Loading03Icon} className="relative size-4 animate-spin text-primary" />
          </>
        ) : item.state === "done" ? (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label="Open image">
            <img src={item.url} alt={item.prompt} className="absolute inset-0 size-full object-cover" />
          </a>
        ) : (
          <HugeiconsIcon icon={Alert02Icon} className="size-4 text-destructive" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{item.state === "working" ? `${what}: ${STATUS[item.status ?? ""] ?? "making it"}…` : item.state === "failed" ? "Image failed" : what}</span>
        <span className={cn("text-xs text-muted-foreground", item.state !== "failed" && "truncate")}>
          {item.state === "failed" ? item.error : item.state === "done" && item.placed ? "Added to the Flick" : item.state === "working" && item.startedAt ? <Elapsed since={item.startedAt} /> : item.prompt}
        </span>
      </span>
      {item.state === "failed" && (
        <Button size="xs" variant="outline" onClick={() => agent.retryImage(item.id)} className="gap-1">
          <HugeiconsIcon icon={RefreshIcon} className="size-3" />
          Retry
        </Button>
      )}
      {item.state === "done" && !item.placed && (
        <Button size="xs" variant="outline" disabled={added} onClick={() => (ctx.addToCanvas(item.url!), setAdded(true))}>
          {added ? "Added" : "Add to canvas"}
        </Button>
      )}
    </div>
  )
}

/** The chat's message box: text, images, send (or stop while it replies). */
export function AgentComposer({ agent, placeholder }: { agent: Agent; placeholder?: string }) {
  const [text, setText] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const input = useRef<HTMLInputElement>(null)
  const urls = useRef(new Map<File, string>())
  const url = (f: File) => urls.current.get(f) ?? (urls.current.set(f, URL.createObjectURL(f)), urls.current.get(f)!)
  const can = (text.trim() || files.length) && !agent.busy
  const send = () => {
    if (!can) return
    agent.send(text.trim(), files)
    setText("")
    setFiles([])
  }
  return (
    <div
      className="rounded-2xl border bg-background p-2 shadow-sm"
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => (e.preventDefault(), setFiles((f) => [...f, ...[...e.dataTransfer.files].filter((x) => x.type.startsWith("image/"))].slice(0, 8)))}
    >
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (e.target.files && setFiles((f) => [...f, ...e.target.files!].slice(0, 8)), (e.target.value = ""))} />
      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-1 pb-1 pt-1.5">
          {files.map((f) => (
            <div key={url(f)} className="group/f relative size-12 shrink-0">
              <img src={url(f)} alt={f.name} className="size-12 rounded-lg object-cover ring-1 ring-foreground/10" />
              <Button variant="secondary" size="icon-xs" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y !== f))} className="absolute -right-1.5 -top-1.5 size-5 rounded-full opacity-0 shadow-sm ring-1 ring-foreground/10 group-hover/f:opacity-100 focus-visible:opacity-100">
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) (e.preventDefault(), send())
        }}
        onPaste={(e) => e.clipboardData.files.length && (e.preventDefault(), setFiles((f) => [...f, ...[...e.clipboardData.files].filter((x) => x.type.startsWith("image/"))].slice(0, 8)))}
        placeholder={placeholder ?? "Describe your Flick, or ask for a change"}
        aria-label="Message"
        rows={2}
        className="field-sizing-content min-h-[52px] max-h-[160px] resize-none rounded-none border-0 bg-transparent px-1.5 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex items-center gap-1.5 px-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Add images" onClick={() => input.current?.click()}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add images</TooltipContent>
        </Tooltip>
        <div className="flex-1" />
        {agent.busy ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="secondary" aria-label="Stop" onClick={agent.stop}>
                <HugeiconsIcon icon={StopIcon} className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop</TooltipContent>
          </Tooltip>
        ) : (
          <Button size="icon-sm" aria-label="Send" disabled={!can} onClick={send}>
            <HugeiconsIcon icon={ArrowUp02Icon} className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

type Q = Extract<Item, { kind: "question" }>

/**
 * The questions the chat is waiting on, docked above the composer like Claude's and Higgsfield's:
 * one at a time ("1 of 3", arrows), numbered answers (keys 1 to 9), "Something else", Skip and
 * Continue. Picking moves to the next question; the answers go back together once all are in.
 */
type Deckable = Q | Extract<Item, { kind: "assets" }>
/** the cards a chat reply is waiting on that dock above the composer: questions and image requests */
export const isDocked = (x: Item, pendingIds: string[]) => (x.kind === "question" || x.kind === "assets") && pendingIds.includes(x.id)
const settled = (x: Deckable) => (x.kind === "question" ? x.answer !== undefined : !!x.done)

export function QuestionDeck({ agent, ctx, className }: { agent: Agent; ctx: AgentCtx; className?: string }) {
  const qs = agent.items.filter((x): x is Deckable => isDocked(x, agent.pendingIds))
  const [at, setAt] = useState(0)
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const key = qs.map((q) => q.id).join()
  // a new set of questions starts at the first
  useEffect(() => setAt(0), [key])
  const i = Math.min(at, Math.max(0, qs.length - 1))
  const q = qs[i]
  const nextOpen = (from: number) => {
    for (let k = 1; k <= qs.length; k++) {
      const j = (from + k) % qs.length
      if (!settled(qs[j])) return j
    }
    return -1
  }
  const advance = () => {
    const j = nextOpen(i)
    if (j >= 0) setAt(j)
  }
  // an image request moves on by itself once its images are added or skipped
  const reqDone = q?.kind === "assets" && !!q.done
  useEffect(() => {
    if (reqDone) advance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqDone])
  const mine = q ? (picked[q.id] ?? []) : []
  const typed = q ? (other[q.id] ?? "") : ""
  const commit = (value: string, choice?: Choice) => {
    if (!q) return
    if (q.kind === "assets") return void agent.addAssets(q.id, [])
    agent.answer(q.id, value, choice)
    advance()
  }
  const pick = (o: Choice) => {
    if (!q || q.kind !== "question") return
    if (q.multi) setPicked((p) => ({ ...p, [q.id]: mine.includes(o.label) ? mine.filter((x) => x !== o.label) : [...mine, o.label] }))
    else commit(o.label, o)
  }
  const cont = () => {
    const all = [...mine, ...(typed.trim() ? [typed.trim()] : [])]
    if (all.length) commit(all.join(", "))
  }
  // keys: 1 to 9 pick, Esc skips (not while typing)
  const pickRef = useRef(pick)
  pickRef.current = pick
  const skipRef = useRef(() => {})
  skipRef.current = () => commit("Skipped")
  useEffect(() => {
    if (!q || q.kind !== "question") return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, [contenteditable]")) return
      const n = Number(e.key)
      if (n >= 1 && n <= Math.min(9, q.options.length)) (e.preventDefault(), pickRef.current(q.options[n - 1]))
      else if (e.key === "Escape") skipRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [q])
  if (!q) return null
  const pager =
    qs.length > 1 ? (
      <div className="flex shrink-0 items-center gap-0.5 text-xs tabular-nums text-muted-foreground">
        <Button size="icon-xs" variant="ghost" aria-label="Previous" disabled={i === 0} onClick={() => setAt(i - 1)}>
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        </Button>
        {i + 1} of {qs.length}
        <Button size="icon-xs" variant="ghost" aria-label="Next" disabled={i === qs.length - 1} onClick={() => setAt(i + 1)}>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
        </Button>
      </div>
    ) : null
  const shell = "flex flex-col overflow-hidden rounded-2xl bg-background shadow-lg ring-1 ring-foreground/10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
  if (q.kind === "assets")
    return (
      <section aria-label="Questions" className={cn(shell, className)}>
        <header className="flex items-start gap-3 px-4 pb-2 pt-3.5">
          <p className="flex-1 text-[15px] font-medium leading-snug">{q.message}</p>
          {pager}
        </header>
        <Assets item={q} agent={agent} bare />
      </section>
    )
  const visual = q.display === "layouts" || q.display === "thumbnails"
  const chosen = (o: Choice) => (q.multi ? mine.includes(o.label) : q.answer === o.label)
  return (
    <section aria-label="Questions" className={cn(shell, className)}>
      <header className="flex items-start gap-3 px-4 pb-2 pt-3.5">
        <p className="flex-1 text-[15px] font-medium leading-snug">
          {q.question}
          {q.multi && <span className="ml-2 text-xs font-normal text-muted-foreground">Pick any</span>}
        </p>
        {pager}
      </header>
      <div className="max-h-[50vh] overflow-y-auto px-2">
        {q.display === "chips" || q.display === "cards" ? (
          <div className="flex flex-col" role={q.multi ? "group" : "radiogroup"} aria-label={q.question}>
            {q.options.map((o, n) => {
              const on = chosen(o)
              return (
                <button
                  key={o.label}
                  type="button"
                  role={q.multi ? "checkbox" : "radio"}
                  aria-checked={on}
                  disabled={agent.busy}
                  onClick={() => pick(o)}
                  className={cn(
                    "group/row relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                    "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-foreground/8 last:after:hidden hover:after:opacity-0",
                    on && "bg-primary/10 after:opacity-0 hover:bg-primary/12",
                  )}
                >
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-md text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-foreground/10", on && "bg-primary text-primary-foreground ring-primary")}>
                    {on && q.multi ? <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.5} /> : n + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn(on && "text-primary")}>{o.label}</span>
                    {o.description && <span className="text-xs text-muted-foreground">{o.description}</span>}
                  </span>
                  {!q.multi && <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100" />}
                </button>
              )
            })}
          </div>
        ) : (
          <div className={cn("grid gap-2 p-1", "grid-cols-3")} role="radiogroup" aria-label={q.question}>
            {q.options.map((o, n) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={chosen(o)}
                onClick={() => pick(o)}
                disabled={agent.busy}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl p-1.5 text-left outline-none ring-1 ring-foreground/10 transition-[box-shadow,background-color] hover:bg-muted/60 hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring",
                  chosen(o) && "bg-primary/10 ring-2 ring-primary",
                )}
              >
                {visual && (
                  <FlickPreview
                    design={{ headline: "Headline", cta: "Shop now", show_price: true, ...o.design }}
                    brand={ctx.brand}
                    ratio={ctx.ratio}
                    posters={ctx.posters}
                    active={n % Math.max(1, ctx.posters.length)}
                    values={{ label: "Label", price: "$99" }}
                    className="w-full rounded-lg shadow-none"
                  />
                )}
                {q.display === "palettes" && (
                  <span className="flex h-12 overflow-hidden rounded-lg ring-1 ring-foreground/10">
                    {(o.colors?.length ? o.colors : ["#e4e4e7"]).slice(0, 4).map((c, k) => (
                      <span key={k} className="flex-1" style={{ background: c }} />
                    ))}
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-1 text-xs font-medium leading-tight">
                  <span className="text-muted-foreground tabular-nums">{n + 1}</span>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t px-3 py-2">
        <HugeiconsIcon icon={PencilEdit01Icon} className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={typed}
          onChange={(e) => setOther((o) => ({ ...o, [q.id]: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), cont())}
          placeholder="Something else…"
          aria-label="Your own answer"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button size="sm" variant="ghost" disabled={agent.busy} onClick={() => commit("Skipped")} className="gap-1.5 text-muted-foreground">
          Skip <kbd className="rounded bg-muted px-1 text-[10px] font-normal">Esc</kbd>
        </Button>
        {(q.multi || typed.trim()) && (
          <Button size="sm" disabled={agent.busy || !(mine.length || typed.trim())} onClick={cont}>
            Continue
          </Button>
        )}
      </footer>
    </section>
  )
}
