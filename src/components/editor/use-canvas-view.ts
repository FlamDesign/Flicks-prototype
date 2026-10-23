import { useCallback, useEffect, useRef, useState } from "react"

/** Pan offset (px, from the centred position) and zoom (1 = fit to the area). */
export type CanvasView = { x: number; y: number; s: number }

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 8
const FIT: CanvasView = { x: 0, y: 0, s: 1 }
const clamp = (s: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s))

/**
 * Pan and zoom for the canvas.
 * Trackpad: two-finger scroll pans, pinch zooms. Mouse: wheel zooms, middle button drags to pan.
 * Touch screens: two fingers pan and pinch. Zoom keeps the point under the cursor in place.
 * `viewport` receives the gestures; `area` is the box the frame is centred in.
 */
export function useCanvasView(viewport: React.RefObject<HTMLElement | null>, area: React.RefObject<HTMLElement | null>) {
  const [view, setView] = useState<CanvasView>(FIT)
  const live = useRef(view)
  live.current = view

  /** zoom to `next`, keeping the screen point (cx, cy) fixed; defaults to the area's centre */
  const zoomTo = useCallback(
    (next: number, cx?: number, cy?: number) => {
      const r = area.current?.getBoundingClientRect()
      if (!r) return
      setView((v) => {
        const s = clamp(next)
        // the point relative to the area's centre
        const px = (cx ?? r.left + r.width / 2) - (r.left + r.width / 2)
        const py = (cy ?? r.top + r.height / 2) - (r.top + r.height / 2)
        const k = s / v.s
        return { s, x: px - (px - v.x) * k, y: py - (py - v.y) * k }
      })
    },
    [area],
  )
  const fit = useCallback(() => setView(FIT), [])

  useEffect(() => {
    const el = viewport.current
    if (!el) return
    // gestures that start on floating controls (toolbars, zoom pill) are left alone
    const ignored = (t: EventTarget | null) => t instanceof Element && !!t.closest("[role=toolbar], [data-no-pan]")

    const onWheel = (e: WheelEvent) => {
      if (ignored(e.target)) return
      e.preventDefault()
      const lines = e.deltaMode === 1 ? 16 : 1
      const dx = e.deltaX * lines
      const dy = e.deltaY * lines
      // trackpad pinch arrives as ctrl+wheel; a mouse wheel moves in big whole steps on one axis
      const mouseWheel = !e.ctrlKey && e.deltaX === 0 && (e.deltaMode === 1 || (Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50))
      if (e.ctrlKey || e.metaKey || mouseWheel) {
        const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015))
        zoomTo(live.current.s * factor, e.clientX, e.clientY)
      } else {
        setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
      }
    }

    // middle-button drag pans
    let drag: { x: number; y: number; vx: number; vy: number } | null = null
    const onDown = (e: PointerEvent) => {
      if (e.button !== 1) return
      // the canvas never sees it: no element drag or deselect
      e.preventDefault()
      e.stopPropagation()
      drag = { x: e.clientX, y: e.clientY, vx: live.current.x, vy: live.current.y }
      el.setPointerCapture(e.pointerId)
      el.style.cursor = "grabbing"
    }
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      setView((v) => ({ ...v, x: drag!.vx + e.clientX - drag!.x, y: drag!.vy + e.clientY - drag!.y }))
    }
    const onUp = (e: PointerEvent) => {
      if (!drag) return
      drag = null
      el.releasePointerCapture?.(e.pointerId)
      el.style.cursor = ""
    }
    // stop the browser's middle-click autoscroll
    const onAux = (e: MouseEvent) => e.button === 1 && e.preventDefault()

    // touch screens: two fingers pan and pinch
    const touches = new Map<number, { x: number; y: number }>()
    let pinch: { d: number; mx: number; my: number; s: number } | null = null
    const metrics = () => {
      const [a, b] = [...touches.values()]
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
    }
    const onTouchDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) pinch = { ...metrics(), s: live.current.s }
    }
    const onTouchMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size !== 2 || !pinch) return
      e.preventDefault()
      const m = metrics()
      const prev = pinch
      setView((v) => ({ ...v, x: v.x + m.mx - prev.mx, y: v.y + m.my - prev.my }))
      zoomTo(prev.s * (m.d / prev.d), m.mx, m.my)
      pinch = { ...m, s: prev.s * (m.d / prev.d) }
    }
    const onTouchUp = (e: PointerEvent) => {
      touches.delete(e.pointerId)
      if (touches.size < 2) pinch = null
    }

    // Safari sends trackpad pinches as gesture events
    let gestureStart = 1
    const onGestureStart = (e: Event) => (e.preventDefault(), (gestureStart = live.current.s))
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const g = e as Event & { scale: number; clientX: number; clientY: number }
      zoomTo(gestureStart * g.scale, g.clientX, g.clientY)
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("pointerdown", onDown, { capture: true })
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("auxclick", onAux)
    el.addEventListener("mousedown", onAux)
    el.addEventListener("pointerdown", onTouchDown)
    el.addEventListener("pointermove", onTouchMove, { passive: false })
    el.addEventListener("pointerup", onTouchUp)
    el.addEventListener("pointercancel", onTouchUp)
    el.addEventListener("gesturestart", onGestureStart)
    el.addEventListener("gesturechange", onGestureChange)
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("pointerdown", onDown, { capture: true })
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("auxclick", onAux)
      el.removeEventListener("mousedown", onAux)
      el.removeEventListener("pointerdown", onTouchDown)
      el.removeEventListener("pointermove", onTouchMove)
      el.removeEventListener("pointerup", onTouchUp)
      el.removeEventListener("pointercancel", onTouchUp)
      el.removeEventListener("gesturestart", onGestureStart)
      el.removeEventListener("gesturechange", onGestureChange)
    }
  }, [viewport, zoomTo])

  return { view, zoomTo, fit }
}
