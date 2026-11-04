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

const flushers = new Set<() => void>()
if (typeof window !== "undefined") {
  // leaving or hiding the page saves what's waiting
  const flushAll = () => flushers.forEach((f) => f())
  window.addEventListener("pagehide", flushAll)
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushAll())
}

/**
 * A value saved once changes settle: `ms` after the last change, and at least every `maxMs` while
 * changes keep coming (dragging, typing), the latest one winning. Unchanged values aren't sent, and
 * hiding or closing the page saves at once. Keeps the server's writes to a few a minute at most.
 */
export function saver(key: string, ms = 8000, maxMs = 45000) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let first: number | undefined
  let latest: unknown
  let waiting = false
  const run = (keepalive = false) => {
    clearTimeout(timer)
    if (!waiting) return
    waiting = false
    first = undefined
    void save(key, latest, keepalive).catch((e) => console.warn("Couldn't save", key, e))
  }
  flushers.add(() => run(true))
  return (value: unknown) => {
    latest = value
    waiting = true
    first ??= Date.now()
    clearTimeout(timer)
    timer = setTimeout(run, Math.max(0, Math.min(ms, first + maxMs - Date.now())))
  }
}

type Saved = LibraryState & { made?: SampleVideo[] }

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
    const put = saver("state")
    watchLibrary((s, silent) => {
      if (ready && !silent) put({ projects: s.projects, flicks: s.flicks, made: GENERATED_VIDEOS.filter((v) => v.set === "made") } satisfies Saved)
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
