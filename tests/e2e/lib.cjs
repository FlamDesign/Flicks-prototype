// End-to-end driver for the Flicks AI chat. Runs against the live site with sample videos (no
// generation). Answers whatever the chat shows according to a policy, logs every step, and keeps
// the saved chat for the report.
const { chromium } = require("playwright")
const fs = require("fs")
const path = require("path")

const SITE = process.env.SITE || "https://agent.flicks-6sa.pages.dev/"
const FILES = path.join(__dirname, "files")

function file(name) {
  const type = name.endsWith(".webm") ? "video/webm" : name.endsWith(".png") ? "image/png" : "image/jpeg"
  return { name, type, b64: fs.readFileSync(path.join(FILES, name)).toString("base64") }
}

/** real: videos are really made (at 480p, tagged as test work); otherwise sample clips stand in */
async function open(name, { real = false } = {}) {
  // SAMPLE=1 runs any scenario with sample videos (no video credits, no real renders)
  if (process.env.SAMPLE === "1") real = false
  const out = path.join(__dirname, "runs", name)
  fs.mkdirSync(out, { recursive: true })
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, ignoreHTTPSErrors: true })
  await ctx.addInitScript(({ pc, real, managed }) => {
    try {
      localStorage.setItem("flam.ai", JSON.stringify({ passcode: pc }))
      if (real) localStorage.setItem("flam.testVideos", "1")
      else localStorage.setItem("flam.mockVideos", "1")
      // MANAGED=1: the chat runs through the managed agent (Dev switch)
      if (managed) localStorage.setItem("flam.managed", "1")
    } catch {}
  }, { pc: process.env.FP, real, managed: process.env.MANAGED === "1" })
  const p = await ctx.newPage()
  const t0 = Date.now()
  const lines = []
  const log = (...a) => {
    const l = `${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s  ${a.join(" ")}`
    lines.push(l)
    console.log(`[${name}] ${l}`)
    fs.writeFileSync(path.join(out, "log.txt"), lines.join("\n"))
  }
  const state = { projectId: null, errors: [], shots: 0 }
  p.on("pageerror", (e) => (state.errors.push(String(e).slice(0, 300)), log("PAGE ERROR", String(e).slice(0, 200))))
  p.on("request", (r) => {
    const m = r.url().match(/\/store\/chat-([0-9a-f-]{36})/)
    if (m && !state.projectId) state.projectId = m[1]
  })
  await p.goto(SITE + "?v=" + Date.now(), { waitUntil: "networkidle" })
  // the chat is the only flow now (the old "AI chat mode" switch is gone)
  const shot = async (label) => {
    state.shots++
    const f = `${String(state.shots).padStart(2, "0")}-${label.replace(/\W+/g, "-")}.png`
    await p.screenshot({ path: path.join(out, f) }).catch(() => {})
    log("screenshot", f)
  }
  return { b, p, ctx, log, shot, state, out, t0 }
}

/** drops files on an element (as if dragged in from the desktop) */
async function drop(p, selector, files) {
  await p.evaluate(
    async ({ selector, files }) => {
      const el = typeof selector === "string" ? document.querySelector(selector) : null
      if (!el) throw new Error("no drop target " + selector)
      const dt = new DataTransfer()
      for (const f of files) {
        const bin = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))
        dt.items.add(new File([bin], f.name, { type: f.type }))
      }
      el.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true }))
      el.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }))
    },
    { selector, files },
  )
}

/** where a question's options are: the docked deck, or its own card */
const scope = (p, qq) => (qq.inline ? p.locator(`[aria-label="${qq.text.replace(/"/g, '\"')}"]`).last() : p.locator('[aria-label="Questions"]'))

