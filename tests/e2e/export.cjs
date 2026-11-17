/**
 * Exports an existing project as a real Flick on the Flicks API and waits for its share page:
 * opens the project (PROJECT, a name fragment; default the Enchantress one), presses Export,
 * confirms, and watches the Flick page until its link is the API's share page (or it fails).
 *   FP=<passcode> SITE=<site> [PROJECT="Three Shades"] node tests/e2e/export.cjs
 */
const { open } = require("./lib.cjs")

;(async () => {
  const run = await open("export", { real: true })
  const { p, log } = run
  const want = process.env.PROJECT || "Three Shades"
  await p.getByRole("link", { name: "Projects" }).or(p.getByRole("button", { name: "Projects" })).first().click()
  const card = p.getByText(new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).first()
  await card.waitFor({ timeout: 60000 })
  await card.click()
  const exp = p.getByRole("button", { name: /^Export$/ })
  await exp.waitFor({ timeout: 60000 })
  await p.waitForTimeout(1500)
  await exp.click()
  const dialog = p.getByRole("dialog", { name: "Export Flick" })
  await dialog.waitFor({ timeout: 15000 })
  const issues = await dialog.innerText()
  log("dialog:", issues.replace(/\s+/g, " ").slice(0, 300))
  await run.shot("export-dialog")
  const go = dialog.getByRole("button", { name: /^Export( anyway)?$/ })
  if (await go.isDisabled()) throw new Error("Export is blocked: " + issues)
  await go.click()
  // the Flick page opens and prepares; done when the Link card shows the share page, or it failed
  const until = Date.now() + 240000
  let text = ""
  while (Date.now() < until) {
    await p.waitForTimeout(5000)
    text = await p.evaluate(() => document.body.innerText)
    if (/flamapp\.live|Export failed|couldn’t be made/.test(text)) break
    const m = text.match(/Preparing… \d+%/)
    if (m) log(m[0])
  }
  await run.shot("flick-page")
  const link = text.match(/\S*flamapp\.live\S*/)?.[0]
  log(link ? `share page: https://${link}` : "no share page: " + (text.match(/This Flick couldn’t be made[\s\S]{0,300}/)?.[0] ?? text.slice(0, 300)).replace(/\s+/g, " "))
  if (link) {
    const share = await run.ctx.newPage()
    await share.goto(`https://${link}`, { waitUntil: "networkidle" }).catch(() => {})
    await share.waitForTimeout(4000)
    await share.screenshot({ path: `${run.out}/share-page.png` })
    log("share page screenshot saved")
  }
  await run.b.close()
  if (!link) process.exit(2)
})().catch((e) => {
  console.error("CRASH", e)
  process.exit(1)
})
