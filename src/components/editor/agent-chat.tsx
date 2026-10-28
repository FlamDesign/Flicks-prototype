import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Alert02Icon, ArrowUp02Icon, ImageAdd01Icon, Loading03Icon, PaintBoardIcon, RefreshIcon, StopIcon, Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Item, useAgent } from "@/ai/agent"
import type { Plan } from "@/ai/design"
import { cn } from "@/lib/utils"

type Agent = ReturnType<typeof useAgent>
export type AgentCtx = { videoCost: number; credits: number; addToCanvas: (url: string) => void; focusComposer: () => void }

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
      return <Said text={item.text} streaming={item.streaming} />
    case "question":
      return <Question item={item} agent={agent} />
    case "assets":
      return <Assets item={item} agent={agent} />
    case "brand":
      return <BrandCard item={item} />
    case "plan":
      return <PlanCard item={item} agent={agent} ctx={ctx} />
    case "image":
      return <ImageCard item={item} ctx={ctx} />
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

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("mr-2 flex flex-col gap-3 rounded-2xl bg-background p-3 shadow-xs ring-1 ring-foreground/10", className)}>{children}</div>
)

function Question({ item, agent }: { item: Extract<Item, { kind: "question" }>; agent: Agent }) {
  const [picked, setPicked] = useState<string[]>([])
  const [other, setOther] = useState("")
  const done = item.answer !== undefined
  const chosen = done ? item.answer!.split(", ") : picked
  const pick = (o: string) => (item.multi ? setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o])) : agent.answer(item.id, o))
  return (
    <Card>
      <p className="text-sm font-medium">{item.question}</p>
      <div className="flex flex-wrap gap-1.5" role={item.multi ? "group" : "radiogroup"} aria-label={item.question}>
        {item.options.map((o) => (
          <Button
            key={o}
            size="sm"
            variant="outline"
            disabled={done || agent.busy}
            aria-pressed={chosen.includes(o)}
            onClick={() => pick(o)}
            className={cn("h-8 rounded-full font-normal disabled:opacity-100", chosen.includes(o) ? "border-foreground bg-foreground/5" : done && "opacity-50")}
          >
            {chosen.includes(o) && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />}
            {o}
          </Button>
        ))}
        {done && !item.options.some((o) => chosen.includes(o)) && (
          <span className="flex h-8 items-center rounded-full border border-foreground bg-foreground/5 px-3 text-sm">{item.answer}</span>
        )}
      </div>
      {!done && (item.custom || item.multi) && (
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
          {item.multi && (
            <Button size="sm" disabled={agent.busy || (!picked.length && !other.trim())} onClick={() => agent.answer(item.id, [...picked, ...(other.trim() ? [other.trim()] : [])].join(", "))} className="ml-auto">
              Continue
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function Assets({ item, agent }: { item: Extract<Item, { kind: "assets" }>; agent: Agent }) {
  const [files, setFiles] = useState<File[]>([])
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const previews = useRef(new Map<File, string>())
  const url = (f: File) => previews.current.get(f) ?? (previews.current.set(f, URL.createObjectURL(f)), previews.current.get(f)!)
  const addFiles = (list: FileList | File[]) => setFiles((f) => [...f, ...[...list].filter((x) => x.type.startsWith("image/"))].slice(0, 8))
  if (item.done)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{item.message}</p>
        {item.done === "added" ? (
          <div className="flex flex-wrap gap-1.5">
            {item.images?.map((u) => <img key={u} src={u} alt="" className="size-12 rounded-lg object-cover ring-1 ring-foreground/10" />)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Skipped</p>
        )}
      </Card>
    )
  return (
    <Card>
      <p className="text-sm font-medium">{item.message}</p>
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
    </Card>
  )
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
  const [plan, setPlan] = useState<Plan>(item.plan)
  useEffect(() => setPlan(item.plan), [item.plan])
  const open = item.state === "open"
  const videos = 1 + plan.variations.length
  const total = videos * ctx.videoCost
  const short = ctx.credits < total
  const setVar = (i: number, p: Partial<Plan["variations"][number]>) => setPlan((x) => ({ ...x, variations: x.variations.map((v, j) => (j === i ? { ...v, ...p } : v)) }))
  const field = "h-8 rounded-lg text-sm"
  return (
    <Card className={cn("gap-4 p-4", !open && "opacity-80")}>
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Plan</span>
        {open ? (
          <Input value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} aria-label="Project name" className="h-8 flex-1 border-transparent px-1.5 text-sm font-medium shadow-none hover:border-input" />
        ) : (
          <span className="flex-1 truncate text-sm font-medium">{plan.title}</span>
        )}
        {item.state === "approved" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
            Generated
          </span>
        )}
        {item.state === "skipped" && <span className="text-xs text-muted-foreground">Replaced</span>}
      </div>

      <section className="flex flex-col gap-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">Reference video</h4>
        <Textarea
          value={plan.reference.prompt}
          readOnly={!open}
          onChange={(e) => setPlan({ ...plan, reference: { prompt: e.target.value } })}
          aria-label="Reference video prompt"
          className="field-sizing-content min-h-0 resize-none rounded-lg text-sm"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">{plan.variations.length} variations</h4>
        {plan.variations.map((v, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-2.5">
            <div className="flex items-center gap-1.5">
              <Input value={v.name} readOnly={!open} onChange={(e) => setVar(i, { name: e.target.value })} aria-label={`Variation ${i + 1} name`} className={cn(field, "flex-1 bg-background font-medium")} />
              {(v.price !== undefined || open) && (
                <Input value={v.price ?? ""} readOnly={!open} onChange={(e) => setVar(i, { price: e.target.value })} placeholder="Price" aria-label={`${v.name} price`} className={cn(field, "w-20 bg-background")} />
              )}
            </div>
            <Textarea
              value={v.prompt}
              readOnly={!open}
              onChange={(e) => setVar(i, { prompt: e.target.value })}
              aria-label={`${v.name} prompt`}
              className="field-sizing-content min-h-0 resize-none rounded-lg bg-background text-sm"
            />
            {(open || v.link) && (
              <Input value={v.link ?? ""} readOnly={!open} onChange={(e) => setVar(i, { link: e.target.value })} placeholder="Link for Shop now" aria-label={`${v.name} link`} className={cn(field, "bg-background text-xs")} />
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">On screen</h4>
        <div className="flex gap-1.5">
          <Input value={plan.design.headline ?? ""} readOnly={!open} onChange={(e) => setPlan({ ...plan, design: { ...plan.design, headline: e.target.value } })} placeholder="Headline" aria-label="Headline" className={cn(field, "flex-1")} />
          <Input value={plan.design.cta ?? ""} readOnly={!open} onChange={(e) => setPlan({ ...plan, design: { ...plan.design, cta: e.target.value } })} placeholder="Button" aria-label="Button text" className={cn(field, "w-28")} />
        </div>
        <p className="text-xs text-muted-foreground">
          {[plan.design.show_label && "Label", plan.design.show_price && "Price", "Thumbnails"].filter(Boolean).join(", ")} change per variation · {plan.design.layout ?? "bottom"} layout
        </p>
      </section>

      {open && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {videos} videos · {total.toLocaleString()} credits
            </span>
            {short && <span className="text-destructive">You have {ctx.credits.toLocaleString()}</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={agent.busy} onClick={ctx.focusComposer}>
              Ask for changes
            </Button>
            <Button size="sm" className="flex-1" disabled={agent.busy || plan.variations.length < 2} onClick={() => agent.decidePlan(item.id, plan)}>
              Generate all
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function ImageCard({ item, ctx }: { item: Extract<Item, { kind: "image" }>; ctx: AgentCtx }) {
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
        <span className="text-sm font-medium">{item.state === "working" ? "Making an image…" : item.state === "failed" ? "Image failed" : what}</span>
        <span className="truncate text-xs text-muted-foreground">{item.state === "failed" ? item.error : item.state === "done" && item.placed ? "Added to the Flick" : item.prompt}</span>
      </span>
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
