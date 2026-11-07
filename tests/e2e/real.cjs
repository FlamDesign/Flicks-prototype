// Production-readiness chats with real videos (480p, tagged as test work). Run one: FP=… node real.cjs r1
// Each test logs every view, takes a screenshot at each stage, and keeps the saved chat and the
// server's request records (prompt + references per video) in runs/<name>/.
const { open, drop, look, say, drive, file, finish, projectName, savedChat } = require("./lib.cjs")

const done = (v) => v.suggestions && !v.busy
const check = (run, checks, name, ok, note = "") => {
  checks.push({ name, ok: !!ok, note })
  run.log(`CHECK ${ok ? "PASS" : "FAIL"}: ${name}${note ? ` (${note})` : ""}`)
}
const note = (run, checks, text) => (checks.push({ name: text, ok: null }), run.log(`NOTE: ${text}`))

async function startFromCreate(run, prompt, files = []) {
  const { p } = run
  if (files.length) {
    await drop(p, "[data-create-prompt] > div", files)
    await p.waitForTimeout(2500)
  }
  await p.getByPlaceholder(/Describe your video/).fill(prompt)
  await p.locator('button[aria-label="Start"]').first().click()
  run.log("started:", prompt)
}

async function startRecipe(run, name, slots, text) {
  const { p } = run
  await p.locator("section[aria-label=Recipes] button").filter({ hasText: name }).first().click()
  await p.waitForTimeout(1500)
  const zones = p.locator('[role="dialog"] button[class*="group/drop"]')
  let filled = 0
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].length) continue
    const handle = await zones.nth(i - filled).elementHandle()
    filled++
    await p.evaluate(
      async ({ el, files }) => {
        const dt = new DataTransfer()
        for (const f of files) dt.items.add(new File([Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))], f.name, { type: f.type }))
        el.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }))
      },
      { el: handle, files: slots[i] },
    )
    await p.waitForTimeout(2500)
  }
  if (text) await p.locator('[role="dialog"] textarea').last().fill(text).catch(() => {})
  await run.shot("recipe-form")
  await p.locator('[role="dialog"]').getByRole("button", { name: /^Start/ }).click()
  run.log("recipe started:", name)
}

/** waits for the chat to go quiet (no Stop button) */
async function quiet(run, ms = 90_000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    await run.p.waitForTimeout(1500)
    const v = await look(run.p)
    if (!v.busy) return v
  }
  return look(run.p)
}

/** says something and waits for the reply; returns the view after */
async function ask(run, text, ms = 120_000) {
  run.log("SAY:", text)
  await say(run.p, text)
  await run.p.waitForTimeout(2500)
  return quiet(run, ms)
}

const bodyText = (run) => run.p.evaluate(() => document.body.innerText)

/** the happy path to the hand-over, used by several tests */
async function toHandover(run, prompt, files, typed, extra = {}) {
  let sb = 0, rv = 0
  await startFromCreate(run, prompt, files)
  const v = await drive(run, {
    typed,
    onStoryboard: async () => ((sb++, await run.shot("storyboard")), false),
    onReview: async () => ((rv++, await run.shot("review")), false),
    ...extra,
  }, done, { timeout: 25 * 60_000 })
  return { v, sb, rv }
}

