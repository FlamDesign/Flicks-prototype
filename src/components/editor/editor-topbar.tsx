import { useEffect, useRef, useState } from "react"
import { InputGroupInput } from "@/components/ui/input-group"
import { HugeiconsIcon } from "@hugeicons/react"
import { PauseIcon, PlayIcon, ArrowDown01Icon, Clock01Icon, Copy01Icon, Delete02Icon, Home01Icon, PencilEdit01Icon, PencilEdit02Icon, ViewIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Kbd } from "@/components/ui/kbd"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const MAX_SHOWN = 16

/** Left side of the editor top bar: back, the project's name (click to rename) with its file menu, and the size. */
export function FileTitle({
  title,
  setTitle,
  size,
  sizeLabel,
  duration,
  onHome,
  onDuplicate,
  onHistory,
  onDelete,
}: {
  title: string
  /** the name is still being generated from the prompt */
  setTitle: (t: string) => void
  size: string
  sizeLabel?: string
  /** video length in seconds */
  duration?: number
  onHome: () => void
  onDuplicate: () => void
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
    setTitle(draft.trim() || "Untitled project")
    setEditing(false)
  }
  // a new project has no name until the chat gives it one
  const named = title || "Untitled project"
  const shown = named.length > MAX_SHOWN ? `${named.slice(0, MAX_SHOWN).trimEnd()}…` : named

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={onHome}>
            <HugeiconsIcon icon={Home01Icon} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back</TooltipContent>
      </Tooltip>
      <span aria-hidden className="text-muted-foreground/50">
        /
      </span>

      {editing ? (
        <InputGroupInput
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") (setDraft(title), setEditing(false))
          }}
          aria-label="Project name"
          className="field-sizing-content h-8 w-auto min-w-24 max-w-72 flex-none rounded-lg bg-transparent px-2 text-sm font-medium ring-2 ring-ring/50 focus-visible:ring-2"
        />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (setDraft(title), setEditing(true))}
              aria-label={`Rename ${named}`}
              className="h-8 max-w-72 rounded-lg px-2 font-medium"
            >
              <span className="truncate">{shown}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{named}</TooltipContent>
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

/** Design / Preview switch: the preset Tabs, each with its tooltip and the P shortcut. */
export function ModeSwitch({ mode, onChange }: { mode: "design" | "preview"; onChange: (m: "design" | "preview") => void }) {
  const items = [
    { m: "design", label: "Design", icon: PencilEdit02Icon, hint: "Edit the canvas" },
    { m: "preview", label: "Preview", icon: ViewIcon, hint: "See it as viewers do" },
  ] as const
  return (
    <Tabs value={mode} onValueChange={(v) => onChange(v as "design" | "preview")}>
      <TabsList aria-label="Mode">
        {items.map(({ m, label, icon, hint }) => (
          <Tooltip key={m}>
            <TooltipTrigger asChild>
              <TabsTrigger value={m} aria-label={label} className="px-3">
                <HugeiconsIcon icon={icon} className="size-4" />
                {label}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">{hint}<Kbd>P</Kbd></TooltipContent>
          </Tooltip>
        ))}
      </TabsList>
    </Tabs>
  )
}

/** Play/pause for the canvas video (it autoplays on loop). */
export function VideoToggle({ playing, disabled, onToggle }: { playing: boolean; disabled?: boolean; onToggle: () => void }) {
  const label = playing ? "Pause video" : "Play video"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onToggle} className="size-9 bg-muted hover:bg-muted/50">
          <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
