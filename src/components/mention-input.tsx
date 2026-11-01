import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon, PaintBoardIcon, PencilEdit01Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaAdd } from "@/components/media-picker"
import { ELEMENT_KINDS, cleanName, elements, useElements, type ElementKind, type FlickElement } from "@/lib/elements"
import { cn } from "@/lib/utils"

/** Something a prompt can @-mention. `label` is what follows the @ in the text. */
export type MentionOption = {
  key: string
  label: string
  group: "In this prompt" | "Elements" | "Variations" | "Brand"
  thumb?: string
  video?: boolean
  hint?: string
  element?: FlickElement
}

/**
 * What a prompt box can mention: its own photos and videos (@Image 1, @Video 1, in the order
 * they were added), saved elements, the Flick's variations by name, and the brand kit.
 */
export function useMentionOptions(o: { refs?: { url: string; name: string; video?: boolean; poster?: string }[]; variations?: { name: string; poster?: string }[]; brand?: boolean }): MentionOption[] {
  const els = useElements()
  return useMemo(() => {
    let img = 0
    let vid = 0
    const own: MentionOption[] = (o.refs ?? []).map((r, i) => {
      const label = r.video ? `Video ${++vid}` : `Image ${++img}`
      return { key: `ref-${i}`, label, group: "In this prompt", thumb: r.poster ?? (r.video ? undefined : r.url), video: r.video, hint: r.name }
    })
    const named: MentionOption[] = els.map((e) => ({ key: `el-${e.id}`, label: e.name, group: "Elements", thumb: e.images[0]?.url, hint: `${ELEMENT_KINDS.find((k) => k.value === e.kind)?.label ?? "Element"} · ${e.images.length} image${e.images.length === 1 ? "" : "s"}`, element: e }))
    const vars: MentionOption[] = (o.variations ?? []).map((v, i) => ({ key: `var-${i}`, label: v.name, group: "Variations", thumb: v.poster, hint: `Variation ${i + 1}` }))
    const brand: MentionOption[] = o.brand ? [{ key: "brand", label: "Brand", group: "Brand", hint: "Colours, font and tone" }] : []
    // a name already taken earlier in the list keeps the first meaning
    const seen = new Set<string>()
    return [...own, ...named, ...vars, ...brand].filter((x) => x.label && !seen.has(x.label.toLowerCase()) && seen.add(x.label.toLowerCase()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [els, JSON.stringify(o.refs?.map((r) => [r.url, r.video, r.poster])), JSON.stringify(o.variations), o.brand])
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
/** the @mentions in a text, longest names first so "@Gold Rush" beats "@Gold" */
export function mentionsIn(text: string, options: MentionOption[]): MentionOption[] {
  const sorted = [...options].sort((a, b) => b.label.length - a.label.length)
  const found: MentionOption[] = []
  let rest = text
  for (const o of sorted) {
    const re = new RegExp(`@${escape(o.label)}(?![\\p{L}\\p{N}])`, "giu")
    if (re.test(rest)) {
      found.push(o)
      rest = rest.replace(re, " ")
    }
  }
  return found
}

/** splits text into plain runs and @mention runs, for the highlight layer */
function splitMentions(text: string, options: MentionOption[]) {
  if (!options.length) return [{ text, on: false }]
  const alts = [...options].sort((a, b) => b.label.length - a.label.length).map((o) => escape(o.label)).join("|")
  const re = new RegExp(`@(?:${alts})(?![\\p{L}\\p{N}])`, "giu")
  const out: { text: string; on: boolean }[] = []
  let at = 0
  for (const m of text.matchAll(re)) {
    if (m.index! > at) out.push({ text: text.slice(at, m.index), on: false })
    out.push({ text: m[0], on: true })
    at = m.index! + m[0].length
  }
  out.push({ text: text.slice(at), on: false })
  return out
}

export type MentionTextareaHandle = { focus: (o?: FocusOptions) => void }

/**
 * A textarea that knows @mentions: typing @ opens a list (this prompt's photos and videos, saved
 * elements, variations, the brand) filtered as you type; ↑↓ and Enter or Tab pick, Esc closes.
 * Mentions show highlighted. "New element" makes one on the spot and mentions it.
 */
export const MentionTextarea = forwardRef<
  MentionTextareaHandle,
  Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> & { value: string; onChange: (v: string) => void; options: MentionOption[]; menuSide?: "top" | "bottom" }
>(function MentionTextarea({ value, onChange, options, menuSide = "top", className, onKeyDown, ...rest }, fwd) {
  const area = useRef<HTMLTextAreaElement>(null)
  const mirror = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState<{ start: number; text: string } | null>(null)
  const [hi, setHi] = useState(0)
  const [creating, setCreating] = useState<{ edit?: FlickElement; name?: string } | null>(null)
  useImperativeHandle(fwd, () => ({ focus: (o?: FocusOptions) => area.current?.focus(o) }))

  const match = (o: MentionOption, q: string) => o.label.toLowerCase().replace(/\s+/g, "").includes(q.toLowerCase().replace(/\s+/g, ""))
  const list = query ? options.filter((o) => match(o, query.text)).slice(0, 12) : []
  const canCreate = !!query
  const total = list.length + (canCreate ? 1 : 0)

  /** the @word just before the caret, if any */
  const look = (v: string, caret: number) => {
    const m = /(^|[\s(])@([\p{L}\p{N} _'-]{0,30})$/u.exec(v.slice(0, caret))
    // a space ends the search unless it still matches something ("@Image 1")
    if (m && (!/\s$/.test(m[2]) || options.some((o) => match(o, m[2].trim()) && o.label.includes(" ")))) {
      setQuery({ start: caret - m[2].length - 1, text: m[2] })
      setHi(0)
    } else setQuery(null)
  }
  // the @word being replaced, kept while the new-element dialog has the focus
  const pending = useRef<{ start: number; end: number } | null>(null)
  const insert = (label: string, at?: { start: number; end: number }) => {
    const el = area.current
    const span = at ?? (query && el ? { start: query.start, end: el.selectionStart } : null)
    if (!el || !span) return
    const next = `${value.slice(0, span.start)}@${label} ${value.slice(span.end).replace(/^ /, "")}`
    onChange(next)
    setQuery(null)
    const pos = span.start + label.length + 2
    requestAnimationFrame(() => (el.focus(), el.setSelectionRange(pos, pos)))
  }
  const choose = (i: number) => {
    if (i < list.length) return insert(list[i].label)
    pending.current = query && area.current ? { start: query.start, end: area.current.selectionStart } : null
    setCreating({ name: cleanName(query?.text ?? "") })
  }

  // where the list floats: under or over the box, whichever has room (preferring menuSide)
  const [place, setPlace] = useState<React.CSSProperties | null>(null)
  useLayoutEffect(() => {
    if (!query) return setPlace(null)
    const at = () => {
      const r = area.current?.getBoundingClientRect()
      if (!r) return
      const h = 300
      const below = window.innerHeight - r.bottom
      const up = menuSide === "top" ? r.top > h || r.top > below : below < h && r.top > below
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 296))
      setPlace(up ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 })
    }
    at()
    window.addEventListener("resize", at)
    window.addEventListener("scroll", at, true)
    return () => (window.removeEventListener("resize", at), window.removeEventListener("scroll", at, true))
  }, [!!query, menuSide])

  const groups = list.reduce<Record<string, { o: MentionOption; i: number }[]>>((acc, o, i) => ((acc[o.group] ??= []).push({ o, i }), acc), {})
  const parts = splitMentions(value, options)

  return (
    <div className="relative min-w-0">
      {/* the highlight layer: same text, mentions tinted, behind the transparent-backed textarea */}
      <div ref={mirror} aria-hidden className={cn("w-full border border-transparent px-2.5 py-2 text-base md:text-sm", className, "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words bg-transparent text-transparent shadow-none ring-0 dark:bg-transparent")}>
        {parts.map((p, i) => (p.on ? <mark key={i} className="rounded-[4px] bg-primary/15 text-transparent ring-1 ring-primary/25">{p.text}</mark> : <span key={i}>{p.text}</span>))}
        {"​"}
      </div>
      <Textarea
        {...rest}
        ref={area}
        value={value}
        className={cn(className, "relative")}
        onChange={(e) => (onChange(e.target.value), look(e.target.value, e.target.selectionStart))}
        onScroll={(e) => mirror.current && (mirror.current.scrollTop = e.currentTarget.scrollTop)}
        onSelect={(e) => look(e.currentTarget.value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        onKeyDown={(e) => {
          if (query && total) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault()
              setHi((h) => (h + (e.key === "ArrowDown" ? 1 : -1) + total) % total)
              return
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault()
              e.stopPropagation()
              choose(hi)
              return
            }
            if (e.key === "Escape") {
              e.preventDefault()
              e.stopPropagation()
              setQuery(null)
              return
            }
          }
          onKeyDown?.(e)
        }}
        aria-autocomplete="list"
        aria-expanded={!!query}
      />
      {query && place && createPortal(
        // floats above the page (no container clips it); opens on the preferred side when it fits
        <div
          role="listbox"
          aria-label="Mention"
          onMouseDown={(e) => e.preventDefault()}
          style={place}
          className="fixed z-[100] max-h-72 w-72 overflow-y-auto rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95"
        >
          {!list.length && <p className="px-2 py-1.5 text-xs text-muted-foreground">Nothing called “{query.text}”.</p>}
          {Object.entries(groups).map(([g, items]) => (
            <div key={g} className="py-0.5">
              <p className="px-2 pb-0.5 pt-1 text-2xs font-medium text-muted-foreground">{g}</p>
              {items.map(({ o, i }) => (
                <div key={o.key} role="option" aria-selected={i === hi} onMouseEnter={() => setHi(i)} onClick={() => choose(i)} className={cn("group/m flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm", i === hi && "bg-muted")}>
                  <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                    {o.thumb ? <img src={o.thumb} alt="" className="size-full object-cover" /> : <HugeiconsIcon icon={o.group === "Brand" ? PaintBoardIcon : PlayIcon} className="size-3.5" />}
                    {o.video && o.thumb && <HugeiconsIcon icon={PlayIcon} className="absolute size-3 text-white drop-shadow" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">@{o.label}</span>
                    {o.hint && <span className="truncate text-2xs text-muted-foreground">{o.hint}</span>}
                  </span>
                  {o.element && (
                    <Button variant="ghost" size="icon-xs" aria-label={`Edit ${o.label}`} onClick={(e) => (e.stopPropagation(), (pending.current = null), setCreating({ edit: o.element }))} className="opacity-0 group-hover/m:opacity-100 focus-visible:opacity-100">
                      <HugeiconsIcon icon={PencilEdit01Icon} className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ))}
          {canCreate && (
            <div role="option" aria-selected={hi === list.length} onMouseEnter={() => setHi(list.length)} onClick={() => choose(list.length)} className={cn("mt-0.5 flex cursor-pointer items-center gap-2 rounded-lg border-t px-2 py-1.5 text-sm", hi === list.length && "bg-muted")}>
              <span className="grid size-7 place-items-center rounded-md bg-muted">
                <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
              </span>
              New element{query.text.trim() ? ` “${cleanName(query.text)}”` : ""}
            </div>
          )}
        </div>,
        document.body,
      )}
      <ElementDialog
        open={!!creating}
        edit={creating?.edit}
        name={creating?.name}
        onClose={() => setCreating(null)}
        onSaved={(name) => {
          setCreating(null)
          // a new element replaces the @word it was made from; an edited one updates nothing in the text
          if (pending.current) insert(name, pending.current)
          pending.current = null
        }}
      />
    </div>
  )
})

/** Make or edit an element: a name, what it is, and its images (picked like any reference). */
export function ElementDialog({ open, edit, name: initial, onClose, onSaved }: { open: boolean; edit?: FlickElement; name?: string; onClose: () => void; onSaved?: (name: string) => void }) {
  const [name, setName] = useState("")
  const [kind, setKind] = useState<ElementKind>("product")
  const [images, setImages] = useState<{ url: string; name: string }[]>([])
  const [was, setWas] = useState(false)
  if (open !== was) {
    setWas(open)
    if (open) {
      setName(edit?.name ?? initial ?? "")
      setKind(edit?.kind ?? "product")
      setImages(edit?.images ?? [])
    }
  }
  const media = useMediaAdd((items) => setImages((list) => [...list, ...items.filter((m) => m.kind === "image").map((m) => ({ url: m.url, name: m.name }))].slice(0, 8)))
  const clean = cleanName(name)
  const taken = useElements().some((x) => x.id !== edit?.id && x.name.toLowerCase() === clean.toLowerCase())
  const ok = !!clean && images.length > 0 && !taken
  const save = () => {
    if (!ok) return
    elements.save({ id: edit?.id, name: clean, kind, images })
    onSaved?.(clean)
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{edit ? "Edit element" : "New element"}</DialogTitle>
          <DialogDescription>Save a product, character, logo or style once, then @mention it in any prompt.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Samba OG" autoFocus onKeyDown={(e) => e.key === "Enter" && save()} />
            {taken && <span className="text-xs text-destructive">There’s already an element called {clean}.</span>}
          </label>
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">What it is</span>
            <Tabs value={kind} onValueChange={(v) => setKind(v as ElementKind)}>
              <TabsList>
                {ELEMENT_KINDS.map((k) => (
                  <TabsTrigger key={k.value} value={k.value}>
                    {k.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">Images</span>
            <div className="flex flex-wrap gap-2">
              {images.map((im, i) => (
                <span key={im.url + i} className="group/e relative size-16 overflow-hidden rounded-lg ring-1 ring-foreground/10">
                  <img src={im.url} alt={im.name} className="size-full object-cover" />
                  <button type="button" aria-label={`Remove ${im.name}`} onClick={() => setImages((l) => l.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/55 text-white opacity-0 group-hover/e:opacity-100 focus-visible:opacity-100">
                    ×
                  </button>
                </span>
              ))}
              <button type="button" onClick={media.openPicker} className="grid size-16 place-items-center rounded-lg border border-dashed border-foreground/20 text-muted-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring" aria-label="Add images">
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">A few angles help keep it exact.</span>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {edit ? (
            <Button variant="ghost" className="text-destructive" onClick={() => (elements.remove(edit.id), onClose())}>
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!ok} onClick={save}>
              {edit ? "Save" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      {media.ui}
    </Dialog>
  )
}
