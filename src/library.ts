import { useEffect, useState, useSyncExternalStore } from "react"
import { FLICKS, PROJECTS, type Flick } from "@/data"
import { GENERATED_VIDEOS, inSet } from "@/components/editor/elements"

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
  /** exporting: when it started and when it's ready; gone once ready */
  exporting?: { from: number; until: number }
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)

/** A variation's name from its sample video ("sunglasses-3-sapphire" → "Sapphire"). */
export const variantName = (video: number, i: number) => {
  const part = GENERATED_VIDEOS[video]?.name.split("-")[2]
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
      return { name: variantName(video, k), video, poster: GENERATED_VIDEOS[video].poster, views: Math.round(total * shares[k]) }
    }),
    start: 0,
    link: { slug: `${slugify(f.name)}-${(i * 2654435761).toString(36).slice(-4)}`, title: "", description: "" },
  }
}
const sampleProjects = (): Project[] =>
  PROJECTS.map((p) => ({ ...p, sample: true, versions: [], exports: FLICKS.filter((f) => f.projectId === p.id).map((f) => f.id) }))

// ---------- store ----------

type LibraryState = { projects: Project[]; flicks: FlickRecord[] }
let state: LibraryState = { projects: sampleProjects(), flicks: FLICKS.map(sampleFlick) }
const listeners = new Set<() => void>()
const set = (fn: (s: LibraryState) => LibraryState) => {
  state = fn(state)
  listeners.forEach((l) => l())
}
export const useLibrary = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
/** for code outside React (the ads picker, the editor's save) */
export const getLibrary = () => state

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`

export const library = {
  /** dev tools: the samples, or nothing */
  reset({ projects, flicks }: { projects: boolean; flicks: boolean }) {
    set(() => ({ projects: projects ? sampleProjects() : [], flicks: flicks ? FLICKS.map(sampleFlick) : [] }))
  },
  /** create or update a project (the editor saves as you work) */
  saveProject(p: Partial<Project> & { id: string }) {
    set((s) => {
      const old = s.projects.find((x) => x.id === p.id)
      const next: Project = { versions: [], exports: [], name: "Untitled Flick", size: "1080×1080", image: "", video: 0, ...old, ...p, editedAt: p.editedAt ?? Date.now() }
      return { ...s, projects: old ? s.projects.map((x) => (x.id === p.id ? next : x)) : [next, ...s.projects] }
    })
  },
  deleteProject(id: string) {
    set((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }))
  },
  duplicateProject(id: string) {
    const p = state.projects.find((x) => x.id === id)
    if (!p) return
    const copy: Project = { ...p, id: uid("p"), name: `${p.name} copy`, editedAt: Date.now(), versions: [], exports: [] }
    set((s) => {
      const i = s.projects.findIndex((x) => x.id === id)
      return { ...s, projects: [...s.projects.slice(0, i + 1), copy, ...s.projects.slice(i + 1)] }
    })
    return copy
  },
  /** export a project as it is now: a new, fixed Flick */
  /** runs in the background for `ms`; the Flick shows as exporting until then */
  exportFlick(f: { projectId: string; name: string; size: string; image: string; video: number; variants: Omit<FlickVariant, "views">[]; start: number; snap: unknown; base: unknown; ms: number }): FlickRecord {
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
    }
    set((s) => ({
      flicks: [flick, ...s.flicks],
      projects: s.projects.map((p) => (p.id === f.projectId ? { ...p, exports: [flick.id, ...p.exports] } : p)),
    }))
    return flick
  },
  /** an export finished */
  finishExport(id: string) {
    set((s) => ({ ...s, flicks: s.flicks.map((f) => (f.id === id ? { ...f, exporting: undefined, editedAt: Date.now() } : f)) }))
  },
  updateLink(id: string, patch: Partial<LinkSettings>) {
    set((s) => ({ ...s, flicks: s.flicks.map((f) => (f.id === id ? { ...f, link: { ...f.link, ...patch } } : f)) }))
  },
  deleteFlick(id: string) {
    set((s) => ({
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
export const flickLink = (f: FlickRecord) => `https://flamapp.ai/f/${f.link.slug}`

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
  return Math.min(1, Math.max(0, (now - ex.from) / (ex.until - ex.from)))
}