const TESTS = {
  // 1. the happy path with real videos, then export and the Flick page
  async r1() {
    const run = await open("r1-happy-real", { real: true })
    const checks = []
    const { v, sb, rv } = await toHandover(run, "A Flick for a summer lemonade brand called Sunsip: three flavours viewers can switch between, Classic, Raspberry and Mint", [], "Sunsip")
    check(run, checks, "storyboard shown", sb > 0)
    check(run, checks, "Variation 1 review shown", rv > 0)
    check(run, checks, "all variations made, hand-over and suggestions", !!v)
    const text = await bodyText(run)
    check(run, checks, "no error cards", !/Couldn't reach|Something went wrong|Didn't generate/.test(text))
    // the hand-over's claims
    const chat = await savedChat(run)
    const last = chat?.items?.filter((x) => x.kind === "assistant" && x.text).at(-1)?.text ?? ""
    run.log("HAND-OVER:", last.slice(0, 500))
    check(run, checks, "hand-over is short (3 sentences or fewer)", (last.match(/[.!?](\s|$)/g) ?? []).length <= 3, `${(last.match(/[.!?](\s|$)/g) ?? []).length} sentences`)
    // export
    const exp = run.p.getByRole("button", { name: /^Export/ }).first()
    if (await exp.isVisible().catch(() => false)) {
      await exp.click()
      await run.p.waitForTimeout(2000)
      await run.shot("export-dialog")
      const t = await run.p.evaluate(() => document.querySelector('[role="dialog"]')?.innerText ?? "")
      run.log("export dialog:", t.replace(/\s+/g, " ").slice(0, 300))
      const go = run.p.locator('[role="dialog"]').getByRole("button", { name: /^Export( anyway)?$/ })
      check(run, checks, "export not blocked", await go.isEnabled().catch(() => false), t.replace(/\s+/g, " ").slice(0, 160))
      if (await go.isEnabled().catch(() => false)) {
        await go.click()
        await run.p.waitForTimeout(6000)
        await run.shot("flick-page")
        const url = run.p.url()
        const pt = await bodyText(run)
        check(run, checks, "Flick page opened with the Flick", /Copy link|Embed|Visit link|Share/.test(pt), url)
      }
    } else check(run, checks, "export button found", false)
    return finish(run, { test: "r1", checks })
  },

  // 2. interrupts: redirect during research, Stop during images, size change with the deck open,
  //    reload during Variation 1's render, Dismiss then reload again
  async r2() {
    const run = await open("r2-interrupts-real", { real: true })
    const checks = []
    let busyTicks = 0, redirected = false, stopped = false, sizeSaid = false, reloaded = false, dismissed = false, resumeSeen = 0, cardAfterDismiss = null
    await startFromCreate(run, "A launch Flick for these sneakers, see allbirds.com for the brand", [file("sneaker.jpg")])
    const v = await drive(run, {
      typed: "Allbirds",
      onQuestion: async (q) => {
        if (!sizeSaid && /size|Which size/i.test(q.text)) {
          sizeSaid = true
          run.log("deck open: saying the size in chat instead")
          await say(run.p, "Make it vertical, 9:16")
          await run.p.waitForTimeout(2000)
          return true
        }
        return false
      },
      onTick: async (v) => {
        if (v.resume) resumeSeen++
        if (v.busy) busyTicks++
        if (!redirected && v.busy && busyTicks === 3) {
          redirected = true
          run.log("redirect while busy")
          await say(run.p, "Actually, only two colours: natural white and black")
          await run.shot("after-redirect")
          return true
        }
        if (redirected && !stopped && v.busy && busyTicks === 14) {
          stopped = true
          run.log("pressing Stop")
          await run.p.getByRole("button", { name: "Stop" }).click().catch(() => {})
          await run.p.waitForTimeout(1500)
          await run.shot("after-stop")
          await say(run.p, "Carry on")
          return true
        }
        // while Variation 1 renders: reload, dismiss the Continue card, reload again
        if (!reloaded && v.building.length && (await run.p.locator("text=/\\d+%|queued|generating|starting/").count()) > 0) {
          reloaded = true
          let name = null
          for (let i = 0; i < 15 && !name; i++) (name = await projectName(run).catch(() => null)), name || (await run.p.waitForTimeout(1000))
          await run.p.waitForTimeout(4000)
          run.log("RELOAD during Variation 1", name)
          await run.p.reload({ waitUntil: "networkidle" })
          await run.p.waitForTimeout(5000)
          // the app has no router: a reload lands on Home, so reopen the project from Projects
          if (name && (await run.p.getByText("let’s start with a video").count())) {
            run.log("reload landed on Home; reopening", name)
            await run.p.getByText("Projects", { exact: true }).first().click()
            await run.p.waitForTimeout(3000)
            await run.p.getByRole("button", { name: `Open ${name}`, exact: true }).first().click()
            await run.p.waitForTimeout(6000)
          }
          const after = await look(run.p)
          await run.shot("after-reload")
          run.log("after reload:", JSON.stringify({ resume: after.resume, busy: after.busy, building: after.building.slice(0, 4) }))
          if (after.resume) {
            dismissed = true
            run.log("Dismiss the Continue card, reload again")
            await run.p.getByRole("button", { name: "Dismiss" }).last().click()
            await run.p.waitForTimeout(2500)
            await run.p.reload({ waitUntil: "networkidle" })
            await run.p.waitForTimeout(5000)
            if (name && (await run.p.getByText("let’s start with a video").count())) {
              await run.p.getByText("Projects", { exact: true }).first().click()
              await run.p.waitForTimeout(3000)
              await run.p.getByRole("button", { name: `Open ${name}`, exact: true }).first().click()
              await run.p.waitForTimeout(6000)
            }
            cardAfterDismiss = (await look(run.p)).resume
            await run.shot("after-dismiss-reload")
          }
          return true
        }
        return false
      },
    }, done, { timeout: 30 * 60_000 })
    const text = await bodyText(run)
    check(run, checks, "redirect shows 'Stopped for your new message'", /Stopped for your new message/.test(text) || !redirected)
    check(run, checks, "Stop shows 'Stopped'", /\bStopped\b/.test(text) || !stopped)
    check(run, checks, "size said in chat while the deck was open was applied", /1080×1920|9:16/.test(text), (await look(run.p)).chip ?? "")
    check(run, checks, "reload during the render kept the videos going", reloaded && !!v)
    if (dismissed) check(run, checks, "Dismissed Continue card stays dismissed after a reload", cardAfterDismiss === false)
    else note(run, checks, "no Continue card after the reload (nothing was owed), so Dismiss wasn't tested")
    check(run, checks, "no error cards", !/Couldn't reach|Something went wrong/.test(text))
    check(run, checks, "finished with hand-over", !!v)
    return finish(run, { test: "r2", checks })
  },

  // 3. changes after the build: thumbnails, per-variation headlines, one variation's video,
  //    Variation 1 itself, then back to the earlier video. Every video must go through the Make card.
  async r3() {
    const run = await open("r3-changes-after-build", { real: true })
    const checks = []
    const { v } = await toHandover(run, "A Flick for Barkbox dog toys: three toys to switch between, a rope, a squeaky duck and a chew ring", [], "Barkbox")
    check(run, checks, "built to the hand-over", !!v)
    if (!v) return finish(run, { test: "r3", checks })
    const credits0 = (await look(run.p)).credits
    // a. thumbnails
    let a = await ask(run, "Make the thumbnails on a plain white background, all three the same angle")
    await run.shot("after-thumbnails")
    check(run, checks, "thumbnail change made no video and no Make card", !a.make && !/queued|generating/.test(a.building.join(" ")), a.lastReply ?? "")
    // b. per-variation headlines
    a = await ask(run, "Give each one its own headline: rope 'Tug all day', duck 'Squeak of joy', ring 'Chew-proof'")
    await run.shot("after-headlines")
    const t1 = await bodyText(run)
    check(run, checks, "per-variation headlines applied", /Tug all day|Squeak of joy|Chew-proof/.test(t1))
    // c. one variation's video: must propose, not start
    a = await ask(run, "Make the duck video darker, evening light in the garden")
    await run.shot("after-video-change-ask")
    check(run, checks, "a video change shows the Make card and starts nothing", !!a.make && !/\d+%|queued|generating|starting/.test(a.building.join(" ")), `card: ${a.make}`)
    if (a.make) {
      run.log("pressing Make on the proposal")
      await run.p.getByRole("button", { name: /^Make · \d+ credits$/ }).first().click()
      await drive(run, {}, (v) => !v.busy && !v.make && !/\d+%|queued|generating|starting/.test(v.building.join(" ")), { timeout: 12 * 60_000, label: "duck remake" })
      await run.shot("after-duck-remake")
    }
    // d. Variation 1 itself: propose, Make, review, make the variations
    a = await ask(run, "Change the setting of all the videos to a sunny beach")
    await run.shot("after-v1-change-ask")
    check(run, checks, "a Variation 1 change shows the Make card (no new storyboard, nothing started)", !!a.make && !a.approve, `card: ${a.make}, storyboard: ${a.approve}`)
    if (a.make) {
      await run.p.getByRole("button", { name: /^Make · \d+ credits$/ }).first().click()
      let rv = 0
      const fin = await drive(run, { onReview: async () => ((rv++, await run.shot("review-after-remake")), false) }, (v) => done(v) && !v.review && !/\d+%|queued|generating|starting/.test(v.building.join(" ")), { timeout: 25 * 60_000, label: "beach remake" })
      check(run, checks, "the remade Variation 1 asked for review, then the variations were remade", rv > 0 && !!fin)
      await run.shot("after-beach")
    }
    // e. back to the earlier video: no video made
    a = await ask(run, "Go back to the earlier version of the first video, before the beach")
    await run.shot("after-go-back")
    check(run, checks, "going back made no video", !a.make && !/\d+%|queued|generating|starting/.test(a.building.join(" ")), a.lastReply ?? "")
    const credits1 = (await look(run.p)).credits
    note(run, checks, `credits ${credits0} → ${credits1}`)
    return finish(run, { test: "r3", checks })
  },

  // 4. start from scratch mid-build
  async r4() {
    const run = await open("r4-start-over", { real: true })
    const checks = []
    let sb = 0
    await startFromCreate(run, "A Flick for a cold brew coffee can, two roasts to switch between", [])
    // to Variation 1 ready (the review), then scrap it
    const v = await drive(run, { typed: "No brand, choose for me", onStoryboard: async () => ((sb++, await run.shot("storyboard")), false), onReview: async () => true }, (v) => v.review && !v.busy, { timeout: 20 * 60_000 })
    check(run, checks, "reached the Variation 1 review", !!v)
    await run.shot("before-scrap")
    const a = await ask(run, "Scrap this. Start over: make it an ad for noise-cancelling headphones instead, black and silver", 180_000)
    await run.shot("after-scrap")
    run.log("after scrap:", JSON.stringify({ q: a.question?.text, approve: a.approve, make: a.make, review: a.review, reply: a.lastReply }))
    const text = await bodyText(run)
    check(run, checks, "the chat acknowledged starting over (no silent hybrid)", /start(ing)? over|scrap|new|fresh|headphone/i.test(a.lastReply ?? "") || !!a.question || !!a.approve)
    check(run, checks, "nothing was made without a press", !/\d+%|queued|generating|starting/.test(a.building.join(" ")) || a.review)
    note(run, checks, `after scrap: question=${a.question?.text ?? "-"} storyboard=${a.approve ?? "-"} make=${a.make ?? "-"} review=${a.review}`)
    // follow it to a new storyboard if it goes there
    const fin = await drive(run, { typed: "No brand, choose for me", onStoryboard: async (v) => ((await run.shot("new-storyboard"), run.log("new storyboard:", v.approve)), true) }, (v) => !!v.approve || done(v), { timeout: 6 * 60_000, label: "after scrap" })
    check(run, checks, "a new storyboard for the headphones was offered", !!fin?.approve, fin?.approve ?? "")
    if (fin?.approve) {
      const t2 = await bodyText(run)
      check(run, checks, "the old storyboard is not what's offered (headphones, not coffee)", /headphone/i.test(t2) && !/cold brew|roast/i.test(t2.split("Approve and make")[0]?.slice(-800) ?? ""))
    }
    return finish(run, { test: "r4", checks })
  },

  // 5. the minimal user: a link, decide for me on everything
  async r5() {
    const run = await open("r5-minimal-user", { real: true })
    const checks = []
    let questions = 0, decks = 0, sb = 0
    await startFromCreate(run, "make a flick for allbirds.com", [])
    const v = await drive(run, {
      typed: "No brand, choose for me",
      pick: (q) => Math.max(0, q.options.findIndex((o) => /decide for me|you choose|surprise/i.test(o))),
      onQuestion: async (q) => (questions++, /1 of \d/.test(q.text) && decks++, false),
      onStoryboard: async () => ((sb++, await run.shot("storyboard")), false),
      onReview: async () => true,
    }, (v) => v.review && !v.busy, { timeout: 20 * 60_000 })
    check(run, checks, "reached Variation 1 with the brief in one round", questions <= 6, `${questions} questions answered`)
    check(run, checks, "storyboard shown", sb > 0)
    check(run, checks, "Variation 1 made", !!v)
    const chat = await savedChat(run)
    const asked = chat?.items?.filter((x) => x.kind === "question").map((x) => x.question) ?? []
    note(run, checks, `questions: ${asked.join(" | ")}`)
    const brand = chat?.items?.find((x) => x.kind === "brand")?.brand
    check(run, checks, "the brand was researched from the link", !!brand?.name && /allbirds/i.test(brand.name), brand?.name ?? "none")
    return finish(run, { test: "r5", checks })
  },

  // 6. the user's own clips: nothing to generate
  async r6() {
    const run = await open("r6-own-clips", { real: true })
    const checks = []
    let sb = null
    await startRecipe(run, "Clips to Flick", [[file("clips-to-flick-a.webm"), file("clips-to-flick-b.webm"), file("clips-to-flick-c.webm")], []], "Three drink flavours: Orange, Lime, Berry")
    const v = await drive(run, { onStoryboard: async (v) => ((sb = v.approve), await run.shot("storyboard"), false) }, (v) => done(v) || (!v.busy && !!sb && v.building.length >= 3 && !v.approve && !v.question), { timeout: 12 * 60_000 })
    check(run, checks, "storyboard offered 'Build the Flick' (nothing to generate)", sb === "Build the Flick", sb ?? "none")
    check(run, checks, "built from the clips", !!v)
    const text = await bodyText(run)
    check(run, checks, "no video was generated", !/\d+%|queued|generating/.test(text))
    return finish(run, { test: "r6", checks })
  },

  // 7. the Product Swap recipe with three shoes
  async r7() {
    const run = await open("r7-product-swap-shoes", { real: true })
    const checks = []
    let sb = 0, questions = 0
    await startRecipe(run, "Product Swap", [[file("product-swap-a.webm")], [file("shoe-1.jpg"), file("shoe-2.jpg"), file("shoe-3.png")]], "Swap the sneaker for each of these three shoes")
    const v = await drive(run, {
      onQuestion: async () => (questions++, false),
      onStoryboard: async () => ((sb++, await run.shot("storyboard")), false),
      onReview: async () => ((await run.shot("review")), false),
    }, done, { timeout: 25 * 60_000 })
    check(run, checks, "the form skipped the questions", questions <= 1, `${questions} asked`)
    check(run, checks, "storyboard shown", sb > 0)
    check(run, checks, "finished with hand-over", !!v)
    const chat = await savedChat(run)
    const plan = chat?.items?.find((x) => x.kind === "plan")?.plan
    check(run, checks, "three variations, one per shoe", (plan?.variations?.length ?? 0) === 3, plan?.variations?.map((x) => x.name).join(", ") ?? "")
    check(run, checks, "each variation names its shoe image", !!plan && plan.variations.slice(1).every((x) => (x.image_ids ?? []).length >= 1), plan?.variations?.map((x) => (x.image_ids ?? []).join("+")).join(" | ") ?? "")
    return finish(run, { test: "r7", checks })
  },

  // 8. odd input: Japanese, a long brief, an empty message, Approve pressed twice fast
  async r8() {
    const run = await open("r8-odd-input", { real: true })
    const checks = []
    const long = "We are a small family-run bakery in Portland called Crumb & Co. We have been baking sourdough since 2011 and our customers love the crust. " + "We want a video ad for our three best sellers: the country loaf, the seeded rye and the cinnamon morning bun. ".repeat(6) + "The ad should feel warm and handmade, early morning light, flour in the air, and it runs on Instagram."
    let approveClicks = 0, sb = 0
    await startFromCreate(run, long, [])
    // an empty message while it works
    await run.p.waitForTimeout(3000)
    await run.p.getByRole("textbox", { name: "Message" }).press("Enter")
    run.log("pressed Enter on an empty message")
    const v = await drive(run, {
      typed: "Crumb & Co",
      onStoryboard: async (v) => {
        sb++
        await run.shot("storyboard")
        run.log("Approve pressed twice, fast")
        const b = run.p.getByRole("button", { name: v.approve }).last()
        await b.click()
        approveClicks++
        await b.click({ timeout: 800 }).then(() => approveClicks++, () => {})
        return true
      },
      onReview: async () => true,
    }, (v) => v.review && !v.busy, { timeout: 20 * 60_000 })
    check(run, checks, "the long brief reached Variation 1", !!v)
    const chat = await savedChat(run)
    const builds = chat?.items?.filter((x) => x.kind === "build").length ?? 0
    const plans = chat?.items?.filter((x) => x.kind === "plan" && x.state === "approved").length ?? 0
    check(run, checks, "a double Approve started one build", builds === 1 && plans === 1, `builds ${builds}, approved plans ${plans}, clicks ${approveClicks}`)
    const text = await bodyText(run)
    check(run, checks, "no error cards", !/Couldn't reach|Something went wrong/.test(text))
    // Japanese, in the same project: a change in Japanese
    const a = await ask(run, "見出しを「朝の焼きたて」に変えてください")
    await run.shot("after-japanese")
    const t2 = await bodyText(run)
    check(run, checks, "a Japanese request changed the headline", /朝の焼きたて/.test(t2), a.lastReply ?? "")
    return finish(run, { test: "r8", checks })
  },

  // 9. reopen a finished project in a fresh browser
  async r9() {
    const run = await open("r9-reopen-later", { real: true })
    const checks = []
    const { v } = await toHandover(run, "A Flick for a hand cream called Velvet Palm, three scents to switch between", [], "Velvet Palm")
    check(run, checks, "built to the hand-over", !!v)
    const name = await projectName(run)
    const chat1 = await savedChat(run)
    await run.b.close()
    // a fresh browser
    const again = await open("r9-reopen-later-fresh", { real: true })
    const { p } = again
    await p.getByText("Projects", { exact: true }).first().click()
    await p.waitForTimeout(3000)
    await p.getByRole("button", { name: `Open ${name}`, exact: true }).first().click()
    await p.waitForTimeout(6000)
    await again.shot("reopened")
    const w = await look(p)
    const text = await p.evaluate(() => document.body.innerText)
    check(again, checks, "no Continue card on a finished project", !w.resume)
    check(again, checks, "the videos are back (no generating, no Up next)", !/\d+%|queued|generating|Up next|After your OK/.test(w.building.join(" ")), w.building.slice(0, 6).join(" | "))
    check(again, checks, "chat history is back", (chat1?.items?.length ?? 0) > 0 && /Variation 1|variations/i.test(text))
    check(again, checks, "suggestions under the composer", w.suggestions)
    again.state.projectId = run.state.projectId
    return finish(again, { test: "r9", checks })
  },

  // 10. failures (sample videos, forced): refund, no automatic retry, Try again
  async r10() {
    const run = await open("r10-failures-sample")
    const checks = []
    let sawFail = false, tryAgain = 0, chatRetried = false
    await startRecipe(run, "Product Swap", [[file("product-swap-a.webm")], [file("sneaker.jpg")]], "Swap the sneaker for a red and a sage green version")
    const v = await drive(run, {
      onStoryboard: async (v) => {
        await run.p.evaluate(() => localStorage.setItem("flam.mockFail", "2"))
        run.log("mockFail=2, approving:", v.approve)
        await run.p.getByRole("button", { name: v.approve }).last().click()
        return true
      },
      onMake: async (v) => (run.log("the chat proposed a remake after the failure (card shown, nothing started)"), chatRetried = true, false),
      onTick: async (v) => {
        if (v.tryAgain && !sawFail) (sawFail = true), await run.shot("failed-tile")
        // both videos fail (mockFail=2); press Try again on each failed tile, one at a time
        if (v.tryAgain && !v.busy && sawFail && tryAgain < 3 && !v.make) {
          await run.p.waitForTimeout(5000)
          const again = await look(run.p)
          if (again.tryAgain && !again.busy) {
            tryAgain++
            run.log("pressing Try again", tryAgain)
            await run.p.getByRole("button", { name: "Try again" }).first().click()
            await run.p.waitForTimeout(3000)
            return true
          }
        }
        return false
      },
    }, (v) => done(v) && !v.tryAgain, { timeout: 15 * 60_000 })
    const chat = await savedChat(run)
    const autoVideos = (chat?.items ?? []).filter((x) => x.kind === "design" && /regenerating with the new prompt/.test(x.text ?? "")).length
    check(run, checks, "a failed tile showed Didn't generate + Try again", sawFail)
    check(run, checks, "no automatic remake by the chat", autoVideos === 0, chatRetried ? "it proposed one (Make card), which is allowed" : "")
    check(run, checks, "Try again worked and the Flick finished", !!v, `Try again pressed: ${tryAgain}`)
    return finish(run, { test: "r10", checks })
  },
}

TESTS[process.argv[2]]().then(
  (s) => console.log("SUMMARY", JSON.stringify(s)),
  (e) => console.log("CRASH", e.stack?.slice(0, 800)),
)
