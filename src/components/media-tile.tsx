import { useState } from "react"
import { cn } from "@/lib/utils"

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
  return (
    <div
      onMouseEnter={() => video && setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "group/tile relative w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 transition-shadow duration-200 group-hover:ring-foreground/20 hover:ring-foreground/20",
        aspect,
        selected && "ring-2 ring-primary hover:ring-primary",
        className,
      )}
    >
      {src && <img src={src} alt={alt} loading="lazy" draggable={false} className={cn("absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover/tile:scale-[1.03]", dim && "opacity-60 blur-[1px]")} />}
      {video && hover && (
        <video autoPlay muted loop playsInline poster={src} className="absolute inset-0 size-full object-cover animate-in fade-in-0 duration-200">
          {video.webm && <source src={video.webm} type="video/webm" />}
          <source src={video.mp4} type="video/mp4" />
        </video>
      )}
      {details && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2.5 pt-8 text-xs leading-snug text-white opacity-0 transition duration-200 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100">
          {details}
        </div>
      )}
      {badges && <div className="pointer-events-none absolute bottom-2 left-2 flex gap-1 transition-opacity duration-200 group-hover/tile:opacity-0">{badges}</div>}
      {children}
      {actions && <div className="absolute right-2 top-2 z-10 flex gap-1">{actions}</div>}
    </div>
  )
}

/** A small label on a tile: length, size, a count. */
export function TileBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white backdrop-blur-sm", className)}>{children}</span>
}
