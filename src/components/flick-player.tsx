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
export function FlickPlayer({ videos, active, playing = true, className, fade = true }: { videos: number[]; active: number; playing?: boolean; className?: string; /** a short cross-fade on switch */ fade?: boolean }) {
  const refs = useRef<(HTMLVideoElement | null)[]>([])
  const last = useRef(active)
  const [blocked, setBlocked] = useState(false)
  const canWebm = typeof document !== "undefined" && document.createElement("video").canPlayType("video/webm; codecs=vp9") !== ""

  // the active video plays; the others sit at the same moment, ready
  useEffect(() => {
    const prev = refs.current[last.current]
    const t = prev?.currentTime ?? 0
    for (const [k, el] of refs.current.entries()) {
      if (!el) continue
      el.muted = true
      if (k === active) {
        // the same moment (modulo its own length, in case the lengths differ)
        if (prev && prev !== el && Number.isFinite(el.duration) && el.duration > 0) el.currentTime = t % el.duration
        else if (prev && prev !== el) el.currentTime = t
        if (playing) el.play().then(() => setBlocked(false)).catch(() => setBlocked(true))
        else el.pause()
      } else if (!el.paused) el.pause()
    }
    last.current = active
  }, [active, playing, videos.join(",")])

  // paused ones follow the active one now and then, so a switch never seeks far (a seek on a
  // buffered video is instant; a cold one shows its poster for a frame)
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
            autoPlay={playing && k === active}
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
