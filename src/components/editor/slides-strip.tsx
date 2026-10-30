import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowExpand01Icon, Delete02Icon, Loading03Icon, MoreHorizontalIcon, PlusSignIcon, SparklesIcon } from "@hugeicons/core-free-icons"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { GENERATED_VIDEOS } from "@/components/editor/elements"
import { cn } from "@/lib/utils"
import type { Reference } from "@/components/prompt-composer"

import type { VideoMedia } from "@/ai/design"

export type Slide = {
  id: string
  prompt?: string
  refs?: Reference[]
  video?: number
  startedAt?: number
  name?: string // shown to viewers; defaults to "Variation n"
  /** permanent number given when the variation is added; never reused or renumbered */
  n?: number
  thumb?: string // uploaded thumbnail for the strip on the canvas
  feeds?: Record<string, string> // this variation's value for each feed
  /** what the current video was generated from */
  used?: { prompt: string; refs: Reference[]; fromReference: boolean; media?: VideoMedia }
  /** a real video being made by the AI server (the video above is a stand-in until it's ready) */
  job?: { status: string; since: number; id?: string }
  /** the reference video: the startedAt of the version the user approved (variations are made only from an approved one) */
  approvedRef?: number
}
/** a slide's name when the user hasn't named it: numbers stay put when others are removed */
export const slideName = (s: Slide, index: number) =>
  s.name?.trim() || (s.id === "main" ? "Reference video" : `Variation ${s.n ?? index}`)

export type SlideStatus = "empty" | "generating" | "done"

export const MIN_VARIATIONS = 2
export const MAX_VARIATIONS = 5
const THUMB_H = 72
/** thumbnails never get narrower than this; tall sizes grow taller instead */
const THUMB_MIN_W = 48

