import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download04Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { importToLibrary, isLive, library, useAiConfig, type LibraryItem } from "@/ai/client"
import { GENERATED_VIDEOS } from "@/components/editor/elements"

/**
 * Everything made through the AI server, kept on Flam's side (Higgsfield deletes its copies after
 * 7 days): browse, download one, or download all. Videos this browser still has links to can be
 * saved into it.
 */
export function AiLibrary() {
  const c = useAiConfig()
  const [items, setItems] = useState<LibraryItem[] | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const load = async () => {
    setBusy(true)
    try {
      setItems(await library())
      setNote("")
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't load the library.")
    } finally {
      setBusy(false)
    }
  }
  const name = (x: LibraryItem) => `${[x.project, x.variation, x.purpose].filter(Boolean).join(" - ") || x.kind}-${x.id.slice(0, 8)}.${(x.type ?? "").includes("mp4") || x.kind === "video" ? "mp4" : (x.type ?? "image/png").split("/")[1] ?? "png"}`.replace(/[^\w.-]+/g, "_")
  const download = async (x: LibraryItem) => {
    const blob = await (await fetch(x.file!)).blob()
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = name(x)
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  const downloadAll = async () => {
    setBusy(true)
    for (const x of (items ?? []).filter((y) => y.file)) {
      await download(x).catch(() => {})
      await new Promise((r) => setTimeout(r, 400))
    }
    setBusy(false)
  }
  // real videos made in this browser (their Higgsfield links last 7 days)
  const fromBrowser = async () => {
    setBusy(true)
    const made = GENERATED_VIDEOS.filter((v) => v.set === "made" && /^https:\/\//.test(v.mp4))
    try {
      let n = 0
      for (let i = 0; i < made.length; i += 10) n += await importToLibrary(made.slice(i, i + 10).map((v) => ({ url: v.mp4, kind: "video" as const, name: v.name })))
      setNote(`Saved ${n} new video${n === 1 ? "" : "s"} from this browser (${made.length} found; links older than 7 days have expired).`)
      await load()
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't save them.")
    } finally {
      setBusy(false)
    }
  }
  const saved = (items ?? []).filter((x) => x.file)
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Library</p>
          <p className="text-xs text-muted-foreground">Every image and video made through the AI server, kept on our side.</p>
        </div>
        <Button size="sm" variant="outline" disabled={!isLive(c) || busy} onClick={load}>
          {items ? "Refresh" : "Load"}
        </Button>
      </div>
      {items && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {saved.length} saved{items.length > saved.length ? `, ${items.length - saved.length} not saved (still generating, failed, or made before saving started)` : ""}
            <Button size="xs" variant="outline" className="ml-auto gap-1" disabled={busy || !saved.length} onClick={downloadAll}>
              <HugeiconsIcon icon={Download04Icon} className="size-3" />
              Download all
            </Button>
            <Button size="xs" variant="ghost" disabled={busy} onClick={fromBrowser}>
              Save videos from this browser
            </Button>
          </div>
          <ul className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto">
            {saved.map((x) => (
              <li key={x.id} className="group relative overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
                {x.kind === "video" ? <video src={x.file} muted loop playsInline preload="metadata" onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} className="aspect-square w-full object-cover" /> : <img src={x.file} alt="" className="aspect-square w-full object-cover" />}
                <div className="flex items-center gap-1 p-1.5">
                  <p className="min-w-0 flex-1 truncate text-[11px]" title={x.prompt}>
                    {x.variation || x.project || x.prompt}
                  </p>
                  <Button size="icon-xs" variant="ghost" aria-label="Download" onClick={() => download(x)}>
                    <HugeiconsIcon icon={Download04Icon} className="size-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </section>
  )
}
