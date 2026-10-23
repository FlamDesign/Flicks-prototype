import { useLayoutEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PaintBoardIcon,
  ImageAdd01Icon,
  DragDropVerticalIcon,
  PencilEdit02Icon,
  AtIcon,
  Link04Icon,
  CarouselHorizontalIcon,
  CarouselVerticalIcon,
  Move01Icon,
  DistributeHorizontalCenterIcon,
  DistributeVerticalCenterIcon,
  TextFontIcon,
  Exchange01Icon,
  Copy01Icon,
  Delete02Icon,
  MinusSignIcon,
  PlusSignIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  SquareRoundCornerIcon,
  Link01Icon,
  Unlink01Icon,
  FitToScreenIcon,
  MaximizeScreenIcon,
  Image01Icon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ensureFont } from "@/lib/fonts"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BUTTON_SIZE,
  BUTTON_STYLES,
  FONTS,
  FONT_GROUPS,
  SWATCHES,
  TEXT_STYLES,
  defaultBorder,
  fitStrip,
  defaultFill,
  defaultRadius,
  defaultInk,
  type Align,
  type CanvasElement,
  type Feed,
  type Upload,
} from "@/components/editor/elements"
import { freeOffsets, isBold } from "@/components/editor/canvas-stage"
import { ColorPanel, CHECKER, swatchBg, useColorPopover } from "@/components/editor/color-picker"
import { BUTTON_LABEL, FEED_SUGGESTIONS } from "@/components/editor/feed-suggestions"
import { NewFeed } from "@/components/editor/variation-panel"
import { cn } from "@/lib/utils"

type TextLike = Extract<CanvasElement, { kind: "text" | "button" }>
type ImageEl = Extract<CanvasElement, { kind: "image" }>

/** Contextual toolbar for the selected element, shown above the canvas. */
export function ElementToolbar({
  el,
  uploads,
  onChange,
  onDuplicate,
  onDelete,
  onPickImage,
  strip,
  feeds = [],
  onAddFeed,
  onEditFeed,
  onLinkFeed,
  feedValue,
  openLink,
  onEditText,
  grip,
  thumb,
}: {
  /** thumbnail strip: the thumbnail picked inside it */
  thumb?: { name: string; src?: string; onChoose: () => void; onRemove: () => void }
  /** starts editing the selected text or button label on the canvas */
  onEditText?: () => void
  el: CanvasElement
  uploads: Upload[]
  onChange: (patch: Partial<CanvasElement>) => void
  onDuplicate: () => void
  /** Opens the uploads panel to replace an image or pick a button background. */
  onPickImage: () => void
  onDelete: () => void
  /** number of videos and frame shape, for thumbnail strips */
  strip?: { count: number; ratio: number }
  feeds?: Feed[]
  /** creates a feed and returns its id */
  onAddFeed?: (f: Omit<Feed, "id">) => string
  /** shows the feed's value field in the right panel */
  onEditFeed?: (id: string) => void
  /** fills empty values of a newly linked feed */
  onLinkFeed?: (id: string, text: string) => void
  /** a feed's value on this video */
  feedValue?: (id: string) => string | undefined
  /** open the button link options straight away (a button was just added) */
  openLink?: boolean
  /** grip to drag the toolbar somewhere else */
  grip?: React.ReactNode
}) {
  return (
    <div
      role="toolbar"
      aria-label="Element options"
      className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {grip}
      {el.kind === "button" && el.variant === "icon" ? (
        // icon buttons: just the image and where it goes
        <>
          <Tool label="Replace icon image" onClick={onPickImage}>
            <HugeiconsIcon icon={Image01Icon} className="size-4" />
          </Tool>
          <LinkPopover el={el} feeds={feeds} onChange={onChange} onAddFeed={onAddFeed} onEdit={onEditFeed} onLinkFeed={onLinkFeed} autoOpen={openLink} feedValue={feedValue} />
        </>
      ) : el.kind === "image" ? (
        <ImageControls el={el} onChange={onChange} onReplace={onPickImage} />
      ) : el.kind === "strip" ? (
        <>
          {thumb && (
            // one thumbnail picked: its image
            <>
              <IconTip label={thumb.src ? `Change ${thumb.name} thumbnail` : `Add ${thumb.name} thumbnail`}>
                <Button variant="ghost" size="sm" onClick={thumb.onChoose} className="h-8 gap-2 rounded-lg pl-1 pr-2.5 font-normal">
                  <span className="grid size-6 place-items-center overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10">
                    {thumb.src ? <img src={thumb.src} alt="" className="size-full object-cover" /> : <HugeiconsIcon icon={ImageAdd01Icon} className="size-3.5 text-muted-foreground" />}
                  </span>
                  <span className="max-w-32 truncate">{thumb.src ? "Change thumbnail" : "Add thumbnail"}</span>
                </Button>
              </IconTip>
              {thumb.src && (
                <Tool label="Remove thumbnail" onClick={thumb.onRemove}>
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </Tool>
              )}
              <Divider />
            </>
          )}
          <StripControls el={el} onChange={onChange} count={strip?.count ?? 1} ratio={strip?.ratio ?? 1} />
        </>
      ) : (
        <>
          <FeedPicker el={el} feeds={feeds} onChange={onChange} onAddFeed={onAddFeed} onLinkFeed={onLinkFeed} feedValue={feedValue} onEditText={onEditText} />
          {/* buttons: where it goes, right next to its label feed */}
          {el.kind === "button" && <LinkPopover el={el} feeds={feeds} onChange={onChange} onAddFeed={onAddFeed} onEdit={onEditFeed} onLinkFeed={onLinkFeed} autoOpen={openLink} feedValue={feedValue} />}
          <Divider />
          <FontControls el={el} onChange={onChange} />
        </>
      )}
      {el.kind === "button" && el.variant !== "icon" && (
        <>
          <Divider />
          <ButtonControls el={el} onChange={onChange} onChooseImage={onPickImage} />
        </>
      )}
      {/* the thumbnail strip is part of every video, so it can't be duplicated or deleted */}
      {el.kind !== "strip" && (
        <>
          <Divider />
          <Tool label="Duplicate" onClick={onDuplicate}>
            <HugeiconsIcon icon={Copy01Icon} className="size-4" />
          </Tool>
          <Tool label="Delete" onClick={onDelete}>
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          </Tool>
        </>
      )}
    </div>
  )
}

