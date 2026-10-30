import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import type { Step, useAgent } from "@/ai/agent"
import type { Design, Field } from "@/ai/design"
import { AgentComposer, AgentItemView, ChoicePointer, isOpenChoice, StageContext, type AgentCtx } from "@/components/editor/agent-chat"
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
 * Before anything is generated: choices on the left (questions, image requests, the plan), the chat
 * on the right. With nothing to choose, the left shows the Flick taking shape. Below lg, everything
 * stays in the chat.
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
  values: Partial<Record<Field, string>>[]
}) {
  const list = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
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

  const open = agent.items.filter(isOpenChoice)
  const openKey = open.map((x) => x.id).join()
  // new choices: back to the top of the panel
  useEffect(() => panel.current?.scrollTo({ top: 0, behavior: "smooth" }), [openKey])
  const show = (id: string) => document.getElementById(`choice-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })

  const hasLook = Object.keys(design).length > 0
  const preview = (big: boolean) => (
    <div className={cn("flex w-full flex-col gap-3", big ? "max-w-[360px]" : "max-w-[240px]")} onPointerDown={() => setAuto(false)}>
      <FlickPreview
        design={hasLook || planned ? { headline: "Your headline", cta: "Shop now", ...design } : { cta: "" }}
        brand={ctx.brand}
        ratio={ctx.ratio}
        posters={ctx.posters}
        active={shown}
        values={values[shown]}
        dim={!planned && !hasLook}
        className="mx-auto shadow-lg"
        style={{ width: big ? `min(100%, calc(60vh * ${ctx.ratio}))` : `min(100%, calc(40vh * ${ctx.ratio}))` }}
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
  )

  return (
    <div className="flex min-h-0 flex-1">
      {/* choices, or the Flick taking shape */}
      <section aria-label={open.length ? "Choices" : "Preview"} className="hidden min-w-0 flex-1 bg-[color-mix(in_oklch,var(--muted),var(--foreground)_3%)] lg:flex">
        {open.length > 0 ? (
          <>
            <div ref={panel} className="min-h-0 flex-1 overflow-y-auto">
              <StageContext.Provider value={true}>
                <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-6 pb-10 pt-8">
                  {open.map((it) => (
                    <div key={it.id} id={`choice-${it.id}`} className="flex scroll-mt-6 flex-col">
                      <AgentItemView item={it} agent={agent} ctx={ctx} />
                    </div>
                  ))}
                  {open.some((x) => x.kind === "question" && x.display === "chips") && (
                    <p className="text-center text-xs text-muted-foreground">Press 1 to {Math.min(9, Math.max(...open.map((x) => (x.kind === "question" ? x.options.length : 0))))} to pick, or type your own.</p>
                  )}
                </div>
              </StageContext.Provider>
            </div>
            <aside aria-label="Preview" className="hidden w-[300px] shrink-0 flex-col items-center justify-center border-l bg-background p-6 xl:flex">
              {preview(false)}
            </aside>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">{preview(true)}</div>
        )}
      </section>

      {/* the conversation */}
      <section className="flex min-w-0 flex-1 flex-col border-l bg-background lg:w-[400px] lg:flex-none">
        <div ref={list} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[620px] flex-col gap-5 px-5 pb-6 pt-6">
            {agent.items.map((it) => (
              <div key={it.id} className="flex flex-col">
                {isOpenChoice(it) ? (
                  <>
                    <div className="flex flex-col lg:hidden">
                      <AgentItemView item={it} agent={agent} ctx={ctx} />
                    </div>
                    <div className="hidden lg:flex">
                      <ChoicePointer item={it} onShow={() => show(it.id)} />
                    </div>
                  </>
                ) : (
                  <AgentItemView item={it} agent={agent} ctx={ctx} />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-[620px] px-5 pb-5" data-composer>
          <AgentComposer agent={agent} placeholder={agent.waiting ? "Pick an answer, or type your own" : "Tell me more, or ask for a change"} />
        </div>
      </section>
    </div>
  )
}
