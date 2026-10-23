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
 */
export function VideoPlayer({
  src,
  webm,
  poster,
  fill,
  startMuted = true,
  loop = true,
  className,
}: {
  src: string
  webm?: string
  poster?: string
  /** fill the parent (object-contain) instead of sizing to the video */
  fill?: boolean
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

  const shown = !playing || active || scrubbing

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
      className={cn("group/player relative flex overflow-hidden rounded-lg bg-black shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring", fill && "absolute inset-0 rounded-none shadow-none", !shown && "cursor-none", className)}
    >
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
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        className={cn("block", fill ? "size-full object-contain" : "max-h-[calc(100dvh-7.5rem)] max-w-full")}
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
          className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/15 backdrop-blur-md transition hover:scale-105 hover:bg-black/60"
        >
          <HugeiconsIcon icon={PlayIcon} className="size-7 translate-x-0.5 fill-current" />
        </button>
      )}

      {/* controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-2 pt-10 text-white transition-opacity duration-200",
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
          className="h-4 cursor-pointer [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:opacity-0 [&_[data-slot=slider-track]]:bg-white/25 hover:[&_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:focus-visible:opacity-100"
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
                className="ml-1 w-[72px] cursor-pointer [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-track]]:bg-white/25"
              />
            </div>
          </div>

          <span className="ml-auto pr-1 text-xs tabular-nums text-white/80">
            {clock(time)} <span className="text-white/45">/ {clock(duration)}</span>
          </span>
        </div>
      </div>
    </div>
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
          className={cn("grid size-8 shrink-0 place-items-center rounded-full text-white/90 outline-none transition hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50", className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
