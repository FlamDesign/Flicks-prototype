// The six end-to-end chats. Run one: node tests.cjs t1
const { open, drop, look, say, drive, file, finish, projectName, savedChat } = require("./lib.cjs")

const done = (v) => v.suggestions && !v.busy
const check = (run, checks, name, ok, note = "") => {
  checks.push({ name, ok: !!ok, note })
  run.log(`CHECK ${ok ? "PASS" : "FAIL"}: ${name}${note ? ` (${note})` : ""}`)
}

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

async function startRecipe(run, name, slots, note) {
  const { p } = run
  await p.locator("section[aria-label=Recipes] button").filter({ hasText: name }).first().click()
  await p.waitForTimeout(1500)
  const zones = p.locator('[role="dialog"] button[class*="group/drop"]')
  // a filled slot's drop area turns into tiles, so the next empty one is always the first left
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
  if (note) await p.locator('[role="dialog"] textarea').last().fill(note).catch(() => {})
  await run.shot("recipe-form")
  await p.locator('[role="dialog"]').getByRole("button", { name: /^Start/ }).click()
  run.log("recipe started:", name)
}

async function nameWhenSaved(run) {
  for (let i = 0; i < 15; i++) {
    const n = await projectName(run).catch(() => null)
    if (n) return n
    await run.p.waitForTimeout(2000)
  }
  return null
}

async function reopenLatest(run, name) {
  const { p, log } = run
  // the reload may land on the project itself: then there's nothing to reopen
  const link = p.getByText("Projects", { exact: true }).first()
  if (!(await link.waitFor({ state: "visible", timeout: 15000 }).then(() => true, () => false))) {
    await p.screenshot({ path: require("path").join(run.out, "reload-landing.png") })
    if (await p.getByRole("textbox").count()) return log("reload kept the project open")
  }
  await link.click()
  await p.waitForTimeout(3000)
  // its own project (other tests run at the same time)
  const card = name ? p.getByRole("button", { name: `Open ${name}`, exact: true }).first() : p.getByRole("button", { name: /^Open / }).first()
  log("reopening", await card.getAttribute("aria-label"))
  await card.click()
  await p.waitForTimeout(5000)
}

