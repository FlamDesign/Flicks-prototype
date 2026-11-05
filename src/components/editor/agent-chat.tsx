import { GeneratingGradient, PictureSlot } from "@/components/editor/generation-progress"
import { Shortcut } from "@/components/shortcut"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Alert02Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon, CheckmarkBadge01Icon, Globe02Icon, ArrowUp02Icon, ImageAdd01Icon, PencilEdit01Icon, LeftToRightListNumberIcon, PaintBoardIcon, RefreshIcon, SparklesIcon, StopIcon, Tick02Icon, Cancel01Icon, PlayIcon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputGroupInput } from "@/components/ui/input-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Choice, Item, useAgent } from "@/ai/agent"
import type { Brand, Plan, PlanVariation } from "@/ai/design"
import { FlickPreview } from "@/components/editor/flick-preview"
import { noNames } from "@/ai/client"
import { BriefUpdate, briefAt, briefSig, sigOf, type BriefEntry } from "@/components/editor/brief-card"
import { cn } from "@/lib/utils"
import { useMediaAdd } from "@/components/media-picker"
import { MentionTextarea, useMentionOptions } from "@/components/mention-input"
import { elementsIn } from "@/lib/elements"
import { asFile, blobUrl } from "@/lib/media"

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
  /** each video in the build, read live: shown in place in the chat as it's made */
  videos?: () => BuildVideo[]
  /** the Flick's size ("1080×1080") and length in seconds, for the brief */
  size: string
  seconds: number
}
export type BuildVideo = { name: string; state: "empty" | "generating" | "done"; src?: string; poster?: string; since?: number; ms?: number; status?: string }

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
        {item.kind === "plan" ? "Opened the storyboard" : item.kind === "assets" ? "Asked for images" : "Opened a choice"}: <span className="text-foreground">{what}</span>
      </span>
    </button>
  )
}


/** One chat item: the chat's words, its questions and cards, and the user's messages. */
export function AgentItemView({ item, agent, ctx }: { item: Item; agent: Agent; ctx: AgentCtx }) {
  switch (item.kind) {
    case "user":
      return (
        <div className="ml-10 flex max-w-[85%] flex-col gap-2 self-end rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5">
          {item.images.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.images.map((u) => (
                <img loading="lazy" decoding="async" key={u} src={u} alt="" className="size-12 rounded-lg object-cover ring-1 ring-foreground/10" />
              ))}
            </div>
          )}
          {item.text && <p className="whitespace-pre-line text-sm leading-relaxed">{item.text}</p>}
        </div>
      )
    case "assistant":
      return (
        <div className="flex flex-col gap-2">
          {(item.text || !item.streaming) && <Said text={item.text} streaming={item.streaming} />}
          {item.streaming && (
            <span aria-live="polite" className="flex h-6 items-center px-1 text-sm">
              {/* a calm shimmer over what it's doing, instead of bouncing dots */}
              <span key={item.activity ?? "thinking"} className="text-shimmer animate-in fade-in-0">{item.activity ? `${item.activity}…` : "Thinking…"}</span>
            </span>
          )}
        </div>
      )
    case "question":
      return <Question item={item} agent={agent} ctx={ctx} />
    case "assets":
      return <Assets item={item} agent={agent} />
    case "brand":
      return <BrandTable item={item} />
    case "plan":
      // once approved, the storyboard folds to one row
      return item.state === "approved" ? <ApprovedPlan item={item} agent={agent} ctx={ctx} /> : <PlanCard item={item} agent={agent} ctx={ctx} />
    case "image":
      return <ImageCard item={item} ctx={ctx} agent={agent} />
    case "build":
      return <BuildCard ctx={ctx} agent={agent} />
    case "site":
      return <Steps items={[item]} live={item.state === "working"} />
    case "skill":
    case "browse":
    case "design":
      return <Steps items={[item]} live={false} />
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
          <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-3.5 text-foreground" />
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
          <ErrorText text={item.text} />
          <Button size="xs" variant="outline" onClick={agent.retry} className="gap-1">
            <HugeiconsIcon icon={RefreshIcon} className="size-3" />
            Retry
          </Button>
        </div>
      )
  }
}

/** An error in plain words; the raw message (for us) sits behind "Details". */
function ErrorText({ text: raw0 }: { text: string }) {
  const text = noNames(raw0)
  const [open, setOpen] = useState(false)
  const raw = /^[{[]|invalid_request|_error|status \d{3}/i.test(text)
  const plain = !raw
    ? text
    : /overloaded|529|rate|429/i.test(text)
      ? "Claude is busy right now. Try again in a moment."
      : /credit balance is too low|billing/i.test(text)
        ? "The AI account is out of credit. Top it up in the Anthropic Console (Plans & Billing), then press Retry."
        : /daily_limit/i.test(text)
        ? "Today’s limit for the AI is reached. It resets tomorrow."
        : "Something went wrong talking to the AI. Try again."
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p>{plain}</p>
      {raw && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)} className="self-start text-xs text-muted-foreground underline-offset-2 outline-none hover:underline focus-visible:underline">
            {open ? "Hide details" : "Details"}
          </button>
          {open && <p className="break-all font-mono text-xs text-muted-foreground">{text}</p>}
        </>
      )}
    </div>
  )
}

/** what reading each guide meant, said as the work it was */
const SKILL_DONE: Record<string, string> = {
  brief: "shaped the brief",
  categories: "found the angle",
  concepts: "explored concepts",
  brand: "studied the brand",
  shots: "blocked out the shots",
  video: "directed the videos",
  models: "set up the shoot",
  images: "framed the shots",
  design: "laid out the frame",
  review: "checked every frame",
}
const isLegacyBrowse = (it: Item) => it.kind === "note" && (it.text.startsWith("Searched the web") || /^Read \S/.test(it.text))
/** which per-turn card an item folds into, if any */
function bucketOf(it: Item): "steps" | "gallery" | undefined {
  if (it.kind === "image" && it.purpose !== "view" && it.purpose !== "sheet") return "gallery"
  if (it.kind === "site" || it.kind === "browse" || it.kind === "design" || it.kind === "image" || it.kind === "skill" || it.kind === "note" || (it.kind === "review" && !it.fail.length)) return "steps"
  return undefined
}
/** questions answered and image requests done: they become a brief update */
const isAnswered = (it: Item) => (it.kind === "question" && it.answer !== undefined && it.display !== "concepts") || (it.kind === "assets" && !!it.done)

type Group = { key: string; at: number; node: React.ReactNode }
/**
 * The conversation as groups. Between two things the user did, the chat's behind-the-scenes work folds
 * into one card of each kind (a recap line, the websites it visited, the images it made, the changes to
 * the Flick), placed where the first of them happened; answers become a "Brief updated" card.
 */
