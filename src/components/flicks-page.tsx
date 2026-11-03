import { useEffect, useMemo, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { MediaTile } from "@/components/media-tile"
import { EmptyState } from "@/components/empty-state"
import { PAGE, PageHeader } from "@/components/page-kit"
import { CardsSkeleton, Loading, PendingButton } from "@/components/page-skeletons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, MoreHorizontalIcon, Copy01Icon, Delete02Icon, GitForkIcon, Link01Icon } from "@hugeicons/core-free-icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ALL_DATES, DateFilter, inDateFilter, type DateFilterValue } from "@/components/ui-extra/date-filter"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui-extra/toaster"
import { SIZES, formatEdited, fullDate } from "@/data"
import { flickLink, library, useExportProgress, useLibrary, type FlickRecord, type Project } from "@/library"
import { useAds } from "@/ads/ads"
import { cn } from "@/lib/utils"

type Item = { id: string; name: string; size: string; at: number; image: string; exporting?: { from: number; until: number }; details?: string[] }
const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`
type MenuItem = { label: string; icon: typeof Copy01Icon; onSelect: () => void; destructive?: boolean }

/** Projects: editable drafts. Opening one opens the editor. */
export function ProjectsPage({ onOpen, onCreate }: { onOpen: (p: Project) => void; onCreate: () => void }) {
  const { projects } = useLibrary()
  const toast = useToast()
  return (
    <>
      <LibraryList
        title="Projects"
        // start loading the editor when a card is pointed at, so opening feels instant
        warm={() => void import("@/components/generation-canvas")}
        description="Drafts you’re working on."
        searchLabel="Search projects"
        dateLabel="Last edited"
        items={projects.map((p) => ({
          id: p.id,
          name: p.name,
          size: p.size,
          at: p.editedAt,
          image: p.image,
          details: [...(p.versions.length ? [plural(p.versions.length, "saved version")] : []), p.exports.length ? `Exported ${plural(p.exports.length, "time")}` : "Not exported yet"],
        }))}
        when={(t, now) => formatEdited(t, now)}
        whenTitle={(t) => `Last edited ${fullDate(t)}`}
        onOpen={(it) => onOpen(projects.find((p) => p.id === it.id)!)}
        menu={(it) => [
          {
            label: "Duplicate",
            icon: Copy01Icon,
            onSelect: () => {
              const copy = library.duplicateProject(it.id)
              toast({ title: `“${it.name} copy” added to Projects`, action: copy ? { label: "Undo", onClick: () => library.deleteProject(copy.id) } : undefined })
            },
          },
          {
            label: "Delete",
            icon: Delete02Icon,
            destructive: true,
            // gone at once, with Undo in the toast (its Flicks stay)
            onSelect: () => {
              const undo = library.deleteProject(it.id)
              toast({ title: `“${it.name}” deleted`, description: "Its Flicks stay.", action: { label: "Undo", onClick: undo } })
            },
          },
        ]}
        empty={{ title: "No projects yet", text: "Start creating from templates or describe your idea.", action: <Button size="sm" onClick={onCreate}>Create</Button> }}
      />
    </>
  )
}

/** Flicks: exported and fixed. Opening one opens its page (link, embed, ads, analytics, Remix). */
export function FlicksPage({ onOpen, onRemix, onProjects }: { onOpen: (f: FlickRecord) => void; onRemix: (f: FlickRecord) => void; onProjects: () => void }) {
  const { flicks } = useLibrary()
  const { placements } = useAds()
  const toast = useToast()
  const [pendingDelete, setPendingDelete] = useState<FlickRecord | null>(null)
  const inUse = pendingDelete ? placements.filter((p) => p.flick?.id === pendingDelete.id).length : 0
  const byId = (id: string) => flicks.find((f) => f.id === id)!
  return (
    <>
      <LibraryList
        title="Flicks"
        warm={() => void import("@/components/flick-page")}
        description="Flicks ready to share, embed in website or serve in ads."
        searchLabel="Search flicks"
        dateLabel="Created"
        items={flicks.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          at: f.editedAt,
          image: f.image,
          exporting: f.exporting,
          details: "variants" in f && Array.isArray(f.variants) ? [plural(f.variants.length, "variation"), `${plural(f.variants.reduce((n: number, v: { views: number }) => n + v.views, 0), "view")}`] : undefined,
        }))}
        when={(t, now) => formatEdited(t, now).replace("Edited", "Created")}
        whenTitle={(t) => `Created ${fullDate(t)}`}
        onOpen={(it) => onOpen(byId(it.id))}
        menu={(it) => [
          { label: "Remix", icon: GitForkIcon, onSelect: () => onRemix(byId(it.id)) },
          { label: "Copy link", icon: Link01Icon, onSelect: () => (navigator.clipboard?.writeText(flickLink(byId(it.id))), toast("Link copied")) },
          { label: "Delete", icon: Delete02Icon, destructive: true, onSelect: () => setPendingDelete(byId(it.id)) },
        ]}
        empty={{ title: "No Flicks yet", text: "Export a project to make a Flick.", action: <Button size="sm" variant="outline" onClick={onProjects}>Go to Projects</Button> }}
      />
      <DeleteFlickDialog flick={pendingDelete} inUse={inUse} onClose={() => setPendingDelete(null)} onDeleted={() => toast("Flick deleted")} />
    </>
  )
}

/** Delete a Flick; not while a placement serves it (replace it there first). */
export function DeleteFlickDialog({ flick, inUse, onClose, onDeleted }: { flick: FlickRecord | null; inUse: number; onClose: () => void; onDeleted: () => void }) {
  return (
    <Dialog open={!!flick} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{inUse ? "Can’t delete this Flick yet" : "Delete Flick?"}</DialogTitle>
          <DialogDescription>
            {inUse
              ? `“${flick?.name}” is serving in ${inUse} placement${inUse === 1 ? "" : "s"}. Replace it there first.`
              : `“${flick?.name}” will be deleted. Its link and embeds stop working. This can’t be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{inUse ? "OK" : "Cancel"}</Button>
          </DialogClose>
          {!inUse && (
            <PendingButton variant="destructive" onClick={() => (flick && library.deleteFlick(flick.id), onClose(), onDeleted())}>
              Delete
            </PendingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The shared list: title, search, date and size filters, and square cards. */
function LibraryList({
  warm,
  title,
  description,
  searchLabel,
  dateLabel,
  items,
  when,
  whenTitle,
  onOpen,
  menu,
  empty,
}: {
  title: string
  description: string
  searchLabel: string
  dateLabel: string
  items: Item[]
  when: (t: number, now: number) => string
  whenTitle: (t: number) => string
  onOpen: (it: Item) => void
  menu: (it: Item) => MenuItem[]
  empty: { title: string; text: string; action?: React.ReactNode }
  warm?: () => void
}) {
  const [query, setQuery] = useState("")
  const [size, setSize] = useState("all")
  const [dates, setDates] = useState<DateFilterValue>(ALL_DATES)
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((f) => (!q || f.name.toLowerCase().includes(q)) && (size === "all" || f.size === size) && inDateFilter(f.at, dates)).sort((a, b) => b.at - a.at)
  }, [items, query, size, dates])
  const filtered = query || size !== "all" || dates.preset !== "all"
  const now = useNow()

  return (
    <div className={PAGE}>
      <PageHeader
        title={title}
        toolbar={
          <>
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchLabel} aria-label={searchLabel} className="w-[240px] pl-9" />
            </div>
            <DateFilter value={dates} onChange={setDates} label={dateLabel} className="w-[150px]" />
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="w-[140px]" aria-label="Size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sizes</SelectItem>
                {SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="mt-6">
        {/* searching or filtering fetches again */}
        <Loading k={[query.trim(), size, dates]} skipFirst skeleton={<CardsSkeleton count={8} cols="grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-4" />}>
        {list.length ? (
          <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((it) => (
              <Card key={it.id} it={it} when={when(it.at, now)} whenTitle={whenTitle(it.at)} onOpen={() => onOpen(it)} menu={menu(it)} warm={warm} />
            ))}
          </div>
        ) : (
          <EmptyState
            art={filtered ? "search" : title === "Flicks" ? "flicks" : "projects"}
            title={filtered ? `No ${title.toLowerCase()} match` : empty.title}
            text={filtered ? "Try another search, date or size." : empty.text}
            action={
              filtered ? (
                <Button variant="outline" size="sm" onClick={() => (setQuery(""), setSize("all"), setDates(ALL_DATES))}>
                  Clear filters
                </Button>
              ) : (
                empty.action
              )
            }
          />
        )}
        </Loading>
      </div>
    </div>
  )
}

