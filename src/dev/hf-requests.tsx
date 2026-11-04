import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Copy01Icon, Image01Icon, RefreshIcon, Search01Icon, Tick02Icon, Video01Icon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isLive, jobStatus, requestLog, type HfRequest } from "@/ai/client"
import { cn } from "@/lib/utils"

/** what happened to a request, in one word */
type State = "rejected" | "waiting" | "done" | "failed"
const stateOf = (r: HfRequest): State =>
  r.status >= 400 || !r.request_id ? "rejected" : r.job?.status === "completed" || r.job?.saved ? "done" : r.job?.status ? "failed" : "waiting"
const STATE: Record<State, { label: string; variant: "secondary" | "outline" | "destructive" | "default" }> = {
  done: { label: "Completed", variant: "secondary" },
  waiting: { label: "Sent", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
  rejected: { label: "Rejected", variant: "destructive" },
}
const kindOf = (r: HfRequest): "image" | "video" => r.job?.kind ?? (/video|seedance|kling|veo/i.test(r.path) ? "video" : "image")
/** "/bytedance/seedance-2.5/video-edit" → "Seedance 2.5 · video edit" */
const modelName = (path: string) => {
  const parts = path.split("/").filter(Boolean)
  const nice = (s: string) => s.replace(/[-_]/g, " ").replace(/\bv(\d)/i, "v$1")
  if (parts[0] === "bytedance") return `${nice(parts[1] ?? "")} · ${nice(parts.slice(2).join(" ") || "")}`.replace(/^seedance/, "Seedance")
  if (parts[0] === "marketing-studio") return `Marketing Studio${parts[2] ? ` ${nice(parts[2])}` : ""}`
  return parts.map(nice).join(" · ")
}
const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
const day = (t: number) => new Date(t).toLocaleDateString([], { month: "short", day: "numeric" })
const span = (ms: number) => (ms < 1000 ? `${ms} ms` : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`)
const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000)
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : day(t)
}
const payloadOf = (r: HfRequest) => (r.payload && typeof r.payload === "object" ? r.payload : {}) as Record<string, unknown>

/**
 * Every job the app sent to Higgsfield through the AI server, newest first: the model, what it was
 * for, what was sent (prompt, numbered inputs, settings), how long it took and what came back.
 */
export function HfRequests({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [items, setItems] = useState<HfRequest[] | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [live, setLive] = useState(true)
  const [kind, setKind] = useState<"all" | "image" | "video">("all")
  const [only, setOnly] = useState<"all" | State>("all")
  const [q, setQ] = useState("")
  const [sel, setSel] = useState<string | null>(null)
  const load = async () => {
    setLoading(true)
    try {
      setItems(await requestLog(200))
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the requests.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (!open) return
    void load()
    if (!live) return
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, live])
  const keyOf = (r: HfRequest) => `${r.at}-${r.request_id ?? r.path}`
  const shown = useMemo(
    () =>
      (items ?? []).filter((r) => {
        if (kind !== "all" && kindOf(r) !== kind) return false
        if (only !== "all" && stateOf(r) !== only) return false
        const text = [r.path, r.job?.project, r.job?.variation, r.job?.purpose, String(payloadOf(r).prompt ?? ""), r.request_id].join(" ").toLowerCase()
        return !q.trim() || text.includes(q.trim().toLowerCase())
      }),
    [items, kind, only, q],
  )
  const picked = shown.find((r) => keyOf(r) === sel) ?? shown[0]
  const counts = useMemo(() => {
    const c = { done: 0, waiting: 0, failed: 0, rejected: 0 }
    for (const r of items ?? []) c[stateOf(r)]++
    return c
  }, [items])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(860px,92vh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle>Higgsfield requests</DialogTitle>
            <span className="text-xs tabular-nums text-muted-foreground">
              {counts.done} completed · {counts.waiting} sent · {counts.failed + counts.rejected} failed
            </span>
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={live} onCheckedChange={setLive} aria-label="Refresh every 10 seconds" />
              Live
            </label>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
              {loading ? <Spinner className="size-3.5" /> : <HugeiconsIcon icon={RefreshIcon} className="size-3.5" />}
              Refresh
            </Button>
          </div>
          <DialogDescription className="sr-only">Jobs the app sent to Higgsfield through the AI server, with their inputs and outcomes.</DialogDescription>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts, projects, ids" aria-label="Search requests" className="h-8 pl-8 text-sm" />
            </div>
            <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="image">Images</TabsTrigger>
                <TabsTrigger value="video">Videos</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={only} onValueChange={(v) => setOnly(v as typeof only)}>
              <TabsList>
                <TabsTrigger value="all">Any status</TabsTrigger>
                <TabsTrigger value="done">Completed</TabsTrigger>
                <TabsTrigger value="waiting">Sent</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {!isLive() ? (
          <Empty text="Connect the AI server (AI connection in State manager) to see requests." />
        ) : error ? (
          <Empty text={error} />
        ) : !items ? (
          <div className="grid flex-1 place-items-center">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : !shown.length ? (
          <Empty text={items.length ? "No requests match." : "No requests yet. Requests are logged from now on."} />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,420px)_1fr]">
            <ol className="min-h-0 overflow-y-auto border-r p-2">
              {shown.map((r) => {
                const st = stateOf(r)
                const on = picked && keyOf(picked) === keyOf(r)
                const took = r.job?.finished ? r.job.finished - r.at : undefined
                return (
                  <li key={keyOf(r)}>
                    <button
                      type="button"
                      onClick={() => setSel(keyOf(r))}
                      aria-current={on || undefined}
                      className={cn("flex w-full items-start gap-3 rounded-xl p-2.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring", on && "bg-muted")}
                    >
                      <Thumb r={r} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{modelName(r.path)}</span>
                          <Badge variant={STATE[st].variant} className="ml-auto shrink-0">
                            {STATE[st].label}
                          </Badge>
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{[r.job?.project, r.job?.variation, r.job?.purpose].filter(Boolean).join(" · ") || "No project"}</span>
                        <span className="flex gap-2 text-xs tabular-nums text-muted-foreground">
                          <span title={new Date(r.at).toLocaleString()}>{ago(r.at)}</span>
                          {took !== undefined && <span>· took {span(took)}</span>}
                          {st === "waiting" && <span>· {span(Date.now() - r.at)} so far</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {picked ? <Detail key={keyOf(picked)} r={picked} onChecked={load} /> : <div />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted-foreground">{text}</div>
}

/** the result if there is one, else the kind of job */
function Thumb({ r }: { r: HfRequest }) {
  const out = r.job?.file
  const video = kindOf(r) === "video"
  return (
    <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
      {out && !video ? (
        <img src={out} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : out && video ? (
        <video src={`${out}#t=0.5`} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" />
      ) : (
        <HugeiconsIcon icon={stateOf(r) === "failed" || stateOf(r) === "rejected" ? Alert02Icon : video ? Video01Icon : Image01Icon} className="size-4" />
      )}
    </span>
  )
}

