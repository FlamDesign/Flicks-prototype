import { useEffect, useState } from "react"
import { PendingButton } from "@/components/page-skeletons"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Alert02Icon, ArrowRight01Icon, ArrowUpRight01Icon, Copy01Icon, Delete02Icon, InformationCircleIcon, LockIcon, GitForkIcon, MoreHorizontalIcon, PencilEdit01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RatioGlyph } from "@/components/ratio-glyph"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui-extra/toaster"
import { useDevState } from "@/dev/state"
import { useDevAction } from "@/dev/dev-actions"
import { cn } from "@/lib/utils"
import { AnalyticsHeading } from "@/analytics/open-analytics"
import { PlaceAnalyticsCard } from "@/analytics/place-analytics-card"
import {
  ads,
  avgCpm,
  compact,
  ctr,
  TAG_FORMATS,
  tagFor,
  usd,
  useAds,
  type FlickRef,
  type HistoryEntry,
  type Placement,
  type TagFormat,
} from "@/ads/ads"
import { AddFundsDialog, AdBalanceChip, FlickStage, LiveFlick, NewPlacementDialog, PlatformField, ReplaceFlickDialog, useFunded } from "@/ads/ads-ui"

const dateLabel = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })

type View = { kind: "list" } | { kind: "campaign"; id: string } | { kind: "placement"; id: string }

/**
 * Campaigns: each holds placements (fixed-size slots with a tag). Campaigns list → a campaign's
 * placements → a placement (its Flick, tag, history and stats).
 */
export function CampaignsPage({ onAdBalance, openPlacement, onRemixFlick, onOpenFlick }: { onAdBalance: () => void; openPlacement?: string | null; onRemixFlick: (flickId: string) => void; onOpenFlick: (flickId: string) => void }) {
  const { campaigns, placements } = useAds()
  const { state: dev, update: setDev } = useDevState()
  const funded = useFunded()
  const [view, setView] = useState<View>(openPlacement ? { kind: "placement", id: openPlacement } : { kind: "list" })
  useEffect(() => {
    if (openPlacement) setView({ kind: "placement", id: openPlacement })
  }, [openPlacement])
  const [newCampaign, setNewCampaign] = useState(false)
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null)
  const [funds, setFunds] = useState(false)

  // dev tools: serve a batch of impressions on a live placement
  const live = placements.filter((p) => p.flick)
  useDevAction(
    live.length && funded
      ? {
          id: "serve-impressions",
          label: "Serve 1,000 impressions",
          run: () => {
            const p = view.kind === "placement" ? (live.find((x) => x.id === view.id) ?? live[0]) : live[Math.floor(Math.random() * live.length)]
            const pool = ["US", "US", "GB", "JP", "IN", "IN", "AE", "SG", "ID", "BR"]
            const country = pool[Math.floor(Math.random() * pool.length)]
            const cost = ads.serve(p.id, country)
            setDev((d) => ({ adBalance: Math.round((d.adBalance - cost) * 100) / 100 }))
          },
        }
      : null,
  )

  const banner = !funded ? (
    <Banner tone="info" action={<Button size="sm" onClick={() => setFunds(true)}>Add funds</Button>}>
      Add at least $100 to your Ad Balance to get your tags and start serving.
    </Banner>
  ) : dev.adBalance < 0 ? (
    <Banner tone="warn" action={<Button size="sm" onClick={() => setFunds(true)}>Add funds</Button>}>
      Your Ad Balance is {usd(dev.adBalance)}. Your ads keep running; your next top-up settles this first.
    </Banner>
  ) : null

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Crumbs view={view} setView={setView} />
      <div className="flex items-center gap-2">
        {view.kind === "list" && <AdBalanceChip onOpen={onAdBalance} />}
        {/* a campaign puts New placement and its menu here */}
        <div ref={setActionsEl} className="contents" />
        {view.kind === "list" && (
          <Button className="gap-1.5" onClick={() => setNewCampaign(true)}>
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            New campaign
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
      {header}
      {banner && <div className="mt-5">{banner}</div>}
      <div className="mt-6">
        {view.kind === "list" && <CampaignList onOpen={(id) => setView({ kind: "campaign", id })} onNew={() => setNewCampaign(true)} />}
        {view.kind === "campaign" && campaigns.some((c) => c.id === view.id) && (
          <CampaignView id={view.id} actionsEl={actionsEl} onOpen={(id) => setView({ kind: "placement", id })} onDeleted={() => setView({ kind: "list" })} />
        )}
        {view.kind === "placement" && placements.some((p) => p.id === view.id) && (
          <PlacementView id={view.id} funded={funded} actionsEl={actionsEl} onDeleted={(cId) => setView({ kind: "campaign", id: cId })} onRemixFlick={onRemixFlick} onOpenFlick={onOpenFlick} />
        )}
      </div>

      <NewCampaignDialog open={newCampaign} onOpenChange={setNewCampaign} onCreated={(id) => setView({ kind: "campaign", id })} />
      {/* first visit: how ads work, in three steps */}
      <AddFundsDialog open={funds} onOpenChange={setFunds} />
    </div>
  )
}

