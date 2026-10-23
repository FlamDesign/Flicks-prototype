// Captures the Help Center walkthroughs from the built prototype: each frame is a screenshot plus
// where the next click lands (as % of the frame), so the player can animate a cursor to it.
// Run: node scripts/capture-help.mjs (after vite build). Writes src/help/frames/*.png and frames.json.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'
const W = 1280, H = 800
const URL = 'file://' + process.cwd() + '/dist/index.html'
const OUT = 'src/help/frames'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const frames = {}
let p
const wait = (ms) => p.waitForTimeout(ms)
async function fresh(hash = '') {
  if (p) await p.close()
  p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('ERR', e.message))
  await p.goto(URL + '#capture' + hash)
  await wait(1200)
}
async function shot(guide, caption, target) {
  let pt = {}
  if (target) {
    const bb = await target.first().boundingBox().catch(() => null)
    if (bb) pt = { x: +(((bb.x + bb.width / 2) / W) * 100).toFixed(1), y: +(((bb.y + bb.height / 2) / H) * 100).toFixed(1), w: +((bb.width / W) * 100).toFixed(1), h: +((bb.height / H) * 100).toFixed(1) }
    else console.log('  no target for', guide, caption)
  }
  frames[guide] ??= []
  const file = `${guide}-${frames[guide].length + 1}`
  await p.screenshot({ path: `${OUT}/${file}.png` })
  frames[guide].push({ file, caption, ...pt })
}
const btn = (name, exact = true) => p.getByRole('button', { name, exact })
const nav = (n) => p.getByRole('button', { name: new RegExp('^' + n + '$') }).first()
async function step(name, fn) {
  try { await fn(); console.log('ok', name) } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]) }
}

// ---------- Basics ----------
await step('start', async () => {
  await fresh()
  const box = p.locator('main textarea').first()
  await shot('start', 'Describe the video you want in the prompt box on Create.', box)
  await box.fill('Wheat leather boot on wet black rock in heavy rain, slow macro push along the stitching')
  await wait(400)
  await shot('start', 'Pick its length and size. The credits it costs show as you type.', p.getByRole('button', { name: /Size/ }))
  await shot('start', 'Click Generate.', btn('Generate', false))
  await btn('Generate', false).first().click(); await wait(1500)
  await shot('start', 'The editor opens and makes your reference video. It names the project for you.', p.locator('[data-tour="frame"]'))
})
await step('templates', async () => {
  await fresh()
  await p.locator('#templates').scrollIntoViewIfNeeded(); await wait(500)
  const card = p.getByRole('button', { name: /template$/ }).nth(1)
  await shot('templates', 'Scroll to Start with templates and pick one. Filter by industry or size.', card)
  await card.click(); await wait(900)
  await shot('templates', 'Try its variations, then click Use template.', btn('Use template', false))
  await btn('Use template', false).first().click(); await wait(1500)
  await shot('templates', 'A new project opens with everything already made. Change anything you like.', p.locator('[data-tour="frame"]'))
})
await step('assets', async () => {
  await fresh()
  await nav('Assets').click(); await wait(700)
  const v = p.getByRole('button', { name: /^Open video/ }).first()
  await shot('assets', 'Every video you generate is kept in Assets. Open one.', v)
  await v.click(); await wait(800)
  await shot('assets', 'Click Use in Flicks to start a new project with it as the reference video.', btn('Use in Flicks', false))
})

