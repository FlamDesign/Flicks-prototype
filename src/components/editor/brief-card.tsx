import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import type { Item, useAgent } from "@/ai/agent"
import type { AgentCtx } from "@/components/editor/agent-chat"
import { cn } from "@/lib/utils"

type Agent = ReturnType<typeof useAgent>
type Q = Extract<Item, { kind: "question" }>

/** one thing the brief holds: a name, and what it looks like (pictures, swatches, words) */
type Entry = { key: string; label: string; value: string; images?: string[]; colors?: string[] }

/** What the brief holds so far, from the conversation: product, brand, concept, answers, format. */
export function briefEntries(agent: Agent, ctx: AgentCtx): Entry[] {
  const out: Entry[] = []
  const own = agent.ownImages()
  if (own.length) out.push({ key: "product", label: "Product", value: `${own.length} photo${own.length > 1 ? "s" : ""}`, images: own.slice(-4) })
  const b = ctx.brand
  if (b?.name || b?.primary_color) {
    const colors = [b.primary_color, b.secondary_color, b.text_color].filter((c): c is string => !!c && /^#/.test(c))
    out.push({ key: "brand", label: "Brand", value: [b.name, b.font].filter(Boolean).join(" · ") || "Colours", colors })
  }
  for (const it of agent.items) {
    if (it.kind !== "question" || it.answer === undefined || it.answer === "Skipped") continue
    const q = it as Q
    const picked = q.options.find((o) => o.label === q.answer)
    if (q.display === "concepts") {
      out.push({ key: q.id, label: "Concept", value: q.answer!, images: picked?.image ? [picked.image] : undefined })
      continue
    }
    out.push({
      key: q.id,
      label: shortQuestion(q.question),
      value: q.answer!,
      images: picked?.image ? [picked.image] : undefined,
      colors: q.display === "palettes" ? picked?.colors?.slice(0, 4) : undefined,
    })
  }
  if (agent.plan) out.push({ key: "variations", label: "Variations", value: agent.plan.variations.map((v) => v.name).join(", ") })
  if (out.length) out.push({ key: "format", label: "Format", value: `${ctx.size} · ${ctx.seconds}s` })
  return out
}

/** "What mood should it have?" → "Mood"; long questions keep their first few words */
function shortQuestion(q: string) {
  const t = q.replace(/[?.!]+$/, "").trim()
  const by = [[/^where\b/i, "Setting"], [/^when\b/i, "Timing"], [/^who\b/i, "People"], [/\bmood\b/i, "Mood"], [/\blight/i, "Light"], [/\bcolou?r/i, "Colours"], [/\blayout\b/i, "Layout"]] as const
  const hit = by.find(([re]) => re.test(t))
  if (hit) return hit[1]
  const m = t.match(/^(?:what|which|how|pick|choose)\s+(?:a\s+|the\s+)?(\w+(?:\s\w+)?)/i)
  const w = m ? m[1].replace(/\s(should|do|does|is|are|would|for)$/i, "") : t.split(" ").slice(0, 3).join(" ")
  return w.charAt(0).toUpperCase() + w.slice(1)
}

/**
 * The brief, pinned above the conversation: everything settled so far as pictures, swatches and
 * words, so the user sees what the Flick will be made from without scrolling back. One row; opens
 * to the full list.
 */
export function BriefCard({ agent, ctx, className }: { agent: Agent; ctx: AgentCtx; className?: string }) {
  const [open, setOpen] = useState(false)
  const entries = briefEntries(agent, ctx)
  // only once there's more than the format to show
  if (entries.length < 2) return null
  return (
    <section aria-label="Brief" className={cn("rounded-2xl bg-card/95 shadow-xs ring-1 ring-foreground/10 backdrop-blur", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Brief</span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden [mask-image:linear-gradient(to_right,black_85%,transparent)]">
          {entries.map((e) => (
            <span key={e.key} className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-muted/60 pl-0.5 pr-2 text-xs animate-in fade-in-0 zoom-in-95 duration-300">
              {e.images?.length ? (
                <span className="flex -space-x-2">
                  {e.images.slice(0, 3).map((u) => (
                    <img key={u} src={u} alt="" decoding="async" className="size-6 rounded-md object-cover ring-2 ring-card" />
                  ))}
                </span>
              ) : e.colors?.length ? (
                <span className="flex -space-x-1 pl-1">
                  {e.colors.map((c) => (
                    <span key={c} className="size-4 rounded-full ring-2 ring-card" style={{ background: c }} />
                  ))}
                </span>
              ) : (
                <span className="pl-1.5 text-muted-foreground">{e.label}</span>
              )}
              <span className="max-w-40 truncate font-medium">{e.value}</span>
            </span>
          ))}
        </span>
        <HugeiconsIcon icon={ArrowDown01Icon} className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-4 gap-y-2.5 border-t px-3 py-3 text-sm animate-in fade-in-0">
          {entries.map((e) => (
            <div key={e.key} className="contents">
              <dt className="truncate text-muted-foreground">{e.label}</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-2">
                {e.images?.map((u) => (
                  <img key={u} src={u} alt="" decoding="async" className="size-12 rounded-lg object-cover ring-1 ring-foreground/10" />
                ))}
                {e.colors?.map((c) => (
                  <span key={c} title={c} className="size-5 rounded-full ring-1 ring-foreground/10" style={{ background: c }} />
                ))}
                <span className="min-w-0 font-medium">{e.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
