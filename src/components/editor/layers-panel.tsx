import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CarouselHorizontalIcon, TouchInteraction01Icon, Delete02Icon, DragDropVerticalIcon, Image02Icon, TextFontIcon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { CanvasElement } from "@/components/editor/elements"
import { cn } from "@/lib/utils"

const ICON = { text: TextFontIcon, button: TouchInteraction01Icon, image: Image02Icon, strip: CarouselHorizontalIcon } as const

const labelOf = (el: CanvasElement) =>
  el.kind === "button" && el.variant === "icon" ? "Icon button" : el.kind === "text" || el.kind === "button" ? el.text.replace(/\s+/g, " ").trim() || (el.kind === "text" ? "Text" : "Button") : el.kind === "image" ? "Image" : "Thumbnails"

/**
 * Layers: every element, front to back. Only for hiding and reordering;
 * hover outlines the element on the canvas, click selects it, drag a row to move it forward or back.
 */
export function LayersPanel({
  elements,
  setElements,
  selected,
  setSelected,
  onHover,
}: {
  elements: CanvasElement[]
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>
  selected: string[]
  setSelected: (ids: string[]) => void
  onHover: (id: string | null) => void
}) {
  // front first: the last element in the list is drawn on top
  const rows = [...elements].reverse()
  const [dragging, setDragging] = useState<string | null>(null)
  // insert before this row index (rows.length = after the last)
  const [over, setOver] = useState<number | null>(null)

  const drop = () => {
    if (dragging === null || over === null) return
    const moving = rows.find((r) => r.id === dragging)!
    const rest = rows.filter((r) => r.id !== dragging)
    const from = rows.findIndex((r) => r.id === dragging)
    const at = over > from ? over - 1 : over
    rest.splice(at, 0, moving)
    setElements(rest.reverse())
  }
  const toggle = (el: CanvasElement) => {
    setElements((els) => els.map((x) => (x.id === el.id ? ({ ...x, hidden: !x.hidden } as CanvasElement) : x)))
    // a hidden element can't stay selected
    if (!el.hidden) setSelected(selected.filter((id) => id !== el.id))
  }

  if (!elements.length) return <p className="px-1 py-2 text-sm text-muted-foreground">Nothing on the canvas yet.</p>

  return (
    <ul className="flex flex-col gap-0.5" aria-label="Layers" onMouseLeave={() => onHover(null)} data-keep-selection>
      {rows.map((el, i) => {
        const isSel = selected.includes(el.id)
        return (
          <li
            key={el.id}
            draggable
            onDragStart={(e) => {
              setDragging(el.id)
              e.dataTransfer.effectAllowed = "move"
              e.dataTransfer.setData("text/plain", el.id)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              const r = e.currentTarget.getBoundingClientRect()
              setOver(e.clientY < r.top + r.height / 2 ? i : i + 1)
            }}
            onDrop={(e) => (e.preventDefault(), drop())}
            onDragEnd={() => (setDragging(null), setOver(null))}
            onMouseEnter={() => onHover(el.hidden ? null : el.id)}
            className={cn(
              "group/layer relative",
              // where the row will land
              dragging && over === i && "before:absolute before:inset-x-1 before:-top-px before:h-0.5 before:rounded-full before:bg-primary",
              dragging && over === i + 1 && i === rows.length - 1 && "after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary",
            )}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label={labelOf(el)}
              aria-pressed={isSel}
              onClick={(e) => !el.hidden && setSelected(e.shiftKey ? (isSel ? selected.filter((id) => id !== el.id) : [...selected, el.id]) : [el.id])}
              onKeyDown={(e) => e.key === "Enter" && !el.hidden && setSelected([el.id])}
              className={cn(
                "flex h-9 cursor-grab items-center gap-2 rounded-lg pl-1.5 pr-1 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing",
                isSel && "bg-muted font-medium",
                dragging === el.id && "opacity-40",
              )}
            >
              <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5 shrink-0 text-muted-foreground/60 opacity-0 group-hover/layer:opacity-100" />
              <HugeiconsIcon icon={ICON[el.kind]} className={cn("size-4 shrink-0", isSel ? "text-foreground" : "text-muted-foreground")} />
              <span className={cn("min-w-0 flex-1 truncate", el.hidden && "text-muted-foreground/60")}>{labelOf(el)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={el.hidden ? "Show" : "Hide"}
                    onClick={(e) => (e.stopPropagation(), toggle(el))}
                    className={cn("size-7 text-muted-foreground", !el.hidden && "opacity-0 group-hover/layer:opacity-100 focus-visible:opacity-100")}
                  >
                    <HugeiconsIcon icon={el.hidden ? ViewOffSlashIcon : ViewIcon} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{el.hidden ? "Show" : "Hide"}</TooltipContent>
              </Tooltip>
              {/* the thumbnail strip is part of every video, so it can't be deleted */}
              {el.kind !== "strip" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        setElements((els) => els.filter((x) => x.id !== el.id))
                        setSelected(selected.filter((id) => id !== el.id))
                        onHover(null)
                      }}
                      className="size-7 text-muted-foreground opacity-0 hover:text-destructive group-hover/layer:opacity-100 focus-visible:opacity-100"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
