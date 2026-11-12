// Runs one brief (words + files) to the storyboard and records what the chat asked and inferred.
// FP=<passcode> SITE=<site url> SAMPLE=1 node tests/e2e/brief.cjs <name> "<brief>" [file ...]
const { open, drop, drive, file, look } = require("./lib.cjs")

const [name, brief, ...files] = process.argv.slice(2)
;(async () => {
  const run = await open(`brief-${name}`)
  const { p } = run
  if (files.length) {
    await drop(p, "[data-create-prompt] > div", files.map(file))
    await p.waitForTimeout(2500)
  }
  await p.getByPlaceholder(/Describe your video/).fill(brief)
  await p.locator('button[aria-label="Start"]').first().click()
  run.log("started:", brief)
  const asked = []
  let sb = 0
  const v = await drive(
    run,
    {
      typed: "No brand, choose for me",
      pick: (q) => Math.max(0, q.options.findIndex((o) => /decide|you choose|surprise/i.test(o))),
      onQuestion: async (q) => (asked.push(q.text), false),
      onStoryboard: async () => (sb++ === 0 && (await run.shot("storyboard")), true),
    },
    (v) => sb > 0,
    { timeout: 6 * 60_000, label: "to the storyboard" },
  )
  // the chat's own lines before the storyboard (what it inferred and said)
  const said = await p.locator("main").innerText().then((t) => t.split("\n").filter((l) => l.length > 20).slice(0, 40).join("\n"))
  run.log("ASKED", JSON.stringify(asked))
  console.log("ASKED", JSON.stringify(asked))
  console.log("SAID\n" + said.slice(0, 1800))
  await run.b.close()
})().catch((e) => (console.log("CRASH", e.stack?.slice(0, 400)), process.exit(1)))
