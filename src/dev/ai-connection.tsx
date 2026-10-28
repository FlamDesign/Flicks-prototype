import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AI_MODELS, aiConfig, health, isLive, useAiConfig, type Health } from "@/ai/client"
import { cn } from "@/lib/utils"

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
          ? "Connected, but Higgsfield doesn't accept the key. Check HIGGSFIELD_KEY_ID and HIGGSFIELD_KEY_SECRET, then re-run the AI server workflow."
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
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", isLive(c) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
          {isLive(c) ? "Live AI" : "Scripted demo"}
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
        {test.text && <p className={cn("text-xs", test.state === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>{test.text}</p>}
      </div>
      {test.h && (
        <p className="text-xs text-muted-foreground">
          Today: {test.h.used.chats} of {test.h.caps.chats} chat replies, {test.h.used.images} of {test.h.caps.images} images.
        </p>
      )}
      <p className="text-xs text-muted-foreground">Without an address and passcode, the chat runs a scripted demo with sample images. Setup steps are in server/README.md.</p>
    </section>
  )
}
