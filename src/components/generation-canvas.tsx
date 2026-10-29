import { useEffect, useRef, useState } from "react"
import { PendingButton } from "@/components/page-skeletons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Delete02Icon, Loading03Icon, MinusSignIcon, PlusSignIcon, SparklesIcon, BubbleChatIcon } from "@hugeicons/core-free-icons"
import { useCanvasView, MIN_ZOOM, MAX_ZOOM } from "@/components/editor/use-canvas-view"
import { videoCost } from "@/components/credits-card"
import type { Reference } from "@/components/prompt-composer"
import { TEMPLATES, type Template } from "@/data"
import { MAX_VARIATIONS, SlidesStrip, slideName, type Slide, type SlideStatus } from "@/components/editor/slides-strip"
import { SlidePrompt } from "@/components/editor/slide-prompt"
import { focusPromptBox, PromptChat, PromptSpotlight, refsOf, TargetChip, type HistoryItem } from "@/components/editor/prompt-chat"
import { FeedsPanel, FeedsTitle } from "@/components/editor/feeds-panel"
import { VideoLightbox } from "@/components/editor/video-lightbox"
import { ExportControl } from "@/components/editor/export-flick"
import { VersionHistoryPanel } from "@/components/editor/version-history"
import { TemplateSection, type Issue } from "@/components/flick-sections"
import { library, useLibrary, type Checkpoint } from "@/library"
import { onboarding, useOnboarding } from "@/onboarding/onboarding"
import { FileTitle, ModeSwitch, VideoToggle } from "@/components/editor/editor-topbar"
import { useToast } from "@/components/ui-extra/toaster"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SIZES } from "@/data"
import { ratioOf } from "@/components/ratio-glyph"
import { useDevState } from "@/dev/state"
import { EditorPanel, type Picker } from "@/components/editor/editor-panel"
import { GeneratedVideo } from "@/components/editor/generated-video"
import { CanvasStage } from "@/components/editor/canvas-stage"
import { ElementToolbar, ToolbarGrip } from "@/components/editor/element-toolbar"
import { useAgent, type EditorApi } from "@/ai/agent"
import { buildDesign, describeDesign, elementFor, feedOfField, FIELD_FEED, FIELDS, patchDesign, restack, type Brand, type Field } from "@/ai/design"
import { isLive, useAiConfig } from "@/ai/client"
import { AgentComposer, AgentItemView, type AgentCtx } from "@/components/editor/agent-chat"
import { PlanningView, PlanSteps } from "@/components/editor/planning-view"
import { BUTTON_TEXT, DEFAULT_ICON, GENERATED_VIDEOS, SAMPLE_UPLOADS, inSet, clampStrip, newStrip, type Feed, TEXT_STYLES, type CanvasElement, type Upload } from "@/components/editor/elements"

