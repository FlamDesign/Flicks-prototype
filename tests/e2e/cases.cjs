/**
 * The example cases: one project per industry, size and use case, each driven the way a user
 * would (scripted answers, not "first option"), through to an exported Flick that stays in the
 * library as an example. Every step, question, reply, error and timing is recorded.
 *
 *   FP=<passcode> SITE=<site> FULL=1 LIVE_EXPORT=1 node tests/e2e/cases.cjs c1 [c2 …]
 *   SAMPLE=1 runs a case with the sample clips (no video is made).
 *
 * Writes tests/e2e/runs/<case>/{log.txt, chat.json, requests.json, summary.json, *.png}.
 */
const fs = require("fs")
const path = require("path")
const { open, drop, drive, say, finish, savedChat } = require("./lib.cjs")

const REPO = path.join(__dirname, "..", "..")
const fileAt = (rel, name) => {
  // CLIPS=<folder>: where the user's own films for the upload cases are (H.264 copies)
  const p = rel.startsWith("clips/") ? path.join(process.env.CLIPS || path.join(REPO, "research/compress/og"), rel.slice(6)) : path.join(REPO, rel)
  const ext = path.extname(p).slice(1)
  const type = ext === "mp4" ? "video/mp4" : ext === "webm" ? "video/webm" : ext === "png" ? "image/png" : "image/jpeg"
  return { name: name ?? path.basename(p), type, b64: fs.readFileSync(p).toString("base64") }
}

/** the cases: who the user is, what they ask, how they answer, and what they do along the way */
const CASES = {
  c1: {
    name: "c1-auto-hyundai-16x9",
    label: "Auto · Model range · 16:9",
    prompt: "A Flick for Hyundai's SUV range: IONIQ 5, Tucson and Santa Fe. Viewers tap to switch between the three models. See hyundaiusa.com",
    brand: "hyundaiusa.com",
    where: /link/i,
    size: "1920x1080",
    prefer: [/IONIQ 5.*Tucson.*Santa Fe/i, /model/i, /wide|16:9|horizontal/i],
  },
  c2: {
    name: "c2-footwear-allbirds-1x1",
    label: "Footwear · Colorways · 1:1",
    prompt: "Make a Flick for Allbirds runners, see allbirds.com",
    redirect: "Actually, focus on the Tree Dasher only, in three colors",
    stop: true,
    brand: "allbirds.com",
    where: /ads/i,
    size: "1080x1080",
    prefer: [/tree dasher/i, /color/i, /square 1:1|1080/i],
  },
  c3: {
    name: "c3-sneaker-photo-9x16",
    label: "Footwear (no brand) · Colorways from a photo · 9:16",
    prompt: "A Flick for these sneakers, a launch ad",
    files: [["tests/e2e/files/sneaker.jpg"]],
    brand: "No brand, choose for me",
    where: /ads/i,
    size: "1080x1920",
    prefer: [/color/i, /vertical|9:16/i],
    atStoryboard: ["Make it 6 seconds, and call the button Shop the drop"],
    approveInWords: "Looks great, make the others",
  },
  c4: {
    name: "c4-beverage-olipop-300x250",
    label: "Beverage · Flavors · 300×250",
    prompt: "A display ad Flick for Olipop soda: three flavors viewers can switch between. drinkolipop.com",
    brand: "drinkolipop.com",
    where: /ads/i,
    size: "300x250",
    prefer: [/vintage cola|classic root beer|strawberry vanilla|flavor/i, /medium rectangle|300/i],
    after: ["Make the headline shorter", "Make the button bolder", "Add a fourth flavor: Cherry Cola", "Set each button's link to that flavor's page on drinkolipop.com"],
  },
  c5: {
    name: "c5-qsr-littlecaesars-728x90",
    label: "QSR · Offers · 728×90",
    prompt: "A leaderboard banner Flick for Little Caesars: two deals viewers switch between, the Hot-N-Ready pepperoni and the Crazy Puffs. littlecaesars.com. Show the real prices.",
    brand: "littlecaesars.com",
    where: /ads/i,
    size: "728x90",
    prefer: [/hot-n-ready|crazy puffs|deal/i, /leaderboard|728/i],
  },
  c6: {
    name: "c6-fashion-template-tumi-1x1",
    label: "Fashion · Product swap from a template · 1:1",
    template: /Coach/,
    prompt: "Same pattern for TUMI: three bags from tumi.com, the 19 Degree carry-on, the Alpha Bravo backpack and the Voyageur tote",
    brand: "tumi.com",
    where: /ads/i,
    size: "1080x1080",
    prefer: [/19 degree|alpha bravo|voyageur|bag/i, /square 1:1|1080/i],
  },
  c7: {
    name: "c7-travel-marriott-9x16",
    label: "Travel · Scene shift, four places · 9:16",
    prompt: "A Flick for Marriott Bonvoy: the same traveler arriving at four destinations viewers can switch between: Bali, Paris, Dubai and New York. marriott.com",
    brand: "marriott.com",
    where: /link|ads/i,
    size: "1080x1920",
    prefer: [/bali.*paris.*dubai.*new york/i, /destination|place/i, /vertical|9:16/i],
    changeFirst: "Warmer, golden-hour light and a slower camera",
    after: ["Go back to the first version of the Bali video"],
  },
  c8: {
    name: "c8-electronics-sony-300x600",
    label: "Electronics · Recast for audiences · 300×600",
    prompt: "A half-page ad Flick for Sony WH-1000XM6 headphones: the same scene recast for three listeners, a commuter, a gamer and a runner. sony.com",
    brand: "sony.com",
    where: /ads/i,
    size: "300x600",
    prefer: [/commuter.*gamer.*runner/i, /audience|listener|people/i, /half page|300×600/i],
    reloads: true,
  },
  c9: {
    name: "c9-own-video-zifan-16x9",
    label: "Fashion · Product swap from the user's own video · 16:9",
    prompt: "This is our Maison ZIFAN film. Keep it as it is for the first variation and make two more with the same shot: the set in black, and in deep red. maisonzifan.com",
    files: [["clips/zifan-4.mp4", "zifan-film.mp4"]],
    brand: "Maison ZIFAN",
    where: /link|website|banner/i,
    size: "1920x1080",
    prefer: [/black.*red|color/i, /wide|16:9|horizontal/i],
  },
  c10: {
    name: "c10-clips-zifan-16x9",
    label: "Fashion · Clips to Flick, nothing generated · 16:9",
    prompt: "Three finished Maison ZIFAN films. Make a Flick out of them as they are, one per variation.",
    files: [["clips/zifan-1.mp4", "zifan-1.mp4"], ["clips/zifan-2.mp4", "zifan-2.mp4"], ["clips/zifan-3.mp4", "zifan-3.mp4"]],
    brand: "Maison ZIFAN",
    where: /website|banner|link/i,
    size: "1920x1080",
    prefer: [/as they are|keep|clips/i, /wide|16:9|horizontal/i],
    skipLinks: true,
  },
  c11: {
    name: "c11-finance-amex-970x250",
    label: "Finance · Audience messages · 970×250",
    prompt: "A billboard banner Flick for the American Express Gold Card: two versions viewers switch between, one for food lovers and one for travelers. americanexpress.com",
    brand: "americanexpress.com",
    where: /ads/i,
    size: "970x250",
    prefer: [/food.*travel/i, /audience|message/i, /billboard|970/i],
  },
}

