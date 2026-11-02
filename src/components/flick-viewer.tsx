import { useEffect, useState } from "react"
import { GeneratedVideo } from "@/components/editor/generated-video"
import { FlicksLogo } from "@/components/brand"
import { ratioOf } from "@/components/ratio-glyph"
import { useLibrary } from "@/library"
import { cn } from "@/lib/utils"

/**
 * A shared Flick as viewers get it (#f/<link>), on any screen including phones: the video at its
 * size, the variations to tap underneath, and its name. Creating stays on larger screens.
 */
export function FlickViewer({ slug }: { slug: string }) {
  const { flicks } = useLibrary()
  const f = flicks.find((x) => x.link.slug === slug)
  const [i, setI] = useState(f?.start ?? 0)
  useEffect(() => void (document.title = f ? `${f.name} · Flicks` : "Flick not found · Flicks"), [f])

  if (!f)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <FlicksLogo className="h-7 text-foreground" />
        <p className="text-sm font-medium">This Flick isn’t available</p>
        <p className="max-w-xs text-sm text-muted-foreground">The link may be old, or the Flick was removed.</p>
      </div>
    )
  const r = ratioOf(f.size)
  const v = f.variants[i] ?? f.variants[0]
  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 bg-background px-4 py-5">
      <div className="flex w-full max-w-md items-center justify-between">
        <FlicksLogo className="h-6 text-foreground" />
        <span className="truncate pl-4 text-sm text-muted-foreground">{f.name}</span>
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
      {/* the frame keeps its exact ratio and fits the screen */}
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-foreground/10"
        style={{ aspectRatio: r, maxWidth: `min(28rem, calc((100dvh - 12rem) * ${r}))` }}
      >
        <GeneratedVideo key={v.video} index={v.video} />
      </div>
      {f.variants.length > 1 && (
        <div role="tablist" aria-label="Variations" className="flex gap-2">
          {f.variants.map((x, k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-label={x.name}
              onClick={() => setI(k)}
              className={cn("size-14 overflow-hidden rounded-xl ring-1 ring-foreground/10 outline-none transition focus-visible:ring-2 focus-visible:ring-ring", k === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100")}
            >
              <img src={x.poster} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      </div>
      <p className="text-xs text-muted-foreground">Made with Flicks</p>
    </div>
  )
}
