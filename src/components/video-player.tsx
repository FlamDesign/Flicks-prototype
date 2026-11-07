import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PauseIcon, PlayIcon, VolumeHighIcon, VolumeMute02Icon } from "@hugeicons/core-free-icons"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const clock = (s: number) => {
  if (!Number.isFinite(s)) return "0:00"
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`
}

/**
 * The viewer's video player: plays muted on open and loops. Click the video (or Space / K) to pause,
 * M to mute. Controls sit on a soft gradient at the bottom and fade out
 * after a moment of no pointer movement while playing; they stay while paused.
 * Docked (`dock`): the player fills its column, the video sits in the middle and the seeker and
 * controls stay fixed at the bottom, full width, always shown.
 */
export function VideoPlayer({
  src,
  webm,
  poster,
  fill,
  dock,
  startMuted = true,
  loop = true,
  className,
}: {
  src: string
  webm?: string
  poster?: string
  /** fill the parent (object-contain) instead of sizing to the video */
  fill?: boolean
  /** fill the parent as a column: the video above, the seeker and controls fixed at the bottom */
  dock?: boolean
  startMuted?: boolean
  loop?: boolean
  className?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(startMuted)
  const [volume, setVolume] = useState(1)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  // docked: the video's box is worked out from its shape and the stage's size (max-width and
  // max-height alone let the box go wider than the picture, leaving black bars inside it)
  const stage = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState<number>()
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>()
  useEffect(() => {
    const el = stage.current
    if (!dock || !el) return
    const ro = new ResizeObserver(([e]) => setStageSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [dock])
  const fitted = dock && ratio && stageSize ? (stageSize.w / stageSize.h > ratio ? { height: stageSize.h, width: stageSize.h * ratio } : { width: stageSize.w, height: stageSize.w / ratio }) : undefined
  const [active, setActive] = useState(true)
  const [scrubbing, setScrubbing] = useState(false)
  const idle = useRef<number | undefined>(undefined)

  // smooth progress while playing
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      if (vid.current && !scrubbing) setTime(vid.current.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, scrubbing])

  useEffect(() => {
    // metadata may already be in before React attached its handler
    const v = vid.current
    if (v && v.readyState >= 1) setDuration(v.duration)
    return () => clearTimeout(idle.current)
  }, [])

  const wake = () => {
    setActive(true)
    clearTimeout(idle.current)
    idle.current = window.setTimeout(() => setActive(false), 2000)
  }
  const toggle = () => {
    const v = vid.current
    if (!v) return
    if (v.paused) void v.play().catch(() => {})
    else v.pause()
    wake()
  }
  const toggleMute = () => {
    const v = vid.current
    if (!v) return
    v.muted = !v.muted
    if (!v.muted && v.volume === 0) (v.volume = 1), setVolume(1)
    setMuted(v.muted)
  }
  const setVol = (x: number) => {
    const v = vid.current
    if (!v) return
    v.volume = x
    v.muted = x === 0
    setVolume(x)
    setMuted(v.muted)
  }
  const seek = (t: number) => {
    if (vid.current) vid.current.currentTime = t
    setTime(t)
  }

  const shown = dock || !playing || active || scrubbing

  return (
    <div
      ref={box}
      tabIndex={0}
      aria-label="Video player"
      onMouseMove={wake}
      onMouseLeave={() => (clearTimeout(idle.current), setActive(false))}
      onKeyDown={(e) => {
        const k = e.key.toLowerCase()
        if (k === " " || k === "k") (e.preventDefault(), toggle())
        else if (k === "m") toggleMute()
        else return
        wake()
      }}
      className={cn(
        "group/player relative flex overflow-hidden rounded-lg bg-black shadow-2xl focus-ring",
        fill && "absolute inset-0 rounded-none shadow-none",
        dock && "h-full w-full flex-col rounded-none bg-transparent shadow-none",
        !shown && "cursor-none",
        className,
      )}
    >
      {/* docked: the video and its pause button in a column above the bar; otherwise the bar lies over the video */}
      <Stage dock={dock} ref={stage}>
        <video
          ref={vid}
          poster={poster}
          autoPlay
          muted={startMuted}
          loop={loop}
          playsInline
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => (setDuration(e.currentTarget.duration), setRatio(e.currentTarget.videoWidth / e.currentTarget.videoHeight || undefined))}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          style={fitted}
          className={cn("block", fill ? "size-full object-contain" : dock ? "max-h-full max-w-full rounded-lg object-contain shadow-2xl" : "max-h-[calc(100dvh-7.5rem)] max-w-full")}
        >
          {webm && <source src={webm} type="video/webm" />}
          <source src={src} type="video/mp4" />
        </video>

        {/* paused: a big play button in the middle */}
        {!playing && (
          <button
            type="button"
            aria-label="Play"
            onClick={toggle}
            className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:scale-105 hover:bg-black/70"
          >
            <HugeiconsIcon icon={PlayIcon} className="size-7 translate-x-0.5 fill-current" />
          </button>
        )}
      </Stage>

      {/* controls */}
      <div
        className={cn(
          dock
            ? "flex shrink-0 flex-col gap-2 pt-4 text-white"
            : "absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2 pt-10 text-white transition-opacity duration-200",
          shown ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Slider
          aria-label="Seek"
          min={0}
          max={duration || 1}
          step={0.01}
          value={[time]}
          onValueChange={([t]) => (setScrubbing(true), seek(t))}
          onValueCommit={() => setScrubbing(false)}
          className="h-4 cursor-pointer [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:opacity-0 [&_[data-slot=slider-track]]:bg-white/30 hover:[&_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:focus-visible:opacity-100"
        />
        <div className="flex items-center gap-1">
          <Control label={playing ? "Pause" : "Play"} onClick={toggle}>
            <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} className="size-4 fill-current" />
          </Control>

          <div className="group/vol flex items-center">
            <Control label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
              <HugeiconsIcon icon={muted || volume === 0 ? VolumeMute02Icon : VolumeHighIcon} className="size-4" />
            </Control>
            <div className="w-0 overflow-hidden transition-[width] duration-200 group-hover/vol:w-20 group-focus-within/vol:w-20">
              <Slider
                aria-label="Volume"
                min={0}
                max={1}
                step={0.01}
                value={[muted ? 0 : volume]}
                onValueChange={([x]) => setVol(x)}
                className="ml-1 w-[72px] cursor-pointer [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-track]]:bg-white/30"
              />
            </div>
          </div>

          <span className="ml-auto pr-1 text-xs tabular-nums text-white/90">
            {clock(time)} <span className="text-white/50">/ {clock(duration)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/** docked: a box for the video that takes the column's height above the bar; otherwise nothing extra */
function Stage({ dock, ref, children }: { dock?: boolean; ref: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  return dock ? (
    <div ref={ref} className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
      {children}
    </div>
  ) : (
    <>{children}</>
  )
}

function Control({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn("grid size-8 shrink-0 place-items-center rounded-full text-white/90 outline-none transition hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50", className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
