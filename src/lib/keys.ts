/** ⌘ on Macs, Ctrl elsewhere (for shortcut labels) */
export const MOD = typeof navigator !== "undefined" && /Mac|iP(hone|ad)/.test(navigator.platform) ? "⌘" : "Ctrl"

/** true when a key press is going into a text box (so single-key shortcuts leave it alone) */
export const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest("[role=dialog]"))
}
