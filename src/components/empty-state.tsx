import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

/**
 * Small line drawings for empty states (approved custom art, like the coach illustrations). Drawn
 * in the text color with one primary accent, so they follow light and dark mode.
 */
export type EmptyArt = "projects" | "flicks" | "media" | "search" | "templates"

function Art({ kind }: { kind: EmptyArt }) {
  const frame = "fill-background stroke-foreground/25"
  const accent = "fill-brand/15 stroke-brand"
  return (
    <svg viewBox="0 0 120 84" className="h-20 w-auto" strokeWidth={1.5} aria-hidden>
      {kind === "projects" && (
        <>
          <rect x="30" y="10" width="52" height="40" rx="8" className={frame} transform="rotate(-8 56 30)" />
          <rect x="38" y="18" width="52" height="40" rx="8" className={frame} transform="rotate(4 64 38)" />
          <rect x="34" y="28" width="52" height="40" rx="8" className={frame} />
          <path d="M54 48l6-6 6 6M60 42v14" className="fill-none stroke-brand" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "flicks" && (
        <>
          <rect x="40" y="6" width="40" height="66" rx="8" className={frame} />
          <circle cx="60" cy="34" r="11" className={accent} />
          <path d="M57 29.5v9l7.5-4.5z" className="fill-brand stroke-none" />
          <rect x="46" y="58" width="8" height="8" rx="2" className="fill-foreground/10 stroke-none" />
          <rect x="56" y="58" width="8" height="8" rx="2" className="fill-brand/40 stroke-none" />
          <rect x="66" y="58" width="8" height="8" rx="2" className="fill-foreground/10 stroke-none" />
        </>
      )}
      {(kind === "media" || kind === "templates") && (
        <>
          <rect x="22" y="14" width="36" height="28" rx="6" className={frame} />
          <rect x="62" y="14" width="36" height="28" rx="6" className={accent} />
          <rect x="22" y="46" width="36" height="28" rx="6" className={frame} />
          <rect x="62" y="46" width="36" height="28" rx="6" className={frame} />
          <path d="M70 36l7-8 6 6 4-4 7 6" className="fill-none stroke-brand" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "search" && (
        <>
          <circle cx="54" cy="38" r="20" className={frame} />
          <path d="M69 53l14 14" className="fill-none stroke-foreground/40" strokeLinecap="round" strokeWidth={3} />
          <path d="M46 38h16" className="fill-none stroke-brand" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

/** shadcn Empty with a drawing, a title, a line and one action */
export function EmptyState({ art, title, text, action, className }: { art: EmptyArt; title: string; text: string; action?: React.ReactNode; className?: string }) {
  return (
    <Empty className={cn("border py-14", className)}>
      <EmptyHeader>
        <EmptyMedia className="animate-in fade-in-0 zoom-in-95 duration-500">
          <Art kind={art} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
