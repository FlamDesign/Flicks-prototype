import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  TextFontIcon,
  Image02Icon,
  TouchInteraction01Icon,
  DashboardSquare02Icon,
  PanelLeftCloseIcon,
  CloudUploadIcon,
  Delete02Icon,
  ArrowExpand01Icon,
  Cancel01Icon,
  Tick02Icon,
  LayerIcon,
  AtIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { LayersPanel } from "@/components/editor/layers-panel"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BUTTON_STYLES,
  BUTTON_TEXT,
  DEFAULT_ICON,
  LAYOUTS,
  TEXT_STYLES,
  type ButtonVariant,
  type CanvasElement,
  type TextVariant,
  type Upload,
} from "@/components/editor/elements"
import { cn } from "@/lib/utils"
import { MediaViewer, type ViewerItem } from "@/components/media-viewer"
import { useImageUploads, type UploadItem } from "@/lib/uploads"

/** Regular tooltip: hides the pointer arrow the default tooltip draws. */
const PLAIN_TIP = "[&>span:last-child]:hidden"

export type Section = "text" | "images" | "buttons" | "layouts" | "layers" | "feeds"

/** A panel that picks one of the uploads for the selected element (replace image, button background). */
export type Picker = { title: string; selected?: string; onPick: (src: string) => void; onClose: () => void }

const SECTIONS: { id: Section; label: string; icon: typeof TextFontIcon }[] = [
  { id: "text", label: "Text", icon: TextFontIcon },
  { id: "images", label: "Images", icon: Image02Icon },
  { id: "buttons", label: "Buttons", icon: TouchInteraction01Icon },
  { id: "layouts", label: "Layouts", icon: DashboardSquare02Icon },
]
/** kept apart from the add sections in the rail */
const LAYERS = { id: "layers" as Section, label: "Layers", icon: LayerIcon }
const FEEDS = { id: "feeds" as Section, label: "Feeds", icon: AtIcon }
const ALL = [...SECTIONS, LAYERS, FEEDS]

