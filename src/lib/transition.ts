import { flushSync } from "react-dom"

/**
 * Runs a state change as a view transition (used for switching theme: the whole screen cross-fades).
 * Falls back to a plain update where the browser can't, or the user prefers less motion.
 */
export function withTransition(update: () => void, kind: "page" | "theme" = "theme") {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return update()
  // a theme switch cross-fades the whole screen; a page change moves only the page area
  const root = document.documentElement
  root.classList.toggle("vt-theme", kind === "theme")
  const t = doc.startViewTransition(() => flushSync(update))
  t.finished.finally(() => root.classList.remove("vt-theme"))
}
