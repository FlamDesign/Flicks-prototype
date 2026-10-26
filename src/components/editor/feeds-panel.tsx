import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, ArrowUpRight01Icon, BracesIcon, Delete02Icon, MoreHorizontalIcon, MoreVerticalIcon, PencilEdit01Icon } from "@hugeicons/core-free-icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Feed } from "@/components/editor/elements"
import type { FeedUse } from "@/components/editor/variation-panel"
import { cn } from "@/lib/utils"

/** One video that has feed values. */
export type FeedVideo = { id: string; name: string; poster?: string; values: Record<string, string> }

/**
 * Feeds in the left panel: one list. Clicking a feed selects what uses it on the canvas and opens its
 * values underneath, one row per variation (its image, name and value). Each feed has a menu: Rename, Delete.
 * Feeds are made on the canvas, never here.
 */
export function FeedsPanel({
  feeds,
  videos,
  activeId,
  onValue,
  onSelectVideo,
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
  /** the feed shown open (null: none) */
  openId: string | null
  onOpen: (id: string | null) => void
  feeds: Feed[]
  /** the videos viewers can switch between, in order */
  videos: FeedVideo[]
  /** the video on the canvas */
  activeId: string
  onValue: (videoId: string, feedId: string, value: string) => void
  onSelectVideo: (videoId: string) => void
  /** not used: feeds are made on the canvas */
  onAdd?: (f: Omit<Feed, "id">) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  usedBy: Record<string, FeedUse[]>
  /** select these elements on the canvas */
  onSelectElements: (ids: string[]) => void
  /** bring this feed's value for the video in view into focus (n changes on every request) */
  focus?: { id: string; n: number }
}) {
  const [flash, setFlash] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<Feed | null>(null)
  const fields = useRef<Record<string, HTMLInputElement | null>>({})
  const key = (feedId: string, videoId: string) => `${feedId}:${videoId}`

  // opening the panel always shows the list (Open in panel then opens its feed)
  useEffect(() => {
    onOpen(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // selecting an element that uses a feed opens it here
  const seenActive = useRef(activeFeed)
  useEffect(() => {
    if (activeFeed && activeFeed !== seenActive.current) onOpen(activeFeed)
    seenActive.current = activeFeed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeed])
  // a feed deleted while open
  useEffect(() => {
    if (openId && !feeds.some((f) => f.id === openId)) onOpen(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds])

  // asked from the canvas (Open in panel): open it and put the cursor in the value for the video in view
  const seenFocus = useRef(focus?.n)
  useEffect(() => {
    if (!focus || focus.n === seenFocus.current) return
    seenFocus.current = focus.n
    onOpen(focus.id)
    const t = setTimeout(() => {
      const vid = videos.some((v) => v.id === activeId) ? activeId : videos[0]?.id
      const el = vid && fields.current[key(focus.id, vid)]
      if (!el) return
      el.scrollIntoView({ block: "nearest", behavior: "smooth" })
      el.focus({ preventScroll: true })
      const k = key(focus.id, vid)
      setFlash(k)
      setTimeout(() => setFlash((f) => (f === k ? null : f)), 1200)
    }, 60)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  if (!feeds.length)
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-foreground/15 px-5 py-8 text-center" data-keep-selection>
        <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={BracesIcon} className="size-5" />
        </span>
        <p className="text-sm font-medium">Make anything change per variation</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          A feed gives text, a button or its link a different value in each variation, like a price or a product page. Select it on the canvas and click{" "}
          <span className="inline-flex translate-y-0.5 items-center rounded bg-neutral-800 px-1 text-white">
            <HugeiconsIcon icon={BracesIcon} className="size-3" />
          </span>{" "}
          on its top edge.
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">Then switch variations below the canvas and type each one in place.</p>
      </div>
    )

  const open = openId ? feeds.find((f) => f.id === openId) : undefined
  const menu = (f: Feed, vertical?: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`${f.name} options`} className="size-7 shrink-0 text-muted-foreground">
          <HugeiconsIcon icon={vertical ? MoreVerticalIcon : MoreHorizontalIcon} className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      {/* don't hand focus back to ⋮: the rename field takes it */}
      <DropdownMenuContent align="end" className="w-44" data-keep-selection onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuItem onSelect={() => setTimeout(() => setRenaming(f.id), 50)}>
          <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDel(f)}>
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex flex-col gap-1" data-keep-selection data-feeds-panel>
      {open ? (
        // one feed: a row per variation, its image on the left, its name above its value
        <>
          {/* the feed's name (editable on Rename), select on canvas, and its menu */}
          <div className="flex h-9 items-center gap-1 pl-1">
            {renaming === open.id ? (
              <RenameInput name={open.name} taken={feeds.map((x) => x.name)} onDone={(n) => (n && onRename(open.id, n), setRenaming(null))} />
            ) : (
              <button
                type="button"
                onDoubleClick={() => setRenaming(open.id)}
                title="Double-click to rename"
                className="min-w-0 flex-1 truncate text-left text-base font-medium outline-none"
              >
                {open.name}
              </button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Select on canvas"
                    disabled={!(usedBy[open.id]?.length)}
                    onClick={() => onSelectElements((usedBy[open.id] ?? []).map((u) => u.id))}
                    className="size-7 shrink-0 text-muted-foreground"
                  >
                    <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{usedBy[open.id]?.length ? "Select on canvas" : "Not linked to any element yet"}</TooltipContent>
            </Tooltip>
            {menu(open, true)}
          </div>
          <p className="-mt-1 px-1 text-xs text-muted-foreground">Its value in each variation</p>
          <ul className="flex flex-col gap-2.5 pt-1">
            {videos.map((v) => {
              const k = key(open.id, v.id)
              const active = v.id === activeId
              return (
                <li
                  key={v.id}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-2xl bg-card p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 transition-shadow",
                    active ? "ring-primary/50" : "ring-foreground/10 hover:ring-foreground/20",
                  )}
                >
                  <button type="button" onClick={() => onSelectVideo(v.id)} aria-label={`Show ${v.name}`} aria-pressed={active} className="flex min-w-0 items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                    <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10">
                      {v.poster && <img src={v.poster} alt="" className="absolute inset-0 size-full object-cover" />}
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium">{v.name}</span>
                  </button>
                  <Input
                    ref={(el) => {
                      fields.current[k] = el
                    }}
                    value={v.values[open.id] ?? ""}
                    onChange={(e) => onValue(v.id, open.id, e.target.value)}
                    onFocus={() => !active && onSelectVideo(v.id)}
                    placeholder="Value"
                    aria-label={`${open.name} for ${v.name}`}
                    className={cn("h-9 text-sm transition-shadow", flash === k && "ring-2 ring-primary")}
                  />
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <>
          <p className="px-1 pb-1 text-xs text-muted-foreground">Values that change per variation. Switch variations below the canvas and type in place, or open a feed to fill them here.</p>
          <ul className="flex flex-col gap-0.5" aria-label="Feeds">
            {feeds.map((f) => {
              const uses = usedBy[f.id] ?? []
              return (
                <li key={f.id} className="flex h-9 items-center gap-1 rounded-lg pl-2 pr-1 hover:bg-muted">
                  {renaming === f.id ? (
                    <RenameInput name={f.name} taken={feeds.map((x) => x.name)} onDone={(n) => (n && onRename(f.id, n), setRenaming(null))} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onOpen(f.id)
                        if (uses.length) onSelectElements(uses.map((u) => u.id))
                      }}
                      className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-lg text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <HugeiconsIcon icon={BracesIcon} className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                    </button>
                  )}
                  {menu(f)}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* confirm before deleting a feed */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="sm:max-w-sm" data-keep-selection>
          <DialogHeader>
            <DialogTitle>Delete {confirmDel?.name}?</DialogTitle>
            <DialogDescription>
              Its values in every variation are removed.
              {confirmDel && (usedBy[confirmDel.id]?.length ?? 0) > 0 && " Anything using it keeps the value of the variation in view."}
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

function RenameInput({ name, taken, onDone }: { name: string; taken: string[]; onDone: (name: string | null) => void }) {
  const [draft, setDraft] = useState(name)
  const done = useRef(false)
  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    const clean = draft.trim().replace(/\s+/g, "-").toLowerCase()
    onDone(save && clean && clean !== name && !taken.includes(clean) ? clean : null)
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(true)
        if (e.key === "Escape") (e.stopPropagation(), finish(false))
      }}
      aria-label="Feed name"
      className="h-8 min-w-0 flex-1 rounded-md bg-background px-2 text-sm font-medium outline-none ring-2 ring-ring/50"
    />
  )
}

/** The Feeds panel's title: "Feeds", or "Feeds › name" inside a feed (Feeds goes back). */
export function FeedsTitle({ feeds = [], openId, onOpen }: { feeds?: Feed[]; openId?: string | null; onOpen?: (id: string | null) => void; onRename?: (id: string, name: string) => void }) {
  const f = openId ? feeds.find((x) => x.id === openId) : undefined
  if (!f) return <h2 className="text-sm font-medium">Feeds</h2>
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5 text-sm" data-keep-selection>
      <button type="button" onClick={() => onOpen?.(null)} className="-ml-1.5 h-7 shrink-0 rounded-md px-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
        Feeds
      </button>
      <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 shrink-0 text-muted-foreground/60" />
      <span aria-current="page" className="min-w-0 truncate px-1 font-medium">
        {f.name}
      </span>
    </nav>
  )
}
