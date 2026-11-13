import { AiError, MESSAGES, apiCall, aiConfig, type Block, type ChatResult, type Message, type Tool, type Usage } from "@/ai/client"
import { loadSaved, save } from "@/ai/sync"

/**
 * The chat loop run by Anthropic (Managed Agents) instead of in the browser. The app keeps its
 * memory of the conversation (msgs) exactly as before; what changes is how a reply is fetched:
 * new messages go to the project's session as events, the session's stream is read until it goes
 * idle, and what came back (words, tool calls) is shaped like a Messages API reply. The agent and
 * its sandbox are made once (setupAgent) and remembered on the server.
 */

/** Dev switch: the chat runs through a managed session instead of the browser loop */
export const managedOn = () => {
  try {
    return localStorage.getItem("flam.managed") === "1"
  } catch {
    return false
  }
}
export const setManaged = (on: boolean) => {
  try {
    localStorage.setItem("flam.managed", on ? "1" : "0")
  } catch {
    /* private mode */
  }
}

export type AgentConfig = { agentId: string; environmentId: string; version?: number; model?: string; at: number; /** the skills uploaded to Anthropic, by name: id and the version the agent uses */ skills?: Record<string, { id: string; version: string; hash: string }> }
const CONFIG_KEY = "agent-config"
export const agentConfig = () => loadSaved<AgentConfig>(CONFIG_KEY).catch(() => null)

const api = async <T>(path: string, init?: RequestInit): Promise<T> => (await apiCall(`/agent${path}`, init)).json() as Promise<T>
const post = <T>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) })

/** The built-in sandbox tools the agent keeps: web search, page reads, and read (how it opens its skills) */
const TOOLSET = {
  type: "agent_toolset_20260401",
  default_config: { enabled: false },
  configs: [
    { name: "read", enabled: true },
    { name: "web_search", enabled: true },
    { name: "web_fetch", enabled: true },
  ],
}

const hashOf = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16)

/** Uploads a skill (a SKILL.md) as a new skill or a new version of the one already up; unchanged skills are left as they are */
async function uploadSkill(name: string, text: string, have?: { id: string; version: string; hash: string }) {
  const hash = await hashOf(text)
  if (have && have.hash === hash) return have
  const form = new FormData()
  form.append("files[]", new Blob([text], { type: "text/markdown" }), `${name}/SKILL.md`)
  if (!have) form.append("display_name", `Flicks: ${name}`)
  const res = await apiCall(have ? `/agent/v1/skills/${have.id}/versions` : "/agent/v1/skills", { method: "POST", body: form })
  const made = (await res.json()) as { id?: string; skill_id?: string; version?: string; latest_version?: string }
  return { id: have?.id ?? made.id!, version: String(made.latest_version ?? made.version ?? ""), hash }
}

/**
 * Makes (or updates) the agent on Anthropic's side from the app's own prompt and tools, and the
 * sandbox it runs in. Called from the Dev page; the ids are kept on the server for every browser.
 */
export async function setupAgent(system: string, tools: Tool[], model: string, skills: { name: string; text: string }[]): Promise<AgentConfig> {
  const have = await agentConfig()
  let environmentId = have?.environmentId
  if (!environmentId) {
    const env = await post<{ id: string }>("/v1/environments", { name: "Flicks chat", description: "Where the Flicks chat agent runs: web search and page reads only." })
    environmentId = env.id
  }
  // the skills live on Anthropic's side: a changed one gets a new version, the rest stay
  const up: NonNullable<AgentConfig["skills"]> = {}
  for (const sk of skills) up[sk.name] = await uploadSkill(sk.name, sk.text, have?.skills?.[sk.name])
  const custom = tools.map((t) => ({ type: "custom", name: t.name, description: t.description ?? "", input_schema: t.input_schema ?? { type: "object", properties: {} } }))
  const body = { name: "Flicks chat", description: "The creative partner inside Flicks by Flam.", model: { id: model }, system, tools: [TOOLSET, ...custom], skills: Object.values(up).map((x) => ({ type: "custom", skill_id: x.id, version: x.version })) }
  const agent = have?.agentId ? await post<{ id: string; version?: number }>(`/v1/agents/${have.agentId}`, body) : await post<{ id: string; version?: number }>("/v1/agents", body)
  const cfg: AgentConfig = { agentId: agent.id, environmentId, version: agent.version, model, at: Date.now(), skills: up }
  await save(CONFIG_KEY, cfg)
  return cfg
}

/** A session for one project; the id is kept with the project's chat */
export async function createSession(cfg: AgentConfig, title: string, model?: string): Promise<string> {
  const agent = model && model !== cfg.model ? { type: "agent_with_overrides", id: cfg.agentId, model: { id: model } } : cfg.agentId
  const s = await post<{ id: string }>("/v1/sessions", { agent, environment_id: cfg.environmentId, title: title.slice(0, 80) })
  return s.id
}

type Ev = Record<string, unknown> & { type: string }

