// Screenshots of every state of the chat flow, for the FigJam flow board. Sample videos (nothing generated).
// FP=<passcode> node tests/e2e/capture.cjs
const { open, drive, say, file, drop, look } = require("./lib.cjs")

const shots = []
async function snap(run, label) {
  await run.p.waitForTimeout(600)
  await run.shot(label)
  shots.push(label)
}
const quiet = async (run, ms = 90_000) => {
  const end = Date.now() + ms
  let v
  while (Date.now() < end) {
    await run.p.waitForTimeout(1500)
    v = await look(run.p)
    if (!v.busy) {
      await run.p.waitForTimeout(2500)
      v = await look(run.p)
      if (!v.busy) return v
    }
  }
  return v
}

;(async () => {
  const run = await open("capture-flow")
  const { p } = run
  // 1 Create page, template page, template card in chat
  await snap(run, "create-page")
  await p.getByLabel(/ template$/).first().click()
  await p.waitForTimeout(2500)
  await snap(run, "template-page")
  await p.getByRole("button", { name: "Use as reference" }).click()
  await p.waitForTimeout(5000)
  await snap(run, "template-in-chat")
  // back to Create for the real run
  await p.goto(p.url(), { waitUntil: "networkidle" })
  await p.waitForTimeout(2500)
  await drop(p, "[data-create-prompt] > div", [file("sneaker.jpg")])
  await p.waitForTimeout(2500)
  await p.getByPlaceholder(/Describe your video/).fill("A launch Flick for these sneakers, three colors to switch between")
  await snap(run, "create-filled")
  await p.getByRole("button", { name: "Start", exact: true }).click()
  await p.waitForTimeout(3000)
  await snap(run, "chat-thinking")
  let decks = 0, concepts = 0, sb = 0, rv = 0, built = 0
  const v = await drive(
    run,
    {
      typed: "Allbirds",
      onQuestion: async (q, v) => {
        if (/concept/i.test(q.text)) {
          if (concepts++ === 0) await snap(run, "concepts")
          return false
        }
        if (decks++ === 0) await snap(run, "question-deck")
        if (decks === 2) await snap(run, "question-deck-2")
        return false
      },
      onAssets: async () => (await snap(run, "assets-request"), false),
      onStoryboard: async () => (sb++ === 0 && (await snap(run, "storyboard")), false),
      onReview: async () => (rv++ === 0 && (await snap(run, "review-bar")), false),
      onTick: async (v) => {
        if (built === 0 && v.building.length && /\d+%|Generating/.test(v.building.join(" "))) {
          built = 1
          await snap(run, "build-card-v1")
        }
        if (built === 1 && rv > 0 && v.building.length && /\d+%|Generating/.test(v.building.join(" "))) {
          built = 2
          await snap(run, "build-card-variations")
        }
        return false
      },
    },
    (v) => !v.busy && !v.question && !v.approve && !v.review && !v.make && !v.assets && sb > 0 && rv > 0 && !/\d+%|Generating|Up next|Waiting/.test(v.building.join(" ")),
    { timeout: 12 * 60_000, label: "flow" },
  )
  await snap(run, "hand-over")
  // changes
  await say(p, "Make the headline shorter and the button orange")
  await quiet(run)
  await snap(run, "design-change")
  await say(p, "Make the second video darker, evening light")
  await quiet(run)
  await snap(run, "make-card")
  await p.getByRole("button", { name: "Not now" }).first().click().catch(() => {})
  await p.waitForTimeout(1500)
  await say(p, "Change all the videos to a sunny beach")
  await quiet(run)
  await snap(run, "make-card-v1")
  await p.getByRole("button", { name: /^Make · \d+$/ }).first().click().catch(() => {})
  let seen = 0
  await drive(run, { onReview: async () => (seen++ === 0 && (await snap(run, "review-remade")), false) }, (v) => seen > 0 && !v.busy && !v.review && !/\d+%|Generating|Up next|Waiting/.test(v.building.join(" ")), { timeout: 10 * 60_000, label: "remake" })
  await snap(run, "after-remake")
  await say(p, "Go back to the earlier version of the first video")
  await quiet(run)
  await snap(run, "go-back")
  // stop + redirect
  await say(p, "Write three alternative headlines and explain each")
  await p.waitForTimeout(2500)
  await p.getByRole("button", { name: "Stop" }).click().catch(() => {})
  await p.waitForTimeout(1500)
  await snap(run, "stopped")
  // export
  await p.getByRole("button", { name: "Export" }).first().click()
  await p.waitForTimeout(1500)
  await snap(run, "export-dialog")
  await p.getByRole("dialog").getByRole("button", { name: /^Export/ }).click().catch(() => {})
  await p.waitForTimeout(9000)
  await snap(run, "flick-page")
  // continue card: send a message and reload while the chat works
  console.log("SHOTS", JSON.stringify(shots), run.out)
  await run.b.close()
})().catch((e) => (console.log("CRASH", e.stack?.slice(0, 600)), process.exit(1)))
