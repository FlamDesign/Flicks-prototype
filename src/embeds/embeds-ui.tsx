import { useEffect, useState } from "react"
import { Loading, PendingButton, RowsSkeleton } from "@/components/page-skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui-extra/toaster"
import { RatioGlyph } from "@/components/ratio-glyph"
import { SIZES, SIZE_GROUPS } from "@/data"
import type { FlickRef } from "@/ads/ads"
import { embeds, useEmbeds, type Embed } from "@/embeds/embeds"

/** New embed: name and size (fixed after this). With a Flick, the size is the Flick's and it goes straight in. */
export function NewEmbedDialog({ open, onOpenChange, flick, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; flick?: FlickRef; onCreated: (e: Embed) => void }) {
  const [name, setName] = useState("")
  const [size, setSize] = useState(flick?.size ?? "1920×1080")
  const [tried, setTried] = useState(false)
  useEffect(() => {
    if (!open) return
    setName("")
    setSize(flick?.size ?? "1920×1080")
    setTried(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const error = !name.trim() ? "Name the embed." : undefined
  const create = () => {
    setTried(true)
    if (error) return
    const e = embeds.add({ name: name.trim(), size, flick })
    onOpenChange(false)
    onCreated(e)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New embed</DialogTitle>
          <DialogDescription>A spot on your website or app with its own code. Replace the Flick in it any time; the code stays the same. {flick ? "This Flick goes in it." : ""}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4" onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && (e.preventDefault(), create())}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="em-name">Embed name</Label>
            <Input id="em-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Homepage hero" maxLength={80} aria-invalid={(tried && !!error) || undefined} className="h-11" />
            {tried && error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="em-size">Size</Label>
            {flick ? (
              <p className="flex h-11 items-center gap-2 rounded-2xl bg-muted/60 px-3 text-sm tabular-nums">
                <RatioGlyph size={flick.size} className="text-muted-foreground" />
                {flick.size}
                <span className="text-muted-foreground">· this Flick’s size</span>
              </p>
            ) : (
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="em-size" className="h-11! w-full">
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
            <p className="text-xs text-muted-foreground">The size can’t be changed later.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <PendingButton onClick={create} onMouseDown={(e) => e.preventDefault()}>
            Create embed
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Add to embed (Flick page): embeds of the Flick's size, each with Add or Replace (View when it's
 * already there), and New embed for this Flick.
 */
export function AddToEmbed({ flick, onOpenEmbed, onDone }: { flick: FlickRef; onOpenEmbed: (id: string) => void; onDone?: () => void }) {
  const { embeds: list } = useEmbeds()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const same = list.filter((e) => e.size === flick.size)
  const done = (e: Embed, made: boolean) => {
    toast({
      title: made ? "Embed created" : "Added to embed",
      description: `“${flick.name}” is in ${e.name}. ${made ? "Copy its code from the embed." : "Your site shows it from the next view."}`,
      action: { label: "View embed", onClick: () => onOpenEmbed(e.id) },
    })
    onDone?.()
  }
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Embeds in {flick.size}</h3>
        <Loading skeleton={<RowsSkeleton rows={3} className="rounded-2xl p-3 ring-1 ring-foreground/10" />}>
        {same.length ? (
          <ul className="flex flex-col divide-y divide-foreground/5 rounded-2xl ring-1 ring-foreground/10">
            {same.map((e) => {
              const here = e.flick?.id === flick.id
              return (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">{e.flick && <img src={e.flick.image} alt="" className="size-full object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{e.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{e.flick ? (here ? "This Flick" : e.flick.name) : "Empty"}</span>
                  </span>
                  {here ? (
                    <Button variant="ghost" size="sm" onClick={() => onOpenEmbed(e.id)}>
                      View
                    </Button>
                  ) : (
                    <PendingButton variant="outline" size="sm" onClick={() => (embeds.setFlick(e.id, flick), done(e, false))}>
                      {e.flick ? "Replace" : "Add"}
                    </PendingButton>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No embeds in {flick.size} yet.</p>
        )}
        </Loading>
      </section>
      <Button variant={same.length ? "outline" : "default"} onClick={() => setAdding(true)}>
        New embed for this Flick
      </Button>
      <NewEmbedDialog open={adding} onOpenChange={setAdding} flick={flick} onCreated={(e) => done(e, true)} />
    </div>
  )
}
