// Screenshot tests: captures the key screens in light and dark from the built app (dist/index.html)
// and compares them with the saved baseline.
//   node scripts/screens.mjs            compare with tests/screens/baseline (writes diffs for changes)
//   node scripts/screens.mjs --update   save the current screens as the new baseline
// Needs a build first: npx vite build
import { createRequire } from "module"
import fs from "fs"
import path from "path"
const require = createRequire(import.meta.url)
const { chromium } = require("playwright")
const { PNG } = require("pngjs")
const pixelmatch = require("pixelmatch").default ?? require("pixelmatch")

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const app = "file://" + path.join(root, "dist/index.html")
const dir = path.join(root, "tests/screens")
const update = process.argv.includes("--update")
const out = path.join(dir, update ? "baseline" : "current")
fs.mkdirSync(out, { recursive: true })
fs.mkdirSync(path.join(dir, "diff"), { recursive: true })

const wait = (p, ms = 900) => p.waitForTimeout(ms)
// each screen starts from Create; steps get the page there
const screens = {
  create: async () => {},
  projects: async (p) => (await p.getByRole("button", { name: "Projects" }).first().click(), wait(p, 1500)),
  flicks: async (p) => (await p.getByRole("button", { name: "Flicks", exact: true }).last().click(), wait(p, 1500)),
  assets: async (p) => (await p.getByRole("button", { name: "Assets" }).first().click(), wait(p, 1500)),
  picker: async (p) => (await p.getByRole("button", { name: "Add photos or videos" }).first().click(), wait(p, 1500)),
  editor: async (p) => {
    await p.getByRole("button", { name: "Projects" }).first().click()
    await wait(p, 1500)
    await p.getByRole("button", { name: /^Open / }).first().click()
    await wait(p, 3000)
  },
}

const b = await chromium.launch()
const errors = []
for (const scheme of ["light", "dark"]) {
  for (const [name, go] of Object.entries(screens)) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: "reduce" })
    const p = await ctx.newPage()
    p.on("pageerror", (e) => errors.push(`${scheme}/${name}: ${e.message}`))
    await p.goto(app)
    // the app keeps Light unless the user picks otherwise; dark screens keep the class on
    if (scheme === "dark")
      await p.evaluate(() => {
        const h = document.documentElement
        const on = () => h.classList.contains("dark") || h.classList.add("dark")
        new MutationObserver(on).observe(h, { attributes: true, attributeFilter: ["class"] })
        on()
      })
    // dev tools aren't part of the product
    await p.addStyleTag({ content: '[aria-label="Move dev tools"] { display: none } [aria-label="Move dev tools"] ~ *, :has(> [aria-label="Move dev tools"]) { display: none !important }' })
    await wait(p, 2500)
    try {
      await go(p)
      // close any first-run tour
      for (let i = 0; i < 3; i++) {
        const skip = p.getByRole("button", { name: "Skip" })
        if (!(await skip.count())) break
        await skip.first().click().catch(() => {})
        await wait(p, 500)
      }
    } catch (e) {
      errors.push(`${scheme}/${name}: couldn't reach the screen (${e.message.split("\n")[0]})`)
    }
    // wait for the pictures on screen to finish loading, so lazy images don't show up as changes
    await p
      .waitForFunction(() => [...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight && i.getBoundingClientRect().bottom > 0).every((i) => i.complete), null, { timeout: 8000 })
      .catch(() => {})
    await wait(p, 300)
    await p.screenshot({ path: path.join(out, `${name}-${scheme}.png`), animations: "disabled" })
    await ctx.close()
  }
}
await b.close()

let changed = 0
if (!update) {
  for (const f of fs.readdirSync(out)) {
    const base = path.join(dir, "baseline", f)
    if (!fs.existsSync(base)) {
      console.log(`new      ${f} (no baseline yet)`)
      continue
    }
    const a = PNG.sync.read(fs.readFileSync(base))
    const c = PNG.sync.read(fs.readFileSync(path.join(out, f)))
    if (a.width !== c.width || a.height !== c.height) {
      console.log(`size     ${f}`)
      changed++
      continue
    }
    const d = new PNG({ width: a.width, height: a.height })
    const n = pixelmatch(a.data, c.data, d.data, a.width, a.height, { threshold: 0.1 })
    const pct = (n / (a.width * a.height)) * 100
    if (pct > 0.5) {
      fs.writeFileSync(path.join(dir, "diff", f), PNG.sync.write(d))
      console.log(`changed  ${f}  ${pct.toFixed(2)}%`)
      changed++
    } else console.log(`same     ${f}`)
  }
}
if (errors.length) console.log("\nErrors:\n" + errors.join("\n"))
console.log(update ? `\nBaseline saved to ${out}` : `\n${changed} screen(s) changed`)
process.exit(errors.length ? 1 : 0)
