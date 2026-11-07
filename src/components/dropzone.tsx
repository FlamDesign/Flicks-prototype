import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Cancel01Icon, CloudUploadIcon, Video01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { PictureSlot } from "@/components/editor/generation-progress"
import { cn } from "@/lib/utils"

/** one file in a drop zone: its picture, and whether it's still being prepared (a long video being trimmed) */
export type DropItem = { id: string; name: string; url?: string; poster?: string; kind: "image" | "video"; preparing?: boolean; meta?: string }

/**
 * The one uploader used everywhere: a roomy drop area that names what it takes and its limits, and,
 * once files are in, shows them as tiles with a remove button, plus a tile to add more. Clicking
 * opens the picker (uploads and the library); files can also be dropped on it.
 */
export function Dropzone({
  items,
  onBrowse,
  onFiles,
  onRemove,
  accept,
  max = 1,
  title,
  hint,
  className,
  size = "md",
}: {
  items: DropItem[]
  onBrowse: () => void
  onFiles: (files: FileList) => void
  onRemove?: (id: string) => void
  /** what it takes, for the wording */
  accept: "image" | "video" | "media"
  max?: number
  /** the main line when empty, e.g. "Drop your video here" */
  title?: string
  /** limits and tips, e.g. "MP4, MOV or WebM · up to 15s" */
  hint?: string
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const [over, setOver] = useState(false)
  const full = items.length >= max
  const what = accept === "video" ? (max > 1 ? "videos" : "a video") : accept === "image" ? (max > 1 ? "images" : "an image") : "photos or videos"
  const drop = {
    onDragOver: (e: React.DragEvent) => (e.preventDefault(), setOver(true)),
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => (e.preventDefault(), setOver(false), e.dataTransfer.files.length && onFiles(e.dataTransfer.files)),
  }
  const tile = size === "lg" ? "size-28" : size === "sm" ? "size-16" : "size-24"
  if (!items.length)
    return (
      <button
        type="button"
        onClick={onBrowse}
        {...drop}
        className={cn(
          "group/drop flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-foreground/20 bg-muted/30 px-6 text-center transition-[background-color,border-color,box-shadow] hover:border-foreground/30 hover:bg-muted focus-ring",
          size === "lg" ? "min-h-56 py-10" : size === "sm" ? "min-h-28 py-5" : "min-h-40 py-8",
          over && "border-brand bg-brand/10 ring-4 ring-brand/20",
          className,
        )}
      >
        <span className={cn("grid place-items-center rounded-2xl bg-background text-foreground shadow-sm ring-1 ring-foreground/10 transition-transform group-hover/drop:-translate-y-0.5", size === "sm" ? "size-10" : "size-12", over && "-translate-y-1")}>
          <HugeiconsIcon icon={CloudUploadIcon} className={size === "sm" ? "size-5" : "size-6"} />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            {over ? "Drop to add" : (title ?? `Drop ${what} here`)}
            {!over && (
              <>
                {" "}
                <span className="font-normal text-muted-foreground">or</span> <span className="text-brand underline-offset-4 group-hover/drop:underline">browse</span>
              </>
            )}
          </span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </span>
      </button>
    )
  return (
    <div {...drop} className={cn("flex flex-col gap-2 rounded-2xl p-1 transition-colors", over && "bg-brand/10 ring-2 ring-brand/50", className)}>
      <ul className="flex flex-wrap gap-2.5">
        {items.map((m) => (
          <li key={m.id} className={cn("group/t relative shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10", tile)}>
            {m.kind === "video" && !m.poster && m.url ? (
              <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" />
            ) : (
              <PictureSlot src={m.kind === "video" ? m.poster : (m.url ?? m.poster)} alt={m.name} />
            )}
            {m.preparing && <span className="absolute inset-x-1 bottom-1 rounded-md bg-background/90 px-1 py-0.5 text-center text-xs backdrop-blur">Trimming…</span>}
            {m.kind === "video" && !m.preparing && (
              <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-xs text-white backdrop-blur-sm">
                <HugeiconsIcon icon={Video01Icon} className="size-3" />
                {m.meta}
              </span>
            )}
            {onRemove && !m.preparing && (
              <Button variant="secondary" size="icon-xs" aria-label={`Remove ${m.name}`} onClick={() => onRemove(m.id)} className="absolute right-1 top-1 size-6 rounded-full bg-background/90 shadow-sm backdrop-blur opacity-0 transition-opacity group-hover/t:opacity-100 focus-visible:opacity-100">
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </Button>
            )}
          </li>
        ))}
        {!full && (
          <li>
            <button type="button" onClick={onBrowse} className={cn("flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-foreground/20 bg-muted/30 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground focus-ring", tile)}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Add
            </button>
          </li>
        )}
      </ul>
      {hint && max > 1 && (
        <p className="px-0.5 text-xs text-muted-foreground">
          {items.length} of {max} · {hint}
        </p>
      )}
    </div>
  )
}
