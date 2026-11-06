import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { aiConfig, isLive } from "@/ai/client"
import { loadSaved } from "@/ai/sync"
import { cn } from "@/lib/utils"

/** the shape of a saved chat we read numbers from (the rest is ignored) */
type SavedItem = { kind: string; at: number; state?: string; count?: number; answer?: string; fail?: string[]; text?: string }
type SavedChat = { items: SavedItem[] }
type SavedState = { projects?: { id: string; name?: string; editedAt?: number }[] }

type Stage = "start" | "brief" | "concepts" | "storyboard" | "building" | "reviewed" | "handed over"
export type ChatMetrics = {
  id: string
  name: string
  when: number
  stage: Stage
  /** the user's own messages and answers */
  turns: number
  /** questions asked before the storyboard */
  questions: number
  /** user turns before the storyboard appeared */
  toStoryboard?: number
  videos: number
  /** minutes from the first message to the last activity */
  minutes: number
  reviewFails: number
}

const STAGES: Stage[] = ["start", "brief", "concepts", "storyboard", "building", "reviewed", "handed over"]

/** where a chat got to, and how much it took to get there */
export function metricsOf(id: string, name: string, items: SavedItem[]): ChatMetrics {
  const first = items[0]?.at ?? Date.now()
  const last = items.at(-1)?.at ?? first
  const planAt = items.findIndex((x) => x.kind === "plan")
  const before = planAt < 0 ? items : items.slice(0, planAt)
  const userTurns = (list: SavedItem[]) => list.filter((x) => x.kind === "user" || (x.kind === "question" && x.answer !== undefined && x.answer !== "Skipped")).length
  const approved = items.some((x) => x.kind === "plan" && x.state === "approved")
  const reviews = items.filter((x) => x.kind === "review")
  const build = items.find((x) => x.kind === "build")
  // the hand-over: the assistant's last words after every review, with nothing waiting
  const handed = approved && reviews.length > 0 && items.at(-1)?.kind === "assistant" && !!items.at(-1)?.text
  const stage: Stage = handed ? "handed over" : reviews.length ? "reviewed" : approved ? "building" : planAt >= 0 ? "storyboard" : items.some((x) => x.kind === "question" && (x as { display?: string }).display === "concepts") ? "concepts" : items.some((x) => x.kind === "question") ? "brief" : "start"
  return {
    id,
    name,
    when: first,
    stage,
    turns: userTurns(items),
    questions: before.filter((x) => x.kind === "question").length,
    toStoryboard: planAt >= 0 ? userTurns(before) : undefined,
    videos: build?.count ?? 0,
    minutes: Math.round((last - first) / 60_000),
    reviewFails: reviews.reduce((n, r) => n + (r.fail?.length ?? 0), 0),
  }
}

const day = (t: number) => new Date(t).toLocaleDateString([], { month: "short", day: "numeric" })
const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "–")

/**
 * Every saved chat, one row each: how far it got, how many turns and questions it took to reach the
 * storyboard, how many videos it made and how long it ran. The averages at the top are what flow
 * changes should move: fewer turns and questions to the storyboard, more chats handed over.
 */
export function ChatMetricsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [rows, setRows] = useState<ChatMetrics[] | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const load = async () => {
    if (!isLive()) return setError("Connect the AI server first (State manager, AI).")
    setLoading(true)
    setError("")
    try {
      const base = aiConfig.get().url.trim().replace(/\/+$/, "")
      const res = await fetch(`${base}/store`, { headers: { "x-flicks-pass": aiConfig.get().passcode.trim() } })
      if (!res.ok) throw new Error(`list ${res.status}`)
      const { chats } = (await res.json()) as { chats: string[] }
      const state = await loadSaved<SavedState>("state")
      const names = new Map((state?.projects ?? []).map((p) => [p.id, p.name ?? ""]))
      // only chats whose project still exists (deleted ones are gone from the list)
      const ids = chats.filter((id) => names.has(id)).slice(0, 150)
      const got = await Promise.all(ids.map((id) => loadSaved<SavedChat>(`chat-${id}`).then((c) => (c?.items?.length ? metricsOf(id, names.get(id) ?? "", c.items) : null)).catch(() => null)))
      setRows(got.filter((x): x is ChatMetrics => !!x).sort((a, b) => b.when - a.when))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the chats.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (open && !rows) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const reached = rows?.filter((r) => r.toStoryboard !== undefined) ?? []
  const summary = rows && [
    ["Chats", String(rows.length)],
    ["Reached the storyboard", `${reached.length} (${rows.length ? Math.round((reached.length / rows.length) * 100) : 0}%)`],
    ["Turns to storyboard", avg(reached.map((r) => r.toStoryboard!))],
    ["Questions before it", avg(reached.map((r) => r.questions))],
    ["Handed over", String(rows.filter((r) => r.stage === "handed over").length)],
    ["Videos made", String(rows.reduce((n, r) => n + r.videos, 0))],
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Chat metrics</DialogTitle>
          <DialogDescription>How far each chat got, and what it took to get there. Averages first; what flow changes should move.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
            {loading ? <Spinner className="size-3.5" /> : <HugeiconsIcon icon={RefreshIcon} className="size-3.5" />}
            Refresh
          </Button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
        {summary && (
          <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {summary.map(([k, v]) => (
              <div key={k} className="rounded-lg bg-muted/50 px-2.5 py-2">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-sm font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="min-h-0 overflow-auto rounded-lg ring-1 ring-foreground/10">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background text-left text-muted-foreground">
              <tr>
                {["Project", "When", "Stage", "Turns", "To storyboard", "Questions", "Videos", "Review fails", "Minutes"].map((h) => (
                  <th key={h} className="px-2 py-1.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="border-t border-foreground/10">
                  <td className="max-w-48 truncate px-2 py-1.5 font-medium">{r.name || r.id.slice(0, 8)}</td>
                  <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{day(r.when)}</td>
                  <td className="px-2 py-1.5">
                    <span className={cn("rounded-full px-1.5 py-0.5", STAGES.indexOf(r.stage) >= 4 ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground")}>{r.stage}</span>
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{r.turns}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.toStoryboard ?? "–"}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.questions}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.videos || "–"}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.reviewFails || "–"}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.minutes}</td>
                </tr>
              ))}
              {rows && !rows.length && (
                <tr>
                  <td colSpan={9} className="px-2 py-6 text-center text-muted-foreground">
                    No saved chats yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
