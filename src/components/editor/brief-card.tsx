import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import type { Item, useAgent } from "@/ai/agent"
import type { AgentCtx } from "@/components/editor/agent-chat"
import { cn } from "@/lib/utils"

type Agent = ReturnType<typeof useAgent>
type Q = Extract<Item, { kind: "question" }>

/** one thing the brief holds: a name, and what it looks like (pictures, swatches, words) */
export type BriefEntry = { key: string; label: string; value: string; images?: string[]; colors?: string[] }

/**
 * What the brief held at a point in the conversation (the items so far): your images, brand, goal and
 * the other answers, concept, variations and format. Read from the chat itself, so each update shows
 * what changed at that moment.
 */
export function briefAt(items: Item[], agent: Agent, ctx: AgentCtx): BriefEntry[] {
  void agent
  const out: BriefEntry[] = []
  const photos = [...new Set(items.flatMap((x) => (x.kind === "user" ? x.images : x.kind === "assets" && x.done === "added" ? (x.images ?? []) : [])))]
  if (photos.length) out.push({ key: "product", label: "Your images", value: `${photos.length} image${photos.length > 1 ? "s" : ""}`, images: photos.slice(-4) })
  const brand = [...items].reverse().find((x): x is Extract<Item, { kind: "brand" }> => x.kind === "brand")?.brand
  if (brand?.name || brand?.primary_color) {
    const colors = [brand.primary_color, brand.secondary_color, brand.text_color].filter((c): c is string => !!c && /^#/.test(c))
    out.push({ key: "brand", label: "Brand", value: [brand.name, brand.font].filter(Boolean).join(" · ") || "Colors", colors, images: brand.logo ? [brand.logo] : undefined })
  }
  let size: string | undefined
  for (const it of items) {
    if (it.kind !== "question" || it.answer === undefined || it.answer === "Skipped") continue
    const q = it as Q
    const picked = q.options.find((o) => o.label === q.answer)
    // the size shows as the Format line
    if (q.purpose === "size" || q.display === "sizes") {
      size = picked?.size ?? q.answer!.match(/\d{2,5}\s*[x×]\s*\d{2,5}/)?.[0]?.replace(/\s*[x×]\s*/, "×")
      continue
    }
    // the goal, even when the question wasn't tagged as it ("What's this Flick for?")
    const goal = q.purpose === "goal" || /\b(what'?s|what is)\b.*\bfor\b|\bgoal\b|\bpurpose\b|\baim\b/i.test(q.question)
    const key = q.display === "concepts" ? "concept" : goal ? "goal" : q.purpose === "placement" ? q.purpose : q.id
    const entry: BriefEntry = {
      key,
      label: q.display === "concepts" ? "Concept" : goal ? "Goal" : q.purpose === "placement" ? "Runs in" : shortQuestion(q.question),
      value: q.answer!,
      images: picked?.image ? [picked.image] : undefined,
      colors: q.display === "palettes" ? picked?.colors?.slice(0, 4) : undefined,
    }
    // a later answer to the same kind of question replaces the earlier one
    const at = out.findIndex((e) => e.key === key)
    if (at >= 0) out[at] = entry
    else out.push(entry)
  }
  const plan = [...items].reverse().find((x): x is Extract<Item, { kind: "plan" }> => x.kind === "plan" && x.state !== "skipped")
  if (plan) out.push({ key: "variations", label: "Variations", value: plan.plan.variations.map((v) => v.name).join(", ") })
  const fmt = size ?? (plan ? ctx.size : undefined)
  if (fmt) out.push({ key: "format", label: "Format", value: `${fmt} · ${ctx.seconds}s` })
  return out
}

export const sigOf = (e: BriefEntry) => [e.value, ...(e.images ?? []), ...(e.colors ?? [])].join("|")
export const briefSig = (entries: BriefEntry[]) => new Map(entries.map((e) => [e.key, sigOf(e)]))

/** "What mood should it have?" → "Mood"; long questions keep their first few words */
function shortQuestion(q: string) {
  const t = q.replace(/[?.!]+$/, "").trim()
  const by = [[/^where\b/i, "Setting"], [/^when\b/i, "Timing"], [/^who\b/i, "People"], [/\bmood\b/i, "Mood"], [/\blight/i, "Light"], [/\bcolou?r/i, "Colors"], [/\blayout\b/i, "Layout"], [/\bvariations?\b|\bchange between\b/i, "What changes"], [/\b(opening|first) frame\b|\bopen(s|ing)? on\b/i, "Opening frame"], [/\b(last|final|end(ing)?) frame\b/i, "Final frame"], [/\bthumbnails?\b/i, "Thumbnails"], [/\bproducts?\b/i, "Products"], [/\bcast\b|\bpeople\b|\bcharacters?\b/i, "Cast"], [/\bscenes?\b/i, "Scenes"]] as const
  const hit = by.find(([re]) => re.test(t))
  if (hit) return hit[1]
  if (/^(is|are|does|do|should|shall|can|will|would)\b/i.test(t)) return "Your answer"
  const m = t.match(/^(?:what|which|how|pick|choose)\s+(?:a\s+|the\s+)?(\w+(?:\s\w+)?)/i)
  const w = m ? m[1].replace(/\s(should|do|does|is|are|would|for)$/i, "") : t.split(" ").slice(0, 3).join(" ")
  return w.charAt(0).toUpperCase() + w.slice(1)
}

/** one entry's look: pictures or swatches, then the words */
function Value({ e, big }: { e: BriefEntry; big?: boolean }) {
  return (
    <>
      {e.images?.length ? (
        <span className={cn("flex", big ? "flex-wrap gap-1.5" : "-space-x-2")}>
          {e.images.slice(0, big ? 8 : 3).map((u) => (
            <img key={u} src={u} alt="" decoding="async" className={cn("object-cover", big ? "size-10 rounded-lg ring-1 ring-foreground/10" : "size-5 rounded-md ring-2 ring-card")} />
          ))}
        </span>
      ) : null}
      {e.colors?.length ? (
        <span className={cn("flex", big ? "gap-1" : "-space-x-1")}>
          {e.colors.map((c) => (
            <span key={c} title={c} className={cn("rounded-full", big ? "size-5 ring-1 ring-foreground/10" : "size-3.5 ring-2 ring-card")} style={{ background: c }} />
          ))}
        </span>
      ) : null}
      <span className={cn("min-w-0 font-medium", big ? "break-words" : "truncate")}>{e.value}</span>
    </>
  )
}

/**
 * "Brief updated": appears in the conversation when answers change the brief, showing the whole brief
 * as it now stands, top to bottom. Only the newest one is open; earlier ones fold to a line.
 */
export function BriefUpdate({ all, latest = true }: { all: BriefEntry[]; latest?: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null)
  const shown = open ?? latest
  return (
    <section aria-label="Brief" className="mr-6 overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <button type="button" onClick={() => setOpen(!shown)} aria-expanded={shown} className="flex min-h-10 w-full items-center gap-2 bg-muted/50 px-3 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted/70">
        <HugeiconsIcon icon={Tick02Icon} className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{latest ? "Brief updated" : "Brief"}</span>
        {!shown && <span className="min-w-0 truncate text-xs text-muted-foreground">{all.map((e) => e.value).join(" · ")}</span>}
        <HugeiconsIcon icon={ArrowDown01Icon} className={cn("ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform", shown && "rotate-180")} />
      </button>
      {shown && (
        <dl className="flex flex-col divide-y divide-foreground/10 border-t text-sm animate-in fade-in-0">
          {all.map((e) => (
            <div key={e.key} className="grid grid-cols-[6rem_1fr] items-center gap-3 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{e.label}</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-2">
                <Value e={e} big />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
