import { GENERATED_VIDEOS } from "@/components/editor/elements"
import type { Slide } from "@/components/editor/slides-strip"
import { MediaViewer, type ViewerItem } from "@/components/media-viewer"

// sample and template videos have no real start time
const when = (t?: number) =>
  t && t > 1e11 ? `${new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}, ${new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "—"

/** Full-screen view of the strip's generated videos, in the shared viewer: prompt, references, details. */
export function VideoLightbox({
  slides,
  current,
  onChange,
  nameOf,
  size,
  referencePoster,
}: {
  /** generated videos only, in strip order */
  slides: Slide[]
  current: string | null
  onChange: (id: string | null) => void
  nameOf: (s: Slide) => string
  size: string
  ratio?: number
  referencePoster: string
}) {
  const items: ViewerItem[] = slides.map((s) => {
    const used = s.used ?? { prompt: s.prompt ?? "", refs: s.refs ?? [], fromReference: s.id !== "main" }
    const v = GENERATED_VIDEOS[(s.video ?? 0) % GENERATED_VIDEOS.length]
    const ref = GENERATED_VIDEOS.find((g) => g.poster === referencePoster)
    return {
      id: s.id,
      kind: "video",
      src: v.mp4,
      webm: v.webm,
      poster: v.poster,
      name: `${nameOf(s)}.mp4`,
      prompt: used.prompt || undefined,
      refs: [
        ...(used.fromReference && ref ? [{ kind: "video" as const, src: ref.mp4, webm: ref.webm, poster: ref.poster, name: "Reference video", source: "Generated" as const }] : []),
        ...used.refs.map((r) => ({ kind: "image" as const, src: r.url, name: r.name, source: "Uploaded" as const })),
      ],
      details: [
        ["Type", "Video"],
        ["Size", size.replace("×", " × ")],
        ["Created", when(s.startedAt)],
      ],
      link: `https://flicks.flamapp.ai/a/${s.id}`,
    }
  })
  const index = slides.findIndex((s) => s.id === current)
  return <MediaViewer items={items} index={index < 0 ? null : index} onIndex={(i) => onChange(slides[i].id)} onClose={() => onChange(null)} />
}
