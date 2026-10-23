import { useEffect, useId, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Alert02Icon, CursorPointer02Icon, Delete02Icon, Link04Icon, TextIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Feed } from "@/components/editor/elements"
import type { Slide } from "@/components/editor/slides-strip"
import { cn } from "@/lib/utils"
import { FEED_SUGGESTIONS } from "@/components/editor/feed-suggestions"

/**
 * Settings for the video in view: thumbnail and its feed values.
 * The reference video only has these once it's included as a variation.
 */
export function VariationPanel({
  slide,
  defaultName,
  isReference,
  included,
  onInclude,
  isStart,
  onStart,
  feeds,
  onAddFeed,
  onDeleteFeed,
  onPatch,
  focusFeed,
  frame,
  stale,
  onRegenerate,
  usedBy,
  onSelectElement,
  onRenameFeed,
}: {
  onRenameFeed?: (id: string, name: string) => void
  /** the text and buttons linked to each feed */
  usedBy?: Record<string, FeedUse[]>
  onSelectElement?: (id: string) => void
  /** a frame from this video once generated; the default thumbnail */
  frame?: string
  /** generated from an older reference video */
  stale?: boolean
  onRegenerate?: () => void
  slide: Slide
  defaultName: string
  isReference: boolean
  /** reference video only: shown to viewers as a variation */
  included: boolean
  onInclude: (on: boolean) => void
  isStart: boolean
  onStart: () => void
  feeds: Feed[]
  onAddFeed: (f: Omit<Feed, "id">) => void
  onDeleteFeed: (id: string) => void
  onPatch: (p: Partial<Slide>) => void
  /** feed whose value field should be brought into view and highlighted (n changes on every request) */
  focusFeed?: { id: string; n: number }
}) {
  const settings = !isReference || included
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-4 pt-1">
      {isReference && !included && (
        <p className="px-1 text-sm text-muted-foreground">Not shown to viewers. To include it in the Flick, use the menu on its thumbnail.</p>
      )}

      {stale && (
        <div role="status" className="flex flex-col gap-2 rounded-xl bg-amber-500/10 p-3 text-sm ring-1 ring-amber-500/25">
          <p className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
            <HugeiconsIcon icon={Alert02Icon} className="size-4" />
            Needs regenerating
          </p>
          <p className="text-xs text-muted-foreground">The reference video changed. Regenerate this variation so it matches.</p>
        </div>
      )}

      {settings && (
        <>
          <FeedsSection
            feeds={feeds}
            values={slide.feeds ?? {}}
            onValue={(id, v) => onPatch({ feeds: { ...slide.feeds, [id]: v } })}
            onAdd={onAddFeed}
            onDelete={onDeleteFeed}
            focus={focusFeed}
            usedBy={usedBy}
            onSelectElement={onSelectElement}
            onRename={onRenameFeed}
          />
        </>
      )}
    </div>
  )
}

/* ---------- pieces ---------- */

const Section = ({ children, className }: { children: React.ReactNode; className?: string }) => <section className={cn("flex flex-col gap-2", className)}>{children}</section>

/** A label that explains itself on hover. */
function TipLabel({ tip, htmlFor, children }: { tip: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Label htmlFor={htmlFor} className="w-fit cursor-default">
          {children}
        </Label>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{tip}</TooltipContent>
    </Tooltip>
  )
}


