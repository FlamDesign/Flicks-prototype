import { useEffect, useState } from "react"
import { onboarding } from "@/onboarding/onboarding"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Loading03Icon, ArrowRight01Icon, Download01Icon, ArrowUpRight01Icon, Copy01Icon, Delete02Icon, GitForkIcon, MoreHorizontalIcon, PencilEdit01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui-extra/toaster"
import { IconAction, ShareSection } from "@/components/flick-sections"
import { saveFile } from "@/components/page-kit"
import { useEmbeds } from "@/embeds/embeds"
import { AddToEmbed } from "@/embeds/embeds-ui"
import { DeleteFlickDialog } from "@/components/flicks-page"
import { GENERATED_VIDEOS } from "@/components/editor/elements"
import { FlickStage, ServeInAds } from "@/ads/ads-ui"
import { compact, flickRef, useAds } from "@/ads/ads"
import { flickLink, library, totalViews, useExportProgress, useLibrary, type FlickRecord } from "@/library"
import { Progress } from "@/components/ui/progress"
import { useDevAction } from "@/dev/dev-actions"
import { fullDate } from "@/data"
import { cn } from "@/lib/utils"

/**
 * A Flick's page. Flicks are fixed once exported, so this shows it playing and everything you do
 * with it: the link (and how it unfurls), embed, serve in ads, and simple analytics.
 * Remix starts a new project from it.
 */
export function FlickPage({
  id,
  onBack,
  onRemix,
  onOpenProject,
  onAnalytics,
  onOpenPlacement,
  onOpenEmbed,
}: {
  id: string
  onBack: () => void
  onRemix: (f: FlickRecord) => void
  onOpenProject: (projectId: string) => void
  onAnalytics: () => void
  onOpenPlacement: (id: string) => void
  onOpenEmbed: (id: string) => void
}) {
  const { flicks, projects } = useLibrary()
  const { placements, campaigns } = useAds()
  const { embeds: embedList } = useEmbeds()
  const [adding, setAdding] = useState<"ads" | "embed" | null>(null)
  const toast = useToast()
  const f = flicks.find((x) => x.id === id)
  const [editLink, setEditLink] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // dev tools: views coming in
  const progress = useExportProgress(f)
  // first ready Flick: a tip that Flicks don't change (Remix to change one)
  const ready = !!f && !f.exporting
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => onboarding.tip("remix"), 800)
    return () => clearTimeout(t)
  }, [ready])
  useDevAction(f && !f.exporting ? { id: "flick-views", label: "Add 1,000 views", run: () => library.addViews(f.id, 1000) } : null)

  if (!f)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium">This Flick was deleted</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onBack}>
          Back to Flicks
        </Button>
      </div>
    )

  const link = flickLink(f)
  const project = projects.find((p) => p.id === f.projectId)
  const inPlacements = placements.filter((p) => p.flick?.id === f.id)
  const inEmbeds = embedList.filter((x) => x.flick?.id === f.id)
  const inUse = inPlacements.length
  const startPoster = f.variants[f.start]?.poster ?? f.image
  const copyLink = () => (navigator.clipboard?.writeText(link), toast("Link copied"))

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
      {/* header: breadcrumb, then Remix and the menu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xl font-medium tracking-tight sm:text-2xl">
          <button type="button" onClick={onBack} className="-ml-1 rounded-md px-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            Flicks
          </button>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-5 shrink-0 text-muted-foreground" />
          <span className="truncate px-1" aria-current="page">
            {f.name}
          </span>
          <Badge variant="secondary" className="ml-1 shrink-0 font-normal tabular-nums">
            {f.size}
          </Badge>
        </nav>
        {!f.exporting && (
        <div className="flex items-center gap-2">
          <Button data-tour="remix" className="gap-1.5" onClick={() => onRemix(f)}>
            <HugeiconsIcon icon={GitForkIcon} className="size-4" />
            Remix
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Flick options">
                <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem onSelect={copyLink}>
                <HugeiconsIcon icon={Copy01Icon} className="size-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive **:text-destructive!">
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                Delete Flick
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {f.exporting ? `Preparing… ${Math.round(progress * 100)}%` : `Created ${fullDate(f.editedAt)}`}
        {project && (
          <>
            {" "}from{" "}
            <button type="button" onClick={() => onOpenProject(project.id)} className="rounded text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              {project.name}
            </button>
          </>
        )}
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* left: the Flick playing, and how its variations do */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="relative">
            <FlickStage key={f.id} flick={flickRef(f)} videos={f.variants.map((v) => v.video)} start={f.start} />
          </div>
          {!f.exporting && <Analytics f={f} onAnalytics={onAnalytics} />}
        </div>

        {/* right: everything to do with it (once it's ready) */}
        {f.exporting ? (
          <div className="flex min-w-0 flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5" aria-live="polite">
              <span className="flex items-center gap-2 text-sm font-medium">
                <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                Preparing… {Math.round(progress * 100)}%
              </span>
              <Progress value={progress * 100} />
              <p className="text-xs text-muted-foreground">Link, ads and embeds show here when it’s ready.</p>
            </section>
          </div>
        ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="Link">
            <div className="flex items-center gap-1 rounded-xl bg-muted/70 py-1 pl-3 pr-1">
              <span className="min-w-0 flex-1 truncate text-sm">{link.replace("https://", "")}</span>
              <IconAction label="Copy link" icon={Copy01Icon} onClick={copyLink} />
              <IconAction label="Visit link" icon={ArrowUpRight01Icon} href={link} />
            </div>
            {/* how it unfurls in messages and posts */}
            <div className="flex items-center gap-3">
              <span className="aspect-[1200/630] w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {(f.link.image === undefined ? startPoster : f.link.image) && <img src={(f.link.image === undefined ? startPoster : f.link.image) ?? ""} alt="" className="size-full object-cover" />}
              </span>
              <span className="min-w-0 text-sm">
                <span className="block truncate font-medium">{f.link.title.trim() || f.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{f.link.description.trim() || "Tap to explore every variation."}</span>
              </span>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => setEditLink(true)}>
              <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
              Edit link
            </Button>
          </Card>

          <Card
            title="Serve in ads"
            right={
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding("ads")}>
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Add to placement
              </Button>
            }
          >
            <UsedIn
              empty="Not in any placement yet."
              rows={inPlacements.map((p) => ({ id: p.id, name: p.name, sub: `${campaigns.find((c) => c.id === p.campaignId)?.name ?? ""} · ${compact(p.impressions)} impressions`, onOpen: () => onOpenPlacement(p.id) }))}
            />
          </Card>

          <Card
            title="Embed"
            right={
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding("embed")}>
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Add to embed
              </Button>
            }
          >
            <UsedIn
              empty="Not embedded anywhere yet."
              rows={inEmbeds.map((x) => ({ id: x.id, name: x.name, sub: `${compact(x.views)} views`, onOpen: () => onOpenEmbed(x.id) }))}
            />
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">The Flick as one .ifl file, for players that load it directly.</p>
              <Button variant="ghost" size="sm" className="shrink-0 gap-1.5" onClick={() => downloadIfl(f)}>
                <HugeiconsIcon icon={Download01Icon} className="size-4" />
                Download .ifl
              </Button>
            </div>
          </Card>
        </div>
        )}
      </div>

      <Dialog open={editLink} onOpenChange={setEditLink}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit link</DialogTitle>
            <DialogDescription>Changes how the link looks and where it lives. The Flick stays the same.</DialogDescription>
          </DialogHeader>
          <ShareSection live share={f.link} setShare={(patch) => library.updateLink(f.id, patch)} link={link} fallbackTitle={f.name} fallbackImage={startPoster} onToast={toast} />
          <DialogFooter>
            <Button onClick={() => setEditLink(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={adding === "ads"} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to placement</DialogTitle>
          </DialogHeader>
          <ServeInAds flick={flickRef(f)} onOpenPlacement={(id) => (setAdding(null), onOpenPlacement(id))} />
        </DialogContent>
      </Dialog>
      <Dialog open={adding === "embed"} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to embed</DialogTitle>
            <DialogDescription>Embeds keep their code; the site shows this Flick from the next view. Embeds are free.</DialogDescription>
          </DialogHeader>
          <AddToEmbed flick={flickRef(f)} onOpenEmbed={(id) => (setAdding(null), onOpenEmbed(id))} />
        </DialogContent>
      </Dialog>
      <DeleteFlickDialog flick={confirmDelete ? f : null} inUse={inUse} onClose={() => setConfirmDelete(false)} onDeleted={() => (toast("Flick deleted"), onBack())} />
    </div>
  )
}

