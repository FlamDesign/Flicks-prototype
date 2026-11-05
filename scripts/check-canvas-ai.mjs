// Fails when a canvas element has a property the chat can't reach: every field of every element type
// (src/components/editor/elements.ts) must be in src/ai/canvas-coverage.json, mapped to a tool
// parameter (present in the chat's tools and the canvas skill) or marked internal with a reason.
import { readFileSync } from "node:fs"
const src = readFileSync("src/components/editor/elements.ts", "utf8")
const cov = JSON.parse(readFileSync("src/ai/canvas-coverage.json", "utf8"))
const tools = readFileSync("src/ai/agent.ts", "utf8")
const skill = readFileSync("src/ai/skills/canvas.md", "utf8")
const union = src.slice(src.indexOf("type BaseElement ="), src.indexOf("export type ShapeKind"))
const font = src.slice(src.indexOf("export type FontProps"), src.indexOf("}", src.indexOf("export type FontProps")))
const fieldsOf = (block) => [...block.matchAll(/^\s+(?:\/\*\*.*\*\/\s*)?(\w+)\??:/gm)].map((m) => m[1])
const blocks = union.split(/\n\s+\|\s+/).slice(1)
let bad = []
for (const b of blocks) {
  const kind = b.match(/kind: "(\w+)"/)?.[1]
  if (!kind) continue
  const fields = [...new Set([...fieldsOf(b), ...(/FontProps/.test(b) ? fieldsOf(font) : [])])]
  const map = cov[kind] ?? {}
  for (const f of fields) {
    const how = map[f] ?? cov.all[f]
    if (!how) bad.push(`${kind}.${f}: not covered (add it to src/ai/canvas-coverage.json and give the chat a way to set it)`)
    else if (!how.startsWith("internal") && !["type", "vary_field", "image_id", "shape"].includes(how)) {
      if (!new RegExp(`\\b${how}:`).test(tools)) bad.push(`${kind}.${f} → ${how}: not a parameter of the chat's tools`)
      if (!skill.includes(how)) bad.push(`${kind}.${f} → ${how}: not in the canvas skill`)
    }
  }
}
for (const f of ["hidden", "role"]) if (!cov.all[f]) bad.push(`all.${f}: not covered`)
if (bad.length) {
  console.log("✗ the chat can't reach every canvas property")
  console.log(bad.join("\n"))
  process.exit(1)
}
console.log("✓ the chat can reach every canvas property")
