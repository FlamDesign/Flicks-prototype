
/** a file from public/, by an address that works on any page (the site is served from its host's root; a relative build keeps "./") */
const pub = (path: string) => `${import.meta.env.BASE_URL}${path}`
/**
 * Recipes: ready-made ways to start a Flick from what the user already has. Each one asks for just
 * what it needs in a short form, then hands everything to the AI chat with the recipe named, so the
 * chat skips what the form answered. The Flick's size and length come from the uploads.
 */
export type RecipeId = "product-swap" | "recast" | "scene-shift" | "make-it-move" | "clips-to-flick"

export type Slot = {
  key: string
  kind: "video" | "image"
  label: string
  hint: string
  /** at least this many (0: optional) */
  min: number
  max: number
}

export type Recipe = {
  id: RecipeId
  name: string
  line: string
  /** the banner's look until the real ones are made: two theme tints and an icon name */
  tone: "brand" | "chart-2" | "chart-3" | "chart-4" | "chart-5"
  slots: Slot[]
  /** Make It Move: the image opens or closes the video */
  frame?: boolean
  /** Make It Move: lengths to pick from (seconds) */
  lengths?: number[]
  /** logos shown on the card (sites the clips usually come from) */
  from?: { name: string; domain: string }[]
  /** what the note field asks */
  note: string
  /** the card's and the how-it-works panel's media: looping clips (the original first, then its swaps) and their stills */
  media: { clips: string[]; posters: string[]; labels: string[]; still?: string }
  /** how it works, in three short steps */
  steps: [string, string][]
}

const M = (id: string, labels: string[], still = false) => ({
  clips: labels.map((_, i) => pub(`recipes/${id}/${"abc"[i]}.mp4`)),
  posters: labels.map((_, i) => pub(`recipes/${id}/${"abc"[i]}.jpg`)),
  labels,
  ...(still ? { still: pub(`recipes/${id}/still.jpg`) } : {}),
})

const VIDEO: Slot = { key: "video", kind: "video", label: "Your video", hint: "Up to 15 seconds. Longer videos are trimmed.", min: 1, max: 1 }

export const RECIPES: Recipe[] = [
  {
    id: "product-swap",
    name: "Product Swap",
    line: "Your video, a new product in every variation.",
    tone: "brand",
    slots: [VIDEO, { key: "items", kind: "image", label: "Products to swap in", hint: "One photo per product, or leave it to me to suggest some.", min: 0, max: 5 }],
    note: "Anything to keep in mind? Product links, names, prices…",
    media: M("product-swap", ["White", "Red", "Sage"]),
    steps: [
      ["Add your video", "Any product video, up to 15 seconds."],
      ["Pick what to swap in", "Your product photos, or let the chat suggest from your range."],
      ["Viewers tap to switch", "One Flick, every product in the same shot."],
    ],
  },
  {
    id: "recast",
    name: "Recast",
    line: "Same scene and moves, new faces for every audience.",
    tone: "chart-2",
    slots: [VIDEO, { key: "items", kind: "image", label: "People to cast in", hint: "One photo per person, or leave it to me to suggest some.", min: 0, max: 5 }],
    note: "Anything to keep in mind? Who it's for, the look you want…",
    media: M("recast", ["Ava", "Leo", "June"]),
    steps: [
      ["Add your video", "Someone on camera, up to 15 seconds."],
      ["Choose who to cast", "Your own photos, or casts the chat suggests for your audience."],
      ["Viewers tap to switch", "Same moves, a face for every audience."],
    ],
  },
  {
    id: "scene-shift",
    name: "Scene Shift",
    line: "Take your video anywhere: new places, seasons or moods.",
    tone: "chart-3",
    slots: [VIDEO, { key: "items", kind: "image", label: "Scene references", hint: "Photos of places or moods, or leave it to me to suggest some.", min: 0, max: 5 }],
    note: "Anything to keep in mind?",
    media: M("scene-shift", ["Coast", "Snow", "City"]),
    steps: [
      ["Add your video", "Any scene, up to 15 seconds."],
      ["Pick new places", "Your reference photos, or scenes the chat suggests."],
      ["Viewers tap to switch", "The same shot, anywhere you like."],
    ],
  },
  {
    id: "make-it-move",
    name: "Make It Move",
    line: "Your image as a video that starts or ends on it.",
    tone: "chart-4",
    slots: [{ key: "image", kind: "image", label: "Your image", hint: "The video keeps its shape.", min: 1, max: 1 }],
    frame: true,
    lengths: [4, 8, 12],
    note: "What should move? A slow push-in, the product spinning…",
    media: { ...M("make-it-move", ["Moving"]), still: pub("recipes/make-it-move/still.jpg") },
    steps: [
      ["Add your image", "A product shot or a finished ad."],
      ["Choose start or end", "The video opens on it, or builds up to it."],
      ["It comes to life", "Motion, light and depth, in your image's shape."],
    ],
  },
  {
    id: "clips-to-flick",
    name: "Clips to Flick",
    line: "Made videos in Higgsfield or Runway? Turn them into a Flick.",
    tone: "chart-5",
    slots: [
      { key: "clips", kind: "video", label: "Your clips", hint: "2 to 5 finished videos, one per variation.", min: 2, max: 5 },
      { key: "thumbs", kind: "image", label: "Thumbnails", hint: "Leave it to me if you don't have them.", min: 0, max: 5 },
    ],
    from: [
      { name: "Higgsfield", domain: "higgsfield.ai" },
      { name: "Runway", domain: "runwayml.com" },
    ],
    note: "Anything to keep in mind? Names, links, prices…",
    media: M("clips-to-flick", ["Orange", "Lime", "Berry"]),
    steps: [
      ["Add your clips", "2 to 5 finished videos, one per variation."],
      ["Thumbnails matched", "Yours are paired with the right clip, or made from a frame."],
      ["One Flick to tap through", "Nothing to generate, ready in seconds."],
    ],
  },
]

export const recipeOf = (id?: string) => RECIPES.find((r) => r.id === id)

/** what the user filled in, as the chat's first message (plain words; @Video n and @Image n point at the files in order) */
export function recipeMessage(r: Recipe, got: { videos: number; images: number; frame?: "start" | "end"; seconds?: number; note: string }) {
  const imgs = (from: number, n: number) => Array.from({ length: n }, (_, i) => `@Image ${from + i}`).join(", ")
  const vids = (n: number) => Array.from({ length: n }, (_, i) => `@Video ${i + 1}`).join(", ")
  const note = got.note.trim() ? `\n${got.note.trim()}` : ""
  switch (r.id) {
    case "product-swap":
      return `${r.name}: swap the product in @Video 1. ${got.images ? `Swap in ${imgs(1, got.images)}.` : "Suggest products to swap in."}${note}`
    case "recast":
      return `${r.name}: recast the people in @Video 1. ${got.images ? `Cast ${imgs(1, got.images)}.` : "Suggest who to cast."}${note}`
    case "scene-shift":
      return `${r.name}: move @Video 1 to new scenes. ${got.images ? `Scenes like ${imgs(1, got.images)}.` : "Suggest the scenes."}${note}`
    case "make-it-move":
      return `${r.name}: bring @Image 1 to life, ${got.seconds ?? 8} seconds. The video ${got.frame === "end" ? "ends" : "starts"} on it.${note}`
    case "clips-to-flick":
      return `${r.name}: turn my clips (${vids(got.videos)}) into a Flick. ${got.images ? `Thumbnails: ${imgs(1, got.images)}.` : "Make the thumbnails from the clips."}${note}`
  }
}
