import { useRef } from "react"
import { useDevState } from "@/dev/state"
import { useToast, type ToastInput } from "@/components/ui-extra/toaster"

/** Largest image accepted, in MB. */
export const MAX_UPLOAD_MB = 20
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export type UploadItem = { id: string; name: string }

/**
 * Simulated image uploads, shared by the prompt boxes and the image uploader.
 * `screen` drops files that can't be uploaded (wrong type, too large) with a toast;
 * `run` uploads a batch and reports each result, with one toast (and Retry) for whatever failed.
 * The State manager can force failures or oversized files.
 */
export function useImageUploads() {
  const { state } = useDevState()
  const toast = useToast()
  const dev = useRef(state)
  dev.current = state

  const screen = (files: Iterable<File> | ArrayLike<File> | null | undefined): File[] => {
    const list = Array.from(files ?? [])
    const wrongType = list.filter((f) => !ACCEPTED.includes(f.type))
    const typed = list.filter((f) => ACCEPTED.includes(f.type))
    const tooLarge = typed.filter((f) => dev.current.uploadsTooLarge || f.size > MAX_UPLOAD_MB * 1024 * 1024)
    if (wrongType.length)
      toast({
        kind: "error",
        title: wrongType.length === 1 ? `${wrongType[0].name} can’t be uploaded` : `${wrongType.length} files can’t be uploaded`,
        description: "Use JPG, PNG, WebP or GIF images.",
      })
    if (tooLarge.length)
      toast({
        kind: "error",
        title: tooLarge.length === 1 ? `${tooLarge[0].name} is too large` : `${tooLarge.length} images are too large`,
        description: `Images can be up to ${MAX_UPLOAD_MB} MB.`,
      })
    return typed.filter((f) => !tooLarge.includes(f))
  }

  const run = (items: UploadItem[], done: (id: string, ok: boolean) => void, retry: (items: UploadItem[]) => void) => {
    if (!items.length) return
    const fail = dev.current.uploadsFail
    Promise.all(
      items.map(
        (it) =>
          new Promise<boolean>((res) =>
            // stand-in for the upload request
            setTimeout(() => {
              done(it.id, !fail)
              res(!fail)
            }, 900 + Math.random() * 900),
          ),
      ),
    ).then((results) => {
      const failed = items.filter((_, i) => !results[i])
      if (failed.length) toast(failedToast(failed, () => retry(failed)))
    })
  }

  return { screen, run }
}

const failedToast = (failed: UploadItem[], retry: () => void): ToastInput => ({
  kind: "error",
  title: failed.length === 1 ? `Couldn’t upload ${failed[0].name}` : `${failed.length} images didn’t upload`,
  description: "Check your connection and try again.",
  action: { label: failed.length === 1 ? "Retry" : "Retry all", onClick: retry },
})