/** what the chat shows right now */
async function look(p) {
  return p.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.innerText.trim()) && !b.disabled && b.offsetParent)
    const deck = q('[aria-label="Questions"]')
    let question = null
    if (deck && deck.offsetParent) {
      const opts = [...deck.querySelectorAll('[role="group"] button[aria-pressed]')].filter((b) => !b.disabled && b.offsetParent)
      const typeField = [...deck.querySelectorAll("input")].find((i) => i.offsetParent && i.getAttribute("aria-label") && i.getAttribute("aria-label") !== "Your own answer" && !/^Or /.test(i.getAttribute("aria-label")))
      const header = deck.querySelector("header")
      question = { text: (header?.innerText ?? deck.innerText).split("\n")[0].slice(0, 160), options: opts.map((o) => o.innerText.replace(/\s+/g, " ").trim().slice(0, 60)), multi: !!deck.querySelector("[data-multi]"), typeField: typeField?.getAttribute("aria-label") ?? null }
    }
    // an inline question card (not docked)
    if (!question) {
      // only the chat's own question cards (not the canvas's toggles, like Mode)
      const groups = [...document.querySelectorAll('[role="radiogroup"],[role="group"]')].filter((g) => g.offsetParent && /\?|Pick|Choose|Which/i.test(g.getAttribute("aria-label") ?? "") && g.querySelector('button[aria-pressed]:not([disabled]),[role="radio"]:not([disabled]),[role="checkbox"]:not([disabled])'))
      const g = groups.at(-1)
      if (g) {
        const opts = [...g.querySelectorAll('button[aria-pressed],[role="radio"],[role="checkbox"]')].filter((b) => !b.disabled)
        question = { text: (g.getAttribute("aria-label") ?? "").slice(0, 160), options: opts.map((o) => o.innerText.replace(/\s+/g, " ").trim().slice(0, 60)), multi: g.hasAttribute("data-multi"), typeField: null, inline: true }
      }
    }
    // an asset request (in the chat or docked): Skip plus a drop area (its Add stays disabled until files are in)
    const assets = !!btn(/^Skip$/) && [...document.querySelectorAll('button[class*="group/drop"]')].some((b) => b.offsetParent && !b.closest('[role="dialog"]'))
    const approve = btn(/^(Approve and make|Build the Flick)/)?.innerText.trim() ?? null
    const review = !!q('[aria-label="Review Variation 1"]')
    const resume = !!q('[aria-label="Carry on"]')
    const suggestions = !!q('[aria-label="Suggestions"]')
    const busy = !!q('button[aria-label="Stop"]') || !!q('button[aria-label="Send now"]')
    const errors = [...document.querySelectorAll("*")].filter((e) => e.childElementCount === 0 && /Couldn't reach|Something went wrong|didn.t generate|Didn't generate/.test(e.textContent ?? "")).map((e) => e.textContent.trim().slice(0, 120))
    const chip = [...document.querySelectorAll("header *")].find((e) => e.childElementCount === 0 && /\d+×\d+ · \d+s/.test(e.textContent ?? ""))?.textContent ?? null
    const tryAgain = !!btn(/^Try again$/)
    const building = [...document.querySelectorAll("figcaption")].map((f) => f.innerText.trim()).filter(Boolean)
    // a video the chat proposed, waiting for Make
    const make = btn(/^Make · \d+$/)?.closest('[role="group"]')?.getAttribute("aria-label") ?? null
    const credits = [...document.querySelectorAll("*")].find((e) => e.childElementCount === 0 && /^\d[\d,]* credits$/.test((e.textContent ?? "").trim()))?.textContent?.trim() ?? null
    const lastReply = [...document.querySelectorAll("[data-reply]")].at(-1)?.innerText?.slice(0, 300) ?? null
    return { question, assets, approve, review, resume, suggestions, busy, errors: [...new Set(errors)], chip, tryAgain, building, make, credits, lastReply }
  })
}

async function say(p, text) {
  const box = p.getByRole("textbox", { name: "Message" })
  await box.fill(text)
  const now = p.getByRole("button", { name: "Send now" })
  if (await now.isVisible().catch(() => false)) await now.click()
  else await box.press("Enter")
}

/**
 * Keeps the chat moving until `until(view)` is true: answers questions by the policy (default: the
 * first option; type-in fields get policy.typed; several-pick questions get the first two), adds or
 * skips asked-for files, approves the storyboard and Variation 1 unless the policy says otherwise.
 * policy hooks return true when they handled the moment themselves.
 */
async function drive(run, policy, until, { timeout = 8 * 60_000, label = "" } = {}) {
  const { p, log } = run
  const end = Date.now() + timeout
  let last = ""
  while (Date.now() < end) {
    await p.waitForTimeout(1500)
    const v = await look(p)
    const sig = JSON.stringify({ q: v.question?.text, a: v.approve, r: v.review, s: v.suggestions, b: v.busy, e: v.errors, c: v.chip, as: v.assets, re: v.resume, t: v.tryAgain, m: v.make })
    if (sig !== last) log(`view ${label}`, sig.slice(0, 400)), (last = sig)
    if (await until(v)) return v
    if (policy.onTick && (await policy.onTick(v))) continue
    if (v.busy) continue
    if (v.resume) {
      log("resume card: Continue")
      await p.getByRole("button", { name: "Continue" }).last().click()
      continue
    }
    if (v.question && !(v.assets && !v.question.typeField && !v.question.options?.length)) {
      if (policy.onQuestion && (await policy.onQuestion(v.question, v))) continue
      const qq = v.question
      if (qq.typeField) {
        log(`question "${qq.text}": typing "${policy.typed ?? "No brand"}"`)
        const f = p.locator(`input[aria-label="${qq.typeField}"]:visible`).last()
        await f.fill(policy.typed ?? "No brand, choose for me")
        await f.press("Enter")
      } else if (qq.multi) {
        const words = { one: 1, two: 2, three: 3, four: 4, five: 5 }
        const m = /Pick (\d|one|two|three|four|five)/i.exec(qq.text)
        const need = m ? (words[m[1].toLowerCase()] ?? Number(m[1])) : 2
        log(`question "${qq.text}" (several): picking ${qq.options.slice(0, need).join(" + ")}`)
        const opts = scope(p, qq).locator('button[aria-pressed]:not([disabled]):visible')
        const n = Math.min(need, await opts.count())
        for (let i = 0; i < n; i++) await opts.nth(i).click()
        await p.getByRole("button", { name: /^Continue/ }).last().click()
      } else if (qq.options.length) {
        // questions about redoing a video: the sample clips never match, so keep what's there
        const keep = /remake|redo|regenerate|again/i.test(qq.text) ? qq.options.findIndex((o) => /keep|no|looks good|fine|go ahead|continue|as it is/i.test(o)) : -1
        const at = keep >= 0 ? keep : (policy.pick?.(qq) ?? 0)
        log(`question "${qq.text}": picking "${qq.options[at]}"`)
        await scope(p, qq).locator('button[aria-pressed]:not([disabled]):visible').nth(at).click()
      }
      continue
    }
    if (v.assets) {
      if (policy.onAssets && (await policy.onAssets(v))) continue
      await run.shot("assets")
      // PRODUCTS=…: type product links or names into the request instead of files
      const typedIn = process.env.PRODUCTS && p.locator('input[placeholder^="Or "]:visible').last()
      if (typedIn && (await typedIn.count())) {
        log(`asked for files: typing "${process.env.PRODUCTS}"`)
        await typedIn.fill(process.env.PRODUCTS)
        await p.getByRole("button", { name: "Continue" }).last().click()
        continue
      }
      log("asked for files: Skip")
      await p.getByRole("button", { name: "Skip" }).last().click()
      continue
    }
    if (v.approve) {
      if (policy.onStoryboard && (await policy.onStoryboard(v))) continue
      log(`storyboard: ${v.approve}`)
      await p.getByRole("button", { name: v.approve }).last().click()
      continue
    }
    if (v.review) {
      if (policy.onReview && (await policy.onReview(v))) continue
      log("review: Make the variations")
      await p.getByRole("button", { name: /^Make the (variations|others)/ }).last().click()
      continue
    }
    if (v.make) {
      if (policy.onMake && (await policy.onMake(v))) continue
      log(`proposed video (${v.make}): pressing Make`)
      await p.getByRole("button", { name: /^Make · \d+$/ }).first().click()
      continue
    }
  }
  log(`TIMEOUT ${label}`)
  return null
}