const TESTS = {
  // 1. text only, the happy path to the hand-over
  async t1() {
    const run = await open("t1-text-happy")
    const checks = []
    let sb = 0, rv = 0
    await startFromCreate(run, "A Flick for a summer lemonade brand called Sunsip: three flavours viewers can switch between")
    const v = await drive(run, {
      typed: "Sunsip",
      onStoryboard: async () => ((sb++, await run.shot("storyboard")), false),
      onReview: async () => ((rv++, await run.shot("review")), false),
    }, done, { timeout: 15 * 60_000 })
    check(run, checks, "storyboard shown", sb > 0)
    check(run, checks, "Variation 1 review shown in build card", rv > 0)
    check(run, checks, "all variations made, hand-over and suggestions", !!v)
    await run.p.waitForTimeout(3000)
    return finish(run, { test: "t1", checks })
  },

  // 2. product photos; change size and length at the storyboard; approve Variation 1 in words
  async t2() {
    const run = await open("t2-photos-size-length")
    const checks = []
    let sb = 0, saidOk = false
    const chips = []
    await startFromCreate(run, "A Flick for these sneakers, a launch ad", [file("sneaker.jpg")])
    const v = await drive(run, {
      onTick: async (v) => (v.chip && chips.at(-1) !== v.chip && chips.push(v.chip), false),
      onStoryboard: async (v) => {
        sb++
        await run.shot(`storyboard-${sb}`)
        if (sb === 1) return run.log("asking: make it 9:16"), await say(run.p, "Make it vertical 9:16 for Stories"), true
        if (sb === 2) return run.log("asking: 5 seconds"), await say(run.p, "And make it 5 seconds long"), true
        return false
      },
      onReview: async () => {
        if (saidOk) return true
        saidOk = true
        await run.shot("review")
        run.log("approving in words")
        await say(run.p, "Looks good, go ahead and make the rest")
        return true
      },
    }, done, { timeout: 18 * 60_000 })
    check(run, checks, "size changed to 9:16", chips.some((c) => /1080×1920|720×1280|9:16/.test(c)), chips.join(" → "))
    check(run, checks, "length changed to 5s", chips.some((c) => / 5s/.test(c)), chips.join(" → "))
    check(run, checks, "approved Variation 1 in words", saidOk)
    check(run, checks, "finished with hand-over", !!v)
    return finish(run, { test: "t2", checks, chips })
  },

  // 3. a website; typed brand; redirect mid-reply; Stop; several-pick questions
  async t3() {
    const run = await open("t3-website-interrupts")
    const checks = []
    let redirected = false, stopped = false, busyTicks = 0, multi = 0
    await startFromCreate(run, "Make a Flick for Allbirds runners, see allbirds.com")
    const v = await drive(run, {
      typed: "Allbirds",
      onQuestion: async (q) => (q.multi && multi++, false),
      onTick: async (v) => {
        if (!v.busy) return false
        busyTicks++
        if (!redirected && busyTicks === 3) {
          redirected = true
          run.log("redirect while busy")
          await say(run.p, "Actually, focus on the Tree Dasher only, in two colours")
          await run.p.waitForTimeout(1500)
          await run.shot("after-redirect")
          return true
        }
        if (redirected && !stopped && busyTicks === 12) {
          stopped = true
          run.log("pressing Stop")
          await run.p.getByRole("button", { name: "Stop" }).click().catch(() => {})
          await run.p.waitForTimeout(1500)
          await run.shot("after-stop")
          await say(run.p, "Carry on")
          return true
        }
        return false
      },
    }, done, { timeout: 18 * 60_000 })
    const text = await run.p.evaluate(() => document.body.innerText)
    check(run, checks, "redirect shows 'Stopped for your new message'", /Stopped for your new message/.test(text) || !redirected, redirected ? "" : "never busy long enough")
    check(run, checks, "Stop shows 'Stopped'", /\bStopped\b/.test(text) || !stopped)
    check(run, checks, "no error cards", !/Couldn't reach|Something went wrong/.test(text))
    check(run, checks, "finished with hand-over", !!v, `several-pick questions seen: ${multi}`)
    return finish(run, { test: "t3", checks })
  },

  // 4. Product Swap with the user's video (it is Variation 1, so no review): forced failures, the chat's retry, Try again
  async t4() {
    const run = await open("t4-product-swap-failures")
    const checks = []
    let sawFail = false, tryAgain = 0, retriedByChat = false
    await startRecipe(run, "Product Swap", [[file("product-swap-a.webm")], [file("sneaker.jpg")]], "Swap the sneaker for a red and a sage green version")
    const v = await drive(run, {
      onStoryboard: async (v) => {
        // three failures: both variations fail once (the chat retries each), then one retry fails again
        await run.p.evaluate(() => localStorage.setItem("flam.mockFail", "3"))
        run.log("mockFail=3, approving:", v.approve)
        await run.p.getByRole("button", { name: v.approve }).last().click()
        return true
      },
      onTick: async (v) => {
        if (v.tryAgain && !sawFail) (sawFail = true), await run.shot("failed-tile")
        if (v.busy && sawFail) retriedByChat = true
        // after the second failure the chat should only tell; then we press Try again
        if (v.tryAgain && !v.busy && sawFail && tryAgain === 0 && retriedByChat) {
          await run.p.waitForTimeout(6000)
          const again = await look(run.p)
          if (again.tryAgain && !again.busy) {
            tryAgain++
            run.log("pressing Try again")
            await run.shot("before-try-again")
            await run.p.getByRole("button", { name: "Try again" }).first().click()
            return true
          }
        }
        return false
      },
    }, (v) => done(v) && !v.tryAgain, { timeout: 15 * 60_000 })
    check(run, checks, "a failed tile showed Didn't generate + Try again", sawFail)
    check(run, checks, "the chat retried after the first failure", retriedByChat)
    check(run, checks, "Try again worked and the Flick finished", !!v, `Try again pressed: ${tryAgain}`)
    return finish(run, { test: "t4", checks })
  },

  // 5. Make It Move: reload mid-reply (Continue), reload while videos are made, remove a waiting variation
  async t5() {
    const run = await open("t5-make-it-move-reloads")
    const checks = []
    let reload1 = false, reload2 = false, removed = false, waitingSeen = 0, busyTicks = 0, resumed = 0
    await startRecipe(run, "Make It Move", [[file("perfume.jpg")]], "A slow push-in, the bottle catching light")
    const v = await drive(run, {
      onTick: async (v) => {
        if (v.resume) resumed++
        if (v.busy) busyTicks++
        if (!reload1 && v.busy && busyTicks === 4) {
          reload1 = true
          const name = await nameWhenSaved(run)
          run.log("RELOAD mid-reply", name)
          await run.p.reload({ waitUntil: "networkidle" })
          await reopenLatest(run, name)
          await run.shot("after-reload-1")
          return true
        }
        // while Variation 1 is being made
        if (!reload2 && v.building.length && (await run.p.locator("text=/\\d+%|queued|generating|Making/").count()) > 0) {
          reload2 = true
          const name = await nameWhenSaved(run)
          run.log("RELOAD while videos are made", name)
          const brief = (c) => c && JSON.stringify({ inTurn: c.inTurn, last: c.msgs?.at(-1)?.role, pending: c.pending?.length, plan: c.items?.find((x) => x.kind === "plan")?.state })
          // a real reload comes a few seconds after approving at the earliest: wait for the approval to be saved (up to 15 s)
          let before = null
          for (let i = 0; i < 15; i++) {
            before = await savedChat(run)
            if (before?.items?.find((x) => x.kind === "plan")?.state === "approved") break
            await run.p.waitForTimeout(1000)
          }
          run.log("saved before reload", brief(before))
          await run.p.reload({ waitUntil: "networkidle" })
          run.log("saved after reload", brief(await savedChat(run)))
          // approving can rename the project: reopen it by its current name
          await reopenLatest(run, (await nameWhenSaved(run)) ?? name)
          await run.shot("after-reload-2")
          return true
        }
        return false
      },
      onReview: async () => {
        if (!removed) {
          const rm = run.p.getByRole("button", { name: "Remove" })
          waitingSeen = Math.max(waitingSeen, await rm.count())
          if ((await rm.count()) > 1) {
            removed = true
            run.log("removing one waiting variation")
            await rm.last().click()
            await run.p.waitForTimeout(1500)
            await run.shot("removed")
          }
        }
        return false
      },
    }, done, { timeout: 20 * 60_000 })
    check(run, checks, "reload mid-reply offered Continue", resumed > 0 || !reload1, `resume card seen ${resumed}×`)
    check(run, checks, "videos carried on after a reload", reload2 && !!v)
    // only when there were two or more waiting (the plan decides how many variations there are)
    if (waitingSeen > 1) check(run, checks, "removed a waiting variation", removed)
    else run.log(`remove step skipped: ${waitingSeen} waiting variation(s)`)
    check(run, checks, "finished with hand-over", !!v)
    return finish(run, { test: "t5", checks })
  },

  // 6. Clips to Flick: three finished clips, nothing to generate; export with a missing link
  async t6() {
    const run = await open("t6-clips-export")
    const checks = []
    let sb = null
    await startRecipe(run, "Clips to Flick", [[file("clips-to-flick-a.webm"), file("clips-to-flick-b.webm"), file("clips-to-flick-c.webm")], []], "Three drink flavours: Orange, Lime, Berry")
    const v = await drive(run, {
      onStoryboard: async (v) => ((sb = v.approve), await run.shot("storyboard"), false),
    }, (v) => done(v) || (!v.busy && !!sb && v.building.length >= 3 && !v.approve && !v.question), { timeout: 12 * 60_000 })
    check(run, checks, "storyboard offered 'Build the Flick' (nothing to generate)", sb === "Build the Flick", sb ?? "none")
    check(run, checks, "built from the clips", !!v)
    const exp = run.p.getByRole("button", { name: /^Export/ }).first()
    if (await exp.isVisible().catch(() => false)) {
      await exp.click()
      await run.p.waitForTimeout(2000)
      await run.shot("export")
      const t = await run.p.evaluate(() => document.querySelector('[role="dialog"]')?.innerText ?? "")
      run.log("export dialog:", t.replace(/\s+/g, " ").slice(0, 300))
      check(run, checks, "export dialog opens and names what's missing", /link|missing|before/i.test(t), t.replace(/\s+/g, " ").slice(0, 160))
    } else check(run, checks, "export button found", false)
    return finish(run, { test: "t6", checks })
  },
}

TESTS[process.argv[2]]().then(
  (s) => console.log("SUMMARY", JSON.stringify(s)),
  (e) => console.log("CRASH", e.stack?.slice(0, 800)),
)