export function threadGroups(items: Item[], agent: Agent, ctx: AgentCtx): Group[] {
  const busy = agent.busy
  const out: Group[] = []
  const isInput = (it: Item) => it.kind === "user" || isAnswered(it)
  let before = briefSig([])
  // brief updates: only the newest shows in full, earlier ones fold to a line
  const briefs: { group: Group; entries: BriefEntry[] }[] = []
  for (let i = 0; i < items.length; ) {
    const it = items[i]
    if (isAnswered(it)) {
      let j = i
      while (j < items.length && isAnswered(items[j])) j++
      const entries = briefAt(items.slice(0, j), agent, ctx)
      const changed = entries.filter((e) => before.get(e.key) !== sigOf(e))
      before = briefSig(entries)
      if (changed.length) {
        const group: Group = { key: it.id, at: it.at, node: null }
        briefs.push({ group, entries })
        out.push(group)
      }
      i = j
      continue
    }
    if (it.kind === "user") {
      out.push({ key: it.id, at: it.at, node: <AgentItemView item={it} agent={agent} ctx={ctx} /> })
      i++
      continue
    }
    // one stretch of the chat's own work, up to the user's next message or answer
    let j = i
    while (j < items.length && !isInput(items[j])) j++
    const buckets = new Map<string, { group: Group; items: Item[] }>()
    for (const x of items.slice(i, j)) {
      const b = bucketOf(x)
      if (!b) {
        out.push({ key: x.id, at: x.at, node: <AgentItemView item={x} agent={agent} ctx={ctx} /> })
        continue
      }
      const known = buckets.get(b)
      if (known) known.items.push(x)
      else {
        const group: Group = { key: `${b}-${x.id}`, at: x.at, node: null }
        buckets.set(b, { group, items: [x] })
        out.push(group)
      }
    }
    // the stretch still under way: its steps stay open while the chat works
    const live = busy && j === items.length
    for (const [b, { group, items: g }] of buckets)
      group.node =
        b === "steps" ? (
          <Steps items={g} live={live} />
        ) : g.length === 1 ? (
          <AgentItemView item={g[0]} agent={agent} ctx={ctx} />
        ) : (
          <Gallery items={g as Extract<Item, { kind: "image" }>[]} agent={agent} ctx={ctx} />
        )
    // what the chat's own cards showed (brand, plan, concept) is already seen: brief updates list only what answers changed
    before = briefSig(briefAt(items.slice(0, j), agent, ctx))
    i = j
  }
  briefs.forEach((b, k) => (b.group.node = <BriefUpdate all={b.entries} latest={k === briefs.length - 1} />))
  return out.filter((g) => g.node !== null)
}

