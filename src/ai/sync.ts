/**
 * Saving to the AI server: projects, Flicks and the real videos they use (key "state"), and each
 * AI chat (key "chat-<project id>"). With a passcode set, what's saved loads on start and every
 * change is saved a moment later, so work survives a reload and follows you to other devices.
 * Without one, everything stays in this page, as before.
 */
import { aiConfig, isLive, shareable } from "@/ai/client"
import { GENERATED_VIDEOS, type SampleVideo } from "@/components/editor/elements"
import { library, watchLibrary, type LibraryState } from "@/library"

const base = () => aiConfig.get().url.trim().replace(/\/+$/, "")
const headers = () => ({ "content-type": "application/json", "x-flicks-pass": aiConfig.get().passcode.trim() })

export async function loadSaved<T>(key: string): Promise<T | null> {
  const res = await fetch(`${base()}/store/${key}`, { headers: headers() })
  if (!res.ok) throw new Error(`load ${res.status}`)
  return (await res.json()) as T | null
}

/**
 * Saves a value. Images that live only in this page (blob: links from uploads) are uploaded first
 * and their links swapped for lasting ones, so they still show after a reload or on another device.
 */
export async function save(key: string, value: unknown) {
  let text = JSON.stringify(value)
  const blobs = [...new Set(text.match(/blob:[^"\\\s)]+/g) ?? [])]
  for (const b of blobs) {
    try {
      text = text.split(b).join(await shareable(b))
    } catch {
      /* gone already: left as it is */
    }
  }
  const res = await fetch(`${base()}/store/${key}`, { method: "PUT", headers: headers(), body: text })
  if (!res.ok) throw new Error(`save ${res.status}`)
}

/** a value saved at most once per `ms`, the latest one winning */
export function saver(key: string, ms = 1500) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let latest: unknown
  return (value: unknown) => {
    latest = value
    clearTimeout(timer)
    timer = setTimeout(() => void save(key, latest).catch((e) => console.warn("Couldn't save", key, e)), ms)
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
    const put = saver("state", 2000)
    watchLibrary((s, silent) => {
      if (ready && !silent) put({ projects: s.projects, flicks: s.flicks, made: GENERATED_VIDEOS.filter((v) => v.set === "made") } satisfies Saved)
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