/** Feeds: defined once for all variations; each variation sets its own value. */
function FeedsSection({
  feeds,
  values,
  onValue,
  onAdd,
  onDelete,
  focus,
  usedBy = {},
  onSelectElement,
  onRename,
}: {
  onRename?: (id: string, name: string) => void
  usedBy?: Record<string, FeedUse[]>
  onSelectElement?: (id: string) => void
  feeds: Feed[]
  values: Record<string, string>
  onValue: (id: string, v: string) => void
  onAdd: (f: Omit<Feed, "id">) => void
  onDelete: (id: string) => void
  focus?: { id: string; n: number }
}) {
  const [adding, setAdding] = useState(false)
  // renaming a feed inline
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const saveName = (f: Feed) => {
    const clean = draft.trim().replace(/^@/, "").replace(/\s+/g, "-").toLowerCase()
    // empty or already used: keep the old name
    if (clean && clean !== f.name && !feeds.some((x) => x.name === clean)) onRename?.(f.id, clean)
    setRenaming(null)
  }
  const [flash, setFlash] = useState<string | null>(null)
  const fields = useRef<Record<string, HTMLInputElement | null>>({})

  // bring the requested feed's field into view, focus it and flash it
  useEffect(() => {
    if (!focus) return
    const el = fields.current[focus.id]
    if (!el) return
    el.scrollIntoView({ block: "nearest", behavior: "smooth" })
    el.focus()
    setFlash(focus.id)
    const t = setTimeout(() => setFlash(null), 1200)
    return () => clearTimeout(t)
  }, [focus])

  return (
    <Section>
      <div className="flex items-center gap-1.5">
        <TipLabel tip="Values that change per variation. Link them to text or buttons.">Feeds</TipLabel>
        {!adding && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-xs" variant="ghost" aria-label="Add feed" className="ml-auto size-6" onClick={() => setAdding(true)}>
                <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add feed</TooltipContent>
          </Tooltip>
        )}
      </div>

      {adding && <NewFeed feeds={feeds} onAdd={(f) => (onAdd(f), setAdding(false))} onCancel={() => setAdding(false)} />}

      {feeds.length === 0 && !adding && (
        <Button variant="ghost" onClick={() => setAdding(true)} className="h-auto w-full rounded-xl border border-dashed border-foreground/15 py-3 text-xs font-normal text-muted-foreground">
          No feeds yet. Add one like @price
        </Button>
      )}

      <ul className="flex flex-col gap-2">
        {feeds.map((f) => (
          <li key={f.id} className="group/feed">
            <div className="relative">
              {renaming === f.id ? (
                // rename in place; same rules as a new feed name
                <span className="absolute inset-y-0 left-1.5 z-10 my-auto flex h-6 w-[6.25rem] items-center gap-0.5 rounded-md bg-background pl-1 text-xs font-medium ring-2 ring-ring/50">
                  <span className="text-muted-foreground">@</span>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={() => saveName(f)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur()
                      if (e.key === "Escape") setRenaming(null)
                    }}
                    aria-label={`Rename @${f.name}`}
                    className="h-full min-w-0 flex-1 bg-transparent outline-none"
                  />
                </span>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => (setDraft(f.name), setRenaming(f.id))}
                      aria-label={`Rename @${f.name}`}
                      className="absolute inset-y-0 left-1.5 z-10 my-auto flex h-6 w-[6.25rem] items-center gap-1 rounded-md px-1 text-left text-xs font-medium outline-none hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <HugeiconsIcon icon={f.type === "link" ? Link04Icon : TextIcon} className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">@{f.name}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{f.type === "link" ? "Link feed" : "Text feed"} · tap to rename</TooltipContent>
                </Tooltip>
              )}
              <Input
                ref={(el) => {
                  fields.current[f.id] = el
                }}
                value={values[f.id] ?? ""}
                onChange={(e) => onValue(f.id, e.target.value)}
                placeholder={f.type === "link" ? "https://" : "Value"}
                inputMode={f.type === "link" ? "url" : undefined}
                aria-label={`@${f.name} value`}
                // fixed label column so values line up
                className={cn("pl-[6.75rem] pr-8 transition-shadow", flash === f.id && "bg-primary/5 ring-2 ring-primary")}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Delete @${f.name}`}
                    onClick={() => onDelete(f.id)}
                    className="absolute inset-y-0 right-1 z-10 my-auto size-6 opacity-0 transition-opacity group-hover/feed:opacity-100 focus-visible:opacity-100"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete from all variations. Linked text keeps the value in view.</TooltipContent>
              </Tooltip>
            </div>
            {/* what uses this feed on the canvas: tap to select it */}
            {(usedBy[f.id]?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 pl-2.5 pt-1.5">
                {usedBy[f.id].map((u) => (
                  <Tooltip key={u.id}>
                    <TooltipTrigger asChild>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onSelectElement?.(u.id)}
                        className="h-6 max-w-40 gap-1 rounded-md px-1.5 text-[11px] font-normal text-muted-foreground"
                      >
                        <HugeiconsIcon icon={u.kind === "button" ? CursorPointer02Icon : TextIcon} className="size-3 shrink-0" />
                        <span className="truncate">{u.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Select this {u.kind === "button" ? "button" : "text"}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** An element linked to a feed, as listed under that feed. */
export type FeedUse = { id: string; label: string; kind: "text" | "button" }


/** Inline form: feed name + Text/Link. Also used from the button link popover. */
export function NewFeed({
  feeds,
  onAdd,
  onCancel,
  type: fixedType,
}: {
  feeds: Feed[]
  onAdd: (f: Omit<Feed, "id">) => void
  onCancel?: () => void
  /** lock the type (the button link popover only makes link feeds) */
  type?: Feed["type"]
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState<Feed["type"]>(fixedType ?? "text")
  const clean = name.trim().replace(/^@/, "").replace(/\s+/g, "-").toLowerCase()
  const taken = feeds.some((f) => f.name === clean)
  const inputId = useId()
  // rotate example names in the placeholder while empty
  const [tick, setTick] = useState(0)
  const examples = FEED_SUGGESTIONS[type]
  const example = examples[tick % examples.length]
  useEffect(() => {
    if (name) return
    const t = setInterval(() => setTick((n) => n + 1), 2200)
    return () => clearInterval(t)
  }, [name])
  // a price, a URL or a sentence was typed where the name goes
  const raw = name.trim()
  const looksLikeValue = !!raw && (/^https?:|www\.|\.(com|net|org|io|ai)\b/i.test(raw) || /[$€£¥₹%]/.test(raw) || /^\d/.test(raw) || raw.split(/\s+/).length > 3)
  const add = () => {
    if (!clean || taken) return
    onAdd({ name: clean, type })
    setName("")
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-background p-2 shadow-sm ring-1 ring-foreground/10">
      {/* what kind of value: labelled, so the choice is obvious */}
      {!fixedType && (
        <div role="radiogroup" aria-label="Feed type" className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5">
          {(
            [
              ["text", "Text", TextIcon],
              ["link", "Link", Link04Icon],
            ] as const
          ).map(([t, label, icon]) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={cn(
                "flex h-7 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                type === t ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={icon} className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}
<div className="relative">
        {name && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>}
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add()
            if (e.key === "Escape") onCancel?.()
          }}
          id={inputId}
          placeholder={`Feed name, like @${example.name}`}
          aria-label="Feed name"
          aria-describedby={`${inputId}-hint`}
          aria-invalid={taken || undefined}
          className={cn("h-8 text-sm", name ? "pl-6" : "pl-2.5")}
        />
      </div>
      {taken ? (
        <p id={`${inputId}-hint`} className="px-1 text-xs text-destructive">@{clean} already exists</p>
      ) : looksLikeValue ? (
        <p id={`${inputId}-hint`} className="px-1 text-xs text-amber-600 dark:text-amber-500">
          Looks like a {type === "link" ? "link" : "value"}. Name what it is, like @{FEED_SUGGESTIONS[type][type === "link" ? 0 : 1].name}.
        </p>
      ) : name ? (
        <p id={`${inputId}-hint`} className="px-1 text-xs text-muted-foreground">
          Name it now, add {type === "link" ? "links" : "values"} next.
        </p>
      ) : (
        // names to pick from: click one to use it
        <div id={`${inputId}-hint`} className="flex flex-wrap items-center gap-1 px-0.5">
          {examples
            .filter((x) => !feeds.some((f) => f.name === x.name))
            .slice(0, 3)
            .map((x) => (
              <button
                key={x.name}
                type="button"
                onClick={() => setName(x.name)}
                className="h-6 rounded-md bg-muted px-1.5 text-xs text-muted-foreground outline-none hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                @{x.name}
              </button>
            ))}
        </div>
      )}
      <div className="flex items-center justify-end gap-1">
        {onCancel && (
          <Button size="xs" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="xs" disabled={!clean || taken} onClick={add}>
          Create feed
        </Button>
      </div>
    </div>
  )
}
