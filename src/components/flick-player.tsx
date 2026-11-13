import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { videoAt, wrapVideo } from "@/components/editor/elements"
import { cn } from "@/lib/utils"

/**
 * A Flick as viewers get it: every variation's video is loaded and stacked, only the active one
 * shows, and a switch carries the playhead over (the next video starts from the same moment, so the
 * swap reads as one scene changing, not a restart). Muted, looping; a play button if autoplay is
 * blocked. Used by the editor canvas, the Flick page and the shared viewer.
 */
export function FlickPlayer({ videos, active, playing = true, className, fade = false }: { videos: number[]; active: number; playing?: boolean; className?: string; /** a short cross-fade on switch */ fade?: boolean }) {
  const refs = useRef<(HTMLVideoElement | null)[]>([])
  const last = useRef(active)
  const [blocked, setBlocked] = useState(false)
  const canWebm = typeof document !== "undefined" && document.createElement("video").canPlayType("video/webm; codecs=vp9") !== ""

  // every video plays (muted) so each one is buffered and at the same moment; a switch only changes
  // which one shows, after lining the newly shown one up with the one it replaces
  useEffect(() => {
    const prev = refs.current[last.current]
    const t = prev?.currentTime ?? 0
    for (const [k, el] of refs.current.entries()) {
      if (!el) continue
      el.muted = true
      if (k === active && prev && prev !== el && Number.isFinite(el.duration) && el.duration > 0 && Math.abs(el.currentTime - (t % el.duration)) > 0.1) el.currentTime = t % el.duration
      if (playing) el.play().then(() => k === active && setBlocked(false)).catch(() => k === active && setBlocked(true))
      else el.pause()
    }
    last.current = active
  }, [active, playing, videos.join(",")])

  // the hidden ones are kept in step with the shown one (loops of different lengths drift)
  useEffect(() => {
    const id = setInterval(() => {
      const cur = refs.current[active]
      if (!cur || cur.paused) return
      for (const [k, el] of refs.current.entries()) if (el && k !== active && Number.isFinite(el.duration) && el.duration > 0 && Math.abs(el.currentTime - (cur.currentTime % el.duration)) > 0.5) el.currentTime = cur.currentTime % el.duration
    }, 1000)
    return () => clearInterval(id)
  }, [active])

  return (
    <div className={cn("absolute inset-0", className)}>
      {videos.map((v, k) => {
        const m = videoAt(wrapVideo(v))
        return (
          <video
            key={`${k}-${v}`}
            ref={(el) => void (refs.current[k] = el)}
            poster={m.poster}
            muted
            loop
            playsInline
            preload="auto"
            autoPlay={playing}
            aria-hidden={k !== active}
            onPlay={() => k === active && setBlocked(false)}
            className={cn("absolute inset-0 size-full object-cover", fade && "transition-opacity duration-150", k === active ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            {canWebm && m.webm && <source src={m.webm} type="video/webm" />}
            <source src={m.mp4} type="video/mp4" />
          </video>
        )
      })}
      {blocked && playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            size="icon-lg"
            variant="secondary"
            className="size-14 bg-background/90 shadow-lg backdrop-blur"
            aria-label="Play video"
            onClick={() => refs.current[active]?.play().then(() => setBlocked(false)).catch(() => {})}
          >
            <HugeiconsIcon icon={PlayIcon} className="ml-0.5 size-6 fill-current" />
          </Button>
        </div>
      )}
    </div>
  )
}
