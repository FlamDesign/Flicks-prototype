import { useState } from "react"
import { CanvasStage } from "@/components/editor/canvas-stage"
import type { CanvasElement, Feed } from "@/components/editor/elements"
import type { Slide } from "@/components/editor/slides-strip"
import { FlickPlayer } from "@/components/flick-player"
import type { FlickRecord } from "@/library"

/** what an export keeps of the canvas (the same shape the editor saves) */
export type FlickSnap = { elements: CanvasElement[]; slides: Slide[]; feeds: Feed[]; start: string; includeRef: boolean }

/** the Flick's saved canvas, when it has one (exports keep it; the built-in samples don't) */
export const snapOf = (f: FlickRecord): FlickSnap | null => {
  const s = f.snap as Partial<FlickSnap> | undefined
  return s && Array.isArray(s.elements) && Array.isArray(s.slides) && s.elements.length ? (s as FlickSnap) : null
}

/**
 * A Flick drawn exactly as the canvas Preview draws it: the variations' videos underneath and the
 * saved layout on top (text, buttons, logo, the thumbnail strip with the chosen thumbnails), with
 * the feed values of the variation that's showing. Nothing is selectable; a thumbnail switches the
 * video, a button opens its link. Fills its parent, which must be the frame at the Flick's size
 * (`position: relative; container-type: size`, since the layout measures in cqw).
 */
export function FlickRender({ flick, active, onActive, playing = true }: { flick: FlickRecord; active: number; onActive: (i: number) => void; playing?: boolean }) {
  const snap = snapOf(flick)
  // the element layer is stateless here, but CanvasStage takes the editor's setters
  const [elements, setElements] = useState<CanvasElement[]>(() => snap?.elements ?? [])
  if (!snap) return null
  const included = snap.includeRef ? snap.slides : snap.slides.slice(1)
  const slide = included[active] ?? included[0]
  const feedOf = (id: string) => {
    const f = snap.feeds.find((x) => x.id === id)
    return f && { name: f.name, value: slide?.feeds?.[id] ?? "" }
  }
  const [w, h] = flick.size.split("×").map(Number)
  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        <FlickPlayer videos={flick.variants.map((v) => v.video)} active={active} playing={playing} />
      </div>
      <CanvasStage
        elements={elements}
        setElements={setElements}
        selected={[]}
        setSelected={() => {}}
        editing={null}
        setEditing={() => {}}
        ratio={w && h ? w / h : 1}
        thumbs={flick.variants.map((v) => ({ poster: v.poster }))}
        activeThumb={active}
        feedOf={feedOf}
        feeds={snap.feeds}
        readOnly
        onThumb={(i) => i < flick.variants.length && onActive(i)}
      />
    </>
  )
}
