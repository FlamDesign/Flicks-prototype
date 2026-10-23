import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PauseIcon, PlayIcon, SparklesIcon, ArrowDown01Icon, Clock01Icon, Copy01Icon, Delete02Icon, Home01Icon, LayoutTopIcon, PencilEdit01Icon, PencilEdit02Icon, ViewIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const MAX_SHOWN = 16

/** Left side of the editor top bar: back, the project's name (click to rename) with its file menu, and the size. */
export function FileTitle({
  title,
  naming,
  setTitle,
  size,
  sizeLabel,
  duration,
  onHome,
  onDuplicate,
  onSaveTemplate,
  onHistory,
  onDelete,
}: {
  title: string
  /** the name is still being generated from the prompt */
  naming?: boolean
  setTitle: (t: string) => void
  size: string
  sizeLabel?: string
  /** video length in seconds */
  duration?: number
  onHome: () => void
  onDuplicate: () => void
  onSaveTemplate: () => void
  onHistory: () => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!editing) return
    input.current?.focus()
    input.current?.select()
  }, [editing])
  const save = () => {
    setTitle(draft.trim() || "Untitled Flick")
    setEditing(false)
  }
  const shown = title.length > MAX_SHOWN ? `${title.slice(0, MAX_SHOWN).trimEnd()}…` : title

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Home" onClick={onHome}>
            <HugeiconsIcon icon={Home01Icon} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Home</TooltipContent>
      </Tooltip>
      <span aria-hidden className="text-muted-foreground/50">
        /
      </span>

      {naming && !editing ? (
        <span className="flex h-8 items-center gap-1.5 px-2 text-sm text-muted-foreground" aria-live="polite">
          <HugeiconsIcon icon={SparklesIcon} className="size-3.5 animate-pulse text-primary" />
          <span className="animate-pulse">Naming…</span>
        </span>
      ) : editing ? (
        <input
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") (setDraft(title), setEditing(false))
          }}
          aria-label="Project name"
          className="h-8 w-72 min-w-0 rounded-lg bg-transparent px-2 text-sm font-medium outline-none ring-2 ring-ring/50"
        />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (setDraft(title), setEditing(true))}
              aria-label={`Rename ${title}`}
              className="h-8 max-w-72 rounded-lg px-2 font-medium"
            >
              <span className="truncate">{shown}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{title}</TooltipContent>
        </Tooltip>
      )}

      {/* file menu */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="File options" className="size-7 text-muted-foreground">
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>File options</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onSelect={() => (setDraft(title), setEditing(true))}>
            <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>
            <HugeiconsIcon icon={Copy01Icon} className="size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSaveTemplate}>
            <HugeiconsIcon icon={LayoutTopIcon} className="size-4" />
            Save as template
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onHistory}>
            <HugeiconsIcon icon={Clock01Icon} className="size-4" />
            Version history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" tabIndex={0} className="ml-1 h-6 shrink-0 px-2 font-normal tabular-nums">
            {size}
            {duration ? ` · ${duration}s` : ""}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {size} px{sizeLabel && ` · ${sizeLabel}`}
          {duration ? ` · ${duration} seconds` : ""}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

/** Design / Preview switch with a sliding highlight. */
export function ModeSwitch({ mode, onChange }: { mode: "design" | "preview"; onChange: (m: "design" | "preview") => void }) {
  const items = [
    { m: "design", label: "Design", icon: PencilEdit02Icon, hint: "Edit the canvas" },
    { m: "preview", label: "Preview", icon: ViewIcon, hint: "See it as viewers do" },
  ] as const
  return (
    <div role="radiogroup" aria-label="Mode" className="relative flex rounded-xl bg-muted p-0.5">
      {/* sliding highlight */}
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-lg bg-background shadow-sm ring-1 ring-foreground/5 transition-transform duration-200 ease-out"
        style={{ transform: mode === "preview" ? "translateX(100%)" : undefined }}
      />
      {items.map(({ m, label, icon, hint }) => (
        <Tooltip key={m}>
          <TooltipTrigger asChild>
            <Button
              role="radio"
              aria-checked={mode === m}
              aria-label={label}
              variant="ghost"
              size="sm"
              onClick={() => onChange(m)}
              className={cn(
                "relative h-8 gap-1.5 rounded-lg px-3 text-muted-foreground hover:bg-transparent",
                mode === m && "text-foreground hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={icon} className="size-4" />
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

/** Play/pause for the canvas video (it autoplays on loop). */
export function VideoToggle({ playing, disabled, onToggle }: { playing: boolean; disabled?: boolean; onToggle: () => void }) {
  const label = playing ? "Pause video" : "Play video"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onToggle} className="size-9 rounded-xl bg-muted hover:bg-muted/70">
          <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
