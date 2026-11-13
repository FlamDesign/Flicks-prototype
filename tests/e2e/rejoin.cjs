/**
 * Managed agent: words stream in token by token, and a reload mid-reply rejoins the session.
 *   FP=<passcode> SITE=<site> SAMPLE=1 MANAGED=1 node tests/e2e/rejoin.cjs
 */
const { open, drive, projectName, look } = require("./lib.cjs")

;(async () => {
  const run = await open("rejoin")
  const { p, log } = run
  p.on("console", (m) => /error|warn/i.test(m.type()) && log("console", m.type(), m.text().slice(0, 200)))
  await p.getByPlaceholder(/Describe your video/).fill("We want a video ad for our three best sellers: the country loaf, the seeded rye and the cinnamon morning bun. Warm and handmade, early morning light. It runs on Instagram.")
  await p.locator('button[aria-label="Start"]').first().click()
  // the reply's words as they arrive: every change to the reply's text, with its length
  await p.evaluate(() => {
    window.__growth = []
    new MutationObserver(() => {
      const els = [...document.querySelectorAll("[data-reply]")]
      const n = els.length ? els[els.length - 1].innerText.length : 0
      const last = window.__growth.at(-1)
      if (n && (!last || last.n !== n)) window.__growth.push({ t: Date.now(), n })
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  // reload while it's still working (a couple of seconds in)
  const tb = Date.now()
  while (Date.now() - tb < 20000 && !(await look(p)).busy) await p.waitForTimeout(100)
  // the project must be saved before a reload can reopen it
  let name = null
  for (let i = 0; i < 20 && !name; i++) (name = await projectName(run).catch(() => null)), name || (await p.waitForTimeout(500))
  const growth = await p.evaluate(() => window.__growth)
  log("reply growth before reload:", growth.length ? growth.map((g) => `${g.n}@${((g.t - growth[0].t) / 1000).toFixed(2)}s`).join(" ") : "(no words yet)")
  const v0 = await look(p)
  log("busy before reload:", v0.busy)
  await p.reload({ waitUntil: "networkidle" })
  log("reloaded mid-reply; project", name)
  // no router: a reload lands on Home, so the project is reopened from Projects
  await p.getByText("Projects", { exact: true }).first().click()
  await p.waitForTimeout(2500)
  await p.getByRole("button", { name: `Open ${name}`, exact: true }).first().click()
  await p.waitForTimeout(1500)
  const first = await look(p)
  log("flag after reload:", await p.evaluate(() => localStorage.getItem("flam.managed")))
  log("errors:", JSON.stringify(run.state.errors))
  log("right after reopening:", JSON.stringify({ resume: first.resume, busy: first.busy, question: first.question?.text }))
  let carry = first.resume
  const v = await drive(run, { onTick: async (v) => { if (v.resume) carry = true; return false } }, (v) => !!v.question || !!v.approve, { timeout: 120000, label: "after reload" })
  log("Carry on card shown:", carry, "| question:", v.question?.text ?? "(none)")
  await run.shot("after-reload")
  await run.b.close()
})().catch((e) => {
  console.error("CRASH", e)
  process.exit(1)
})
