import { useSyncExternalStore } from "react"

/**
 * Onboarding for new users: a short editor tour on the first project, one-time tips at tricky
 * moments, and Help (with a sample project). The prototype opens as a returning user (all seen);
 * finishing workspace setup, or the dev widget's "Reset onboarding" / "New user", starts it fresh.
 */

/** What a coach mark's illustration shows (see coach-art.tsx). */
export type Art = "reference" | "variations" | "design" | "export" | "feed" | "stale" | "strip"

/** Editor tour stops: what they spotlight (one or more selectors, lit together), what they say, and their illustration. */
export const TOUR = [
  { target: ['[data-tour="frame"]'], title: "Your reference video", text: "Every variation uses this as its reference. If you change it, you need to regenerate the variations.", art: "reference" },
  { target: ['[data-tour="strip"]', 'aside[aria-label="Prompts"]'], title: "Add variations", text: "Add up to 5 variations. Add prompts and reference images in chat to generate videos for variations.", art: "variations" },
  { target: ['nav[aria-label="Add to canvas"] [aria-label="Text"]', 'nav[aria-label="Add to canvas"] [aria-label="Images"]', 'nav[aria-label="Add to canvas"] [aria-label="Buttons"]', 'nav[aria-label="Add to canvas"] [aria-label="Layouts"]'], title: "Design once", text: "Text, images, buttons and layouts you add show on every variation.", art: "design", merge: true },
  { target: ['[aria-label="Mode"]', '[data-tour="export"]'], title: "Preview, then export", text: "Preview it first: an exported Flick can’t be changed. To make edits, you need to export again.", art: "export", merge: true },
] as const satisfies readonly Coach[]

/** One-time tips, right when they matter. */
export const TIPS = {
  feed: { target: ['[aria-label="Make a feed"]', '[aria-label="Feed"]'], title: "Different content for each variation", text: "Click { } to connect a feed. Select a variation and edit content.", art: "feed" },
  stale: { target: ['[aria-label="Needs regenerating"]'], title: "This variation needs regenerating", text: "It was made from the old reference video. Regenerate to match new reference video.", art: "stale" },
  strip: { target: ['[aria-label="Element options"]'], title: "Thumbnails", text: "Add thumbnail image for each variation. Viewers can click thumbnails to switch variation.", art: "strip" },
} as const satisfies Record<string, Coach>
export type TipId = keyof typeof TIPS

type State = {
  /** editor tour: the stop showing, or null; `toured` once finished or skipped */
  tour: number | null
  toured: boolean
  tips: Partial<Record<TipId, boolean>>
  /** the tip showing now */
  tip: TipId | null
  /** a spotlight: one thing pointed at, with a line on what to do */
  spot: Coach | null
}
/** merge: light the targets as one rectangle around them all, not one hole each */
export type Coach = { target: string | readonly string[]; title: string; text: string; art?: Art; merge?: boolean }
/** #capture (screenshots for the Help Center): no tour, tips or intros */
export const CAPTURE = typeof location !== "undefined" && location.hash.includes("capture")
/** a returning user: the tour and every tip already seen (the default, and for #capture) */
const returning = (): State => ({ tour: null, toured: true, tips: { feed: true, stale: true, strip: true }, tip: null, spot: null })
/** a new user: everything still to come */
const fresh = (): State => ({ tour: null, toured: false, tips: {}, tip: null, spot: null })
const initial = returning

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
  /** start onboarding over, as a new user */
  reset() {
    set(fresh)
  },
  /** leaving the editor: a tour or tip in progress closes (a tour left half way counts as seen) */
  leaveEditor() {
    set((s) => (s.tour === null && !s.tip ? s : { ...s, tour: null, toured: s.toured || s.tour !== null, tip: null }))
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
  spotlight(spot: Coach | null) {
    set((s) => ({ ...s, spot, tour: spot ? null : s.tour, tip: spot ? null : s.tip }))
  },
}

