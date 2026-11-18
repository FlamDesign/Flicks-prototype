import { aiConfig, isLive } from "@/ai/client"

/**
 * Files made by the AI live first at the maker's CDN, which keeps them for about a week; the AI
 * server keeps its own copy for good. Anything on the page that fails to load from the maker's
 * address (a picture, a video's source) is asked for again by that address from the server's kept
 * copies, once. Saved records are rewritten to the kept addresses as they're saved; this covers
 * what's already on screen and anything older.
 */

const tried = new WeakSet<Element>()
/** an address of the maker's, not ours and not local */
export const foreign = (u: string) => /^https:\/\//.test(u) && !u.startsWith(aiConfig.get().url.trim().replace(/\/+$/, "")) && !u.startsWith(location.origin)
export const keptUrl = (u: string) => `${aiConfig.get().url.trim().replace(/\/+$/, "")}/kept?u=${encodeURIComponent(u)}`

export function watchKeptFiles() {
  if (typeof window === "undefined") return
  window.addEventListener(
    "error",
    (e) => {
      const el = e.target
      if (!(el instanceof HTMLElement) || !isLive()) return
      if (el instanceof HTMLImageElement) {
        const src = el.currentSrc || el.src
        if (!foreign(src) || tried.has(el)) return
        tried.add(el)
        el.src = keptUrl(src)
        return
      }
      if (el instanceof HTMLSourceElement) {
        const video = el.parentElement
        const src = el.src
        if (!(video instanceof HTMLVideoElement) || !foreign(src) || tried.has(video)) return
        tried.add(video)
        // one source for the kept copy, in place of the list that failed
        const t = video.currentTime
        const playing = !video.paused
        for (const s of [...video.querySelectorAll("source")]) s.remove()
        video.src = keptUrl(src)
        video.load()
        video.currentTime = t
        if (playing) void video.play().catch(() => {})
        return
      }
      if (el instanceof HTMLVideoElement) {
        const src = el.currentSrc || el.src
        if (!foreign(src) || tried.has(el)) return
        tried.add(el)
        const t = el.currentTime
        const playing = !el.paused
        el.src = keptUrl(src)
        el.load()
        el.currentTime = t
        if (playing) void el.play().catch(() => {})
      }
    },
    true,
  )
}
