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
      {spinner && <Spinner className="relative size-4 text-primary" />}
    </div>
  )
}
