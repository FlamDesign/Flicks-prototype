import { useEffect, useState } from "react"
import { CardsSkeleton, Loading, PendingButton, RowsSkeleton } from "@/components/page-skeletons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Loading03Icon, PlayIcon, Search01Icon, Wallet01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui-extra/toaster"
import { ALL_DATES, DateFilter, inDateFilter, type DateFilterValue } from "@/components/ui-extra/date-filter"
import { RatioGlyph } from "@/components/ratio-glyph"
import { FLICKS, SIZES, SIZE_GROUPS } from "@/data"
import { useLibrary } from "@/library"
import { GENERATED_VIDEOS, REFERENCE_VIDEOS, inSet } from "@/components/editor/elements"
import { useDevState } from "@/dev/state"
import { cn } from "@/lib/utils"
import {
  ads,
  CPM_RATES,
  countryName,
  cpmFor,
  flicksFor,
  MAX_FUNDS,
  MIN_FUNDS,
  OTHER_CPM,
  OTHER_PLATFORM,
  PLATFORMS,
  signedInCountry,
  usd,
  useAds,
  type FlickRef,
  type Placement,
} from "@/ads/ads"

/** The Ad Balance as a small chip (on Campaigns), opening the Ad Balance page. */
export function AdBalanceChip({ onOpen }: { onOpen: () => void }) {
  const { state: dev } = useDevState()
  const negative = dev.adBalance < 0
  return (
    <Button variant="outline" className="gap-2 pl-2.5 font-normal" onClick={onOpen}>
      <HugeiconsIcon icon={Wallet01Icon} className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">Ad Balance</span>
      <span className={cn("font-medium tabular-nums", negative && "text-destructive")}>{usd(dev.adBalance)}</span>
    </Button>
  )
}

/** Funds come in once, then placements serve; a negative balance keeps serving and is settled by the next top-up. */
export function useFunded() {
  const { ledger } = useAds()
  return ledger.some((t) => t.kind === "funds")
}

/** Your CPM where you're signed in from. */
export function useMyCpm() {
  const code = signedInCountry()
  return { code, name: code === "OTHER" ? "your country" : countryName(code), cpm: cpmFor(code) }
}