/** Icon rail + collapsible panel with elements to add to the canvas. */
export function EditorPanel({
  disabled,
  onAddText,
  onAddButton,
  onAddImage,
  onAddLayout,
  uploads,
  setUploads,
  picker,
  layers,
  feeds,
  request,
  railFooter,
  feedsTitle,
}: {
  /** the Feeds panel title (a breadcrumb inside a feed) */
  feedsTitle?: React.ReactNode
  /** pinned to the bottom of the icon rail */
  railFooter?: React.ReactNode
  /** the Feeds panel */
  feeds: React.ReactNode
  /** open a section from outside (n re-triggers the same one) */
  request?: { section: Section; n: number }
  /** what the Layers panel shows and changes */
  layers: React.ComponentProps<typeof LayersPanel>
  picker?: Picker | null
  disabled: boolean
  onAddText: (v: TextVariant) => void
  onAddButton: (v: ButtonVariant) => void
  onAddImage: (src: string) => void
  onAddLayout: (els: CanvasElement[]) => void
  uploads: Upload[]
  setUploads: React.Dispatch<React.SetStateAction<Upload[]>>
}) {
  const [open, setOpen] = useState<Section | null>(null)
  const current = ALL.find((s) => s.id === open)
  useEffect(() => {
    if (request) setOpen(request.section)
  }, [request])

  return (
    <div className="flex h-full shrink-0">
      {/* Icon rail */}
      <nav aria-label="Add to canvas" className="flex w-14 flex-col items-center gap-1 border-r bg-background py-3">
        {ALL.map((s) => {
          const active = !picker && open === s.id
          return (
            <div key={s.id} className="contents">
            {/* Layers sits apart from the things you add */}
            {s.id === "layers" && <span aria-hidden className="my-1.5 h-px w-7 bg-border" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={s.label}
                  aria-pressed={active}
                  onClick={() => (picker?.onClose(), setOpen(active ? null : s.id))}
                  className={cn("rounded-xl text-muted-foreground", active && "bg-muted text-foreground")}
                >
                  <HugeiconsIcon icon={s.icon} className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={6} className={PLAIN_TIP}>{s.label}</TooltipContent>
            </Tooltip>
            </div>
          )
        })}
        {railFooter && <div className="mt-auto flex flex-col items-center">{railFooter}</div>}
      </nav>

      {(picker || current) && (
      <div className="flex w-72 flex-col border-r bg-background">
      {/* Picker panel (replace image, button background) takes the panel's place */}
      {picker && (
        <div data-keep-selection className="animate-in fade-in-0 flex min-h-0 flex-1 flex-col duration-150">
          <div className="flex h-12 shrink-0 items-center justify-between pl-4 pr-2">
            <h2 className="text-sm font-medium">{picker.title}</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close panel" onClick={picker.onClose}>
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6} className={PLAIN_TIP}>Close</TooltipContent>
            </Tooltip>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            <PickerList picker={picker} uploads={uploads} setUploads={setUploads} />
          </div>
        </div>
      )}

      {/* Panel, attached next to the rail; closed by default */}
      {!picker && current && (
        <div className="animate-in fade-in-0 flex min-h-0 flex-1 flex-col duration-150">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 pl-4 pr-2">
            {open === "feeds" && feedsTitle ? feedsTitle : <h2 className="text-sm font-medium">{current.label}</h2>}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Collapse panel" onClick={() => setOpen(null)}>
                  <HugeiconsIcon icon={PanelLeftCloseIcon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6} className={PLAIN_TIP}>Collapse</TooltipContent>
            </Tooltip>
          </div>
          {disabled && open !== "layers" && open !== "feeds" && (
            <p className="mx-4 mb-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              You can add elements once the video is ready.
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {/* adding something closes the panel so the canvas has room */}
            {open === "text" && <TextList disabled={disabled} onAdd={(v) => (onAddText(v), setOpen(null))} />}
            {open === "buttons" && <ButtonList disabled={disabled} onAdd={(v) => (onAddButton(v), setOpen(null))} />}
            {open === "images" && <ImageList disabled={disabled} onAdd={(src) => (onAddImage(src), setOpen(null))} uploads={uploads} setUploads={setUploads} />}
            {open === "layers" && <LayersPanel {...layers} />}
            {open === "feeds" && feeds}
            {open === "layouts" && <LayoutList disabled={disabled} onAdd={(els) => (onAddLayout(els), setOpen(null))} />}
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  )
}

// Plain outlined rows, Canva-style: each row is the style itself
const row = "h-auto w-full whitespace-normal rounded-xl border-foreground/10 px-3 font-normal hover:border-foreground/20"

function TextList({ disabled, onAdd }: { disabled: boolean; onAdd: (v: TextVariant) => void }) {
  return (
    <ul className="space-y-2">
      {TEXT_STYLES.map((t) => (
        <li key={t.variant}>
          <Button
            variant="ghost"
            disabled={disabled}
            onClick={() => onAdd(t.variant)}
            aria-label={`Add ${t.name.toLowerCase()}`}
            className={cn(row, "justify-start py-2.5 text-left")}
          >
            <span className={cn("block w-full", t.className, "opacity-100")} style={{ fontSize: PANEL_PX[t.variant] }}>
              {t.sample}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  )
}

const PANEL_PX: Record<TextVariant, number> = { heading: 26, subheading: 19, body: 15, caption: 13, label: 12 }

function ButtonList({ disabled, onAdd }: { disabled: boolean; onAdd: (v: ButtonVariant) => void }) {
  // One per row, shown large on white; white-on-video styles preview in black
  return (
    <ul className="space-y-1">
      {BUTTON_STYLES.map((b) => (
        <li key={b.variant}>
          <Button
            variant="ghost"
            disabled={disabled}
            onClick={() => onAdd(b.variant)}
            aria-label={`Add ${b.name.toLowerCase()} button`}
            className="h-auto w-full justify-center rounded-lg py-3 hover:bg-muted"
          >
            {b.variant === "icon" ? (
              <img src={DEFAULT_ICON} alt="" className="size-11 rounded-full" />
            ) : (
              <span className={cn("inline-flex items-center px-6 py-2.5 text-[15px] font-medium", b.panelClassName ?? b.className)}>
                {BUTTON_TEXT}
                {b.arrow && <span aria-hidden className="ml-2">→</span>}
              </span>
            )}
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** Layout rows: a small stacked preview of the actual text and button styles, like the text panel. */
function LayoutList({ disabled, onAdd }: { disabled: boolean; onAdd: (els: CanvasElement[]) => void }) {
  return (
    <ul className="space-y-2">
      {LAYOUTS.map((l) => (
        <li key={l.id}>
          <Button
            variant="ghost"
            disabled={disabled}
            onClick={() => onAdd(l.build())}
            aria-label={`Add ${l.name.toLowerCase()} layout`}
            className={cn(row, "flex-col gap-1.5 px-4 py-4", { left: "items-start", center: "items-center", right: "items-end" }[l.align])}
          >
            {l.parts.map((part, i) =>
              part.kind === "button" ? (
                <span key={i} className={cn("mt-1 inline-flex items-center px-4 py-1.5 text-xs font-medium", BUTTON_STYLES.find((b) => b.variant === part.variant)!.panelClassName ?? BUTTON_STYLES.find((b) => b.variant === part.variant)!.className)}>
                  {BUTTON_TEXT}
                  {BUTTON_STYLES.find((b) => b.variant === part.variant)!.arrow && <span aria-hidden className="ml-1.5">→</span>}
                </span>
              ) : (
                <span
                  key={i}
                  className={cn("block", { left: "text-left", center: "text-center", right: "text-right" }[l.align], TEXT_STYLES.find((t) => t.variant === part.variant)!.className, "opacity-100")}
                  style={{ fontSize: Math.round(PANEL_PX[part.variant] * 0.8) }}
                >
                  {TEXT_STYLES.find((t) => t.variant === part.variant)!.sample}
                </span>
              ),
            )}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function ImageList({
  disabled,
  onAdd,
  uploads,
  setUploads,
}: {
  disabled: boolean
  onAdd: (src: string) => void
  uploads: Upload[]
  setUploads: React.Dispatch<React.SetStateAction<Upload[]>>
}) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Upload | null>(null)
  // deleting an upload asks first
  const [confirmDel, setConfirmDel] = useState<Upload | null>(null)
  const { upload, retry } = useUploader(setUploads)

  return (
    <div className="space-y-3">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (upload(e.target.files), (e.target.value = ""))} />
      <Button variant="secondary" className="w-full gap-2" onClick={() => input.current?.click()}>
        <HugeiconsIcon icon={CloudUploadIcon} className="size-4" />
        Upload images
      </Button>

      <p className="px-1 text-xs text-muted-foreground">Recent uploads</p>
      {uploads.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">No uploads yet</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {uploads.map((u) => (
            <li key={u.id} className="group/img relative">
              {u.loading ? (
                <Skeleton className="shimmer aspect-square w-full animate-none rounded-xl" aria-label={`Uploading ${u.name}`} />
              ) : u.failed ? (
                <FailedTile u={u} onRetry={() => retry([u])} onRemove={() => setUploads((list) => list.filter((x) => x.id !== u.id))} />
              ) : (
                <>
                  <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => onAdd(u.src)}
                    aria-label={`Add ${u.name} to canvas`}
                    className="block aspect-square h-auto w-full overflow-hidden rounded-xl p-0 ring-1 ring-foreground/10"
                  >
                    <img src={u.src} alt="" className="animate-in fade-in-0 h-full w-full object-cover duration-300" />
                  </Button>
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover/img:opacity-100 group-focus-within/img:opacity-100">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="secondary" size="icon-xs" className="size-6 shadow-sm" aria-label={`View ${u.name}`} onClick={() => setPreview(u)}>
                          <HugeiconsIcon icon={ArrowExpand01Icon} className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6} className={PLAIN_TIP}>Full screen</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon-xs"
                          className="size-6 shadow-sm"
                          aria-label={`Delete ${u.name}`}
                          onClick={() => setConfirmDel(u)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6} className={PLAIN_TIP}>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ImageLightbox image={preview} onClose={() => setPreview(null)} />
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="sm:max-w-sm" data-keep-selection>
          <DialogHeader>
            <DialogTitle>Delete this image?</DialogTitle>
            <DialogDescription>“{confirmDel?.name}” is removed from your uploads. Anywhere it’s already used on the canvas keeps it.</DialogDescription>
          </DialogHeader>
          {confirmDel && <img src={confirmDel.src} alt="" className="h-32 w-full rounded-xl object-cover" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => (setUploads((list) => list.filter((x) => x.id !== confirmDel?.id)), setConfirmDel(null))}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** An upload, full screen, in the shared viewer. */
function ImageLightbox({ image, onClose }: { image: Upload | null; onClose: () => void }) {
  const ext = image?.name.split(".").pop()?.toUpperCase()
  const items: ViewerItem[] = image
    ? [{ id: image.id, kind: "image", src: image.src, name: image.name, details: [["Source", "Uploaded"], ["Type", "Image"], ["Format", ext === "JPEG" ? "JPG" : ext ?? "PNG"]] }]
    : []
  return <MediaViewer items={items} index={image ? 0 : null} onClose={onClose} />
}

/** Simulated upload: a shimmer, then the image (or a failed tile with retry). Calls onDone with the first file that uploads. */
function useUploader(setUploads: React.Dispatch<React.SetStateAction<Upload[]>>, onDone?: (src: string) => void) {
  const uploads = useImageUploads()
  const srcs = useRef<Record<string, string>>({})
  const first = useRef<string | null>(null)
  const settle = (id: string, ok: boolean) => {
    setUploads((u) => u.map((x) => (x.id === id ? { ...x, loading: false, failed: !ok } : x)))
    if (ok && first.current === id) onDone?.(srcs.current[id])
  }
  const retry = (items: UploadItem[]) => {
    const ids = items.map((i) => i.id)
    setUploads((u) => u.map((x) => (ids.includes(x.id) ? { ...x, loading: true, failed: false } : x)))
    uploads.run(items, settle, retry)
  }
  const upload = (files: FileList | null) => {
    const items = uploads.screen(files).map((file) => {
      const id = crypto.randomUUID()
      srcs.current[id] = URL.createObjectURL(file)
      return { id, name: file.name }
    })
    if (!items.length) return
    first.current = items[0].id
    setUploads((u) => [...items.map((it) => ({ ...it, src: srcs.current[it.id], loading: true })), ...u])
    uploads.run(items, settle, retry)
  }
  return { upload, retry }
}

/** An upload that failed: the image greyed with a red tint, retry in the middle, remove in the corner. */
function FailedTile({ u, onRetry, onRemove }: { u: Upload; onRetry: () => void; onRemove: () => void }) {
  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onRetry}
            aria-label={`Retry uploading ${u.name}`}
            className="relative block aspect-square w-full overflow-hidden rounded-xl ring-2 ring-destructive/60 outline-none focus-visible:ring-ring"
          >
            <img src={u.src} alt="" className="size-full object-cover opacity-50 grayscale" />
            <span className="absolute inset-0 grid place-items-center bg-destructive/20 text-white">
              <span className="grid size-8 place-items-center rounded-full bg-destructive shadow-sm">
                <HugeiconsIcon icon={RefreshIcon} className="size-4" strokeWidth={2.25} />
              </span>
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className={PLAIN_TIP}>Couldn’t upload. Click to retry.</TooltipContent>
      </Tooltip>
      <Button variant="secondary" size="icon-xs" aria-label={`Remove ${u.name}`} onClick={onRemove} className="absolute right-1.5 top-1.5 size-6 shadow-sm">
        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
      </Button>
    </div>
  )
}

/** Uploads only: pick one, or upload a new one (applied once it finishes uploading). */
function PickerList({ picker, uploads, setUploads }: { picker: Picker; uploads: Upload[]; setUploads: React.Dispatch<React.SetStateAction<Upload[]>> }) {
  const input = useRef<HTMLInputElement>(null)
  const { upload, retry } = useUploader(setUploads, picker.onPick)
  return (
    <div className="space-y-3">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => (upload(e.target.files), (e.target.value = ""))} />
      <Button variant="secondary" className="w-full gap-2" onClick={() => input.current?.click()}>
        <HugeiconsIcon icon={CloudUploadIcon} className="size-4" />
        Upload image
      </Button>
      <p className="px-1 text-xs text-muted-foreground">Your uploads</p>
      {uploads.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">No uploads yet</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {uploads.map((u) => {
            const on = picker.selected === u.src
            return (
              <li key={u.id} className="relative">
                {u.loading ? (
                  <Skeleton className="shimmer aspect-square w-full animate-none rounded-xl" aria-label={`Uploading ${u.name}`} />
                ) : u.failed ? (
                  <FailedTile u={u} onRetry={() => retry([u])} onRemove={() => setUploads((list) => list.filter((x) => x.id !== u.id))} />
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => picker.onPick(u.src)}
                    aria-label={`Use ${u.name}`}
                    aria-pressed={on}
                    className={cn("block aspect-square h-auto w-full overflow-hidden rounded-xl p-0 ring-1 ring-foreground/10", on && "ring-2 ring-primary")}
                  >
                    <img src={u.src} alt="" className="animate-in fade-in-0 h-full w-full object-cover duration-300" />
                  </Button>
                )}
                {on && (
                  <span aria-hidden className="pointer-events-none absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={2.5} />
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

