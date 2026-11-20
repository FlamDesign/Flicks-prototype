/**
 * Saving to the AI server: the list of projects and Flicks and the real videos they use (key
 * "library"), each project's canvas and versions (key "proj-<id>"), and each
 * AI chat (key "chat-<project id>"). With a passcode set, what's saved loads on start and every
 * change is saved a moment later, so work survives a reload and follows you to other devices.
 * Without one, everything stays in this page, as before.
 */
import { aiConfig, isLive, shareable } from "@/ai/client"
import { madeVideos, mergeMadeVideos } from "@/components/editor/elements"
import { getLibrary, library, watchLibrary, type LibraryState, type Project } from "@/library"
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
    // when preparing fails (the server's copy couldn't be fetched to merge with) nothing is sent:
    // the value waits for the next change or the next flush
    void (prepare ? prepare(value, keepalive) : Promise.resolve(value))
      .then((v) => save(key, v, keepalive))
      .catch((e) => {
        waiting = true
        clearTimeout(timer)
        timer = setTimeout(run, 30000)
        console.warn("Couldn't save", key, e)
      })
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
type Saved = Omit<LibraryState, "synced"> & { /** the made videos' names, sizes and stills, by address (the key every slide and variation holds) */ made?: MadeVideo[]; deleted?: Record<string, number> }

const MONTH = 30 * 24 * 3600 * 1000
/** projects and Flicks deleted here (by id, when): sent with every save */
const deleted: Record<string, number> = {}

type MadeVideo = { name: string; size: string; mp4: string; poster: string }

/**
 * This tab's library, merged with what's saved on the server (another tab or device may have saved
 * since): every project and Flick from both, the newer copy where both have one, minus deletions.
 * Videos made elsewhere join the list here (every record names its videos by key, so nothing needs
 * translating).
 */