export type Generation = {
  id: string
  prompt: string
  size: string
  /** video length in seconds, 6 to 15 */
  duration?: number
  references: number
  refs?: Reference[]
  startedAt: number
  video: number
  /** opened from a template: everything is already generated and the reference video is fixed */
  template?: Template
  /** a duplicate of another Flick: its name and everything on its canvas */
  copy?: { title: string; snap: unknown }
  /** started from Assets with Use in Flicks: that video is the reference video, already made */
  fromAsset?: boolean
  /** reopening a project: its name, the canvas as it was left and its saved versions */
  resume?: { title: string; snap?: unknown; versions?: Checkpoint[] }
  /** a built-in sample project: opens with its videos already made */
  sample?: boolean
  /** where Back goes */
  back?: string
  /** a remix: the name of the Flick it started from */
  remixOf?: string
  /** started from Create with the chat on: nothing is generated until the chat's plan is approved */
  agent?: boolean
}
type Snap = { elements: CanvasElement[]; slides: Slide[]; feeds: Feed[]; start: string; includeRef: boolean }
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** Canvas shown right after Generate: a frame at the chosen size with a live generating state. */
export function GenerationCanvas({
  generation,
  onBack,
  onGetCredits,
  onOpenFlick,
  onSaveTemplate,
  onHomeTemplates,
  onDuplicate,
}: {
  generation: Generation
  onBack: () => void
  onGetCredits: () => void
  /** open a Flick this project exported (from Version history) */
  onOpenFlick: (flickId: string) => void
  /** adds a template saved from this project */
  onSaveTemplate: (t: Template) => void
  /** home, scrolled to the templates */
  onHomeTemplates: () => void
  /** opens a copy of this project as a new one */
  onDuplicate: (copy: { title: string; snap: Snap }) => void
}) {
  const area = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  // pan and zoom: two-finger scroll / pinch, or middle-drag / wheel
  const viewport = useRef<HTMLDivElement>(null)
  const { view, zoomTo, fit: fitView } = useCanvasView(viewport, area)
  // true zoom: the frame on screen against the Flick's real pixel width
  const designW = parseInt(generation.size) || 1080
  const zoomPct = box.w ? Math.round(((box.w * view.s) / designW) * 100) : 100
  const actualScale = box.w ? designW / box.w : 1
  // the zoom control opens while zooming, then folds back
  const [zooming, setZooming] = useState(false)
  const firstZoom = useRef(true)
  useEffect(() => {
    if (firstZoom.current) return void (firstZoom.current = false)
    setZooming(true)
    const t = setTimeout(() => setZooming(false), 1200)
    return () => clearTimeout(t)
  }, [view.s])
  const ratio = ratioOf(generation.size)
  const sizeInfo = SIZES.find((s) => s.value === generation.size)
  const { state: dev, update: setDev } = useDevState()
  const ms = dev.generationSeconds * 1000
  // every video in this Flick costs the same: its size and length
  const VIDEO_COST = videoCost(generation.size, generation.duration ?? 8)

  // Slides: the main video plus its variations (at least two, up to five)
  const tpl = generation.template
  // a template the user saved from the editor: the whole project, ready to edit
  const savedSnap = (generation.copy?.snap ?? generation.resume?.snap ?? tpl?.saved) as Snap | undefined
  // built-in templates come with a fixed reference video (copies keep it)
  const fixedRef = !!tpl && !tpl.saved
  const [slides, setSlides] = useState<Slide[]>(() => {
    const main: Slide = {
      id: "main",
      // the prompt box starts empty: what was sent lives in the history (and in `used`)
      prompt: "",
      refs: [],
      video: generation.video,
      // with the chat, the reference video waits for the plan
      startedAt: generation.agent ? undefined : generation.startedAt,
      used: { prompt: generation.prompt, refs: generation.refs ?? [], fromReference: false },
    }
    if (savedSnap) return savedSnap.slides.map((x, i) => ({ ...x, n: x.n ?? (i || undefined), startedAt: x.startedAt ? 1 : undefined }))
    // a sample project: the reference video and two variations, all made long ago (startedAt 1)
    if (generation.sample)
      return [
        { ...main, startedAt: 1 },
        ...[1, 2].map((n) => ({ id: crypto.randomUUID(), n, prompt: "", refs: [], video: inSet(generation.video, n), startedAt: 1, used: { prompt: VARIATION_PROMPTS[n - 1], refs: [], fromReference: true } })),
      ]
    if (!tpl) return [main, { id: crypto.randomUUID(), n: 1 }, { id: crypto.randomUUID(), n: 2 }]
    // template: reference video plus one ready variation per template variant (startedAt 1 = finished long ago)
    return [
      { ...main, startedAt: 1 },
      ...tpl.variants.slice(0, 3).map((v, i) => {
        const prompt = `${tpl.prompt}, featuring the ${v.label.toLowerCase()}`
        return { id: crypto.randomUUID(), n: i + 1, name: v.label, prompt: "", refs: [], video: inSet(generation.video ?? 0, i + 1), startedAt: 1, used: { prompt, refs: [], fromReference: true } }
      }),
    ]
  })
  const [active, setActive] = useState("main")
  // every generation, as a chat on the left (seeded from whatever is already made)
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    slides
      .filter((s) => s.startedAt && s.video !== undefined)
      .map((s) => ({
        id: crypto.randomUUID(),
        slideId: s.id,
        prompt: s.used?.prompt ?? s.prompt ?? "",
        refs: refsOf(s.used?.refs ?? s.refs),
        fromReference: s.id !== "main",
        video: s.video!,
        startedAt: s.startedAt!,
      })),
  )
  // next variation number; numbers are never reused
  const nextN = useRef(Math.max(0, ...slides.map((s) => s.n ?? 0)) + 1)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  // a new Flick is named from its prompt (simulated AI); a template's copy is the template name and when it was made
  const [title, setTitle] = useState(() => generation.copy?.title ?? generation.resume?.title ?? (generation.template ? `${generation.template.title}_${stamp()}` : ""))
  const naming = !title
  useEffect(() => {
    if (title) return
    const t = setTimeout(() => setTitle((v) => v || titleFromPrompt(generation.prompt)), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Preview hides every panel and plays the Flick on the canvas as viewers get it
  const [mode, setMode] = useState<"design" | "preview">("design")
  const previewing = mode === "preview"
  const [confirmDelete, setConfirmDelete] = useState(false)
  const toast = useToast()
  // a fresh duplicate says so once it opens
  const announced = useRef(false)
  useEffect(() => {
    if (announced.current) return
    if (generation.fromAsset) {
      announced.current = true
      return void toast({ title: "New project created", description: "Your video is the reference video. Add variations next." })
    }
    if (generation.remixOf) {
      announced.current = true
      return void toast({ title: "Remix created", description: `A new project from “${generation.remixOf}”. The Flick does not change.` })
    }
    if (!generation.copy) return
    announced.current = true
    toast({ title: "Duplicated", description: `You’re now editing “${generation.copy.title}”.` })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [preview, setPreview] = useState<string | null>(null)
  // the reference video is only shown to viewers when included as a variation
  const [includeRef, setIncludeRef] = useState(savedSnap?.includeRef ?? false)
  const included = includeRef ? slides : slides.slice(1)
  const [start, setStart] = useState(() => savedSnap?.start ?? slides[1].id)
  const [feeds, setFeeds] = useState<Feed[]>(savedSnap?.feeds ?? [])
  const addFeed = (f: Omit<Feed, "id">) => {
    const id = crypto.randomUUID()
    setFeeds((list) => [...list, { ...f, id }])
    return id
  }
  // highlight a feed's value field in the right panel (n re-triggers for the same feed)
  const [focusFeed, setFocusFeed] = useState<{ id: string; n: number }>()
  // open the Feeds section in the left panel too
  const [panelReq, setPanelReq] = useState<{ section: "feeds"; n: number }>()
  // the feed open in the Feeds panel (null: the list)
  const [feedOpen, setFeedOpen] = useState<string | null>(null)
  // prompts panel hidden from the left rail, remembered on this device
  const [chatHidden, setChatHiddenRaw] = useState(() => {
    try {
      return localStorage.getItem("flam.promptsCollapsed") === "1"
    } catch {
      return false
    }
  })
  const setChatHidden = (v: boolean) => {
    setChatHiddenRaw(v)
    try {
      localStorage.setItem("flam.promptsCollapsed", v ? "1" : "0")
    } catch {
      /* storage unavailable */
    }
  }
  const editFeed = (id: string) => {
    setPanelReq((r) => ({ section: "feeds", n: (r?.n ?? 0) + 1 }))
    // after the section has opened
    setTimeout(() => setFocusFeed((f) => ({ id, n: (f?.n ?? 0) + 1 })), 30)
  }
  const now = useClock(slides.map((s) => (s.startedAt ? s.startedAt + ms : 0)))
  const status = (s: Slide): SlideStatus => (!s.startedAt ? "empty" : now >= s.startedAt + ms ? "done" : "generating")
  const activeSlide = slides.find((s) => s.id === active) ?? slides[0]
  const activeStatus = status(activeSlide)
  const done = activeStatus === "done"
  const mainDone = status(slides[0]) === "done"
  // elements can be edited on a ready video, and on a variation that hasn't been generated yet
  const canEdit = done || (activeStatus === "empty" && mainDone)

  // one set of elements shared by every video: a change on any video applies to all
  const [elements, setShared] = useState<CanvasElement[]>(() =>
    // a template comes with its headline and call to action already placed
    savedSnap
      ? savedSnap.elements
      : generation.sample
      ? [
          { id: crypto.randomUUID(), kind: "text", variant: "subheading", text: generation.remixOf ?? generation.resume?.title ?? "", x: 50, y: 14, align: "center" },
          { id: crypto.randomUUID(), kind: "button", variant: "pill", text: BUTTON_TEXT, x: 50, y: 52, align: "center" },
          // its strip is already there, so opening it doesn't count as a change
          { ...newStrip(2, "horizontal", ratio), id: crypto.randomUUID() },
        ]
      : tpl
      ? [
          { id: crypto.randomUUID(), kind: "text", variant: "heading", text: tpl.headline, x: 50, y: 16, align: "center" },
          { id: crypto.randomUUID(), kind: "button", variant: "pill", text: tpl.cta, x: 50, y: 66, align: "center" },
        ]
      : [],
  )
  // thumbnail strips can't leave the frame, whatever moved or resized them
  const keepStrips = (els: CanvasElement[]) => els.map((e) => (e.kind === "strip" ? clampStrip(e, included.length, ratio) : e))
  const setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>> = (u) =>
    setShared((els) => keepStrips(typeof u === "function" ? u(els) : u))
  // adding or removing variations changes the strip's length
  useEffect(() => {
    setShared(keepStrips)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [included.length, ratio])
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  // the element toolbar is for one element; several selected get the group toolbar
  const selectedEl = selected.length === 1 ? elements.find((e) => e.id === selected[0]) : undefined
  const group = selected.length > 1 ? elements.filter((e) => selected.includes(e.id)) : []
  // one thumbnail picked inside the selected strip (index into the included videos)
  const [thumbSel, setThumbSel] = useState<number | null>(null)
  const stripSelected = selectedEl?.kind === "strip"
  useEffect(() => {
    if (!stripSelected) setThumbSel(null)
  }, [stripSelected])
  const thumbSlide = stripSelected && thumbSel !== null ? included[thumbSel] : undefined
  const pickThumb = (i: number) => {
    setThumbSel(i)
    // and show that video
    if (included[i]) setActive(included[i].id)
  }
  const [thumbPicker, setThumbPicker] = useState(false)
  useEffect(() => {
    if (!thumbSlide) setThumbPicker(false)
  }, [thumbSlide])
  // uploads panel for replacing an image / choosing a button background; tied to one element
  const [pickFor, setPickFor] = useState<string | null>(null)
  useEffect(() => setPickFor((p) => (p === selectedEl?.id ? p : null)), [selectedEl?.id])
  const pickEl = elements.find((e) => e.id === pickFor && e.id === selectedEl?.id)
  const picker: Picker | null =
    thumbPicker && thumbSlide
      ? {
          title: `Thumbnail · ${slideName(thumbSlide, slides.indexOf(thumbSlide))}`,
          selected: thumbSlide.thumb,
          onClose: () => setThumbPicker(false),
          onPick: (src) => patchSlide(thumbSlide.id, { thumb: src }),
        }
      : pickEl && (pickEl.kind === "image" || pickEl.kind === "button")
      ? {
          title: pickEl.kind === "image" ? "Replace image" : pickEl.variant === "icon" ? "Icon image" : "Button background",
          selected: pickEl.kind === "image" ? pickEl.src : pickEl.bgImage,
          onClose: () => setPickFor(null),
          onPick: (src) => {
            if (pickEl.kind === "button") return patch(pickEl.id, { bgImage: src })
            // keep the frame's width; follow the new image's shape when the ratio is locked
            const img = new Image()
            img.onload = () => {
              const ar = img.naturalWidth / img.naturalHeight || 1
              patch(pickEl.id, { src, ar, ...(pickEl.lock ? { h: (pickEl.w * ratio) / ar } : {}) } as Partial<CanvasElement>)
            }
            img.src = src
          },
        }
      : null
  const patch = (id: string, p: Partial<CanvasElement>) =>
    setElements((els) => els.map((x) => (x.id === id ? ({ ...x, ...p } as CanvasElement) : x)))
  const addImage = (src: string) => {
    const img = new Image()
    img.onload = () => {
      const ar = img.naturalWidth / img.naturalHeight || 1
      const w = 40
      add({ kind: "image", src, w, h: (w * ratio) / ar, ar, lock: true, fit: "cover", radius: 0, crop: { t: 0, r: 0, b: 0, l: 0 } })
    }
    img.src = src
  }
  const [uploads, setUploads] = useState<Upload[]>(SAMPLE_UPLOADS)
  const add = (el: DistributiveOmit<CanvasElement, "id" | "x" | "y">) => {
    const id = crypto.randomUUID()
    // stagger new elements slightly so repeated adds don't stack exactly
    const offset = (elements.length % 5) * 4
    setElements((els) => [...els, { ...el, id, x: 50, y: 40 + offset } as CanvasElement])
    setSelected([id])
    // a new button opens its link options right away
    if (el.kind === "button") setFreshButton(id)
  }
  const [freshButton, setFreshButton] = useState<string>()
  // toolbars can be dragged out of the way; the offset sticks for the session
  const [tbOff, setTbOff] = useState({ x: 0, y: 0 })
  const dragToolbar = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const vp = viewport.current!.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, ox: tbOff.x, oy: tbOff.y }
    const move = (ev: PointerEvent) =>
      setTbOff({
        x: Math.max(-vp.width / 2 + 60, Math.min(vp.width / 2 - 60, start.ox + ev.clientX - start.x)),
        y: Math.max(0, Math.min(vp.height - 60, start.oy + ev.clientY - start.y)),
      })
    const up = () => (window.removeEventListener("pointermove", move), window.removeEventListener("pointerup", up))
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }
  const grip = <ToolbarGrip onDragStart={dragToolbar} onReset={() => setTbOff({ x: 0, y: 0 })} />
  // canvas video: autoplays; play/pause from the top bar
  const [videoPlaying, setVideoPlaying] = useState(true)
  // element hovered in the Layers panel
  const [hovered, setHovered] = useState<string | null>(null)
  // only the first toolbar for a new button opens the link options
  useEffect(() => {
    if (!freshButton) return
    const t = setTimeout(() => setFreshButton(undefined), 50)
    return () => clearTimeout(t)
  }, [freshButton])

  // thumbnail strips: one thumbnail per video, this slide's own one highlighted
  // an uploaded thumbnail wins; otherwise a frame from the video once it's ready
  // the strip on the canvas shows uploaded thumbnails only (the bottom strip shows video frames)
  const thumbs = included.map((s) => ({ poster: s.thumb }))
  const activeThumb = included.indexOf(activeSlide)
  const nameOf = (s: Slide) => slideName(s, slides.indexOf(s))
  // this video's value for a feed (edited on the canvas)
  const setFeedValue = (id: string, value: string) =>
    setSlides((l) => l.map((s) => (s.id === activeSlide.id ? { ...s, feeds: { ...s.feeds, [id]: value } } : s)))
  // a feed just linked to an element starts with that element's text wherever it's empty
  const seedFeed = (id: string, text: string) =>
    setSlides((l) => l.map((s) => (s.feeds?.[id]?.trim() ? s : { ...s, feeds: { ...s.feeds, [id]: text } })))
  // a feed removed everywhere: anything that used it keeps what's on screen now (the value for the video in view)
  const deleteFeed = (id: string) => {
                setFeeds((list) => list.filter((f) => f.id !== id))
                // unlink anything that used it, keeping what's on screen now (the value for the video in view)
                const shown = activeSlide.feeds?.[id]?.trim() || undefined
                setElements((els) =>
                  els.map((e) =>
                    e.kind === "text" && e.feed === id
                      ? { ...e, feed: undefined, text: shown ?? e.text }
                      : e.kind === "button" && (e.feed === id || e.linkFeed === id)
                        ? {
                            ...e,
                            ...(e.feed === id && { feed: undefined, text: shown ?? e.text }),
                            ...(e.linkFeed === id && { linkFeed: undefined, link: shown ?? e.link }),
                          }
                        : e,
                  ),
                )
  }
  const renameFeed = (id: string, name: string) => setFeeds((list) => list.map((f) => (f.id === id ? { ...f, name } : f)))
  // which text and buttons use each feed (for the right panel)
  const feedUses: Record<string, { id: string; label: string; kind: "text" | "button" }[]> = {}
  for (const e of elements) {
    if (e.kind !== "text" && e.kind !== "button") continue
    const shown = (e.feed && activeSlide.feeds?.[e.feed]) || e.text || (e.kind === "button" ? "Button" : "Text")
    const label = shown.replace(/\s+/g, " ").trim()
    for (const id of new Set([e.feed, e.kind === "button" ? e.linkFeed : undefined])) {
      if (id) (feedUses[id] ??= []).push({ id: e.id, label, kind: e.kind })
    }
  }
  const feedOf = (id: string) => {
    const f = feeds.find((x) => x.id === id)
    return f && { name: f.name, value: activeSlide.feeds?.[id] ?? "" }
  }
  // the main video gets a strip once it's ready
  // (a sample or a saved canvas already has its strip)
  const stripAdded = useRef(!!generation.sample || !!savedSnap)
  useEffect(() => {
    if (!mainDone || stripAdded.current) return
    stripAdded.current = true
    setShared((els) => [...els, { ...newStrip(included.length, "horizontal", ratio), id: crypto.randomUUID() }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainDone])

  // clicking anywhere other than an element (or its toolbar, popovers and pickers) clears the selection
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      // the eyedropper's click samples a colour; it doesn't deselect
      if (document.body.dataset.picking) return
      if (t.closest?.("[data-el],[role=toolbar],[data-slot=popover-content],[role=menu],[role=dialog],[data-keep-selection]")) return
      setSelected([])
      setEditing(null)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [])

  const setPreviewMode = (on: boolean) => {
    setMode(on ? "preview" : "design")
    setPickFor(null)
    // preview opens on the starting variation
    if (on) (select(start), setSelected([]))
  }
  // switching variations keeps the selected elements selected (they're on every variation); typing stops
  const select = (id: string) => {
    setActive(id)
    setEditing(null)
  }

  // what a generation sends: the typed prompt, or (regenerating without typing) the last one sent
  const sentOf = (s?: Slide) =>
    s?.prompt?.trim() ? { prompt: s.prompt, refs: s.refs ?? [] } : { prompt: s?.used?.prompt ?? "", refs: s?.used?.refs ?? [] }
  // variations step through the reference video's product set
  const nextVideo = useRef(tpl ? slides.length : 1)
  const generate = (id: string) => {
    if (dev.credits < VIDEO_COST) return onGetCredits()
    setDev((d) => ({ credits: d.credits - VIDEO_COST }))
    // each generation shows the next sample video
    const video = inSet(generation.video ?? 0, nextVideo.current++)
    const startedAt = Date.now()
    const s0 = slides.find((s) => s.id === id)
    const sent = sentOf(s0)
    setHistory((h) => [
      ...h,
      { id: crypto.randomUUID(), slideId: id, prompt: sent.prompt, refs: refsOf(sent.refs), fromReference: id !== "main", video, startedAt },
    ])
    // remember what this video was made from, for the full-screen details
    setSlides((list) =>
      list.map((s) =>
        // sent: the prompt box clears, the history keeps it
        s.id === id ? { ...s, video, startedAt, prompt: "", refs: [], used: { prompt: sent.prompt, refs: sent.refs, fromReference: id !== "main" } } : s,
      ),
    )
  }
  // regenerate the reference video and every variation already made from it: the variations
  // queue up and start once the new reference video is ready
  const made = slides.filter((s) => s.id !== "main" && s.startedAt)
  const regenerateAll = () => {
    const cost = VIDEO_COST * (1 + made.length)
    if (dev.credits < cost) return onGetCredits()
    setDev((d) => ({ credits: d.credits - cost }))
    const now = Date.now()
    const items: HistoryItem[] = []
    setSlides(
      slides.map((s) => {
        if (s.id !== "main" && !s.startedAt) return s
        const video = inSet(generation.video ?? 0, nextVideo.current++)
        const startedAt = s.id === "main" ? now : now + ms + 1
        const sent = sentOf(s)
        items.push({ id: crypto.randomUUID(), slideId: s.id, prompt: sent.prompt, refs: refsOf(sent.refs), fromReference: s.id !== "main", video, startedAt, batch: s.id !== "main" })
        return {
          ...s,
          video,
          // variations start right after the reference video, so they're made from the new one
          startedAt,
          prompt: "",
          refs: [],
          used: { prompt: sent.prompt, refs: sent.refs, fromReference: s.id !== "main" },
        }
      }),
    )
    setHistory((h) => [...h, ...items])
  }
  // a variation made before the reference video was last regenerated needs regenerating too
  const stale = (s: Slide) => s.id !== "main" && !!s.startedAt && !!slides[0].startedAt && s.startedAt < slides[0].startedAt && mainDone
  const [confirmRegen, setConfirmRegen] = useState(false)
  // something is generating: the prompt box waits
  // variations can generate side by side; the reference video waits until nothing is generating
  // (they're all made from it), and each video waits for its own generation to finish
  const anyGenerating = slides.some((s) => status(s) === "generating")
  const busyReason =
    activeSlide.id === "main"
      ? anyGenerating
        ? activeStatus === "generating"
          ? "Wait for the reference video to finish"
          : "Wait for the variations to finish"
        : undefined
      : activeStatus === "generating"
        ? "Wait for this variation to finish"
        : !mainDone
          ? "Waiting for the reference video"
          : undefined
  const busy = !!busyReason
  // the very first reference video is still on its way: just the canvas and the prompts
  const hadMain = useRef(false)
  if (mainDone) hadMain.current = true
  const firstRun = !hadMain.current && !mainDone
  const requestGenerate = (id: string) => {
    // the reference video never regenerates under variations that are still being made from it
    if (id === "main" && slides.some((s) => status(s) === "generating")) return
    // regenerating the reference video affects every variation already made from it: ask first
    if (id === "main" && slides.some((s) => s.id !== "main" && s.startedAt)) return setConfirmRegen(true)
    generate(id)
  }
  /* ---------- the chat that plans the Flick (started from Create with the chat on) ---------- */
  const agentMode = !!generation.agent
  const [brand, setBrand] = useState<Brand | undefined>()
  // tools can run before React re-renders: they read the latest slides from here
  const slidesNow = useRef(slides)
  slidesNow.current = slides
  const findSlide = (target: string) => {
    const t = target.trim().toLowerCase()
    const list = slidesNow.current
    if (["reference", "reference video", "main"].includes(t)) return list[0]
    return list.find((x) => slideName(x, list.indexOf(x)).toLowerCase() === t) ?? list.find((x) => t && slideName(x, list.indexOf(x)).toLowerCase().includes(t))
  }
  const keepImage = (src: string, name: string) =>
    setUploads((u) => (u.some((x) => x.src === src) ? u : [{ id: crypto.randomUUID(), name: `${name.slice(0, 40)}.jpg`, src, loading: false }, ...u]))
  /** starts one video now (or right after the reference video), charged and logged like the prompt box does */
  const startVideo = (id: string, prompt: string) => {
    if (dev.credits < VIDEO_COST) return void onGetCredits()
    setDev((d) => ({ credits: d.credits - VIDEO_COST }))
    const now = Date.now()
    const main = slidesNow.current[0]
    const startedAt = id === "main" ? now : main.startedAt && now < main.startedAt + ms ? main.startedAt + ms + 1 : now
    const video = inSet(generation.video ?? 0, nextVideo.current++)
    commitSlides(slidesNow.current.map((x) => (x.id === id ? { ...x, video, startedAt, prompt: "", refs: [], used: { prompt, refs: [], fromReference: id !== "main" } } : x)))
    setHistory((h) => [...h, { id: crypto.randomUUID(), slideId: id, prompt, refs: [], fromReference: id !== "main", video, startedAt, at: now }])
    return true
  }
  // feeds and elements too: several tools can run in one reply
  const feedsNow = useRef(feeds)
  feedsNow.current = feeds
  const elementsNow = useRef(elements)
  elementsNow.current = elements
  const commitFeeds = (next: Feed[]) => ((feedsNow.current = next), setFeeds(next))
  const commitElements = (next: CanvasElement[]) => ((elementsNow.current = next), setElements(next))
  const commitSlides = (next: Slide[]) => ((slidesNow.current = next), setSlides(next))
  const feedByName = (name?: string) => (name ? feedsNow.current.find((f) => f.name.toLowerCase() === name.trim().toLowerCase()) : undefined)
  const nameOfSlide = (x: Slide) => slideName(x, slidesNow.current.indexOf(x))
  /** a field's or a named feed's element and feed (the field wins when both are given) */
  const resolve = (field?: string, feed?: string) => {
    const f = FIELDS.find((x) => x === field || (field === "button" && x === "cta"))
    const fd = f ? feedOfField(elementsNow.current, f) : undefined
    const byName = feedByName(feed)
    return { field: f, feedId: fd ?? byName?.id, el: f ? elementFor(elementsNow.current, f) : undefined }
  }
  /** what each element using a feed is, for the chat */
  const usesOf = (id: string) =>
    elementsNow.current.flatMap((e) =>
      e.kind === "text" && e.feed === id
        ? [e.role ?? "text"]
        : e.kind === "button" && e.feed === id
          ? ["button text"]
          : e.kind === "button" && e.linkFeed === id
            ? ["button link"]
            : [],
    )
  /** empty values the viewer would see, so the chat can fill them */
  const feedIssues = () => {
    const shown = includeRef ? slidesNow.current : slidesNow.current.slice(1)
    const out: string[] = []
    for (const f of feedsNow.current) {
      if (!usesOf(f.id).length) continue
      const empty = shown.filter((x) => !x.feeds?.[f.id]?.trim()).map(nameOfSlide)
      if (empty.length) out.push(`${f.name} is empty on ${empty.join(", ")}`)
    }
    return out
  }
  /** re-spaces the chat's text stack for its longest values, so wrapped lines never overlap */
  const tidy = () => {
    const longest = (e: Extract<CanvasElement, { kind: "text" | "button" }>) =>
      e.feed ? slidesNow.current.map((x) => x.feeds?.[e.feed!] ?? "").reduce((a, b) => (b.length > a.length ? b : a), "") || e.text : e.text
    commitElements(restack(elementsNow.current, longest, ratio))
  }
  const withIssues = (msg: string) => {
    tidy()
    const issues = feedIssues()
    return issues.length ? `${msg} Check: ${issues.join("; ")}.` : msg
  }
  /** sets one feed's values by variation name ("reference" too); unknown names are reported */
  const setValues = (id: string, values: Record<string, string>) => {
    const unknown: string[] = []
    const byId: Record<string, string> = {}
    for (const [k, v] of Object.entries(values)) {
      const sl = findSlide(k)
      if (sl) byId[sl.id] = String(v)
      else unknown.push(k)
    }
    commitSlides(slidesNow.current.map((x) => (byId[x.id] !== undefined ? { ...x, feeds: { ...x.feeds, [id]: byId[x.id] } } : x)))
    return unknown
  }
  /** the element a field needs, added when the design doesn't have it yet (label above, price below the headline) */
  const ensureElement = (f: Field) => {
    const have = elementFor(elementsNow.current, f)
    if (have) return have
    if (f === "link") return undefined
    const head = elementFor(elementsNow.current, "headline")
    const y0 = head?.y ?? 40
    const x = head?.x ?? 50
    const align = head?.align ?? "center"
    const ink = head && head.kind === "text" ? head.color : undefined
    const el: CanvasElement =
      f === "cta"
        ? { id: crypto.randomUUID(), kind: "button", variant: "pill", text: BUTTON_TEXT, x, y: Math.min(80, y0 + 16), align, role: "cta" }
        : {
            id: crypto.randomUUID(),
            kind: "text",
            variant: f === "headline" ? "heading" : f === "label" ? "label" : "subheading",
            text: "",
            x,
            y: f === "label" ? y0 - 7 : f === "headline" ? 20 : y0 + 8,
            align,
            role: f,
            ...(ink ? { color: ink } : {}),
          }
    commitElements([...elementsNow.current, el])
    return el
  }
  /** links a field's element to a feed (made if needed) and fills it; everyone without a value keeps what's shown now */
  const varyField = (f: Field, values: Record<string, string>) => {
    const el = ensureElement(f)
    if (!el) return `Error: There's no button for a link.`
    const current = f === "link" ? (el.kind === "button" ? el.linkFeed : undefined) : el.feed
    let id = current
    if (!id) {
      const meta = FIELD_FEED[f]
      const taken = new Set(feedsNow.current.map((x) => x.name))
      let name = meta.name
      for (let n = 2; taken.has(name); n++) name = `${meta.name}-${n}`
      id = crypto.randomUUID()
      commitFeeds([...feedsNow.current, { id, name, type: meta.type }])
      // the shared text becomes everyone's starting value
      const shared = f === "link" ? (el.kind === "button" ? (el.link ?? "") : "") : el.text
      commitSlides(slidesNow.current.map((x) => ({ ...x, feeds: { ...x.feeds, [id!]: shared } })))
      commitElements(elementsNow.current.map((e) => (e.id === el.id ? ({ ...e, ...(f === "link" ? { linkFeed: id } : { feed: id }) } as CanvasElement) : e)))
    }
    const unknown = setValues(id, values)
    const name = feedsNow.current.find((x) => x.id === id)!.name
    return `${current ? "Updated" : "Made"} the ${f === "cta" ? "button text" : f} different per variation (feed “${name}”).${unknown.length ? ` No variation called ${unknown.join(", ")}.` : ""}`
  }
  const agentApi: EditorApi = {
    state: () => ({
      flick_size: generation.size,
      video_seconds: generation.duration ?? 8,
      credits: dev.credits,
      video_cost: VIDEO_COST,
      title,
      planned: !!slidesNow.current[0].startedAt,
      brand,
      videos: slidesNow.current.map((x, i) => ({
        name: nameOfSlide(x),
        role: i ? "variation" : "reference",
        status: status(x),
        prompt: x.used?.prompt || x.prompt || undefined,
        has_thumbnail: !!x.thumb,
      })),
      // every feed, including ones the user or a template made, with what uses it and each variation's value
      feeds: feedsNow.current.map((f) => ({
        name: f.name,
        type: f.type,
        used_by: usesOf(f.id),
        values: Object.fromEntries(slidesNow.current.map((x) => [nameOfSlide(x), x.feeds?.[f.id] ?? ""])),
      })),
      issues: feedIssues(),
      design: describeDesign(elementsNow.current, (id) => feedsNow.current.find((f) => f.id === id)?.name),
      sample_set: GENERATED_VIDEOS[generation.video]?.set ?? "sunglasses",
    }),
    approvePlan(plan) {
      const vars = plan.variations.filter((v) => v.name?.trim()).slice(0, 5)
      if (vars.length < 2) return "Error: The plan needs at least two variations."
      const cost = VIDEO_COST * (1 + vars.length)
      if (dev.credits < cost) {
        onGetCredits()
        return `Error: This needs ${cost.toLocaleString()} credits and you have ${dev.credits.toLocaleString()}. Get credits, then press Generate all again.`
      }
      setDev((d) => ({ credits: d.credits - cost }))
      const now = Date.now()
      const base = generation.video ?? 0
      const design = { ...(plan.design ?? {}) }
      // a field becomes a feed when variations give it values: label, price and link whenever set;
      // headline, subheading and button text only when they actually differ
      const made: Feed[] = []
      const ids: Partial<Record<Field, string>> = {}
      const valueOf = (v: (typeof vars)[number], f: Field) => v[f]?.trim() || (f === "headline" ? design.headline : f === "subheading" ? design.subheading : f === "cta" ? design.cta : "") || ""
      for (const f of FIELDS) {
        const given = vars.some((v) => v[f]?.trim())
        if (!given) continue
        const vals = vars.map((v) => valueOf(v, f))
        const varies = f === "label" || f === "price" || f === "link" || new Set(vals).size > 1
        if (!varies) {
          if (f === "headline" || f === "subheading" || f === "cta") design[f] = vals[0]
          continue
        }
        const id = crypto.randomUUID()
        made.push({ id, name: FIELD_FEED[f].name, type: FIELD_FEED[f].type })
        ids[f] = id
        if ((f === "headline" || f === "subheading" || f === "cta") && !design[f]) design[f] = vals[0]
      }
      const valuesFor = (v: (typeof vars)[number]) => Object.fromEntries(FIELDS.flatMap((f) => (ids[f] ? [[ids[f]!, valueOf(v, f)]] : [])))
      // the reference video shows the first variation's values, so the design never shows empty {placeholders}
      const main: Slide = { id: "main", prompt: "", refs: [], video: base, startedAt: now, used: { prompt: plan.reference.prompt, refs: generation.refs ?? [], fromReference: false }, feeds: valuesFor(vars[0]) }
      const vs: Slide[] = vars.map((v, i) => ({
        id: crypto.randomUUID(),
        n: i + 1,
        name: v.name.trim(),
        prompt: "",
        refs: [],
        video: inSet(base, i + 1),
        // made from the reference video, so they start once it's ready
        startedAt: now + ms + 1,
        used: { prompt: v.prompt, refs: [], fromReference: true },
        feeds: valuesFor(v),
      }))
      nextN.current = vs.length + 1
      commitSlides([main, ...vs])
      setHistory([main, ...vs].map((x) => ({ id: crypto.randomUUID(), slideId: x.id, prompt: x.used!.prompt, refs: refsOf(x.used!.refs), fromReference: x.id !== "main", video: x.video!, startedAt: x.startedAt!, batch: x.id !== "main", at: now })))
      commitFeeds(made)
      stripAdded.current = true
      const els = buildDesign(design, { ratio, count: vs.length, feeds: ids, brand })
      elementsNow.current = els
      setShared(els)
      setIncludeRef(false)
      setStart(vs[0].id)
      setActive("main")
      setSelected([])
      if (plan.title?.trim()) setTitle(plan.title.trim())
      const per = made.map((f) => f.name)
      return withIssues(`Generating the reference video and ${vs.length} variations (${cost.toLocaleString()} credits); they take about ${dev.generationSeconds * 2} seconds. The design is on the canvas${per.length ? `, with ${per.join(", ")} set per variation (feeds)` : ""}. Thumbnails are empty until set.`)
    },
    updateDesign(d) {
      if (!slidesNow.current[0].startedAt) return "Error: Approve the plan first."
      // text that differs per variation can't be set for everyone here: say so instead of silently not changing
      const skipped: string[] = []
      const rest = { ...d }
      for (const f of ["headline", "subheading", "cta"] as const) {
        if (rest[f] !== undefined && feedOfField(elementsNow.current, f)) {
          skipped.push(f === "cta" ? "button text" : f)
          delete rest[f]
        }
      }
      const { elements: next, changed } = patchDesign(elementsNow.current, rest, brand, { count: included.length, ratio })
      // a headline or button the design doesn't have yet is added
      const extra: CanvasElement[] = []
      if (rest.headline && !elementFor(elementsNow.current, "headline"))
        extra.push({ id: crypto.randomUUID(), kind: "text", variant: "heading", text: rest.headline, x: 50, y: 14, align: "center", role: "headline" }), changed.push("headline")
      if (rest.cta && !elementsNow.current.some((e) => e.kind === "button")) {
        const link = feedByName("link")?.id
        extra.push({ id: crypto.randomUUID(), kind: "button", variant: "pill", text: rest.cta, x: 50, y: 74, align: "center", role: "cta", ...(link ? { linkFeed: link } : {}) }), changed.push("button")
      }
      if (changed.length) (commitElements([...next, ...extra]), tidy())
      const note = skipped.length ? ` The ${skipped.join(" and ")} differ${skipped.length > 1 ? "" : "s"} per variation: set each with vary_field, or use same_for_all.` : ""
      return changed.length ? `Changed the ${changed.join(", ")}.${note}` : `Nothing changed.${note}`
    },
    setBrand: (b) => setBrand((x) => ({ ...x, ...b })),
    setVariation(target, p) {
      const sl = findSlide(target)
      if (!sl) return `Error: No variation called “${target}”.`
      const name = nameOfSlide(sl)
      const parts: string[] = []
      if (p.name?.trim()) {
        commitSlides(slidesNow.current.map((x) => (x.id === sl.id ? { ...x, name: p.name!.trim() } : x)))
        parts.push(`renamed it ${p.name.trim()}`)
      }
      // any on-screen text for just this variation: its feed if there is one, else it becomes one
      for (const f of FIELDS) {
        const v = p[f]
        if (v === undefined) continue
        const id = resolve(f).feedId
        if (id) setValues(id, { [p.name?.trim() || name]: v })
        else varyField(f, { [p.name?.trim() || name]: v })
        parts.push(`set its ${f === "cta" ? "button text" : f}`)
      }
      for (const [feed, v] of Object.entries(p.values ?? {}) as [string, string][]) {
        const f = feedByName(feed)
        if (!f) {
          parts.push(`no feed called ${feed}`)
          continue
        }
        setValues(f.id, { [p.name?.trim() || name]: v })
        parts.push(`set ${f.name}`)
      }
      if (p.regenerate && p.prompt) {
        if (!startVideo(sl.id, p.prompt)) return "Error: Not enough credits to regenerate."
        parts.push("regenerating with the new prompt")
      }
      return withIssues(parts.length ? `${name}: ${parts.join(", ")}.` : `Nothing changed on ${name}.`)
    },
    addVariation(v, gen) {
      if (slidesNow.current.length > MAX_VARIATIONS) return `Error: A Flick has at most ${MAX_VARIATIONS} variations.`
      const id = crypto.randomUUID()
      const n = nextN.current++
      // every feed gets a value: what was given, else the first variation's (said in the result)
      const first = slidesNow.current[1] ?? slidesNow.current[0]
      const values: Record<string, string> = {}
      const copied: string[] = []
      for (const f of feedsNow.current) {
        const field = FIELDS.find((x) => feedOfField(elementsNow.current, x) === f.id)
        const given = (field && v[field]) ?? v.values?.[f.name]
        if (given !== undefined) values[f.id] = given
        else {
          values[f.id] = first.feeds?.[f.id] ?? ""
          copied.push(f.name)
        }
      }
      const sl: Slide = { id, n, name: v.name?.trim() || undefined, prompt: v.prompt ?? "", refs: [], feeds: values }
      commitSlides([...slidesNow.current, sl])
      if (gen && v.prompt && slidesNow.current[0].startedAt) startVideo(id, v.prompt)
      return withIssues(
        `Added ${v.name || `Variation ${n}`}${gen ? " and started its video" : ""}.${copied.length ? ` Copied ${copied.join(", ")} from ${nameOfSlide(first)}; change them with set_variation if they should differ.` : ""}`,
      )
    },
    varyField(field, feed, values) {
      if (!slidesNow.current[0].startedAt) return "Error: Approve the plan first."
      const r = resolve(field, feed)
      if (r.field) return withIssues(varyField(r.field, values))
      if (r.feedId) {
        const unknown = setValues(r.feedId, values)
        return withIssues(`Updated ${feed}.${unknown.length ? ` No variation called ${unknown.join(", ")}.` : ""}`)
      }
      return `Error: Name a field (${FIELDS.join(", ")}) or an existing feed.`
    },
    sameForAll(field, feed, value) {
      const r = resolve(field, feed)
      if (!r.feedId) return `Nothing to do: ${field ?? feed} is already the same everywhere.`
      const id = r.feedId
      const active = slidesNow.current.find((x) => x.id === activeSlide.id) ?? slidesNow.current[1]
      const shown = value ?? active?.feeds?.[id] ?? ""
      // unlink everything that used it, showing one value for all, then drop the feed
      commitElements(
        elementsNow.current.map((e) =>
          e.kind === "text" && e.feed === id
            ? { ...e, feed: undefined, text: shown }
            : e.kind === "button" && (e.feed === id || e.linkFeed === id)
              ? { ...e, ...(e.feed === id && { feed: undefined, text: shown }), ...(e.linkFeed === id && { linkFeed: undefined, link: shown }) }
              : e,
        ),
      )
      const name = feedsNow.current.find((f) => f.id === id)?.name
      commitFeeds(feedsNow.current.filter((f) => f.id !== id))
      tidy()
      return `${name} is now the same on every variation: “${shown}”.`
    },
    renameFeed(from, to) {
      const f = feedByName(from)
      if (!f) return `Error: No feed called ${from}.`
      if (feedByName(to)) return `Error: A feed called ${to} already exists.`
      commitFeeds(feedsNow.current.map((x) => (x.id === f.id ? { ...x, name: to.trim() } : x)))
      return `Renamed the feed ${from} to ${to.trim()}.`
    },
    setThumbnail(target, url) {
      const sl = findSlide(target)
      if (!sl) return `Error: No variation called “${target}”.`
      patchSlide(sl.id, { thumb: url })
      keepImage(url, `${nameOfSlide(sl)} thumbnail`)
      return `Set ${nameOfSlide(sl)}'s thumbnail.`
    },
    addImageToCanvas(url) {
      if (!slidesNow.current[0].startedAt) return "Error: Approve the plan first."
      addImage(url)
      keepImage(url, "image")
      return "Added the image to the canvas."
    },
    sampleSite(url) {
      // the demo "reads" a product page with the sample set's product photos
      const set = GENERATED_VIDEOS[generation.video]?.set ?? "sunglasses"
      const pick = { sunglasses: ["u1", "u2", "u3", "u4", "u5", "u6"], boots: ["u8", "u9", "u10"], dress: ["u11", "u12"] }[set as "sunglasses"] ?? ["u1", "u2", "u3"]
      const imgs = SAMPLE_UPLOADS.filter((u) => pick.includes(u.id))
      const names = imgs.map((u) => u.name.replace(/\.[a-z]+$/, "").replace(/-/g, " "))
      let host = "example.com"
      try {
        host = new URL(/^https?:/.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "")
      } catch {
        /* keep the placeholder */
      }
      return {
        ok: true,
        url,
        site: host,
        title: `${names[0]} | ${host}`,
        description: "Sample product page (demo).",
        price: "$189",
        theme_color: "#09090b",
        products: imgs.map((u, i) => ({ name: names[i], price: `$${179 + i * 10}`, images: [u.src] })),
        images: imgs.map((u) => u.src),
        text: `Demo page for ${host}: ${names.join(", ")}.`,
      }
    },
    sampleImage(purpose, target) {
      const sl = target ? findSlide(target) : undefined
      if (sl?.video !== undefined) return GENERATED_VIDEOS[sl.video % GENERATED_VIDEOS.length].poster
      void purpose
      return GENERATED_VIDEOS[generation.video ?? 0].poster
    },
  }
  const agent = useAgent(agentApi, { prompt: agentMode ? generation.prompt : undefined, imageUrls: agentMode ? (generation.refs ?? []).filter((r) => !r.failed).map((r) => ({ url: r.url, name: r.name })) : [], autoStart: agentMode })
  const live = isLive(useAiConfig())
  // the composer in chat mode: talk to the chat, or write a video's prompt yourself
  const [composeMode, setComposeMode] = useState<"chat" | "prompt">("chat")
  const chatting = agentMode && (composeMode === "chat" || !slides[0].startedAt)
  // planning: nothing generated yet, so no editor tools; just the chat and a live preview
  const planning = agentMode && !slides[0].startedAt
  const samplePosters = [1, 2, 3, 4, 5].map((i) => GENERATED_VIDEOS[inSet(generation.video ?? 0, i)].poster)
  const agentCtx: AgentCtx = {
    videoCost: VIDEO_COST,
    credits: dev.credits,
    addToCanvas: (u) => void agentApi.addImageToCanvas(u),
    focusComposer: () => {
      setComposeMode("chat")
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.focus()
    },
    ratio,
    posters: samplePosters.slice(0, Math.max(2, agent.plan?.variations.length ?? 3)),
    brand,
    progress: () => {
      const vs = slides.slice(1)
      return [
        { label: "Reference video", state: status(slides[0]) === "done" ? "done" : "working" },
        { label: `${vs.length} variations`, state: vs.every((v) => status(v) === "done") ? "done" : mainDone ? "working" : "waiting" },
        { label: "Headline, button and thumbnail strip", state: elements.some((e) => e.kind === "strip") ? "done" : "working" },
        { label: "Thumbnail images", state: vs.every((v) => v.thumb) ? "done" : "working" },
      ]
    },
  }
  // the chat is where a chat project starts, so it's always open at first
  useEffect(() => {
    if (agentMode) setChatHidden(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // what to fix before publishing (blocking) or worth a look (warnings)
  const variationsDone = slides.slice(1).filter((s) => status(s) === "done").length
  const publishIssues: Issue[] = [
    // one plain message, not one per variation
    ...(variationsDone < 2
      ? [{ text: "Create at least two variations to export.", blocking: true }]
      : included.some((s) => status(s) !== "done")
      ? [{ text: "Generate videos for every variation before export.", blocking: true }]
      : []),
    ...(includeRef && !slides[0].thumb ? [{ text: "Add a thumbnail for the reference video to export.", blocking: true }] : []),
    ...included.filter(stale).map((s) => ({ text: `${nameOf(s)} was made from the old reference video` })),
    ...feeds
      .filter((f) => included.some((s) => !s.feeds?.[f.id]?.trim()))
      .map((f) => ({ text: `Feed ${f.name} is empty on some variations` })),
  ]
  // everything viewers see; the name isn't part of it
  const sig = JSON.stringify({ elements, feeds, start, includeRef, slides: slides.map(({ refs, ...s }) => ({ ...s, refs: refs?.map((r) => r.id) })) })
  const snapNow = (): Snap => ({ elements, slides, feeds, start, includeRef })
  // Version history: a checkpoint saves a few seconds after changes settle; exports are marked
  const [versions, setVersions] = useState<Checkpoint<Snap>[]>(() =>
    generation.copy ? [] : ((generation.resume?.versions as Checkpoint<Snap>[] | undefined) ?? []),
  )
  const lastSig = versions.at(-1)?.sig
  useEffect(() => {
    if (sig === lastSig || firstRun) return
    // the first version is saved right away; later ones once editing pauses
    const t = setTimeout(() => setVersions((v) => (v.at(-1)?.sig === sig ? v : [...v, { n: (v.at(-1)?.n ?? 0) + 1, at: Date.now(), sig, snap: snapNow() }])), versions.length ? 4000 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, lastSig, firstRun])
  const currentVersion = [...versions].reverse().find((v) => v.sig === sig)?.n
  const restore = (n: number) => {
    const v = versions.find((x) => x.n === n)
    if (!v) return
    const { snap } = v
    setShared(snap.elements)
    setSlides(snap.slides)
    setFeeds(snap.feeds)
    setStart(snap.start)
    setIncludeRef(snap.includeRef)
    setSelected([])
    setEditing(null)
    if (!snap.slides.some((x) => x.id === active)) setActive("main")
    toast(`Restored ${v.name || `version ${n}`}`)
  }
  const [panel, setPanel] = useState<"history" | "template" | null>(null)

  // the project saves as you work, so it's in Projects with everything as you left it
  const { copy: _copy, resume: _resume, sample: _sample, back: _back, remixOf: _remixOf, ...base } = generation
  const startSlide = slides.find((x) => x.id === start) ?? slides[1] ?? slides[0]
  const poster = startSlide.thumb ?? GENERATED_VIDEOS[startSlide.video ?? generation.video]?.poster ?? GENERATED_VIDEOS[generation.video].poster
  const saveProject = (extra?: { versions?: Checkpoint<Snap>[] }) =>
    library.saveProject({ id: generation.id, name: title, size: generation.size, image: poster, video: generation.video, base, snap: snapNow(), versions: extra?.versions ?? versions, sample: generation.sample })
  const deleted = useRef(false)
  useEffect(() => {
    if (!title || deleted.current) return
    const t = setTimeout(() => saveProject(), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, sig, versions])
  const lib = useLibrary()
  const project = lib.projects.find((p) => p.id === generation.id)
  const lastFlick = project?.exports[0] ? lib.flicks.find((f) => f.id === project.exports[0]) : undefined
  // an export from this project still running in the background
  const exportBusy = lib.flicks.some((f) => f.projectId === generation.id && f.exporting)

  // Export: a new Flick from the canvas as it is now, made in the background; marked in Version history
  const exportFlick = (name: string) => {
    const snap = snapNow()
    const variants = included.map((x) => ({ name: nameOf(x), video: x.video ?? generation.video, poster: x.thumb ?? GENERATED_VIDEOS[x.video ?? generation.video].poster }))
    saveProject()
    const flick = library.exportFlick({ projectId: generation.id, name, size: generation.size, image: poster, video: generation.video, variants, start: Math.max(0, included.findIndex((x) => x.id === start)), snap, base, ms: dev.publishSeconds * 1000 })
    // the latest checkpoint is this exact canvas: mark it; otherwise save a new one
    const exported = { flickId: flick.id, name }
    const next = versions.at(-1)?.sig === sig && !versions.at(-1)?.exported
      ? versions.map((v, i) => (i === versions.length - 1 ? { ...v, at: Date.now(), exported } : v))
      : [...versions, { n: (versions.at(-1)?.n ?? 0) + 1, at: Date.now(), sig, snap, exported }]
    setVersions(next)
    saveProject({ versions: next })
    // to its page, where it prepares in the background
    onOpenFlick(flick.id)
  }
  // onboarding: the tour starts on the first project once its video is ready; one-time tips at tricky moments
  const anyStale = slides.some(stale)
  const ob = useOnboarding()
  useEffect(() => {
    if (!mainDone || ob.toured || ob.tour !== null || ob.spot) return
    const t = setTimeout(() => onboarding.startTour(0), 600)
    return () => clearTimeout(t)
  }, [mainDone, ob.toured, ob.tour, ob.spot])
  // the first text, button or layout added: show how to make it change per variation
  const designed = elements.filter((e) => (e.kind === "text" || (e.kind === "button" && e.variant !== "icon")) && !e.hidden).length
  const designedBefore = useRef(designed)
  useEffect(() => {
    const grew = designed > designedBefore.current
    designedBefore.current = designed
    if (!grew) return
    const t = setTimeout(() => onboarding.tip("feed"), 500)
    return () => clearTimeout(t)
  }, [designed])
  useEffect(() => {
    if (anyStale) onboarding.tip("stale")
  }, [anyStale])
  useEffect(() => {
    if (stripSelected) onboarding.tip("strip")
  }, [stripSelected])
  useEffect(() => {
    if (previewing) onboarding.tip("preview")
  }, [previewing])

  const patchSlide = (id: string, p: Partial<Slide>) => setSlides((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const activeIndex = slides.indexOf(activeSlide)

  // Fit the frame inside the available area at the exact aspect ratio
  useEffect(() => {
    const el = area.current
    if (!el) return
    const fit = () => {
      const { width, height } = el.getBoundingClientRect()
      const w = Math.min(width, height * ratio)
      setBox({ w, h: w / ratio })
    }
    fit()
    fitView()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio])

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="relative flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-4">
        <FileTitle
          title={title}
          naming={naming}
          setTitle={setTitle}
          size={generation.size}
          sizeLabel={sizeInfo?.label}
          duration={generation.duration ?? 8}
          onHome={() => (title && saveProject(), onBack())}
          onDuplicate={() => onDuplicate({ title: `${title} copy`, snap: snapNow() })}
          onSaveTemplate={() => setPanel("template")}
          onHistory={() => setPanel("history")}
          onDelete={() => setConfirmDelete(true)}
        />
        {planning && (
          <div className="pointer-events-none absolute inset-x-0 flex justify-center">
            <div className="pointer-events-auto">
              <PlanSteps step={agent.step} />
            </div>
          </div>
        )}
        <div className={cn("flex shrink-0 items-center gap-2", planning && "hidden")}>
          <VideoToggle playing={videoPlaying} disabled={!done} onToggle={() => setVideoPlaying((p) => !p)} />
          <ModeSwitch mode={mode} onChange={(m) => setPreviewMode(m === "preview")} />
          <ExportControl
            title={title || "Untitled Flick"}
            issues={publishIssues}
            poster={poster}
            count={included.length}
            size={generation.size}
            last={lastFlick && { name: lastFlick.name, at: lastFlick.editedAt }}
            busy={exportBusy}
            onExport={exportFlick}
          />
        </div>
      </header>

      <PromptSpotlight />
      {/* file menu: Save as template */}
      <Dialog open={panel === "template"} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="sm:max-w-md" data-keep-selection>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
          </DialogHeader>
          <TemplateSection
            title={title}
            thumbs={slides.filter((x) => x.video !== undefined && x.startedAt).map((x) => x.thumb ?? GENERATED_VIDEOS[x.video!].poster)}
            onSave={(d) => {
              setPanel(null)
              const variants = included.map((x, i) => ({ label: nameOf(x), color: ["#f59e0b", "#71717a", "#0ea5e9", "#22c55e", "#ef4444", "#a855f7"][i % 6] }))
              onSaveTemplate({
                id: crypto.randomUUID(),
                title: d.name,
                description: d.description,
                mechanic: "Variants",
                industry: "Your templates",
                size: generation.size,
                sizes: [generation.size],
                brand: "",
                headline: "",
                cta: "",
                icon: generation.template?.icon ?? (TEMPLATES[0].icon as Template["icon"]),
                bg: ["#3f3f46", "#a1a1aa"],
                variants,
                prompt: slides[0].used?.prompt || generation.prompt,
                image: d.thumb,
                saved: snapNow(),
              })
              toast({ title: `“${d.name}” saved to templates`, description: "Find it in Your templates on Create.", action: { label: "View templates", onClick: onHomeTemplates } })
            }}
          />
        </DialogContent>
      </Dialog>
      {/* file menu: Version history */}
      {panel === "history" && (
        <VersionHistoryPanel
          versions={versions}
          current={currentVersion}
          onRestore={restore}
          onRename={(n, name) => setVersions((v) => v.map((x) => (x.n === n ? { ...x, name: name || undefined } : x)))}
          onOpenFlick={(id) => (saveProject(), onOpenFlick(id))}
          onClose={() => setPanel(null)}
        />
      )}

      {/* delete */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm" data-keep-selection>
          <DialogHeader>
            <DialogTitle>Delete “{title}”?</DialogTitle>
            <DialogDescription>
              {project?.exports.length ? "Flicks exported from this project will not be deleted. " : ""}This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <PendingButton variant="destructive" onClick={() => (setConfirmDelete(false), (deleted.current = true), library.deleteProject(generation.id), onBack(), toast("Project deleted"))}>
              Delete
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {planning && (
        <PlanningView
          agent={agent}
          ctx={agentCtx}
          design={agent.plan?.design ?? agent.draft}
          names={agent.plan?.variations.map((v) => v.name) ?? []}
          values={agent.plan?.variations ?? []}
        />
      )}
      <div className={cn("flex min-h-0 flex-1", planning && "hidden")}>
        {!previewing && (
        <EditorPanel
          feedsTitle={<FeedsTitle feeds={feeds} openId={feedOpen} onOpen={setFeedOpen} onRename={(id, name) => setFeeds((list) => list.map((f) => (f.id === id ? { ...f, name } : f)))} />}
          disabled={!canEdit}
          uploads={uploads}
          setUploads={setUploads}
          picker={picker}
          layers={{ elements, setElements, selected, setSelected: (ids) => (setEditing(null), setSelected(ids)), onHover: setHovered }}
          request={panelReq}
          feeds={
            <FeedsPanel
              openId={feedOpen}
              onOpen={setFeedOpen}
              activeFeed={selectedEl && (selectedEl.kind === "text" || selectedEl.kind === "button") ? (selectedEl.feed ?? (selectedEl.kind === "button" ? selectedEl.linkFeed : undefined)) : undefined}
              feeds={feeds}
              videos={included.map((v) => ({
                id: v.id,
                name: nameOf(v),
                poster: v.video !== undefined && status(v) === "done" ? GENERATED_VIDEOS[v.video].poster : undefined,
                values: v.feeds ?? {},
              }))}
              activeId={activeSlide.id}
              onValue={(videoId, feedId, value) => setSlides((l) => l.map((x) => (x.id === videoId ? { ...x, feeds: { ...x.feeds, [feedId]: value } } : x)))}
              onSelectVideo={setActive}
              onAdd={addFeed}
              onRename={(id, name) => setFeeds((list) => list.map((f) => (f.id === id ? { ...f, name } : f)))}
              onDelete={deleteFeed}
              usedBy={feedUses}
              onSelectElements={(ids) => (setEditing(null), setSelected(ids))}
              focus={focusFeed}
            />
          }
          onAddText={(variant) => add({ kind: "text", variant, text: TEXT_STYLES.find((t) => t.variant === variant)!.sample })}
          onAddButton={(variant) => add(variant === "icon" ? { kind: "button", variant, text: "", bgImage: DEFAULT_ICON, bgFit: "cover" } : { kind: "button", variant, text: BUTTON_TEXT })}
          onAddImage={addImage}
          onAddLayout={(els) => (setElements((e) => [...e, ...els]), setSelected(els.map((e) => e.id)))}
        />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
        {/* Canvas */}
        <div ref={viewport} className="relative min-h-0 flex-1 touch-none overflow-hidden bg-muted/40 px-6 pb-6 pt-16 md:px-10 md:pb-10 md:pt-[72px]">
          {canEdit && !previewing && group.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3" style={{ transform: `translate(${tbOff.x}px, ${tbOff.y}px)` }}>
              <div
                role="toolbar"
                aria-label="Selection options"
                className="pointer-events-auto flex items-center gap-0.5 rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {grip}
                <span className="px-2.5 text-sm tabular-nums text-muted-foreground">{group.length} selected</span>
                <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Duplicate"
                      className="size-8 rounded-lg"
                      onClick={() => {
                        const copies = group.filter((e) => e.kind !== "strip").map((e) => ({ ...e, id: crypto.randomUUID(), x: Math.min(100, e.x + 3), y: Math.min(100, e.y + 3) }) as CanvasElement)
                        setElements((els) => [...els, ...copies])
                        setSelected(copies.map((c) => c.id))
                      }}
                    >
                      <HugeiconsIcon icon={Copy01Icon} className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicate</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      className="size-8 rounded-lg"
                      onClick={() => (setElements((els) => els.filter((x) => !selected.includes(x.id) || x.kind === "strip")), setSelected([]))}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
          {canEdit && !previewing && selectedEl && editing !== selectedEl.id && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3 *:pointer-events-auto" style={{ transform: `translate(${tbOff.x}px, ${tbOff.y}px)` }}>
              <ElementToolbar
                grip={grip}
                thumb={
                  thumbSlide && {
                    name: slideName(thumbSlide, slides.indexOf(thumbSlide)),
                    src: thumbSlide.thumb,
                    onChoose: () => setThumbPicker(true),
                    onRemove: () => patchSlide(thumbSlide.id, { thumb: undefined }),
                  }
                }
                key={selectedEl.id}
                el={selectedEl}
                uploads={uploads}
                onChange={(p) => patch(selectedEl.id, p)}
                onDuplicate={() => {
                  const id = crypto.randomUUID()
                  setElements((els) => [...els, { ...selectedEl, id, x: Math.min(100, selectedEl.x + 3), y: Math.min(100, selectedEl.y + 3) } as CanvasElement])
                  setSelected([id])
                }}
                onPickImage={() => setPickFor(selectedEl.id)}
                strip={{ count: included.length, ratio }}
                feeds={feeds}
                onAddFeed={addFeed}
                onEditFeed={editFeed}
                onLinkFeed={seedFeed}
                feedValue={(id) => activeSlide.feeds?.[id]}
                onFeedValue={setFeedValue}
                openLink={freshButton === selectedEl.id}
                onEditText={() => setEditing(selectedEl.id)}
                onDelete={() => (setElements((els) => els.filter((x) => x.id !== selectedEl.id)), setSelected([]))}
              />
            </div>
          )}
          {/* prompts hidden: a labelled button at the canvas's right edge brings them back */}
          {chatHidden && !previewing && (
            <Button
              data-no-pan
              variant="outline"
              size="sm"
              onClick={() => setChatHidden(false)}
              className="absolute right-3 top-3 z-20 gap-1.5 rounded-xl bg-popover shadow-sm"
            >
              <HugeiconsIcon icon={BubbleChatIcon} className="size-4" />
              Prompts
              {slides.some((s) => status(s) === "generating") && <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin text-primary" />}
            </Button>
          )}
          {/* zoom: collapsed to the percentage; opens on hover and while zooming */}
          <div
            data-no-pan
            className="group/zoom absolute bottom-3 right-3 z-20 flex items-center rounded-xl bg-popover p-1 text-popover-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <Reveal open={zooming}>
              <ZoomTool label="Zoom out" disabled={view.s <= MIN_ZOOM} onClick={() => zoomTo(view.s / 1.25)}>
                <HugeiconsIcon icon={MinusSignIcon} className="size-3.5" />
              </ZoomTool>
            </Reveal>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Fit to screen" onClick={fitView} className="h-7 min-w-12 rounded-lg px-1.5 text-xs tabular-nums">
                  {zoomPct}%
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom · tap to fit</TooltipContent>
            </Tooltip>
            <Reveal open={zooming}>
              <ZoomTool label="Zoom in" disabled={view.s >= MAX_ZOOM} onClick={() => zoomTo(view.s * 1.25)}>
                <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
              </ZoomTool>
              <span aria-hidden className="mx-1 h-4 w-px bg-border" />
              <ZoomTool label="Actual size (100%)" onClick={() => zoomTo(actualScale)}>
                <span className="text-[11px] font-medium tabular-nums">1:1</span>
              </ZoomTool>
            </Reveal>
          </div>
          <div ref={area} className="flex h-full w-full items-center justify-center">
            <div
              role="status"
              data-frame
              data-tour="frame"
              aria-live="polite"
              aria-label={done ? "Video ready" : "Generating video"}
              className="generating-frame relative shadow-[0_24px_60px_-24px_color-mix(in_oklch,var(--shadow-ink)_35%,transparent)] ring-1 ring-foreground/10"
              style={{ width: box.w * view.s, height: box.h * view.s, containerType: "size", transform: `translate(${view.x}px, ${view.y}px)`, flexShrink: 0 }}
            >
              {agentMode && !slides[0].startedAt ? (
                // the chat is still planning: nothing generated yet
                <div className="absolute inset-0 grid place-items-center overflow-hidden bg-muted">
                  <div aria-hidden className="generating-gradient absolute inset-[-50%] opacity-30" />
                  <div className="relative flex max-w-[75%] flex-col items-center gap-2 text-center">
                    <HugeiconsIcon icon={SparklesIcon} className="size-5 text-primary" />
                    <p className="text-sm font-medium">Planning your Flick</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">Answer a few questions in the chat. Your videos and design show up here once you approve the plan.</p>
                  </div>
                </div>
              ) : done ? (
                <>
                  {/* made from an older reference video: faded, and flagged above the frame */}
                  {stale(activeSlide) && (
                    <button
                      type="button"
                      data-keep-selection
                      onClick={() => {
                        // write its prompt: open the prompts and spotlight the box
                        setChatHidden(false)
                        focusPromptBox(`Regenerate ${nameOf(activeSlide)} here`)
                      }}
                      className="absolute bottom-full right-0 z-30 mb-2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-background/85 py-1 pl-2 pr-2.5 text-xs font-medium shadow-sm ring-1 ring-foreground/10 backdrop-blur-md outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span aria-hidden className="size-2 rounded-full bg-red-500" />
                      Needs regenerating
                    </button>
                  )}
                  {/* media is clipped to the frame; the element layer is not, so toolbars can sit above the frame edge */}
                  <div className={cn("absolute inset-0 overflow-hidden transition-opacity", stale(activeSlide) && "opacity-40")}>
                    <GeneratedVideo
                      key={activeSlide.id}
                      index={activeSlide.video!}
                      playing={videoPlaying}
                    />
                  </div>
                  <CanvasStage elements={elements} setElements={setElements} selected={selected} setSelected={setSelected} editing={editing} setEditing={setEditing} ratio={ratio} thumbs={thumbs} activeThumb={activeThumb} feedOf={feedOf} onEditFeed={editFeed} onFeedValue={setFeedValue} feeds={feeds} onAddFeed={addFeed} onSeedFeed={seedFeed} onRenameFeed={renameFeed} onDeleteFeed={deleteFeed} hovered={hovered} selectedThumb={thumbSel} onSelectThumb={pickThumb} readOnly={previewing} onThumb={(n) => included[n] && select(included[n].id)} />
                </>
              ) : activeStatus === "empty" ? (
                <>
                  {/* not generated yet: a tip just above the frame's top-right corner; clicking it goes to the prompt box */}
                  <button
                    type="button"
                    data-keep-selection
                    onClick={() => {
                      setChatHidden(false)
                      focusPromptBox(`Describe ${nameOf(activeSlide)} here`)
                    }}
                    className="absolute bottom-full right-0 z-30 mb-2 flex items-center gap-1 whitespace-nowrap rounded-full bg-background/85 py-0.5 pl-1.5 pr-2 text-[11px] font-medium shadow-sm ring-1 ring-foreground/10 backdrop-blur-md outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <HugeiconsIcon icon={SparklesIcon} className="size-3 text-primary" />
                    Generate this variation
                  </button>
                  {/* not generated yet: the reference video, faded, under this variation's elements */}
                  <div className="absolute inset-0 overflow-hidden bg-muted">
                    <img src={GENERATED_VIDEOS[slides[0].video!].poster} alt="" className="absolute inset-0 size-full object-cover opacity-25 blur-[2px]" />
                  </div>
                  <CanvasStage elements={elements} setElements={setElements} selected={selected} setSelected={setSelected} editing={editing} setEditing={setEditing} ratio={ratio} thumbs={thumbs} activeThumb={activeThumb} feedOf={feedOf} onEditFeed={editFeed} onFeedValue={setFeedValue} feeds={feeds} onAddFeed={addFeed} onSeedFeed={seedFeed} onRenameFeed={renameFeed} onDeleteFeed={deleteFeed} hovered={hovered} selectedThumb={thumbSel} onSelectThumb={pickThumb} readOnly={previewing} onThumb={(n) => included[n] && select(included[n].id)} />
                </>
              ) : (
                <>
                  <div className="absolute inset-0 overflow-hidden">
                    <div aria-hidden className="generating-gradient absolute inset-[-50%]" />
                    <div aria-hidden className="generating-sweep absolute inset-0" />
                  </div>
                  {/* the elements stay visible (not editable) while the video generates */}
                  <div className="pointer-events-none absolute inset-0">
                    <CanvasStage elements={elements} setElements={setElements} selected={[]} setSelected={() => {}} editing={null} setEditing={() => {}} ratio={ratio} thumbs={thumbs} activeThumb={activeThumb} feedOf={feedOf} readOnly />
                  </div>
                  {/* status just above the frame's top-right corner, off the design */}
                  <div className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 flex whitespace-nowrap items-center gap-1.5 rounded-full bg-background/85 py-1 pl-2 pr-2.5 text-xs font-medium shadow-sm ring-1 ring-foreground/10 backdrop-blur-md">
                    <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin text-primary" />
                    Generating
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {!previewing && !firstRun && (
        <SlidesStrip
          slides={slides}
          active={active}
          ratio={ratio}
          status={status}
          locked={!mainDone}
          onSelect={(id) => {
            select(id)
            // picking a video in the strip brings back the prompts for it
            if (chatHidden) setChatHidden(false)
          }}
          onAdd={() => {
            const id = crypto.randomUUID()
            // a new number every time: removing Variation 3 never turns Variation 4 into 3
            const n = nextN.current++
            setSlides((l) => [...l, { id, n }])
            select(id)
            // straight to writing its prompt
            setChatHidden(false)
            focusPromptBox(`Describe Variation ${n} here`)
          }}
          onRemove={setConfirmRemove}
          start={start}
          onPreview={setPreview}
          stale={stale}
          onRename={(id, name) => patchSlide(id, { name: name || undefined })}
          includeRef={includeRef}
          onIncludeRef={(on) => {
            setIncludeRef(on)
            if (!on && start === "main") setStart(slides[1].id)
          }}
          onSetStart={setStart}
        />
        )}

        <VideoLightbox
          slides={slides.filter((s) => status(s) === "done")}
          current={preview}
          onChange={setPreview}
          nameOf={nameOf}
          size={generation.size}
          ratio={ratio}
          referencePoster={GENERATED_VIDEOS[slides[0].video!].poster}
        />

        {/* regenerating the reference video: variations will need regenerating too */}
        <Dialog open={confirmRegen} onOpenChange={setConfirmRegen}>
          <DialogContent className="sm:max-w-sm" data-keep-selection>
            <DialogHeader>
              <DialogTitle>Regenerate reference video?</DialogTitle>
              <DialogDescription>
                {made.length === 1 ? "Your variation was made from this video. Regenerate it too so it matches." : `Your ${made.length} variations were made from this video. Regenerate them too so they match.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:flex-col sm:items-stretch">
              <Button onClick={() => (setConfirmRegen(false), generate("main"))} className="justify-between">
                Reference video only
                <span className="opacity-80">{VIDEO_COST}</span>
              </Button>
              <Button variant="secondary" onClick={() => (setConfirmRegen(false), regenerateAll())} className="justify-between">
                Reference and {made.length === 1 ? "variation" : `${made.length} variations`}
                <span className="text-muted-foreground">{VIDEO_COST * (1 + made.length)}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* confirm before deleting a variation */}
        <Dialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
          <DialogContent className="sm:max-w-sm" data-keep-selection>
            <DialogHeader>
              <DialogTitle>Delete {nameOf(slides.find((s) => s.id === confirmRemove) ?? slides[1])}?</DialogTitle>
              <DialogDescription>Its video and prompt will be removed. This can’t be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRemove(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const id = confirmRemove!
                  setSlides((l) => l.filter((s) => s.id !== id))
                  if (active === id) select("main")
                  // the start moves to the first remaining variation
                  if (start === id) setStart(slides.find((s) => s.id !== "main" && s.id !== id)!.id)
                  setConfirmRemove(null)
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>

        {/* prompts and generation history, as a chat, on the right of the canvas */}
        {!previewing && (
          <PromptChat
            history={history}
            nameOf={(id) => {
              const s = slides.find((x) => x.id === id)
              return s && nameOf(s)
            }}
            posterOf={(v) => GENERATED_VIDEOS[v % GENERATED_VIDEOS.length].poster}
            isGenerating={(h) => {
              const s = slides.find((x) => x.id === h.slideId)
              return !!s && s.startedAt === h.startedAt && status(s) === "generating"
            }}
            isCurrent={(h) => slides.find((x) => x.id === h.slideId)?.startedAt === h.startedAt}
            onSelect={select}
            target={{ id: activeSlide.id, name: nameOf(activeSlide), poster: activeStatus === "done" ? GENERATED_VIDEOS[activeSlide.video!].poster : undefined, isReference: activeIndex === 0 }}
            busy={chatting ? false : busy}
            collapsed={chatHidden}
            onCollapse={() => setChatHidden(true)}
            {...(agentMode && {
              title: "Chat",
              badge: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", live ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>{live ? "Claude" : "Demo"}</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{live ? "Live: Claude plans and designs, Higgsfield makes images" : "Scripted demo. Connect AI in dev tools for live Claude and Higgsfield."}</TooltipContent>
                </Tooltip>
              ),
              extra: agent.items.map((it) => ({
                key: it.id,
                at: it.at,
                node: <AgentItemView item={it} agent={agent} ctx={agentCtx} />,
              })),
              // once the plan is made, the box can also write one video's prompt directly
              head: slides[0].startedAt ? (
                <div className="flex items-center gap-2 px-1 pb-2 text-xs text-muted-foreground">
                  <div role="tablist" aria-label="Write to" className="flex rounded-lg bg-foreground/5 p-0.5">
                    {(["chat", "prompt"] as const).map((m) => (
                      <button
                        key={m}
                        role="tab"
                        aria-selected={composeMode === m}
                        onClick={() => setComposeMode(m)}
                        className={cn("rounded-md px-2 py-0.5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", composeMode === m ? "bg-background text-foreground shadow-xs" : "hover:text-foreground")}
                      >
                        {m === "chat" ? "Chat" : "Prompt a video"}
                      </button>
                    ))}
                  </div>
                  {composeMode === "prompt" && <TargetChip name={nameOf(activeSlide)} poster={activeStatus === "done" ? GENERATED_VIDEOS[activeSlide.video!].poster : undefined} />}
                </div>
              ) : (
                <div />
              ),
            })}
            composer={
              chatting ? (
                <AgentComposer agent={agent} placeholder={agent.waiting ? "Pick an answer above, or type your own" : slides[0].startedAt ? "Ask for a change: a headline, a colour, another variation" : undefined} />
              ) : // a template's reference video is fixed, so it has no prompt
              fixedRef && activeIndex === 0 ? (
                <p className="rounded-2xl bg-background p-3 text-sm text-muted-foreground ring-1 ring-foreground/5">The reference video comes with this template. Pick a variation to write its prompt.</p>
              ) : (
                <SlidePrompt
              key={activeSlide.id}
              label={nameOf(activeSlide)}
              status={activeStatus}
              prompt={activeSlide.prompt ?? ""}
              refs={activeSlide.refs ?? []}
              setPrompt={(prompt) => patchSlide(activeSlide.id, { prompt })}
              setRefs={(fn) => setSlides((list) => list.map((s) => (s.id === activeSlide.id ? { ...s, refs: fn(s.refs ?? []) } : s)))}
              fixedRef={activeIndex === 0 ? undefined : { url: GENERATED_VIDEOS[slides[0].video!].poster, name: nameOf(slides[0]) }}
              disabled={busyReason}
              onGenerate={() => requestGenerate(activeSlide.id)}
              onOpenFixed={status(slides[0]) === "done" ? () => setPreview("main") : undefined}
              cost={VIDEO_COST}
            />
              )
            }
          />
        )}
      </div>
    </div>
  )
}

/** Current time, refreshed when the next generation deadline passes. */
/** Folds its children away; shown when `open` or while the zoom control is hovered. */
function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-columns,opacity] duration-200 ease-out",
        open ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0 group-hover/zoom:grid-cols-[1fr] group-hover/zoom:opacity-100 group-has-[:focus-visible]/zoom:grid-cols-[1fr] group-has-[:focus-visible]/zoom:opacity-100",
      )}
    >
      <div className="flex items-center gap-0.5 overflow-hidden">{children}</div>
    </div>
  )
}

function ZoomTool({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick} className="size-7 shrink-0 rounded-lg">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** short stamp for names: "Oct 8 20:42" */
function stamp(d = new Date()) {
  const month = d.toLocaleString("en-US", { month: "short" })
  return `${month} ${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const SKIP = new Set(
  "a an the and or of in on at to for with from by into onto across through over under near is are be as it its this that slow fast quick push-in push pull-out pan zoom tilt dolly orbit close-up closeup wide shot shots camera cinematic video scene footage featuring showing shows".split(" "),
)
/** What an existing Flick's two variations were made from. */
const VARIATION_PROMPTS = ["Same scene, the second colourway", "Same scene, the third colourway, warmer light"]

/** Stands in for the AI naming step: the first few meaningful words of the prompt, title-cased. */
function titleFromPrompt(prompt: string) {
  const words = prompt
    .split(/[,.;:\n]/)[0]
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((w) => w && !SKIP.has(w.toLowerCase()))
    .slice(0, 3)
  const name = words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ")
  return name || "Untitled Flick"
}

function useClock(deadlines: number[]) {
  const [now, setNowState] = useState(() => Date.now())
  const next = Math.min(...deadlines.filter((d) => d > now), Infinity)
  useEffect(() => {
    if (next === Infinity) return
    const id = setTimeout(() => setNowState(Date.now()), Math.max(0, next - Date.now()) + 20)
    return () => clearTimeout(id)
  }, [next])
  return now
}