/** the chat as saved on the server, for the report */
async function savedChat(run) {
  const id = run.state.projectId
  if (!id) return null
  // from inside the page (the test machine reaches the server only through the browser's proxy)
  const c = await run.p.evaluate(async ({ id, pc }) => (await fetch(`https://flicks-ai.flick-prototype.workers.dev/store/chat-${id}`, { headers: { "x-flicks-pass": pc } })).json().catch(() => null), { id, pc: process.env.FP }).catch(() => null)
  if (c) fs.writeFileSync(path.join(run.out, "chat.json"), JSON.stringify(c))
  return c
}

/** this test's project name (from the saved project list), to reopen it after a reload */
async function projectName(run) {
  const id = run.state.projectId
  return run.p.evaluate(async ({ id, pc }) => {
    const s = await (await fetch("https://flicks-ai.flick-prototype.workers.dev/store/state", { headers: { "x-flicks-pass": pc } })).json()
    return s.projects.find((x) => x.id === id)?.name ?? null
  }, { id, pc: process.env.FP })
}

/** every image and video request this project sent to the server: the prompt and what it was made from */
async function requests(run, name) {
  return run.p.evaluate(async ({ name, pc }) => {
    const r = await (await fetch("https://flicks-ai.flick-prototype.workers.dev/requests", { headers: { "x-flicks-pass": pc } })).json()
    return (r.items ?? []).filter((x) => x.job?.project === name).map((x) => ({ at: x.at, path: x.path, variation: x.job?.variation, purpose: x.job?.purpose, status: x.status, prompt: x.payload?.prompt, image_urls: x.payload?.image_urls, video_url: x.payload?.video_url, image_url: x.payload?.image_url, resolution: x.payload?.resolution })).sort((a, b) => a.at - b.at)
  }, { name, pc: process.env.FP }).catch(() => [])
}

async function finish(run, result) {
  await run.shot("final")
  const chat = await savedChat(run)
  const name = await projectName(run).catch(() => null)
  const reqs = name ? await requests(run, name) : []
  fs.writeFileSync(path.join(run.out, "requests.json"), JSON.stringify(reqs, null, 2))
  const summary = {
    project: name,
    requests: reqs.length,
    ...result,
    seconds: Math.round((Date.now() - run.t0) / 1000),
    projectId: run.state.projectId,
    pageErrors: run.state.errors,
    items: chat ? chat.items.length : null,
    kinds: chat ? chat.items.reduce((m, i) => ((m[i.kind] = (m[i.kind] ?? 0) + 1), m), {}) : null,
    assistant: chat ? chat.items.filter((i) => i.kind === "assistant" && (i.text || i.stopped)).map((i) => (i.stopped ? `[${i.stopped}] ` : "") + (i.text ?? "").slice(0, 400)) : null,
    chatErrors: chat ? chat.items.filter((i) => i.kind === "error").map((i) => i.text) : null,
  }
  fs.writeFileSync(path.join(run.out, "summary.json"), JSON.stringify(summary, null, 2))
  await run.b.close()
  return summary
}

module.exports = { open, drop, look, say, drive, file, finish, savedChat, projectName, requests }
