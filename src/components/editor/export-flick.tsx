import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Issues, ago, type Issue } from "@/components/flick-sections"

/**
 * Export Flick: name it (prefilled from the project), check it, export. The new Flick's page opens
 * right away and it prepares there (and in Flicks) in the background.
 */
export function ExportControl({
  title,
  issues,
  poster,
  count,
  size,
  last,
  busy,
  onExport,
}: {
  title: string
  issues: Issue[]
  /** the starting variation's frame */
  poster?: string
  /** variations viewers can switch between */
  count: number
  size: string
  /** the most recent export from this project */
  last?: { name: string; at: number }
  /** an export from this project is still running */
  busy?: boolean
  onExport: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(title)
  const blocked = issues.some((x) => x.blocking)
  const start = () => {
    if (blocked || !name.trim()) return
    setOpen(false)
    onExport(name.trim())
  }

  return (
    <>
      <Tooltip open={busy ? undefined : false}>
        <TooltipTrigger asChild>
          <Button size="lg" data-tour="export" className="h-9 gap-2 px-5" onClick={() => (setName(title), setOpen(true))}>
            {busy && <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />}
            Export
          </Button>
        </TooltipTrigger>
        <TooltipContent>A Flick from this project is still preparing. You can export again.</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-keep-selection>
          <DialogHeader>
            <DialogTitle>Export Flick</DialogTitle>
            <DialogDescription>Makes a Flick from this project, ready to share, embed in websites or serve in ads.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-2.5">
            <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">{poster && <img src={poster} alt="" className="size-full object-cover" />}</span>
            <span className="text-sm">
              <span className="block font-medium">
                {count} variation{count === 1 ? "" : "s"}
              </span>
              <span className="block text-xs tabular-nums text-muted-foreground">{size}</span>
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="export-name">Flick name</Label>
            <Input id="export-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && start()} maxLength={80} className="h-11" />
            {last && <p className="text-xs text-muted-foreground">Last exported {ago(last.at)} as “{last.name}”.</p>}
          </div>

          {issues.length > 0 && <Issues issues={issues} />}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={blocked || !name.trim()} onClick={start}>
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
