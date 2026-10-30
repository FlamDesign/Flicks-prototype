import { useEffect, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import type { Item, Step, useAgent } from "@/ai/agent"
import type { Design, Field } from "@/ai/design"
import { AgentComposer, AgentItemView, isDocked, QuestionDeck, type AgentCtx } from "@/components/editor/agent-chat"
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
 * Before anything is generated: just the conversation, centred, like Claude's and Higgsfield's chat.
 * Questions dock above the composer; image requests and the plan sit in the conversation. The Flick
 * itself appears in the editor once the plan is approved.
 */
export function PlanningView({ agent, ctx }: { agent: Agent; ctx: AgentCtx; design?: Design; names?: string[]; values?: Partial<Record<Field, string>>[] }) {
  const list = useRef<HTMLDivElement>(null)
  // follow the conversation
  const last = agent.items.at(-1)
  useEffect(() => {
    const el = list.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [agent.items.length, last?.kind === "assistant" ? last.text.length : 0])
  // questions waiting for an answer dock above the composer instead
  const asking = (it: Item) => isDocked(it, agent.pendingIds)
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div ref={list} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-5 pb-6 pt-8">
          {agent.items.map((it) =>
            asking(it) ? null : (
              <div key={it.id} className="flex flex-col">
                <AgentItemView item={it} agent={agent} ctx={ctx} />
              </div>
            ),
          )}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-2 px-5 pb-5" data-composer>
        <QuestionDeck agent={agent} ctx={ctx} />
        <AgentComposer agent={agent} placeholder={agent.waiting ? "Or reply directly…" : "Tell me more, or ask for a change"} />
      </div>
    </div>
  )
}
