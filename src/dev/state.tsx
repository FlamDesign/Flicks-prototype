/**
 * Dev-only state manager.
 *
 * Holds the variables that drive UI states (credit balance, auto-reload, empty states…) so they
 * can be previewed from the floating dev tools (State manager). To expose a new variable:
 *   1. add it to `DevState` and `DEFAULTS`
 *   2. add a field to `FIELDS` with its tab and group (it appears in the panel automatically)
 *   3. read it with `useDevState()` where it is needed
 *
 * Not for production: set DEV_TOOLS to false (or gate on import.meta.env.DEV) before shipping.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export const DEV_TOOLS = true

export type DevState = {
  credits: number
  autoReload: boolean
  autoReloadAt: number
  autoReloadTo: number
  flicksEmpty: boolean
  projectsEmpty: boolean
  embedsEmpty: boolean
  pageLoadMs: number
  assetsEmpty: boolean
  templatesEmpty: boolean
  generations: number
  invoices: number
  generationSeconds: number
  publishSeconds: number
  uploadsFail: boolean
  uploadsTooLarge: boolean
  loggedIn: boolean
  onboarded: boolean
  welcomeGift: boolean
  linkExpired: boolean
  signinSendFails: boolean
  googleFails: boolean
  adBalance: number
  adsEmpty: boolean
  adPaymentFails: boolean
  largeAccount: boolean
}

/** A brand-new user: signed out, nothing made yet, no credits or ad funds, and realistic but short waits. */
export const NEW_USER: DevState = {
  // onboarding sets credits to 0 and the welcome gift adds 1,000
  credits: 0,
  autoReload: false,
  autoReloadAt: 100,
  autoReloadTo: 500,
  flicksEmpty: true,
  projectsEmpty: true,
  embedsEmpty: true,
  // how long pages show their skeleton when opened
  pageLoadMs: 400,
  assetsEmpty: true,
  templatesEmpty: false,
  generations: 0,
  invoices: 0,
  generationSeconds: 8,
  publishSeconds: 10,
  uploadsFail: false,
  uploadsTooLarge: false,
  // signed out: the app opens on sign-in, then onboarding, then the welcome gift
  loggedIn: false,
  onboarded: false,
  welcomeGift: false,
  linkExpired: false,
  signinSendFails: false,
  googleFails: false,
  adBalance: 0,
  adsEmpty: true,
  adPaymentFails: false,
  largeAccount: false,
}

/** The default for now: a returning user, signed in, with sample projects, Flicks, credits and ad funds, and the same realistic waits. */
export const DEFAULTS: DevState = {
  ...NEW_USER,
  credits: 1000,
  flicksEmpty: false,
  projectsEmpty: false,
  embedsEmpty: false,
  assetsEmpty: false,
  generations: 150,
  invoices: 6,
  loggedIn: true,
  onboarded: true,
  adBalance: 2747,
  adsEmpty: false,
}
/** Help Center captures: the returning user with no waits. */
const CAPTURE_STATE: DevState = { ...DEFAULTS, pageLoadMs: 0, generationSeconds: 1, publishSeconds: 5 }
const CAPTURING = typeof location !== "undefined" && location.hash.includes("capture")

type Preset<V> = { label: string; value: V }
/** Tabs in the State manager, in display order. */
export const TABS = ["Account", "Credits", "History", "Create", "Flicks", "Ads"] as const
export type Tab = (typeof TABS)[number]

type Base<K extends keyof DevState> = { key: K; tab: Tab; group: string; label: string; hint?: string }
export type Field =
  | (Base<{ [K in keyof DevState]: DevState[K] extends number ? K : never }[keyof DevState]> & {
      type: "number"
      min?: number
      max?: number
      prefix?: string
      presets?: Preset<number>[]
    })
  | (Base<{ [K in keyof DevState]: DevState[K] extends boolean ? K : never }[keyof DevState]> & { type: "boolean" })