/** Square thumbnail, name, date and size. Right-click or ⋯ opens the same actions. */
function Card({ it, when, whenTitle, onOpen, menu, warm }: { it: Item; when: string; whenTitle: string; onOpen: () => void; menu: MenuItem[]; warm?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const last = menu.length - 1
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`Open ${it.name}`}
          onPointerEnter={warm}
          onFocus={warm}
          // menu items render in a portal; their clicks bubble here through React, so only open for clicks on the card itself
          onClick={(e) => {
            if (!e.currentTarget.contains(e.target as Node)) return
            onOpen()
          }}
          onKeyDown={(e) => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
          className="group mb-6 cursor-pointer outline-none"
        >
          <MediaTile
            src={it.image}
            dim={!!it.exporting}
            details={!it.exporting && it.details?.length ? <p className="flex flex-wrap gap-x-2">{it.details.map((d, i) => <span key={i}>{i > 0 && <span className="mr-2 text-white/50">·</span>}{d}</span>)}</p> : undefined}
            className="group-focus-visible:ring-2 group-focus-visible:ring-ring"
          >
            {it.exporting && <ExportingOverlay exporting={it.exporting} />}
          </MediaTile>
          <div className="flex items-start gap-2 px-0.5 pt-2.5">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-medium">{it.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span title={whenTitle}>{when}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="tabular-nums">{it.size}</span>
              </p>
            </div>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`More actions for ${it.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className={cn("-mr-1 text-muted-foreground hover:text-foreground", menuOpen && "text-foreground")}
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {menu.map((m, i) => (
                  <div key={m.label}>
                    {m.destructive && i === last && i > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem onSelect={m.onSelect} className={cn(m.destructive && "text-destructive focus:text-destructive **:text-destructive!")}>
                      <HugeiconsIcon icon={m.icon} className="size-4" />
                      {m.label}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {menu.map((m, i) => (
          <div key={m.label}>
            {m.destructive && i === last && i > 0 && <ContextMenuSeparator />}
            <ContextMenuItem onSelect={m.onSelect} className={cn(m.destructive && "text-destructive focus:text-destructive **:text-destructive!")}>
              <HugeiconsIcon icon={m.icon} className="size-4" />
              {m.label}
            </ContextMenuItem>
          </div>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** On a card while its Flick exports in the background: a label and the progress. */
function ExportingOverlay({ exporting }: { exporting: { from: number; until: number } }) {
  const p = useExportProgress({ exporting } as FlickRecord)
  return (
    <div className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-1.5 rounded-lg bg-background/90 px-2.5 py-2 shadow-sm backdrop-blur">
      <span className="flex items-center gap-1.5 text-xs font-medium">
        <Spinner className="size-3.5" />
        Preparing… {Math.round(p * 100)}%
      </span>
      <span className="h-1 overflow-hidden rounded-full bg-foreground/10">
        <span className="block h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${p * 100}%` }} />
      </span>
    </div>
  )
}

/** Re-renders every minute so relative times stay current. */
function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
