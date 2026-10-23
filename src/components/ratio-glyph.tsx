import { cn } from "@/lib/utils"

export const ratioOf = (size: string) => {
  const [w, h] = size.split("×").map(Number)
  return w / h
}

/** Small outline that shows a format's proportions */
export function RatioGlyph({ size, px = 14, className }: { size: string; px?: number; className?: string }) {
  const r = ratioOf(size)
  const w = r >= 1 ? px : Math.round(px * r)
  const h = r >= 1 ? Math.round(px / r) : px
  return (
    <span className={cn("flex shrink-0 items-center justify-center", className)} style={{ width: px, height: px }} aria-hidden>
      <span className="rounded-[2px] border-[1.5px] border-current" style={{ width: w, height: h }} />
    </span>
  )
}
