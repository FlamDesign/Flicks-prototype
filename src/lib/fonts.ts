import { FONTS } from "@/components/editor/elements"

/**
 * Editor fonts load on demand from Google Fonts, so 100+ families cost nothing until used.
 * ensureFont adds the family's stylesheet (regular, bold, italics) once: when an element on the
 * canvas uses it, or when its row scrolls into view in the font picker. Browsers then download
 * only the subsets the text needs.
 */
const loaded = new Set<string>()

export function ensureFont(name?: string) {
  if (!name || loaded.has(name) || typeof document === "undefined") return
  loaded.add(name)
  if (!FONTS.find((f) => f.name === name)?.google) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}:ital,wght@0,400;0,700;1,400;1,700&display=swap`
  document.head.appendChild(link)
}
