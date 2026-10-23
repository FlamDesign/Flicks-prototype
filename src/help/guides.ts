import frameData from "./frames/frames.json"

/** One step of a walkthrough: a real screenshot of the app, what to do, and where the click lands (% of the frame). */
/** x, y: the centre of what to click; w, h: its size (all % of the frame) */
export type Frame = { src: string; caption: string; x?: number; y?: number; w?: number; h?: number }
export type Guide = {
  id: string
  group: Group
  title: string
  summary: string
  tips: string[]
  /** where "Try it" opens the app */
  tryIt?: "sample" | "tour" | "app"
  related?: string[]
  frames: Frame[]
}
export const GROUPS = ["Basics", "Editor", "Share", "Ads", "Account"] as const
export type Group = (typeof GROUPS)[number]

const images = import.meta.glob("./frames/*.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>
const raw = frameData as Record<string, { file: string; caption: string; x?: number; y?: number; w?: number; h?: number }[]>
const framesOf = (id: string): Frame[] => (raw[id] ?? []).map((f) => ({ src: images[`./frames/${f.file}.webp`], caption: f.caption, x: f.x, y: f.y, w: f.w, h: f.h }))

type GuideText = Omit<Guide, "frames">
const TEXT: GuideText[] = [
  {
    id: "start",
    group: "Basics",
    title: "Make your first video",
    summary: "Describe a video on Create and Flicks makes it. That first video is the reference video for your project.",
    tips: [
      "Say what’s in it, where, the camera move and the light. “Slow push-in, golden hour” does more than “nice shot”.",
      "Size is where it will run: 1080×1920 for stories and reels, 1080×1080 for feeds, 1920×1080 for the web.",
      "Add image references with + to keep a product or a face consistent.",
    ],
    tryIt: "app",
    related: ["templates", "variations"],
  },
  {
    id: "templates",
    group: "Basics",
    title: "Start from a template",
    summary: "Templates are finished projects: videos, variations, text and buttons. Use one and change what you like.",
    tips: ["Filter by industry or size to find one close to what you need.", "Save any project as your own template from its file menu."],
    tryIt: "app",
    related: ["start", "versions"],
  },
  {
    id: "assets",
    group: "Basics",
    title: "Start from Assets",
    summary: "Every video you generate is kept in Assets. Use one as the reference video of a new project.",
    tips: ["Filter Assets by date or size.", "The video’s prompt and details are shown when you open it."],
    tryIt: "app",
    related: ["start"],
  },
  {
    id: "variations",
    group: "Editor",
    title: "Create variations",
    summary: "Variations are versions of the reference video viewers can switch between: colours, models or scenes.",
    tips: [
      "Describe only what changes: “the same scene, in sapphire lenses”.",
      "Make 2 to 5. You need at least 2 to export.",
      "Regenerating the reference video marks older variations with a red dot. Regenerate those so they match.",
    ],
    tryIt: "sample",
    related: ["starting", "thumbnails"],
  },
  {
    id: "starting",
    group: "Editor",
    title: "Choose where the Flick starts",
    summary: "The starting variation is the one viewers see first.",
    tips: ["The reference video is only shown to viewers if you include it as a variation."],
    tryIt: "sample",
    related: ["variations"],
  },
  {
    id: "design",
    group: "Editor",
    title: "Add text, images and buttons",
    summary: "Everything on the canvas is placed once and shared by every variation. Change one, change all.",
    tips: ["Use feeds for anything that should differ per variation, like a price.", "Layers, in the left rail, lists everything on the canvas."],
    tryIt: "sample",
    related: ["feeds", "links"],
  },
  {
    id: "links",
    group: "Editor",
    title: "Link a button",
    summary: "A button can open a link when viewers tap it.",
    tips: ["Link it to a feed to send each variation somewhere different, like that colour’s product page."],
    tryIt: "sample",
    related: ["feeds"],
  },
  {
    id: "feeds",
    group: "Editor",
    title: "Dynamic content with feeds",
    summary: "A feed is a value each variation sets for itself, like @price or @shop-link. Link it to text or a button.",
    tips: ["Empty values are flagged before you export.", "Text feeds fill text; link feeds fill button links."],
    tryIt: "sample",
    related: ["design", "links"],
  },
  {
    id: "thumbnails",
    group: "Editor",
    title: "Thumbnails",
    summary: "The thumbnail strip lets viewers switch variations. Each variation needs a thumbnail image.",
    tips: ["Use a crop that tells colourways apart at a glance.", "An included reference video needs a thumbnail too."],
    tryIt: "sample",
    related: ["variations", "preview"],
  },
  {
    id: "preview",
    group: "Editor",
    title: "Preview",
    summary: "See it the way viewers will: tap the thumbnails, try the buttons.",
    tips: ["Switch back to Design to keep editing."],
    tryIt: "sample",
    related: ["export"],
  },
  {
    id: "versions",
    group: "Editor",
    title: "Version history",
    summary: "Projects save as you work. Go back to any earlier version from the file menu.",
    tips: ["Versions you exported are marked, with a link to the Flick."],
    tryIt: "sample",
    related: ["export"],
  },
  {
    id: "export",
    group: "Share",
    title: "Export a Flick",
    summary: "Export makes a Flick from your project, ready to share, embed and serve in ads.",
    tips: ["Keep editing the project and export again any time. Each export is a new Flick.", "Anything that blocks the export is listed in the Export dialog."],
    tryIt: "tour",
    related: ["link", "remix"],
  },
  {
    id: "remix",
    group: "Share",
    title: "Change a Flick with Remix",
    summary: "Flicks don’t change once made. Remix one to start a new project from it.",
    tips: ["To swap what runs in an embed or placement, export the new Flick and replace it there."],
    tryIt: "app",
    related: ["export", "embeds"],
  },
  {
    id: "link",
    group: "Share",
    title: "Share a link",
    summary: "Every Flick has its own link. Choose how it looks when shared.",
    tips: ["Change the image, title and description shown in chat apps and social posts."],
    tryIt: "app",
    related: ["embeds"],
  },
  {
    id: "embeds",
    group: "Share",
    title: "Embed on your site or app",
    summary: "An embed is a spot on your website or app with one code snippet. Replace the Flick in it any time; the code stays the same. Embeds are free.",
    tips: ["Code is ready for websites, iOS and Android.", "Each embed keeps a history of the Flicks it has shown."],
    tryIt: "app",
    related: ["link", "ads"],
  },
  {
    id: "ads",
    group: "Ads",
    title: "Campaigns and placements",
    summary: "Campaigns hold placements: fixed-size slots that serve a Flick in your ads.",
    tips: ["Replace the Flick in a placement any time; its tag stays the same.", "See impressions, spend, CPM and CTR per placement."],
    tryIt: "app",
    related: ["tags", "balance"],
  },
  {
    id: "tags",
    group: "Ads",
    title: "Get an ad tag",
    summary: "Each placement has one tag for your ad platform, in VAST 4.2, SIMID or MRAID 3.0.",
    tips: ["Pick the format your platform asks for.", "Tags show once your Ad Balance has funds."],
    tryIt: "app",
    related: ["ads", "balance"],
  },
  {
    id: "balance",
    group: "Ads",
    title: "Ad Balance",
    summary: "Ad Balance pays for impressions, separate from credits.",
    tips: ["You’re charged per 1,000 impressions at the CPM of the viewer’s country.", "Download invoices from the Ad Balance page."],
    tryIt: "app",
    related: ["ads", "credits"],
  },
  {
    id: "credits",
    group: "Account",
    title: "Credits",
    summary: "Credits pay for generating videos. The cost shows before you generate.",
    tips: ["Turn on auto-reload so you never run out mid-project.", "Embeds and links are free; ads are paid from Ad Balance."],
    tryIt: "app",
    related: ["balance"],
  },
]

export const GUIDES: Guide[] = TEXT.map((g) => ({ ...g, frames: framesOf(g.id) }))
export const guideById = (id: string) => GUIDES.find((g) => g.id === id)

/** Guides matching a search, best first. */
export function searchGuides(q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return GUIDES.map((g) => {
    const title = g.title.toLowerCase()
    const body = [g.summary, ...g.tips, ...g.frames.map((f) => f.caption)].join(" ").toLowerCase()
    let score = 0
    for (const w of words) {
      if (title.includes(w)) score += 3
      else if (body.includes(w)) score += 1
      else return { g, score: 0 }
    }
    return { g, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.g)
}
