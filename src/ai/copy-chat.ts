import type { Block, Message } from "@/ai/client"
import { isLive } from "@/ai/client"
import { loadSaved, save } from "@/ai/sync"
import type { Item } from "@/ai/agent"

/** the chat record as saved (see SavedChat in agent.ts); only what the copy touches is typed */
type Saved = { items: Item[]; msgs: Message[]; pending?: unknown[]; ready?: Block[]; held?: Record<string, unknown>; inTurn?: boolean; resumeDismissed?: boolean; notes?: { text: string; wake?: boolean }[]; [k: string]: unknown }

const toolUses = (m: Message) => (Array.isArray(m.content) ? m.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use") : [])
const isUserText = (m: Message) => m.role === "user" && (!Array.isArray(m.content) || !m.content.some((b) => b.type === "tool_result"))

/**
 * The conversation at its last safe point: everything up to the last reply the chat finished (no
 * tool call left open, no message waiting for an answer). Cards that belonged to the cut part go too.
 */
export function safeChat(saved: Saved, title: string): Saved {
  const msgs = [...saved.msgs]
  while (msgs.length && !(msgs[msgs.length - 1].role === "assistant" && toolUses(msgs[msgs.length - 1]).length === 0)) msgs.pop()
  const tools = new Set(msgs.flatMap((m) => toolUses(m).map((u) => u.id)))
  // the cards: up to the user message that follows the last kept reply
  const keptUsers = msgs.filter(isUserText).length
  let users = 0
  const items: Item[] = []
  for (const x of saved.items) {
    if (x.kind === "user" && ++users > keptUsers) break
    if (x.kind === "resume") continue
    if ("toolId" in x && x.toolId && !tools.has(x.toolId)) continue
    if (x.kind === "image" && x.state === "working") items.push({ ...x, state: "stopped" })
    else items.push(x)
  }
  const note = { text: `(This project is now a copy named “${title}”. Carry on from here; nothing you do here changes the original.)`, wake: false }
  return { ...saved, msgs, items, pending: [], ready: [], held: {}, inTurn: false, resumeDismissed: true, notes: [...(saved.notes ?? []), note] }
}

/**
 * Copies a project's conversation to another project id, at its last safe point. Nothing to copy
 * (no chat, or no server) is fine: the copy just opens without one.
 */
export async function copyChat(fromId: string, toId: string, title: string) {
  if (!isLive()) return false
  const saved = await loadSaved<Saved>(`chat-${fromId}`).catch(() => null)
  if (!saved?.msgs?.length) return false
  await save(`chat-${toId}`, safeChat(saved, title))
  return true
}

type SlideLike = { job?: { status: string; id?: string }; startedAt?: number; video?: number; used?: unknown }
/** The canvas for a copy: videos still being made are left unmade, so the copy carries no running work. */
export function safeSnap<S extends { slides: SlideLike[] }>(snap: S): S {
  const going = (x: SlideLike) => !!x.job?.id || x.job?.status === "waiting"
  return { ...snap, slides: snap.slides.map((x) => (going(x) ? { ...x, job: undefined, startedAt: undefined, video: undefined } : x)) }
}
