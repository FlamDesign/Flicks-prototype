import type { Feed } from "@/components/editor/elements"

/** A feed name worth suggesting, with the kind of value it holds (shown next to it). */
export type FeedSuggestion = { name: string; example: string }

/** Names that say what changes from one variation to the next, each with a sample value. */
export const FEED_SUGGESTIONS: Record<Feed["type"], FeedSuggestion[]> = {
  text: [
    { name: "product-name", example: "Arc Lamp" },
    { name: "price", example: "$129" },
    { name: "offer", example: "20% off today" },
    { name: "headline", example: "Light that follows you" },
    { name: "colour", example: "Brass" },
  ],
  link: [
    { name: "product-page", example: "shop.com/arc-lamp" },
    { name: "buy-link", example: "shop.com/cart/arc-lamp" },
    { name: "landing-page", example: "brand.com/summer" },
  ],
}

/** For a button's label, its own suggestion comes first. */
export const BUTTON_LABEL: FeedSuggestion = { name: "button-label", example: "Shop the lamp" }