function Banner({ tone, action, children }: { tone: "info" | "warn"; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm", tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-muted")}>
      <HugeiconsIcon icon={tone === "warn" ? Alert02Icon : InformationCircleIcon} className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  )
}

/** Campaigns › campaign › placement */
function Crumbs({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { campaigns, placements } = useAds()
  const placement = view.kind === "placement" ? placements.find((p) => p.id === view.id) : undefined
  const campaignId = view.kind === "campaign" ? view.id : placement?.campaignId
  const campaign = campaigns.find((c) => c.id === campaignId)
  const step = "rounded-md px-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
  if (view.kind === "list") return <h1 className="text-2xl font-medium tracking-tight">Campaigns</h1>
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xl font-medium tracking-tight sm:text-2xl">
      {/* on small screens the trail starts at the campaign */}
      <button type="button" className={cn(step, "-ml-1", placement && "hidden sm:inline")} onClick={() => setView({ kind: "list" })}>
        Campaigns
      </button>
      <HugeiconsIcon icon={ArrowRight01Icon} className={cn("size-5 shrink-0 text-muted-foreground", placement && "hidden sm:block")} />
      {placement ? (
        <>
          <button type="button" className={cn(step, "truncate")} onClick={() => campaign && setView({ kind: "campaign", id: campaign.id })}>
            {campaign?.name}
          </button>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-5 shrink-0 text-muted-foreground" />
          <span className="truncate px-1" aria-current="page">{placement.name}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" tabIndex={0} className="ml-1 shrink-0 gap-1 font-normal tabular-nums">
                <HugeiconsIcon icon={LockIcon} className="size-3" />
                {placement.size}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Fixed when the placement was made</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <span className="truncate px-1" aria-current="page">{campaign?.name}</span>
      )}
    </nav>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-muted/50 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-medium tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

// ---------- list ----------

function CampaignList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const { campaigns, placements } = useAds()
  if (!campaigns.length)
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-20 text-center">
        <p className="text-sm font-medium">No campaigns yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">A campaign holds placements: fixed-size slots, each with a tag you run in your DSP. Put a Flick in a placement and it serves wherever the tag runs.</p>
        <Button size="sm" className="mt-3 gap-1.5" onClick={onNew}>
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          New campaign
        </Button>
      </div>
    )
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Campaign</th>
            <th className="px-4 py-2.5 text-right font-medium">Placements</th>
            <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Impressions</th>
            <th className="px-4 py-2.5 text-right font-medium">Spend</th>
            <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Created</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const ps = placements.filter((p) => p.campaignId === c.id)
            return (
              <tr
                key={c.id}
                tabIndex={0}
                onClick={() => onOpen(c.id)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(c.id)}
                className="cursor-pointer border-t border-foreground/5 outline-none hover:bg-muted/40 focus-visible:bg-muted/60"
              >
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{ps.length}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{compact(ps.reduce((a, p) => a + p.impressions, 0))}</td>
                <td className="px-4 py-3 text-right tabular-nums">{usd(ps.reduce((a, p) => a + p.spend, 0))}</td>
                <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell">{dateLabel(c.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function NewCampaignDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("")
  const [tried, setTried] = useState(false)
  useEffect(() => (open ? (setName(""), setTried(false)) : undefined), [open])
  const create = () => {
    setTried(true)
    if (!name.trim()) return
    const c = ads.addCampaign(name.trim())
    onOpenChange(false)
    onCreated(c.id)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>Group the placements you run together.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())} placeholder="Holiday 2026" maxLength={80} aria-label="Campaign name" aria-invalid={(tried && !name.trim()) || undefined} className="h-11" />
          {tried && !name.trim() && <p className="text-xs text-destructive">Name the campaign.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <PendingButton onClick={create} onMouseDown={(e) => e.preventDefault()}>
            Create campaign
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- campaign ----------

function CampaignView({ id, actionsEl, onOpen, onDeleted }: { id: string; actionsEl: HTMLElement | null; onOpen: (id: string) => void; onDeleted: () => void }) {
  const { campaigns, placements } = useAds()
  const funded = useFunded()
  const toast = useToast()
  const c = campaigns.find((x) => x.id === id)!
  const ps = placements.filter((p) => p.campaignId === id)
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(c.name)
  const [confirm, setConfirm] = useState(false)
  const impressions = ps.reduce((a, p) => a + p.impressions, 0)
  const spend = ps.reduce((a, p) => a + p.spend, 0)

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsHeading target={{ kind: "campaign", id }} note="All time, across its placements" />
      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <Stat label="Placements" value={String(ps.length)} />
        <Stat label="Impressions" value={compact(impressions)} />
        <Stat label="Spend" value={usd(spend)} />
      </div>
      {actionsEl &&
        createPortal(
          <>
          <Button className="gap-1.5" onClick={() => setAdding(true)}>
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            New placement
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Campaign options">
                <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem onSelect={() => (setName(c.name), setRenaming(true))}>
                <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirm(true)} className="text-destructive focus:text-destructive **:text-destructive!">
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                Delete campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </>,
          actionsEl,
        )}

      {ps.length ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ps.map((p) => (
            <li key={p.id}>
              <PlacementCard p={p} funded={funded} onOpen={() => onOpen(p.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No placements yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Add one for each size you’ll run. Each gets its own tag.</p>
          <Button size="sm" className="mt-3 gap-1.5" onClick={() => setAdding(true)}>
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            New placement
          </Button>
        </div>
      )}

      <NewPlacementDialog open={adding} onOpenChange={setAdding} campaignId={id} onCreated={(p) => onOpen(p.id)} />

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename campaign</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && (ads.renameCampaign(id, name.trim()), setRenaming(false))} maxLength={80} aria-label="Campaign name" className="h-11" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <PendingButton disabled={!name.trim()} onClick={() => (ads.renameCampaign(id, name.trim()), setRenaming(false))}>
              Save
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete “{c.name}”?</DialogTitle>
            <DialogDescription>
              {ps.length ? `Its ${ps.length === 1 ? "placement stops" : `${ps.length} placements stop`} serving, and their tags show nothing.` : "It has no placements."} This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <PendingButton variant="destructive" onClick={() => (ads.deleteCampaign(id), setConfirm(false), onDeleted(), toast("Campaign deleted"))}>
              Delete
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Serving, waiting for funds, or no Flick yet. */
function status(p: Placement, funded: boolean) {
  if (!p.flick) return { label: "No Flick", dot: "bg-muted-foreground/40" }
  if (!funded) return { label: "Waiting for funds", dot: "bg-amber-500" }
  return { label: "Serving", dot: "bg-emerald-500" }
}

function PlacementCard({ p, funded, onOpen }: { p: Placement; funded: boolean; onOpen: () => void }) {
  const st = status(p, funded)
  return (
    <button type="button" onClick={onOpen} className="group flex w-full flex-col gap-2.5 rounded-2xl p-2 text-left outline-none ring-1 ring-foreground/10 transition hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring">
      <span className="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-muted">
        {p.flick ? (
          <img src={p.flick.image} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">No Flick yet</span>
        )}
        <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">{p.size}</span>
      </span>
      <span className="flex flex-col gap-1 px-1 pb-1">
        <span className="truncate text-sm font-medium">{p.name}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", st.dot)} />
          {st.label}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {compact(p.impressions)} impressions · {usd(p.spend)}
        </span>
      </span>
    </button>
  )
}

// ---------- placement ----------

/** Placeholder guides; the docs come later. */
const LEARN_LINKS = ["Run your tag in a DSP", "Choose a tag format", "How Ad Balance is charged"]

/**
 * A placement. New and empty: one step, add a Flick. Once it has one: numbers on top; the Flick
 * (playing, Replace and Edit) and its history on the left; the tag generator on the right.
 */
function PlacementView({
  id,
  funded,
  actionsEl,
  onDeleted,
  onRemixFlick,
  onOpenFlick,
}: {
  id: string
  funded: boolean
  actionsEl: HTMLElement | null
  onDeleted: (campaignId: string) => void
  onRemixFlick: (flickId: string) => void
  onOpenFlick: (flickId: string) => void
}) {
  const { placements } = useAds()
  const { state: dev } = useDevState()
  const toast = useToast()
  const p = placements.find((x) => x.id === id)!
  const [replace, setReplace] = useState(false)
  const [format, setFormat] = useState<TagFormat>("VAST 4.2")
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(p.name)
  const [restore, setRestore] = useState<FlickRef | null>(null)
  const [preview, setPreview] = useState<HistoryEntry | null>(null)
  const [funds, setFunds] = useState(false)
  const [other, setOther] = useState(p.otherPlatform ?? "")
  const tag = tagFor(p, format)
  const st = status(p, funded)
  const empty = !p.flick && !p.history.length
  // no tag while the Ad Balance is $0 or below
  const locked = !funded || dev.adBalance <= 0
  const live = p.history[0] && !p.history[0].to ? p.history[0] : undefined
  // Restore shows once per Flick: on its newest row, and never for the live Flick
  const restorable = (i: number) => {
    const h = p.history[i]
    return h.flick.id !== p.flick?.id && p.history.findIndex((x) => x.flick.id === h.flick.id) === i
  }

  const copy = async () => {
    if (locked) return
    try {
      await navigator.clipboard.writeText(tag)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      toast({ kind: "error", title: "Couldn’t copy the tag", description: "Your browser blocked the clipboard. Select the tag and copy it instead." })
    }
  }
  const rename = () => {
    if (!name.trim()) return
    ads.updatePlacement(p.id, { name: name.trim() })
    setRenaming(false)
  }
  const doRestore = (f: FlickRef) => {
    ads.setFlick(p.id, f)
    setRestore(null)
    setPreview(null)
    toast({ title: "Flick restored", description: `“${f.name}” is live in ${p.name}.` })
  }

  // created date, status and the menu sit in the page header, by the breadcrumb
  const header =
    actionsEl &&
    createPortal(
      <>
        <span className="mr-1 hidden text-sm text-muted-foreground md:inline">Created {dateLabel(p.createdAt)}</span>
        {!empty && (
          <span className="mr-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className={cn("size-2 rounded-full", st.dot)} />
            {st.label}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Placement options">
              <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onSelect={() => (setName(p.name), setRenaming(true))}>
              <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirm(true)} className="text-destructive focus:text-destructive **:text-destructive!">
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              Delete placement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>,
      actionsEl,
    )

  const dialogs = (
    <>
      <ReplaceFlickDialog open={replace} onOpenChange={setReplace} placement={p} />
      <AddFundsDialog open={funds} onOpenChange={setFunds} />
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename placement</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), rename())} maxLength={80} aria-label="Placement name" className="h-11" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <PendingButton disabled={!name.trim()} onClick={rename}>
              Save
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* a past Flick, playing; restore it from here or go back */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{preview?.flick.name}</DialogTitle>
            <DialogDescription>{preview && (preview.flick.id === p.flick?.id ? "Live in this placement" : `Ran ${range(preview)}`)}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="rounded-2xl bg-muted/60 p-3">
              <LiveFlick key={`${preview.flick.id}-${preview.from}`} flick={preview.flick} tall />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Back
            </Button>
            {preview && preview.flick.id !== p.flick?.id && <PendingButton onClick={() => doRestore(preview.flick)}>Restore this Flick</PendingButton>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!restore} onOpenChange={(o) => !o && setRestore(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restore “{restore?.name}”?</DialogTitle>
            <DialogDescription>It replaces “{p.flick?.name}” from the next impression. The tag stays the same.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestore(null)}>
              Cancel
            </Button>
            <PendingButton onClick={() => restore && doRestore(restore)}>Restore</PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete “{p.name}”?</DialogTitle>
            <DialogDescription>{p.flick ? "Its tag stops serving and shows nothing wherever it runs. Remove it from your DSP too. " : ""}This can’t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <PendingButton variant="destructive" onClick={() => (ads.deletePlacement(p.id), setConfirm(false), onDeleted(p.campaignId), toast("Placement deleted"))}>
              Delete
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  // new and empty: add a Flick first; the tag and numbers come after
  if (empty)
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-20 text-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-muted">
            <RatioGlyph size={p.size} px={36} className="text-muted-foreground" />
          </span>
          <p className="mt-1 text-base font-medium">Add a Flick to this placement</p>
          <p className="max-w-sm text-sm text-muted-foreground">Pick a Flick in {p.size}. Then you’ll get the tag to run in your DSP.</p>
          <Button className="mt-2" onClick={() => setReplace(true)}>
            Choose a Flick
          </Button>
        </div>
        {dialogs}
      </>
    )

  const num = "hidden w-20 shrink-0 text-right tabular-nums @2xl:block"
  return (
    <>
      {header}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <Stat label="Impressions" value={compact(p.impressions)} />
          <Stat label="Spend" value={usd(p.spend)} />
          <Stat label="Avg. CPM" value={avgCpm(p.spend, p.impressions)} />
          <Stat label="CTR" value={ctr(p.clicks, p.impressions)} />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* left: the Flick playing, then every Flick the placement has held */}
          <div className="flex min-w-0 flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {p.flick ? (
                    <button type="button" onClick={() => onOpenFlick(p.flick!.id)} className="block max-w-full truncate rounded text-left text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                      {p.flick.name}
                    </button>
                  ) : (
                    <h2 className="text-sm font-medium">No Flick</h2>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.flick ? `Live since ${dateLabel(live?.from ?? p.createdAt)}` : "Nothing in it right now, so the tag serves nothing."}</p>
                </div>
                {p.flick ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setReplace(true)}>
                      Replace
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onRemixFlick(p.flick!.id)}>
                          <HugeiconsIcon icon={GitForkIcon} className="size-4" />
                          Remix
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Start a new project from this Flick</TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setReplace(true)}>
                    Choose a Flick
                  </Button>
                )}
              </div>
              {p.flick && (
                <FlickStage key={p.flick.id} flick={p.flick} />
              )}
            </section>

            <PlaceAnalyticsCard kind="placement" id={p.id} />

            <section className="@container flex flex-col gap-2">
              <div className="flex items-center gap-3 px-4 text-xs text-muted-foreground">
                <h2 className="flex-1 text-sm font-medium text-foreground">History</h2>
                <span className={num}>Impressions</span>
                <span className={num}>Spend</span>
                <span className={num}>Avg. CPM</span>
                <span className={cn(num, "w-14")}>CTR</span>
                <span className="hidden w-[68px] shrink-0 @2xl:block" />
              </div>
              <ul className="flex flex-col divide-y divide-foreground/5 rounded-2xl ring-1 ring-foreground/10">
                {p.history.map((h, i) => {
                  const isLive = i === 0 && !h.to
                  return (
                    <li key={`${h.flick.id}-${h.from}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <button type="button" onClick={() => setPreview(h)} aria-label={`Preview ${h.flick.name}`} className="relative size-11 shrink-0 overflow-hidden rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring">
                        <img src={h.flick.image} alt="" className="size-full object-cover" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{h.flick.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">{isLive ? `Since ${dateLabel(h.from)}` : range(h)}</p>
                        {/* small screens: the numbers under the name */}
                        <p className="text-xs tabular-nums text-muted-foreground @2xl:hidden">
                          {compact(h.impressions)} impr. · {usd(h.spend)} · CTR {ctr(h.clicks, h.impressions)}
                        </p>
                      </div>
                      <span className={num}>{compact(h.impressions)}</span>
                      <span className={num}>{usd(h.spend)}</span>
                      <span className={num}>{avgCpm(h.spend, h.impressions)}</span>
                      <span className={cn(num, "w-14")}>{ctr(h.clicks, h.impressions)}</span>
                      <span className="flex w-[68px] shrink-0 items-center justify-end gap-1">
                        {isLive ? (
                          <Badge variant="secondary" className="w-[68px] justify-center font-normal">Live</Badge>
                        ) : restorable(i) ? (
                          <Button variant="ghost" size="sm" className="w-[68px]" onClick={() => setRestore(h.flick)}>
                            Restore
                          </Button>
                        ) : (
                          <span className="w-[68px]" />
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          {/* right: the tag generator */}
          <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
            <section className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
              <div>
                <h2 className="text-sm font-medium">Tag</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Copy it into your ad platform. It stays the same when you replace the Flick.</p>
              </div>
              <PlatformField
                platform={p.platform}
                other={other}
                onPlatform={(v) => ads.updatePlacement(p.id, { platform: v })}
                onOther={(v) => (setOther(v), ads.updatePlacement(p.id, { otherPlatform: v.trim() || undefined }))}
              />
              <div className="flex flex-col gap-2">
                <Label>Format</Label>
                <Tabs value={format} onValueChange={(v) => setFormat(v as TagFormat)}>
                  <TabsList className="w-full">
                    {TAG_FORMATS.map((f) => (
                      <TabsTrigger key={f} value={f} className="min-w-0 flex-1 px-2">
                        {f}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              {locked ? (
                // no tag at all until there's money in the Ad Balance
                <div className={cn("flex h-48 flex-col items-center justify-center gap-3 rounded-xl px-4 text-center text-sm", dev.adBalance < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                  <HugeiconsIcon icon={LockIcon} className="size-5" />
                  <p className="max-w-64">{dev.adBalance < 0 ? `Your Ad Balance is ${usd(dev.adBalance)}. Add funds to get your tag.` : "Add funds to your Ad Balance to get your tag."}</p>
                  <Button size="sm" onClick={() => setFunds(true)}>
                    Add funds
                  </Button>
                </div>
              ) : (
                <>
                  {/* fixed height; long tags scroll inside */}
                  <pre aria-label={`${format} tag`} className="h-48 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-3 font-mono text-xs leading-relaxed [scrollbar-width:thin]">
                    {tag}
                  </pre>
                  <Button onClick={copy} className="gap-1.5">
                    <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className="size-4" />
                    {copied ? "Copied" : `Copy ${format} tag`}
                  </Button>
                </>
              )}
            </section>

            <section className="flex flex-col gap-1 rounded-2xl p-4 ring-1 ring-foreground/10">
              <h2 className="pb-1 text-sm font-medium">Learn more about running ads</h2>
              {LEARN_LINKS.map((l) => (
                <a
                  key={l}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-primary outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {l}
                  <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4 shrink-0" />
                </a>
              ))}
            </section>
          </aside>
        </div>
      </div>
      {dialogs}
    </>
  )
}

const range = (h: HistoryEntry) => `${dateLabel(h.from)} – ${dateLabel(h.to ?? h.from)}`


