import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ensureFont } from "@/lib/fonts"
import { BUTTON_SIZE, BUTTON_STYLES, defaultBorder, DEFAULT_BOLD, FONTS, TEXT_STYLES, type CanvasElement, type Feed } from "@/components/editor/elements"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { parse, toHex } from "@/components/editor/color-picker"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ArrowUpRight01Icon, BracesIcon, Link04Icon, PencilEdit01Icon, Tick02Icon, Unlink04Icon } from "@hugeicons/core-free-icons"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Corner = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"
/** middle-of-side handles: resize one dimension only (images and buttons) */
const SIDES: Corner[] = ["n", "s", "e", "w"]
const sidePos = (c: Corner) =>
  cn(
    "absolute z-10 rounded-full border border-primary bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-[opacity,background-color] hover:bg-primary",
    c === "n" || c === "s" ? "left-1/2 h-1.5 w-4 -translate-x-1/2 cursor-ns-resize" : "top-1/2 h-4 w-1.5 -translate-y-1/2 cursor-ew-resize",
    c === "n" && "-top-[4px]",
    c === "s" && "-bottom-[4px]",
    c === "e" && "-right-[4px]",
    c === "w" && "-left-[4px]",
  )
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"]

const HANDLE = "absolute z-10 size-2.5 rounded-full border border-primary bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-colors hover:bg-primary"
const handlePos = (c: Corner) => // corners only
  cn(
    c.includes("n") ? "-top-[5px]" : "-bottom-[5px]",
    c.includes("w") ? "-left-[5px]" : "-right-[5px]",
    c === "nw" || c === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize",
  )

const ANCHOR = { left: "0%", center: "-50%", right: "-100%" } as const
const ALIGN_TEXT = { left: "text-left", center: "text-center", right: "text-right" } as const

/**
 * Elements layer over the video.
 * - click selects; click again on selected text or a button to edit it
 * - Shift + click adds or removes elements from the selection; selected elements move and scale together
 * - drag moves; white corner handles scale (images resize, text and buttons change font size)
 * - Delete / Backspace removes, Esc deselects
 * Positions and sizes are % of the frame (cqw for font sizes), so everything scales with any format.
 */
