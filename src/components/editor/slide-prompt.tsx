import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Loading03Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FailedRefsNote, REFERENCE_OPTIONS, ReferenceThumb, ReferenceViewer, scrollSideways, useReferenceUploads, type Kind, type Reference } from "@/components/prompt-composer"
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
  locked,
  cost,
}: {
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
  const file = useRef<HTMLInputElement>(null)
  const kind = useRef<Kind>("Product")
  const [dragging, setDragging] = useState(false)
  const generating = status === "generating"
  const failedRefs = refs.some((r) => r.failed)
  const canSend = !!prompt.trim() && !generating && !disabled && refs.every((r) => !r.loading) && !failedRefs
  const refUploads = useReferenceUploads(setRefs)
  const [viewing, setViewing] = useState<number | null>(null)
  const addFiles = (files: FileList | File[], k: Kind = kind.current) => refUploads.add(files, k)

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) (e.preventDefault(), setDragging(true))
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        addFiles(e.dataTransfer.files, "Product")
      }}
      className={cn("rounded-2xl border bg-background p-2 shadow-sm", dragging && "border-primary ring-2 ring-primary/30")}
    >
      <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => (e.target.files && addFiles(e.target.files), (e.target.value = ""))} />

      {(fixedRef || refs.length > 0) && (
        // one line; scrolls sideways when there are more than fit
        <div className="flex gap-2 overflow-x-auto px-1 pb-1 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onWheel={scrollSideways}>
          {fixedRef && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative size-14 shrink-0">
                  <img src={fixedRef.url} alt={fixedRef.name} className="size-14 rounded-xl object-cover ring-1 ring-foreground/10" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{fixedRef.name} · added automatically</TooltipContent>
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
          if (e.clipboardData.files.length) (e.preventDefault(), addFiles(e.clipboardData.files, "Product"))
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
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Add image reference">
                  <HugeiconsIcon icon={Add01Icon} className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Add image reference</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="top" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuLabel>Add image reference</DropdownMenuLabel>
            {REFERENCE_OPTIONS.map((o) => (
              <DropdownMenuItem key={o.kind} onSelect={() => ((kind.current = o.kind), file.current?.click())} className="gap-3">
                <HugeiconsIcon icon={o.icon} className="size-4" />
                <span className="flex flex-col">
                  <span>{o.kind}</span>
                  <span className="text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
