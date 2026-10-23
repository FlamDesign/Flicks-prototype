import { useState } from "react"
import { VideoPlayer } from "@/components/video-player"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FlicksMark } from "@/components/brand"

/**
 * Set this to the tutorial file (mp4/webm) or a YouTube/Vimeo/Loom embed URL.
 * Until it's set, the player shows a branded placeholder.
 */
export const TUTORIAL_SRC = ""


const isEmbed = (src: string) => /youtube\.com|youtu\.be|vimeo\.com|loom\.com/.test(src)

export function TutorialVideo() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Entry point: quiet text link with a small play glyph */}
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="group gap-2 rounded-full font-normal text-muted-foreground hover:bg-transparent hover:text-foreground">
          <span className="flex size-5 items-center justify-center rounded-full ring-1 ring-foreground/20 transition-all group-hover:bg-foreground group-hover:text-background group-hover:ring-foreground">
            <HugeiconsIcon icon={PlayIcon} className="ml-px size-2.5 fill-current" />
          </span>
          Learn to create a Flick
        </Button>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden bg-black p-0 ring-white/10 sm:max-w-4xl">
        {/* Header overlays the video */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-5 pt-4 pb-10">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base text-white">Learn to create a Flick</DialogTitle>
            <DialogDescription className="sr-only">Tutorial video</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              className="pointer-events-auto bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-white/25"
              aria-label="Close"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </Button>
          </DialogClose>
        </div>

        <div className="relative aspect-video">
          {TUTORIAL_SRC ? (
            isEmbed(TUTORIAL_SRC) ? (
              <iframe
                src={TUTORIAL_SRC}
                title="Flicks tutorial"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <VideoPlayer src={TUTORIAL_SRC} fill startMuted={false} loop={false} />
            )
          ) : (
            <div className="hero-mesh absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden">
              <div aria-hidden className="absolute inset-0">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
                <div className="blob blob-3" />
              </div>
              <FlicksMark className="relative size-9 text-foreground" />
              <span className="relative flex size-14 items-center justify-center rounded-full bg-background/85 shadow-lg ring-1 ring-foreground/10 backdrop-blur">
                <HugeiconsIcon icon={PlayIcon} className="ml-0.5 size-5 fill-current" />
              </span>
              <p className="relative text-sm text-muted-foreground">Tutorial video goes here</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
