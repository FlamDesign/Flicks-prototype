/**
 * Sets up (or updates) the managed agent from the app's own prompt, skills and tools: opens the
 * site, Dev > State manager > AI, presses "Set up the agent" and prints what it says.
 *   FP=<passcode> SITE=<site> node tests/e2e/agent-setup.cjs
 */
const { open } = require("./lib.cjs")

;(async () => {
  const run = await open("agent-setup")
  const { p, log } = run
  await p.getByRole("button", { name: "Dev menu" }).click()
  await p.getByRole("menuitem", { name: /^AI/ }).click()
  const btn = p.getByRole("button", { name: /Set up the agent|Update the agent/ })
  await btn.waitFor({ timeout: 15000 })
  log("pressing", await btn.innerText())
  await btn.click()
  await p.waitForFunction(() => /Created the agent|Updated the agent|Couldn't set up|answered \d+|not_found|error/i.test([...document.querySelectorAll("p")].map((x) => x.innerText).join("\n")), null, { timeout: 90000 })
  const text = await p.evaluate(() => [...document.querySelectorAll("p")].map((x) => x.innerText).filter((t) => /the agent|Agent agent_/.test(t)).join("\n"))
  log("said:", text.slice(0, 600))
  await run.shot("agent-setup")
  await run.b.close()
})().catch((e) => {
  console.error("CRASH", e)
  process.exit(1)
})
