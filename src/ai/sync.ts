/**
 * Saving to the AI server: projects, Flicks and the real videos they use (key "state"), and each
 * AI chat (key "chat-<project id>"). With a passcode set, what's saved loads on start and every
 * change is saved a moment later, so work survives a reload and follows you to other devices.
 * Without one, everything stays in this page, as before.
 */
import { aiConfig, isLive, shareable } from "@/ai/client"
import { GENERATED_VIDEOS, type SampleVideo } from "@/components/editor/elements"
import { library, watchLibrary, type LibraryState } from "@/library"
import { elements, type FlickElement } from "@/lib/elements"

const base = () => aiConfig.get().url.trim().replace(/\/+$/, "")
const headers = () => ({ "content-type": "application/json", "x-flicks-pass": aiConfig.get().passcode.trim() })

export async function loadSaved<T>(key: string): Promise<T | null> {
  const res = await fetch(`${base()}/store/${key}`, { headers: headers() })
  if (!res.ok) throw new Error(`load ${res.status}`)
  return (await res.json()) as T | null
}

/**
 * Pictures shown from a local copy of something already on the web (a website's images): saved by
 * their own address instead of being uploaded, since only the ones actually used need keeping.
 */
export const webSource = new Map<string, string>()

/** what each key last saved, so an unchanged value is never written again (the server's storage counts every write) */
const lastSaved = new Map<string, string>()

/**
 * Saves a value. Images that live only in this page (blob: links from uploads) are uploaded first
 * and their links swapped for lasting ones, so they still show after a reload or on another device.
 */
