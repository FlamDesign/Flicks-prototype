import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { getFontEmbedCSS, toJpeg } from "html-to-image"
import { CanvasStage } from "@/components/editor/canvas-stage"
import type { CanvasElement } from "@/components/editor/elements"
import { isLive, siteImage } from "@/ai/client"
import { stillsAt } from "@/lib/media"

export type ShotInput = {
  /** the Flick's size, e.g. "1080×1920" */
  size: string
  elements: CanvasElement[]
  /** the variation's video (a frame is taken from it) or, failing that, a still */
  video?: string
  poster?: string
  /** every variation's thumbnail, in strip order, and which one is this variation */
  thumbs: { poster?: string }[]
  active: number
  feedOf: (id: string) => { name: string; value: string } | undefined
}

let fonts: Promise<string> | undefined
/** a promise that gives up after `ms` */
const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, no) => setTimeout(() => no(new Error("timed out")), ms))])

/** an image the page can draw without tainting: a local copy (through the AI server when the host won't share) */
async function local(url?: string): Promise<string | undefined> {
  if (!url) return undefined
  if (/^(blob|data):/.test(url)) return url
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error()
    return URL.createObjectURL(await r.blob())
  } catch {
    if (!isLive()) return undefined
    return siteImage(url).then((b) => URL.createObjectURL(b), () => undefined)
  }
}

/**
 * The Flick as viewers see it, as one picture: a frame of the variation's video with every element
 * drawn on top, at the Flick's shape (1024 px on the long side). Made off screen with the same
 * stage the editor uses, so what Claude sees is what the user sees.
 */
export async function renderFlickShot(input: ShotInput): Promise<Blob> {
  const [w, h] = input.size.split(/[x×]/).map(Number)
  const r = w && h ? w / h : 1
  const W = Math.round(r >= 1 ? 1024 : 1024 * r)
  const H = Math.round(r >= 1 ? 1024 / r : 1024)
  // the video's frame at about 1.5 s (past any fade-in), else its still
  let frame: string | undefined
  if (input.video) {
    try {
      frame = URL.createObjectURL((await within(stillsAt(input.video, [1.5], 1024), 8000))[0])
    } catch {
      frame = undefined
    }
  }
  frame ??= await local(input.poster)
  const thumbs = await Promise.all(input.thumbs.map(async (t) => ({ poster: await local(t.poster) })))

  const host = document.createElement("div")
  host.setAttribute("aria-hidden", "true")
  Object.assign(host.style, { position: "fixed", left: "-20000px", top: "0", width: `${W}px`, height: `${H}px`, pointerEvents: "none" })
  document.body.append(host)
  const root = createRoot(host)
  try {
    flushSync(() =>
      root.render(
        <div style={{ position: "relative", width: W, height: H, overflow: "hidden", background: "#000", containerType: "size" }}>
          {frame && <img src={frame} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
          <CanvasStage
            elements={input.elements}
            setElements={() => {}}
            selected={[]}
            setSelected={() => {}}
            editing={null}
            setEditing={() => {}}
            ratio={r}
            thumbs={thumbs}
            activeThumb={input.active}
            feedOf={input.feedOf}
            readOnly
          />
        </div>,
      ),
    )
    // fonts and pictures settle before the shot (off screen, lazy pictures would never load: load them now)
    const imgs = [...host.querySelectorAll("img")]
    imgs.forEach((img) => (img.loading = "eager"))
    await within(document.fonts.ready, 3000).catch(() => {})
    await within(Promise.all(imgs.map((img) => (img.complete ? null : new Promise((ok) => ((img.onload = ok), (img.onerror = ok)))))), 6000).catch(() => {})
    await new Promise((ok) => setTimeout(ok, 150))
    const node = host.firstElementChild as HTMLElement
    // the page's fonts, embedded once (a font host that doesn't answer falls back to none rather than hanging)
    fonts ??= within(getFontEmbedCSS(node), 6000).catch(() => "")
    const css = await fonts
    const url = await within(toJpeg(node, { quality: 0.85, pixelRatio: 1, width: W, height: H, imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", ...(css ? { fontEmbedCSS: css } : { skipFonts: true }) }), 20000)
    return await (await fetch(url)).blob()
  } finally {
    root.unmount()
    host.remove()
  }
}
