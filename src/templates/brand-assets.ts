/**
 * Media for the brand templates (GAP, Diageo, Little Caesars, General Mills, Modelo): their videos,
 * posters, strip thumbnails, logos and legibility scrims. Kept apart from the sample videos so the
 * editor can address them by index while Assets and sample flows only see the samples.
 */
const files = import.meta.glob("../assets/templates/brands/*.{mp4,webp,png}", { eager: true, import: "default" }) as Record<string, string>

/** URL of a brand asset by file name, e.g. asset("gap-logo.png") */
export const asset = (name: string) => {
  const url = files[`../assets/templates/brands/${name}`]
  if (!url) throw new Error(`Missing brand asset ${name}`)
  return url
}

export type BrandSet = "gap" | "diageo" | "little-caesars" | "general-mills" | "modelo"

/** file prefix, set, size, and each video's colour/product word (third part of the name, used for variant names) */
const BRANDS: { prefix: string; set: BrandSet; size: string; parts: string[] }[] = [
  { prefix: "gap", set: "gap", size: "1080×1080", parts: ["denim", "brown", "burgundy"] },
  { prefix: "diageo", set: "diageo", size: "1080×1080", parts: ["tanqueray", "black label", "don julio"] },
  { prefix: "lc", set: "little-caesars", size: "1080×1080", parts: ["pepperoni", "cheese", "veggie"] },
  { prefix: "gm", set: "general-mills", size: "1080×1080", parts: ["lucky charms", "cheerios", "cinnamon"] },
  { prefix: "modelo", set: "modelo", size: "1080×1920", parts: ["oro", "negra", "especial"] },
]

export const BRAND_VIDEOS = BRANDS.flatMap((b) =>
  b.parts.map((part, i) => ({
    name: `${b.set}-${i + 1}-${part}`,
    set: b.set,
    size: b.size,
    mp4: asset(`${b.prefix}-${i + 1}.mp4`),
    poster: asset(`${b.prefix}-${i + 1}.webp`),
  })),
)
