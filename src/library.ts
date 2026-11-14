import { useEffect, useState, useSyncExternalStore } from "react"
import { FLICKS, PROJECTS, type Flick } from "@/data"
import { GENERATED_VIDEOS, inSet, videoAt } from "@/components/editor/elements"
import { safeSnap } from "@/ai/copy-chat"

/**
 * Projects and Flicks. A project is an editable draft; exporting it makes a Flick, which is fixed:
 * to change a Flick, remix it into a new project. Shared by the pages, the editor and the ads module.
 */

/** A saved point in a project's history: autosaved, or an export (which names the Flick it made). */
export type Checkpoint<S = unknown> = { n: number; at: number; sig: string; snap: S; name?: string; exported?: { flickId: string; name: string } }

export type Project = {
  id: string
  name: string
  size: string
  editedAt: number
  image: string
  /** the sample product set it plays */
  video: number
  /** how the editor first opened it (prompt, size, template...), to reopen it the same way */
  base?: unknown
  /** the canvas as it was last left */
  snap?: unknown
  versions: Checkpoint[]
  /** Flicks exported from it, newest first */
  exports: string[]
  /** a built-in sample: opens with sample variations */
  sample?: boolean
}

/** image: undefined uses the starting variation, null means no image */
export type LinkSettings = { slug: string; title: string; description: string; image?: string | null }
export type FlickVariant = { name: string; video: number; poster: string; views: number }
export type FlickRecord = Flick & {
  /** the variations viewers switch between, in order, with their views */
  variants: FlickVariant[]
  /** index of the variation it opens on */
  start: number
  link: LinkSettings
  /** the canvas it was exported from, so Remix starts from the same state */
  snap?: unknown
  base?: unknown
  /** exporting: when it started and when it's expected; gone once ready (or failed) */
  exporting?: { from: number; until: number }
  /**
   * The real Flick on the Flicks API (exports made with the server): its id there, where it stands,
   * and its share page once completed. Kept with what was sent, so a failed bake can be tried again.
   */
  remote?: { id?: string; status: "processing" | "completed" | "failed"; url?: string; error?: string; request: { name: string; aspect_ratio?: string; videos: { video_url: string; thumbnail_url?: string }[] } }
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)

/** A variation's name from its sample video ("sunglasses-3-sapphire" → "Sapphire"). */
export const variantName = (video: number, i: number) => {
  const part = videoAt(video)?.name.split("-")[2]
  return part ? part.charAt(0).toUpperCase() + part.slice(1) : `Variation ${i + 1}`
}

// ---------- sample data ----------

const sampleFlick = (f: Flick, i: number): FlickRecord => {
  const base = f.video ?? 0
  // a steady pseudo-random total; the starting variation gets the most views
  const total = 4_000 + ((i * 7919) % 23) * 1_100
  const shares = [0.52, 0.29, 0.19]
  return {
    ...f,
    variants: [0, 1, 2].map((k) => {
      const video = inSet(base, k)
      return { name: variantName(video, k), video, poster: videoAt(video).poster, views: Math.round(total * shares[k]) }
    }),
    start: 0,
    link: { slug: `${slugify(f.name)}-${(i * 2654435761).toString(36).slice(-4)}`, title: "", description: "" },
  }
}
const sampleProjects = (): Project[] =>
  PROJECTS.map((p) => ({ ...p, sample: true, versions: [], exports: FLICKS.filter((f) => f.projectId === p.id).map((f) => f.id) }))

// ---------- store ----------

