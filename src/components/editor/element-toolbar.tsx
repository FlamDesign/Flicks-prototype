import { useLayoutEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ImageAdd01Icon,
  DragDropVerticalIcon,
  CarouselHorizontalIcon,
  CarouselVerticalIcon,
  Move01Icon,
  DistributeHorizontalCenterIcon,
  DistributeVerticalCenterIcon,
  Exchange01Icon,
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
  FitToScreenIcon,
  MaximizeScreenIcon,
  Image01Icon,
  Search01Icon,
  Tick02Icon,
  ArrowDown01Icon,
  SquareLock02Icon,
  SquareUnlock02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ensureFont } from "@/lib/fonts"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BUTTON_SIZE,
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
  onFeedValue,
}: {
  /** sets a feed's value on the video in view */
  onFeedValue?: (id: string, value: string) => void
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
      className="flex h-11 max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-popover px-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {grip}
      {el.kind === "button" && el.variant === "icon" ? (
        // icon buttons: just the image and where it goes
        <>
          <IconTip label="Replace icon image">
            <Button variant="ghost" size="sm" onClick={onPickImage} className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 font-normal">
              <HugeiconsIcon icon={Exchange01Icon} className="size-4" />
              Replace
            </Button>
          </IconTip>
          
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
          <FontControls el={el} onChange={onChange} />
        </>
      )}
      {el.kind === "button" && el.variant !== "icon" && (
        <>
          <Divider />
          <ButtonControls el={el} onChange={onChange} onChooseImage={onPickImage} />
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

/** Bold, italic and underline as three toggles, the standard way. */
function EmphasisMenu({ el, onChange }: { el: TextLike; onChange: (p: Partial<CanvasElement>) => void }) {
  const opts = [
    { key: "bold", label: "Bold", icon: TextBoldIcon, on: isBold(el), patch: { bold: !isBold(el) } },
    { key: "italic", label: "Italic", icon: TextItalicIcon, on: !!el.italic, patch: { italic: !el.italic } },
    { key: "underline", label: "Underline", icon: TextUnderlineIcon, on: !!el.underline, patch: { underline: !el.underline } },
  ]
  return (
    <>
      {opts.map((o) => (
        <Tool key={o.key} label={o.label} pressed={o.on} onClick={() => onChange(o.patch as Partial<CanvasElement>)}>
          <HugeiconsIcon icon={o.icon} className="size-4" />
        </Tool>
      ))}
    </>
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
          <Button variant="ghost" size="sm" aria-label={`Font: ${font}`} className="h-8 w-[136px] shrink-0 justify-between gap-1 rounded-lg px-2.5 font-normal ring-1 ring-foreground/10">
            <span className="truncate" style={{ fontFamily: FONTS.find((f) => f.name === font)?.stack }}>
              {font}
            </span>
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 shrink-0 text-muted-foreground" />
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


const ALIGN_NEXT: Record<Align, Align> = { left: "center", center: "right", right: "left" }
const ALIGN_ICON = { left: TextAlignLeftIcon, center: TextAlignCenterIcon, right: TextAlignRightIcon }

function FontControls({ el, onChange }: { el: TextLike; onChange: (p: Partial<CanvasElement>) => void }) {
  const size = el.size ?? (el.kind === "text" ? TEXT_STYLES.find((t) => t.variant === el.variant)!.size : BUTTON_SIZE)
  const px = Math.round(size * 10.8) // shown as px at 1080 wide
  const setPx = (v: number) => onChange({ size: Math.min(30, Math.max(1, v / 10.8)) } as Partial<CanvasElement>)
  const align = el.align ?? "center"
  const font = el.font ?? FONTS[0].name

  return (
    <>

      <FontPicker font={font} onPick={(v) => onChange({ font: v } as Partial<CanvasElement>)} />

      {/* Size */}
      <div className="flex h-8 shrink-0 items-center rounded-lg ring-1 ring-foreground/10">
        <Tool label="Decrease size" className="h-8 w-7" onClick={() => setPx(px - 2)}>
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
        <Tool label="Increase size" className="h-8 w-7" onClick={() => setPx(px + 2)}>
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
      <IconTip label="Replace image">
        <Button variant="ghost" size="sm" onClick={onReplace} className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 font-normal">
          <HugeiconsIcon icon={Exchange01Icon} className="size-4" />
          Replace
        </Button>
      </IconTip>
      <RadiusPopover id={el.id} value={el.radius} onChange={(radius) => onChange({ radius } as Partial<CanvasElement>)} />
      <Tool label={el.lock ? "Unlock aspect ratio" : "Lock aspect ratio"} pressed={el.lock} onClick={() => onChange({ lock: !el.lock } as Partial<CanvasElement>)}>
        <HugeiconsIcon icon={el.lock ? SquareLock02Icon : SquareUnlock02Icon} className="size-4" />
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
