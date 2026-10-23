import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ArrowRight01Icon, AtIcon, CursorPointer02Icon, Delete02Icon, Link04Icon, TextIcon } from "@hugeicons/core-free-icons"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Feed } from "@/components/editor/elements"
import { NewFeed, type FeedUse } from "@/components/editor/variation-panel"
import { cn } from "@/lib/utils"

/** One video that has feed values. */
export type FeedVideo = { id: string; name: string; poster?: string; values: Record<string, string> }

/**
 * Feeds in the left panel, two levels: a short list of feeds, and one feed's values for every
 * video (opened from the list). The panel header shows the way back as a breadcrumb.
 */
export function FeedsPanel({
  feeds,
  videos,
  activeId,
  onValue,
  onSelectVideo,
  onAdd,
  onRename,
  onDelete,
  usedBy,
  onSelectElements,
  focus,
  activeFeed,
  openId,
  onOpen,
}: {
  /** the feed of the selected element: opened */
  activeFeed?: string
  /** the feed being shown (null: the list) */
  openId: string | null
  onOpen: (id: string | null) => void
  feeds: Feed[]
  /** the videos viewers can switch between, in order */
  videos: FeedVideo[]
  /** the video on the canvas */
  activeId: string
  onValue: (videoId: string, feedId: string, value: string) => void
  onSelectVideo: (videoId: string) => void
  onAdd: (f: Omit<Feed, "id">) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  usedBy: Record<string, FeedUse[]>
  /** select these elements on the canvas */
  onSelectElements: (ids: string[]) => void
  /** bring this feed's field for the video in view into focus (n changes on every request) */
  focus?: { id: string; n: number }
}) {
  const [adding, setAdding] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const fields = useRef<Record<string, HTMLInputElement | null>>({})
  const key = (feedId: string, videoId: string) => `${feedId}:${videoId}`

  const [confirmDel, setConfirmDel] = useState<Feed | null>(null)
  // opening Feeds always shows the list; nothing is opened from before
  const mountedAt = useRef({ activeFeed, focusN: focus?.n })
  useEffect(() => {
    onOpen(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // selecting text or a button on the canvas afterwards opens its feed
  useEffect(() => {
    if (activeFeed && activeFeed !== mountedAt.current.activeFeed) onOpen(activeFeed)
    mountedAt.current.activeFeed = undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeed])
  // the open feed was deleted: back to the list
  useEffect(() => {
    if (openId && !feeds.some((f) => f.id === openId)) onOpen(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds])
  // Esc (outside a field) goes back to the list
  useEffect(() => {
    if (!openId) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      // only from the panel itself (or nothing focused), never while typing or from the canvas
      if (e.key !== "Escape" || !(t === document.body || t.closest("[data-feeds-panel]")) || t.closest("input, textarea, [contenteditable=true]")) return
      onOpen(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  // open a feed if it's collapsed and put the cursor in a value (the video in view when it has one)
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const jump = (feedId: string) => {
    onOpen(feedId)
    clearTimeout(pending.current)
    let tries = 0
    const attempt = () => {
      // the video in view, or the first one when it has no values (a reference video left out of the Flick)
      const vid = fields.current[key(feedId, activeId)] ? activeId : videos[0]?.id
      const el = vid && fields.current[key(feedId, vid)]
      // a feed that was collapsed or just created takes a moment to render
      if (!el) {
        if (tries++ < 20) pending.current = setTimeout(attempt, 16)
        return
      }
      el.scrollIntoView({ block: "nearest", behavior: "smooth" })
      el.focus({ preventScroll: true })
      setFlash(key(feedId, vid))
      const k = key(feedId, vid)
      setTimeout(() => setFlash((f) => (f === k ? null : f)), 1200)
    }
    pending.current = setTimeout(attempt, 0)
  }
  // a feed asked for from the canvas (its @chip): only new requests, not one left from before
  useEffect(() => {
    if (focus && focus.n !== mountedAt.current.focusN) jump(focus.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])
  // a feed just created here: go straight to its values
  const created = useRef<string | null>(null)
  useEffect(() => {
    if (!created.current) return
    const f = feeds.find((x) => x.name === created.current)
    if (!f) return
    created.current = null
    jump(f.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds])
  useEffect(() => () => clearTimeout(pending.current), [])

  const open = openId ? feeds.find((f) => f.id === openId) : undefined

  return (
    <div className="flex flex-col gap-3" data-keep-selection data-feeds-panel>
      {open ? (
        <FeedDetail
          feed={open}
          videos={videos}
          activeId={activeId}
          uses={usedBy[open.id] ?? []}
          flash={flash}
          fields={fields}
          fieldKey={key}
          onValue={onValue}
          onSelectVideo={onSelectVideo}
          onSelectElements={onSelectElements}
          onDelete={() => setConfirmDel(open)}
        />
      ) : (
        <>
          <div className="flex h-7 items-center gap-2 pl-1">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">Values that change per variation</p>
            {!adding && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label="Add feed" onClick={() => setAdding(true)} className="size-7 shrink-0">
                    <HugeiconsIcon icon={Add01Icon} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add feed</TooltipContent>
              </Tooltip>
            )}
          </div>

          {adding && <NewFeed feeds={feeds} onAdd={(f) => ((created.current = f.name), onAdd(f), setAdding(false))} onCancel={() => setAdding(false)} />}

          {feeds.length === 0 && !adding && (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-foreground/15 px-3 py-6 text-center">
              <HugeiconsIcon icon={AtIcon} className="size-5 text-muted-foreground/60" />
              <p className="text-sm font-medium">No feeds yet</p>
              <p className="text-xs text-muted-foreground">Add one like @price, then link it to text or a button.</p>
              <Button variant="secondary" size="xs" className="mt-2 gap-1" onClick={() => setAdding(true)}>
                <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                Add feed
              </Button>
            </div>
          )}

          {/* one row per feed: open it to see its values */}
          {feeds.length > 0 && (
            <ul className="flex flex-col gap-0.5" aria-label="Feeds">
              {feeds.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(f.id)}
                    className="group/row flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <HugeiconsIcon icon={f.type === "link" ? Link04Icon : TextIcon} className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">@{f.name}</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 shrink-0 text-muted-foreground/60 group-hover/row:text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* confirm before deleting a feed */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="sm:max-w-sm" data-keep-selection>
          <DialogHeader>
            <DialogTitle>Delete @{confirmDel?.name}?</DialogTitle>
            <DialogDescription>
              Its values in every variation are removed.
              {confirmDel && (usedBy[confirmDel.id]?.length ?? 0) > 0 && ` Linked ${confirmDel.type === "link" ? "buttons keep the link" : "text keeps the value"} of the video in view.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDel) onDelete(confirmDel.id)
                setConfirmDel(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** One feed: what it is, what uses it, and its value for every video. */
function FeedDetail({
  feed: f,
  videos,
  activeId,
  uses,
  flash,
  fields,
  fieldKey,
  onValue,
  onSelectVideo,
  onSelectElements,
  onDelete,
}: {
  feed: Feed
  videos: FeedVideo[]
  activeId: string
  uses: FeedUse[]
  flash: string | null
  fields: React.RefObject<Record<string, HTMLInputElement | null>>
  fieldKey: (feedId: string, videoId: string) => string
  onValue: (videoId: string, feedId: string, value: string) => void
  onSelectVideo: (videoId: string) => void
  onSelectElements: (ids: string[]) => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* type, then actions: select what uses it, delete */}
      <div className="flex h-7 items-center gap-1.5 pl-1">
        <HugeiconsIcon icon={f.type === "link" ? Link04Icon : TextIcon} className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {f.type === "link" ? "Link feed" : "Text feed"}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Select what uses @${f.name}`}
                disabled={!uses.length}
                onClick={() => onSelectElements(uses.map((u) => u.id))}
                className="size-7 text-muted-foreground"
              >
                <HugeiconsIcon icon={CursorPointer02Icon} className="size-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{uses.length ? `Select ${uses.length === 1 ? (uses[0].kind === "button" ? "the button" : "the text") : `the ${uses.length} elements`} using it` : "Not linked to anything yet"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-xs" variant="ghost" aria-label={`Delete @${f.name}`} onClick={onDelete} className="size-7 text-muted-foreground hover:text-destructive">
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>

      {/* one row per video: its frame, then the value */}
      <ul className="flex flex-col gap-1.5">
        {videos.map((v) => {
          const k = fieldKey(f.id, v.id)
          const active = v.id === activeId
          return (
            <li key={v.id} className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectVideo(v.id)}
                    aria-label={`Show ${v.name}`}
                    aria-pressed={active}
                    className={cn(
                      "relative size-8 shrink-0 overflow-hidden rounded-md bg-muted outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/50",
                      active ? "ring-2 ring-primary" : "opacity-70 ring-1 ring-foreground/10 hover:opacity-100",
                    )}
                  >
                    {v.poster && <img src={v.poster} alt="" className="absolute inset-0 size-full object-cover" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{v.name}</TooltipContent>
              </Tooltip>
              <Input
                ref={(el) => {
                  fields.current[k] = el
                }}
                value={v.values[f.id] ?? ""}
                onChange={(e) => onValue(v.id, f.id, e.target.value)}
                onFocus={() => !active && onSelectVideo(v.id)}
                placeholder={f.type === "link" ? "https://" : "Value"}
                inputMode={f.type === "link" ? "url" : undefined}
                aria-label={`@${f.name} for ${v.name}`}
                className={cn("h-8 min-w-0 flex-1 text-sm transition-shadow", flash === k && "ring-2 ring-primary")}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The Feeds panel's title: "Feeds", or "Feeds › @name" with the name renamable in place. */
export function FeedsTitle({ feeds, openId, onOpen, onRename }: { feeds: Feed[]; openId: string | null; onOpen: (id: string | null) => void; onRename: (id: string, name: string) => void }) {
  const f = openId ? feeds.find((x) => x.id === openId) : undefined
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState("")
  useEffect(() => setRenaming(false), [openId])
  if (!f) return <h2 className="text-sm font-medium">Feeds</h2>
  const save = () => {
    const clean = draft.trim().replace(/^@/, "").replace(/\s+/g, "-").toLowerCase()
    if (clean && clean !== f.name && !feeds.some((x) => x.name === clean)) onRename(f.id, clean)
    setRenaming(false)
  }
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5 text-sm" data-keep-selection data-feeds-panel>
      <button type="button" onClick={() => onOpen(null)} className="-ml-1.5 h-7 shrink-0 rounded-md px-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
        Feeds
      </button>
      <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 shrink-0 text-muted-foreground/60" />
      {renaming ? (
        <span className="flex h-7 min-w-0 flex-1 items-center rounded-md bg-background pl-1.5 font-medium ring-2 ring-ring/50">
          <span className="text-muted-foreground">@</span>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") (e.stopPropagation(), setRenaming(false))
            }}
            aria-label={`Rename @${f.name}`}
            className="h-full w-32 min-w-0 flex-1 bg-transparent outline-none"
          />
        </span>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-current="page"
              aria-label={`Rename @${f.name}`}
              onClick={() => (setDraft(f.name), setRenaming(true))}
              className="h-7 min-w-0 cursor-text truncate rounded-md px-1.5 font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              @{f.name}
            </button>
          </TooltipTrigger>
          <TooltipContent>Rename</TooltipContent>
        </Tooltip>
      )}
    </nav>
  )
}
