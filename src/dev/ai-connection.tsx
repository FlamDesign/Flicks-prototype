import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AI_MODELS, aiConfig, health, isLive, useAiConfig, type Health } from "@/ai/client"
import { cn } from "@/lib/utils"
import { agentConfig, setupAgent, type AgentConfig } from "@/ai/managed"
import { managedSystemPrompt, TOOLS } from "@/ai/agent"
import { SKILLS } from "@/ai/skills"

/** State manager > AI: where the chat's AI server is, its passcode (this device only) and the model. */
export function AiConnection() {
  const c = useAiConfig()
  const [show, setShow] = useState(false)
  const [test, setTest] = useState<{ state: "idle" | "testing" | "ok" | "fail"; text?: string; h?: Health }>({ state: "idle" })
  const run = async () => {
    setTest({ state: "testing" })
    try {
      const h = await health()
      const missing = [!h.claude && "Claude key", !h.images && "Higgsfield key"].filter(Boolean)
      const text = missing.length
        ? `Connected, but the server has no ${missing.join(" or ")} yet.`
        : h.images_key === "invalid"
          ? "Connected, but Higgsfield doesn't accept the key. Put the whole key from open.higgsfield.ai in the HIGGSFIELD_API_KEY secret, then re-run the AI server workflow."
          : "Connected. Claude and Higgsfield are ready."
      setTest({ state: missing.length || h.images_key === "invalid" ? "fail" : "ok", h, text })
    } catch (e) {
      setTest({ state: "fail", text: e instanceof Error ? e.message : "Couldn't connect." })
    }
  }
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Connection</h4>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", isLive(c) ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground")}>
          {isLive(c) ? "Set up" : "Not set up"}
        </span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ai-url" className="font-normal">AI server address</Label>
        <Input id="ai-url" value={c.url} onChange={(e) => aiConfig.set({ url: e.target.value })} placeholder="https://flicks-ai.your-name.workers.dev" className="h-8 text-sm" spellCheck={false} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ai-pass" className="font-normal">Passcode</Label>
        <div className="flex gap-2">
          <Input id="ai-pass" type={show ? "text" : "password"} value={c.passcode} onChange={(e) => aiConfig.set({ passcode: e.target.value })} autoComplete="off" className="h-8 flex-1 text-sm" />
          <Button size="sm" variant="outline" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">Kept on this device only. Never put it in the code.</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="font-normal">Model</Label>
        <Select value={c.model} onValueChange={(v) => aiConfig.set({ model: v })}>
          <SelectTrigger size="sm" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label} <span className="text-muted-foreground">{m.hint}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={!isLive(c) || test.state === "testing"} onClick={run}>
          {test.state === "testing" ? "Testing…" : "Test connection"}
        </Button>
        {test.text && <p className={cn("text-xs", test.state === "ok" ? "text-foreground" : "text-destructive")}>{test.text}</p>}
      </div>
      {test.h && (
        <p className="text-xs text-muted-foreground">
          Today: {test.h.used.chats} of {test.h.caps.chats} chat replies, {test.h.used.images} of {test.h.caps.images} images.
        </p>
      )}
      <p className="text-xs text-muted-foreground">Without an address and passcode the chat can’t start: it shows “Couldn’t connect to the AI server.” Setup steps are in server/README.md.</p>
      <ManagedAgent live={isLive(c)} model={c.model} />
    </section>
  )
}

/** The managed agent (the chat loop run by Anthropic): made or updated from the app's prompt, skills and tools */
function ManagedAgent({ live, model }: { live: boolean; model: string }) {
  const [cfg, setCfg] = useState<AgentConfig | null | undefined>(undefined)
  const [state, setState] = useState<{ busy?: boolean; text?: string; fail?: boolean }>({})
  useEffect(() => {
    if (live) void agentConfig().then(setCfg)
  }, [live])
  const run = async () => {
    setState({ busy: true })
    try {
      const next = await setupAgent(managedSystemPrompt(), TOOLS.filter((t) => t.name !== "read_skill"), model, SKILLS.map((x) => ({ name: x.name, text: `---\nname: ${x.name}\ndescription: ${x.description}\n---\n${x.body}\n` })))
      setCfg(next)
      setState({ text: `${cfg ? "Updated" : "Created"} the agent (version ${next.version ?? 1}). New chats with the Dev switch on use it.` })
    } catch (e) {
      setState({ fail: true, text: e instanceof Error ? e.message : "Couldn't set up the agent." })
    }
  }
  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Managed agent</h4>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", cfg ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground")}>{cfg ? `Version ${cfg.version ?? 1}` : "Not set up"}</span>
      </div>
      <p className="text-xs text-muted-foreground">The chat loop run on the AI side: the prompt, every skill and the tools go up as one agent; projects get a session each. The skills go up as Skills on Anthropic's side (a changed one gets a new version). Set it up again after a skill or tool change. Turn it on per browser with the Dev widget's Managed agent switch.</p>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={!live || state.busy} onClick={run}>
          {state.busy ? "Setting up…" : cfg ? "Update the agent" : "Set up the agent"}
        </Button>
        {state.text && <p className={cn("text-xs", state.fail ? "text-destructive" : "text-foreground")}>{state.text}</p>}
      </div>
      {cfg && <p className="text-xs text-muted-foreground">Agent {cfg.agentId} · model {cfg.model ?? "default"} · {Object.keys(cfg.skills ?? {}).length} skills · set up {new Date(cfg.at).toLocaleString()}</p>}
    </div>
  )
}

/** the Connection tab of the Dev AI dialog: the server, the model and the managed agent */
export function AiConnectionPanel() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-2xl">
        <AiConnection />
      </div>
    </div>
  )
}