async function start(run, c) {
  const { p, log } = run
  if (c.template) {
    await p.mouse.move(800, 600)
    const card = p.getByText(c.template).first()
    await card.scrollIntoViewIfNeeded().catch(() => {})
    await card.click()
    await p.getByRole("button", { name: "Use as reference" }).click()
    await p.waitForTimeout(2500)
    await say(p, c.prompt)
    log("started from the template, then:", c.prompt)
    return
  }
  if (c.files?.length) {
    await drop(p, "[data-create-prompt] > div", c.files.map(([rel, name]) => fileAt(rel, name)))
    // big clips take a while to read in
    await p.waitForTimeout(c.files.some(([f]) => /mp4$/.test(f)) ? 20000 : 3000)
  }
  await p.getByPlaceholder(/Describe your video/).fill(c.prompt)
  await p.locator('button[aria-label="Start"]').first().click()
  log("started:", c.prompt)
}

/** answers one question the way this case's user would; true when handled */
function answerer(run, c, record) {
  const { p, log } = run
  return async (q) => {
    const note = (a) => (record.questions.push({ at: Math.round((Date.now() - run.t0) / 1000), q: q.text, options: q.options, a }), log(`Q "${q.text}" -> ${a}`))
    if (q.typeField) {
      note(`typed "${c.brand}"`)
      const f = p.locator(`input[aria-label="${q.typeField}"]:visible`).last()
      await f.fill(c.brand)
      await f.press("Enter")
      return true
    }
    // the size: the option that names it, else typed
    if (/size|format|shape/i.test(q.text) && c.size) {
      const [w, h] = c.size.split("x")
      const i = q.options.findIndex((o) => o.includes(`${w}×${h}`))
      if (i >= 0) return false // the policy's pick finds it
      note(`typed "${c.size}"`)
      await say(p, c.size)
      return true
    }
    if (q.multi) {
      const want = q.options.map((o, i) => [o, i]).filter(([o]) => (c.prefer ?? []).some((re) => re.test(o))).map(([, i]) => i)
      const words = { one: 1, two: 2, three: 3, four: 4, five: 5 }
      const m = /Pick (\d|one|two|three|four|five)/i.exec(q.text)
      const need = m ? (words[m[1].toLowerCase()] ?? Number(m[1])) : Math.max(2, Math.min(3, want.length || 2))
      const picks = [...new Set([...want, ...q.options.map((_, i) => i)])].slice(0, need)
      note(`picked ${picks.map((i) => q.options[i]).join(" + ")}`)
      const opts = (q.inline ? p.locator(`[aria-label="${q.text.replace(/"/g, '\\"')}"]`).last() : p.locator('[aria-label="Questions"]')).locator("button[aria-pressed]:not([disabled]):visible")
      for (const i of picks) await opts.nth(i).click()
      await p.getByRole("button", { name: /^Continue/ }).last().click()
      return true
    }
    return false
  }
}
const pickFor = (c, record, run) => (q) => {
  const [w, h] = (c.size ?? "x").split("x")
  let i = -1
  if (/size|format|shape/i.test(q.text)) i = q.options.findIndex((o) => o.includes(`${w}×${h}`))
  if (i < 0 && /where|run|placement|shown/i.test(q.text) && c.where) i = q.options.findIndex((o) => c.where.test(o))
  if (i < 0) for (const re of c.prefer ?? []) if ((i = q.options.findIndex((o) => re.test(o))) >= 0) break
  if (i < 0) i = 0
  record.questions.push({ at: Math.round((Date.now() - run.t0) / 1000), q: q.text, options: q.options, a: q.options[i] })
  return i
}

