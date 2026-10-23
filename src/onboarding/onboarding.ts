import { useSyncExternalStore } from "react"

/**
 * Onboarding for new users: a short editor tour on the first project, one-time tips at tricky
 * moments, Help (with a sample project), and a first-run explainer on Campaigns.
 * Everything here is remembered for the session; the dev widget's "Reset onboarding" starts it over.
 */

/** Editor tour stops: a selector for what it points at, and what it says. */
export const TOUR = [
  { target: 'aside[aria-label="Prompts"]', title: "Your prompts", text: "Describe the video here. Every generation is kept, so you can go back to any of them." },
  { target: '[data-tour="reference"]', title: "The reference video", text: "Variations are made from it. Viewers only see it if you include it." },
  { target: '[aria-label="Add variation"]', title: "Add variations", text: "Colours, models or scenes, 2 to 5 of them. You need 2 to export." },
  { target: '[data-tour="frame"]', title: "Design once", text: "Text, buttons and the thumbnail strip are shared by every variation. Change one, change all." },
  { target: 'nav[aria-label="Add to canvas"] [aria-label="Feeds"]', title: "Dynamic content", text: "Feeds like @price or a shop link change per variation. Link them to text or a button." },
  { target: '[data-tour="export"]', title: "Export", text: "Makes a Flick you can share, embed and serve in ads. Keep editing and export again any time." },
] as const

/** One-time tips at tricky moments. */
export const TIPS = {
  feed: { target: 'nav[aria-label="Add to canvas"] [aria-label="Feeds"]', title: "Your first feed", text: "Fill its value on each variation (select a variation below the canvas). Empty ones are flagged before export." },
  stale: { target: '[aria-label="Needs regenerating"]', title: "This variation needs regenerating", text: "It was made from the old reference video. Regenerate it so it matches." },
  strip: { target: '[aria-label="Element options"]', title: "The thumbnail strip", text: "Pick a thumbnail in the strip, then upload an image for that variation. Viewers tap these to switch." },
  preview: { target: '[aria-label="Mode"]', title: "Previewing", text: "This is what viewers get. Tap the thumbnails and buttons; switch back to Design to edit." },
  remix: { target: '[data-tour="remix"]', title: "Flicks don’t change", text: "To change this one, Remix it into a new project. Its link, embeds and placements stay as they are." },
} as const
export type TipId = keyof typeof TIPS

type State = {
  /** editor tour: the stop showing, or null; `toured` once finished or skipped */
  tour: number | null
  toured: boolean
  tips: Partial<Record<TipId, boolean>>
  /** the tip showing now */
  tip: TipId | null
  adsIntro: boolean
  /** a spotlight: one thing pointed at, with a line on what to do */
  spot: Coach | null
}
export type Coach = { target: string; title: string; text: string }
/** #capture (screenshots for the Help Center): no tour, tips or intros */
export const CAPTURE = typeof location !== "undefined" && location.hash.includes("capture")
const initial = (): State =>
  CAPTURE
    ? { tour: null, toured: true, tips: { feed: true, stale: true, strip: true, preview: true, remix: true }, tip: null, adsIntro: true, spot: null }
    : { tour: null, toured: false, tips: {}, tip: null, adsIntro: false, spot: null }

let state: State = initial()
const listeners = new Set<() => void>()
const set = (fn: (s: State) => State) => {
  state = fn(state)
  listeners.forEach((l) => l())
}
export const useOnboarding = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )

export const onboarding = {
  reset() {
    set(initial)
  },
  /** start the editor tour (on the first project, or from Help) */
  startTour(at = 0) {
    set((s) => ({ ...s, tour: at, tip: null }))
  },
  nextTour() {
    set((s) => (s.tour === null ? s : s.tour + 1 >= TOUR.length ? { ...s, tour: null, toured: true } : { ...s, tour: s.tour + 1 }))
  },
  backTour() {
    set((s) => (s.tour ? { ...s, tour: s.tour - 1 } : s))
  },
  endTour() {
    set((s) => ({ ...s, tour: null, toured: true }))
  },
  /** show a tip once; never over the tour */
  tip(id: TipId) {
    if (state.tips[id] || state.tour !== null || state.tip || state.spot) return
    set((s) => ({ ...s, tip: id, tips: { ...s.tips, [id]: true } }))
  },
  closeTip() {
    set((s) => ({ ...s, tip: null }))
  },
  seeAdsIntro() {
    set((s) => ({ ...s, adsIntro: true }))
  },
  spotlight(spot: Coach | null) {
    set((s) => ({ ...s, spot, tour: spot ? null : s.tour, tip: spot ? null : s.tip }))
  },
}

