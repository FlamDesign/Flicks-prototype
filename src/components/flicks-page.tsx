import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon, Search01Icon, MoreHorizontalIcon, Copy01Icon, Delete02Icon, GitForkIcon, Link01Icon } from "@hugeicons/core-free-icons"
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

type Item = { id: string; name: string; size: string; at: number; image: string; exporting?: { from: number; until: number } }
type MenuItem = { label: string; icon: typeof Copy01Icon; onSelect: () => void; destructive?: boolean }

/** Projects: editable drafts. Opening one opens the editor. */
export function ProjectsPage({ onOpen, onCreate }: { onOpen: (p: Project) => void; onCreate: () => void }) {
  const { projects } = useLibrary()
  const toast = useToast()
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  return (
    <>
      <LibraryList
        title="Projects"
        description="Drafts you’re working on. Export one to make a Flick."
        searchLabel="Search projects"
        dateLabel="Last edited"
        items={projects.map((p) => ({ id: p.id, name: p.name, size: p.size, at: p.editedAt, image: p.image }))}
        when={(t, now) => formatEdited(t, now)}
        whenTitle={(t) => `Last edited ${fullDate(t)}`}
        onOpen={(it) => onOpen(projects.find((p) => p.id === it.id)!)}
        menu={(it) => [
          { label: "Duplicate", icon: Copy01Icon, onSelect: () => (library.duplicateProject(it.id), toast(`“${it.name} copy” added to Projects`)) },
          { label: "Delete", icon: Delete02Icon, destructive: true, onSelect: () => setPendingDelete(projects.find((p) => p.id === it.id) ?? null) },
        ]}
        empty={{ title: "No projects yet", text: "Start one from Create, a template or a video in Assets.", action: <Button size="sm" className="mt-2" onClick={onCreate}>Create</Button> }}
      />
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.name}” will be deleted. {pendingDelete?.exports.length ? "Flicks you’ve exported from it stay in Flicks. " : ""}This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => (pendingDelete && library.deleteProject(pendingDelete.id), setPendingDelete(null), toast("Project deleted"))}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        description="Flicks ready to share, embed and serve in ads. Remix one to change it."
        searchLabel="Search flicks"
        dateLabel="Created"
        items={flicks.map((f) => ({ id: f.id, name: f.name, size: f.size, at: f.editedAt, image: f.image, exporting: f.exporting }))}
        when={(t, now) => formatEdited(t, now).replace("Edited", "Created")}
        whenTitle={(t) => `Created ${fullDate(t)}`}
        onOpen={(it) => onOpen(byId(it.id))}
        menu={(it) => [
          { label: "Remix", icon: GitForkIcon, onSelect: () => onRemix(byId(it.id)) },
          { label: "Copy link", icon: Link01Icon, onSelect: () => (navigator.clipboard?.writeText(flickLink(byId(it.id))), toast("Link copied")) },
          { label: "Delete", icon: Delete02Icon, destructive: true, onSelect: () => setPendingDelete(byId(it.id)) },
        ]}
        empty={{ title: "No Flicks yet", text: "Export a project to make a Flick.", action: <Button size="sm" variant="outline" className="mt-2" onClick={onProjects}>Go to Projects</Button> }}
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
            <Button variant="destructive" onClick={() => (flick && library.deleteFlick(flick.id), onClose(), onDeleted())}>
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The shared list: title, search, date and size filters, and square cards. */
function LibraryList({
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
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchLabel} aria-label={searchLabel} className="w-[220px] pl-9" />
          </div>
          <DateFilter value={dates} onChange={setDates} label={dateLabel} className="w-[150px]" />
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger className="w-[140px]">
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
        </div>
      </div>

      <div className="mt-6">
        {list.length ? (
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((it) => (
              <Card key={it.id} it={it} when={when(it.at, now)} whenTitle={whenTitle(it.at)} onOpen={() => onOpen(it)} menu={menu(it)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <p className="text-sm font-medium">{filtered ? `No ${title.toLowerCase()} match` : empty.title}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{filtered ? "Try another search, date or size." : empty.text}</p>
            {filtered ? (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => (setQuery(""), setSize("all"), setDates(ALL_DATES))}>
                Clear filters
              </Button>
            ) : (
              empty.action
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Square thumbnail, name, date and size. Right-click or ⋯ opens the same actions. */
function Card({ it, when, whenTitle, onOpen, menu }: { it: Item; when: string; whenTitle: string; onOpen: () => void; menu: MenuItem[] }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const last = menu.length - 1
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`Open ${it.name}`}
          // menu items render in a portal; their clicks bubble here through React, so only open for clicks on the card itself
          onClick={(e) => e.currentTarget.contains(e.target as Node) && onOpen()}
          onKeyDown={(e) => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
          className="group mb-6 cursor-pointer outline-none"
        >
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5 transition-shadow group-hover:ring-foreground/15 group-focus-visible:ring-2 group-focus-visible:ring-ring">
            {it.image && <img src={it.image} alt="" loading="lazy" className={cn("h-full w-full object-cover", it.exporting && "opacity-60 blur-[1px]")} />}
            {it.exporting && <ExportingOverlay exporting={it.exporting} />}
          </div>
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
                  className={cn("-mr-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100", menuOpen && "opacity-100")}
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
        <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />
        Preparing… {Math.round(p * 100)}%
      </span>
      <span className="h-1 overflow-hidden rounded-full bg-foreground/10">
        <span className="block h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${p * 100}%` }} />
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