export type LibraryState = { projects: Project[]; flicks: FlickRecord[]; /** the server's copy is in (or there is no server): the lists are real */ synced: boolean }
/** with the AI server set up the lists start empty until its copy arrives; without one, the samples */
const serverSetUp = () => {
  try {
    const c = JSON.parse(localStorage.getItem("flam.ai") ?? "{}") as { passcode?: string }
    return !!c.passcode?.trim()
  } catch {
    return false
  }
}
let state: LibraryState = serverSetUp() ? { projects: [], flicks: [], synced: false } : { projects: sampleProjects(), flicks: FLICKS.map(sampleFlick), synced: true }
const listeners = new Set<() => void>()
/** true while a change shouldn't be saved to the server (dev resets, loading what the server sent) */
let quiet = false
const set = (fn: (s: LibraryState) => LibraryState, silent = false) => {
  state = fn(state)
  quiet = silent
  listeners.forEach((l) => l())
  quiet = false
}
/** for the server sync: every change, and whether it should be saved */
export const watchLibrary = (fn: (s: LibraryState, silent: boolean) => void) => {
  const l = () => fn(state, quiet)
  listeners.add(l)
  return () => void listeners.delete(l)
}
export const useLibrary = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
/** for code outside React (the ads picker, the editor's save) */
export const getLibrary = () => state