export function merge(mine: Saved, theirs: Saved | null): { merged: Saved; changedHere: boolean } {
  if (!theirs?.projects) return { merged: mine, changedHere: false }
  const tomb = { ...(theirs.deleted ?? {}), ...deleted }
  for (const [id, at] of Object.entries(theirs.deleted ?? {})) deleted[id] = Math.max(deleted[id] ?? 0, at)
  for (const [id, at] of Object.entries(deleted)) if (Date.now() - at > MONTH) delete deleted[id]
  mergeMadeVideos(theirs.made)
  let changedHere = false
  const pick = <T extends { id: string; editedAt?: number }>(a: T[], b: T[]) => {
    const out: T[] = []
    const seen = new Set<string>()
    for (const x of [...a, ...b]) {
      if (seen.has(x.id)) continue
      seen.add(x.id)
      const here = a.find((y) => y.id === x.id)
      const there = b.find((y) => y.id === x.id)
      const newer = here && there ? ((there.editedAt ?? 0) > (here.editedAt ?? 0) ? there : here) : (here ?? there!)
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
  return { merged: { projects, flicks, made: madeVideos(), deleted: { ...deleted } }, changedHere }
}

/**
 * One record per project. The library record ("library") is the list: every project without its
 * canvas and versions, marked `body` (when that part was last saved). Each project's canvas and
 * versions live in their own record ("proj-<id>"), written only when that project changes. So a
 * save sends the list and one project, not every project's canvas (the whole library had grown
 * past 4 MB in one record, re-sent on every change).
 */
const LIBRARY = "library"
type Body = { snap?: unknown; versions: Project["versions"]; /** the project's own line in the list, so the record alone is enough to open it (a project a second old, not in the list yet) */ meta?: Omit<Project, "snap" | "versions"> }
type Listed = Project & { body?: number }
const bodyKey = (id: string) => `proj-${id}`
const bodyOf = (p: Project): Body => {
  const { snap, versions, ...meta } = p
  return { snap, versions: versions ?? [], meta }
}
/** each project's record as last saved or loaded (by its edit time): only a changed project is written */
const bodySaved = new Map<string, number>()

/**
 * One project's record, written now and by itself (no list, no merge): right after a new project's
 * first message, so a reload a moment later still finds it by its address.
 */
export function saveProjectNow(id: string) {
  const p = getLibrary().projects.find((x) => x.id === id)
  if (!p || !isLive()) return
  bodySaved.set(id, p.editedAt ?? 0)
  void save(bodyKey(id), bodyOf(p), true).catch(() => bodySaved.delete(id))
}

/** a project opened by its address that the list doesn't have yet: taken from its own record */
async function adopt(id: string) {
  if (getLibrary().projects.some((x) => x.id === id) || deleted[id]) return
  const b = await loadSaved<Body>(bodyKey(id)).catch(() => null)
  if (b?.meta?.id === id) library.saveProject({ ...b.meta, snap: b.snap, versions: b.versions ?? [] })
}

/** fills in the canvas and versions of projects that came from the list without them */
async function hydrate(projects: Listed[], have: Project[] = []): Promise<Project[]> {
  const out: Project[] = new Array(projects.length)
  let next = 0
  const work = async () => {
    while (next < projects.length) {
      const i = next++
      const { body, ...p } = projects[i]
      if (body === undefined) {
        out[i] = p
        continue
      }
      // already here, as new as the server's: no need to fetch it again
      const mine = have.find((x) => x.id === p.id)
      if (mine && (mine.editedAt ?? 0) >= (p.editedAt ?? 0) && mine.snap !== undefined) {
        out[i] = { ...p, snap: mine.snap, versions: mine.versions }
        continue
      }
      const b = await loadSaved<Body>(bodyKey(p.id)).catch(() => null)
      if (b) bodySaved.set(p.id, p.editedAt ?? 0)
      out[i] = { ...p, snap: b?.snap, versions: b?.versions ?? [] }
    }
  }
  await Promise.all(Array.from({ length: 8 }, work))
  return out
}

/** saves each project's own record (only the changed ones are sent), then returns the list without them */
async function split(saved: Saved, closing: boolean): Promise<Saved> {
  const listed: Listed[] = []
  for (const p of saved.projects) {
    // a project whose canvas isn't loaded here (the list came from the server): its record stays as it is
    const known = p.snap !== undefined || (p.versions?.length ?? 0) > 0
    const changed = known && bodySaved.get(p.id) !== (p.editedAt ?? 0)
    if (changed && !closing) {
      await save(bodyKey(p.id), bodyOf(p))
      bodySaved.set(p.id, p.editedAt ?? 0)
    } else if (changed) void save(bodyKey(p.id), bodyOf(p), true).catch(() => {})
    listed.push({ ...p, snap: undefined, versions: [], body: p.editedAt ?? 0 })
  }
  return { ...saved, projects: listed }
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
    // 3 s after the last change and at least every 12 s while changes keep coming: a reload in the
    // middle of the chat's work must find the project as it was a moment ago (the library is too
    // big to send as the page closes, so it can't wait for that)
    const put = saver(LIBRARY, 3000, 12000, async (mine, closing) => {
      // never save over the server's copy without merging with it: a tab that can't fetch it waits
      // for the next change, and a closing tab merges with the copy it last saw (the server keeps
      // deletions either way, so an old copy can't bring deleted projects back)
      const theirs = closing ? lastTheirs : ((await loadSaved<Saved>(LIBRARY)) ?? lastTheirs)
      if (!theirs) throw new Error("no server copy to merge with")
      const { merged, changedHere } = merge(mine as Saved, theirs)
      // a project that's newer on the server came from the list: its canvas is fetched before it shows here
      if (!closing) merged.projects = await hydrate(merged.projects as Listed[], (mine as Saved).projects)
      else merged.projects = merged.projects.map((p) => (mine as Saved).projects.find((x) => x.id === p.id && (x.editedAt ?? 0) >= (p.editedAt ?? 0)) ?? p)
      lastTheirs = merged
      if (changedHere && !closing) library.load(merged)
      return split(merged, closing)
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
      if (ready && !silent) put({ projects: s.projects, flicks: s.flicks, made: madeVideos(), deleted: { ...deleted } } satisfies Saved)
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
      let saved = await loadSaved<Saved>(LIBRARY)
      // the earlier single record: where the library lived before it was split, and where a build
      // from before the split (production, until it's deployed again) still saves. Read on start
      // and merged in, so nothing made there is missing here; never written from here.
      const before = await loadSaved<Saved>("state").catch(() => null)
      if (before?.projects) {
        if (saved?.projects) {
          Object.assign(deleted, saved.deleted ?? {})
          saved.projects = await hydrate(saved.projects as Listed[])
          saved = merge(saved, before).merged
        } else saved = before
      }
      if (saved?.projects) {
        mergeMadeVideos(saved.made)
        Object.assign(deleted, saved.deleted ?? {})
        saved.projects = await hydrate(saved.projects as Listed[])
        lastTheirs = saved
        library.load(saved)
      }
    } catch (e) {
      console.warn("Couldn't load saved projects", e)
      // the app keeps working from this browser's copy; the pages say so once
      library.syncFailed()
      window.dispatchEvent(new CustomEvent("flam:sync-failed"))
    }
    ready = true
    // opened on a project's address that the list doesn't have (made a moment before a reload): its own record has it
    const at = typeof location !== "undefined" ? /^\/p\/([\w-]{8,80})/.exec(location.pathname)?.[1] : undefined
    if (at) await adopt(at).catch(() => {})
    // the saved projects are in: a page opened by address can find its project now
    window.dispatchEvent(new CustomEvent("flam:sync-ready"))
  }
  void go()
  aiConfig.subscribe(() => void go())
}
