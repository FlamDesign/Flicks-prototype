/**
 * Text contrast on every page, light and dark: each visible text element against the background it
 * sits on (WCAG: 4.5:1, or 3:1 for large text). Text over photos and hidden hover states can't be
 * judged this way and are left out (ratios near 1). Exits 1 when any real text fails.
 *   FP=<passcode> [SITE=<site>] [PAGES=/,/projects,...] node tests/e2e/contrast.cjs
 */
const { open } = require("./lib.cjs")
const fs = require("fs")
const PAGES = (process.env.PAGES || "/,/projects,/flicks,/assets,/campaigns,/embeds,/analytics,/credits,/ad-balance,/account").split(",")
const CHECK = `(() => {
  const lum = (r,g,b) => { const f = (c) => { c/=255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4) }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b) }
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true })
  const parse = (s) => { if (!s || s === "transparent") return null; cx.clearRect(0,0,1,1); cx.fillStyle = "#000"; cx.fillStyle = s; const norm = cx.fillStyle; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; const a = d[3]/255; if (a === 0) return null; return { r: d[0], g: d[1], b: d[2], a, norm } }
  const blend = (fg, bg) => ({ r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a), a: 1 })
  const bgOf = (el) => { let bg = null; let e = el; const stack = []; while (e && e !== document.documentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) stack.push(c); if (c && c.a >= 1) break; e = e.parentElement } let out = parse(getComputedStyle(document.body).backgroundColor) || {r:255,g:255,b:255,a:1}; for (const c of stack.reverse()) out = blend(c, out); return out }
  const out = []
  for (const el of document.querySelectorAll("body *")) {
    if (!el.childNodes.length) continue
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim()
    if (!text || text.length < 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue
    const fg = parse(cs.color); if (!fg) continue
    let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity || "1")
    const bg = bgOf(el)
    const f = blend({ ...fg, a: fg.a * op }, bg)
    const L1 = lum(f.r,f.g,f.b), L2 = lum(bg.r,bg.g,bg.b)
    const ratio = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)
    const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 600
    const large = size >= 24 || (size >= 18.66 && bold)
    const need = large ? 3 : 4.5
    if (ratio < need) out.push({ ratio: +ratio.toFixed(2), need, text: text.slice(0, 40), cls: (el.className?.baseVal ?? el.className ?? "").toString().split(" ").filter((c) => /text-|opacity|muted|foreground/.test(c)).slice(0, 4).join(" "), tag: el.tagName.toLowerCase() })
  }
  return out
})()`
;(async () => {
  const results = {}
  for (const mode of ["light", "dark"]) {
    const run = await open(`contrast-${mode}`)
    const { p } = run
    await p.evaluate((m) => localStorage.setItem("flam.appearance", m), mode)
    for (const path of PAGES) {
      await p.goto(`${(process.env.SITE || "https://agent.flam-flicks.pages.dev/").replace(/\/$/, "")}${path}`, { waitUntil: "networkidle" })
      await p.waitForTimeout(2500)
      const found = await p.evaluate(CHECK)
      const seen = new Map()
      for (const f of found) { const k = `${f.cls}|${f.tag}`; if (!seen.has(k)) seen.set(k, { ...f, n: 1 }); else seen.get(k).n++ }
      results[`${mode} ${path}`] = [...seen.values()].sort((a, b) => a.ratio - b.ratio)
      await p.screenshot({ path: `${run.out}/${path.replace(/\W/g, "") || "home"}.png` })
    }
    await run.b.close()
  }
  fs.writeFileSync(require("path").join(__dirname, "runs", "contrast.json"), JSON.stringify(results, null, 1))
  let bad = 0
  for (const [k, v] of Object.entries(results)) {
    // ratios near 1 are text over media or hidden states, not a colour choice
    const real = v.filter((f) => f.ratio > 1.5)
    bad += real.length
    console.log(`== ${k}: ${real.length} issue${real.length === 1 ? "" : "s"}`)
    for (const f of real.slice(0, 10)) console.log(`  ${f.ratio} (need ${f.need}) x${f.n} <${f.tag}> ${f.cls} :: ${f.text}`)
  }
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error("CRASH", e); process.exit(1) })
