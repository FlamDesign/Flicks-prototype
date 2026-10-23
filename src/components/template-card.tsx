import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ratioOf } from "@/components/ratio-glyph"
import type { Template } from "@/data"

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
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5 transition-[box-shadow,transform] duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_32px_-16px_rgb(0_0_0/0.35)] group-hover:ring-foreground/15 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <img
          src={t.image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {/* slightly darkened; clears a little on hover */}
        <div aria-hidden className="absolute inset-0 bg-black/15 transition-colors duration-300 group-hover:bg-black/5" />
      </div>

      <div className="space-y-0.5 px-0.5 pt-2.5">
        <p className="truncate text-sm font-medium">{t.title}</p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">{t.industry}</Badge>
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal tabular-nums">{t.size}</Badge>
        </div>
      </div>
    </Card>
  )
}