/** Bottom strip, slides-style: the main video, a separator, then its variations. */
export function SlidesStrip({
  slides,
  active,
  ratio,
  status,
  locked,
  onSelect,
  onAdd,
  onRemove,
  start,
  onPreview,
  stale,
  onRename,
  includeRef,
  onIncludeRef,
  onSetStart,
}: {
  /** the reference video is shown to viewers as a variation */
  includeRef?: boolean
  onIncludeRef?: (on: boolean) => void
  /** make this the variation viewers see first */
  onSetStart?: (id: string) => void
  /** a variation's name was edited in place (empty = back to the default) */
  onRename?: (id: string, name: string) => void
  /** variations made from an older reference video */
  stale: (s: Slide) => boolean
  /** the variation viewers see first */
  start: string
  /** opens a generated video full screen */
  onPreview: (id: string) => void
  slides: Slide[]
  active: string
  ratio: number
  status: (s: Slide) => SlideStatus
  /** variations wait for the main video, which they use as reference */
  locked: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const [main, ...variations] = slides
  const w = Math.max(THUMB_MIN_W, Math.round(THUMB_H * ratio))
  const h = Math.max(THUMB_H, Math.round(w / ratio))
  const canRemove = variations.length > MIN_VARIATIONS

  return (
    <div data-tour="strip" data-keep-selection className="shrink-0 border-t bg-background">
      {/* centred; scrolls sideways once the slides don't fit */}
      <div className="overflow-x-auto">
      <div className="mx-auto flex w-max items-start gap-3 px-4 pb-2.5 pt-3 md:px-6">
        <Thumb
          slide={main}
          label={slideName(main, 0)}
          onRename={onRename && ((name) => onRename(main.id, name))}
          defaultLabel="Reference video"
          menu={{
            include: onIncludeRef && { on: !!includeRef, set: onIncludeRef },
            setStart: onSetStart && (includeRef ? () => onSetStart(main.id) : undefined),
            startHint: includeRef ? undefined : "Include it in the Flick to start here",
          }}
          start={start === main.id} onPreview={() => onPreview(main.id)} width={w} height={h} status={status(main)} active={active === main.id} onSelect={() => onSelect(main.id)} />

        <Separator orientation="vertical" className="mx-1 self-start" style={{ height: h }} />

        {variations.map((s, i) => (
          <Thumb
            key={s.id}
            slide={s}
            label={slideName(s, i + 1)}
            start={start === s.id}
            onPreview={() => onPreview(s.id)}
            stale={stale(s)}
            width={w} height={h}
            status={status(s)}
            active={active === s.id}
            disabled={locked}
            onSelect={() => onSelect(s.id)}
            onRemove={canRemove ? () => onRemove(s.id) : undefined}
            menu={{ setStart: onSetStart && (() => onSetStart(s.id)), removeHint: canRemove ? undefined : `Keep at least ${MIN_VARIATIONS} variations` }}
            onRename={onRename && ((name) => onRename(s.id, name))}
            defaultLabel={slideName({ ...s, name: undefined }, i + 1)}
          />
        ))}

        {variations.length < MAX_VARIATIONS && (
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Add variation"
                  disabled={locked}
                  onClick={onAdd}
                  className="rounded-lg border border-dashed border-foreground/20 p-0 text-muted-foreground hover:border-foreground/40"
                  style={{ width: w, height: h }}
                >
                  <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Add variation ({variations.length}/{MAX_VARIATIONS})
              </TooltipContent>
            </Tooltip>
            <span className="text-xs text-muted-foreground">Add</span>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

/** The name under a thumbnail; renames in place on click (Enter saves, Esc cancels). */
function Label({ label, active, onRename, placeholder }: { label: string; active: boolean; onRename?: (name: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const cls = cn("min-w-0 max-w-28 text-xs", active ? "font-medium text-foreground" : "text-muted-foreground")
  if (!onRename) return <span className={cn(cls, "truncate whitespace-nowrap")}>{label}</span>
  if (editing)
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => (onRename(draft.trim() === placeholder ? "" : draft.trim()), setEditing(false))}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") (setDraft(label), setEditing(false))
        }}
        aria-label="Video name"
        className="h-5 w-28 rounded-md bg-background px-1 text-center text-xs font-medium outline-none ring-2 ring-ring/50"
      />
    )
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => (setDraft(label), setEditing(true))}
          aria-label={`Rename ${label}`}
          className={cn(cls, "h-5 truncate whitespace-nowrap rounded-md px-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50")}
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent>Rename</TooltipContent>
    </Tooltip>
  )
}

function Thumb({
  slide,
  label,
  width,
  height,
  status,
  active,
  disabled,
  onSelect,
  onRemove,
  start,
  onPreview,
  stale,
  onRename,
  defaultLabel,
  menu,
}: {
  /** the card's menu (… button or right-click) */
  menu?: { include?: { on: boolean; set: (on: boolean) => void }; setStart?: () => void; startHint?: string; removeHint?: string }
  /** click the label to rename (variations only) */
  onRename?: (name: string) => void
  /** the name shown when none is typed, as the input's placeholder */
  defaultLabel?: string
  stale?: boolean
  start?: boolean
  onPreview: () => void
  slide: Slide
  label: string
  width: number
  height: number
  status: SlideStatus
  active: boolean
  disabled?: boolean
  onSelect: () => void
  onRemove?: () => void
}) {
  const video = slide.video !== undefined ? GENERATED_VIDEOS[slide.video] : undefined
  const [menuOpen, setMenuOpen] = useState(false)
  // the options button sits inside the top-right corner, shown on hover (or while the menu is open)
  const corner = { top: 4, right: `calc(50% - ${width / 2}px + 4px)` }
  // closed by clicking elsewhere: don't hand focus back to the … button (it would stay showing)
  const closedByPointer = useRef(false)
  return (
    <div
      data-tour={slide.id === "main" ? "reference" : undefined}
      className="group/slide relative flex min-w-16 shrink-0 flex-col items-center gap-1.5"
      onContextMenu={(e) => {
        if (!menu) return
        e.preventDefault()
        setMenuOpen(true)
      }}
    >
      <Button
        variant="ghost"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onSelect}
        onDoubleClick={() => status === "done" && onPreview()}
        className={cn(
          "relative overflow-hidden rounded-lg p-0 ring-1 ring-foreground/10 hover:ring-foreground/25",
          status === "empty" && "border border-dashed border-foreground/20 bg-muted/50 ring-0",
          active && "ring-2 ring-primary ring-offset-2 ring-offset-background hover:ring-primary",
        )}
        style={{ width, height }}
      >
        {status === "done" && video && <img src={video.poster} alt="" className={cn("absolute inset-0 size-full object-cover", stale && "opacity-40")} />}
        {status === "generating" && (
          <>
            <span aria-hidden className="generating-gradient absolute inset-[-50%]" />
            <HugeiconsIcon icon={Loading03Icon} className="relative size-4 animate-spin text-primary" />
          </>
        )}
        {status === "empty" && <HugeiconsIcon icon={SparklesIcon} className="size-4 text-muted-foreground" />}
      </Button>
      {/* name, with a red dot in front when it needs regenerating */}
      <div className="flex max-w-28 items-center justify-center gap-1">
        {stale && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span aria-label="Needs regenerating" className="size-1.5 shrink-0 rounded-full bg-red-500" />
            </TooltipTrigger>
            <TooltipContent>Needs regenerating: the reference video changed</TooltipContent>
          </Tooltip>
        )}
        <Label label={label} active={active} onRename={onRename} placeholder={defaultLabel} />
      </div>

      {/* top-right: the start toggle (always shown where the Flick starts) and options, on hover */}
      <div
        className="group/ctl absolute z-10 flex gap-1"
        style={corner}
      >
        {/* where the Flick starts: on for one video at a time */}
        {menu && (menu.setStart || menu.startHint || start) && (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* wrapper so the tooltip still shows while it can't be used */}
              <span className={cn("inline-flex transition-opacity", start || menuOpen ? "opacity-100" : "opacity-0 group-hover/slide:opacity-100 has-[:focus-visible]:opacity-100")}>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  aria-label={start ? "The Flick starts here" : "Start the Flick here"}
                  aria-pressed={!!start}
                  disabled={!start && !menu.setStart}
                  onClick={() => !start && menu.setStart?.()}
                  className={cn(
                    "size-5 rounded-md shadow-sm ring-1 ring-foreground/10",
                    // a soft highlight, not a primary button
                    start ? "cursor-default bg-[color-mix(in_oklch,var(--primary)_14%,var(--background))] text-primary ring-primary/30 hover:bg-[color-mix(in_oklch,var(--primary)_14%,var(--background))]" : "bg-background/90 backdrop-blur-sm hover:bg-background",
                  )}
                >
                  <SolidPlay className="size-2.5" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{start ? "The Flick starts here: viewers see this first" : menu.setStart ? "Start the Flick here" : menu.startHint}</TooltipContent>
          </Tooltip>
        )}
        {menu && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon-xs" aria-label={`${label} options`} className={cn(menuOpen ? "inline-flex" : "hidden group-hover/slide:inline-flex focus-visible:inline-flex", "size-5 rounded-md bg-background/90 shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm hover:bg-background")}>
                    <HugeiconsIcon icon={MoreHorizontalIcon} className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Options</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-56"
              onPointerDownOutside={() => (closedByPointer.current = true)}
              onCloseAutoFocus={(e) => {
                if (closedByPointer.current) e.preventDefault()
                closedByPointer.current = false
              }}
            >
              {status === "done" && (
                <>
                  <DropdownMenuItem onSelect={onPreview}>
                    <HugeiconsIcon icon={ArrowExpand01Icon} className="size-4" />
                    Full screen
                  </DropdownMenuItem>
                  {menu.include && <DropdownMenuSeparator />}
                </>
              )}
              {menu.include && (
                <DropdownMenuCheckboxItem checked={menu.include.on} onCheckedChange={(on) => menu.include!.set(!!on)}>
                  Include in Flick
                </DropdownMenuCheckboxItem>
              )}
              {(onRemove || menu.removeHint) && (
                <>
                  {(status === "done" || menu.include) && <DropdownMenuSeparator />}
                  <DropdownMenuItem variant="destructive" disabled={!onRemove} onSelect={() => onRemove?.()}>
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    <span className="flex flex-col">
                      Delete
                      {!onRemove && menu.removeHint && <span className="text-xs text-muted-foreground">{menu.removeHint}</span>}
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

/** a filled play triangle: marks where the Flick starts */
function SolidPlay({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M7 4.9v14.2a1.2 1.2 0 0 0 1.83 1.02l11.4-7.1a1.2 1.2 0 0 0 0-2.04L8.83 3.88A1.2 1.2 0 0 0 7 4.9Z" fill="currentColor" />
    </svg>
  )
}
