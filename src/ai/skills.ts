/**
 * The chat's skills: playbooks in ./skills/*.md (front matter: name, description, when). The chat
 * sees the list and reads a skill in full right before the step it covers. Edit the Markdown to
 * change how the chat works.
 */
const files = import.meta.glob("./skills/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>

export type Skill = { name: string; description: string; when: string; body: string }

export const SKILLS: Skill[] = Object.entries(files)
  .filter(([path]) => !path.endsWith("README.md"))
  .map(([path, raw]) => {
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
    // values may be quoted ("...")
    const meta = Object.fromEntries((m?.[1] ?? "").split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim().replace(/^"(.*)"$/, "$1")]))
    return { name: meta.name || path.split("/").pop()!.replace(/\.md$/, ""), description: meta.description ?? "", when: meta.when ?? "", body: (m?.[2] ?? raw).trim() }
  })
  // craft first: it's the one every other skill serves
  .sort((a, b) => (a.name === "craft" ? -1 : b.name === "craft" ? 1 : a.name.localeCompare(b.name)))

export const skillIndex = () => SKILLS.map((s) => `- ${s.name}: ${s.description} (${s.when})`).join("\n")
export const findSkill = (name: string) => SKILLS.find((s) => s.name === name.trim().toLowerCase().replace(/\.md$/, ""))
/** a skill's name as people read it: "video-prompts" → "Video prompts" */
const TITLES: Record<string, string> = { "flick-studio-no-blender": "Flick Studio" }
export const skillTitle = (name: string) => TITLES[name] ?? name.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
