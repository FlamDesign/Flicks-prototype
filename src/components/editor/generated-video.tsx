import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { GENERATED_VIDEOS } from "@/components/editor/elements"

/** Turns an inlined data: URI into a blob: URL; some embedded viewers refuse data: media but allow blob:. */
function useBlobUrl(dataUri: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!dataUri.startsWith("data:")) return setUrl(dataUri)
    let made: string | undefined
    try {
      const [head, b64] = dataUri.split(",")
      const type = head.slice(5).split(";")[0]
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      made = URL.createObjectURL(new Blob([bytes], { type }))
      setUrl(made)
    } catch {
      setUrl(dataUri)
    }
    return () => {
      if (made) URL.revokeObjectURL(made)
    }
  }, [dataUri])
  return url
}

/** The generated video: muted loop that starts on its own, with a poster and a play fallback if autoplay is blocked. */
export function GeneratedVideo({
  index,
  playing = true,
}: {
  index: number
  /** false pauses it (the editor's play/pause toggle) */
  playing?: boolean
}) {
  const v = GENERATED_VIDEOS[index % GENERATED_VIDEOS.length]
  const ref = useRef<HTMLVideoElement>(null)
  const canWebm = typeof document !== "undefined" && document.createElement("video").canPlayType("video/webm; codecs=vp9") !== ""
  const src = useBlobUrl(canWebm && v.webm ? v.webm : v.mp4)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !src) return
    el.muted = true
    if (!playing) return el.pause()
    el.play().then(() => setPaused(false)).catch(() => setPaused(true))
  }, [src, playing])


  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={v.poster}
        autoPlay={playing}
        muted
        loop
        playsInline
        preload="auto"
        onPlay={() => setPaused(false)}
        className="animate-in fade-in-0 absolute inset-0 h-full w-full object-cover duration-700"
      />
      {paused && playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            size="icon-lg"
            variant="secondary"
            className="size-14 rounded-full bg-background/85 shadow-lg backdrop-blur"
            aria-label="Play video"
            onClick={() => ref.current?.play().then(() => setPaused(false)).catch(() => {})}
          >
            <HugeiconsIcon icon={PlayIcon} className="ml-0.5 size-6 fill-current" />
          </Button>
        </div>
      )}
    </>
  )
}