/** a line that opens to more: the shared look of the folded cards */
function Fold({ head, children, defaultOpen = false, className }: { head: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cn("mr-6 flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10", className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-10 w-full items-center gap-2 px-3 py-1.5 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50">
        {head}
        <HugeiconsIcon icon={ArrowDown01Icon} className={cn("ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t animate-in fade-in-0">{children}</div>}
    </div>
  )
}

const hostOf = (url: string) => {
  try {
    return new URL(/^https?:/.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "")
  } catch {
    return url.split("/")[0]
  }
}
/** a site's own small icon */
function SiteIcon({ host, className }: { host: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  return broken ? (
    <span className={cn("grid size-4 shrink-0 place-items-center rounded-sm bg-muted text-muted-foreground", className)}>
      <HugeiconsIcon icon={Globe02Icon} className="size-3" />
    </span>
  ) : (
    <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`} alt="" loading="lazy" onError={() => setBroken(true)} className={cn("size-4 shrink-0 rounded-sm bg-muted", className)} />
  )
}

/** one step the chat took, said plainly, with more behind it when there is more to see */
type StepRow = { key: string; label: string; working?: boolean; failed?: boolean; link?: string; host?: string; detail?: React.ReactNode }
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function stepRows(items: Item[]): StepRow[] {
  const rows: StepRow[] = []
  for (const x of items) {
    if (x.kind === "skill") {
      for (const n of x.names) if (SKILL_DONE[n] && !rows.some((r) => r.key === `skill-${n}`)) rows.push({ key: `skill-${n}`, label: cap(SKILL_DONE[n]) })
    } else if (x.kind === "site") {
      const host = hostOf(x.url)
      rows.push({
        key: x.id,
        host,
        working: x.state === "working",
        failed: x.state === "failed",
        label: x.state === "working" ? `Visiting ${host}` : x.state === "failed" ? `Couldn't open ${host}` : `Visited ${host}${x.price ? ` · ${x.price}` : ""}${x.images.length ? ` · ${x.images.length} image${x.images.length === 1 ? "" : "s"}` : ""}`,
        link: x.state === "done" ? x.url : undefined,
        detail:
          x.state === "failed" ? (
            <p className="text-xs text-muted-foreground">{x.reason}</p>
          ) : x.state === "done" ? (
            <div className="flex flex-col gap-2">
              {x.title && <p className="text-xs text-muted-foreground">{x.title}</p>}
              {x.images.length > 0 && (
                <div className="grid grid-cols-6 gap-1.5">
                  {x.images.slice(0, 12).map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" aria-label="Open image" className="relative block aspect-square overflow-hidden rounded-md ring-1 ring-foreground/10">
                      <PictureSlot src={u} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : undefined,
      })
    } else if (x.kind === "browse") {
      rows.push(x.what === "search" ? { key: x.id, label: `Searched “${x.text}”` } : { key: x.id, label: `Read ${x.text}`, host: hostOf(x.text), link: x.url ?? `https://${x.text}` })
    } else if (isLegacyBrowse(x) && x.kind === "note") {
      const search = x.text.startsWith("Searched the web")
      const t = search ? x.text.replace(/^Searched the web:\s*/, "") : x.text.replace(/^Read\s+/, "")
      rows.push(search ? { key: x.id, label: `Searched “${t}”` } : { key: x.id, label: `Read ${t}`, host: hostOf(t), link: `https://${t}` })
    } else if (x.kind === "design") {
      rows.push({ key: x.id, label: x.text.replace(/\.$/, "") })
    } else if (x.kind === "image" && x.purpose === "sheet") {
      // reference sheets are working material: one step for all of them, pictures inside
      const at = rows.find((r) => r.key === "sheets")
      const sheets = items.filter((y): y is Extract<Item, { kind: "image" }> => y.kind === "image" && y.purpose === "sheet")
      if (at) continue
      const making = sheets.filter((y) => y.state === "working").length
      rows.push({
        key: "sheets",
        working: making > 0,
        label: making ? `Making ${sheets.length > 1 ? `${sheets.length} reference sheets` : "a reference sheet"}` : `Made ${sheets.length > 1 ? `${sheets.length} reference sheets` : "a reference sheet"}${sheets.length && sheets.every((y) => y.target) ? ` for ${sheets.map((y) => y.target).join(", ")}` : ""}`,
        detail: (
          <div className="grid grid-cols-4 gap-1.5">
            {sheets.map((y) => (
              <span key={y.id} className="relative block aspect-square overflow-hidden rounded-md ring-1 ring-foreground/10">
                {y.state === "failed" ? <span className="absolute inset-0 grid place-items-center bg-muted text-xs text-muted-foreground">Failed</span> : <PictureSlot src={y.state === "done" ? y.url : undefined} />}
              </span>
            ))}
          </div>
        ),
      })
    } else if (x.kind === "image" && x.purpose === "view") {
      rows.push({
        key: x.id,
        label: `Watched ${x.target ?? "the Flick"} as viewers will`,
        working: x.state === "working",
        detail: x.url ? (
          <a href={x.url} target="_blank" rel="noreferrer" aria-label="Open the picture" className="relative block h-40 w-28 overflow-hidden rounded-lg ring-1 ring-foreground/10">
            <PictureSlot src={x.url} imgClassName="object-contain" />
          </a>
        ) : undefined,
      })
    } else if (x.kind === "review") {
      rows.push({ key: x.id, label: `Checked every frame · all ${x.pass} checks passed` })
    } else if (x.kind === "note") {
      rows.push({ key: x.id, label: x.text.replace(/\.$/, "") })
    }
  }
  return rows
}

/**
 * The steps the chat took in one stretch of work: a line that says how many, opening to a list of
 * plain-worded steps; one with more to see (a website's images, a look at the Flick) opens in place.
 * Open while it's working, folded once it's done.
 */
function Steps({ items, live }: { items: Item[]; live: boolean }) {
  const rows = stepRows(items)
  const [open, setOpen] = useState<boolean | null>(null)
  const [more, setMore] = useState<string | null>(null)
  if (!rows.length) return null
  const shown = open ?? live
  const n = rows.length
  return (
    <div className="mr-6 flex flex-col gap-2">
      <button type="button" onClick={() => setOpen(!shown)} aria-expanded={shown} className="flex items-center gap-1.5 self-start rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <span className={cn(live && "text-shimmer")}>{live ? `Working · ${n} step${n === 1 ? "" : "s"} so far` : `Took ${n} step${n === 1 ? "" : "s"}`}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} className={cn("size-3.5 transition-transform", shown && "rotate-180")} />
      </button>
      {shown && (
        <ol className="flex flex-col divide-y divide-foreground/8 overflow-hidden rounded-xl ring-1 ring-foreground/10 animate-in fade-in-0">
          {rows.map((r) => {
            const opened = more === r.key
            const head = (
              <>
                {r.host && <SiteIcon host={r.host} />}
                <span className={cn("min-w-0 truncate", r.working && "text-shimmer", r.failed && "text-destructive")}>
                  {r.label}
                  {r.working ? "…" : ""}
                </span>
                {r.detail && <HugeiconsIcon icon={ArrowRight01Icon} className={cn("size-3 shrink-0 text-muted-foreground transition-transform", opened && "rotate-90")} />}
              </>
            )
            return (
              <li key={r.key} className="flex flex-col">
                <div className="flex min-h-10 items-center gap-2 px-3 text-sm">
                  {r.detail ? (
                    <button type="button" onClick={() => setMore(opened ? null : r.key)} aria-expanded={opened} className="flex min-w-0 items-center gap-2 py-2 text-left outline-none focus-visible:underline">
                      {head}
                    </button>
                  ) : (
                    <span className="flex min-w-0 items-center gap-2 py-2">{head}</span>
                  )}
                  {r.link && (
                    <a href={/^https?:/.test(r.link) ? r.link : `https://${r.link}`} target="_blank" rel="noreferrer" aria-label={`Open ${r.host ?? "the page"}`} className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                      <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
                    </a>
                  )}
                </div>
                {opened && r.detail && <div className="px-3 pb-3 animate-in fade-in-0">{r.detail}</div>}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

/** several images from one stretch of work, side by side */
function Gallery({ items, agent, ctx }: { items: Extract<Item, { kind: "image" }>[]; agent: Agent; ctx: AgentCtx }) {
  const making = items.filter((x) => x.state === "working").length
  const failed = items.filter((x) => x.state === "failed").length
  return (
    <Card className="gap-2.5">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        {items.length} images
        {making > 0 && <span className="text-shimmer text-xs font-normal">{making} on the way…</span>}
        {failed > 0 && <span className="text-xs font-normal text-destructive">{failed} failed</span>}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((x) => (
          <ImageTile key={x.id} item={x} agent={agent} ctx={ctx} />
        ))}
      </div>
    </Card>
  )
}

function ImageTile({ item, agent, ctx }: { item: Extract<Item, { kind: "image" }>; agent: Agent; ctx: AgentCtx }) {
  const [added, setAdded] = useState(false)
  return (
    <figure className="flex min-w-0 flex-col gap-1">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
        {item.state === "working" ? (
          <GeneratingGradient sweep />
        ) : item.state === "done" ? (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label="Open image">
            <PictureSlot src={item.url} />
          </a>
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <Button size="xs" variant="outline" onClick={() => agent.retryImage(item.id)} className="gap-1">
              <HugeiconsIcon icon={RefreshIcon} className="size-3" />
              Retry
            </Button>
          </span>
        )}
        {item.state === "done" && !item.placed && (
          <Button size="xs" variant="secondary" disabled={added} onClick={() => (ctx.addToCanvas(item.url!), setAdded(true))} className="absolute inset-x-1 bottom-1">
            {added ? "Added" : "Add"}
          </Button>
        )}
      </div>
      <figcaption className="truncate px-0.5 text-xs text-muted-foreground">{imageWhat(item)}</figcaption>
    </figure>
  )
}

/** the chat's own words: paragraphs, bullets and **bold** */
function Said({ text: said, streaming }: { text: string; streaming?: boolean }) {
  // never a service or model name, even if the chat writes one
  const text = noNames(said)
  if (!text && streaming)
    return (
      <span className="flex h-6 items-center px-1 text-sm">
        <span className="text-shimmer">Thinking…</span>
      </span>
    )
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-medium">{p.slice(2, -2)}</strong> : p))
  return (
    <div className={cn("mr-6 flex flex-col gap-2.5 px-1 text-sm leading-relaxed", streaming && "stream-fade")}>
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
  return <div className={cn("mr-2 flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-xs ring-1 ring-foreground/10", className, stage && "mr-0 gap-4 p-5")}>{children}</div>
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
                  stage ? "py-3 text-sm" : "py-2.5 text-sm",
                  // a hairline between rows, hidden around the hovered or picked one
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-foreground/8 hover:rounded-lg hover:bg-muted/50 hover:after:opacity-0",
                  on && "rounded-lg bg-brand/10 text-brand after:opacity-0 hover:bg-brand/12",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-md text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-foreground/10",
                    on && "bg-brand text-brand-foreground ring-brand",
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
              <InputGroupInput
                value={other}
                onChange={(e) => setOther(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && other.trim() && send()}
                placeholder="Something else…"
                aria-label="Your own answer"
                className="h-8 flex-1 bg-transparent text-sm placeholder:text-muted-foreground px-0"
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
        <div className={cn("grid gap-2", item.display === "sizes" ? "grid-cols-3" : item.display === "pictures" ? (item.options.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4") : visual || item.display === "palettes" ? "grid-cols-3" : "grid-cols-2")} role="radiogroup" aria-label={item.question}>
          {item.options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => pick(o)}
              disabled={agent.busy}
              className="group/opt flex flex-col gap-1.5 rounded-xl p-1.5 text-left outline-none ring-1 ring-foreground/10 transition-[box-shadow,background-color] hover:bg-muted/50 hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
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
              {item.display === "sizes" && (
                <span className="flex flex-col items-center gap-1 pt-1">
                  <SizeFrame size={o.size} className="size-10" />
                  {o.size && <span className="text-xs tabular-nums text-muted-foreground">{o.size}</span>}
                </span>
              )}
              {item.display === "pictures" && (
                <span className="relative block overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10" style={{ aspectRatio: String(Math.min(1.25, Math.max(0.8, ctx.ratio))) }}>
                  <PictureSlot src={o.image} imgClassName="transition-[opacity,transform] group-hover/opt:scale-[1.03]" />
                </span>
              )}
              {item.display === "palettes" && (
                <span className="flex h-12 overflow-hidden rounded-lg ring-1 ring-foreground/10">
                  {(o.colors?.length ? o.colors : ["#e4e4e7"]).slice(0, 4).map((c, k) => (
                    <span key={k} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
              )}
              <span className="px-1 text-xs font-medium leading-tight">{o.label}</span>
              {o.description && <span className="px-1 pb-0.5 text-xs leading-snug text-muted-foreground">{o.description}</span>}
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
  const url = (f: File) => blobUrl(f)
  // added at once; a trimmed clip shows as preparing while it's cut, then joins the files
  const [preparing, setPreparing] = useState<{ key: string; poster?: string; name: string }[]>([])
  const media = useMediaAdd((items) =>
    items.forEach((m) => {
      const key = crypto.randomUUID()
      if (m.clip) setPreparing((p) => [...p, { key, poster: m.poster, name: m.name }])
      asFile(m)
        .then((f) => setFiles((x) => [...x, f].slice(0, 8)))
        .catch(() => {})
        .finally(() => setPreparing((p) => p.filter((x) => x.key !== key)))
    }),
  )
  const addFiles = (list: FileList | File[]) => media.addFiles(list)
  if (item.done)
    return (
      <div className="flex flex-col gap-1.5 px-1">
        <p className="text-xs text-muted-foreground">{item.message}</p>
        {item.done === "added" ? (
          <div className="flex flex-wrap gap-1.5">
            {item.images?.map((u) => <img loading="lazy" decoding="async" key={u} src={u} alt="" className="size-10 rounded-lg object-cover ring-1 ring-foreground/10" />)}
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
      {media.ui}
      <button
        type="button"
        onClick={media.openPicker}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => (e.preventDefault(), setOver(false), addFiles(e.dataTransfer.files))}
        className={cn(
          "flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/20 p-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
          over && "border-brand bg-brand/5",
        )}
      >
        {files.length || preparing.length ? (
          <>
            {files.map((f) => <FileThumb key={url(f)} file={f} url={url(f)} className="size-14" />)}
            {preparing.map((p) => <Preparing key={p.key} poster={p.poster} name={p.name} className="size-14" />)}
            <span className="grid size-14 place-items-center rounded-lg border border-dashed border-foreground/20">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <HugeiconsIcon icon={ImageAdd01Icon} className="size-5" />
            Drop photos or videos, or click to pick
            {item.kinds.length > 0 && <span className="text-xs">{item.kinds.join(", ")}</span>}
          </span>
        )}
      </button>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" disabled={agent.busy} onClick={() => agent.addAssets(item.id, [])}>
          Skip
        </Button>
        <Button size="sm" disabled={agent.busy || !files.length || preparing.length > 0} onClick={() => agent.addAssets(item.id, files)}>
          Add{files.length > 0 ? ` ${files.length}` : ""}
        </Button>
      </div>
    </>
  )
  return bare ? <div className="flex flex-col gap-3 px-4 pb-3">{body}</div> : <Card>{body}</Card>
}

/** A trimmed clip still being cut: its first frame under a shimmer. */
function Preparing({ poster, name, className }: { poster?: string; name: string; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-lg ring-1 ring-foreground/10", className)} aria-label={`Preparing ${name}`} title="Preparing the clip…">
      {poster && <img loading="lazy" decoding="async" src={poster} alt="" className="size-full object-cover opacity-60" />}
      <span className="shimmer absolute inset-0" />
    </span>
  )
}

/** A photo, or a video's first frame with a play mark, for files waiting to be sent. */
function FileThumb({ file, url, className }: { file: File; url: string; className?: string }) {
  return file.type.startsWith("video/") ? (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-lg ring-1 ring-foreground/10", className)}>
      <video src={url} muted preload="metadata" className="size-full object-cover" aria-label={file.name} />
      <span className="absolute bottom-0.5 left-0.5 grid size-4 place-items-center rounded bg-black/70 text-white">
        <HugeiconsIcon icon={PlayIcon} className="size-2.5" />
      </span>
    </span>
  ) : (
    <img loading="lazy" decoding="async" src={url} alt={file.name} className={cn("shrink-0 rounded-lg object-cover ring-1 ring-foreground/10", className)} />
  )
}

/** the brand it found, as a clear table: only the rows it has */
function BrandTable({ item }: { item: Extract<Item, { kind: "brand" }> }) {
  const b = item.brand
  const colours = (
    [
      ["Main", b.primary_color],
      ["Second", b.secondary_color],
      ["Text", b.text_color],
    ] as [string, string | undefined][]
  ).filter((c): c is [string, string] => !!c[1] && /^#/.test(c[1]))
  const rows: [string, React.ReactNode][] = []
  if (b.logo) rows.push(["Logo", <img src={b.logo} alt={`${b.name ?? "Brand"} logo`} decoding="async" className="h-8 max-w-32 rounded object-contain" />])
  if (colours.length)
    rows.push([
      "Colours",
      <span className="flex flex-wrap gap-x-3 gap-y-1.5">
        {colours.map(([n, c]) => (
          <span key={n} className="flex items-center gap-1.5">
            <span className="size-4 rounded-full ring-1 ring-foreground/15" style={{ background: c }} />
            <span className="font-mono text-xs uppercase">{c}</span>
            <span className="text-xs text-muted-foreground">{n}</span>
          </span>
        ))}
      </span>,
    ])
  if (b.font) rows.push(["Font", <span style={{ fontFamily: `"${b.font}", var(--font-sans)` }}>{b.font}</span>])
  if (b.tagline) rows.push(["Tagline", <span>“{b.tagline}”</span>])
  if (b.tone) rows.push(["Voice", b.tone])
  if (b.notes) rows.push(["Notes", <span className="text-muted-foreground">{b.notes}</span>])
  if (b.sources?.length)
    rows.push([
      "Sources",
      <span className="flex flex-wrap gap-x-3 gap-y-1">
        {[...new Map(b.sources.map((u) => [hostOf(u), u])).values()].slice(0, 4).map((u) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline-offset-2 hover:underline">
            <SiteIcon host={hostOf(u)} className="size-3.5" />
            {hostOf(u)}
          </a>
        ))}
      </span>,
    ])
  return (
    <section aria-label="Brand" className="mr-6 overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <header className="flex items-center gap-2 bg-muted/40 px-3 py-2">
        <HugeiconsIcon icon={PaintBoardIcon} className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Brand</span>
        <span className="truncate text-sm font-medium">{b.name || "Your brand"}</span>
      </header>
      <dl className="flex flex-col divide-y divide-foreground/8 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 px-3 py-2">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** an approved storyboard, folded to one row; opens to the full card */
function ApprovedPlan({ item, agent, ctx }: { item: Extract<Item, { kind: "plan" }>; agent: Agent; ctx: AgentCtx }) {
  const n = item.plan.variations.length
  const stills = (item.frames ?? item.previews ?? []).filter((x): x is string => !!x).slice(0, 4)
  return (
    <Fold
      head={
        <>
          <HugeiconsIcon icon={Tick02Icon} className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">
            Storyboard approved · {n} variation{n === 1 ? "" : "s"}
          </span>
          {stills.length > 0 && (
            <span className="ml-auto flex shrink-0 -space-x-1.5">
              {stills.map((u) => (
                <img key={u} src={u} alt="" decoding="async" className="size-6 rounded-md object-cover ring-2 ring-background" />
              ))}
            </span>
          )}
        </>
      }
    >
      <div className="p-2">
        <PlanCard item={item} agent={agent} ctx={ctx} />
      </div>
    </Fold>
  )
}

/** a variation's direction: its own line, else (older storyboards) its first frame or nothing; never the prompt */
function directionOf(v: PlanVariation, i: number, plan: Plan) {
  return v.direction ?? (i === 0 ? (plan.reference.storyboard?.map((f) => f.action).join(", then ") ?? "") : "")
}
function PlanCard({ item, agent, ctx }: { item: Extract<Item, { kind: "plan" }>; agent: Agent; ctx: AgentCtx }) {
  const plan = item.plan
  const [open, setOpen] = useState(false)
  // approved (or replaced): one line, opens to read
  if (item.state !== "open")
    return (
      <div className="flex flex-col gap-2 px-1">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <HugeiconsIcon icon={item.state === "approved" ? Tick02Icon : Cancel01Icon} className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{plan.title}</span>
          <span className="text-xs text-muted-foreground">
            {item.state === "approved" ? `${plan.variations.length} variations` : "Replaced by a newer storyboard"}
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} className={cn("ml-auto size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <ol className="flex flex-col gap-1 border-l pl-3 text-xs text-muted-foreground">
            {plan.variations.map((v, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{v.name}</span>
                {v.price ? ` · ${v.price}` : ""}
                {v.video_id ? ": your video" : directionOf(v, i, plan) ? `: ${directionOf(v, i, plan)}` : ""}
              </li>
            ))}
          </ol>
        )}
      </div>
    )
  // just the storyboard: how the first video plays, and one action that approves it and makes that video
  const first = plan.variations[0]
  const own = !!first?.video_id
  // starting from the user's video, the approval makes every change at once (each was previewed); otherwise just the first video
  const making = own ? plan.variations.filter((v) => !v.video_id).length : 1
  const cost = making * ctx.videoCost
  const frames = plan.reference.storyboard ?? []
  return (
    <Card className="gap-0 overflow-hidden p-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Storyboard</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{plan.title}</span>
        </div>
        {frames.length && !own ? (
          <Storyboard frames={frames} stills={item.frames ?? []} ratio={ctx.ratio} name={first?.name} />
        ) : (
          // starting from the user's video: it, then each change drawn on its first frame
          <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(4, plan.variations.length)}, minmax(0, 1fr))` }}>
            {plan.variations.map((v, i) => (
              <li key={i} className="flex min-w-0 flex-col gap-1">
                <span className="relative block overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10" style={{ aspectRatio: String(Math.min(1.78, Math.max(0.56, ctx.ratio))) }}>
                  <PictureSlot src={item.previews?.[i]} />
                  <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-md bg-background/85 text-xs font-medium tabular-nums backdrop-blur">{i + 1}</span>
                </span>
                <span className="truncate px-0.5 text-xs font-medium">{v.name}</span>
                <span className="line-clamp-2 px-0.5 text-xs leading-snug text-muted-foreground">{v.video_id ? "Your video, as it is" : directionOf(v, i, plan)}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="px-1.5 text-xs text-muted-foreground">
          {own
            ? making
              ? "Each change is a quick sketch on your video’s first frame; the videos are made when you approve. "
              : ""
            : plan.variations.length > 1
              ? `${plan.variations.length - 1} more variation${plan.variations.length > 2 ? "s" : ""} (${plan.variations.slice(1).map((v) => v.name).join(", ")}) follow once you like the first video. `
              : ""}
          Want something different? Tell me below.
        </p>
      </div>
      <div className="flex items-center gap-3 border-t bg-muted/40 px-3 py-2.5">
        <span className="text-xs text-muted-foreground">
          {!making ? "Your videos, used as they are" : own ? `${making} video${making === 1 ? "" : "s"} · ${cost.toLocaleString("en-US")} credits` : `First video · ${cost.toLocaleString("en-US")} credits`}
          {ctx.credits < cost && <span className="text-destructive"> · you have {ctx.credits.toLocaleString("en-US")}</span>}
        </span>
        <Button size="sm" className="ml-auto gap-1.5" disabled={agent.busy} onClick={() => agent.decidePlan(item.id, plan)}>
          <HugeiconsIcon icon={SparklesIcon} className="size-4" />
          {!making ? "Build the Flick" : own ? `Approve and make ${making === 1 ? "it" : `${making} videos`}` : "Approve and make the first video"}
        </Button>
      </div>
    </Card>
  )
}

/** The reference video as 3 or 4 frames: a quick still each, what happens and how it's framed. */
function Storyboard({ frames, stills, ratio, name }: { frames: NonNullable<Plan["reference"]["storyboard"]>; stills: (string | undefined)[]; ratio: number; name?: string }) {
  return (
    <section aria-label="Storyboard" className="flex flex-col gap-1.5">
      <span className="px-1.5 text-xs font-medium text-muted-foreground">How {name ?? "Variation 1"} plays</span>
      <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${frames.length}, minmax(0, 1fr))` }}>
        {frames.map((f, i) => (
          <li key={i} className="flex min-w-0 flex-col gap-1">
            <span className="relative block overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10" style={{ aspectRatio: String(Math.min(1.78, Math.max(0.56, ratio))) }}>
              <PictureSlot src={stills[i]} />
              <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-md bg-background/85 text-xs font-medium tabular-nums backdrop-blur">{i + 1}</span>
            </span>
            <span className="line-clamp-2 px-0.5 text-xs leading-snug">{f.action}</span>
            {f.camera && <span className="truncate px-0.5 text-xs text-muted-foreground">{f.camera}</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}


/**
 * What the reference video is made from, numbered as the prompt names them ([Image 1], [Video 1]):
 * the user's video to change, the image it opens on, the references. Remove or move one and the
 * prompt's numbers follow.
 */

/**
 * After Generate all: the videos are made in place. Each variation shows its plan still under the
 * generating look with its progress, then turns into its video; the rest of the build ticks off below.
 */
function BuildCard({ ctx, agent }: { ctx: AgentCtx; agent: Agent }) {
  const steps = ctx.progress()
  const videos = ctx.videos?.() ?? []
  const done = steps.filter((x) => x.state === "done").length
  // the plan the build came from: its stills stand in while each video is made
  const plan = [...agent.items].reverse().find((x): x is Extract<Item, { kind: "plan" }> => x.kind === "plan" && x.state === "approved")
  const stillOf = (i: number) => (i === 0 ? plan?.frames?.[0] : undefined) ?? plan?.previews?.[i] ?? agent.imageUrl(plan?.plan.variations[i]?.image_ids?.[0])
  const others = steps.slice(2)
  const ready = videos.filter((v) => v.state === "done").length
  const [open, setOpen] = useState(false)
  // all done: one row that opens to the videos
  if (done === steps.length && steps.length && !open)
    return (
      <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className="mr-6 flex min-h-10 items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm ring-1 ring-foreground/10 outline-none hover:bg-muted/50 focus-visible:bg-muted/50">
        <HugeiconsIcon icon={Tick02Icon} className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">Your Flick is ready{videos.length ? ` · ${videos.length} videos` : ""}</span>
        <span className="ml-auto flex shrink-0 -space-x-1.5">
          {videos.slice(0, 4).map((v, i) => (v.poster ? <img key={i} src={v.poster} alt="" decoding="async" className="size-6 rounded-md object-cover ring-2 ring-background" /> : null))}
        </span>
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
    )
  return (
    <Card className="gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{done === steps.length ? "Your Flick is ready" : "Building your Flick"}</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {videos.length ? `${ready}/${videos.length} videos` : `${done}/${steps.length}`}
        </span>
      </div>
      {videos.length > 0 && (
        <div className={cn("grid gap-2", videos.length > 3 ? "grid-cols-3" : videos.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {videos.map((v, i) => (
            <BuildTile key={i} video={v} still={stillOf(i)} ratio={ctx.ratio} waiting={i > 0 && v.state === "empty" && videos[0].state === "done"} />
          ))}
        </div>
      )}
      <ol className="flex flex-col gap-1.5">
        {(videos.length ? others : steps).map((x) => (
          <li key={x.label} className="flex items-center gap-2 text-xs">
            <span className={cn("grid size-4 shrink-0 place-items-center rounded-full", x.state === "done" ? "bg-foreground text-background" : "ring-1 ring-foreground/20")}>
              {x.state === "done" ? <HugeiconsIcon icon={Tick02Icon} className="size-2.5" strokeWidth={3} /> : x.state === "working" ? <span className="size-1.5 animate-pulse rounded-full bg-brand" /> : null}
            </span>
            <span className={cn(x.state === "done" ? "text-foreground" : "text-muted-foreground")}>{x.label}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/** one video in the build: its still while it's made (with progress), then the video itself */
function BuildTile({ video: v, still, ratio, waiting }: { video: BuildVideo; still?: string; ratio: number; waiting?: boolean }) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (v.state !== "generating") return
    const t = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [v.state])
  const pct = v.state === "generating" && v.since && v.ms ? Math.min(99, Math.round(((Date.now() - v.since) / v.ms) * 100)) : undefined
  const secs = v.state === "generating" && v.since ? Math.round((Date.now() - v.since) / 1000) : 0
  return (
    <figure className="flex min-w-0 flex-col gap-1">
      <div className="relative overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10" style={{ aspectRatio: String(Math.min(1.78, Math.max(0.56, ratio))) }}>
        {v.state === "done" && v.src ? (
          <video src={v.src} poster={v.poster} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover animate-in fade-in-0 duration-500" />
        ) : (
          <>
            {still && <img src={still} alt="" decoding="async" className={cn("absolute inset-0 size-full object-cover", v.state === "generating" ? "opacity-60 blur-xs" : "opacity-40 grayscale")} />}
            {v.state === "generating" && <GeneratingGradient sweep className="bg-transparent opacity-70" />}
            <span className="absolute inset-x-1.5 bottom-1.5 flex min-w-0 items-center gap-1 truncate rounded-md bg-background/85 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground backdrop-blur">
              {v.state === "generating" ? (
                <>
                  {pct !== undefined ? `${pct}%` : `${STATUS[v.status ?? ""] ?? "generating"} · ${secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`}`}
                </>
              ) : waiting ? (
                "After your OK"
              ) : (
                "Up next"
              )}
            </span>
            {v.state === "generating" && pct !== undefined && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
            )}
          </>
        )}
      </div>
      <figcaption className="truncate px-0.5 text-xs font-medium">{v.name}</figcaption>
    </figure>
  )
}

const STATUS: Record<string, string> = { starting: "starting", queued: "in the queue", in_progress: "generating", completed: "finishing" }
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

/** what an image is for, in a few words */
function imageWhat(item: Extract<Item, { kind: "image" }>) {
  return (
    item.purpose === "view"
      ? `Looked at ${item.target ?? "the Flick"}`
      : item.purpose === "thumbnail" && item.target
      ? `Thumbnail for ${item.target}`
      : item.purpose === "canvas"
        ? "For the canvas"
        : item.purpose === "sheet"
          ? "Reference sheet"
          : item.purpose === "look"
            ? "Suggested look"
            : item.purpose === "edit"
              ? "Edited photo"
              : "Image idea"
  )
}

function ImageCard({ item, ctx, agent }: { item: Extract<Item, { kind: "image" }>; ctx: AgentCtx; agent: Agent }) {
  const what = imageWhat(item)
  const [added, setAdded] = useState(false)
  return (
    <div className="mr-10 flex items-center gap-3 rounded-2xl p-1.5 pr-3">
      <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
        {item.state === "working" ? (
          <GeneratingGradient sweep />
        ) : item.state === "done" ? (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label="Open image">
            <PictureSlot src={item.url} />
          </a>
        ) : (
          <HugeiconsIcon icon={Alert02Icon} className="size-4 text-destructive" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{item.state === "working" ? `${what}: ${STATUS[item.status ?? ""] ?? "making it"}…` : item.state === "failed" ? "Image failed" : what}</span>
        <span className={cn("text-xs text-muted-foreground", item.state !== "failed" && "truncate")}>
          {item.state === "failed" ? noNames(item.error ?? "") : item.purpose === "view" ? "As viewers see it" : item.state === "done" && item.placed ? "Added to the Flick" : item.state === "working" && item.startedAt ? <Elapsed since={item.startedAt} /> : "Ready to add"}
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
export function AgentComposer({ agent, placeholder, variations, brand }: { agent: Agent; placeholder?: string; variations?: { name: string; poster?: string }[]; brand?: boolean }) {
  const [text, setText] = useState("")
  const [files, setFiles] = useState<File[]>([])
  // @mentions: this message's photos and videos, saved elements, the variations, the brand
  const planned = agent.plan?.variations.map((v) => ({ name: v.name }))
  const mentionOptions = useMentionOptions({ refs: files.map((f) => ({ url: blobUrl(f), name: f.name, video: f.type.startsWith("video/") })), variations: variations ?? planned, brand })
  const url = (f: File) => blobUrl(f)
  // photos and videos: picked from uploads and generated work, or dropped or pasted (long videos trimmed first)
  // added at once; a trimmed clip shows as preparing while it's cut, then joins the files
  const [preparing, setPreparing] = useState<{ key: string; poster?: string; name: string }[]>([])
  const media = useMediaAdd((items) =>
    items.forEach((m) => {
      const key = crypto.randomUUID()
      if (m.clip) setPreparing((p) => [...p, { key, poster: m.poster, name: m.name }])
      asFile(m)
        .then((f) => setFiles((x) => [...x, f].slice(0, 8)))
        .catch(() => {})
        .finally(() => setPreparing((p) => p.filter((x) => x.key !== key)))
    }),
  )
  const can = (text.trim() || files.length) && !agent.busy && !preparing.length
  const send = () => {
    if (!can) return
    agent.send(text.trim(), files, elementsIn(text))
    setText("")
    setFiles([])
  }
  return (
    <div
      className="rounded-2xl border bg-card p-2 shadow-sm"
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => (e.preventDefault(), media.addFiles(e.dataTransfer.files))}
    >
      {media.ui}
      {files.length + preparing.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-1 pb-1 pt-1.5">
          {preparing.map((p) => <Preparing key={p.key} poster={p.poster} name={p.name} className="size-12" />)}
          {files.map((f) => (
            <div key={url(f)} className="group/f relative size-12 shrink-0">
              <FileThumb file={f} url={url(f)} className="size-12" />
              <Button variant="secondary" size="icon-xs" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y !== f))} className="absolute -right-1.5 -top-1.5 size-5 rounded-full opacity-0 shadow-sm ring-1 ring-foreground/10 group-hover/f:opacity-100 focus-visible:opacity-100">
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <MentionTextarea
        value={text}
        onChange={setText}
        options={mentionOptions}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) (e.preventDefault(), send())
        }}
        onPaste={(e) => e.clipboardData.files.length && (e.preventDefault(), media.addFiles(e.clipboardData.files))}
        placeholder={placeholder ?? "Describe your Flick, or ask for a change"}
        aria-label="Message"
        rows={2}
        className="field-sizing-content min-h-[52px] max-h-[160px] resize-none rounded-none border-0 bg-transparent px-1.5 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex items-center gap-1.5 px-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Add photos or videos" onClick={media.openPicker}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add photos or videos</TooltipContent>
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
 * The questions the chat is waiting on, docked above the composer:
 * one at a time ("1 of 3", arrows), numbered answers (keys 1 to 9), "Something else", Skip and
 * Continue. Picking moves to the next question; the answers go back together once all are in.
 */
type Deckable = Q | Extract<Item, { kind: "assets" }>
/** the cards a chat reply is waiting on that dock above the composer: questions and image requests */
export const isDocked = (x: Item, pendingIds: string[]) => (x.kind === "question" || x.kind === "assets") && pendingIds.includes(x.id)
const settled = (x: Deckable) => (x.kind === "question" ? x.answer !== undefined : !!x.done)

/** a size drawn to its shape, inside a fixed box: how the Flick's frame will look */
export function SizeFrame({ size, className }: { size?: string; className?: string }) {
  const [w, h] = (size ?? "").split(/[x×]/).map(Number)
  const r = w && h ? w / h : 1
  return (
    <span className={cn("grid size-14 shrink-0 place-items-center", className)} aria-hidden>
      <span className="rounded-[3px] bg-foreground/10 ring-1 ring-foreground/25" style={r >= 1 ? { width: "100%", aspectRatio: String(Math.min(r, 8)) } : { height: "100%", aspectRatio: String(Math.max(r, 1 / 8)) }} />
    </span>
  )
}

/** the sizes for where it runs, by its answer: Flam's ad sizes, the shapes videos are made in, or link shapes */
const SIZES_FOR: Record<"ads" | "banner" | "link", [string, string][]> = {
  ads: [["Medium rectangle", "300×250"], ["Large rectangle", "336×280"], ["Square", "250×250"], ["Mobile interstitial", "320×480"], ["Mobile landscape", "480×320"], ["Half page", "300×600"], ["Square 1:1", "1080×1080"], ["Horizontal 16:9", "1920×1080"], ["Vertical 9:16", "1080×1920"]],
  banner: [["Ultra wide 21:9", "2520×1080"], ["Wide 16:9", "1920×1080"], ["Landscape 4:3", "1440×1080"], ["Square 1:1", "1080×1080"], ["Portrait 3:4", "1080×1440"], ["Tall 9:16", "1080×1920"]],
  link: [["Square 1:1", "1080×1080"], ["Wide 16:9", "1920×1080"], ["Tall 9:16", "1080×1920"]],
}
/** a size question asked with where it runs: its options follow that answer */
function withSizes<T extends Deckable>(q: T, items: Item[]): T {
  if (q.kind !== "question" || !(q.purpose === "size" || q.display === "sizes") || q.answer !== undefined) return q
  const where = [...items].reverse().find((x): x is Extract<Item, { kind: "question" }> => x.kind === "question" && x.purpose === "placement" && !!x.answer && x.answer !== "Skipped")?.answer
  if (!where) return q
  const list = /\bads?\b/i.test(where) ? SIZES_FOR.ads : /banner|website|app/i.test(where) ? SIZES_FOR.banner : /link/i.test(where) ? SIZES_FOR.link : null
  return list ? { ...q, options: list.map(([label, size]) => ({ label, size })) } : q
}

export function QuestionDeck({ agent, ctx, className }: { agent: Agent; ctx: AgentCtx; className?: string }) {
  const qs = agent.items.filter((x): x is Deckable => isDocked(x, agent.pendingIds)).map((x) => withSizes(x, agent.items))
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
  const shell = "flex flex-col overflow-hidden rounded-2xl bg-card shadow-lg ring-1 ring-foreground/10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
  if (q.kind === "assets")
    return (
      <section aria-label="Questions" className={cn(shell, className)}>
        <header className="flex items-start gap-3 px-4 pb-2 pt-3.5">
          <p className="flex-1 text-base font-medium leading-snug">{q.message}</p>
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
        <p className="flex-1 text-base font-medium leading-snug">
          {q.question}
          {q.multi && <span className="ml-2 text-xs font-normal text-muted-foreground">Pick any</span>}
        </p>
        {pager}
      </header>
      <div className="max-h-[50vh] overflow-y-auto px-2">
        {q.display === "concepts" ? (
          // big pictures, little text: the title and the idea; what changes shows over the picture on hover
          <div className="grid grid-cols-1 gap-2.5 p-1 sm:grid-cols-3" role="radiogroup" aria-label={q.question}>
            {q.options.map((o, n) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={chosen(o)}
                aria-description={[o.question, o.variations?.length ? `Variations: ${o.variations.join(", ")}` : "", o.beats?.join(", then ")].filter(Boolean).join(". ")}
                disabled={agent.busy}
                onClick={() => pick(o)}
                className={cn(
                  "group/c flex flex-col gap-2 rounded-2xl p-1.5 text-left outline-none ring-1 ring-foreground/10 transition-[box-shadow,background-color] hover:bg-muted/50 hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring",
                  chosen(o) && "bg-brand/10 ring-2 ring-brand",
                )}
              >
                <span className="relative w-full overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: Math.max(ctx.ratio, 0.8) }}>
                  <PictureSlot src={o.image} imgClassName="transition-[opacity,transform] duration-500 group-hover/c:scale-[1.03]" />
                  <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-black/50 text-xs font-medium text-white tabular-nums backdrop-blur-sm">{n + 1}</span>
                  {!!o.variations?.length && (
                    <span className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 opacity-0 transition-opacity group-hover/c:opacity-100 group-focus-visible/c:opacity-100">
                      {o.variations.map((v) => (
                        <span key={v} className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-black">
                          {v}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 px-1 pb-1">
                  <span className="truncate text-sm font-medium">{o.label}</span>
                  {o.description && <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{o.description}</span>}
                </span>
              </button>
            ))}
          </div>
        ) : q.display === "sizes" ? (
          // frame shapes drawn to scale, with the name and the pixels
          <div className="grid grid-cols-3 gap-2 p-1 sm:grid-cols-5" role="radiogroup" aria-label={q.question}>
            {q.options.map((o, n) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={chosen(o)}
                disabled={agent.busy}
                onClick={() => pick(o)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl px-2 pb-2 pt-3 text-center outline-none ring-1 ring-foreground/10 transition-[box-shadow,background-color] hover:bg-muted/50 hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring",
                  chosen(o) && "bg-brand/10 ring-2 ring-brand",
                )}
              >
                <SizeFrame size={o.size} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium">
                    <Shortcut keys={[String(n + 1)]} className="mr-1 align-middle" />
                    {o.label}
                  </span>
                  {o.size && <span className="text-xs tabular-nums text-muted-foreground">{o.size}</span>}
                </span>
              </button>
            ))}
          </div>
        ) : q.display === "pictures" ? (
          // one picture per answer, drawn with their product; the name sits on the picture
          <div className={cn("grid grid-cols-2 gap-2 p-1", q.options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4")} role="radiogroup" aria-label={q.question}>
            {q.options.map((o, n) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={chosen(o)}
                aria-description={o.description}
                disabled={agent.busy}
                onClick={() => pick(o)}
                className={cn(
                  "group/p relative overflow-hidden rounded-xl bg-muted text-left outline-none ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring",
                  chosen(o) && "ring-2 ring-brand",
                )}
                style={{ aspectRatio: Math.min(1.25, Math.max(ctx.ratio, 0.8)) }}
              >
                <PictureSlot src={o.image} imgClassName="transition-[opacity,transform] duration-500 group-hover/p:scale-[1.03]" />
                <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-8 text-sm font-medium text-white">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-xs tabular-nums backdrop-blur-sm">{n + 1}</span>
                  <span className="truncate">{o.label}</span>
                </span>
              </button>
            ))}
          </div>
        ) : q.display === "chips" || q.display === "cards" ? (
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
                    "group/row relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                    "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-foreground/8 last:after:hidden hover:after:opacity-0",
                    on && "bg-brand/10 after:opacity-0 hover:bg-brand/12",
                  )}
                >
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-md text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-foreground/10", on && "bg-brand text-brand-foreground ring-brand")}>
                    {on && q.multi ? <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.5} /> : n + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn(on && "text-brand")}>{o.label}</span>
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
                  "flex flex-col gap-1.5 rounded-xl p-1.5 text-left outline-none ring-1 ring-foreground/10 transition-[box-shadow,background-color] hover:bg-muted/50 hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring",
                  chosen(o) && "bg-brand/10 ring-2 ring-brand",
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
                  <Shortcut keys={[String(n + 1)]} />
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t px-3 py-2">
        <HugeiconsIcon icon={PencilEdit01Icon} className="size-4 shrink-0 text-muted-foreground" />
        <InputGroupInput
          value={typed}
          onChange={(e) => setOther((o) => ({ ...o, [q.id]: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), cont())}
          placeholder="Something else…"
          aria-label="Your own answer"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground px-0"
        />
        <Button size="sm" variant="ghost" disabled={agent.busy} onClick={() => commit("Skipped")} className="gap-1.5 text-muted-foreground">
          Skip <Shortcut keys={["Esc"]} />
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
