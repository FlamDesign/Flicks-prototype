import { library, type LibraryItem } from "@/ai/client"

/**
 * The server library as the app shows it: the user's own uploads and the final work made for them.
 * Everything the chat makes on the way (previews, looks, storyboard frames, website images, stills)
 * stays out of Assets and the pickers.
 */

/** saved before uploads were labeled: the chat's website images and unnamed working copies */
export const APP_COPY = /^(Uploaded (image|video)|.+ image \d+)$/
/** previews and option images aren't final work */
export const DRAFT = /preview|idea|option|draft|look|frame|sheet/i

export const isVideo = (x: LibraryItem) => x.kind === "video" || (x.type ?? "").startsWith("video/")
/** the user's own file (a photo or clip they added) */
export const isUpload = (x: LibraryItem) => !!x.file && (x.purpose === "upload" || (x.model === "upload" && !x.purpose)) && !APP_COPY.test(x.prompt ?? "")
/** a finished video made for the user (not a preview, thumbnail or working copy) */
export const isFinalVideo = (x: LibraryItem) => !!x.file && isVideo(x) && x.model !== "upload" && x.purpose !== "app" && !DRAFT.test(x.purpose ?? "")
/** a thumbnail made for a variation (the only generated image shown in Assets and the pickers) */
export const isThumbnail = (x: LibraryItem) => !!x.file && !isVideo(x) && x.model !== "upload" && x.purpose === "thumbnail"
/** a finished image made for the user: a thumbnail or final picture (previews, looks, frames and canvases stay out) */
export const isFinalImage = (x: LibraryItem) => !!x.file && !isVideo(x) && x.model !== "upload" && (x.purpose === "thumbnail" || x.purpose === "edit")

/** the name shown for an item: an upload's file name, else what it was made for */
export const nameOf = (x: LibraryItem) =>
  isUpload(x) || x.model === "upload" ? x.prompt || (isVideo(x) ? "Upload.mp4" : "Upload") : [x.project, x.variation, x.purpose].filter(Boolean).join(" · ") || (isVideo(x) ? "Video" : "Image")

/** A reference an item was made from, as shown with it. */
export type LibraryRef = { kind: "image" | "video"; name: string; src: string; source: "Uploaded" | "Generated" }

/**
 * The library with a way to find what a reference address points at: our own file address, or the
 * model's output address a saved copy came from. Unknown addresses are shown as they are.
 */
export class Library {
  readonly items: LibraryItem[]
  private byUrl = new Map<string, LibraryItem>()
  constructor(items: LibraryItem[]) {
    this.items = items
    for (const x of items) {
      if (x.file) this.byUrl.set(x.file, x)
      if (x.source) this.byUrl.set(x.source, x)
    }
  }
  find = (url: string) => this.byUrl.get(url)
  ref = (url: string): LibraryRef => {
    const x = this.find(url)
    if (!x) return { kind: /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "image", name: "Reference", src: url, source: "Uploaded" }
    return { kind: isVideo(x) ? "video" : "image", name: nameOf(x), src: x.file ?? url, source: x.model === "upload" ? "Uploaded" : "Generated" }
  }
  refs = (x: LibraryItem) => (x.refs ?? []).map(this.ref)
  /** the user's uploaded photos, this project's first, newest first within each */
  uploadedImages = (project?: string) =>
    this.items
      .filter((x) => isUpload(x) && !isVideo(x))
      .sort((a, b) => Number(!!project && b.project === project) - Number(!!project && a.project === project) || b.created - a.created)
}

export const loadLibrary = async () => new Library(await library())