export async function save(key: string, value: unknown, keepalive = false) {
  let text = JSON.stringify(value)
  const blobs = [...new Set(text.match(/blob:[^"\\\s)]+/g) ?? [])]
  for (const b of blobs) {
    const src = webSource.get(b)
    if (src) {
      text = text.split(b).join(src)
      continue
    }
    try {
      text = text.split(b).join(await shareable(b))
    } catch {
      /* gone already: left as it is */
    }
  }
  if (lastSaved.get(key) === text) return
  // a page being closed can still send a small save (browsers cap keepalive bodies at 64 KB)
  const res = await fetch(`${base()}/store/${key}`, { method: "PUT", headers: headers(), body: text, keepalive: keepalive && text.length < 60_000 })
  if (!res.ok) throw new Error(`save ${res.status}`)
  lastSaved.set(key, text)
}

const flushers = new Set<(closing: boolean) => void>()
if (typeof window !== "undefined") {
  // leaving or hiding the page saves what's waiting
  // hidden: the page is still alive, so a normal save (with its merge); closing: a quick one
  window.addEventListener("pagehide", () => flushers.forEach((f) => f(true)))
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushers.forEach((f) => f(false)))
}

/** saves everything that's waiting now (after a decision, such as approving the videos, so a reload right after keeps it) */
export function saveWaitingNow() {
  flushers.forEach((f) => f(false))
}

/**
 * A value saved once changes settle: `ms` after the last change, and at least every `maxMs` while
 * changes keep coming (dragging, typing), the latest one winning. Unchanged values aren't sent, and
 * hiding or closing the page saves at once. Keeps the server's writes to a few a minute at most.
 */
export function saver(key: string, ms = 8000, maxMs = 45000, prepare?: (value: unknown, closing: boolean) => Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let first: number | undefined
  let latest: unknown
  let waiting = false
  const run = (keepalive = false) => {
    clearTimeout(timer)
    if (!waiting) return
    waiting = false
    first = undefined
    const value = latest
    void (prepare ? prepare(value, keepalive).catch(() => value) : Promise.resolve(value)).then((v) => save(key, v, keepalive)).catch((e) => console.warn("Couldn't save", key, e))
  }
  flushers.add((closing) => run(closing))
  return (value: unknown) => {
    latest = value
    waiting = true
    first ??= Date.now()
    clearTimeout(timer)
    timer = setTimeout(run, Math.max(0, Math.min(ms, first + maxMs - Date.now())))
  }
}

/** `deleted`: when each project or Flick was deleted, so another tab's older list can't bring it back */
type Saved = LibraryState & { made?: SampleVideo[]; deleted?: Record<string, number> }

const MONTH = 30 * 24 * 3600 * 1000
/** projects and Flicks deleted here (by id, when): sent with every save */
const deleted: Record<string, number> = {}

/**
 * This tab's library, merged with what's saved on the server (another tab or device may have saved
 * since): every project and Flick from both, the newer copy where both have one, minus deletions.
 * Videos made elsewhere join the list, and the server's projects are renumbered to find them.
 */
export function merge(mine: Saved, theirs: Saved | null): { merged: Saved; changedHere: boolean } {
  if (!theirs?.projects) return { merged: mine, changedHere: false }
  const tomb = { ...(theirs.deleted ?? {}), ...deleted }
  for (const [id, at] of Object.entries(theirs.deleted ?? {})) deleted[id] = Math.max(deleted[id] ?? 0, at)
  for (const [id, at] of Object.entries(deleted)) if (Date.now() - at > MONTH) delete deleted[id]
  // the server's made videos that this tab doesn't have yet: added to the end of ours
  const samples = GENERATED_VIDEOS.findIndex((v) => v.set === "made")
  const base = samples < 0 ? GENERATED_VIDEOS.length : samples
  const ours = GENERATED_VIDEOS.slice(base)
  const extras = (theirs.made ?? []).filter((v) => !ours.some((o) => o.mp4 === v.mp4))
  if (extras.length) GENERATED_VIDEOS.push(...extras.map((v) => ({ ...v, set: "made" as const })))
  // a server index -> the same video's index here
  const at = (i: number) => {
    if (i < base) return i
    const v = theirs.made?.[i - base]
    const k = v ? GENERATED_VIDEOS.findIndex((g) => g.mp4 === v.mp4) : -1
    return k < 0 ? i : k
  }
  const renumber = <T,>(x: T): T =>
    JSON.parse(JSON.stringify(x), (key, val) => (key === "video" && typeof val === "number" ? at(val) : key === "videos" && Array.isArray(val) ? val.map((n) => (typeof n === "number" ? at(n) : n)) : val))
  let changedHere = false
  const pick = <T extends { id: string; editedAt?: number }>(a: T[], b: T[]) => {
    const out: T[] = []
    const seen = new Set<string>()
    for (const x of [...a, ...b]) {
      if (seen.has(x.id)) continue
      seen.add(x.id)
      const here = a.find((y) => y.id === x.id)
      const there = b.find((y) => y.id === x.id)
      const newer = here && there ? ((there.editedAt ?? 0) > (here.editedAt ?? 0) ? renumber(there) : here) : (here ?? renumber(there!))
      const gone = tomb[x.id]
      if (gone && gone >= (newer.editedAt ?? 0)) continue
      if (newer !== here) changedHere = true
      out.push(newer)
    }
    // newest first, as the lists show them
    return out.sort((p, q) => (q.editedAt ?? 0) - (p.editedAt ?? 0))
  }
  const projects = pick(mine.projects, theirs.projects)
  const flicks = pick(mine.flicks, theirs.flicks)
  if (projects.length !== mine.projects.length || flicks.length !== mine.flicks.length) changedHere = true
  return { merged: { projects, flicks, made: GENERATED_VIDEOS.filter((v) => v.set === "made"), deleted: { ...deleted } }, changedHere }
}

/** real videos made anywhere: the server's list comes first, so saved projects find theirs by position */
function mergeMade(made: SampleVideo[] = []) {
  const first = GENERATED_VIDEOS.findIndex((v) => v.set === "made")
  const local = first < 0 ? [] : GENERATED_VIDEOS.splice(first)
  const all = [...made, ...local.filter((v) => !made.some((m) => m.mp4 === v.mp4))]
  GENERATED_VIDEOS.push(...all.map((v) => ({ ...v, set: "made" as const })))
}

let started = false
/** starts the sync once a passcode is set (now or later) */
export function startSync() {
  const go = async () => {
    if (started || !isLive()) return
    started = true
    let ready = false
    // saving merges with the server's copy first, so tabs and devices add to each other instead of replacing
    // the server's copy as last seen: a closing page merges with it (it can't wait to fetch a fresh one)
    let lastTheirs: Saved | null = null
    const put = saver("state", 8000, 45000, async (mine, closing) => {
      const theirs = closing ? lastTheirs : await loadSaved<Saved>("state").catch(() => lastTheirs)
      const { merged, changedHere } = merge(mine as Saved, theirs)
      lastTheirs = merged
      if (changedHere) library.load(merged)
      return merged
    })
    // deletions are remembered (and forgotten again on Undo)
    let ids = new Set<string>()
    watchLibrary((s, silent) => {
      const now = new Set([...s.projects, ...s.flicks].map((x) => x.id))
      if (ready && !silent) {
        for (const id of ids) if (!now.has(id)) deleted[id] = Date.now()
        for (const id of now) delete deleted[id]
      }
      ids = now
      if (ready && !silent) put({ projects: s.projects, flicks: s.flicks, made: GENERATED_VIDEOS.filter((v) => v.set === "made"), deleted: { ...deleted } } satisfies Saved)
    })
    // elements (named products, characters, logos) follow the user too
    let elementsReady = false
    const putElements = saver("elements")
    elements.watch((all, quiet) => elementsReady && !quiet && putElements(all))
    loadSaved<FlickElement[]>("elements")
      .then((saved) => Array.isArray(saved) && elements.load(saved))
      .catch(() => {})
      .finally(() => {
        elementsReady = true
        // anything made before the server was connected gets saved there now
        if (elements.get().length) putElements(elements.get())
      })
    try {
      const saved = await loadSaved<Saved>("state")
      if (saved?.projects) {
        mergeMade(saved.made)
        Object.assign(deleted, saved.deleted ?? {})
        lastTheirs = saved
        library.load(saved)
      }
    } catch (e) {
      console.warn("Couldn't load saved projects", e)
    }
    ready = true
  }
  void go()
  aiConfig.subscribe(() => void go())
}