// ---------- Editor (in the sample project) ----------
await step('variations', async () => {
  await fresh('&start=sample'); await wait(1200)
  await shot('variations', 'Below the canvas: the reference video, then your variations. Click + to add one.', p.locator('[aria-label="Add variation"]'))
  await p.locator('[aria-label="Add variation"]').click(); await wait(600)
  await shot('variations', 'Describe how it differs, like “the same scene, in black lenses”, then Generate.', p.locator('aside[aria-label="Prompts"] [data-composer] textarea'))
  await p.locator('aside[aria-label="Prompts"] [data-composer] textarea').fill('Same scene, black lenses'); await wait(300)
  const gen = p.locator('aside[aria-label="Prompts"]').getByRole('button', { name: /Generate/ })
  await shot('variations', 'Each variation costs credits and takes a moment. You can keep working meanwhile.', gen)
  await gen.first().click(); await wait(800)
  await shot('variations', 'It generates in the strip. Make 2 to 5 variations; you need 2 to export.', p.locator('[data-tour="frame"]'))
})
await step('starting', async () => {
  await fresh('&start=sample'); await wait(1200)
  const slide = p.getByRole('button', { name: 'Sapphire', exact: true }).first()
  await slide.hover(); await wait(400)
  const startBtn = p.getByRole('button', { name: 'Start the Flick here' }).nth(1)
  await shot('starting', 'Hover a variation and click the play button to make it the one viewers see first.', startBtn)
  await startBtn.click().catch(() => {}); await wait(500)
  await shot('starting', 'A solid play button marks the starting variation.', p.getByRole('button', { name: 'The Flick starts here' }))
})
await step('design', async () => {
  await fresh('&start=sample'); await wait(1200)
  const text = p.locator('nav[aria-label="Add to canvas"] [aria-label="Text"]')
  await shot('design', 'Open Text in the left rail.', text)
  await text.click(); await wait(400)
  const add = p.getByRole('button', { name: /^Add heading/ })
  await shot('design', 'Pick a style to add it to the canvas.', add)
  await add.first().click(); await wait(500)
  await shot('design', 'Drag to move, use the handles to resize, and style it from the toolbar. It shows on every variation.', p.locator('[role="toolbar"]'))
})
await step('links', async () => {
  await fresh('&start=sample'); await wait(1200)
  const el = p.locator('[data-el="sample-button"]')
  await shot('links', 'Select a button on the canvas.', el)
  await el.click(); await wait(500)
  const link = p.getByRole('button', { name: 'Button link' })
  await shot('links', 'Click the link icon in its toolbar.', link)
  await link.first().click(); await wait(500)
  await shot('links', 'Paste a link, or link a feed so each variation goes somewhere different.', p.getByText('@shop-link').first())
})
await step('feeds', async () => {
  await fresh('&start=sample'); await wait(1200)
  const rail = p.locator('nav[aria-label="Add to canvas"] [aria-label="Feeds"]')
  await shot('feeds', 'Open Feeds in the left rail. A feed is a value each variation sets for itself.', rail)
  await rail.click(); await wait(500)
  const row = p.getByText('@price').first()
  await shot('feeds', 'Add one with +, or open one. Here, @price.', row)
  await row.click(); await wait(500)
  await shot('feeds', 'Fill its value for each variation. Link it to text or a button from their toolbar.', p.locator('input[value="$199"]').first())
  await p.getByRole('button', { name: 'Sapphire', exact: true }).first().click(); await wait(600)
  await shot('feeds', 'Switch variation: the text shows that variation’s value.', p.locator('[data-el="sample-price"]'))
})
await step('thumbnails', async () => {
  await fresh('&start=sample'); await wait(1200)
  const strip = p.locator('[data-el="sample-strip"]')
  await shot('thumbnails', 'Select the thumbnail strip on the canvas. Viewers tap it to switch variations.', strip)
  await strip.click(); await wait(500)
  const bb = await strip.boundingBox()
  const thumb = p.locator('[data-el="sample-strip"] img, [data-el="sample-strip"] [role]').nth(1)
  await shot('thumbnails', 'Pick a thumbnail, then upload an image for that variation from the toolbar.', thumb)
  await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await wait(500)
  await shot('thumbnails', 'Every included variation needs one before you export.', p.locator('[role="toolbar"]'))
})
await step('preview', async () => {
  await fresh('&start=sample'); await wait(1200)
  const pv = p.getByRole('radio', { name: 'Preview' })
  await shot('preview', 'Switch to Preview at the top.', pv)
  await pv.click(); await wait(800)
  await shot('preview', 'It plays as viewers get it. Tap the thumbnails to switch, try the buttons. Switch back to Design to edit.', p.locator('[data-tour="frame"]'))
})
await step('versions', async () => {
  await fresh('&start=sample'); await wait(1200)
  const fm = p.getByRole('button', { name: 'File options' })
  await shot('versions', 'Open the file menu next to the project name.', fm)
  await fm.click(); await wait(400)
  const vh = p.getByRole('menuitem', { name: 'Version history' })
  await shot('versions', 'Choose Version history. Save as template is here too.', vh)
  await vh.click(); await wait(600)
  await shot('versions', 'Versions save as you work; exports are marked. Restore any of them.', p.getByRole('button', { name: /^Rename Version/ }).first())
})

