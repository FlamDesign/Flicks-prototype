import { useEffect, useState } from "react"
import { PendingButton } from "@/components/page-skeletons"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ArrowRight01Icon, ArrowUpRight01Icon, Copy01Icon, Delete02Icon, GitForkIcon, LockIcon, MoreHorizontalIcon, PencilEdit01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui-extra/toaster"
import { RatioGlyph } from "@/components/ratio-glyph"
import { useDevAction } from "@/dev/dev-actions"
import { compact, type FlickRef } from "@/ads/ads"
import { FlickStage, LiveFlick, ReplaceFlickDialog } from "@/ads/ads-ui"
import { EMBED_PLATFORMS, embedCodeFor, embeds, useEmbeds, type Embed, type EmbedHistory, type EmbedPlatform } from "@/embeds/embeds"
import { NewEmbedDialog } from "@/embeds/embeds-ui"
import { cn } from "@/lib/utils"
import { PlaceAnalyticsCard } from "@/analytics/place-analytics-card"

const dateLabel = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })
const ctr = (clicks: number, views: number) => (views ? `${((clicks / views) * 100).toFixed(1)}%` : "—")
const range = (h: EmbedHistory) => `${dateLabel(h.from)} – ${dateLabel(h.to ?? h.from)}`
/** Placeholder guides; the docs come later. */
const LEARN_LINKS = ["Add an embed to your website", "Embed in iOS and Android apps", "Replace a Flick without touching your site"]

/**
 * Embeds: spots on a website or app, each with one code snippet. Replace the Flick in an embed any
 * time and the site shows the new one; the code never changes. Embeds are free.
 */
