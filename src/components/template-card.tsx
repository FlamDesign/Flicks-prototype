import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ratioOf } from "@/components/ratio-glyph"
import type { Template } from "@/data"
import { cn } from "@/lib/utils"

export { ratioOf }

/** Template card: image, name, size. Click to open the template's page. */
export function TemplateCard({ t, onUse }: { t: Template; onUse: (t: Template) => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${t.title} template`}
      onClick={() => onUse(t)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onUse(t))}
      className="group mb-6 break-inside-avoid cursor-pointer gap-0 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0 outline-none"
    >
      <div
        className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 transition-[box-shadow,transform] duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:ring-foreground/20 group-focus-visible:ring-2 group-focus-visible:ring-ring"
        style={{ aspectRatio: t.cardRatio ?? "1 / 1" }}
      >
        <img
          src={t.image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {t.cardInk ? (
          // shopping-app hero card: the brand and its line set on the card's clear top
          <div className={cn("absolute inset-x-0 top-0 space-y-1 p-[7%]", t.cardInk === "light" ? "text-white" : "text-black")}>
            <p className="text-xs font-medium opacity-90">{t.brandName ?? t.brand}</p>
            <p className="text-balance text-xl font-bold leading-tight tracking-tight">{t.cardHeadline ?? t.headline}</p>
          </div>
        ) : (
          // slightly darkened; clears a little on hover
          <div aria-hidden className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/10" />
        )}
      </div>

      <div className="space-y-0.5 px-0.5 pt-2.5">
        <p className="truncate text-sm font-medium">{t.title}</p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Badge variant="subtle">{t.industry}</Badge>
          <Badge variant="subtle" className="tabular-nums">{t.size}</Badge>
        </div>
      </div>
    </Card>
  )
}