/** What a Flick is in already (placements or embeds), each opening its page. */
function UsedIn({ rows, empty }: { rows: { id: string; name: string; sub: string; onOpen: () => void }[]; empty: string }) {
  if (!rows.length) return <p className="rounded-xl bg-muted/60 px-4 py-4 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="-mx-2 flex flex-col">
      {rows.map((x) => (
        <li key={x.id}>
          <button type="button" onClick={x.onOpen} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{x.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{x.sub}</span>
            </span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  )
}

/** The Flick as one .ifl file: what it plays (variations, the starting one, size) and its link. */
function downloadIfl(f: FlickRecord) {
  const file = {
    format: "flam-ifl",
    version: 1,
    id: f.id,
    name: f.name,
    size: f.size,
    start: f.start,
    variations: f.variants.map((v) => ({ name: v.name, video: GENERATED_VIDEOS[v.video]?.name, poster: GENERATED_VIDEOS[v.video]?.name })),
    link: flickLink(f),
    created: new Date(f.editedAt).toISOString(),
  }
  saveFile(`${f.link.slug}.ifl`, "application/json", JSON.stringify(file, null, 2))
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

/** Views per variation, the starting one marked; Full analytics for the rest. */
function Analytics({ f, onAnalytics }: { f: FlickRecord; onAnalytics: () => void }) {
  const total = totalViews(f)
  const max = Math.max(1, ...f.variants.map((v) => v.views))
  return (
    <section className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Analytics</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Views of each variation, all time</p>
        </div>
        <Button variant="ghost" size="sm" className="-mr-2 gap-1 text-primary hover:text-primary" onClick={onAnalytics}>
          Full analytics
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
        </Button>
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{total.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Views</p>
      </div>
      {total ? (
        <ul className="flex flex-col gap-3">
          {f.variants.map((v, i) => (
            <li key={`${v.name}-${i}`} className="flex items-center gap-3">
              <img src={v.poster} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{v.name}</span>
                    {i === f.start && <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[11px] font-normal">Starts here</Badge>}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {v.views.toLocaleString()} <span className="text-xs text-muted-foreground">· {Math.round((v.views / total) * 100)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", i === f.start ? "bg-primary" : "bg-primary/45")} style={{ width: `${(v.views / max) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">No views yet. Share the link, embed it or serve it in ads to start.</p>
      )}
    </section>
  )
}
