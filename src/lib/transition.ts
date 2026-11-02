import { flushSync } from "react-dom"

/**
 * Runs a state change as a view transition, so one page fades and settles into the next instead of
 * cutting. Falls back to a plain update where the browser can't, or the user prefers less motion.
 * An element given `view-transition-name: flick-hero` on both pages (a project card, the editor's
 * frame) grows from one into the other.
 */
export function withTransition(update: () => void, kind: "page" | "theme" = "page") {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return update()
  // a theme switch cross-fades the whole screen; a page change moves only the page area
  const root = document.documentElement
  root.classList.toggle("vt-theme", kind === "theme")
  const t = doc.startViewTransition(() => flushSync(update))
  t.finished.finally(() => root.classList.remove("vt-theme"))
}