/** Registry shown in the State manager panel, grouped by `group` in this order. */
export const FIELDS: Field[] = [
  { key: "loggedIn", tab: "Account", group: "Session", label: "Signed in", type: "boolean", hint: "Off shows the sign-in page." },
  { key: "onboarded", tab: "Account", group: "Session", label: "Finished onboarding", type: "boolean", hint: "Off: the next sign-in (or now, if signed in) shows workspace setup, like a new user." },
  { key: "welcomeGift", tab: "Account", group: "Session", label: "Welcome gift to claim", type: "boolean", hint: "On shows the 1,000-credit welcome gift page. New users see it once, right after workspace setup." },
  { key: "signinSendFails", tab: "Account", group: "Sign-in errors", label: "Sign-in email fails to send", type: "boolean", hint: "Sending (and resending) the link fails, with Try again." },
  { key: "googleFails", tab: "Account", group: "Sign-in errors", label: "Google sign-in fails", type: "boolean" },
  { key: "linkExpired", tab: "Account", group: "Sign-in errors", label: "Sign-in link expired", type: "boolean", hint: "Opening the emailed link shows the expired screen." },
  {
    key: "credits",
    tab: "Credits",
    group: "Balance",
    label: "Balance",
    type: "number",
    min: 0,
    hint: "Running low under 96 (two typical videos). Generate opens Get credits when the balance is under that video\u2019s cost.",
    presets: [
      { label: "Healthy", value: 2640 },
      { label: "Running low", value: 80 },
      { label: "Not enough", value: 30 },
      { label: "Empty", value: 0 },
    ],
  },
  { key: "autoReload", tab: "Credits", group: "Auto-reload", label: "Enabled", type: "boolean" },
  { key: "autoReloadAt", tab: "Credits", group: "Auto-reload", label: "When credits drop below", type: "number", prefix: "$", min: 100, max: 1000 },
  { key: "autoReloadTo", tab: "Credits", group: "Auto-reload", label: "Add", type: "number", prefix: "$", min: 100, max: 1000 },
  {
    key: "generations",
    tab: "History",
    group: "Usage history",
    label: "Video generations",
    type: "number",
    min: 0,
    hint: "Rows in usage history (refunds added for ~6%).",
    presets: [
      { label: "None", value: 0 },
      { label: "Few", value: 8 },
      { label: "Many", value: 150 },
      { label: "Heavy", value: 600 },
    ],
  },
  {
    key: "invoices",
    tab: "History",
    group: "Invoices",
    label: "Invoices",
    type: "number",
    min: 0,
    max: 50,
    presets: [
      { label: "None", value: 0 },
      { label: "One", value: 1 },
      { label: "Some", value: 6 },
      { label: "Many", value: 24 },
    ],
  },
  {
    key: "generationSeconds",
    tab: "Create",
    group: "Generation",
    label: "Time to generate (seconds)",
    type: "number",
    min: 1,
    max: 600,
    presets: [
      { label: "Instant", value: 1 },
      { label: "Default", value: 8 },
      { label: "Slow", value: 60 },
    ],
  },
  {
    key: "publishSeconds",
    tab: "Create",
    group: "Exporting",
    label: "Time to export a Flick (seconds)",
    type: "number",
    min: 1,
    max: 600,
    presets: [
      { label: "Quick", value: 3 },
      { label: "Default", value: 10 },
      { label: "Slow", value: 120 },
    ],
  },
  { key: "uploadsFail", tab: "Create", group: "Image uploads", label: "Uploads fail", type: "boolean", hint: "Reference images and uploads fail, with Retry." },
  { key: "uploadsTooLarge", tab: "Create", group: "Image uploads", label: "Images are too large", type: "boolean", hint: "Every picked image is rejected as over 20 MB." },
  { key: "templatesEmpty", tab: "Create", group: "Templates", label: "No templates", type: "boolean" },
  {
    key: "pageLoadMs",
    tab: "Flicks",
    group: "Loading",
    label: "Page load time (ms)",
    type: "number",
    min: 0,
    max: 10000,
    hint: "Pages (Projects, Flicks, a Flick, Assets, Campaigns, Embeds, Credits, Ad Balance) show their skeleton this long when opened.",
    presets: [
      { label: "Instant", value: 0 },
      { label: "Default", value: 400 },
      { label: "Slow", value: 3000 },
    ],
  },
  { key: "projectsEmpty", tab: "Flicks", group: "Library", label: "No projects yet", type: "boolean" },
  { key: "flicksEmpty", tab: "Flicks", group: "Library", label: "No Flicks yet", type: "boolean", hint: "Placements keep their sample Flicks." },
  { key: "embedsEmpty", tab: "Ads", group: "Embeds", label: "No embeds yet", type: "boolean", hint: "Embeds page and the Flick page\u2019s Embed card start empty." },
  {
    key: "adBalance",
    tab: "Ads",
    group: "Ad Balance",
    label: "Ad Balance ($)",
    type: "number",
    min: -100000,
    hint: "Can go negative: ads keep serving, and the next top-up settles it first. At $0 or below, placements show no tag to copy.",
    presets: [
      { label: "Funded", value: 2747 },
      { label: "Low", value: 18.5 },
      { label: "Zero", value: 0 },
      { label: "Negative", value: -42.5 },
    ],
  },
  { key: "adsEmpty", tab: "Ads", group: "Campaigns", label: "New to ads", type: "boolean", hint: "No campaigns and no funds added yet: placements wait for a first top-up of at least $100." },
  { key: "adPaymentFails", tab: "Ads", group: "Payments", label: "Card is declined", type: "boolean", hint: "Add funds fails with a declined-card message." },
  { key: "largeAccount", tab: "Ads", group: "Analytics", label: "Large account", type: "boolean", hint: "Analytics shows about 250 Flicks, 60 campaigns with 400 placements and 80 embeds, to see every list at scale. Other pages keep the sample." },
  { key: "assetsEmpty", tab: "Flicks", group: "Assets", label: "No videos yet", type: "boolean", hint: "The Assets page shows its empty state." },
]

type Patch = Partial<DevState> | ((s: DevState) => Partial<DevState>)
type Ctx = { state: DevState; update: (p: Patch) => void; reset: () => void; newUser: () => void }

const DevStateContext = createContext<Ctx | null>(null)

export function DevStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DevState>(CAPTURING ? CAPTURE_STATE : DEFAULTS)
  const update = useCallback((p: Patch) => setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) })), [])
  const reset = useCallback(() => setState(DEFAULTS), [])
  const newUser = useCallback(() => setState(NEW_USER), [])
  const value = useMemo(() => ({ state, update, reset, newUser }), [state, update, reset, newUser])
  return <DevStateContext.Provider value={value}>{children}</DevStateContext.Provider>
}

export function useDevState() {
  const ctx = useContext(DevStateContext)
  if (!ctx) throw new Error("useDevState must be used inside DevStateProvider")
  return ctx
}
