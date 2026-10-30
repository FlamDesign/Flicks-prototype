import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Loading03Icon, PlayIcon, SparklesIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FailedRefsNote, ReferenceThumb, ReferenceViewer, scrollSideways, useReferenceUploads, type Reference } from "@/components/prompt-composer"
import { useMediaAdd } from "@/components/media-picker"
import type { SlideStatus } from "@/components/editor/slides-strip"
import { cn } from "@/lib/utils"

/**
 * Prompt box for the slide in view, at the bottom of the prompts panel.
 * Reference video: its own prompt and image references. Variations: the reference video is attached by default.
 */
export function SlidePrompt({
  label,
  status,
  prompt,
  refs,
  setPrompt,
  setRefs,
  fixedRef,
  disabled,
  onGenerate,
  onOpenFixed,
  locked,
  cost,
}: {
  /** opens the attached reference video full screen */
  onOpenFixed?: () => void
  /** credits this video costs (its size and length) */
  cost: number
  /** read-only, with the reason shown in place of Generate (a template's reference video) */
  locked?: string
  label: string
  status: SlideStatus
  prompt: string
  refs: Reference[]
  setPrompt: (v: string) => void
  setRefs: (fn: (r: Reference[]) => Reference[]) => void
  /** attached automatically and can't be removed (the reference video, for variations) */
  fixedRef?: { url: string; name: string }
  /** e.g. variations while the reference video is still generating */
  disabled?: string
  onGenerate: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const generating = status === "generating"
  const failedRefs = refs.some((r) => r.failed)
  const canSend = !!prompt.trim() && !generating && !disabled && refs.every((r) => !r.loading) && !failedRefs
  const refUploads = useReferenceUploads(setRefs)
  const [viewing, setViewing] = useState<number | null>(null)
  const media = useMediaAdd(refUploads.addPicked)
  const addFiles = (files: FileList | File[]) => media.addFiles(files)

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) (e.preventDefault(), setDragging(true))
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        addFiles(e.dataTransfer.files)
      }}
      className={cn("rounded-2xl border bg-background p-2 shadow-sm", dragging && "border-primary ring-2 ring-primary/30")}
    >
      {media.ui}

      {(fixedRef || refs.length > 0) && (
        // one line; scrolls sideways when there are more than fit
        <div className="flex gap-2 overflow-x-auto px-1 pb-1 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onWheel={scrollSideways}>
          {fixedRef && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpenFixed}
                  disabled={!onOpenFixed}
                  aria-label={`View ${fixedRef.name}`}
                  className="group/ref relative size-14 shrink-0 overflow-hidden rounded-xl outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                >
                  <img src={fixedRef.url} alt="" className="size-full object-cover transition-transform duration-200 group-hover/ref:scale-105" />
                  <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover/ref:bg-black/25">
                    <span className="grid size-6 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                      <HugeiconsIcon icon={PlayIcon} className="size-3" />
                    </span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{fixedRef.name}</TooltipContent>
            </Tooltip>
          )}
          {refs.map((r) => (
            <ReferenceThumb key={r.id} r={r} onRemove={() => !locked && setRefs((list) => list.filter((x) => x.id !== r.id))} onRetry={() => refUploads.retry([r])} onOpen={() => setViewing(refs.filter((x) => !x.loading && !x.failed).findIndex((x) => x.id === r.id))} />
          ))}
        </div>
      )}
      <FailedRefsNote refs={refs} onRetry={refUploads.retry} />

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        readOnly={!!locked}
        onPaste={(e) => {
          if (e.clipboardData.files.length) (e.preventDefault(), addFiles(e.clipboardData.files))
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) onGenerate()
        }}
        placeholder={fixedRef ? "What should change? The product, character, scene or a mix" : "Describe the video you want to create"}
        aria-label={`${label} prompt`}
        rows={3}
        className="field-sizing-content min-h-[72px] max-h-[180px] resize-none rounded-none border-0 bg-transparent px-1.5 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
      />

      {locked ? (
        <p className="px-1.5 pb-1 text-xs text-muted-foreground">{locked}</p>
      ) : (
      <div className="flex items-center gap-1.5 px-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Add photos or videos" onClick={media.openPicker}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add photos or videos</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={canSend ? -1 : 0}>
              <Button size="sm" disabled={!canSend} onClick={onGenerate} className="gap-1.5 pl-2.5 pr-1" aria-label={`${status === "done" ? "Regenerate" : "Generate"}, uses ${cost} credits`}>
                <HugeiconsIcon icon={generating ? Loading03Icon : SparklesIcon} className={cn("size-4", generating && "animate-spin")} />
                {generating ? "Generating…" : status === "done" ? "Regenerate" : "Generate"}
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-medium tabular-nums leading-none">{cost}</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{disabled ?? (generating ? "Generating video" : failedRefs ? "Retry or remove the images that didn’t upload" : `Uses ${cost} credits`)}</TooltipContent>
        </Tooltip>
      </div>
      )}
      <ReferenceViewer refs={refs} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
    </div>
  )
}