/** The app's messages since the last send, as session events (one user turn: text, images, tool results, then the project state) */
export function toEvents(msgs: Message[], state: unknown): Ev[] {
  const out: Ev[] = []
  for (const m of msgs) {
    if (m.role !== "user") continue
    const plain: Block[] = []
    for (const b of m.content) {
      if (b.type === "tool_result") {
        const content = typeof b.content === "string" ? [{ type: "text", text: b.content || "(done)" }] : b.content.filter((x) => x.type === "text" || x.type === "image")
        out.push({ type: "user.custom_tool_result", custom_tool_use_id: b.tool_use_id, content: content.length ? content : [{ type: "text", text: "(done)" }], ...(b.is_error ? { is_error: true } : {}) })
      } else if (b.type === "text" || b.type === "image") plain.push(b)
    }
    if (plain.length) out.push({ type: "user.message", content: plain })
  }
  if (!out.length) return out
  // the project state rides with every turn as privileged context, so it never reads as the user's words
  out.push({ type: "system.message", content: [{ type: "text", text: `Current project (JSON):\n${JSON.stringify(state)}` }] })
  return out
}

const STOP_MESSAGES: Record<string, string> = {
  budget_reached: "This project's chat has reached its budget.",
  retries_exhausted: "The chat couldn't finish this reply. Try again in a moment.",
  refusal: "The chat declined to continue with this.",
}

/**
 * One reply from the session: sends the events, then reads the stream until the session goes idle.
 * `onText` gets the words as they land; tool calls come back as tool_use blocks whose ids are the
 * session's event ids (the app answers them with results carrying those ids).
 */
export async function sessionTurn(sessionId: string, events: Ev[], onText: (text: string) => void, signal?: AbortSignal, onTool?: (name: string) => void, usage?: { current: Usage & { calls: number } }): Promise<ChatResult & { calls: number }> {
  // the stream first, so nothing sent is missed
  let res: Response
  try {
    res = await apiCall(`/agent/v1/sessions/${sessionId}/events/stream`, { signal, headers: { accept: "text/event-stream" } })
  } catch (e) {
    if (signal?.aborted) throw new AiError("aborted", "Stopped")
    throw e
  }
  if (!res.body) throw new AiError("network", MESSAGES.network)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  if (events.length) {
    await post(`/v1/sessions/${sessionId}/events`, { events }).catch(async (e) => {
      await reader.cancel().catch(() => {})
      // the state as a system note isn't taken: send it as the app's own words instead
      if (e instanceof AiError && /system/i.test(e.message)) return post(`/v1/sessions/${sessionId}/events`, { events: events.map((x) => (x.type === "system.message" ? { type: "user.message", content: [{ type: "text", text: `(From the app, not the user.) ${(x.content as { text: string }[])[0].text}` }] } : x)) })
      throw e
    })
  }
  const content: Block[] = []
  let calls = 0
  let text = ""
  let stop = ""
  let buf = ""
  const handle = (ev: Ev) => {
    switch (ev.type) {
      case "agent.message": {
        const blocks = (ev.content as { type: string; text?: string }[]) ?? []
        for (const b of blocks)
          if (b.type === "text" && b.text) {
            content.push({ type: "text", text: b.text })
            text = text ? `${text}\n\n${b.text}` : b.text
            onText(text)
          }
        break
      }
      case "agent.custom_tool_use":
        onTool?.(String(ev.name))
        content.push({ type: "tool_use", id: String(ev.id), name: String(ev.name), input: (ev.input as Record<string, unknown>) ?? {} })
        break
      case "agent.tool_use":
        // the sandbox's own tools (web search, page reads): shown as quiet lines, like server tools
        content.push({ type: "server_tool_use", id: String(ev.id), name: String(ev.name), input: (ev.input as Record<string, unknown>) ?? {} })
        break
      case "span.model_request_end":
        calls++
        break
      case "session.usage": {
        // the session's totals so far (not this reply's): the app shows them as the project's cost
        const u = ev.usage as { input_tokens?: number; cache_read_input_tokens?: number; cache_creation?: Record<string, number>; output_tokens?: number } | undefined
        if (u && usage) usage.current = { ...usage.current, input: u.input_tokens ?? 0, cached: u.cache_read_input_tokens ?? 0, written: Object.values(u.cache_creation ?? {}).reduce((a, b) => a + b, 0), output: u.output_tokens ?? 0 }
        break
      }
      case "session.error": {
        const err = ev.error as { message?: string } | undefined
        throw new AiError("claude_error", err?.message ?? "The chat hit an error.")
      }
      case "session.status_idle": {
        const r = ev.stop_reason as { type: string } | undefined
        stop = r?.type ?? "end_turn"
        if (stop in STOP_MESSAGES) throw new AiError("claude_error", STOP_MESSAGES[stop])
        break
      }
      case "session.status_terminated":
        throw new AiError("claude_error", "This project's chat session has ended.")
    }
  }
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let i: number
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, i)
        buf = buf.slice(i + 2)
        const data = chunk
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("\n")
        if (!data) continue
        let ev: Ev
        try {
          ev = JSON.parse(data) as Ev
        } catch {
          continue
        }
        handle(ev)
        if (stop) break
      }
      if (stop) break
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  if (signal?.aborted) throw new AiError("aborted", "Stopped")
  if (!stop) throw new AiError("network", "The chat's stream ended early.")
  return { content, stop: stop === "requires_action" ? "tool_use" : "end_turn", usage: { input: 0, cached: 0, written: 0, output: 0 }, calls }
}

/** Stops the reply in progress on the server (the app's Stop button) */
export const interrupt = (sessionId: string) => post(`/v1/sessions/${sessionId}/events`, { events: [{ type: "user.interrupt" }] }).catch(() => {})

export const managedModel = () => aiConfig.get().model
