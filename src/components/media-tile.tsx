import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Video01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

/** in place of a picture a project doesn't have yet: the theme's colours, softly, with a small video mark */
export function CoverPlaceholder({ small, className }: { small?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute inset-0 grid place-items-center bg-muted", className)}
      style={{
        backgroundImage:
          "radial-gradient(circle at 25% 20%, color-mix(in oklch, var(--brand) 30%, transparent), transparent 60%), radial-gradient(circle at 85% 90%, color-mix(in oklch, var(--chart-2) 28%, transparent), transparent 55%), radial-gradient(circle at 80% 15%, color-mix(in oklch, var(--chart-4) 18%, transparent), transparent 45%)",
      }}
    >
      {small ? null : (
        <span className="grid size-10 place-items-center rounded-xl bg-background/70 text-muted-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
          <HugeiconsIcon icon={Video01Icon} className="size-5" />
        </span>
      )}
    </span>
  )
}

/**
 * The one media tile: a framed picture (or a video that plays on hover) used by Assets, Projects,
 * Flicks and the picker. Same frame, ring, hover lift and badge style everywhere.
 * - `badges` sit bottom-left (length, size), `actions` top-right (shown on hover), `details` slide
 *   up over the bottom on hover (a prompt, a note).
 */
export function MediaTile({
  src,
  video,
  alt = "",
  aspect = "aspect-square",
  selected,
  dim,
  badges,
  actions,
  details,
  children,
  className,
}: {
  src?: string
  video?: { mp4: string; webm?: string }
  alt?: string
  aspect?: string
  selected?: boolean
  dim?: boolean
  badges?: React.ReactNode
  actions?: React.ReactNode
  details?: React.ReactNode
  /** anything else over the frame (a click target, a progress overlay); actions stay above it */
  children?: React.ReactNode
  className?: string
}) {
  const [hover, setHover] = useState(false)
  // the muted frame shows until the picture has loaded, then it fades in
  const [loaded, setLoaded] = useState<string | undefined>()
  return (
    <div
      data-slot="media-tile"
      onMouseEnter={() => video && setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "group/tile relative w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 transition-shadow duration-200 group-hover:ring-foreground/20 hover:ring-foreground/20",
        aspect,
        selected && "ring-2 ring-brand hover:ring-brand",
        className,
      )}
    >
      {!src && !video && <CoverPlaceholder />}
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          ref={(el) => void (el?.complete && el.naturalWidth && loaded !== src && setLoaded(src))}
          onLoad={() => setLoaded(src)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500 ease-out group-hover/tile:scale-[1.03]",
            loaded === src ? "opacity-100" : "opacity-0",
            dim && "opacity-60 blur-[1px]",
          )}
        />
      )}
      {video && hover && (
        // above anything passed in (a still frame of a video with no poster sits there), under the badges and actions
        <video autoPlay muted loop playsInline poster={src} className="pointer-events-none absolute inset-0 z-[1] size-full object-cover animate-in fade-in-0 duration-200">
          {video.webm && <source src={video.webm} type="video/webm" />}
          <source src={video.mp4} type="video/mp4" />
        </video>
      )}
      {details && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] translate-y-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2.5 pt-8 text-xs leading-snug text-white opacity-0 transition duration-200 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100">
          {details}
        </div>
      )}
      {/* badges make way for details on hover; without details they stay (a video keeps its length while it plays) */}
      {badges && <div className={cn("pointer-events-none absolute bottom-2 left-2 z-[2] flex gap-1 transition-opacity duration-200", details && "group-hover/tile:opacity-0")}>{badges}</div>}
      {children}
      {actions && <div className="absolute right-2 top-2 z-10 flex gap-1">{actions}</div>}
    </div>
  )
}

/** A small label on a tile: length, size, a count. */
export function TileBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white backdrop-blur-sm", className)}>{children}</span>
}
