import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon, UserIcon } from "@hugeicons/core-free-icons"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DEFAULTS, FIELDS, TABS, useDevState, type DevState, type Field, type Tab } from "@/dev/state"
import { cn } from "@/lib/utils"
import { AiConnection } from "@/dev/ai-connection"

export function DevBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("h-4 rounded px-1 font-mono text-[10px] font-semibold tracking-wide", className)}>
      DEV
    </Badge>
  )
}

const changed = (state: DevState, f: Field) => state[f.key] !== DEFAULTS[f.key]

/** Dev-only popup: tabs in a side panel on the left, the selected tab's sections on the right. */
export function StateManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, update, reset, newUser } = useDevState()
  const [tab, setTab] = useState<Tab>("Credits")
  const fields = FIELDS.filter((f) => f.tab === tab)
  const groups = [...new Set(fields.map((f) => f.group))]
  const tabChanged = (t: Tab) => FIELDS.some((f) => f.tab === t && changed(state, f))
  const anyChanged = FIELDS.some((f) => changed(state, f))
  const resetTab = () => update(Object.fromEntries(fields.map((f) => [f.key, DEFAULTS[f.key]])) as Partial<DevState>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(600px,85vh)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* Side panel */}
        <aside className="flex w-48 shrink-0 flex-col border-r bg-muted/40 p-3">
          <DialogHeader className="gap-1 px-2 pb-4 pt-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              State manager <DevBadge />
            </DialogTitle>
            <DialogDescription className="text-xs">Dev only. Controls UI states.</DialogDescription>
          </DialogHeader>
          <nav role="tablist" aria-orientation="vertical" className="flex flex-col gap-0.5">
            {TABS.map((t) => (
              <Button
                key={t}
                role="tab"
                aria-selected={tab === t}
                variant="ghost"
                onClick={() => setTab(t)}
                className={cn(
                  "h-8 justify-between rounded-lg px-2 font-normal text-muted-foreground",
                  tab === t && "bg-background font-medium text-foreground shadow-sm hover:bg-background",
                )}
              >
                {t}
                {tabChanged(t) && <span aria-label="changed" className="size-1.5 rounded-full bg-primary" />}
              </Button>
            ))}
          </nav>
          <div className="mt-auto">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 text-muted-foreground" onClick={newUser}>
              <HugeiconsIcon icon={UserIcon} className="size-4" />
              New user
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 text-muted-foreground" onClick={reset} disabled={!anyChanged}>
              <HugeiconsIcon icon={RefreshIcon} className="size-4" />
              Reset all
            </Button>
          </div>
        </aside>

        {/* Content */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-5 pr-14">
            <h3 className="text-sm font-medium">{tab}</h3>
            <Button variant="outline" size="sm" onClick={resetTab} disabled={!tabChanged(tab)}>
              Reset {tab}
            </Button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {tab === "AI" && <AiConnection />}
            {groups.map((g) => (
              <section key={g} className="space-y-3 rounded-xl border p-4">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g}</h4>
                {fields
                  .filter((f) => f.group === g)
                  .map((f) => (
                    <FieldControl key={f.key} f={f} />
                  ))}
              </section>
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}

function FieldControl({ f }: { f: Field }) {
  const { state, update } = useDevState()
  const id = `dev-${f.key}`
  const label = (
    <Label htmlFor={id} className="gap-1.5 font-normal">
      {f.label}
      {changed(state, f) && <span title="Changed from default" className="size-1.5 rounded-full bg-primary" />}
    </Label>
  )

  if (f.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-4">
        {label}
        <Switch id={id} checked={state[f.key]} onCheckedChange={(v) => update({ [f.key]: v })} />
      </div>
    )
  }

  const v = state[f.key]
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        {label}
        <div className="relative w-28">
          {f.prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">{f.prefix}</span>}
          <Input
            id={id}
            type="number"
            value={v}
            min={f.min}
            max={f.max}
            onChange={(e) => update({ [f.key]: Math.max(f.min ?? -Infinity, Number(e.target.value) || 0) })}
            className={cn("h-8 text-right tabular-nums", f.prefix && "pl-6")}
          />
        </div>
      </div>
      {f.presets && (
        <div className="flex flex-wrap gap-1.5">
          {f.presets.map((p) => (
            <Button
              key={p.label}
              size="xs"
              variant="outline"
              aria-pressed={v === p.value}
              onClick={() => update({ [f.key]: p.value })}
              className={cn("rounded-full", v === p.value && "border-foreground bg-foreground/5")}
            >
              {p.label}
              <span className="text-muted-foreground tabular-nums">{p.value.toLocaleString()}</span>
            </Button>
          ))}
        </div>
      )}
      {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
    </div>
  )
}
