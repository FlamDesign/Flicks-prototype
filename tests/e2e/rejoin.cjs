/**
 * Managed agent: words stream in token by token, and a reload mid-reply rejoins the session.
 *   FP=<passcode> SITE=<site> SAMPLE=1 MANAGED=1 node tests/e2e/rejoin.cjs
 */
const { open, drive } = require("./lib.cjs")

;(async () => {
  const run = await open("rejoin")
  const { p, log } = run
  await p.getByPlaceholder(/Describe your video/).fill("We want a video ad for our three best sellers: the country loaf, the seeded rye and the cinnamon morning bun. Warm and handmade, early morning light. It runs on Instagram.")
  await p.locator('button[aria-label="Start"]').first().click()
  // the reply's words as they arrive
  const lengths = []
  const t0 = Date.now()
  while (Date.now() - t0 < 12000) {
    const n = await p.evaluate(() => { const els = [...document.querySelectorAll('[data-slot="assistant"], article, p')]; return els.map((e) => e.innerText.length).reduce((a, b) => Math.max(a, b), 0) })
    lengths.push(n)
    await p.waitForTimeout(400)
  }
  log("reply length over 12 s:", lengths.join(" "))
  log("reloading mid-reply, url", p.url())
  await p.reload({ waitUntil: "networkidle" })
  let carry = false
  const v = await drive(run, { onTick: async (v) => { if (v.resume) carry = true; return false } }, (v) => !!v.question || !!v.approve, { timeout: 120000, label: "after reload" })
  log("Carry on card shown:", carry, "| question:", v.question?.text ?? "(none)")
  await run.shot("after-reload")
  await run.b.close()
})().catch((e) => {
  console.error("CRASH", e)
  process.exit(1)
})