export function CanvasStage({
  elements,
  setElements,
  selected,
  setSelected,
  editing,
  setEditing,
  ratio,
  thumbs,
  activeThumb,
  feedOf,
  onEditFeed,
  onFeedValue,
  feeds = [],
  onAddFeed,
  onSeedFeed,
  onRenameFeed,
  onDeleteFeed,
  readOnly,
  onThumb,
  hovered,
  selectedThumb,
  onSelectThumb,
}: {
  /** one thumbnail picked inside a selected strip */
  selectedThumb?: number | null
  /** a thumbnail in the selected strip was clicked (not dragged) */
  onSelectThumb?: (i: number) => void
  /** element hovered in the Layers panel: outlined on the canvas */
  hovered?: string | null
  /** linked text was edited on the canvas: this video's value for the feed */
  onFeedValue?: (id: string, value: string) => void
  /** preview: nothing can be selected or moved; thumbnails and button links work like they will for viewers */
  readOnly?: boolean
  onThumb?: (i: number) => void
  /** a linked element was clicked to edit: show its feed's value field */
  onEditFeed?: (id: string) => void
  /** frame width / height */
  ratio: number
  /** one entry per video (main + variations), for thumbnail strips */
  thumbs: { poster?: string }[]
  /** which thumbnail is this slide's own video */
  activeThumb: number
  /** every feed, and how to make and fill one (for the feed buttons on the canvas) */
  feeds?: Feed[]
  onAddFeed?: (f: Omit<Feed, "id">) => string
  /** fills a newly linked feed's empty values */
  onSeedFeed?: (id: string, value: string) => void
  onRenameFeed?: (id: string, name: string) => void
  onDeleteFeed?: (id: string) => void
  /** a feed's name and its value on this video */
  feedOf: (id: string) => { name: string; value: string } | undefined
  elements: CanvasElement[]
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>
  selected: string[]
  setSelected: (ids: string[]) => void
  editing: string | null
  setEditing: (id: string | null) => void
}) {
  const stage = useRef<HTMLDivElement>(null)
  // alignment guides shown while dragging (px from the frame's top-left)
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] })
  // something is being dragged: floating bits (the link box) step aside
  const [moving, setMoving] = useState(false)
  const update = (id: string, patch: Partial<CanvasElement>) =>
    setElements((els) => els.map((x) => (x.id === id ? ({ ...x, ...patch } as CanvasElement) : x)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected.length || editing) return
      const t = e.target as HTMLElement
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return
      // keys inside the toolbar, its popovers or menus belong to them (Esc closes the popover, not the selection)
      if (e.defaultPrevented || t.closest?.("[role=toolbar],[data-slot=popover-content],[role=menu],[role=dialog]")) return
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        // the thumbnail strip stays
        setElements((els) => els.filter((x) => !selected.includes(x.id) || x.kind === "strip"))
        setSelected([])
      }
      if (e.key === "Escape") setSelected([])
      // Cmd/Ctrl+D duplicates (the strip stays one)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault()
        const copies = elements.filter((x) => selected.includes(x.id) && x.kind !== "strip").map((x) => ({ ...x, id: crypto.randomUUID(), x: Math.min(100, x.x + 3), y: Math.min(100, x.y + 3) }) as CanvasElement)
        if (!copies.length) return
        setElements((els) => [...els, ...copies])
        setSelected(copies.map((c) => c.id))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const onPointerDown = (e: React.PointerEvent, el: CanvasElement) => {
    if (readOnly) {
      const i = (e.target as HTMLElement).closest<HTMLElement>("[data-thumb]")?.dataset.thumb
      if (i !== undefined) onThumb?.(Number(i))
      if (el.kind === "button") {
        const url = el.linkFeed ? feedOf(el.linkFeed)?.value : el.link
        if (url) window.open(url, "_blank", "noopener")
      }
      return
    }
    if (editing === el.id) return
    e.stopPropagation()
    const wasSelected = selected.length === 1 && selected[0] === el.id
    let group: string[]
    if (e.shiftKey) {
      // Shift toggles the element in the selection
      if (selected.includes(el.id)) return setSelected(selected.filter((id) => id !== el.id))
      group = [...selected, el.id]
    } else {
      // clicking one of several selected elements keeps the group so it can be dragged together
      group = selected.includes(el.id) ? selected : [el.id]
    }
    setSelected(group)
    setEditing(null)
    const rect = stage.current!.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, ex: el.x, ey: el.y }
    const starts = elements.filter((x) => group.includes(x.id)).map((x) => ({ id: x.id, x: x.x, y: x.y }))
    let moved = false
    // free strip: once selected, dragging a thumbnail moves just that one
    const thumb = (e.target as HTMLElement).closest<HTMLElement>("[data-thumb]")?.dataset.thumb
    if (el.kind === "strip" && el.layout === "free" && wasSelected && thumb !== undefined) {
      const i = Number(thumb)
      const offsets = freeOffsets(el, thumbs.length, ratio)
      const move = (ev: PointerEvent) => {
        const next = offsets.map((o, j) =>
          j === i ? { x: o.x + ((ev.clientX - start.x) / rect.width) * 100, y: o.y + ((ev.clientY - start.y) / rect.width) * 100 } : o,
        )
        // keep offsets positive by moving the strip's corner instead
        const mx = Math.min(...next.map((o) => o.x))
        const my = Math.min(...next.map((o) => o.y))
        update(el.id, { free: next.map((o) => ({ x: o.x - mx, y: o.y - my })), x: start.ex + mx, y: start.ey + my * ratio } as Partial<CanvasElement>)
      }
      let dragged = false
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        // a click (no drag) picks the thumbnail
        if (!dragged && Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) <= 3) onSelectThumb?.(i)
      }
      const moveTrack = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 3) dragged = true
      }
      window.addEventListener("pointermove", moveTrack)
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
      window.addEventListener("pointerup", () => window.removeEventListener("pointermove", moveTrack), { once: true })
      return
    }
    // snapping: edges and centres of the dragged box against the frame and every other element
    const boxOf = (id: string) => {
      const r = stage.current!.querySelector(`[data-el="${id}"]`)?.getBoundingClientRect()
      return r && { l: r.left - rect.left, t: r.top - rect.top, r: r.right - rect.left, b: r.bottom - rect.top }
    }
    const own = group.map(boxOf).filter(Boolean) as { l: number; t: number; r: number; b: number }[]
    const drag = {
      l: Math.min(...own.map((b) => b.l)),
      t: Math.min(...own.map((b) => b.t)),
      r: Math.max(...own.map((b) => b.r)),
      b: Math.max(...own.map((b) => b.b)),
    }
    const others = elements.filter((x) => !x.hidden && !group.includes(x.id)).map((x) => boxOf(x.id)).filter(Boolean) as typeof own
    const targetsX = [0, rect.width / 2, rect.width, ...others.flatMap((b) => [b.l, (b.l + b.r) / 2, b.r])]
    const targetsY = [0, rect.height / 2, rect.height, ...others.flatMap((b) => [b.t, (b.t + b.b) / 2, b.b])]
    const SNAP = 6 // px on screen
    /** nudge `d` so one of the box's lines lands on a target; returns the nudged offset and the lines it lines up with */
    const snap = (d: number, lines: number[], targets: number[]) => {
      let best = SNAP + 1
      let fix = 0
      for (const line of lines) for (const t of targets) if (Math.abs(t - (line + d)) < Math.abs(best)) (best = t - (line + d)), (fix = best)
      if (Math.abs(best) > SNAP) return { d, hits: [] as number[] }
      const nd = d + fix
      const hits = targets.filter((t) => lines.some((line) => Math.abs(t - (line + nd)) < 0.5))
      return { d: nd, hits: [...new Set(hits.map((h) => Math.round(h * 2) / 2))] }
    }

    const lockMove = makeAxisLock()
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 3) (moved = true), setMoving(true)
      if (!moved) return
      // a mostly straight drag stays on its axis (Shift locks it fully)
      const [rx, ry] = lockMove(ev.clientX - start.x, ev.clientY - start.y, ev.shiftKey)
      // hold Alt to move without snapping
      const sx = ev.altKey ? { d: rx, hits: [] } : snap(rx, [drag.l, (drag.l + drag.r) / 2, drag.r], targetsX)
      const sy = ev.altKey ? { d: ry, hits: [] } : snap(ry, [drag.t, (drag.t + drag.b) / 2, drag.b], targetsY)
      setGuides({ v: sx.hits, h: sy.hits })
      // one shared offset, limited so every element stays on the frame
      const dx = clamp((sx.d / rect.width) * 100, -Math.min(...starts.map((p) => p.x)), 100 - Math.max(...starts.map((p) => p.x)))
      const dy = clamp((sy.d / rect.height) * 100, -Math.min(...starts.map((p) => p.y)), 100 - Math.max(...starts.map((p) => p.y)))
      setElements((els) =>
        els.map((x) => {
          const p = starts.find((s) => s.id === x.id)
          return p ? ({ ...x, x: p.x + dx, y: p.y + dy } as CanvasElement) : x
        }),
      )
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      setGuides({ v: [], h: [] })
      setMoving(false)
      // a click on a thumbnail of the already selected strip picks that thumbnail
      if (!moved && wasSelected && !e.shiftKey && el.kind === "strip" && thumb !== undefined) onSelectThumb?.(Number(thumb))
      // a second click on a selected text or button (without dragging) starts editing;
      // linked text edits this video's feed value
      if (!moved && wasSelected && !e.shiftKey && (el.kind === "text" || (el.kind === "button" && el.variant !== "icon"))) setEditing(el.id)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const onResize = (e: React.PointerEvent, el: CanvasElement, corner: Corner, box: HTMLElement) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = stage.current!.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const sx = corner.includes("e") ? 1 : -1
    const sy = corner.includes("s") ? 1 : -1
    // a side handle only moves its own edge
    const side = corner.length === 1
    const onlyY = corner === "n" || corner === "s"
    const onlyX = corner === "e" || corner === "w"
    if (side) setResizingSide(true)
    const start = { x: e.clientX, y: e.clientY }
    const align = alignOf(el)
    // centre-anchored elements grow on both sides, so a corner drag counts double
    const kx = align === "center" ? 2 : 1
    const snapshot = el
    const min = buttonMin(box)
    // near the image's own shape, the size snaps to it (within a few px on screen)
    let imgRatio: number | undefined // height / width of the button's image
    if (snapshot.kind === "button" && snapshot.bgImage) {
      const img = new Image()
      img.onload = () => img.naturalWidth && (imgRatio = img.naturalHeight / img.naturalWidth)
      img.src = snapshot.bgImage
      if (img.complete && img.naturalWidth) imgRatio = img.naturalHeight / img.naturalWidth
    }
    const lockResize = makeAxisLock()
    // the image-shape snap holds once caught (in screen px)
    const shapeSnap = makeStickySnap()
    // snapping while resizing: the moving edge lands on other elements' edges and centres, or the frame's
    const rel = { l: b.left - rect.left, r: b.right - rect.left, t: b.top - rect.top, b: b.bottom - rect.top }
    const others = elements
      .filter((x) => !x.hidden && x.id !== el.id)
      .map((x) => stage.current!.querySelector(`[data-el="${x.id}"]`)?.getBoundingClientRect())
      .filter(Boolean)
      .map((o) => ({ l: o!.left - rect.left, r: o!.right - rect.left, t: o!.top - rect.top, b: o!.bottom - rect.top }))
    const tx = [0, rect.width / 2, rect.width, ...others.flatMap((o) => [o.l, (o.l + o.r) / 2, o.r])]
    const ty = [0, rect.height / 2, rect.height, ...others.flatMap((o) => [o.t, (o.t + o.b) / 2, o.b])]
    const edgeX = corner.includes("e") ? rel.r : rel.l
    const edgeY = corner.includes("s") ? rel.b : rel.t
    /** nudge the pointer delta so the moving edge sits on the nearest target within 6px */
    const snapEdge = (d: number, edge: number, targets: number[]) => {
      let best: number | null = null
      for (const t of targets) if (Math.abs(t - (edge + d)) <= 6 && (best === null || Math.abs(t - (edge + d)) < Math.abs(best - (edge + d)))) best = t
      return best === null ? { d, hit: null } : { d: best - edge, hit: best }
    }
    const move = (ev: PointerEvent) => {
      // pulling a corner mostly sideways (or mostly up/down) changes just that side
      let [ax, ay] = side ? [ev.clientX - start.x, ev.clientY - start.y] : lockResize(ev.clientX - start.x, ev.clientY - start.y, false)
      // Alt places freely; the strip and an axis that isn't moving don't snap
      const guideV: number[] = []
      const guideH: number[] = []
      if (!ev.altKey && snapshot.kind !== "strip") {
        if (!onlyY && ax !== 0) {
          const sxr = snapEdge(ax, edgeX, tx)
          ax = sxr.d
          if (sxr.hit !== null) guideV.push(sxr.hit)
        }
        if (!onlyX && ay !== 0 && snapshot.kind !== "text") {
          const syr = snapEdge(ay, edgeY, ty)
          ay = syr.d
          if (syr.hit !== null) guideH.push(syr.hit)
        }
      }
      setGuides({ v: guideV, h: guideH })
      const dx = onlyY ? 0 : ax * sx
      const dy = onlyX ? 0 : ay * sy
      if (side && snapshot.kind === "text") {
        // text box: the side handle sets the box width and the text wraps; font size stays
        const W = Math.max(rect.width * 0.08, b.width + dx)
        const gw = W - b.width
        const dirX = corner === "e" ? 1 : -1
        const shiftX = align === "center" ? (dirX * gw) / 2 : align === "left" ? (dirX < 0 ? -gw : 0) : dirX > 0 ? gw : 0
        update(el.id, { x: snapshot.x + (shiftX / rect.width) * 100, w: Math.min(100, (W / rect.width) * 100) } as Partial<CanvasElement>)
      } else if (side && (snapshot.kind === "image" || snapshot.kind === "button")) {
        // side handle: only that edge moves; the opposite edge stays where it is
        const minW = snapshot.kind === "image" ? rect.width * 0.05 : min.w
        const minH = snapshot.kind === "image" ? rect.height * 0.05 : min.h
        let W = onlyX ? Math.max(minW, b.width + dx) : b.width
        let H = onlyY ? Math.max(minH, b.height + dy) : b.height
        if (snapshot.kind === "image") {
          if (snapshot.lock) {
            // a locked image keeps its shape
            if (onlyX) H = (b.height * W) / b.width
            else W = (b.width * H) / b.height
          } else if (onlyY && !ev.altKey) H = shapeSnap(H, W / snapshot.ar)
        } else if (onlyY && imgRatio && !ev.altKey) H = Math.max(minH, shapeSnap(H, W * imgRatio))
        // move the anchor (x is the left/centre/right point by alignment, y the vertical centre) to pin the far edge
        const gw = W - b.width
        const gh = H - b.height
        const dirX = corner === "e" ? 1 : corner === "w" ? -1 : 0
        const dirY = corner === "s" ? 1 : corner === "n" ? -1 : 0
        const shiftX = align === "center" ? (dirX * gw) / 2 : align === "left" ? (dirX < 0 ? -gw : 0) : dirX > 0 ? gw : 0
        const shiftY = (dirY * gh) / 2
        update(el.id, {
          x: snapshot.x + (shiftX / rect.width) * 100,
          y: snapshot.y + (shiftY / rect.height) * 100,
          w: (W / rect.width) * 100,
          h: (H / rect.height) * 100,
        } as Partial<CanvasElement>)
      } else if (snapshot.kind === "image" && onlyY) {
        // top/bottom: height leads (a locked image keeps its shape)
        let h = clamp(snapshot.h + ((dy * 2) / rect.height) * 100, 5, 200)
        if (!snapshot.lock && !ev.altKey) {
          // the dragged height still catches the image's own shape
          const natural = (snapshot.w * (rect.width / rect.height)) / snapshot.ar
          h = (shapeSnap((h / 100) * rect.height, (natural / 100) * rect.height) / rect.height) * 100
        }
        update(el.id, { h, w: snapshot.lock ? (snapshot.w * h) / snapshot.h : snapshot.w })
      } else if (snapshot.kind === "image") {
        // Shift keeps the aspect ratio even when it's unlocked
        const w = clamp(snapshot.w + ((dx * 2) / rect.width) * 100, 5, 200)
        let h = snapshot.lock || ev.shiftKey ? (snapshot.h * w) / snapshot.w : onlyX ? snapshot.h : clamp(snapshot.h + ((dy * 2) / rect.height) * 100, 5, 200)
        // unlocked: snap to the image's own aspect ratio when close
        const natural = (w * (rect.width / rect.height)) / snapshot.ar
        if (!snapshot.lock && !ev.shiftKey && !ev.altKey && !onlyX) h = (shapeSnap((h / 100) * rect.height, (natural / 100) * rect.height) / rect.height) * 100
        update(el.id, { w, h })
      } else if (snapshot.kind === "button") {
        // buttons resize freely; never smaller than their label needs
        let w = Math.max(min.w, b.width + dx * kx)
        let h = Math.max(min.h, b.height + dy * 2)
        if (ev.shiftKey && !side) {
          // Shift keeps the aspect ratio
          const k = Math.max((b.width + dx * kx) / b.width, min.w / b.width, min.h / b.height)
          w = b.width * k
          h = b.height * k
        } else if (imgRatio && !ev.altKey && !onlyX && w * imgRatio >= min.h) {
          // image buttons: snap to the image's own shape when close
          h = shapeSnap(h, w * imgRatio)
        }
        update(el.id, { w: (w / rect.width) * 100, h: (h / rect.height) * 100 })
      } else if (snapshot.kind === "strip") {
        // thumbnails scale together (strips are anchored top-left)
        const size = clamp((snapshot.size * (b.width + dx)) / b.width, 3, 40)
        const k = size / snapshot.size
        update(el.id, { size, free: snapshot.free?.map((o) => ({ x: o.x * k, y: o.y * k })) } as Partial<CanvasElement>)
      } else {
        const base = snapshot.size ?? (snapshot.kind === "text" ? TEXT_STYLES.find((t) => t.variant === snapshot.variant)!.size : BUTTON_SIZE)
        const size = clamp((base * (b.width + dx * kx)) / b.width, 1, 30)
        // a text box with a set width grows with its text, so the lines wrap the same
        const k = size / base
        update(el.id, { size, ...(snapshot.kind === "text" && snapshot.w !== undefined ? { w: Math.min(100, snapshot.w * k) } : {}) } as Partial<CanvasElement>)
      }
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      setResizingSide(false)
      setGuides({ v: [], h: [] })
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }
  const [resizingSide, setResizingSide] = useState(false)

  // Selection outlines and handles live in an unclipped layer above the clipped content,
  // so an element hanging off the frame is hidden but its outline and corners stay visible.
  type Box = { id: string; l: number; t: number; w: number; h: number }
  const [boxes, setBoxes] = useState<Box[]>([])
  // the element under the pointer, and whether a side handle is hovered (side handles show on hover)
  const [hoverEl, setHoverEl] = useState<string | null>(null)
  const [onSide, setOnSide] = useState(false)
  const measure = () => {
    const st = stage.current
    if (!st) return
    const sr = st.getBoundingClientRect()
    const next = selected
      .map((id) => {
        const r = st.querySelector(`[data-el="${id}"]`)?.getBoundingClientRect()
        return r && { id, l: r.left - sr.left, t: r.top - sr.top, w: r.width, h: r.height }
      })
      .filter(Boolean) as Box[]
    setBoxes((prev) => {
      const same = next.length === prev.length && next.every((n, i) => n.id === prev[i].id && Math.abs(n.l - prev[i].l) + Math.abs(n.t - prev[i].t) + Math.abs(n.w - prev[i].w) + Math.abs(n.h - prev[i].h) < 0.5)
      return same ? prev : next
    })
  }
  // after every render
  useLayoutEffect(measure)
  // and whenever a selected element changes size on its own (typing that wraps to a new line,
  // fonts loading): the observer fires before paint, so the outline keeps up instantly
  useLayoutEffect(() => {
    const st = stage.current
    if (!st || !selected.length) return
    const ro = new ResizeObserver(measure)
    for (const id of selected) {
      const node = st.querySelector(`[data-el="${id}"]`)
      if (node) ro.observe(node)
    }
    // typing in place: catch every keystroke too
    st.addEventListener("input", measure)
    return () => (ro.disconnect(), st.removeEventListener("input", measure))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(","), editing])
  const groupBox =
    boxes.length > 1
      ? {
          l: Math.min(...boxes.map((x) => x.l)),
          t: Math.min(...boxes.map((x) => x.t)),
          r: Math.max(...boxes.map((x) => x.l + x.w)),
          b: Math.max(...boxes.map((x) => x.t + x.h)),
        }
      : null

  const onGroupResize = (e: React.PointerEvent, corner: Corner) => {
    if (!groupBox) return
    e.stopPropagation()
    e.preventDefault()
    const rect = stage.current!.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    // scale around the opposite corner
    const ax = corner.includes("e") ? groupBox.l : groupBox.r
    const ay = corner.includes("s") ? groupBox.t : groupBox.b
    const sx = corner.includes("e") ? 1 : -1
    const gw = groupBox.r - groupBox.l
    const startX = e.clientX
    const snap = elements.filter((x) => selected.includes(x.id))
    const move = (ev: PointerEvent) => {
      const k = Math.max(0.1, (gw + (ev.clientX - startX) * sx) / gw)
      setElements((els) =>
        els.map((x) => {
          const o = snap.find((s) => s.id === x.id)
          if (!o) return x
          const pos = { x: ((ax + ((o.x / 100) * W - ax) * k) / W) * 100, y: ((ay + ((o.y / 100) * H - ay) * k) / H) * 100 }
          if (o.kind === "image") return { ...o, ...pos, w: o.w * k, h: o.h * k }
          if (o.kind === "strip") return { ...o, ...pos, size: o.size * k, gap: o.gap * k, free: o.free?.map((f) => ({ x: f.x * k, y: f.y * k })) }
          const base = o.size ?? (o.kind === "text" ? TEXT_STYLES.find((t) => t.variant === o.variant)!.size : BUTTON_SIZE)
          if (o.kind === "button")
            return { ...o, ...pos, size: base * k, ...(o.w !== undefined ? { w: o.w * k, h: (o.h ?? 0) * k } : {}), ...(o.borderWidth !== undefined ? { borderWidth: o.borderWidth * k } : {}) }
          return { ...o, ...pos, size: base * k }
        }),
      )
    }
    const up = () => (window.removeEventListener("pointermove", move), window.removeEventListener("pointerup", up))
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const single = selected.length === 1 ? elements.find((x) => x.id === selected[0]) : undefined
  return (
    <>
    {/* content is clipped to the frame */}
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      onPointerOver={(e) => setHoverEl((e.target as HTMLElement).closest<HTMLElement>("[data-el]")?.dataset.el ?? null)}
      onPointerLeave={() => setHoverEl(null)}
      onPointerDown={() => !document.body.dataset.picking && (setSelected([]), setEditing(null))}>
      {elements.filter((el) => !el.hidden).map((el) => (
        <ElementBox
          key={el.id}
          el={el}
          hovered={hovered === el.id}
          selected={selected.includes(el.id)}
          editing={editing === el.id}
          onPointerDown={(e) => onPointerDown(e, el)}
          onResize={(e, c, box) => onResize(e, el, c, box)}
          onText={(text) => {
            const linked = (el.kind === "text" || el.kind === "button") && el.feed ? feedOf(el.feed) : undefined
            if (!linked) return update(el.id, { text } as Partial<CanvasElement>)
            // left untouched while it still showed the feed's name: keep it empty
            if (text !== `{${linked.name}}`) onFeedValue?.((el as { feed: string }).feed, text)
          }}
          onEndEdit={() => setEditing(null)}
          strip={{ ratio, thumbs, active: activeThumb, editable: !readOnly && selected.length === 1 && selected[0] === el.id, picked: selectedThumb ?? null }}
          readOnly={readOnly}
          feed={(el.kind === "text" || el.kind === "button") && el.feed ? feedOf(el.feed) : undefined}
          linkFeed={el.kind === "button" && el.linkFeed ? feedOf(el.linkFeed)?.name : undefined}
          onBadge={(which) => {
            const id = which === "link" && el.kind === "button" ? el.linkFeed : (el as { feed?: string }).feed
            if (id) onEditFeed?.(id)
          }}
        />
      ))}
    </div>

    {/* feed tabs on the top edge of the selected text or button: under the corner handles */}
    <div data-keep-selection className="pointer-events-none absolute inset-0 z-10">
      {/* the feed for a text or a button label: a tab on its top edge */}
      {single && (single.kind === "text" || (single.kind === "button" && single.variant !== "icon")) && !readOnly && !moving && onAddFeed &&
        boxes.filter((x) => x.id === single.id).map((x) => (
          <div key={`feed-${single.id}`} className="pointer-events-auto absolute" style={{ left: x.l - 0.5, top: x.t + 0.5, transform: "translateY(-100%)" }}>
            <FeedTab type="text" el={single} feeds={feeds} feedOf={feedOf} onAddFeed={onAddFeed} onSeed={onSeedFeed} onPatch={(p) => update(single.id, p)} onOpenPanel={onEditFeed} onRename={onRenameFeed} onDelete={onDeleteFeed} />
          </div>
        ))}
    </div>

    {/* outlines + corner handles, not clipped */}
    <div aria-hidden data-keep-selection className="pointer-events-none absolute inset-0 z-20">
      {/* alignment guides while dragging */}
      {guides.v.map((x) => (
        <span key={`v${x}`} className="absolute inset-y-0 w-px -translate-x-1/2 bg-rose-500" style={{ left: x }} />
      ))}
      {guides.h.map((y) => (
        <span key={`h${y}`} className="absolute inset-x-0 h-px -translate-y-1/2 bg-rose-500" style={{ top: y }} />
      ))}
      {boxes.map((x) => (
        <div key={x.id} className="absolute outline-1 outline-solid outline-primary" style={{ left: x.l, top: x.t, width: x.w, height: x.h }}>
          {single && single.id === x.id && editing !== x.id &&
            CORNERS.map((c) => (
              <span
                key={c}
                onPointerDown={(e) => onResize(e, single, c, stage.current!.querySelector<HTMLElement>(`[data-el="${x.id}"]`)!)}
                className={cn(HANDLE, "pointer-events-auto", handlePos(c))}
              />
            ))}
          {/* images and buttons: side handles appear on hover and stretch one way */}
          {single && single.id === x.id && editing !== x.id && (single.kind === "image" || single.kind === "button" || single.kind === "text") &&
            (single.kind === "text" ? (["e", "w"] as Corner[]) : SIDES).map((c) => (
              <span
                key={c}
                onPointerEnter={() => setOnSide(true)}
                onPointerLeave={() => setOnSide(false)}
                onPointerDown={(e) => onResize(e, single, c, stage.current!.querySelector<HTMLElement>(`[data-el="${x.id}"]`)!)}
                className={cn(sidePos(c), "pointer-events-auto", hoverEl === x.id || onSide || resizingSide ? "opacity-100" : "opacity-0")}
              />
            ))}
        </div>
      ))}
      {groupBox && (
        <div
          className="absolute outline-1 outline-solid outline-primary"
          style={{ left: groupBox.l, top: groupBox.t, width: groupBox.r - groupBox.l, height: groupBox.b - groupBox.t }}
        >
          {CORNERS.map((c) => (
            <span key={c} onPointerDown={(e) => onGroupResize(e, c)} className={cn(HANDLE, "pointer-events-auto", handlePos(c))} />
          ))}
        </div>
      )}
    </div>

    {/* floating link box, outside the aria-hidden outline layer so it can be used */}
    <div data-keep-selection className="pointer-events-none absolute inset-0 z-30">
      {/* a button's link, floating by it: the edit card when it has none, a link chip when it does */}
      {single && single.kind === "button" && !readOnly && editing !== single.id && !moving &&
        boxes.filter((x) => x.id === single.id).map((x) => (
          <ButtonLinkFloat
            key={single.id}
            el={single}
            box={x}
            feedOf={feedOf}
            onPatch={(p) => update(single.id, p)}
            onFeedValue={onFeedValue}
            feedTab={
              onAddFeed && (
                <FeedTab type="link" el={single} feeds={feeds} feedOf={feedOf} onAddFeed={onAddFeed} onSeed={onSeedFeed} onPatch={(p) => update(single.id, p)} onOpenPanel={onEditFeed} onRename={onRenameFeed} onDelete={onDeleteFeed} />
              )
            }
          />
        ))}

    </div>
    </>
  )
}

