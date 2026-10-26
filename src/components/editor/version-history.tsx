import { useState } from "react"
import { Loading, RowsSkeleton } from "@/components/page-skeletons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Empty, when } from "@/components/flick-sections"
import type { Checkpoint } from "@/library"

/**
 * Version history (file menu): the project's saved checkpoints, newest first. Autosaved as you work;
 * exports are marked and link to the Flick they made. Restoring brings the canvas back; it saves as a new checkpoint.
 */
export function VersionHistoryPanel<S>({
  versions,
  current,
  onRestore,
  onRename,
  onOpenFlick,
  onClose,
}: {
  versions: Checkpoint<S>[]
  /** the checkpoint matching the canvas right now */
  current?: number
  onRestore: (n: number) => void
  onRename: (n: number, name: string) => void
  onOpenFlick: (id: string) => void
  onClose: () => void
}) {
  return (
    <aside
      aria-label="Version history"
      data-keep-selection
      className="animate-in slide-in-from-right-4 fade-in-0 fixed bottom-0 right-0 top-14 z-30 flex w-[400px] max-w-full flex-col border-l bg-background shadow-xl duration-200"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b pl-4 pr-2">
        <h2 className="text-sm font-medium">Version history</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="ml-auto" onClick={onClose}>
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close</TooltipContent>
        </Tooltip>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-3 px-1 text-xs text-muted-foreground">Saved as you work. Exports are marked.</p>
<Loading skeleton={<RowsSkeleton rows={6} thumb={false} />}>
        {versions.length ? (
          <ul className="flex flex-col gap-1.5">
            {[...versions].reverse().map((v) => (
              <Row key={v.n} v={v} current={v.n === current} onRestore={() => onRestore(v.n)} onRename={(name) => onRename(v.n, name)} onOpenFlick={onOpenFlick} />
            ))}
          </ul>
        ) : (
          <Empty text="Versions show here as you work." />
        )}
        </Loading>
      </div>
    </aside>
  )
}

function Row<S>({ v, current, onRestore, onRename, onOpenFlick }: { v: Checkpoint<S>; current: boolean; onRestore: () => void; onRename: (name: string) => void; onOpenFlick: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(v.name ?? "")
  const name = v.name || `Version ${v.n}`
  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-xs font-medium tabular-nums">v{v.n}</span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => (onRename(draft.trim()), setEditing(false))}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") (setDraft(v.name ?? ""), setEditing(false))
            }}
            placeholder={`Version ${v.n}`}
            aria-label={`Name for version ${v.n}`}
            className="h-6 w-full rounded-md bg-background px-1.5 text-sm font-medium outline-none ring-2 ring-ring/50"
          />
        ) : (
          <Button
            variant="ghost"
            onClick={() => (setDraft(v.name ?? ""), setEditing(true))}
            aria-label={`Rename ${name}`}
            className="-ml-1.5 h-6 max-w-full justify-start gap-1.5 rounded-md px-1.5 text-sm font-medium hover:bg-background"
          >
            <span className="truncate">{name}</span>
            {v.exported && <Badge className="h-5 shrink-0 px-1.5 text-[11px] font-normal">Exported</Badge>}
            {current && <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[11px] font-normal">Current</Badge>}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">{when(v.at)}</p>
        {v.exported && (
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">As “{v.exported.name}”</span>
            <span aria-hidden>·</span>
            <button type="button" onClick={() => onOpenFlick(v.exported!.flickId)} className="inline-flex shrink-0 items-center gap-0.5 rounded text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              View Flick
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3" />
            </button>
          </p>
        )}
      </div>
      {!current && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onRestore}>
              Restore
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bring the canvas back to this version</TooltipContent>
        </Tooltip>
      )}
    </li>
  )
}
