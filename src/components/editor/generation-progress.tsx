import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * The generating look: very light tints of the preset chart colours drifting slowly, with a soft
 * band of light passing across to show work in progress. Fills its parent and sits behind
 * whatever is on top (on the canvas, the design stays editable). `sweep` adds the passing band;
 * `spinner` adds a small spinner in the middle (for thumbnails).
 */
export function GeneratingGradient({ sweep, spinner, className }: { sweep?: boolean; spinner?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 grid place-items-center overflow-hidden bg-muted", className)}>
      <div className="generating-gradient absolute inset-[-50%]" />
      {sweep && <div className="generating-sweep absolute inset-0" />}
      {spinner && <Spinner className="relative size-4 text-brand" />}
    </div>
  )
}

/**
 * A picture that may not exist yet (being made) or may still be loading: the generating gradient
 * shows until the image has actually arrived, then the image fades in over it.
 */
export function PictureSlot({ src, alt = "", className, imgClassName }: { src?: string; alt?: string; className?: string; imgClassName?: string }) {
  const [loaded, setLoaded] = useState<string | undefined>()
  const [broken, setBroken] = useState<string | undefined>()
  const ready = !!src && loaded === src
  // a picture that can't load stops animating: plain muted, not "still working"
  if (src && broken === src) return <span className={cn("absolute inset-0 block bg-muted", className)} />
  return (
    <span className={cn("absolute inset-0 block overflow-hidden", className)}>
      {!ready && <GeneratingGradient sweep />}
      {src && <img src={src} alt={alt} decoding="async" onLoad={() => setLoaded(src)} onError={() => setBroken(src)} ref={(n) => void (n?.complete && n.naturalWidth && loaded !== src && setLoaded(src))} className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", ready ? "opacity-100" : "opacity-0", imgClassName)} />}
    </span>
  )
}