/** the built-in sample videos' stills: stand-ins, never a chat project's own picture */
const SAMPLE_POSTERS = new Set(GENERATED_VIDEOS.filter((v) => v.set !== "made").map((v) => v.poster))
/** a project made with the AI chat that saved a sample still as its picture (before it had a video of its own) shows the placeholder instead */
const realCover = (p: Project): Project => ((p.base as { agent?: unknown } | undefined)?.agent && SAMPLE_POSTERS.has(p.image) ? { ...p, image: "" } : p)

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`

export const library = {
  /** dev tools: the samples, or nothing */
  reset({ projects, flicks }: { projects: boolean; flicks: boolean }) {
    set((s) => ({ ...s, projects: projects ? sampleProjects() : [], flicks: flicks ? FLICKS.map(sampleFlick) : [] }), true)
  },
  /** what the server saved replaces what's here */
  load(saved: { projects: Project[]; flicks: FlickRecord[] }) {
    set(() => ({ projects: saved.projects.map(realCover), flicks: saved.flicks, synced: true }), true)
  },
  /** the server couldn't be reached: what's here is what there is */
  syncFailed() {
    set((s) => ({ ...s, synced: true }), true)
  },
  /** create or update a project (the editor saves as you work) */
  saveProject(p: Partial<Project> & { id: string }) {
    set((s) => {
      const old = s.projects.find((x) => x.id === p.id)
      const next: Project = { versions: [], exports: [], name: "Untitled project", size: "1080×1080", image: "", video: 0, ...old, ...p, editedAt: p.editedAt ?? Date.now() }
      return { ...s, projects: old ? s.projects.map((x) => (x.id === p.id ? next : x)) : [next, ...s.projects] }
    })
  },
  /** removes it; the returned function puts it back where it was (for Undo) */
  deleteProject(id: string) {
    const i = state.projects.findIndex((p) => p.id === id)
    const gone = state.projects[i]
    set((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }))
    return () => gone && set((s) => (s.projects.some((p) => p.id === id) ? s : { ...s, projects: [...s.projects.slice(0, i), gone, ...s.projects.slice(i)] }))
  },
  duplicateProject(id: string) {
    const p = state.projects.find((x) => x.id === id)
    if (!p) return
    // videos still being made are left unmade in the copy, so it carries no running work
    const copy: Project = { ...p, id: uid("p"), name: `${p.name} copy`, editedAt: Date.now(), versions: [], exports: [], snap: p.snap ? safeSnap(p.snap as { slides: [] }) : p.snap }
    set((s) => {
      const i = s.projects.findIndex((x) => x.id === id)
      return { ...s, projects: [...s.projects.slice(0, i + 1), copy, ...s.projects.slice(i + 1)] }
    })
    return copy
  },
  /** export a project as it is now: a new, fixed Flick */
  /** runs in the background for `ms`; the Flick shows as exporting until then */
  exportFlick(f: { projectId: string; name: string; size: string; image: string; video: number; variants: Omit<FlickVariant, "views">[]; start: number; snap: unknown; base: unknown; ms: number; remote?: FlickRecord["remote"] }): FlickRecord {
    const flick: FlickRecord = {
      id: uid("f"),
      name: f.name,
      size: f.size,
      editedAt: Date.now(),
      image: f.image,
      video: f.video,
      projectId: f.projectId,
      variants: f.variants.map((v) => ({ ...v, views: 0 })),
      start: f.start,
      link: { slug: `${slugify(f.name) || "flick"}-${Math.random().toString(36).slice(2, 6)}`, title: "", description: "" },
      snap: f.snap,
      base: f.base,
      exporting: { from: Date.now(), until: Date.now() + f.ms },
      remote: f.remote,
    }
    set((s) => ({
      ...s,
      flicks: [flick, ...s.flicks],
      projects: s.projects.map((p) => (p.id === f.projectId ? { ...p, exports: [flick.id, ...p.exports] } : p)),
    }))
    return flick
  },
  /** an export finished */
  finishExport(id: string, remote?: FlickRecord["remote"]) {
    set((s) => ({ ...s, flicks: s.flicks.map((f) => (f.id === id ? { ...f, exporting: undefined, editedAt: Date.now(), ...(remote ? { remote } : {}) } : f)) }))
  },
  /** where a real export stands on the Flicks API (its id once started, its error if it failed) */
  setRemote(id: string, patch: Partial<NonNullable<FlickRecord["remote"]>>) {
    set((s) => ({ ...s, flicks: s.flicks.map((f) => (f.id === id && f.remote ? { ...f, remote: { ...f.remote, ...patch }, ...(patch.status === "failed" ? { exporting: undefined } : {}) } : f)) }))
  },
  /** try a failed export again (the user pressed Try again): the same videos, a new bake */
  retryExport(id: string, ms: number) {
    set((s) => ({ ...s, flicks: s.flicks.map((f) => (f.id === id && f.remote ? { ...f, exporting: { from: Date.now(), until: Date.now() + ms }, remote: { ...f.remote, id: undefined, status: "processing", error: undefined } } : f)) }))
  },
  updateLink(id: string, patch: Partial<LinkSettings>) {
    set((s) => ({ ...s, flicks: s.flicks.map((f) => (f.id === id ? { ...f, link: { ...f.link, ...patch } } : f)) }))
  },
  deleteFlick(id: string) {
    set((s) => ({
      ...s,
      flicks: s.flicks.filter((f) => f.id !== id),
      projects: s.projects.map((p) => ({ ...p, exports: p.exports.filter((x) => x !== id) })),
    }))
  },
  /** dev tools: views coming in, mostly on the starting variation */
  addViews(id: string, n: number) {
    set((s) => ({
      ...s,
      flicks: s.flicks.map((f) => {
        if (f.id !== id) return f
        const weights = f.variants.map((_, i) => (i === f.start ? 3 : 1) * (0.6 + Math.random() * 0.8))
        const sum = weights.reduce((a, b) => a + b, 0)
        return { ...f, variants: f.variants.map((v, i) => ({ ...v, views: v.views + Math.round((n * weights[i]) / sum) })) }
      }),
    }))
  },
}

export const totalViews = (f: FlickRecord) => f.variants.reduce((a, v) => a + v.views, 0)
/** the Flick's address: its share page on the Flicks API when it has one, else the prototype's */
export const flickLink = (f: FlickRecord) => f.remote?.url ?? `https://flamapp.ai/f/${f.link.slug}`
/** a real export that didn't bake */
export const exportFailed = (f: FlickRecord) => f.remote?.status === "failed"

/** Export progress, 0 to 1, re-rendering while it runs; 1 when it isn't exporting. */
export function useExportProgress(f?: FlickRecord) {
  const [now, setNow] = useState(() => Date.now())
  const ex = f?.exporting
  useEffect(() => {
    if (!ex) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [ex])
  if (!ex) return 1
  // a real bake has no fixed length: the bar nears the end and waits for the API
  return Math.min(f?.remote ? 0.95 : 1, Math.max(0, (now - ex.from) / (ex.until - ex.from)))
}
