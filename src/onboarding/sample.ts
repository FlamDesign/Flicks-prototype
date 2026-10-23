import { GENERATED_VIDEOS, newStrip, type CanvasElement, type Feed } from "@/components/editor/elements"
import type { Slide } from "@/components/editor/slides-strip"
import { ratioOf } from "@/components/ratio-glyph"

/** The sample project's id. */
export const SAMPLE_ID = "sample-project"
export const SAMPLE_NAME = "Sample: Sport lens switch"
const SIZE = "1080×1920"
const PROMPT = "Athlete in a black tee against a sunlit concrete wall, slow push-in, sport sunglasses, golden hour"

/**
 * A fully built project to explore: a reference video, three colourways with thumbnails, a heading,
 * a price from a feed, and a Shop now button whose link comes from a feed.
 */
export function sampleProject() {
  const price: Feed = { id: "feed-price", name: "price", type: "text" }
  const shop: Feed = { id: "feed-shop", name: "shop-link", type: "link" }
  const colourways = [
    { video: 0, name: "Gold", price: "$189", link: "https://example.com/lens/gold" },
    { video: 2, name: "Sapphire", price: "$199", link: "https://example.com/lens/sapphire" },
    { video: 3, name: "White", price: "$179", link: "https://example.com/lens/white" },
  ]
  const slides: Slide[] = [
    { id: "main", prompt: "", refs: [], video: 1, startedAt: 1, feeds: { [price.id]: colourways[0].price, [shop.id]: colourways[0].link }, used: { prompt: PROMPT, refs: [], fromReference: false } },
    ...colourways.map((c, i) => ({
      id: `sample-${c.name.toLowerCase()}`,
      n: i + 1,
      name: c.name,
      prompt: "",
      refs: [],
      video: c.video,
      startedAt: 1,
      thumb: GENERATED_VIDEOS[c.video].poster,
      feeds: { [price.id]: c.price, [shop.id]: c.link },
      used: { prompt: `Same scene, ${c.name.toLowerCase()} lenses`, refs: [], fromReference: true },
    })),
  ]
  const elements = [
    { id: "sample-heading", kind: "text", variant: "heading", text: "Find your lens", x: 50, y: 12, align: "center" },
    { id: "sample-price", kind: "text", variant: "subheading", text: "$189", feed: price.id, x: 50, y: 20, align: "center" },
    { id: "sample-button", kind: "button", variant: "pill", text: "Shop now", linkFeed: shop.id, x: 50, y: 70, align: "center" },
    { ...newStrip(colourways.length, "horizontal", ratioOf(SIZE)), id: "sample-strip" },
  ] as CanvasElement[]
  return {
    generation: { id: SAMPLE_ID, prompt: PROMPT, size: SIZE, duration: 8, references: 0, refs: [], startedAt: 1, video: 1 },
    title: SAMPLE_NAME,
    snap: { elements, slides, feeds: [price, shop], start: slides[1].id, includeRef: false },
  }
}