export function EmbedsPage({ openEmbed, onRemixFlick, onOpenFlick }: { openEmbed?: string | null; onRemixFlick: (flickId: string) => void; onOpenFlick: (flickId: string) => void }) {
  const { embeds: list } = useEmbeds()
  const [view, setView] = useState<string | null>(openEmbed ?? null)
  useEffect(() => setView(openEmbed ?? null), [openEmbed])
  const [creating, setCreating] = useState(false)
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null)
  const current = list.find((e) => e.id === view)

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {current ? (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xl font-medium tracking-tight sm:text-2xl">
            <button type="button" onClick={() => setView(null)} className="-ml-1 rounded-md px-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              Embeds
            </button>
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-5 shrink-0 text-muted-foreground" />
            <span className="truncate px-1" aria-current="page">
              {current.name}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" tabIndex={0} className="ml-1 shrink-0 gap-1 font-normal tabular-nums">
                  <HugeiconsIcon icon={LockIcon} className="size-3" />
                  {current.size}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Fixed when the embed was made</TooltipContent>
            </Tooltip>
          </nav>
        ) : (
          <div className="space-y-1">
            <h1 className="text-2xl font-medium tracking-tight">Embeds</h1>
            <p className="text-sm text-muted-foreground">Create an embed to show Flick on your website. You can replace the Flick in embed any time.</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div ref={setActionsEl} className="contents" />
          {!current && (
            <Button className="gap-1.5" onClick={() => setCreating(true)}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              New embed
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {current ? (
          <EmbedView key={current.id} e={current} actionsEl={actionsEl} onDeleted={() => setView(null)} onRemixFlick={onRemixFlick} onOpenFlick={onOpenFlick} />
        ) : list.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => setView(e.id)} className="flex w-full flex-col gap-2.5 rounded-2xl p-2 text-left outline-none ring-1 ring-foreground/10 transition hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-muted">
                    {e.flick ? <img src={e.flick.image} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="text-xs text-muted-foreground">No Flick yet</span>}
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">{e.size}</span>
                  </span>
                  <span className="flex flex-col gap-1 px-1 pb-1">
                    <span className="truncate text-sm font-medium">{e.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{e.flick ? e.flick.name : "Empty"}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{compact(e.views)} views</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
            <p className="text-sm font-medium">No embeds yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Make an embed, add embed code to your website once, then change the Flick in it from here whenever you like.</p>
            <Button size="sm" className="mt-2" onClick={() => setCreating(true)}>
              New embed
            </Button>
          </div>
        )}
      </div>

      <NewEmbedDialog open={creating} onOpenChange={setCreating} onCreated={(e) => setView(e.id)} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-muted/50 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-medium tabular-nums">{value}</span>
    </div>
  )
}

/** One embed: numbers on top; the Flick and its history on the left; the code on the right. */
function EmbedView({ e, actionsEl, onDeleted, onRemixFlick, onOpenFlick }: { e: Embed; actionsEl: HTMLElement | null; onDeleted: () => void; onRemixFlick: (id: string) => void; onOpenFlick: (id: string) => void }) {
  const toast = useToast()
  const [replace, setReplace] = useState(false)
  const [platform, setPlatform] = useState<EmbedPlatform>("Website")
  const [copied, setCopied] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(e.name)
  const [confirm, setConfirm] = useState(false)
  const [restore, setRestore] = useState<FlickRef | null>(null)
  const [preview, setPreview] = useState<EmbedHistory | null>(null)
  const code = embedCodeFor(e, platform)
  const empty = !e.flick && !e.history.length
  const live = e.history[0] && !e.history[0].to ? e.history[0] : undefined
  // Restore shows once per Flick: on its newest row, and never for the live Flick
  const restorable = (i: number) => {
    const h = e.history[i]
    return h.flick.id !== e.flick?.id && e.history.findIndex((x) => x.flick.id === h.flick.id) === i
  }
  useDevAction(e.flick ? { id: "embed-views", label: "Add 1,000 views", run: () => embeds.addViews(e.id, 1000) } : null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      toast({ kind: "error", title: "Couldn’t copy the code", description: "Your browser blocked the clipboard. Select the code and copy it instead." })
    }
  }
  const doRestore = (f: FlickRef) => {
    embeds.setFlick(e.id, f)
    setRestore(null)
    setPreview(null)
    toast({ title: "Flick restored", description: `“${f.name}” shows in ${e.name} from the next view.` })
  }
  const rename = () => {
    if (!name.trim()) return
    embeds.rename(e.id, name.trim())
    setRenaming(false)
  }

  const header =
    actionsEl && (
      <PortalActions el={actionsEl}>
        <span className="mr-1 hidden text-sm text-muted-foreground md:inline">Created {dateLabel(e.createdAt)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Embed options">
              <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={(ev) => ev.preventDefault()}>
            <DropdownMenuItem onSelect={() => (setName(e.name), setRenaming(true))}>
              <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirm(true)} className="text-destructive focus:text-destructive **:text-destructive!">
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              Delete embed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PortalActions>
    )

  const dialogs = (
    <>
      <ReplaceFlickDialog open={replace} onOpenChange={setReplace} placement={e} onPick={(f) => embeds.setFlick(e.id, f)} />
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename embed</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={name} onChange={(ev) => setName(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && (ev.preventDefault(), rename())} maxLength={80} aria-label="Embed name" className="h-11" />
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
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{preview?.flick.name}</DialogTitle>
            <DialogDescription>{preview && (preview.flick.id === e.flick?.id ? "Live in this embed" : `Ran ${range(preview)}`)}</DialogDescription>
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
            {preview && preview.flick.id !== e.flick?.id && <PendingButton onClick={() => doRestore(preview.flick)}>Restore this Flick</PendingButton>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!restore} onOpenChange={(o) => !o && setRestore(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restore “{restore?.name}”?</DialogTitle>
            <DialogDescription>It replaces “{e.flick?.name}” from the next view. No update on website required.</DialogDescription>
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
            <DialogTitle>Delete “{e.name}”?</DialogTitle>
            <DialogDescription>Embed will stop working on your website. This can’t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <PendingButton variant="destructive" onClick={() => (embeds.delete(e.id), setConfirm(false), onDeleted(), toast("Embed deleted"))}>
              Delete
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (empty)
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-20 text-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-muted">
            <RatioGlyph size={e.size} px={36} className="text-muted-foreground" />
          </span>
          <p className="mt-1 text-base font-medium">Add a Flick to this embed</p>
          <p className="max-w-sm text-sm text-muted-foreground">Pick a Flick in {e.size}. Then you’ll get the code for your website or app.</p>
          <Button className="mt-2" onClick={() => setReplace(true)}>
            Choose a Flick
          </Button>
        </div>
        {dialogs}
      </>
    )

  const num = "hidden w-20 shrink-0 text-right tabular-nums @xl:block"
  return (
    <>
      {header}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="Views" value={compact(e.views)} />
          <Stat label="Clicks" value={compact(e.clicks)} />
          <Stat label="CTR" value={ctr(e.clicks, e.views)} />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {e.flick ? (
                    <button type="button" onClick={() => onOpenFlick(e.flick!.id)} className="block max-w-full truncate rounded text-left text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                      {e.flick.name}
                    </button>
                  ) : (
                    <h2 className="text-sm font-medium">No Flick</h2>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.flick ? `Live since ${dateLabel(live?.from ?? e.createdAt)}` : "Nothing in it right now, so the embed shows nothing."}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant={e.flick ? "outline" : "default"} size="sm" onClick={() => setReplace(true)}>
                    {e.flick ? "Replace" : "Choose a Flick"}
                  </Button>
                  {e.flick && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onRemixFlick(e.flick!.id)}>
                          <HugeiconsIcon icon={GitForkIcon} className="size-4" />
                          Remix
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Start a new project from this Flick</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              {e.flick && (
                <FlickStage key={e.flick.id} flick={e.flick} />
              )}
            </section>

            <PlaceAnalyticsCard kind="embed" id={e.id} />

            <section className="@container flex flex-col gap-2">
              <div className="flex items-center gap-3 px-4 text-xs text-muted-foreground">
                <h2 className="flex-1 text-sm font-medium text-foreground">History</h2>
                <span className={num}>Views</span>
                <span className={num}>Clicks</span>
                <span className={cn(num, "w-14")}>CTR</span>
                <span className="hidden w-[68px] shrink-0 @xl:block" />
              </div>
              <ul className="flex flex-col divide-y divide-foreground/5 rounded-2xl ring-1 ring-foreground/10">
                {e.history.map((h, i) => {
                  const isLive = i === 0 && !h.to
                  return (
                    <li key={`${h.flick.id}-${h.from}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <button type="button" onClick={() => setPreview(h)} aria-label={`Preview ${h.flick.name}`} className="size-11 shrink-0 overflow-hidden rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring">
                        <img src={h.flick.image} alt="" className="size-full object-cover" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{h.flick.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">{isLive ? `Since ${dateLabel(h.from)}` : range(h)}</p>
                        <p className="text-xs tabular-nums text-muted-foreground @xl:hidden">
                          {compact(h.views)} views · CTR {ctr(h.clicks, h.views)}
                        </p>
                      </div>
                      <span className={num}>{compact(h.views)}</span>
                      <span className={num}>{compact(h.clicks)}</span>
                      <span className={cn(num, "w-14")}>{ctr(h.clicks, h.views)}</span>
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

          <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
            <section className="flex flex-col gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-5">
              <div>
                <h2 className="text-sm font-medium">Code</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Add it to your site or app once. It stays the same when you replace the Flick.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Where</Label>
                <Tabs value={platform} onValueChange={(v) => setPlatform(v as EmbedPlatform)}>
                  <TabsList className="w-full">
                    {EMBED_PLATFORMS.map((p) => (
                      <TabsTrigger key={p} value={p} className="min-w-0 flex-1 px-2">
                        {p}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              <pre aria-label={`${platform} code`} className="h-44 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-3 font-mono text-xs leading-relaxed [scrollbar-width:thin]">
                {code}
              </pre>
              <Button onClick={copy} className="gap-1.5">
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className="size-4" />
                {copied ? "Copied" : "Copy code"}
              </Button>
            </section>
            <section className="flex flex-col gap-1 rounded-2xl p-4 ring-1 ring-foreground/10">
              <h2 className="pb-1 text-sm font-medium">Learn more about embeds</h2>
              {LEARN_LINKS.map((l) => (
                <a key={l} href="#" onClick={(ev) => ev.preventDefault()} className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-primary outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
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

function PortalActions({ el, children }: { el: HTMLElement; children: React.ReactNode }) {
  return createPortal(children, el)
}
