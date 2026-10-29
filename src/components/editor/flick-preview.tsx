import { useMemo } from "react"
import { CanvasStage } from "@/components/editor/canvas-stage"
import { buildDesign, type Brand, type Design, type Field } from "@/ai/design"
import { cn } from "@/lib/utils"

const noop = () => {}

/**
 * A Flick as the chat plans it: a video frame with the design on top (label, headline, price,
 * button, thumbnail strip). Used for the live preview beside the chat and for the small layout
 * and thumbnail choices in it. Read-only.
 */
export function FlickPreview({
  design,
  brand,
  ratio,
  posters,
  active = 0,
  values,
  className,
  style,
  dim,
}: {
  style?: React.CSSProperties
  design: Design
  brand?: Brand
  /** frame width / height */
  ratio: number
  /** one frame per variation; the strip shows them as thumbnails */
  posters: string[]
  active?: number
  /** the shown variation's label and price */
  values?: Partial<Record<Field, string>>
  className?: string
  /** the video behind, faded (nothing planned yet) */
  dim?: boolean
}) {
  const count = Math.max(2, posters.length)
  const elements = useMemo(
    // label and price always come per variation; headline, subheading and button text only when a variation sets them
    () => buildDesign(design, { ratio, count, feeds: { label: "label", price: "price", link: "link", ...(values?.headline ? { headline: "headline" } : {}), ...(values?.subheading ? { subheading: "subheading" } : {}), ...(values?.cta ? { cta: "cta" } : {}) }, brand }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(design), JSON.stringify(brand), ratio, count, !!values?.headline, !!values?.subheading, !!values?.cta],
  )
  const feedOf = (id: string) => ({ name: id, value: values?.[id as Field] ?? "" })
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-foreground/10", className)} style={{ ...style, aspectRatio: ratio, containerType: "size" }}>
      {posters[active] && (
        <img
          key={posters[active]}
          src={posters[active]}
          alt=""
          className={cn("absolute inset-0 size-full object-cover animate-in fade-in-0 duration-500", dim && "opacity-40 blur-[2px]")}
          draggable={false}
        />
      )}
      <div className="pointer-events-none absolute inset-0">
        <CanvasStage
          elements={elements}
          setElements={noop}
          selected={[]}
          setSelected={noop}
          editing={null}
          setEditing={noop}
          ratio={ratio}
          thumbs={posters.slice(0, count).map((p) => ({ poster: p }))}
          activeThumb={active}
          feedOf={feedOf}
          readOnly
        />
      </div>
    </div>
  )
}