/** Add funds: $100 to $10,000, no discounts, card on file. */
export function AddFundsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state: dev, update: setDev } = useDevState()
  const toast = useToast()
  const [raw, setRaw] = useState("500")
  const [touched, setTouched] = useState(false)
  const [paying, setPaying] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (open) (setRaw("500"), setTouched(false), setFailed(false), setPaying(false))
  }, [open])

  const amount = Number(raw.replace(/[^0-9.]/g, ""))
  const error = !raw.trim()
    ? "Enter an amount."
    : !Number.isFinite(amount) || amount < MIN_FUNDS
      ? `The minimum is ${usd(MIN_FUNDS, false)}.`
      : amount > MAX_FUNDS
        ? `The maximum is ${usd(MAX_FUNDS, false)} at a time.`
        : undefined
  const after = dev.adBalance + (error ? 0 : amount)

  const pay = () => {
    setTouched(true)
    if (error || paying) return
    setPaying(true)
    setFailed(false)
    setTimeout(() => {
      setPaying(false)
      if (dev.adPaymentFails) return setFailed(true)
      ads.addFunds(amount)
      setDev((d) => ({ adBalance: Math.round((d.adBalance + amount) * 100) / 100 }))
      onOpenChange(false)
      toast({ title: `${usd(amount)} added to your Ad Balance`, description: dev.adBalance < 0 ? `It settled ${usd(-dev.adBalance)} first.` : undefined })
    }, 900)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !paying && onOpenChange(o)}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add funds</DialogTitle>
          <DialogDescription>Your Ad Balance pays for impressions, per 1,000, at each country’s CPM.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ad-amount">Amount</Label>
          <div className={cn("flex h-11 items-center overflow-hidden rounded-2xl bg-input/50 focus-within:ring-3 focus-within:ring-ring/30", touched && error && "ring-3 ring-destructive/20")}>
            <span className="pl-3 text-muted-foreground">$</span>
            <input
              id="ad-amount"
              inputMode="decimal"
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^0-9.,]/g, ""))}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), pay())}
              aria-invalid={(touched && !!error) || undefined}
              className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-base tabular-nums outline-none"
            />
          </div>
          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map((v) => (
              <Button key={v} type="button" variant={amount === v ? "secondary" : "outline"} size="sm" className="flex-1 tabular-nums" onClick={() => (setRaw(String(v)), setTouched(false))}>
                {usd(v, false)}
              </Button>
            ))}
          </div>
          <p className={cn("text-xs", touched && error ? "text-destructive" : "text-muted-foreground")}>
            {touched && error ? error : `From ${usd(MIN_FUNDS, false)} to ${usd(MAX_FUNDS, false)}.`}
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3 text-sm">
          {dev.adBalance < 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Settles what’s owed first</span>
              <span className="tabular-nums">{usd(dev.adBalance)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">New Ad Balance</span>
            <span className="font-medium tabular-nums">{error ? "—" : usd(after)}</span>
          </div>
        </div>

        {failed && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 size-4 shrink-0" />
            Your card was declined. Try another card, or contact your bank.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={paying}>
            Cancel
          </Button>
          <Button onClick={pay} disabled={paying} className="gap-2" onMouseDown={(e) => e.preventDefault()}>
            {paying && <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />}
            {paying ? "Processing…" : error ? "Add funds" : `Add ${usd(amount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The full CPM rate card, with the signed-in country highlighted. */
export function RatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const mine = signedInCountry()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>CPM rates</DialogTitle>
          <DialogDescription>What 1,000 impressions cost, by the country they come from.</DialogDescription>
        </DialogHeader>
        <Loading skeleton={<RowsSkeleton rows={8} thumb={false} className="rounded-xl p-3 ring-1 ring-foreground/10" />}>
        <div className="max-h-[60vh] overflow-y-auto rounded-xl ring-1 ring-foreground/10 [scrollbar-width:thin]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-popover text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Country</th>
                <th className="px-3 py-2 text-right font-medium">CPM</th>
              </tr>
            </thead>
            <tbody>
              {CPM_RATES.map((r) => (
                <tr key={r.code} className={cn("border-t border-foreground/5", r.code === mine && "bg-primary/5 font-medium")}>
                  <td className="px-3 py-2">
                    {r.country}
                    {r.code === mine && <span className="ml-2 text-xs font-normal text-muted-foreground">You’re here</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{usd(r.cpm)}</td>
                </tr>
              ))}
              <tr className={cn("border-t border-foreground/5", mine === "OTHER" && "bg-primary/5 font-medium")}>
                <td className="px-3 py-2">All other countries</td>
                <td className="px-3 py-2 text-right tabular-nums">{usd(OTHER_CPM)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </Loading>
      </DialogContent>
    </Dialog>
  )
}

/** Platform picker; Other asks for the name, which is listed after review. */
export function PlatformField({
  platform,
  other,
  onPlatform,
  onOther,
  otherError,
}: {
  platform: string
  other: string
  onPlatform: (p: string) => void
  onOther: (v: string) => void
  otherError?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="pl-platform">Ad platform</Label>
      <Select value={platform} onValueChange={onPlatform}>
        <SelectTrigger id="pl-platform" className="h-11! w-full">
          <SelectValue placeholder="Choose where you’ll run it" />
        </SelectTrigger>
        <SelectContent>
          {PLATFORMS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={OTHER_PLATFORM}>Other</SelectItem>
        </SelectContent>
      </Select>
      {platform === OTHER_PLATFORM && (
        <>
          <Input id="pl-other" value={other} onChange={(e) => onOther(e.target.value)} placeholder="Platform name" maxLength={60} aria-invalid={!!otherError || undefined} className="h-11" />
          {otherError && <p className="text-xs text-destructive">{otherError}</p>}
        </>
      )}
    </div>
  )
}

/** New placement: name and size (fixed after this). The Flick, platform and tag come next, on the placement. */
export function NewPlacementDialog({
  open,
  onOpenChange,
  campaignId,
  flick,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** the campaign to add to; when unset, a campaign is picked (or made) in the dialog */
  campaignId?: string
  /** add this Flick right away; the size is then the Flick's */
  flick?: FlickRef
  onCreated: (p: Placement) => void
}) {
  const { campaigns } = useAds()
  const [name, setName] = useState("")
  const [size, setSize] = useState(flick?.size ?? "1080×1920")
  const [campaign, setCampaign] = useState<string>("")
  const [newCampaign, setNewCampaign] = useState("")
  const [tried, setTried] = useState(false)
  useEffect(() => {
    if (!open) return
    setName("")
    setSize(flick?.size ?? "1080×1920")
    setCampaign(campaignId ?? campaigns[0]?.id ?? "new")
    setNewCampaign("")
    setTried(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const errors = {
    name: !name.trim() ? "Name the placement." : undefined,
    campaign: !campaignId && campaign === "new" && !newCampaign.trim() ? "Name the campaign." : undefined,
  }
  const create = () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    const cId = campaignId ?? (campaign === "new" ? ads.addCampaign(newCampaign.trim()).id : campaign)
    const p = ads.addPlacement({ campaignId: cId, name: name.trim(), size, flick })
    onOpenChange(false)
    onCreated(p)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New placement</DialogTitle>
          <DialogDescription>A fixed-size slot with its own tag. {flick ? "This Flick goes in it." : "Next, you’ll add a Flick to it."}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4" onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && (e.preventDefault(), create())}>
          {!campaignId && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="pl-campaign">Campaign</Label>
              <Select value={campaign} onValueChange={setCampaign}>
                <SelectTrigger id="pl-campaign" className="h-11! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {campaigns.length > 0 && <SelectSeparator />}
                  <SelectItem value="new">New campaign</SelectItem>
                </SelectContent>
              </Select>
              {campaign === "new" && (
                <>
                  <Input value={newCampaign} onChange={(e) => setNewCampaign(e.target.value)} placeholder="Campaign name" maxLength={80} aria-invalid={(tried && !!errors.campaign) || undefined} className="h-11" />
                  {tried && errors.campaign && <p className="text-xs text-destructive">{errors.campaign}</p>}
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="pl-name">Placement name</Label>
            <Input id="pl-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Homepage takeover" maxLength={80} aria-invalid={(tried && !!errors.name) || undefined} className="h-11" />
            {tried && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pl-size">Size</Label>
            {flick ? (
              <p className="flex h-11 items-center gap-2 rounded-2xl bg-muted/60 px-3 text-sm tabular-nums">
                <RatioGlyph size={flick.size} className="text-muted-foreground" />
                {flick.size}
                <span className="text-muted-foreground">· this Flick’s size</span>
              </p>
            ) : (
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="pl-size" className="h-11! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_GROUPS.map((g, gi) => (
                    <SelectGroup key={g}>
                      {gi > 0 && <SelectSeparator />}
                      <SelectLabel>{g}</SelectLabel>
                      {SIZES.filter((s) => s.group === g).map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className="tabular-nums">{s.value}</span>
                          <span className="text-muted-foreground">{s.label}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">The size can’t be changed later. Only Flicks of this size can go in it.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <PendingButton onClick={create} onMouseDown={(e) => e.preventDefault()}>
            Create placement
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const edited = (t?: number) => (t ? new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "")

/**
 * Pick a Flick of the placement's size. Large, with search by name and a date filter,
 * so it still works with hundreds of Flicks.
 */
export function ReplaceFlickDialog({
  open,
  onOpenChange,
  placement,
  onPick,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** the slot being filled: a placement or an embed */
  placement: { id: string; name: string; size: string; flick?: FlickRef }
  /** defaults to putting it in the placement */
  onPick?: (f: FlickRef) => void
}) {
  const toast = useToast()
  useLibrary()
  const all = flicksFor(placement.size)
  const [pick, setPick] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [dates, setDates] = useState<DateFilterValue>(ALL_DATES)
  // the Flick open in the preview modal
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (open) (setPick(null), setQuery(""), setDates(ALL_DATES), setPreview(null))
  }, [open])
  const q = query.trim().toLowerCase()
  const options = all
    .filter((f) => (!q || f.name.toLowerCase().includes(q)) && inDateFilter(f.editedAt ?? 0, dates))
    .sort((a, b) => (b.editedAt ?? 0) - (a.editedAt ?? 0))
  const chosen = all.find((f) => f.id === pick)
  const previewing = all.find((f) => f.id === preview)
  const use = (f = chosen) => {
    if (!f) return
    if (onPick) onPick(f)
    else ads.setFlick(placement.id, f)
    onOpenChange(false)
    toast({ title: placement.flick ? "Flick replaced" : "Flick added", description: `“${f.name}” is now in ${placement.name}.` })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(760px,88vh)] flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{placement.flick ? "Replace Flick" : "Add a Flick"}</DialogTitle>
          <DialogDescription>Flicks in {placement.size}. {placement.flick ? "The tag stays the same; the new Flick serves from the next impression." : ""}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" aria-label="Search Flicks by name" className="pl-9" />
          </div>
          <DateFilter value={dates} onChange={setDates} label="Created" className="h-9" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
          <Loading k={[query.trim(), dates]} skeleton={<CardsSkeleton count={10} cols="grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" />}>
          {options.length ? (
            <ul className="grid grid-cols-2 gap-3 p-0.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {options.map((f) => {
                const live = placement.flick?.id === f.id
                return (
                  <li key={f.id} className="group/tile relative">
                    {/* preview opens it on its own, to add or replace from there */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon-xs"
                          aria-label={`Preview ${f.name}`}
                          onClick={() => setPreview(f.id)}
                          className="absolute right-3 top-3 z-10 size-7 rounded-lg bg-background/90 opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-background focus-visible:opacity-100 group-hover/tile:opacity-100"
                        >
                          <HugeiconsIcon icon={PlayIcon} className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview</TooltipContent>
                    </Tooltip>
                    <button
                      type="button"
                      onClick={() => setPick(f.id)}
                      aria-pressed={pick === f.id}
                      className={cn(
                        "flex w-full flex-col gap-1.5 rounded-xl p-1.5 text-left outline-none ring-1 ring-foreground/10 transition hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring",
                        pick === f.id && "ring-2 ring-primary hover:ring-primary",
                      )}
                    >
                      <span className="relative block aspect-square overflow-hidden rounded-lg bg-muted">
                        <img src={f.image} alt="" className="size-full object-cover" />
                        {live && <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">Live</span>}
                      </span>
                      <span className="truncate px-0.5 text-xs font-medium">{f.name}</span>
                      <span className="px-0.5 text-[11px] text-muted-foreground">Created {edited(f.editedAt)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
              {all.length ? "No Flicks match. Try another name or date." : `No Flicks in ${placement.size} yet. Export a project in this size, then come back.`}
            </p>
          )}
          </Loading>
        </div>

        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">{`${options.length} of ${all.length} Flicks`}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <PendingButton disabled={!chosen || placement.flick?.id === chosen.id} onClick={() => use()}>
              {placement.flick ? "Replace" : "Add Flick"}
            </PendingButton>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* preview: the Flick playing as viewers get it; add or replace from here, or close to go back */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewing?.name}</DialogTitle>
            <DialogDescription>
              {previewing?.size} · Created {edited(previewing?.editedAt)}
              {placement.flick?.id === previewing?.id && " · Live in this placement"}
            </DialogDescription>
          </DialogHeader>
          {previewing && (
            <div className="rounded-2xl bg-muted/60 p-3">
              <LiveFlick key={previewing.id} flick={previewing} tall />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Back
            </Button>
            <PendingButton disabled={!previewing || placement.flick?.id === previewing.id} onClick={() => previewing && (setPreview(null), use(previewing))}>
              {placement.flick ? "Replace with this Flick" : "Add this Flick"}
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

/**
 * Serve in ads (on the Flick page): put this Flick in a placement of the same size,
 * or make a new placement for it. The placement's tag is what runs in the DSP.
 */
export function ServeInAds({ flick, onOpenPlacement }: { flick: FlickRef; onOpenPlacement: (id: string) => void }) {
  const { placements, campaigns } = useAds()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const same = placements.filter((p) => p.size === flick.size)
  const campaignOf = (id: string) => campaigns.find((c) => c.id === id)?.name
  const done = (p: Placement, made: boolean) =>
    toast({
      title: made ? "Placement created" : "Added to placement",
      description: `“${flick.name}” is in ${p.name}. Copy its tag from the placement.`,
      action: { label: "View placement", onClick: () => onOpenPlacement(p.id) },
    })
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Put this Flick in a placement. Copy the placement’s tag into your DSP; replacing the Flick later does not change the tag.
      </p>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Placements in {flick.size}</h3>
        {same.length ? (
          <ul className="flex flex-col divide-y divide-foreground/5 rounded-2xl ring-1 ring-foreground/10">
            {same.map((p) => {
              const here = p.flick?.id === flick.id
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                    {p.flick && <img src={p.flick.image} alt="" className="size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {campaignOf(p.campaignId)} · {p.flick ? (here ? "This Flick" : p.flick.name) : "Empty"}
                    </span>
                  </span>
                  {here ? (
                    <Button variant="ghost" size="sm" onClick={() => onOpenPlacement(p.id)}>
                      View
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => (ads.setFlick(p.id, flick), done(p, false))}>
                      {p.flick ? "Replace" : "Add"}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No placements in {flick.size} yet.</p>
        )}
      </section>

      <Button variant={same.length ? "outline" : "default"} className="gap-1.5" onClick={() => setAdding(true)}>
        New placement for this Flick
      </Button>

      <NewPlacementDialog open={adding} onOpenChange={setAdding} flick={flick} onCreated={(p) => done(p, true)} />
    </div>
  )
}

/**
 * A Flick in a fixed-height stage, like the template page: the frame keeps its exact ratio and
 * fits the box whatever the size (wide, square or tall); the box shrinks on small screens.
 */
export function FlickStage({ flick, videos, start }: { flick: FlickRef; videos?: number[]; start?: number }) {
  return (
    <div className="h-[clamp(280px,56vh,520px)] w-full rounded-xl bg-muted p-4 ring-1 ring-foreground/5 sm:p-6">
      <div className="flex size-full items-center justify-center" style={{ containerType: "size" }}>
        <LiveFlick flick={flick} videos={videos} start={start} fit />
      </div>
    </div>
  )
}

/**
 * A Flick playing as viewers get it: its videos at its size, and the thumbnail strip to tap.
 * Moves on by itself every few seconds until a thumbnail is tapped.
 */
export function LiveFlick({ flick, tall, fit, videos: given, start = 0 }: { flick: FlickRef; tall?: boolean; videos?: number[]; start?: number; /** fill the parent container (FlickStage) at its ratio */ fit?: boolean }) {
  // a Flick's own variations when known; otherwise its product set's videos
  const i = Math.max(0, FLICKS.findIndex((f) => f.id === flick.id))
  const base = flick.video ?? FLICKS[i]?.video ?? REFERENCE_VIDEOS[i % REFERENCE_VIDEOS.length]
  const videos = given?.length ? given : [...new Set([0, 1, 2].map((n) => inSet(base, n)))]
  const [active, setActive] = useState(Math.min(start, videos.length - 1))
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto) return
    const id = setTimeout(() => setActive((a) => (a + 1) % videos.length), 4000)
    return () => clearTimeout(id)
  }, [active, auto, videos.length])
  const [w, h] = flick.size.split("×").map(Number)
  return (
    <div className={cn("flex items-center justify-center", !fit && w < h && (tall ? "h-[min(62vh,560px)]" : "h-[min(52vh,420px)]"))}>
      <div
        className={cn("relative overflow-hidden rounded-xl bg-neutral-900 shadow-lg", !fit && (w >= h ? "w-full" : "h-full"))}
        // in a stage: as large as fits, by the stage's width or height, whichever runs out first
        style={{ aspectRatio: `${w} / ${h}`, maxWidth: "100%", maxHeight: "100%", containerType: "size", ...(fit ? { width: `min(100cqw, calc(100cqh * ${w / h}))` } : {}) }}
      >
        {videos.map((v, k) => {
          const m = GENERATED_VIDEOS[v]
          return (
            <video key={v} autoPlay muted loop playsInline poster={m.poster} aria-hidden className={cn("absolute inset-0 size-full object-cover transition-opacity duration-700", k === active ? "opacity-100" : "opacity-0")}>
              {m.webm && <source src={m.webm} type="video/webm" />}
              <source src={m.mp4} type="video/mp4" />
            </video>
          )
        })}
        <div role="radiogroup" aria-label="Variations" className="absolute inset-x-0 bottom-[5%] flex justify-center gap-[3cqmin]">
          {videos.map((v, k) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={k === active}
              aria-label={`Variation ${k + 1}`}
              onClick={() => (setActive(k), setAuto(false))}
              className={cn("aspect-square w-[16cqmin] min-w-7 overflow-hidden rounded-[3cqmin] outline-none transition-all focus-visible:ring-2 focus-visible:ring-white", k === active ? "scale-105 ring-2 ring-white" : "opacity-70 hover:opacity-100")}
            >
              <img src={GENERATED_VIDEOS[v].poster} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