function ElementBox({
  el,
  selected,
  editing,
  onPointerDown,
  onResize,
  onText,
  onEndEdit,
  strip,
  feed,
  linkFeed,
  onBadge,
  readOnly,
  hovered,
}: {
  /** hovered in the Layers panel */
  hovered?: boolean
  readOnly?: boolean
  onBadge: (which: "text" | "link") => void
  strip: StripCtx
  feed?: { name: string; value: string }
  linkFeed?: string
  el: CanvasElement
  selected: boolean
  editing: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onResize: (e: React.PointerEvent, c: Corner, box: HTMLElement) => void
  onText: (t: string) => void
  onEndEdit: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const align = alignOf(el)
  const size = useSize(box)
  const sized = el.kind === "image" || (el.kind === "button" && el.w !== undefined)
  return (
    <div
      ref={box}
      role="button"
      tabIndex={0}
      aria-label={`${el.kind} element`}
      aria-pressed={selected}
      data-el={el.id}
      onPointerDown={onPointerDown}
      className={cn(
        "group/el absolute select-none",
        readOnly ? (el.kind === "strip" || el.kind === "button" ? "cursor-pointer" : "cursor-default") : editing ? "cursor-text" : "cursor-move",
        // no padding: the outline hugs the element
        // the selected outline is drawn in the unclipped layer
        selected || readOnly ? "outline-none" : "outline-none hover:outline-2 hover:outline-solid hover:outline-primary/70",
        hovered && !selected && !readOnly && "outline-2 outline-solid outline-primary/70",
      )}
      style={{
        left: `${el.x}%`,
        top: `${el.y}%`,
        width: sized || (el.kind === "text" && el.w !== undefined) ? `${el.w}%` : undefined,
        height: sized ? `${el.h}%` : undefined,
        // a resized button still never gets smaller than its label
        minWidth: el.kind === "button" && el.variant !== "icon" && sized ? "max-content" : undefined,
        minHeight: el.kind === "button" && sized ? "max-content" : undefined,
        transform: el.kind === "strip" ? undefined : `translate(${ANCHOR[align]}, -50%)`,
      }}
    >
      {el.kind === "strip" ? (
        <StripView el={el} {...strip} />
      ) : (
        <ElementView
          el={el}
          editing={editing}
          onText={onText}
          onEndEdit={onEndEdit}
          radiusPx={radiusPx(el, size)}
          sized={sized}
          // linked text shows this video's feed value (or the feed name until one is set)
          display={feed ? feed.value || `{${feed.name}}` : undefined}
        />
      )}
      {(feed || linkFeed) && !readOnly && (
        // feed badges only while the element is hovered or selected
        <span className={cn("absolute bottom-full left-0 gap-1", selected || editing ? "hidden" : "hidden group-hover/el:flex")}>
          {(
            [
              ["text", feed?.name],
              ["link", linkFeed],
            ] as const
          )
            .filter(([, n]) => n)
            .map(([which, n]) => (
              // click a badge to edit that feed's value
              <span
                key={which}
                title={`Feed: ${n}`}
                onPointerDown={(e) => (e.stopPropagation(), onBadge(which))}
                className="flex cursor-pointer items-center whitespace-nowrap rounded-t-md bg-neutral-800 px-1.5 py-1 text-[10px] font-medium leading-none text-white shadow-sm hover:bg-neutral-700"
              >
                {n}
              </span>
            ))}
        </span>
      )}

    </div>
  )
}

const alignOf = (el: CanvasElement) => (el.kind === "text" || el.kind === "button" ? (el.align ?? "center") : el.kind === "strip" ? "left" : "center")

type StripCtx = {
  ratio: number
  thumbs: { poster?: string }[]
  active: number
  /** the strip is selected: thumbnails outline on hover and can be picked */
  editable?: boolean
  /** the picked thumbnail */
  picked?: number | null
}
type StripEl = Extract<CanvasElement, { kind: "strip" }>

/** Free-layout offsets (cqw from the strip's top-left), filling in any thumbnails added since. */
export function freeOffsets(el: StripEl, count: number, ratio: number) {
  const step = el.size + el.gap / 10.8
  // thumbnails are square, so a vertical step is the same as a horizontal one (in cqw)
  void ratio
  return Array.from({ length: count }, (_, i) => el.free?.[i] ?? (el.layout === "vertical" ? { x: 0, y: i * step } : { x: i * step, y: 0 }))
}

/** Thumbnail strip: one thumbnail per video, this slide's own video highlighted. */
function StripView({ el, ratio, thumbs, active, editable, picked }: { el: StripEl } & StripCtx) {
  // square thumbnails, whatever the frame's shape
  void ratio
  const h = el.size
  const radius = ((el.radius / 100) * Math.min(el.size, h)) / 2
  const free = el.layout === "free"
  const { a: alpha, ...rest } = parse(el.bg)
  const solid = toHex({ ...rest, a: 1 })
  const offsets = free ? freeOffsets(el, thumbs.length, ratio) : []
  return (
    <div
      className={cn("relative flex", el.layout === "vertical" && "flex-col")}
      style={{
        gap: `${el.gap / 10.8}cqw`,
        ...(free
          ? { width: `${Math.max(...offsets.map((o) => o.x)) + el.size}cqw`, height: `${Math.max(...offsets.map((o) => o.y)) + h}cqw` }
          : {}),
      }}
    >
      {thumbs.map((t, i) => (
        <span
          key={i}
          data-thumb={i}
          className="group/thumb relative block shrink-0 overflow-hidden"
          style={{
            width: `${el.size}cqw`,
            height: `${h}cqw`,
            borderRadius: `${radius}cqw`,
            // the background colour's opacity fades the other thumbnails; the colour itself stays solid
            background: solid,
            opacity: i === active ? 1 : alpha,
            outline: i === active && el.highlightWidth > 0 ? `${el.highlightWidth / 10.8}cqw solid ${el.highlight}` : undefined,
            ...(free ? { position: "absolute", left: `${offsets[i].x}cqw`, top: `${offsets[i].y}cqw` } : {}),
          }}
        >
          {t.poster && <img src={t.poster} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />}
          {/* strip selected: each thumbnail outlines on hover; the picked one stays outlined */}
          {editable && (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 ring-2 ring-inset transition-opacity",
                picked === i ? "opacity-100 ring-primary" : "opacity-0 ring-primary/70 group-hover/thumb:opacity-100",
              )}
              style={{ borderRadius: `${radius}cqw` }}
            />
          )}
        </span>
      ))}
    </div>
  )
}

