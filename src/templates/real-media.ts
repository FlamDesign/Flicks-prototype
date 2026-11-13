/**
 * The real Flicks (recorded from the OMD demo Flicks: 16 brands, 3 variations each). Their files
 * are served from public/real/<brand>/ (not bundled): v1–v3.mp4 videos, v1–v3.webp posters,
 * swatch-1–3.webp tap thumbnails, logo and the template card (thumb.webp, made in Higgsfield).
 * Videos are addressed from REAL_BASE in the video list, so they never move the positions of
 * videos made with AI (see videoAt in editor/elements).
 */
export const REAL_BASE = 100_000

export const REAL_BRANDS = [
  { slug: "coach", size: "1080×1080", seconds: 11, logo: "logo.webp" },
  { slug: "wwe2k", size: "1080×1080", seconds: 14, logo: "logo.webp" },
  { slug: "ulta", size: "1080×1080", seconds: 13, logo: "logo.webp" },
  { slug: "homedepot", size: "1080×1080", seconds: 13, logo: "logo.webp" },
  { slug: "diageo", size: "1080×1080", seconds: 14, logo: "logo.webp" },
  { slug: "lovesac", size: "1080×1080", seconds: 10, logo: "logo.webp" },
  { slug: "littlecaesars", size: "1080×1080", seconds: 10, logo: "logo.webp" },
  { slug: "amazon", size: "1080×1080", seconds: 12, logo: "logo.webp" },
  { slug: "geico", size: "1080×1080", seconds: 12, logo: "logo.webp" },
  { slug: "amex", size: "1080×1080", seconds: 10, logo: "logo.svg" },
  { slug: "generalmills", size: "1080×1080", seconds: 14, logo: "logo.webp" },
  { slug: "modelo", size: "1080×1920", seconds: 14, logo: "logo.webp" },
  { slug: "paramount", size: "1080×1080", seconds: 10, logo: "logo.webp" },
  { slug: "sony", size: "1080×1080", seconds: 10, logo: "logo.webp" },
  { slug: "redbull", size: "1080×1080", seconds: 9, logo: "logo.webp" },
  { slug: "gap", size: "1080×1080", seconds: 12, logo: "logo.webp" },
] as const
export type RealSlug = (typeof REAL_BRANDS)[number]["slug"]

/** a real Flick's file, relative to the page (works on the site and in the single-file build) */
export const realFile = (slug: RealSlug, name: string) => `${import.meta.env.BASE_URL}real/${slug}/${name}`

/** every real video in order: brand by brand, variations 1 to 3 */
export const REAL_VIDEOS = REAL_BRANDS.flatMap((b) =>
  [1, 2, 3].map((n) => ({ name: `${b.slug}-${n}`, set: `real-${b.slug}` as const, size: b.size, mp4: realFile(b.slug, `v${n}.mp4`), poster: realFile(b.slug, `v${n}.webp`) })),
)
/** the first video of a brand, as an index in the video list */
export const realBase = (slug: RealSlug) => REAL_BASE + REAL_BRANDS.findIndex((b) => b.slug === slug) * 3
