import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import type { Step, useAgent } from "@/ai/agent"
import type { Design } from "@/ai/design"
import { AgentComposer, AgentItemView, type AgentCtx } from "@/components/editor/agent-chat"
import { FlickPreview } from "@/components/editor/flick-preview"
import { cn } from "@/lib/utils"

type Agent = ReturnType<typeof useAgent>
const STEPS: { id: Step; label: string }[] = [
  { id: "idea", label: "Idea" },
  { id: "look", label: "Look" },
  { id: "plan", label: "Plan" },
  { id: "build", label: "Build" },
]

/** Where the user is in making the Flick: Idea, Look, Plan, Build. */
export function PlanSteps({ step }: { step: Step }) {
  const at = STEPS.findIndex((s) => s.id === step)
  return (
    <ol aria-label="Steps" className="flex items-center gap-1 text-xs">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className={cn("h-px w-5 transition-colors", i <= at ? "bg-foreground/40" : "bg-foreground/10")} />}
          <span
            aria-current={i === at ? "step" : undefined}
            className={cn(
              "flex h-6 items-center gap-1 rounded-full px-2.5 font-medium transition-colors",
              i < at ? "text-foreground" : i === at ? "bg-foreground text-background" : "text-muted-foreground",
            )}
          >
            {i < at && <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={2.5} />}
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Before anything is generated: the chat on the left, roomy and centred, and the Flick taking shape
 * on the right as the user answers. No editor tools yet; they arrive with the build.
 */
export function PlanningView({
  agent,
  ctx,
  design,
  names,
  values,
}: {
  agent: Agent
  ctx: AgentCtx
  /** the design so far: the plan's, or the look picked before there's a plan */
  design: Design
  /** variation names for the preview's tabs (placeholders before the plan) */
  names: string[]
  values: { label?: string; price?: string }[]
}) {
  const list = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const planned = names.length > 0 && !!agent.plan
  const shown = Math.min(active, Math.max(0, names.length - 1))
  // the preview flips through the variations on its own until one is picked
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto || names.length < 2) return
    const t = setInterval(() => setActive((a) => (a + 1) % names.length), 2600)
    return () => clearInterval(t)
  }, [auto, names.length])
  // follow the conversation
  const last = agent.items.at(-1)
  useEffect(() => {
    const el = list.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [agent.items.length, last?.kind === "assistant" ? last.text.length : 0])

  const hasLook = Object.keys(design).length > 0
  return (
    <div className="flex min-h-0 flex-1">
      {/* the conversation */}
      <section className="flex min-w-0 flex-1 flex-col bg-[color-mix(in_oklch,var(--muted),var(--foreground)_3%)]">
        <div ref={list} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[620px] flex-col gap-5 px-5 pb-6 pt-8">
            {agent.items.map((it) => (
              <div key={it.id} className="flex flex-col">
                <AgentItemView item={it} agent={agent} ctx={ctx} />
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-[620px] px-5 pb-5" data-composer>
          <AgentComposer agent={agent} placeholder={agent.waiting ? "Pick an answer above, or type your own" : "Tell me more, or ask for a change"} />
        </div>
      </section>

      {/* the Flick, taking shape */}
      <aside aria-label="Preview" className="hidden w-[min(40vw,480px)] shrink-0 flex-col items-center justify-center gap-4 border-l bg-background p-8 lg:flex">
        <div className="flex w-full max-w-[360px] flex-col gap-3" onPointerDown={() => setAuto(false)}>
          <FlickPreview
            design={hasLook || planned ? { headline: "Your headline", cta: "Shop now", ...design } : { cta: "" }}
            brand={ctx.brand}
            ratio={ctx.ratio}
            posters={ctx.posters}
            active={shown}
            values={values[shown]}
            dim={!planned && !hasLook}
            className="mx-auto shadow-lg"
            style={{ width: `min(100%, calc(60vh * ${ctx.ratio}))` }}
          />
          {names.length > 0 && (
            <div role="tablist" aria-label="Variations" className="flex flex-wrap justify-center gap-1">
              {names.map((n, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === shown}
                  onClick={() => (setAuto(false), setActive(i))}
                  className={cn("h-7 rounded-full px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", i === shown ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            {planned ? "This is how it will look. Videos generate when you press Generate all." : hasLook ? "Your look. Variations come next." : "Your Flick takes shape here as you answer."}
          </p>
        </div>
      </aside>
    </div>
  )
}