/** Radius in px from a 0–100% value: 100% is half the shorter side. */
export function radiusPx(el: CanvasElement, size: { w: number; h: number }) {
  if (el.kind === "text" || el.kind === "strip" || el.radius === undefined) return undefined
  return (el.radius / 100) * (Math.min(size.w, size.h) / 2)
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  // also measure right after each render, before paint, so sizes (and corner radius) never lag a frame behind
  useLayoutEffect(() => {
    const el = ref.current
    if (el && (el.offsetWidth !== size.w || el.offsetHeight !== size.h)) setSize({ w: el.offsetWidth, h: el.offsetHeight })
  })
  return size
}

/** Smallest box a button label fits in. */
function buttonMin(box: HTMLElement) {
  const text = box.querySelector<HTMLElement>("[data-text]")
  const arrow = box.querySelector<HTMLElement>("[data-arrow]")
  if (!text) return { w: 0, h: 0 }
  const gap = arrow ? parseFloat(getComputedStyle(arrow).marginLeft) || 0 : 0
  // include the border so it never overlaps the label
  const btn = getComputedStyle(text.parentElement!)
  const bx = parseFloat(btn.borderLeftWidth) + parseFloat(btn.borderRightWidth)
  const by = parseFloat(btn.borderTopWidth) + parseFloat(btn.borderBottomWidth)
  return { w: text.offsetWidth + (arrow ? arrow.offsetWidth + gap : 0) + bx, h: text.offsetHeight + by }
}