// ---------- Share ----------
let flickUrlReady = false
await step('export', async () => {
  await fresh('&start=sample'); await wait(1200)
  const ex = p.locator('[data-tour="export"]')
  await shot('export', 'Click Export at the top right.', ex)
  await ex.click(); await wait(500)
  await shot('export', 'Name the Flick (it starts with the project name) and click Export.', p.getByRole('dialog').getByRole('button', { name: 'Export', exact: true }))
  await p.getByRole('dialog').getByRole('button', { name: 'Export', exact: true }).click(); await wait(1500)
  await shot('export', 'Its page opens and it prepares in the background. You can leave and come back.', p.locator('section[aria-live="polite"]').filter({ hasText: 'Preparing' }).first())
  await wait(5500)
  await shot('export', 'Ready: share the link, add it to placements and embeds, and see its views.', p.getByRole('heading', { name: 'Link' }))
  flickUrlReady = true
})
await step('remix', async () => {
  await fresh(); await nav('Flicks').click(); await wait(600)
  const card = p.getByRole('button', { name: 'Open Rain-ready boots launch' })
  await shot('remix', 'Flicks don’t change once made. Open one from Flicks.', card)
  await card.click(); await wait(800)
  await shot('remix', 'Click Remix to start a new project from it. The Flick, its link and placements stay as they are.', p.locator('[data-tour="remix"]'))
})
await step('link', async () => {
  await fresh(); await nav('Flicks').click(); await wait(600)
  await p.getByRole('button', { name: 'Open Rain-ready boots launch' }).click(); await wait(800)
  await shot('link', 'Copy the link from its Flick page, or open it.', p.getByRole('button', { name: 'Copy link' }))
  await btn('Edit link').click(); await wait(600)
  await shot('link', 'Edit link changes its ending and how it looks when shared: image, title and description.', p.getByRole('dialog'))
})
await step('embeds', async () => {
  await fresh(); await nav('Flicks').click(); await wait(600)
  await p.getByRole('button', { name: 'Open Rain-ready boots launch' }).click(); await wait(800)
  await shot('embeds', 'On a Flick’s page, click Add to embed.', btn('Add to embed', false))
  await btn('Add to embed', false).click(); await wait(500)
  await shot('embeds', 'Put it in an embed of its size, or make a new one. Embeds are free.', p.getByRole('dialog'))
  await p.keyboard.press('Escape'); await wait(300)
  await nav('Embeds').click(); await wait(600)
  await shot('embeds', 'All your embeds are in Embeds. Open one.', p.getByText('Homepage hero').first())
  await p.getByText('Homepage hero').first().click(); await wait(800)
  await shot('embeds', 'Copy its code into your website or app once. Replace the Flick any time; the code stays the same.', btn('Copy code', false))
})

// ---------- Ads ----------
await step('ads', async () => {
  await fresh(); await nav('Campaigns').click(); await wait(600)
  await shot('ads', 'Campaigns hold placements. Open a campaign, or make a new one.', p.getByText('Holiday 2026').first())
  await p.getByText('Holiday 2026').first().click(); await wait(600)
  await shot('ads', 'A placement is a fixed-size slot. Open one, or add a placement.', p.getByText('Living room hero 16:9').first())
  await p.getByText('Living room hero 16:9').first().click(); await wait(800)
  await shot('ads', 'Its page shows the Flick in it, its numbers and history. Replace the Flick any time.', btn('Replace', false))
})
await step('tags', async () => {
  await fresh(); await nav('Campaigns').click(); await wait(600)
  await p.getByText('Holiday 2026').first().click(); await wait(500)
  await p.getByText('Living room hero 16:9').first().click(); await wait(800)
  await shot('tags', 'Choose your ad platform. Not listed? Pick Other and type its name.', p.locator('#pl-platform'))
  await p.getByRole('tab', { name: 'SIMID' }).click(); await wait(400)
  await shot('tags', 'Choose the format: VAST 4.2, SIMID or MRAID 3.0.', p.getByRole('tab', { name: 'SIMID' }))
  await shot('tags', 'Copy the tag into your ad platform. It stays the same when you replace the Flick.', p.getByRole('button', { name: /^Copy .* tag$/ }))
})
await step('balance', async () => {
  await fresh(); await nav('Campaigns').click(); await wait(600)
  await p.getByRole('button', { name: /Ad Balance/ }).first().click().catch(() => {}); await wait(800)
  await shot('balance', 'Ad Balance pays for impressions, per 1,000, at the CPM of the viewer’s country.', btn('Add funds', false))
  await btn('Add funds', false).first().click(); await wait(500)
  await shot('balance', 'Add funds from $100. Tags show once funds are in; if the balance runs negative, ads keep running and the next top-up settles it.', p.getByRole('dialog'))
})
await step('credits', async () => {
  await fresh()
  await p.getByRole('button', { name: /Get more/ }).first().click(); await wait(600)
  await shot('credits', 'Credits pay for generating videos. Get more any time from the sidebar.', p.getByRole('dialog'))
})

fs.writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames, null, 1))
console.log(Object.fromEntries(Object.entries(frames).map(([k, v]) => [k, v.length])))
await b.close()
