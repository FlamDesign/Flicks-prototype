import { useSyncExternalStore } from "react"

/**
 * Elements: named, reusable things (a product, a character, a logo, a style) with one or more
 * images, saved once and @-mentioned in any prompt. Kept in this browser, and on the AI server when
 * it's connected (so they follow the user to other devices).
 */
export type ElementKind = "product" | "character" | "logo" | "style" | "other"
export type FlickElement = { id: string; name: string; kind: ElementKind; images: { url: string; name: string }[]; created: number }

export const ELEMENT_KINDS: { value: ElementKind; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "character", label: "Character" },
  { value: "logo", label: "Logo" },
  { value: "style", label: "Style" },
  { value: "other", label: "Other" },
]

const KEY = "flam.elements"
const read = (): FlickElement[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as FlickElement[]
  } catch {
    return []
  }
}
let list: FlickElement[] = read()
const subs = new Set<(quiet: boolean) => void>()
const set = (next: FlickElement[], quiet = false) => {
  list = next
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage full or blocked: still kept for this session */
  }
  subs.forEach((f) => f(quiet))
}

export const elements = {
  get: () => list,
  save(el: Omit<FlickElement, "id" | "created"> & { id?: string }) {
    const name = el.name.trim()
    if (el.id && list.some((x) => x.id === el.id)) set(list.map((x) => (x.id === el.id ? { ...x, ...el, name } : x)))
    else set([{ ...el, name, id: crypto.randomUUID(), created: Date.now() }, ...list])
  },
  /** removes it; the returned function puts it back (for Undo) */
  remove(id: string) {
    const i = list.findIndex((x) => x.id === id)
    const gone = list[i]
    set(list.filter((x) => x.id !== id))
    return () => gone && !list.some((x) => x.id === id) && set([...list.slice(0, i), gone, ...list.slice(i)])
  },
  /** what the server saved replaces what's here (merged by id, the server's copy winning) */
  load(saved: FlickElement[]) {
    const ids = new Set(saved.map((x) => x.id))
    set([...saved, ...list.filter((x) => !ids.has(x.id))], true)
  },
  /** for the server sync: every change, and whether it should be saved */
  watch: (fn: (all: FlickElement[], quiet: boolean) => void) => {
    const l = (quiet: boolean) => fn(list, quiet)
    subs.add(l)
    return () => void subs.delete(l)
  },
}

export const useElements = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => list,
  )

/** a name that can follow @ (letters, digits, spaces, dashes) */
export const cleanName = (s: string) => s.replace(/[^\p{L}\p{N} _'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40)

/** the saved elements a text @mentions (longest names first, so "@Gold Rush" beats "@Gold") */
export function elementsIn(text: string, all: FlickElement[] = list): FlickElement[] {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  let rest = text
  const found: FlickElement[] = []
  for (const el of [...all].sort((a, b) => b.name.length - a.name.length)) {
    const re = new RegExp(`@${esc(el.name)}(?![\\p{L}\\p{N}])`, "giu")
    if (re.test(rest)) {
      found.push(el)
      rest = rest.replace(re, " ")
    }
  }
  return found
}
/** a prompt for the video model: "@Samba OG" reads "Samba OG" (the images go along separately) */
export const plainMentions = (text: string) => text.replace(/@(?=[\p{L}\p{N}])/gu, "")