/** Inline style for the shared font options (undefined keeps the style's defaults). */
export function fontStyle(el: Extract<CanvasElement, { kind: "text" | "button" }>): React.CSSProperties {
  ensureFont(el.font)
  return {
    fontFamily: el.font ? FONTS.find((f) => f.name === el.font)?.stack : undefined,
    fontSize: `${el.size ?? (el.kind === "text" ? TEXT_STYLES.find((t) => t.variant === el.variant)!.size : BUTTON_SIZE)}cqw`,
    color: el.color,
    fontWeight: el.bold === undefined ? undefined : el.bold ? 700 : 400,
    fontStyle: el.italic ? "italic" : undefined,
    textDecoration: el.underline ? "underline" : undefined,
    textUnderlineOffset: el.underline ? "0.15em" : undefined,
  }
}

export const isBold = (el: Extract<CanvasElement, { kind: "text" | "button" }>) =>
  el.bold ?? (el.kind === "text" ? DEFAULT_BOLD[el.variant] : false)

function ElementView({
  el,
  editing,
  onText,
  onEndEdit,
  radiusPx,
  sized,
  display,
}: {
  display?: string
  el: Exclude<CanvasElement, { kind: "strip" }>
  editing: boolean
  onText: (t: string) => void
  onEndEdit: () => void
  radiusPx?: number
  sized: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const multiline = el.kind === "text"
  useEffect(() => {
    const node = ref.current
    if (!editing || !node) return
    node.focus()
    document.getSelection()?.selectAllChildren(node)
    // saved whenever editing ends: blur, a click anywhere outside, Esc, or deselecting
    return () => {
      const t = node.innerText.replace(/\n$/, "")
      onText(multiline ? t.replace(/^\s+|\s+$/g, "") : t.replace(/\s+/g, " ").trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  // remount after editing so React's text replaces whatever the browser inserted
  const editKey = editing ? "editing" : el.kind === "image" ? "" : (display ?? el.text)
  const editable = {
    ref,
    contentEditable: editing,
    suppressContentEditableWarning: true,
    onPointerDown: (e: React.PointerEvent) => editing && e.stopPropagation(),
    onBlur: () => editing && onEndEdit(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        // text: Enter is a new line; buttons stay on one line, so Enter finishes
        if (multiline) document.execCommand("insertLineBreak")
        else (e.currentTarget as HTMLElement).blur()
      }
      if (e.key === "Escape") (e.currentTarget as HTMLElement).blur()
    },
    // empty text keeps a caret-sized box so it stays visible and clickable
    className: "inline-block min-w-[2em] min-h-[1lh] outline-none",
    // inline-blocks don't receive the parent's underline, so take it over explicitly
    style: { textDecoration: "inherit" } as React.CSSProperties,
    "data-text": "",
  }

  if (el.kind === "image") {
    const { t, r, b, l } = el.crop
    return (
      <img
        src={el.src}
        alt=""
        draggable={false}
        className="block h-full w-full"
        style={{
          objectFit: el.fit,
          borderRadius: radiusPx,
          clipPath: t || r || b || l ? `inset(${t}% ${r}% ${b}% ${l}% round ${radiusPx ?? 0}px)` : undefined,
        }}
      />
    )
  }

  if (el.kind === "button" && el.variant === "icon") {
    // image only; a fixed square until it's resized
    return (
      <span
        aria-label="Icon button"
        className={cn("block rounded-full", sized ? "h-full w-full" : "size-[12cqw]")}
        style={{
          ...fontStyle(el),
          backgroundImage: `url(${el.bgImage})`,
          backgroundSize: el.bgFit ?? "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderRadius: radiusPx,
        }}
      />
    )
  }

  if (el.kind === "button") {
    const s = BUTTON_STYLES.find((b) => b.variant === el.variant)!
    return (
      <span
        className={cn(
          "inline-flex items-center whitespace-nowrap px-[1.2em] py-[0.6em] font-medium",
          s.className,
          sized && "h-full w-full justify-center px-0! py-0",
        )}
        style={{
          ...fontStyle(el),
          // the background image sits over the fill colour (the style's own colour unless one is picked)
          backgroundColor: el.bg,
          ...(el.bgImage
            ? { backgroundImage: `url(${el.bgImage})`, backgroundSize: el.bgFit ?? "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
            : {}),
          borderRadius: radiusPx,
          ...(el.borderWidth !== undefined || el.border !== undefined
            ? { borderStyle: "solid", borderWidth: `${(el.borderWidth ?? defaultBorder(el).width) / 10.8}cqw`, borderColor: el.border ?? defaultBorder(el).color }
            : {}),
        }}
      >
        <span key={editKey} {...editable}>{display ?? el.text}</span>
        {s.arrow && <span aria-hidden data-arrow className="ml-[0.4em]">→</span>}
      </span>
    )
  }

  const t = TEXT_STYLES.find((x) => x.variant === el.variant)!
  return (
    <span
      className={cn(
        "block whitespace-pre-line text-balance text-white",
        // a fixed-width box wraps the text; otherwise the box fits the text
        el.w !== undefined ? "w-full" : "w-max max-w-[84cqw]",
        ALIGN_TEXT[el.align ?? "center"],
        t.className,
      )}
      style={fontStyle(el)}
    >
      <span key={editKey} {...editable}>{display ?? el.text}</span>
    </span>
  )
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Soft axis lock for one drag: once it's clearly going one way, drift on the other axis is ignored.
 * It locks at a tight threshold and only lets go at a looser one, so it doesn't flick on and off
 * right at the edge. Shift locks fully.
 */
function makeAxisLock() {
  // decided once, when the drag first gets going; after that it only ever lets go (never re-locks),
  // so the element can't jump back and forth
  let axis: "x" | "y" | "free" | null = null
  return (dx: number, dy: number, hard: boolean): [number, number] => {
    const ax = Math.abs(dx)
    const ay = Math.abs(dy)
    if (hard) return ax >= ay ? [dx, 0] : [0, dy]
    if (axis === null && Math.max(ax, ay) > 16) axis = ay < ax * 0.25 ? "x" : ax < ay * 0.25 ? "y" : "free"
    if (axis === "x" && ay > Math.max(24, ax * 0.4)) axis = "free"
    if (axis === "y" && ax > Math.max(24, ay * 0.4)) axis = "free"
    if (axis === null) return [dx, dy]
    return axis === "x" ? [dx, 0] : axis === "y" ? [0, dy] : [dx, dy]
  }
}

/** Snap with hysteresis: catches within `enter` px, lets go only past `exit` px, so it doesn't flicker at the edge. */
function makeStickySnap(enter = 6, exit = 10) {
  let held = false
  return (value: number, target: number) => {
    const d = Math.abs(value - target)
    held = held ? d < exit : d < enter
    return held ? target : value
  }
}


/**
 * Floats by a selected button. No link yet: a link box with a tick (Enter works too).
 * With a link: a slim dark chip showing where it goes, with a pencil to edit.
 * A link that comes from a feed edits this variation's value.
 */
function ButtonLinkFloat({
  el,
  box,
  feedOf,
  onPatch,
  onFeedValue,
  feedTab,
}: {
  /** the link's feed tab, on the box's top edge */
  feedTab?: React.ReactNode
  el: Extract<CanvasElement, { kind: "button" }>
  box: { l: number; t: number; w: number; h: number }
  feedOf: (id: string) => { name: string; value: string } | undefined
  onPatch: (p: Partial<CanvasElement>) => void
  onFeedValue?: (id: string, value: string) => void
}) {
  const linkFeed = el.linkFeed ? feedOf(el.linkFeed) : undefined
  const link = (linkFeed ? linkFeed.value : el.link) ?? ""
  const setLink = (v: string) => (el.linkFeed && linkFeed ? onFeedValue?.(el.linkFeed, v) : onPatch({ link: v } as Partial<CanvasElement>))
  // no link yet: open the card straight away
  const [open, setOpen] = useState(!link.trim())
  const linkInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) setTimeout(() => linkInput.current?.focus(), 30)
  }, [open])

  // just under the button, clear of its handles (its feed badge sits above)
  const style: React.CSSProperties = { left: box.l + box.w / 2, top: box.t + box.h + (feedTab ? 34 : 14), transform: "translateX(-50%)" }
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  const host = link.replace(/^https?:\/\//, "").replace(/\/$/, "")

  if (!open)
    return (
      <div
        className="pointer-events-auto absolute flex h-9 max-w-80 items-center gap-1 rounded-xl bg-neutral-900 pl-3 pr-1 text-white shadow-lg ring-1 ring-white/10"
        style={style}
        onPointerDown={stop}
        onClick={stop}
      >
        {feedTab && <div className="absolute bottom-full left-3">{feedTab}</div>}
        {link.trim() ? (
          <a href={/^https?:/.test(link) ? link : `https://${link}`} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-medium text-sky-400 hover:underline" title={link}>
            {host}
          </a>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-white/80 hover:text-white">
            Add link
          </button>
        )}
        <button
          type="button"
          aria-label="Edit link"
          title="Edit link"
          onClick={() => setOpen(true)}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
        >
          <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
        </button>
      </div>
    )

  const done = () => setOpen(false)
  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === "Enter" || e.key === "Escape") (e.preventDefault(), done())
  }
  // just the link and a tick; Enter works too
  return (
    <div
      role="dialog"
      aria-label="Button link"
      className="pointer-events-auto absolute flex h-11 w-80 items-center gap-1 rounded-xl bg-popover pl-3 pr-1.5 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
      style={style}
      onPointerDown={stop}
      onClick={stop}
    >
      {feedTab && <div className="absolute bottom-full left-3">{feedTab}</div>}
      <HugeiconsIcon icon={Link04Icon} className="size-4 shrink-0 text-muted-foreground" />
      <input
        ref={linkInput}
        value={link}
        onChange={(e) => setLink(e.target.value)}
        onKeyDown={onKey}
        placeholder="Paste or type a link"
        inputMode="url"
        aria-label={linkFeed ? `Link for this variation (feed: ${linkFeed.name})` : "Button link"}
        title={linkFeed ? `This variation's link (feed: ${linkFeed.name})` : undefined}
        className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        aria-label="Done"
        title="Done (Enter)"
        onClick={done}
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background hover:bg-foreground/85"
      >
        <HugeiconsIcon icon={Tick02Icon} className="size-4" />
      </button>
    </div>
  )
}


/** The feeds icon: { } */
export const FEED_ICON = BracesIcon

/**
 * A feed tab on the top edge of a selected text, button or link box (like a label on the outline).
 * No feed: a small { }. With no feeds yet, one click makes one (text, label or link; then text-2…);
 * with feeds, it offers New feed or one to link to. Linked: just the feed's name, with a menu:
 * Open Feeds panel, New feed, Link to another Feed, Unlink. (Deleting a feed happens in the Feeds panel.)
 * Values are meant to be typed on the canvas, variation by variation; the side panel opens only on demand.
 */
function FeedTab({
  type,
  el,
  feeds,
  feedOf,
  onAddFeed,
  onSeed,
  onPatch,
  onOpenPanel,
}: {
  type: Feed["type"]
  el: Extract<CanvasElement, { kind: "text" | "button" }>
  feeds: Feed[]
  feedOf: (id: string) => { name: string; value: string } | undefined
  onAddFeed: (f: Omit<Feed, "id">) => string
  onSeed?: (id: string, value: string) => void
  onPatch: (p: Partial<CanvasElement>) => void
  /** shows this feed's values in the side panel */
  onOpenPanel?: (id: string) => void
  onRename?: (id: string, name: string) => void
  onDelete?: (id: string) => void
}) {
  const isLink = type === "link"
  const current = isLink ? (el.kind === "button" ? el.linkFeed : undefined) : el.feed
  const linked = current ? feedOf(current) : undefined
  const thing = isLink ? "link" : el.kind === "button" ? "label" : "text"
  const shownNow = isLink ? (el.kind === "button" ? el.link ?? "" : "") : el.text
  // any feed can feed any element: no text or link kinds
  const others = feeds.filter((f) => f.id !== current)
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  const link = (id: string) => {
    const now = linked ? linked.value : shownNow
    if (now) onSeed?.(id, now)
    onPatch((isLink ? { linkFeed: id } : { feed: id }) as Partial<CanvasElement>)
  }
  // a new feed named after what it's on: "label", then "label-2"…, filled with what's there now
  const create = () => {
    const taken = new Set(feeds.map((f) => f.name))
    let name = thing
    for (let n = 2; taken.has(name); n++) name = `${thing}-${n}`
    link(onAddFeed({ name, type }))
  }
  // keep what's on screen
  const unlink = () =>
    onPatch((isLink ? { linkFeed: undefined, link: linked?.value.trim() || shownNow } : { feed: undefined, text: linked?.value || el.text }) as Partial<CanvasElement>)

  const tab = "flex h-6 items-center rounded-t-md bg-neutral-800 px-2 text-xs font-medium text-white shadow-sm outline-none hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-neutral-700 dark:hover:bg-neutral-600"
  const linkTo = (label: string) =>
    others.length > 0 && (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{label}</DropdownMenuLabel>
        {others.map((f) => (
          <DropdownMenuItem key={f.id} onSelect={() => link(f.id)}>
            <HugeiconsIcon icon={FEED_ICON} className="size-4" />
            {f.name}
          </DropdownMenuItem>
        ))}
      </>
    )

  // nothing to link to yet: one click makes a feed
  if (!linked && !feeds.length)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="Make a feed" onPointerDown={stop} onClick={create} className={cn(tab, "px-1.5")}>
            <HugeiconsIcon icon={FEED_ICON} className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Connect to feed for different {thing} in each variation</TooltipContent>
      </Tooltip>
    )

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={linked ? `Feed ${linked.name}` : "Feed"} onPointerDown={stop} className={cn(tab, !linked && "px-1.5", "max-w-44")}>
              {linked ? <span className="truncate">{linked.name}</span> : <HugeiconsIcon icon={FEED_ICON} className="size-3.5" />}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{linked ? "Different for each variation" : `Connect to feed for different ${thing} in each variation`}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-52" data-keep-selection onPointerDown={stop}>
        {linked ? (
          <>
            <DropdownMenuItem onSelect={() => setTimeout(() => current && onOpenPanel?.(current), 30)}>
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
              Open Feeds panel
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={create}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              New feed
            </DropdownMenuItem>
            {linkTo("Link to another Feed")}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={unlink}>
              <HugeiconsIcon icon={Unlink04Icon} className="size-4" />
              Unlink
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={create}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              New feed
            </DropdownMenuItem>
            {linkTo("Link to")}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