const idle = (v) => !v.busy && !v.question && !v.approve && !v.review && !v.make && !v.assets
const handedOver = (v) => v.suggestions && !v.busy && !v.drawing

async function runCase(id) {
  const c = CASES[id]
  if (!c) throw new Error(`no case ${id}`)
  const run = await open(c.name, { real: true })
  const { p, log } = run
  const record = { case: id, label: c.label, questions: [], stages: {}, notes: [], net: [] }
  const mark = (k) => record.stages[k] === undefined && ((record.stages[k] = Math.round((Date.now() - run.t0) / 1000)), log(`STAGE ${k} at ${record.stages[k]}s`))
  // every failed request to the AI server, with what it answered
  p.on("response", async (r) => {
    const u = r.url()
    if (/workers\.dev/.test(u) && r.status() >= 400 && r.request().method() !== "OPTIONS") {
      const body = (await r.text().catch(() => "")).slice(0, 300)
      record.net.push({ at: Math.round((Date.now() - run.t0) / 1000), status: r.status(), url: u.replace(/^https:\/\/[^/]+/, "").slice(0, 90), body })
      log("NET", r.status(), u.replace(/^https:\/\/[^/]+/, "").slice(0, 90), body.slice(0, 160))
    }
  })
  p.on("console", (m) => m.type() === "error" && !/favicon|ERR_ABORTED|net::ERR/.test(m.text()) && record.notes.push(`console: ${m.text().slice(0, 200)}`))

  await start(run, c)
  let redirected = !c.redirect, stopped = !c.stop, busy = 0, sbSaid = 0, changed = !c.changeFirst, approved = false, reload1 = !c.reloads, reload2 = !c.reloads
  const policy = {
    onQuestion: answerer(run, c, record),
    pick: pickFor(c, record, run),
    onTick: async (v) => {
      if (v.question) mark("first_question")
      if (v.approve) mark("storyboard")
      if (v.review) mark("variation_1")
      if (v.errors.some((e) => !/var S9/.test(e))) record.notes.push(`on screen at ${Math.round((Date.now() - run.t0) / 1000)}s: ${v.errors.filter((e) => !/var S9/.test(e)).join(" | ")}`)
      if (v.busy) busy++
      if (!redirected && v.busy && busy >= 3) {
        redirected = true
        log("REDIRECT while busy:", c.redirect)
        await say(p, c.redirect)
        await p.waitForTimeout(1500)
        await run.shot("after-redirect")
        return true
      }
      if (redirected && !stopped && v.busy && busy >= 14) {
        stopped = true
        log("STOP pressed")
        await p.getByRole("button", { name: "Stop" }).click().catch(() => {})
        await p.waitForTimeout(2000)
        await run.shot("after-stop")
        const cont = p.getByRole("button", { name: "Continue" }).last()
        if (await cont.isVisible().catch(() => false)) (await cont.click(), log("Continue pressed"))
        else (await say(p, "Carry on"), log("no Continue shown; typed Carry on"), record.notes.push("Stop showed no Continue button"))
        return true
      }
      if (!reload1 && v.busy && busy === 5) {
        reload1 = true
        log("RELOAD mid-reply")
        await p.waitForTimeout(1500)
        await p.reload({ waitUntil: "networkidle" })
        await p.waitForTimeout(5000)
        await run.shot("after-reload-1")
        return true
      }
      if (reload1 && !reload2 && record.stages.storyboard !== undefined && v.building.length && !v.review && !v.approve && (await p.locator("text=/Generating|Up next/").count()) > 0) {
        reload2 = true
        log("RELOAD while a video is made")
        await p.waitForTimeout(8000)
        await p.reload({ waitUntil: "networkidle" })
        await p.waitForTimeout(6000)
        await run.shot("after-reload-2")
        return true
      }
      return false
    },
    onAssets: async () => {
      await run.shot("assets-request")
      if (c.products) {
        const typedIn = p.locator('input[placeholder^="Or "]:visible').last()
        if (await typedIn.count()) {
          await typedIn.fill(c.products)
          await p.getByRole("button", { name: "Continue" }).last().click()
          log("asked for files: typed", c.products)
          return true
        }
      }
      record.questions.push({ at: Math.round((Date.now() - run.t0) / 1000), q: "(asked for photos or links)", a: "Skip" })
      return false
    },
    onStoryboard: async () => {
      await run.shot(`storyboard-${sbSaid + 1}`)
      const next = c.atStoryboard?.[sbSaid]
      if (next) {
        sbSaid++
        log("AT STORYBOARD typed:", next)
        await say(p, next)
        await p.waitForTimeout(2500)
        return true
      }
      return false
    },
    onReview: async () => {
      await run.shot("review")
      if (!changed) {
        changed = true
        log("REVIEW: Change it")
        await p.getByRole("button", { name: "Change it" }).click()
        await drive(run, {}, (v) => idle(v), { timeout: 90_000, label: "after Change it" })
        await say(p, c.changeFirst)
        log("typed the change:", c.changeFirst)
        return true
      }
      if (c.approveInWords && !approved) {
        approved = true
        log("REVIEW approved in words:", c.approveInWords)
        await say(p, c.approveInWords)
        await p.waitForTimeout(4000)
        return true
      }
      return false
    },
  }
  let v = await drive(run, policy, handedOver, { timeout: 45 * 60_000, label: "build" })
  if (v) mark("hand_over")
  else record.notes.push("never reached the hand-over")
  await run.shot("handed-over")

  // changes after the build, one at a time, each waited out (a proposed video is made)
  for (const [i, msg] of (v ? (c.after ?? []) : []).entries()) {
    log("AFTER BUILD typed:", msg)
    await say(p, msg)
    await p.waitForTimeout(4000)
    const r = await drive(run, policy, (x) => idle(x) && !x.building.some((b) => /Generating|Up next|Waiting/.test(b)), { timeout: 20 * 60_000, label: `after ${i + 1}` })
    record.notes.push(`after-build "${msg}": ${r ? `ok, reply: ${(r.lastReply ?? "").replace(/\s+/g, " ").slice(0, 200)}` : "timed out"}`)
    await run.shot(`after-${i + 1}`)
  }

  // each variation as the canvas shows it
  const early = await savedChat(run)
  const names = early?.items.filter((x) => x.kind === "plan" && x.state === "approved").at(-1)?.plan?.variations?.map((y) => y.name) ?? []
  for (const [i, name] of names.slice(0, 5).entries()) {
    await p.getByLabel(name, { exact: true }).first().click({ timeout: 4000 }).catch(() => record.notes.push(`no strip tile labeled "${name}"`))
    await p.waitForTimeout(1800)
    await run.shot(`variation-${i + 1}`)
  }

  // export: the Flick page, and its share page when the Flicks API bakes it
  if (v) {
    try {
      await p.getByRole("button", { name: /^Export$/ }).click()
      const dialog = p.getByRole("dialog", { name: "Export Flick" })
      await dialog.waitFor({ timeout: 15000 })
      record.exportDialog = (await dialog.innerText()).replace(/\s+/g, " ").slice(0, 500)
      log("export dialog:", record.exportDialog)
      await run.shot("export-dialog")
      const go = dialog.getByRole("button", { name: /^Export( anyway)?$/ })
      if (await go.isDisabled()) throw new Error("Export is blocked: " + record.exportDialog)
      await go.click()
      mark("export_pressed")
      const until = Date.now() + (process.env.LIVE_EXPORT === "1" ? 6 * 60_000 : 60_000)
      let text = ""
      while (Date.now() < until) {
        await p.waitForTimeout(5000)
        text = await p.evaluate(() => document.body.innerText)
        if (/flamapp\.live|Export failed|couldn’t be made/.test(text)) break
        if (process.env.LIVE_EXPORT !== "1" && /flamapp\.ai\/f\//.test(text) && !/Preparing/.test(text)) break
      }
      mark("export_done")
      await run.shot("flick-page")
      record.flickUrl = p.url()
      const link = text.match(/\S*flamapp\.live\S*/)?.[0]
      record.share = link ? `https://${link.replace(/^https?:\/\//, "")}` : null
      record.exportFailed = /Export failed|couldn’t be made/.test(text) ? (text.match(/(Export failed|This Flick couldn’t be made)[\s\S]{0,300}/)?.[0] ?? "").replace(/\s+/g, " ") : null
      log(record.share ? `SHARE PAGE ${record.share}` : `no share page (${record.exportFailed ?? "in-app export"})`)
      if (record.share) {
        const share = await run.ctx.newPage()
        await share.goto(record.share, { waitUntil: "networkidle" }).catch(() => {})
        await share.waitForTimeout(6000)
        await share.screenshot({ path: path.join(run.out, "share-page.png") })
        record.sharePageText = (await share.evaluate(() => document.body.innerText).catch(() => "")).replace(/\s+/g, " ").slice(0, 300)
        await share.close()
      }
    } catch (e) {
      record.notes.push(`export: ${String(e).slice(0, 300)}`)
      log("EXPORT problem", String(e).slice(0, 200))
    }
  }

  // a fresh load of the project: the chat and the videos are still there
  try {
    const id2 = run.state.projectId
    if (id2) {
      await p.goto(new URL(`/p/${id2}`, p.url()).href, { waitUntil: "networkidle" })
      await p.waitForTimeout(8000)
      await run.shot("reopened")
      record.reopened = await p.evaluate(() => ({ replies: document.querySelectorAll("[data-reply]").length, videos: [...document.querySelectorAll("video")].filter((x) => x.readyState >= 2).length, broken: [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0 && !i.src.startsWith("data:")).length }))
      log("reopened:", JSON.stringify(record.reopened))
    }
  } catch (e) {
    record.notes.push(`reopen: ${String(e).slice(0, 200)}`)
  }
  const chat = await savedChat(run)
  if (chat) {
    record.usage = chat.usage
    record.review = chat.items.filter((x) => x.kind === "review").map((x) => ({ pass: x.pass, fail: x.fail }))
    record.replies = chat.items.filter((x) => x.kind === "assistant" && x.text).map((x) => ({ at: Math.round((x.at - chat.items[0].at) / 1000), text: x.text, sentences: (x.text.replace(/\nTry:.*$/m, "").match(/[.!?](\s|$)/g) ?? []).length, list: /^\s*[-*•]\s/m.test(x.text) }))
    record.errors = chat.items.filter((x) => x.kind === "error").map((x) => x.text)
    record.images = chat.items.filter((x) => x.kind === "image").length
    record.brand = chat.items.filter((x) => x.kind === "brand").map((x) => x.brand).at(-1)
    record.plan = chat.items.filter((x) => x.kind === "plan").map((x) => ({ state: x.state, title: x.plan?.title, variations: x.plan?.variations?.map((y) => y.name), design: x.plan?.design }))
  }
  fs.writeFileSync(path.join(run.out, "report.json"), JSON.stringify(record, null, 2))
  return finish(run, { case: id, label: c.label, stages: record.stages, share: record.share ?? null, flickUrl: record.flickUrl ?? null, notes: record.notes, net: record.net.length })
}

;(async () => {
  const ids = process.argv.slice(2)
  for (const id of ids) {
    try {
      const s = await runCase(id)
      console.log("SUMMARY", id, JSON.stringify({ project: s.project, stages: s.stages, share: s.share, notes: s.notes, chatErrors: s.chatErrors, seconds: s.seconds }))
    } catch (e) {
      console.log("CRASH", id, e.stack?.slice(0, 900))
    }
  }
})()