/** Handle at the start of a toolbar: drag to move it, double-click to put it back. */
export function ToolbarGrip({ onDragStart, onReset }: { onDragStart: (e: React.PointerEvent) => void; onReset: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={-1}
          aria-label="Move toolbar"
          onPointerDown={onDragStart}
          onDoubleClick={onReset}
          className="grid h-8 w-4 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>Drag to move · double-click to reset</TooltipContent>
    </Tooltip>
  )
}

/**
 * Changing alignment moves the element's anchor (x is its left, centre or right point).
 * Work out the new x so the box itself doesn't move, and pin its width so the text
 * aligns inside the same box instead of the box sliding around.
 */
function keepPlace(el: TextLike, next: Align): { x: number; w?: number } {
  const node = document.querySelector<HTMLElement>(`[data-el="${el.id}"]`)
  const stage = node?.parentElement
  if (!node || !stage) return { x: el.x }
  const r = node.getBoundingClientRect()
  const s = stage.getBoundingClientRect()
  const left = ((r.left - s.left) / s.width) * 100
  const width = (r.width / s.width) * 100
  const x = next === "left" ? left : next === "center" ? left + width / 2 : left + width
  return el.kind === "text" ? { x, w: el.w ?? width } : { x }
}

/** Bold, italic and underline behind one button; the options open on hover (or click). */
function EmphasisMenu({ el, onChange }: { el: TextLike; onChange: (p: Partial<CanvasElement>) => void }) {
  const [open, setOpen] = useState(false)
  const closeT = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = () => (clearTimeout(closeT.current), setOpen(true))
  const hide = () => (clearTimeout(closeT.current), (closeT.current = setTimeout(() => setOpen(false), 150)))
  const opts = [
    { key: "bold", label: "Bold", icon: TextBoldIcon, on: isBold(el), patch: { bold: !isBold(el) } },
    { key: "italic", label: "Italic", icon: TextItalicIcon, on: !!el.italic, patch: { italic: !el.italic } },
    { key: "underline", label: "Underline", icon: TextUnderlineIcon, on: !!el.underline, patch: { underline: !el.underline } },
  ]
  const active = opts.filter((o) => o.on)
  // the button shows what's on (bold first), or B when nothing is
  const face = active[0]?.icon ?? TextBoldIcon
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Bold, italic, underline${active.length ? `: ${active.map((o) => o.label.toLowerCase()).join(", ")}` : ""}`}
          aria-pressed={active.length > 0}
          onMouseEnter={show}
          onMouseLeave={hide}
          className={cn("size-8 shrink-0 rounded-lg", active.length > 0 && "bg-muted text-foreground")}
        >
          <HugeiconsIcon icon={face} className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="w-auto flex-row gap-0.5 rounded-xl p-1"
      >
        {opts.map((o) => (
          <Tool key={o.key} label={o.label} pressed={o.on} onClick={() => onChange(o.patch as Partial<CanvasElement>)}>
            <HugeiconsIcon icon={o.icon} className="size-4" />
          </Tool>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/* ---------- font picker: search + grouped list, each font previewed in itself ---------- */

export function FontPicker({ font, onPick }: { font: string; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const list = useRef<HTMLDivElement>(null)
  const query = q.trim().toLowerCase()
  const groups = FONT_GROUPS.map((g) => ({
    group: g.group,
    fonts: query ? g.fonts.filter((f) => f.name.toLowerCase().includes(query) || g.group.toLowerCase().includes(query)) : g.fonts,
  })).filter((g) => g.fonts.length)

  // load a font's preview only when its row scrolls into view
  useLayoutEffect(() => {
    const root = list.current
    if (!open || !root) return
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && ensureFont((e.target as HTMLElement).dataset.font)),
      { root, rootMargin: "120px 0px" },
    )
    root.querySelectorAll<HTMLElement>("[data-font]").forEach((el) => io.observe(el))
    // start with the current font in view
    root.querySelector<HTMLElement>(`[data-font="${CSS.escape(font)}"]`)?.scrollIntoView({ block: "center" })
    return () => io.disconnect()
  }, [open, query, font])

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ("") }}>
      <IconTip label={`Font: ${font}`}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Font: ${font}`} className="size-8 rounded-lg">
            <HugeiconsIcon icon={TextFontIcon} className="size-4" />
          </Button>
        </PopoverTrigger>
      </IconTip>
      <PopoverContent align="start" className="w-64 gap-0 p-0">
        <div className="relative border-b p-2">
          <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts" aria-label="Search fonts" className="h-8 pl-8" />
        </div>
        <div ref={list} role="listbox" aria-label="Fonts" className="max-h-80 overflow-y-auto p-1">
          {groups.map((g) => (
            <div key={g.group} role="group" aria-label={g.group}>
              <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">{g.group}</p>
              {g.fonts.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  role="option"
                  aria-selected={f.name === font}
                  data-font={f.name}
                  onClick={() => { ensureFont(f.name); onPick(f.name); setOpen(false) }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[15px] outline-none hover:bg-accent focus-visible:bg-accent"
                  style={{ fontFamily: f.stack }}
                >
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  {f.name === font && <HugeiconsIcon icon={Tick02Icon} className="size-4 shrink-0" />}
                </button>
              ))}
            </div>
          ))}
          {!groups.length && <p className="px-2 py-6 text-center text-sm text-muted-foreground">No fonts match "{q.trim()}"</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ---------- text + button font options ---------- */

const STYLE_KEYS = ["font", "size", "color", "bold", "italic", "underline", "bg", "radius", "border", "borderWidth", "bgImage", "bgFit", "w", "h"] as const
/** Picking a style starts it fresh. */
const RESET = Object.fromEntries(STYLE_KEYS.map((k) => [k, undefined]))

const ALIGN_NEXT: Record<Align, Align> = { left: "center", center: "right", right: "left" }
const ALIGN_ICON = { left: TextAlignLeftIcon, center: TextAlignCenterIcon, right: TextAlignRightIcon }

function FontControls({ el, onChange }: { el: TextLike; onChange: (p: Partial<CanvasElement>) => void }) {
  const styles = el.kind === "text" ? TEXT_STYLES : BUTTON_STYLES
  const current = styles.find((s) => s.variant === el.variant)!
  const size = el.size ?? (el.kind === "text" ? TEXT_STYLES.find((t) => t.variant === el.variant)!.size : BUTTON_SIZE)
  const px = Math.round(size * 10.8) // shown as px at 1080 wide
  const setPx = (v: number) => onChange({ size: Math.min(30, Math.max(1, v / 10.8)) } as Partial<CanvasElement>)
  const align = el.align ?? "center"
  const font = el.font ?? FONTS[0].name
  // any change on top of the chosen style makes it "Custom"
  const custom = STYLE_KEYS.some((k) => (el as Record<string, unknown>)[k] !== undefined)

  return (
    <>
      {/* Style */}
      <DropdownMenu>
        <IconTip label={`Style: ${custom ? "Custom" : current.name}`}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Style: ${custom ? "Custom" : current.name}`} className="size-8 rounded-lg">
              <HugeiconsIcon icon={PaintBoardIcon} className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </IconTip>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuRadioGroup value={custom ? "" : el.variant} onValueChange={(v) => onChange({ variant: v, ...RESET } as Partial<CanvasElement>)}>
            {styles.map((o) => (
              <DropdownMenuRadioItem key={o.variant} value={o.variant}>
                {o.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <FontPicker font={font} onPick={(v) => onChange({ font: v } as Partial<CanvasElement>)} />

      {/* Size */}
      <div className="flex items-center rounded-lg ring-1 ring-foreground/10">
        <Tool label="Decrease size" className="size-7" onClick={() => setPx(px - 2)}>
          <HugeiconsIcon icon={MinusSignIcon} className="size-3.5" />
        </Tool>
        <input
          aria-label="Font size"
          inputMode="numeric"
          value={px}
          onChange={(e) => {
            const v = Number(e.target.value.replace(/\D/g, ""))
            if (v) setPx(v)
          }}
          className="w-9 bg-transparent text-center text-sm tabular-nums outline-none"
        />
        <Tool label="Increase size" className="size-7" onClick={() => setPx(px + 2)}>
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
        </Tool>
      </div>

      {/* Colour */}
      <ColorPicker label="Text colour" value={el.color ?? defaultInk(el)} onChange={(color) => onChange({ color } as Partial<CanvasElement>)}>
        <span className="flex flex-col items-center leading-none">
          <span className="text-sm font-semibold">A</span>
          <span className="mt-0.5 h-1 w-4 rounded-full ring-1 ring-foreground/20" style={{ background: swatchBg(el.color ?? defaultInk(el)) }} />
        </span>
      </ColorPicker>

      <Divider />

      {/* Align (text only): one icon that cycles */}
      {el.kind === "text" && (
        <Tool label={`Align ${align}`} onClick={() => onChange({ align: ALIGN_NEXT[align], ...keepPlace(el, ALIGN_NEXT[align]) } as Partial<CanvasElement>)}>
          <HugeiconsIcon icon={ALIGN_ICON[align]} className="size-4" />
        </Tool>
      )}
      <EmphasisMenu el={el} onChange={onChange} />
    </>
  )
}

/* ---------- button: fill, radius, background image ---------- */

function ButtonControls({
  el,
  onChange,
  onChooseImage,
}: {
  el: Extract<CanvasElement, { kind: "button" }>
  onChange: (p: Partial<CanvasElement>) => void
  onChooseImage: () => void
}) {
  // the fill stays under a background image (visible around a "Fit" image or through transparent parts)
  const fill = el.bg ?? defaultFill(el)
  const fit = el.bgFit ?? "cover"
  return (
    <>
      <ColorPicker label="Button colour" allowTransparent value={fill} onChange={(bg) => onChange({ bg } as Partial<CanvasElement>)}>
        <span className="size-4 rounded-[5px] ring-1 ring-foreground/20" style={{ background: swatchBg(fill) }} />
      </ColorPicker>

      <BorderPopover el={el} onChange={onChange} />
      <RadiusPopover id={el.id} value={el.radius ?? defaultRadius(el)} onChange={(radius) => onChange({ radius } as Partial<CanvasElement>)} />

      {el.bgImage ? (
        <Popover>
          <IconTip label="Background image">
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Background image" className="size-8 rounded-lg p-1">
                <img src={el.bgImage} alt="" className="size-full rounded-[5px] object-cover ring-1 ring-foreground/20" />
              </Button>
            </PopoverTrigger>
          </IconTip>
          <PopoverContent align="center" className="w-60 gap-3 p-3">
            <p className="text-xs font-medium text-muted-foreground">Background image</p>
            <img src={el.bgImage} alt="" className="aspect-video w-full rounded-lg object-cover ring-1 ring-foreground/10" />
            <div className="flex rounded-lg bg-muted p-0.5">
              {(
                [
                  ["cover", "Fill"],
                  ["contain", "Fit"],
                ] as const
              ).map(([f, name]) => (
                <Button
                  key={f}
                  size="xs"
                  variant="ghost"
                  aria-pressed={fit === f}
                  onClick={() => onChange({ bgFit: f } as Partial<CanvasElement>)}
                  className={cn("flex-1 rounded-md", fit === f && "bg-background shadow-sm hover:bg-background")}
                >
                  {name}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={onChooseImage}>
                Replace
              </Button>
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => onChange({ bgImage: undefined, bgFit: undefined } as Partial<CanvasElement>)}>
                Remove
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Tool label="Add background image" onClick={onChooseImage}>
          <HugeiconsIcon icon={Image01Icon} className="size-4" />
        </Tool>
      )}
    </>
  )
}

/* ---------- feeds ---------- */


/**
 * Pick a feed for an element: the linked one (with Unlink), the others to switch to,
 * a new one, and suggested names while there are fewer than two.
 */
function FeedChooser({
  type,
  feeds,
  value,
  onPick,
  onUnlink,
  onAddFeed,
  onEditValue,
  editHint,
  forButton,
}: {
  /** choosing for a button's label: its own suggestion comes first */
  forButton?: boolean
  /** jump to where this variation's value is edited; also runs right after a feed is created */
  onEditValue?: (id: string) => void
  editHint?: string
  type: Feed["type"]
  feeds: Feed[]
  value?: string
  onPick: (id: string) => void
  onUnlink: () => void
  onAddFeed?: (f: Omit<Feed, "id">) => string
}) {
  const list = feeds.filter((f) => f.type === type)
  const linked = list.find((f) => f.id === value)
  const others = list.filter((f) => f.id !== value)
  const [creating, setCreating] = useState(false)
  const pool = forButton && type === "text" ? [BUTTON_LABEL, ...FEED_SUGGESTIONS.text] : FEED_SUGGESTIONS[type]
  const suggestions = onAddFeed && list.length < 2 ? pool.filter((x) => !feeds.some((f) => f.name === x.name)).slice(0, 3) : []
  const create = (f: Omit<Feed, "id">) => {
    if (!onAddFeed) return
    const id = onAddFeed(f)
    onPick(id)
    setCreating(false)
    onEditValue?.(id)
  }

  return (
    <div className="flex flex-col gap-2">
      {linked && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 py-1 pl-2.5 pr-1 text-sm text-primary">
          <span className="min-w-0 flex-1 truncate font-medium">@{linked.name}</span>
          {onEditValue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-xs" variant="ghost" aria-label={editHint ?? "Edit value"} onClick={() => onEditValue(linked.id)} className="text-primary hover:bg-primary/15 hover:text-primary">
                  <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{editHint ?? "Edit value"}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-xs" variant="ghost" aria-label="Unlink" onClick={onUnlink} className="text-primary hover:bg-primary/15 hover:text-primary">
                <HugeiconsIcon icon={Unlink01Icon} className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Unlink</TooltipContent>
          </Tooltip>
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <p className="px-1 pb-0.5 text-xs text-muted-foreground">{linked ? "Switch to" : "Your feeds"}</p>
          <div role="radiogroup" aria-label={linked ? "Switch feed" : "Feeds"} className="flex flex-col gap-0.5">
            {others.map((f) => (
              <Button key={f.id} role="radio" aria-checked={false} variant="ghost" size="sm" onClick={() => onPick(f.id)} className="justify-start gap-2 rounded-lg font-normal">
                @{f.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {onAddFeed &&
        (creating ? (
          <NewFeed feeds={feeds} type={type} onAdd={create} onCancel={() => setCreating(false)} />
        ) : (
          <Button size="sm" variant="ghost" className="justify-start gap-2 rounded-lg font-normal text-muted-foreground" onClick={() => setCreating(true)}>
            <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
            New {type} feed
          </Button>
        ))}

      {suggestions.length > 0 && !creating && (
        <div className="flex flex-col gap-1.5 border-t pt-2">
          <p className="px-1 text-xs text-muted-foreground">Suggested</p>
          {/* each with the kind of value it holds, so it's clear what the feed is for */}
          <div className="flex flex-col gap-0.5">
            {suggestions.map((x) => (
              <Button key={x.name} size="sm" variant="ghost" className="h-auto justify-start gap-2 rounded-lg py-1.5 font-normal" onClick={() => create({ name: x.name, type })}>
                <HugeiconsIcon icon={PlusSignIcon} className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="shrink-0">@{x.name}</span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">{x.example}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Links text (or a button label) to a text feed. Linked text is still edited on the canvas: it sets this variation's value. */
function FeedPicker({
  el,
  feeds,
  onChange,
  onAddFeed,
  onLinkFeed,
  feedValue,
  onEditText,
}: {
  el: TextLike
  feeds: Feed[]
  onChange: (p: Partial<CanvasElement>) => void
  onAddFeed?: (f: Omit<Feed, "id">) => string
  /** fills empty values of a newly linked feed with the element's text */
  onLinkFeed?: (id: string, text: string) => void
  feedValue?: (id: string) => string | undefined
  /** starts editing the element's text on the canvas */
  onEditText?: () => void
}) {
  const [open, setOpen] = useState(false)
  const linked = feeds.find((f) => f.type === "text" && f.id === el.feed)
  const label = linked ? `Feed: @${linked.name}` : el.kind === "button" ? "Link label to a feed" : "Link text to a feed"
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconTip label={label}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={label} aria-pressed={!!linked} className={cn("size-8 rounded-lg", linked && "bg-primary/10 text-primary hover:bg-primary/15")}>
            <HugeiconsIcon icon={AtIcon} className="size-4" />
          </Button>
        </PopoverTrigger>
      </IconTip>
      <PopoverContent align="start" onOpenAutoFocus={(e) => e.preventDefault()} className="w-72 gap-3 p-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium text-muted-foreground">Link to a feed</p>
          <p className="text-xs text-muted-foreground/80">{el.kind === "button" ? "A different label in each variation." : "Different text in each variation."}</p>
        </div>
        <FeedChooser
          type="text"
          forButton={el.kind === "button"}
          feeds={feeds}
          value={el.feed}
          onAddFeed={onAddFeed}
          editHint="Edit on canvas"
          onEditValue={
            onEditText &&
            (() => {
              setOpen(false)
              // after the popover has closed and handed focus back
              setTimeout(onEditText, 60)
            })
          }
          onPick={(id) => {
            onLinkFeed?.(id, linked ? (feedValue?.(linked.id) ?? el.text) : el.text)
            onChange({ feed: id } as Partial<CanvasElement>)
          }}
          // keep what's on screen as typed text
          onUnlink={() => onChange({ feed: undefined, text: (linked && feedValue?.(linked.id)) || el.text } as Partial<CanvasElement>)}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Where a button goes: a typed URL, or a link feed so each variation can go somewhere different. */
function LinkPopover({
  el,
  feeds,
  onChange,
  onAddFeed,
  onEdit,
  onLinkFeed,
  autoOpen,
  feedValue,
}: {
  el: Extract<CanvasElement, { kind: "button" }>
  feeds: Feed[]
  onChange: (p: Partial<CanvasElement>) => void
  onAddFeed?: (f: Omit<Feed, "id">) => string
  onEdit?: (id: string) => void
  onLinkFeed?: (id: string, text: string) => void
  /** open as soon as the button is added */
  autoOpen?: boolean
  /** a feed's value for the video in view */
  feedValue?: (id: string) => string | undefined
}) {
  const links = feeds.filter((f) => f.type === "link")
  const linked = links.find((f) => f.id === el.linkFeed)
  const [open, setOpen] = useState(!!autoOpen)
  const jumping = useRef(false)
  const label = linked ? `Link from @${linked.name}` : el.link ? `Link: ${el.link}` : "Button link"
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
      }}
    >
      <IconTip label={label}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Button link" className={cn("size-8 rounded-lg", (linked || el.link) && "bg-primary/10 text-primary hover:bg-primary/15")}>
            <HugeiconsIcon icon={Link04Icon} className="size-4" />
          </Button>
        </PopoverTrigger>
      </IconTip>
      <PopoverContent
        align="center"
        // jumping to the side panel: don't pull focus back to the toolbar
        onCloseAutoFocus={(e) => jumping.current && (e.preventDefault(), (jumping.current = false))}
        className="w-72 gap-3 p-3"
      >
        <p className="text-xs font-medium text-muted-foreground">Button link</p>
        {/* one view: a typed link, or a link feed so each variation goes somewhere different */}
        {!linked && (
          <Input
            value={el.link ?? ""}
            placeholder="https://"
            onChange={(e) => onChange({ link: e.target.value } as Partial<CanvasElement>)}
            aria-label="Button link URL"
            inputMode="url"
            // nothing linked yet: put the cursor here and point it out
            autoFocus={!el.link}
            className={cn(!el.link && "ring-2 ring-primary/60 focus-visible:ring-primary/60")}
          />
        )}
        {!linked && <p className="-mb-1 text-xs text-muted-foreground">Or a different link for each variation</p>}
        <FeedChooser
          type="link"
          feeds={feeds}
          value={el.linkFeed}
          onAddFeed={onAddFeed}
          editHint="Edit in side panel"
          onEditValue={
            onEdit &&
            ((id) => {
              jumping.current = true
              setOpen(false)
              setTimeout(() => onEdit(id), 60)
            })
          }
          onPick={(id) => {
            if (el.link) onLinkFeed?.(id, el.link)
            onChange({ linkFeed: id } as Partial<CanvasElement>)
          }}
          // keep where it goes now as the typed link
          onUnlink={() => onChange({ linkFeed: undefined, link: (el.linkFeed && feedValue?.(el.linkFeed)?.trim()) || el.link } as Partial<CanvasElement>)}
        />
      </PopoverContent>
    </Popover>
  )
}

/* ---------- thumbnail strip ---------- */

const LAYOUTS = {
  horizontal: { next: "vertical", name: "Horizontal", icon: CarouselHorizontalIcon },
  vertical: { next: "free", name: "Vertical", icon: CarouselVerticalIcon },
  free: { next: "horizontal", name: "Free", icon: Move01Icon },
} as const

function StripControls({
  el,
  onChange,
  count,
  ratio,
}: {
  el: Extract<CanvasElement, { kind: "strip" }>
  onChange: (p: Partial<CanvasElement>) => void
  count: number
  ratio: number
}) {
  const layout = LAYOUTS[el.layout]
  const set = (p: Partial<Extract<CanvasElement, { kind: "strip" }>>) => onChange(p as Partial<CanvasElement>)
  return (
    <>
      {/* one icon that cycles horizontal → vertical → free */}
      <Tool
        label={`Layout: ${layout.name}`}
        onClick={() =>
          set(
            layout.next === "free"
              ? el.savedFree
                ? // back to the arrangement it had last time it was free
                  { layout: "free", x: el.savedFree.x, y: el.savedFree.y, size: el.savedFree.size, free: el.savedFree.free }
                : { layout: "free", free: freeOffsets(el, count, ratio) } // first time: start from where the thumbnails are now
              : {
                  layout: layout.next,
                  free: undefined,
                  // leaving free: remember it
                  ...(el.layout === "free" ? { savedFree: { x: el.x, y: el.y, size: el.size, free: freeOffsets(el, count, ratio) } } : {}),
                  ...fitStrip(el, layout.next, count, ratio),
                },
          )
        }
      >
        <HugeiconsIcon icon={layout.icon} className="size-4" />
      </Tool>
      {el.layout !== "free" && (
        <NumberPopover
          label="Gap"
          icon={el.layout === "vertical" ? DistributeVerticalCenterIcon : DistributeHorizontalCenterIcon}
          value={el.gap}
          min={0}
          max={80}
          unit="px"
          onChange={(gap) => set({ gap })}
        />
      )}

      <Divider />

      <StrokePopover label="Active highlight" width={el.highlightWidth} color={el.highlight} onChange={(highlightWidth, highlight) => set({ highlightWidth, highlight })} />
      <ColorPicker label="Background colour" allowTransparent value={el.bg} onChange={(bg) => set({ bg })}>
        <span className="size-4 rounded-[5px] ring-1 ring-foreground/20" style={{ background: swatchBg(el.bg) }} />
      </ColorPicker>
      <RadiusPopover id={el.id} value={el.radius} onChange={(radius) => set({ radius })} />
    </>
  )
}

/* ---------- image: radius, lock, fit ---------- */

function ImageControls({ el, onChange, onReplace }: { el: ImageEl; onChange: (p: Partial<CanvasElement>) => void; onReplace: () => void }) {
  return (
    <>
      <Tool label="Replace image" onClick={onReplace}>
        <HugeiconsIcon icon={Exchange01Icon} className="size-4" />
      </Tool>
      <RadiusPopover id={el.id} value={el.radius} onChange={(radius) => onChange({ radius } as Partial<CanvasElement>)} />
      <Tool label={el.lock ? "Unlock aspect ratio" : "Lock aspect ratio"} pressed={el.lock} onClick={() => onChange({ lock: !el.lock } as Partial<CanvasElement>)}>
        <HugeiconsIcon icon={el.lock ? Link01Icon : Unlink01Icon} className="size-4" />
      </Tool>
      <Tool
        label={el.fit === "cover" ? "Fill (switch to fit)" : "Fit (switch to fill)"}
        onClick={() => onChange({ fit: el.fit === "cover" ? "contain" : "cover" } as Partial<CanvasElement>)}
      >
        <HugeiconsIcon icon={el.fit === "cover" ? MaximizeScreenIcon : FitToScreenIcon} className="size-4" />
      </Tool>
    </>
  )
}

/* ---------- shared pieces ---------- */

function ColorPicker({
  label,
  value,
  onChange,
  allowTransparent,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allowTransparent?: boolean
  children: React.ReactNode
}) {
  const pop = useColorPopover()
  return (
    <Popover open={pop.open} onOpenChange={pop.onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={label} className="size-8 rounded-lg">
              {children}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="center" className={cn("w-64 gap-3 p-3 transition-opacity", pop.picking && "pointer-events-none opacity-0")}>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <ColorPanel value={value} onChange={onChange} onPicking={pop.onPicking} />
        <Swatches value={value} onChange={onChange} allowTransparent={allowTransparent} />
      </PopoverContent>
    </Popover>
  )
}

function Swatches({ value, onChange, allowTransparent }: { value: string; onChange: (v: string) => void; allowTransparent?: boolean }) {
  const v = value.toLowerCase()
  return (
    <div className="grid grid-cols-8 gap-1.5 border-t pt-3">
      {allowTransparent && (
        <Button
          variant="ghost"
          aria-label="Transparent"
          aria-pressed={v === "transparent" || v.endsWith("00") && v.length === 9}
          onClick={() => onChange("transparent")}
          className="size-6 rounded-md p-0 ring-1 ring-foreground/15 hover:opacity-90"
          style={{ background: CHECKER }}
        />
      )}
      {SWATCHES.map((c) => (
        <Button
          key={c}
          variant="ghost"
          aria-label={c}
          aria-pressed={v === c}
          onClick={() => onChange(c)}
          className={cn("size-6 rounded-md p-0 ring-1 ring-foreground/15 hover:opacity-90", v === c && "ring-2 ring-primary ring-offset-1 ring-offset-popover")}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}

/** Button border: thickness plus colour. */
function BorderPopover({ el, onChange }: { el: Extract<CanvasElement, { kind: "button" }>; onChange: (p: Partial<CanvasElement>) => void }) {
  const def = defaultBorder(el)
  return (
    <StrokePopover
      label="Border"
      width={el.borderWidth ?? def.width}
      color={el.border ?? def.color}
      onChange={(borderWidth, border) => onChange({ borderWidth, border } as Partial<CanvasElement>)}
    />
  )
}

/** Thickness (px at 1080 wide) plus colour, used for button borders and the strip's active highlight. */
function StrokePopover({ label, width, color, onChange }: { label: string; width: number; color: string; onChange: (width: number, color: string) => void }) {
  const pop = useColorPopover()
  return (
    <Popover open={pop.open} onOpenChange={pop.onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={label} className="size-8 rounded-lg">
              <span className="relative size-4 rounded-[5px]" style={{ background: CHECKER }}>
                <span className="absolute inset-0 rounded-[5px] ring-1 ring-foreground/20" style={{ boxShadow: `inset 0 0 0 ${width ? 3 : 0}px ${color}` }} />
              </span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="center" className={cn("w-64 gap-3 p-3 transition-opacity", pop.picking && "pointer-events-none opacity-0")}>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <NumberField label={`${label} thickness`} value={width} min={0} max={20} inputMax={40} unit="px" onChange={(w) => onChange(w, color)} />
        <ColorPanel value={color} onChange={(c) => onChange(width || 2, c)} onPicking={pop.onPicking} />
        <Swatches allowTransparent value={color} onChange={(c) => onChange(width || 2, c)} />
      </PopoverContent>
    </Popover>
  )
}

/** Slider with a typed value beside it. */
function NumberField({
  label,
  value,
  min,
  max,
  inputMax = max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  inputMax?: number
  unit: string
  onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const set = (v: number) => onChange(Math.max(min, Math.min(inputMax, v)))
  return (
    <div className="flex items-center gap-3">
      <Slider className="flex-1" value={[Math.min(value, max)]} min={min} max={max} step={1} onValueChange={([v]) => set(v)} aria-label={label} />
      <label className="flex h-8 w-[4.5rem] shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm ring-1 ring-foreground/10 focus-within:ring-2 focus-within:ring-ring/50">
        <input
          aria-label={`${label} in ${unit === "%" ? "percent" : "pixels"}`}
          inputMode="numeric"
          value={draft ?? Math.round(value)}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "")
            setDraft(raw)
            if (raw !== "") set(Number(raw))
          }}
          onBlur={() => setDraft(null)}
          className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
        />
        <span className="text-muted-foreground">{unit}</span>
      </label>
    </div>
  )
}

/** Icon button opening a NumberField. */
function NumberPopover({ label, icon, ...field }: { label: string; icon: typeof Image01Icon } & Omit<React.ComponentProps<typeof NumberField>, "label">) {
  return (
    <Popover>
      <IconTip label={label}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={label} className="size-8 rounded-lg">
            <HugeiconsIcon icon={icon} className="size-4" />
          </Button>
        </PopoverTrigger>
      </IconTip>
      <PopoverContent align="center" className="w-64 gap-3 p-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <NumberField label={label} {...field} />
      </PopoverContent>
    </Popover>
  )
}

/** Corner radius as 0–100% (100% = half the shorter side), with the matching px value at 1080 wide. */
function RadiusPopover({ id, value, onChange }: { id: string; value: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false)
  const [maxPx, setMaxPx] = useState(0) // the radius 100% stands for, in px at 1080 wide
  useLayoutEffect(() => {
    if (!open) return
    const el = document.querySelector<HTMLElement>(`[data-el="${id}"]`)
    const node = el?.querySelector<HTMLElement>("[data-thumb]") ?? el
    const frame = node?.closest<HTMLElement>("[data-frame]")
    if (!node || !frame) return
    setMaxPx((Math.min(node.offsetWidth, node.offsetHeight) / 2) * (1080 / frame.offsetWidth))
  }, [open, id])
  const px = Math.round((value / 100) * maxPx)
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Corner radius" className="size-8 rounded-lg">
              <HugeiconsIcon icon={SquareRoundCornerIcon} className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Corner radius</TooltipContent>
      </Tooltip>
      <PopoverContent align="center" className="w-64 gap-3 p-3">
        <p className="text-xs font-medium text-muted-foreground">Corner radius</p>
        <div className="flex items-center gap-3">
          <Slider className="flex-1" value={[value]} min={0} max={100} step={1} onValueChange={([v]) => onChange(v)} aria-label="Corner radius percent" />
          <label className="flex h-8 w-[4.5rem] shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm ring-1 ring-foreground/10 focus-within:ring-2 focus-within:ring-ring/50">
            <input
              aria-label="Corner radius in pixels"
              inputMode="numeric"
              value={draft ?? px}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "")
                setDraft(raw)
                if (raw !== "" && maxPx > 0) onChange(Math.min(100, (Number(raw) / maxPx) * 100))
              }}
              onBlur={() => setDraft(null)}
              className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
            />
            <span className="text-muted-foreground">px</span>
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Tool({
  label,
  pressed,
  className,
  children,
  ...props
}: { label: string; pressed?: boolean; children: React.ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          className={cn("size-8 shrink-0 rounded-lg", pressed && "bg-muted text-foreground", className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Tooltip around a trigger that is itself a menu or popover trigger. */
function IconTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const Divider = () => <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />
