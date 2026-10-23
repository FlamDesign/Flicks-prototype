/** The app's address without its hash. */
const base = () => location.href.split("#")[0]

/** Open a hash route in a new tab; where new tabs are blocked, go there in this one. */
export function openInNewTab(hash: string) {
  const w = window.open(base() + hash, "_blank", "noopener")
  if (!w) location.hash = hash
}

/** The Help Center, in a new tab. */
export const openHelp = (guide?: string) => openInNewTab(guide ? `#help/${guide}` : "#help")
