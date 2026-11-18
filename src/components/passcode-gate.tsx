import { useState } from "react"
import { FlicksLogo } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { aiConfig, health } from "@/ai/client"

/**
 * The first thing a device sees: the server passcode. Everything the app shows (projects, Flicks,
 * assets, the chat) lives on the AI server, so there is nothing to show without it; no sample
 * stand-ins. The passcode is checked against the server and kept on this device.
 */
export function PasscodeGate() {
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const go = async () => {
    const passcode = code.trim()
    if (!passcode || busy) return
    setBusy(true)
    setError(null)
    const before = aiConfig.get().passcode
    aiConfig.set({ passcode })
    try {
      const h = await health()
      if (!h.ok) throw new Error("The server didn't answer as expected.")
    } catch (e) {
      aiConfig.set({ passcode: before })
      const msg = e instanceof Error ? e.message : ""
      setError(/passcode|401|403|refused/i.test(msg) ? "That passcode wasn't accepted." : msg || "Couldn't connect to the AI server.")
      setBusy(false)
    }
  }
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <form
        onSubmit={(e) => (e.preventDefault(), void go())}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10"
        aria-labelledby="gate-title"
      >
        <FlicksLogo className="h-7 text-foreground" />
        <div className="flex flex-col gap-1">
          <h1 id="gate-title" className="text-lg font-semibold">
            Server passcode
          </h1>
          <p className="text-sm text-muted-foreground">This prototype runs on a private server. Enter its passcode once on this device.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gate-code">Passcode</Label>
          <Input id="gate-code" type="password" autoComplete="off" autoFocus value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "gate-error" : undefined} />
          {error && (
            <p id="gate-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" disabled={!code.trim() || busy}>
          {busy ? "Checking…" : "Continue"}
        </Button>
      </form>
    </div>
  )
}