/** the inputs as Higgsfield numbers them: [Image 1]… from image_urls, [Video 1]… from video_urls */
function inputsOf(p: Record<string, unknown>) {
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])
  const out: { tag: string; url: string; video: boolean }[] = []
  if (typeof p.video_url === "string") out.push({ tag: "The video", url: p.video_url, video: true })
  if (typeof p.image_url === "string") out.push({ tag: "First frame", url: p.image_url, video: false })
  if (typeof p.end_image_url === "string") out.push({ tag: "Last frame", url: p.end_image_url, video: false })
  list(p.image_urls).forEach((u, i) => out.push({ tag: `Image ${i + 1}`, url: u, video: /\.(mp4|webm|mov)(\?|$)/i.test(u) }))
  list(p.video_urls).forEach((u, i) => out.push({ tag: `Video ${i + 1}`, url: u, video: true }))
  return out
}
const SKIP = new Set(["prompt", "image_urls", "video_urls", "video_url", "image_url", "end_image_url"])

function Detail({ r, onChecked }: { r: HfRequest; onChecked: () => void }) {
  const p = payloadOf(r)
  const st = stateOf(r)
  // older jobs kept their inputs in one list, so they can't be numbered as Higgsfield did
  const inputs = r.earlier ? inputsOf(p).map((x, i) => ({ ...x, tag: `Input ${i + 1}` })) : inputsOf(p)
  const settings = Object.entries(p).filter(([k]) => !SKIP.has(k))
  const prompt = typeof p.prompt === "string" ? p.prompt : ""
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState("")
  const [copied, setCopied] = useState("")
  const copy = (what: string, text: string) => void navigator.clipboard.writeText(text).then(() => (setCopied(what), setTimeout(() => setCopied(""), 1200)))
  const check = async () => {
    if (!r.request_id) return
    setChecking(true)
    try {
      const s = await jobStatus(kindOf(r), r.request_id)
      setChecked(s.status ?? "unknown")
      onChecked()
    } catch (e) {
      setChecked(e instanceof Error ? e.message : "Couldn't check")
    } finally {
      setChecking(false)
    }
  }
  const out = r.job?.file ?? r.job?.source
  const error = r.error ?? r.job?.error
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <div className="flex flex-col gap-1 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={kindOf(r) === "video" ? Video01Icon : Image01Icon} className="size-4 text-muted-foreground" />
          <span className="text-base font-medium">{modelName(r.path)}</span>
          <Badge variant={STATE[st].variant}>{STATE[st].label}</Badge>
          {st === "waiting" && (
            <Button variant="outline" size="xs" onClick={check} disabled={checking} className="ml-auto gap-1">
              {checking ? <Spinner className="size-3" /> : <HugeiconsIcon icon={RefreshIcon} className="size-3" />}
              Check status
            </Button>
          )}
        </div>
        <code className="truncate font-mono text-xs text-muted-foreground">POST {r.path}</code>
        {checked && <span className="text-xs text-muted-foreground">Higgsfield says: {checked}</span>}
        {r.earlier && <span className="text-xs text-muted-foreground">Sent before the request log began: only the prompt, inputs and outcome were kept.</span>}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b px-5 py-4 text-sm sm:grid-cols-4">
        <Fact label="Sent" value={`${day(r.at)}, ${time(r.at)}`} />
        <Fact label={st === "done" ? "Finished" : st === "waiting" ? "Waiting" : "Ended"} value={r.job?.finished ? time(r.job.finished) : st === "waiting" ? span(Date.now() - r.at) : "–"} />
        <Fact label="Took" value={r.job?.finished ? span(r.job.finished - r.at) : "–"} />
        <Fact label="Accepted in" value={r.earlier ? "–" : `${span(r.ms)} · HTTP ${r.status}`} />
        <Fact label="Project" value={r.job?.project || "–"} />
        <Fact label="Variation" value={r.job?.variation || "–"} />
        <Fact label="For" value={r.job?.purpose || "–"} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Request id</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <code className="truncate font-mono text-xs">{r.request_id ?? "–"}</code>
            {r.request_id && (
              <Button variant="ghost" size="icon-xs" aria-label="Copy request id" onClick={() => copy("id", r.request_id!)}>
                <HugeiconsIcon icon={copied === "id" ? Tick02Icon : Copy01Icon} className="size-3" />
              </Button>
            )}
          </dd>
        </div>
      </dl>

      {error && (
        <Section title="Error">
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-destructive/5 p-3 font-mono text-xs text-destructive ring-1 ring-destructive/20">{pretty(error)}</pre>
        </Section>
      )}

      {prompt && (
        <Section title="Prompt" action={<CopyButton on={copied === "prompt"} onClick={() => copy("prompt", prompt)} />}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {prompt.split(/(\[(?:Image|Video) \d+\]|<<<\w+>>>)/g).map((part, i) =>
              /^\[(Image|Video) \d+\]$|^<<<\w+>>>$/.test(part) ? (
                <span key={i} className="rounded bg-brand/10 px-1 font-medium text-brand">
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </p>
        </Section>
      )}

      {inputs.length > 0 && (
        <Section title={`Inputs (${inputs.length})`}>
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
            {inputs.map((x) => (
              <li key={x.tag + x.url} className="flex min-w-0 flex-col gap-1">
                <a href={x.url} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {x.video ? <video src={`${x.url}#t=0.5`} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" /> : <img src={x.url} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />}
                  {x.video && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-xs text-white">
                      <HugeiconsIcon icon={Video01Icon} className="inline size-3" />
                    </span>
                  )}
                </a>
                <span className="text-xs font-medium">{x.tag}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {settings.length > 0 && (
        <Section title="Settings">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {settings.map(([k, v]) => (
              <Fact key={k} label={k.replace(/_/g, " ")} value={typeof v === "object" ? JSON.stringify(v) : String(v)} mono />
            ))}
          </dl>
        </Section>
      )}

      {out && (
        <Section title="Result">
          {kindOf(r) === "video" ? (
            <video src={out} controls muted playsInline className="max-h-80 w-full rounded-lg bg-muted object-contain ring-1 ring-foreground/10" />
          ) : (
            <a href={out} target="_blank" rel="noreferrer">
              <img src={out} alt="" className="max-h-80 rounded-lg object-contain ring-1 ring-foreground/10" />
            </a>
          )}
        </Section>
      )}

      <Section title="Sent (JSON)" action={<CopyButton on={copied === "json"} onClick={() => copy("json", JSON.stringify(r.payload, null, 2))} />}>
        <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed">{JSON.stringify(r.payload, null, 2)}</pre>
      </Section>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b px-5 py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </section>
  )
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs capitalize text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", mono && "font-mono text-xs")} title={value}>
        {value}
      </dd>
    </div>
  )
}

function CopyButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <Button variant="ghost" size="xs" onClick={onClick} className="gap-1 text-muted-foreground">
      <HugeiconsIcon icon={on ? Tick02Icon : Copy01Icon} className="size-3" />
      {on ? "Copied" : "Copy"}
    </Button>
  )
}

/** an error body, pretty when it's JSON */
function pretty(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}
