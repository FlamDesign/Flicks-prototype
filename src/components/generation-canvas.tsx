import { Spinner } from "@/components/ui/spinner"
import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Delete02Icon, MinusSignIcon, PlusSignIcon, SparklesIcon, BubbleChatIcon } from "@hugeicons/core-free-icons"
import { useCanvasView, MIN_ZOOM, MAX_ZOOM } from "@/components/editor/use-canvas-view"
import { videoCost } from "@/components/credits-card"
import type { Reference } from "@/components/prompt-composer"
import type { TemplateRef } from "@/data"
import { MAX_VARIATIONS, SlidesStrip, slideName, type Slide, type SlideStatus } from "@/components/editor/slides-strip"
import { focusPromptBox, PromptChat, refsOf, type HistoryItem } from "@/components/editor/prompt-chat"
import { FeedsPanel, FeedsTitle } from "@/components/editor/feeds-panel"
import { VideoLightbox } from "@/components/editor/video-lightbox"
import { ExportControl } from "@/components/editor/export-flick"
import { VersionHistoryPanel } from "@/components/editor/version-history"
import type { Issue } from "@/components/flick-sections"
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
import { useAgent, type EditorApi, type ElementSpec } from "@/ai/agent"
import { boxOf, buildDesign, color as colorOf, contrast, describeDesign, elementFor, fontName, freeY, headlineLimit, feedOfField, FIELD_FEED, FIELDS, patchDesign, restack, type Brand, type Field } from "@/ai/design"
import { cancelJob, generateVideo, isLive, posterOf, shareable, useAiConfig, videoAspectOf, type VideoInput } from "@/ai/client"
import { isTyping } from "@/lib/keys"
import { GeneratingGradient } from "@/components/editor/generation-progress"
import { AgentComposer, ApprovalDock, isDocked, QuestionDeck, QuickReplies, threadGroups, type AgentCtx } from "@/components/editor/agent-chat"
import { PlanningView, PlanSteps } from "@/components/editor/planning-view"
import { renderFlickShot } from "@/components/editor/flick-shot"
import { addMadeVideo, canRotate, SHAPES, SHAPE_GREY, isBox, isMadeVideo, MISSING_POSTER, BUTTON_STYLES, BUTTON_TEXT, DEFAULT_ICON, defaultFill, defaultInk, SAMPLE_UPLOADS, inSet, clampStrip, fitStrip, newStrip, type Feed, TEXT_STYLES, type CanvasElement, type Upload, videoAt, wrapVideo } from "@/components/editor/elements"

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
  /** started from a template with Use as reference: what the chat is told about it */
  fromTemplate?: TemplateRef
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
  /** started from a recipe on Create: which one, and its choices (the chat follows that recipe) */
  recipe?: { id: string; frame?: "start" | "end" }
}
type Snap = { elements: CanvasElement[]; slides: Slide[]; feeds: Feed[]; start: string; includeRef: boolean }
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** Canvas shown right after Generate: a frame at the chosen size with a live generating state. */
export function GenerationCanvas({
  generation,
  onBack,
  onGetCredits,
  onOpenFlick,
  onDuplicate,
  onFormat,
}: {
  generation: Generation
  /** the chat set where it runs: the Flick's size (and length) */
  onFormat?: (size: string, duration?: number) => void
  onBack: () => void
  onGetCredits: () => void
  /** open a Flick this project exported (from Version history) */
  onOpenFlick: (flickId: string) => void
  /** adds a template saved from this project */
  /** home, scrolled to the templates */
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
  const savedSnap = (generation.copy?.snap ?? generation.resume?.snap) as Snap | undefined
  const [slides, setSlides] = useState<Slide[]>(() => {
    const main: Slide = {
      id: "main",
      // the prompt box starts empty: what was sent lives in the history (and in `used`)
      prompt: "",
      refs: [],
      video: generation.video,
      // the reference video waits for the chat's storyboard (from Assets it's the user's video, already made)
      startedAt: generation.fromAsset ? generation.startedAt : undefined,
      used: { prompt: generation.prompt, refs: generation.refs ?? [], fromReference: false },
    }
    // reopened: finished videos count as made long ago; a real video still being made keeps going
    if (savedSnap) {
      const going = (x: Slide) => !!x.job?.id || x.job?.status === "waiting"
      // started but closed before the server took it (no job id): nothing was charged, so it starts again
      const lost = (x: Slide) => !!generation.agent && !!x.job && !going(x) && !isMadeVideo(x.video) && !!x.used?.prompt
      return savedSnap.slides.map((x, i) => (lost(x) ? { ...x, n: x.n ?? (i || undefined), job: undefined, startedAt: Date.now() } : { ...x, n: x.n ?? (i || undefined), job: going(x) ? x.job : undefined, startedAt: x.startedAt ? (going(x) ? x.startedAt : 1) : undefined }))
    }
    // a sample project: the reference video and two variations, all made long ago (startedAt 1)
    if (generation.sample)
      return [
        { ...main, startedAt: 1 },
        ...[1, 2].map((n) => ({ id: crypto.randomUUID(), n, prompt: "", refs: [], video: inSet(generation.video, n), startedAt: 1, used: { prompt: VARIATION_PROMPTS[n - 1], refs: [], fromReference: true } })),
      ]
    return [main, { id: crypto.randomUUID(), n: 1 }, { id: crypto.randomUUID(), n: 2 }]
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
  // a new project is "Untitled project" until the chat names it (with the storyboard)
  const [title, setTitle] = useState(() => generation.copy?.title ?? generation.resume?.title ?? "")
  useEffect(() => void (document.title = `${title || "Untitled project"} · Flicks`), [title])
  // Preview hides every panel and plays the Flick on the canvas as viewers get it
  const [mode, setMode] = useState<"design" | "preview">("design")
  const previewing = mode === "preview"
  const toast = useToast()
  // a fresh duplicate says so once it opens
  const announced = useRef(false)
  useEffect(() => {
    if (announced.current) return
    if (generation.fromAsset) {
      announced.current = true
      return void toast({ title: "New project created", description: "Your video is Variation 1. Add more variations next; they\u2019re made from it." })
    }
    if (generation.remixOf) {
      announced.current = true
      return void toast({ title: "Remix created", description: `A new project from “${generation.remixOf}”. The Flick does not change.` })
    }
    if (!generation.copy) return
    announced.current = true
    toast({ title: `“${generation.copy.title}” added to Projects`, description: "You’re editing the copy now." })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [preview, setPreview] = useState<string | null>(null)
  // the reference video is only shown to viewers when included as a variation
  // the reference video is always Variation 1: in the Flick like the others
  const includeRef = true
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
  const status = (s: Slide): SlideStatus => (!s.startedAt ? "empty" : s.job ? "generating" : now >= s.startedAt + ms ? "done" : "generating")
  const activeSlide = slides.find((s) => s.id === active) ?? slides[0]
  const activeStatus = status(activeSlide)
  const done = activeStatus === "done"
  const mainDone = status(slides[0]) === "done"
  // elements can be edited on a ready video, and on a variation that hasn't been generated yet
  // the design can be edited while its video generates, too (the generating background sits under it)
  const canEdit = done || activeStatus === "generating" || (activeStatus === "empty" && mainDone)

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
  // editor keys (outside text boxes): [ and ] step through the variations, P toggles preview,
  // ⌘\ shows or hides the prompts panel
  const keysRef = useRef({ included, active, selected, previewing, chatHidden })
  keysRef.current = { included, active, selected, previewing, chatHidden }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (isTyping(e) || e.altKey) return
      const k = keysRef.current
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") return void (e.preventDefault(), setChatHidden(!k.chatHidden))
      if (e.metaKey || e.ctrlKey) return
      const i = k.included.findIndex((x) => x.id === k.active)
      if (e.key === "]" || e.key === "[") {
        const next = k.included[(i + (e.key === "]" ? 1 : -1) + k.included.length) % k.included.length]
        if (next) (e.preventDefault(), setActive(next.id))
      } else if (e.key.toLowerCase() === "p" && !k.selected.length) (e.preventDefault(), setMode(k.previewing ? "design" : "preview"))
    }
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
      : pickEl && pickEl.kind === "shape"
      ? {
          title: "Shape image",
          selected: pickEl.fillImage,
          onClose: () => setPickFor(null),
          onPick: (src) => patch(pickEl.id, { fillImage: src } as Partial<CanvasElement>),
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
      // the eyedropper's click samples a color; it doesn't deselect
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

  // variations step through the sample video set (sample videos only)
  const nextVideo = useRef(1)
  // a variation made before the reference video was last regenerated needs regenerating too
  const stale = (s: Slide) => s.id !== "main" && !!s.startedAt && !!slides[0].startedAt && s.startedAt < slides[0].startedAt && mainDone
  // the prompt box stays open while videos generate: a new prompt for a video that's still being
  // made starts it again with that prompt. Only variations wait for Variation 1 to exist, since
  // they're made from it.
  const busyReason = activeSlide.id !== "main" && !mainDone ? "Waiting for Variation 1" : undefined
  const busy = !!busyReason
  // the very first reference video is still on its way: just the canvas and the prompts
  const hadMain = useRef(false)
  if (mainDone) hadMain.current = true
  const firstRun = !hadMain.current && !mainDone
  /* ---------- the chat that plans the Flick (started from Create with the chat on) ---------- */
  // every project is a chat project; one opened from before the chat (or copied) starts with an idle chat
  const agentMode = true
  const fresh = !generation.resume && !generation.copy && !generation.sample && !generation.fromAsset
  const [brand, setBrand] = useState<Brand | undefined>()
  // tools can run before React re-renders: they read the latest slides from here
  const liveRef = useRef(false)
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
  /** videos the chat has asked to make: nothing starts until the user presses Make on the docked card */
  const [proposals, setProposals] = useState<VideoProposal[]>([])
  const proposalsNow = useRef(proposals)
  proposalsNow.current = proposals
  const propose = (p: Omit<VideoProposal, "id" | "cost" | "at">) => {
    const next: VideoProposal = { ...p, id: crypto.randomUUID(), cost: VIDEO_COST, at: Date.now() }
    // one proposal per variation: a newer one replaces it
    setProposals((list) => ((proposalsNow.current = [...list.filter((x) => x.slideId !== p.slideId), next]), proposalsNow.current))
    return next
  }
  const makeProposed = (id: string) => {
    const p = proposalsNow.current.find((x) => x.id === id)
    if (!p) return false
    const ok = startVideo(p.slideId, p.prompt, { keep_seconds: p.keep_seconds })
    if (!ok) return false
    setProposals((list) => ((proposalsNow.current = list.filter((x) => x.id !== id)), proposalsNow.current))
    if (agentMode) agent.notify(`(App: the user pressed Make: ${p.name} is being made with the change you proposed. Nothing to reply.)`, false)
    return true
  }
  const dropProposed = (id: string) => {
    const p = proposalsNow.current.find((x) => x.id === id)
    setProposals((list) => ((proposalsNow.current = list.filter((x) => x.id !== id)), proposalsNow.current))
    if (p && agentMode) agent.notify(`(App: the user chose Not now for the ${p.name} video; it stays as it is. Nothing to reply.)`, false)
  }
  const startVideo = (id: string, prompt: string, opts?: { keep_seconds?: number }) => {
    if (dev.credits < VIDEO_COST) return void onGetCredits()
    setDev((d) => ({ credits: d.credits - VIDEO_COST }))
    const now = Date.now()
    const main = slidesNow.current[0]
    const startedAt = id === "main" ? now : main.startedAt && now < main.startedAt + ms ? main.startedAt + ms + 1 : now
    const video = inSet(generation.video ?? 0, nextVideo.current++)
    // a regenerate keeps what the video is made from (first frame, images, method)
    commitSlides(slidesNow.current.map((x) => (x.id === id ? { ...x, video, startedAt, prompt: "", refs: [], used: { prompt, refs: [], fromReference: id !== "main", media: { ...(x.used?.media ?? {}), ...(opts?.keep_seconds !== undefined ? { keep_seconds: opts.keep_seconds } : {}) } } } : x)))
    setHistory((h) => [...h, { id: crypto.randomUUID(), slideId: id, prompt, refs: [], fromReference: id !== "main", video, startedAt, at: now }])
    return true
  }
  /** this variation's finished videos before the current one, newest first (from the prompts history) */
  const earlierVideos = (slideId: string) => {
    const cur = slidesNow.current.find((x) => x.id === slideId)
    const seen = new Set<number>()
    return history
      .filter((h) => h.slideId === slideId && isMadeVideo(h.video) && h.video !== cur?.video && h.startedAt + ms < Date.now())
      .sort((a, b) => b.startedAt - a.startedAt)
      .filter((h) => (seen.has(h.video) ? false : (seen.add(h.video), true)))
  }
  const ago = (t: number) => {
    const m = Math.round((Date.now() - t) / 60_000)
    return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`
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
  // the same issues are reported once, so the chat isn't pushed round in circles over them
  const lastIssues = useRef("")
  const withIssues = (msg: string) => {
    tidy()
    const issues = feedIssues().join("; ")
    if (!issues || issues === lastIssues.current) return msg
    lastIssues.current = issues
    return `${msg} Check: ${issues}.`
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
  /* elements the chat adds or changes by hand */
  const findEl = (short: string) => elementsNow.current.find((e) => e.id === short || e.id.startsWith(short.trim()))
  const POS_Y = { top: 12, upper: 30, center: 50, lower: 70, bottom: 84 }

  // ---------- the chat's full canvas controls ----------
  const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  /** every property the toolbars offer, applied from the chat's spec (sizes in % of the frame) */
  const extrasOf = (el: CanvasElement, spec: ElementSpec): CanvasElement => {
    let n = el
    if (spec.underline !== undefined && (n.kind === "text" || n.kind === "button")) n = { ...n, underline: spec.underline }
    if (n.kind === "button") {
      if (spec.radius !== undefined) n = { ...n, radius: clampN(spec.radius, 0, 100) }
      if (spec.border !== undefined) n = { ...n, border: colorOf(spec.border) ?? n.border }
      if (spec.border_width !== undefined) n = { ...n, borderWidth: clampN(spec.border_width, 0, 40) }
      if (spec.width !== undefined) n = { ...n, w: clampN(spec.width, 4, 100) }
      if (spec.height !== undefined) n = { ...n, h: clampN(spec.height, 2, 100) }
      if (spec.url) n = { ...n, bgImage: spec.url }
      if (spec.fit) n = { ...n, bgFit: spec.fit }
    }
    if (n.kind === "image") {
      if (spec.fit) n = { ...n, fit: spec.fit }
      if (spec.lock !== undefined) n = { ...n, lock: spec.lock }
      if (spec.height !== undefined) {
        const h = clampN(spec.height, 1, 200)
        n = { ...n, h, ...(n.lock && spec.width === undefined ? { w: (h * n.w) / n.h } : {}) }
      }
      if (spec.crop) {
        const c = (v: number | undefined, was: number) => clampN(v ?? was, 0, 45)
        n = { ...n, crop: { t: c(spec.crop.top, n.crop.t), r: c(spec.crop.right, n.crop.r), b: c(spec.crop.bottom, n.crop.b), l: c(spec.crop.left, n.crop.l) } }
      }
    }
    if (n.kind === "shape") {
      if (spec.fit) n = { ...n, fillFit: spec.fit }
      if (spec.lock !== undefined) n = { ...n, lock: spec.lock }
    }
    return n
  }
  /** a strip arrangement as each thumbnail's top-left corner, % of the frame */
  const arrange = (kind: NonNullable<ElementSpec["arrangement"]>, n: number, size: number) => {
    const h = size * ratio // a square thumbnail's height in % of the frame
    const span = (a: number, b: number, k: number) => (n === 1 ? (a + b) / 2 : a + ((b - a) * k) / (n - 1))
    return Array.from({ length: n }, (_, k) => {
      if (kind === "arc") return { x: span(8, 92 - size, k), y: 90 - h - 10 * Math.sin((Math.PI * (k + 0.5)) / n) }
      if (kind === "diagonal") return { x: span(8, 92 - size, k), y: span(12, 88 - h, k) }
      if (kind === "corner_stack") return { x: 92 - size - (k % 2) * size * 0.25, y: 92 - (n - k) * (h + 1.5) }
      if (kind === "grid") {
        const rows = Math.ceil(n / 2)
        return { x: 92 - 2 * size - 2 + (k % 2) * (size + 2), y: 92 - rows * (h + 2) + Math.floor(k / 2) * (h + 2) }
      }
      // scatter: round the edges, clear of the middle where the subject usually is
      const a = (-Math.PI / 2) + (2 * Math.PI * k) / n
      return { x: clampN(50 + 38 * Math.cos(a) - size / 2, 3, 97 - size), y: clampN(50 + 38 * Math.sin(a) - h / 2, 3, 97 - h) }
    })
  }
  /** the thumbnail strip, from the chat: layout, place, size, gap, rounding, highlight, fade, and free positions */
  const editStrip = (el: Extract<CanvasElement, { kind: "strip" }>, spec: ElementSpec) => {
    const count = Math.max(1, (includeRef ? slidesNow.current : slidesNow.current.slice(1)).length)
    let st = { ...el }
    const notes: string[] = []
    if (spec.size !== undefined) st.size = clampN(spec.size, 3, 40)
    if (spec.gap !== undefined) st.gap = clampN(spec.gap, 0, 200)
    if (spec.radius !== undefined) st.radius = clampN(spec.radius, 0, 100)
    if (spec.highlight_color !== undefined) st.highlight = colorOf(spec.highlight_color) ?? st.highlight
    if (spec.highlight_width !== undefined) st.highlightWidth = clampN(spec.highlight_width, 0, 30)
    if (spec.background !== undefined && colorOf(spec.background)) st.bg = colorOf(spec.background)!.slice(0, 7) + st.bg.slice(7)
    if (spec.fade !== undefined) st.bg = st.bg.slice(0, 7) + Math.round(clampN(spec.fade, 0.1, 1) * 255).toString(16).padStart(2, "0")
    const positions = spec.thumbnails?.length ? spec.thumbnails : spec.arrangement ? arrange(spec.arrangement, count, st.size) : undefined
    if (positions) {
      if (positions.length < count) notes.push(`gave ${positions.length} positions for ${count} thumbnails; the rest follow on`)
      const all = Array.from({ length: count }, (_, k) => positions[k] ?? { x: (positions.at(-1)?.x ?? 8) + (k - positions.length + 1) * (st.size + 2), y: positions.at(-1)?.y ?? 80 })
      const x0 = Math.min(...all.map((q) => q.x))
      const y0 = Math.min(...all.map((q) => q.y))
      st = { ...st, layout: "free", x: x0, y: y0, free: all.map((q) => ({ x: q.x - x0, y: (q.y - y0) / ratio })) }
    } else if (spec.layout) {
      const layout = spec.layout === "row" ? "horizontal" : spec.layout === "column" ? "vertical" : "free"
      if (layout === "free") st = { ...st, layout: "free", free: st.free ?? st.savedFree?.free }
      else st = { ...st, layout, ...(spec.x === undefined && spec.y === undefined ? fitStrip(st, layout, count, ratio) : {}) }
    }
    if (spec.x !== undefined) st.x = spec.x
    if (spec.y !== undefined) st.y = spec.y
    const kept = clampStrip(st, count, ratio)
    if (kept.size < st.size - 0.05) notes.push("it was too big for the frame, so it was made smaller")
    else if (kept.x !== st.x || kept.y !== st.y) notes.push("it was moved back inside the frame")
    return { strip: kept, notes }
  }
  const placeOf = (spec: ElementSpec, el?: CanvasElement) => {
    const align = spec.align ?? (el && el.kind !== "strip" && !isBox(el) ? el.align : undefined) ?? "center"
    const x = spec.x ?? (spec.align || !el ? (align === "left" ? 8 : align === "right" ? 92 : 50) : el.x)
    const y = spec.y ?? (spec.position ? POS_Y[spec.position] : (el?.y ?? 50))
    return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)), ...(el?.kind === "image" ? {} : { align }) }
  }
  const textVariant = (v?: string) => TEXT_STYLES.find((t) => t.variant === v?.toLowerCase())?.variant
  const buttonVariant = (v?: string) => BUTTON_STYLES.find((b) => b.variant.toLowerCase() === v?.toLowerCase())?.variant
  const styleOf = (spec: ElementSpec) => ({
    ...(spec.size ? { size: Math.min(30, Math.max(1, spec.size)) } : {}),
    ...(colorOf(spec.color) ? { color: colorOf(spec.color) } : {}),
    ...(colorOf(spec.background) ? { bg: colorOf(spec.background) } : {}),
    ...(fontName(spec.font) ? { font: fontName(spec.font) } : {}),
    ...(spec.bold !== undefined ? { bold: spec.bold } : {}),
    ...(spec.italic !== undefined ? { italic: spec.italic } : {}),
    ...(spec.link !== undefined ? { link: spec.link } : {}),
  })
  /** an image keeps its width and takes its real shape once it loads */
  const fitImage = (id: string, src: string) => {
    const img = new Image()
    img.onload = () => {
      const ar = img.naturalWidth / img.naturalHeight || 1
      setElements((els) => els.map((e) => (e.id === id && e.kind === "image" ? { ...e, ar, h: (e.w * ratio) / ar } : e)))
    }
    img.src = src
  }
  const agentApi: EditorApi = {
    state: () => ({
      flick_size: generation.size,
      video_seconds: generation.duration ?? 8,
      ...(generation.recipe ? { recipe: generation.recipe } : {}),
      credits: dev.credits,
      video_cost: VIDEO_COST,
      title,
      planned: !!slidesNow.current[0].startedAt,
      // real videos: variations wait until the user approves the reference video
      reference_review: !liveRef.current || !agentMode ? undefined : !isMadeVideo(slidesNow.current[0].video) || slidesNow.current[0].job ? "reference still generating" : slidesNow.current[0].approvedRef === slidesNow.current[0].startedAt ? "approved: variations are made from it" : "ready: waiting for the user's approval before variations are made",
      brand,
      videos: slidesNow.current.map((x, i) => ({
        name: nameOfSlide(x),
        role: i ? "variation" : "reference",
        status: status(x),
        prompt: x.used?.prompt || x.prompt || undefined,
        has_thumbnail: !!x.thumb,
        // finished videos this variation had before (1 = the most recent): set_variation use_earlier puts one back
        ...(earlierVideos(x.id).length ? { earlier_videos: earlierVideos(x.id).map((e, j) => ({ n: j + 1, made: ago(e.startedAt), prompt: e.prompt.slice(0, 80) })) } : {}),
      })),
      // every feed, including ones the user or a template made, with what uses it and each variation's value
      feeds: feedsNow.current.map((f) => ({
        name: f.name,
        type: f.type,
        used_by: usesOf(f.id),
        values: Object.fromEntries(slidesNow.current.map((x) => [nameOfSlide(x), x.feeds?.[f.id] ?? ""])),
      })),
      issues: feedIssues(),
      // videos you proposed, still waiting for the user's Make (don't propose them again)
      ...(proposalsNow.current.length ? { proposed_videos: proposalsNow.current.map((x) => ({ name: x.name, change: x.change ?? x.prompt.slice(0, 120), cost: x.cost })) } : {}),
      design: describeDesign(elementsNow.current, (id) => feedsNow.current.find((f) => f.id === id)?.name, { ratio, thumbs: (includeRef ? slidesNow.current : slidesNow.current.slice(1)).filter((x) => x.id === "main" || x.startedAt).map(nameOfSlide) }),
      // the variation the Flick opens on
      starts_on: nameOfSlide(slidesNow.current.find((x) => x.id === start) ?? slidesNow.current[0]),
    }),
    async shot(variation) {
      // the Flick as viewers see it: a frame of this variation’s video with the design on top
      const list = slidesNow.current
      const sl = (variation ? findSlide(variation) : undefined) ?? list[0]
      if (!sl) throw new Error("No variation to show.")
      const shown = list.filter((x) => x.id === "main" || x.startedAt)
      const made = status(sl) === "done" && sl.video !== undefined
      const v = sl.video !== undefined ? videoAt(wrapVideo(sl.video)) : undefined
      const blob = await renderFlickShot({
        size: generation.size,
        elements: elementsNow.current,
        video: made ? v?.mp4 : undefined,
        poster: v?.poster,
        thumbs: shown.map((x) => ({ poster: x.thumb })),
        active: Math.max(0, shown.indexOf(sl)),
        feedOf: (id) => {
          const f = feedsNow.current.find((x) => x.id === id)
          return f && { name: f.name, value: sl.feeds?.[id] ?? "" }
        },
      })
      const name = slideName(sl, list.indexOf(sl))
      return { blob, name, note: made ? `${name}, a frame at 1.5 s` : `${name}: its video isn't made yet, so the frame behind the design is a stand-in` }
    },
    setFormat(size, seconds) {
      const m = size.match(/^\s*(\d{2,4})\s*[x×]\s*(\d{2,4})\s*$/i)
      if (!m) return "Error: give the size as width×height in pixels, e.g. 300×250."
      const [w, h] = [Number(m[1]), Number(m[2])]
      if (w < 50 || h < 50 || w > 4000 || h > 4000) return "Error: each side must be 50 to 4000 pixels."
      if (slidesNow.current[0].startedAt) return "Error: the videos are already made; the size can't change now."
      const len = seconds ? Math.max(4, Math.min(15, Math.round(seconds))) : undefined
      onFormat?.(`${w}×${h}`, len)
      return `Size set to ${w}×${h}${len ? `, ${len} s` : ""}. Videos are made in ${videoAspectOf(`${w}×${h}`)} (the closest shape the video model makes) and cover the frame, centered; a little may be cropped at the edges.`
    },
    approveReference() {
      const main = slidesNow.current[0]
      if (!isMadeVideo(main.video) || main.job) return "Error: Variation 1 isn't ready yet; the app tells you when it is."
      if (main.approvedRef === main.startedAt) return "Already approved: the variations are being made from it."
      approveRef(true)
      return "Approved: the variations are being made from Variation 1 now (a few minutes). Say so in one short line."
    },
    approvePlan(plan) {
      const vars = plan.variations.filter((v) => v.name?.trim()).slice(0, 5)
      if (vars.length < 2) return "Error: The plan needs at least two variations."
      // the reference video is Variation 1 (the plan's first variation); the rest are made from it.
      // A variation the user gave a finished video for is used as it is: nothing made, nothing charged
      const made = (v: (typeof vars)[number]) => !v.own?.video
      const toMake = vars.filter(made).length
      const cost = VIDEO_COST * toMake
      if (dev.credits < cost) {
        onGetCredits()
        return `Error: This needs ${cost.toLocaleString("en-US")} credits and you have ${dev.credits.toLocaleString("en-US")}. Get credits, then approve the storyboard again.`
      }
      setDev((d) => ({ credits: d.credits - cost }))
      const now = Date.now()
      const base = generation.video ?? 0
      const design = { ...(plan.design ?? {}) }
      // a field becomes a feed when variations give it values: label, price and link whenever set;
      // headline, subheading and button text only when they actually differ
      const feedsMade: Feed[] = []
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
        feedsMade.push({ id, name: FIELD_FEED[f].name, type: FIELD_FEED[f].type })
        ids[f] = id
        if ((f === "headline" || f === "subheading" || f === "cta") && !design[f]) design[f] = vals[0]
      }
      const valuesFor = (v: (typeof vars)[number]) => Object.fromEntries(FIELDS.flatMap((f) => (ids[f] ? [[ids[f]!, valueOf(v, f)]] : [])))
      // the user's own video: in the Flick straight away, ready (and, as Variation 1, already approved)
      const given = (v: (typeof vars)[number], name: string) => {
        const video = addMadeVideo({ name: `${name}-${now}`, size: generation.size, mp4: v.own!.video!, poster: v.own?.poster ?? MISSING_POSTER })
        return { video, startedAt: now - ms - 1, used: { prompt: "The user's own video", refs: [], fromReference: false } }
      }
      const thumbOf = (v: (typeof vars)[number]) => (v.own?.thumb ? { thumb: v.own.thumb } : {})
      const mainName = vars[0].name.trim() || "Variation 1"
      const main: Slide = made(vars[0])
        ? { id: "main", name: vars[0].name.trim() || undefined, prompt: "", refs: [], video: base, startedAt: now, used: { prompt: plan.reference.prompt, refs: generation.refs ?? [], fromReference: false, media: plan.reference.media }, feeds: valuesFor(vars[0]), ...thumbOf(vars[0]) }
        : (() => {
            const g = given(vars[0], mainName)
            return { id: "main", name: vars[0].name.trim() || undefined, prompt: "", refs: [], ...g, approvedRef: g.startedAt, feeds: valuesFor(vars[0]), ...thumbOf(vars[0]) }
          })()
      const vs: Slide[] = vars.slice(1).map((v, i) =>
        made(v)
          ? {
              id: crypto.randomUUID(),
              n: i + 1,
              name: v.name.trim(),
              prompt: "",
              refs: [],
              video: inSet(base, i + 1),
              // made from the reference video, so they start once it's ready
              startedAt: made(vars[0]) ? now + ms + 1 : now,
              used: { prompt: v.prompt, refs: [], fromReference: true, media: v.media },
              feeds: valuesFor(v),
              ...thumbOf(v),
            }
          : { id: crypto.randomUUID(), n: i + 1, name: v.name.trim(), prompt: "", refs: [], ...given(v, v.name.trim()), feeds: valuesFor(v), ...thumbOf(v) },
      )
      nextN.current = vs.length + 1
      // a storyboard approved after a build (a change of person, setting or shot): the videos are remade, the canvas stays.
      // Same-named variations keep their thumbnails and their feed values; the design, logo and anything placed stay where they are.
      const rebuilt = stripAdded.current && elementsNow.current.length > 0 && slidesNow.current.some((x) => x.startedAt)
      const before = slidesNow.current
      const keepOf = (name: string | undefined) => (rebuilt && name ? before.find((x) => nameOfSlide(x).toLowerCase() === name.toLowerCase()) : undefined)
      const kept = (x: Slide): Slide => {
        const prev = keepOf(x.name)
        if (!prev) return x
        // the existing feeds keep their values; a value the new storyboard gives wins
        const feedVals = { ...(prev.feeds ?? {}) }
        for (const f of FIELDS) {
          const id = feedOfField(elementsNow.current, f)
          const v = vars.find((y) => y.name.trim().toLowerCase() === (x.name ?? "").toLowerCase())?.[f]?.trim()
          if (id && v) feedVals[id] = v
        }
        return { ...x, thumb: x.thumb ?? prev.thumb, feeds: feedVals }
      }
      const slidesNext = rebuilt ? [kept(main), ...vs.map(kept)] : [main, ...vs]
      commitSlides(slidesNext)
      // the prompts history lists only videos being made, not the user's own
      setHistory((h) => [...(rebuilt ? h : []), ...slidesNext.filter((x) => x.used?.prompt !== "The user's own video" && x.startedAt && x.startedAt >= now).map((x) => ({ id: crypto.randomUUID(), slideId: x.id, prompt: x.used!.prompt, refs: refsOf(x.used!.refs), fromReference: x.id !== "main", video: x.video!, startedAt: x.startedAt!, batch: x.id !== "main", at: now }))])
      if (!rebuilt) {
        commitFeeds(feedsMade)
        stripAdded.current = true
        const els = buildDesign(design, { ratio, count: vars.length, feeds: ids, brand })
        elementsNow.current = els
        setShared(els)
      }
      setStart("main")
      setActive("main")
      setSelected([])
      if (plan.title?.trim()) setTitle(plan.title.trim())
      const per = rebuilt ? feedsNow.current.map((f) => f.name) : feedsMade.map((f) => f.name)
      const theirs = vars.filter((v) => !made(v)).map((v) => v.name)
      const needThumbs = slidesNext.filter((x) => !x.thumb).map(nameOfSlide)
      const thumbsLine = needThumbs.length ? `Thumbnails still needed for: ${needThumbs.join(", ")}.` : rebuilt ? "Every variation kept its thumbnail: don't make any." : "Every variation has the user's own thumbnail: don't make any."
      const designLine = rebuilt
        ? `The canvas is unchanged: the design, logo and everything placed stay as they were${per.length ? `, with ${per.join(", ")} per variation` : ""}; don't add or re-place anything.`
        : `The design is on the canvas${per.length ? `, with ${per.join(", ")} set per variation (feeds)` : ""}.`
      if (!toMake) return withIssues(`Nothing to generate and no credits used: all ${vars.length} variations use the user's own videos, ready in the Flick now. ${designLine} ${thumbsLine}`)
      const mine = theirs.length ? ` ${theirs.join(", ")} use${theirs.length === 1 ? "s" : ""} the user's own video${theirs.length === 1 ? "" : "s"} (ready now, not charged).` : ""
      if (!made(vars[0])) return withIssues(`Generating ${toMake} video${toMake === 1 ? "" : "s"} (${cost.toLocaleString("en-US")} credits), each made from the user's own Variation 1 video, starting now.${mine} ${designLine} ${thumbsLine}`)
      return withIssues(`Generating ${toMake} videos (${cost.toLocaleString("en-US")} credits): ${main.name ?? "Variation 1"} (the reference video) first, then the other ${toMake - 1}; ${liveRef.current ? "Variation 1 comes first (a few minutes); the user reviews it, and the others are made from it once they approve (or after you regenerate it with their changes)" : `they take about ${dev.generationSeconds * 2} seconds`}.${mine} ${designLine} ${thumbsLine}`)
    },
    updateDesign(d) {
      if (!slidesNow.current[0].startedAt) return "Error: Approve the storyboard first."
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
      if ((p as { start?: boolean }).start) {
        if (sl.id === "main" && !includeRef) parts.push("Variation 1 isn't in the Flick, so it can't be where it starts")
        else (setStart(sl.id), parts.push("the Flick now starts on it"))
      }
      if (p.regenerate && p.prompt) {
        propose({ slideId: sl.id, name, prompt: p.prompt, change: p.direction?.trim() || undefined, keep_seconds: p.keep_seconds })
        parts.push(`proposed a remake (${VIDEO_COST} credits): it starts only when the user presses Make on the card above the composer. Say in one line what it will change; don't ask them to confirm in words`)
      }
      // an earlier video of this variation, back as it is: nothing made, nothing charged
      if (p.use_earlier) {
        const cur = slidesNow.current.find((x) => x.id === sl.id)
        const earlier = earlierVideos(sl.id)
        const pick = earlier[Math.max(1, Math.floor(p.use_earlier)) - 1]
        if (!pick) return `Error: ${name} has ${earlier.length ? `only ${earlier.length} earlier video${earlier.length === 1 ? "" : "s"}` : "no earlier video"} (see earlier_videos in the project state).`
        if (cur?.job?.id) cancelJob(cur.job.id).catch(() => {})
        commitSlides(slidesNow.current.map((x) => (x.id === sl.id ? { ...x, video: pick.video, startedAt: pick.startedAt, job: undefined, failed: undefined, used: { prompt: pick.prompt, refs: [], fromReference: sl.id !== "main" } } : x)))
        parts.push(`now shows its earlier video from ${ago(pick.startedAt)}${sl.id === "main" && slidesNow.current.length > 1 ? " (the other variations were made from a different reference: remake them only if the user wants them to match)" : ""}`)
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
      const proposed = gen && v.prompt && slidesNow.current[0].startedAt
      if (proposed) propose({ slideId: id, name: v.name?.trim() || `Variation ${n + 1}`, prompt: v.prompt!, change: v.direction?.trim() || undefined, keep_seconds: v.keep_seconds })
      return withIssues(
        `Added ${v.name || `Variation ${n + 1}`}${proposed ? ` and proposed its video (${VIDEO_COST} credits): it starts only when the user presses Make on the card above the composer` : ""}.${copied.length ? ` Copied ${copied.join(", ")} from ${nameOfSlide(first)}; change them with set_variation if they should differ.` : ""}`,
      )
    },
    varyField(field, feed, values) {
      if (!slidesNow.current[0].startedAt) return "Error: Approve the storyboard first."
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
    addElement(spec) {
      if (!slidesNow.current[0].startedAt) return "Error: Approve the storyboard first."
      const type = spec.type ?? (spec.url ? "image" : "text")
      const id = crypto.randomUUID()
      const at = placeOf(spec)
      let el: CanvasElement
      if (type === "shape") {
        const path = spec.shape === "path"
        if (path && !spec.d?.trim()) return "Error: A path shape needs d (SVG path data in a 100×100 box)."
        const def = path ? { shape: "path" as const, ar: 1, filled: true, points: undefined } : (SHAPES.find((x) => x.shape === spec.shape) ?? SHAPES[0])
        const w = Math.min(100, Math.max(1, spec.width ?? (def.ar >= 4 ? 40 : 30)))
        const h = Math.min(100, Math.max(0.5, spec.height ?? (w * ratio) / def.ar))
        el = { id, kind: "shape", shape: def.shape, x: at.x, y: at.y, w, h, ar: def.ar, lock: false, fill: spec.fill ?? (def.filled ? SHAPE_GREY : "transparent"), stroke: spec.stroke ?? SHAPE_GREY, ...(spec.url ? { fillImage: spec.url, fillFit: "cover" as const } : {}), strokeWidth: spec.stroke_width ?? (def.filled ? 0 : 8), radius: spec.radius ?? 0, ...(path ? { d: spec.d!.slice(0, 4000) } : {}), ...(spec.points ? { points: Math.min(12, Math.max(3, Math.round(spec.points))) } : def.points ? { points: def.points } : {}), opacity: spec.opacity ?? 1 }
      } else if (type === "image") {
        if (!spec.url) return "Error: Give image_id for an image."
        const w = Math.min(100, Math.max(4, spec.width ?? 30))
        el = { id, kind: "image", src: spec.url, x: at.x, y: at.y, w, h: w * ratio, ar: 1, lock: true, fit: "contain", radius: spec.radius ?? 0, crop: { t: 0, r: 0, b: 0, l: 0 } }
        fitImage(id, spec.url)
        keepImage(spec.url, "image")
      } else if (type === "button") {
        el = { id, kind: "button", variant: buttonVariant(spec.style) ?? "pill", text: spec.text ?? BUTTON_TEXT, ...at, ...styleOf(spec) } as CanvasElement
      } else {
        if (!spec.text?.trim()) return "Error: Give the text."
        el = { id, kind: "text", variant: textVariant(spec.style) ?? "body", text: spec.text, ...at, ...styleOf(spec) } as CanvasElement
      }
      // keep clear of what's already there (an exact x/y from the chat is still nudged if it lands on something)
      const shownText = (e: CanvasElement) => (e.kind === "text" || e.kind === "button" ? (e.feed ? (slidesNow.current[1]?.feeds?.[e.feed] ?? e.text) : e.text) : undefined)
      el = extrasOf(el, spec)
      if (spec.rotation !== undefined && canRotate(el)) el = { ...el, rotation: ((spec.rotation % 360) + 360) % 360 } as CanvasElement
      // shapes go exactly where asked (a backdrop sits behind its text on purpose); the rest keep clear
      const spot = el.kind === "shape" ? { y: el.y, moved: false, overlaps: false } : freeY(elementsNow.current.filter((o) => o.kind !== "shape"), el, ratio, shownText)
      el = { ...el, y: spot.y } as CanvasElement
      commitElements(spec.layer === "back" ? [el, ...elementsNow.current] : [...elementsNow.current, el])
      const what = type === "shape" ? `a ${spec.shape ?? "rect"}` : type === "image" ? "an image" : type === "button" ? `a button “${spec.text ?? BUTTON_TEXT}”` : `“${spec.text}”`
      return `Added ${what} (id ${id.slice(0, 6)})${spot.moved ? `, moved to y ${Math.round(spot.y)} to stay clear of other elements` : ""}${spot.overlaps ? "; there was no free space, so it overlaps something: move or shrink it" : ""}.`
    },
    editElement(short, spec) {
      const el = findEl(short)
      if (!el) return `Error: No element with id ${short}.`
      if (el.kind === "strip") {
        const { strip, notes: sn } = editStrip(el, spec)
        commitElements(elementsNow.current.map((e) => (e.id === el.id ? strip : e)))
        return `Changed the thumbnail strip${sn.length ? `; ${sn.join("; ")}` : ""}.`
      }
      const notes: string[] = []
      const moved = spec.x !== undefined || spec.y !== undefined || spec.position || spec.align ? placeOf(spec, el) : {}
      let next: CanvasElement = { ...el, ...moved, ...(spec.hidden !== undefined ? { hidden: spec.hidden } : {}) } as CanvasElement
      if (next.kind === "shape") {
        const sh: typeof next = next
        if (spec.width || spec.height) next = { ...sh, w: spec.width ?? sh.w, h: spec.height ?? (spec.width && sh.lock ? (spec.width * sh.h) / sh.w : sh.h) }
        next = {
          ...next,
          ...(spec.fill !== undefined ? { fill: spec.fill } : {}),
          ...(spec.stroke !== undefined ? { stroke: spec.stroke } : {}),
          ...(spec.stroke_width !== undefined ? { strokeWidth: Math.max(0, spec.stroke_width) } : {}),
          ...(spec.radius !== undefined ? { radius: spec.radius } : {}),
          ...(spec.points !== undefined ? { points: Math.min(12, Math.max(3, Math.round(spec.points))) } : {}),
          ...(spec.d && sh.shape === "path" ? { d: spec.d.slice(0, 4000) } : {}),
          ...(spec.opacity !== undefined ? { opacity: Math.min(1, Math.max(0, spec.opacity)) } : {}),
          ...(spec.url ? { fillImage: spec.url } : {}),
        } as CanvasElement
      } else if (next.kind === "image") {
        if (spec.width) next = { ...next, w: spec.width, h: (spec.width * ratio) / next.ar }
        if (spec.radius !== undefined) next = { ...next, radius: spec.radius }
        if (spec.url) (next = { ...next, src: spec.url }), fitImage(el.id, spec.url), keepImage(spec.url, "image")
      } else if (next.kind === "text" || next.kind === "button") {
        if (spec.text !== undefined) {
          if (next.feed) notes.push("its text differs per variation, so it was left; use vary_field")
          else next = { ...next, text: spec.text }
        }
        if (spec.style) {
          const v = next.kind === "text" ? textVariant(spec.style) : buttonVariant(spec.style)
          if (v) next = { ...next, variant: v } as CanvasElement
        }
        if (next.kind === "text" && spec.width) next = { ...next, w: spec.width }
        if (next.kind === "button" && spec.link !== undefined) {
          if (next.linkFeed) notes.push("its link differs per variation; use vary_field with field link")
          else next = { ...next, link: spec.link }
        }
        next = { ...next, ...styleOf(spec) } as CanvasElement
      }
      next = extrasOf(next, spec)
      if (spec.rotation !== undefined && canRotate(next)) next = { ...next, rotation: ((spec.rotation % 360) + 360) % 360 } as CanvasElement
      const others = elementsNow.current.filter((e) => e.id !== el.id)
      const at = elementsNow.current.findIndex((e) => e.id === el.id)
      const step = (to: number) => [...others.slice(0, to), next, ...others.slice(to)]
      commitElements(
        spec.layer === "back" ? [next, ...others]
        : spec.layer === "front" ? [...others, next]
        : spec.layer === "forward" ? step(Math.min(others.length, at + 1))
        : spec.layer === "backward" ? step(Math.max(0, at - 1))
        : elementsNow.current.map((e) => (e.id === el.id ? next : e)),
      )
      return `Changed the ${el.kind === "text" ? `text “${el.text || el.role || "text"}”` : el.kind}.${notes.length ? ` Note: ${notes.join("; ")}.` : ""}`
    },
    arrangeElements(ids, action, o) {
      const els = ids.map((x) => findEl(x))
      const missing = ids.filter((_, k) => !els[k])
      if (missing.length) return `Error: No element with id ${missing.join(", ")}. Ids: ${elementsNow.current.map((e) => `${e.id.slice(0, 6)} (${e.kind})`).join(", ")}.`
      const list = els as CanvasElement[]
      const set = new Set(list.map((e) => e.id))
      const strip = list.find((e) => e.kind === "strip")
      // each element's box in % of the frame, read from the canvas itself
      const frame = document.querySelector<HTMLElement>("[data-frame]")?.getBoundingClientRect()
      const boxOf = (e: CanvasElement) => {
        const b = document.querySelector<HTMLElement>(`[data-frame] [data-el="${e.id}"]`)?.getBoundingClientRect()
        if (!b || !frame) return undefined
        return { l: ((b.left - frame.left) / frame.width) * 100, r: ((b.right - frame.left) / frame.width) * 100, t: ((b.top - frame.top) / frame.height) * 100, b: ((b.bottom - frame.top) / frame.height) * 100 }
      }
      const shift = (e: CanvasElement, dx: number, dy: number) => ({ ...e, x: e.x + dx, y: e.y + dy }) as CanvasElement
      const commitMoved = (moved: Map<string, CanvasElement>) => commitElements(elementsNow.current.map((e) => moved.get(e.id) ?? e))
      switch (action) {
        case "move": {
          const dx = o.dx ?? 0
          const dy = o.dy ?? 0
          commitMoved(new Map(list.map((e) => [e.id, shift(e, dx, dy)])))
          return `Moved ${list.length} element${list.length === 1 ? "" : "s"} by ${dx}, ${dy}.`
        }
        case "align":
        case "distribute": {
          const boxes = list.map((e) => ({ e, b: boxOf(e) })).filter((x): x is { e: CanvasElement; b: NonNullable<ReturnType<typeof boxOf>> } => !!x.b)
          if (!boxes.length) return "Error: Couldn't read where the elements are; open the editor and try again."
          const moved = new Map<string, CanvasElement>()
          if (action === "align") {
            const to = o.to ?? "center"
            const all = { l: Math.min(...boxes.map((x) => x.b.l)), r: Math.max(...boxes.map((x) => x.b.r)), t: Math.min(...boxes.map((x) => x.b.t)), b: Math.max(...boxes.map((x) => x.b.b)) }
            const ref = o.relative_to === "frame" || boxes.length === 1 ? { l: 0, r: 100, t: 0, b: 100 } : all
            for (const { e, b } of boxes) {
              const dx = to === "left" ? ref.l - b.l : to === "right" ? ref.r - b.r : to === "center" ? (ref.l + ref.r) / 2 - (b.l + b.r) / 2 : 0
              const dy = to === "top" ? ref.t - b.t : to === "bottom" ? ref.b - b.b : to === "middle" ? (ref.t + ref.b) / 2 - (b.t + b.b) / 2 : 0
              moved.set(e.id, shift(e, dx, dy))
            }
            commitMoved(moved)
            return `Aligned ${boxes.length} element${boxes.length === 1 ? "" : "s"} to the ${to}${o.relative_to === "frame" || boxes.length === 1 ? " of the frame" : ""}.`
          }
          if (boxes.length < 3) return "Error: Spreading needs 3 or more elements."
          const vertical = o.to === "vertical"
          const sorted = [...boxes].sort((a, b) => (vertical ? a.b.t - b.b.t : a.b.l - b.b.l))
          const size = sorted.reduce((n, x) => n + (vertical ? x.b.b - x.b.t : x.b.r - x.b.l), 0)
          const start = vertical ? sorted[0].b.t : sorted[0].b.l
          const end = vertical ? sorted.at(-1)!.b.b : sorted.at(-1)!.b.r
          const gap = (end - start - size) / (sorted.length - 1)
          let at = start
          for (const { e, b } of sorted) {
            const d = at - (vertical ? b.t : b.l)
            moved.set(e.id, shift(e, vertical ? 0 : d, vertical ? d : 0))
            at += (vertical ? b.b - b.t : b.r - b.l) + gap
          }
          commitMoved(moved)
          return `Spread ${sorted.length} elements evenly ${vertical ? "top to bottom" : "left to right"}.`
        }
        case "front":
        case "back": {
          const rest = elementsNow.current.filter((e) => !set.has(e.id))
          const moving = elementsNow.current.filter((e) => set.has(e.id))
          commitElements(action === "front" ? [...rest, ...moving] : [...moving, ...rest])
          return `Brought ${list.length} element${list.length === 1 ? "" : "s"} to the ${action}.`
        }
        case "duplicate": {
          if (strip) return "Error: The thumbnail strip can't be duplicated."
          const dx = o.dx ?? 3
          const dy = o.dy ?? 3
          const copies = list.map((e) => ({ ...shift(e, dx, dy), id: crypto.randomUUID() }) as CanvasElement)
          commitElements([...elementsNow.current, ...copies])
          return `Duplicated ${copies.length} element${copies.length === 1 ? "" : "s"}: new ids ${copies.map((c) => c.id.slice(0, 6)).join(", ")}.`
        }
        case "delete": {
          if (strip) return "Error: The thumbnail strip stays; viewers need it to switch. Delete the others without it."
          commitElements(elementsNow.current.filter((e) => !set.has(e.id)))
          return `Deleted ${list.length} element${list.length === 1 ? "" : "s"}.`
        }
      }
      return "Error: action is one of move, align, distribute, front, back, duplicate, delete."
    },
    versions() {
      return versions.map((v) => ({ n: v.n, at: new Date(v.at).toISOString().slice(0, 16).replace("T", " "), name: v.name, exported: v.exported?.name, current: v.n === currentVersion }))
    },
    makeProposed(name) {
      const p = proposalsNow.current.find((x) => x.name.toLowerCase() === name.trim().toLowerCase()) ?? (proposalsNow.current.length === 1 ? proposalsNow.current[0] : undefined)
      if (!p) return `Error: nothing proposed for “${name}”. Proposed now: ${proposalsNow.current.map((x) => x.name).join(", ") || "nothing"}.`
      return makeProposed(p.id) ? `${p.name} is being made (${p.cost} credits).` : "Error: Not enough credits."
    },
    proposed() {
      return proposalsNow.current.map((x) => ({ name: x.name, change: x.change ?? x.prompt.slice(0, 120), cost: x.cost }))
    },
    restoreVersion(n) {
      if (!versions.some((v) => v.n === n)) return `Error: No version ${n}. Versions: ${versions.map((v) => v.n).join(", ") || "none yet"}.`
      const back = restore(n) ?? []
      const vids = back.map((x) => `${nameOfSlide(x)} (${isMadeVideo(x.video) ? "its video is back, done" : "no video: make it only if the user wants it"})`)
      return `Restored version ${n}: the canvas, feeds and videos as they were. Videos: ${vids.join("; ")}. Nothing needs making or re-planning. (Restoring is saved as a new version, so it can be undone the same way.)`
    },
    saveVersion(name) {
      const label = name.trim().slice(0, 60) || "Saved by the chat"
      setVersions((v) => {
        const latest = v.at(-1)
        if (latest && latest.sig === sig) return v.map((x, k) => (k === v.length - 1 ? { ...x, name: label } : x))
        return [...v, { n: (latest?.n ?? 0) + 1, at: Date.now(), sig, snap: snapNow(), name: label }]
      })
      return `Saved the current canvas as “${label}”.`
    },
    removeElement(short) {
      const el = findEl(short)
      if (!el) return `Error: No element with id ${short}.`
      if (el.kind === "strip") return "Error: The thumbnail strip stays; viewers need it to switch."
      commitElements(elementsNow.current.filter((e) => e.id !== el.id))
      return `Removed the ${el.kind === "text" ? `text “${el.text || el.role || ""}”` : el.kind}.`
    },
    review() {
      // the review skill's checks, in code: what passes and what to fix
      const pass: string[] = []
      const fail: string[] = []
      const check = (ok: boolean, good: string, bad: string) => (ok ? pass : fail).push(ok ? good : bad)
      const list = slidesNow.current
      const vars = list.slice(1)
      const shown = includeRef ? list : vars
      // Variation 1 counts when it's in the Flick
      check(shown.length >= 2 && shown.length <= 5, `${shown.length} variations`, `There are ${shown.length} variations; a Flick needs 2 to 5.`)
      const names = vars.map(nameOfSlide)
      check(new Set(names.map((n) => n.toLowerCase())).size === names.length, "Variation names are distinct", "Two variations share a name.")
      const long = names.filter((n) => n.length > 14)
      check(!long.length, "Variation names are short", `Names over 14 characters: ${long.join(", ")}.`)
      const els = elementsNow.current.filter((e) => !e.hidden)
      const valuesOf = (e: CanvasElement) => (e.kind === "text" || e.kind === "button" ? (e.feed ? shown.map((x) => x.feeds?.[e.feed!] ?? "") : [e.text]) : [])
      const longestOf = (e: CanvasElement) => valuesOf(e).reduce((a, b) => (b.length > a.length ? b : a), "")
      const limit = headlineLimit(generation.size)
      const head = elementFor(els, "headline")
      if (head) {
        const words = Math.max(...valuesOf(head).map((v) => v.trim().split(/\s+/).filter(Boolean).length))
        check(words <= limit, `Headline fits ${generation.size}`, `Headline is ${words} words; ${generation.size} holds ${limit}. Shorten it (id ${head.id.slice(0, 6)}).`)
      } else fail.push("No headline on the canvas.")
      // overlaps and the frame's edges
      // shapes are meant to sit behind or around other elements (backdrops, frames), so they don't count as overlaps
      const boxes = els.filter((e) => e.kind !== "shape").map((e) => ({ e, b: boxOf(e, ratio, longestOf(e)) }))
      const label = (e: CanvasElement) => (e.kind === "text" ? `“${(longestOf(e) || e.role || "text").slice(0, 24)}”` : e.kind === "strip" ? "the thumbnail strip" : e.kind) + ` (id ${e.id.slice(0, 6)})`
      const hits: string[] = []
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i].b
          const B = boxes[j].b
          if (A.l < B.r - 0.5 && A.r > B.l + 0.5 && A.t < B.b - 0.5 && A.b > B.t + 0.5) hits.push(`${label(boxes[i].e)} and ${label(boxes[j].e)}`)
        }
      check(!hits.length, "Nothing overlaps", `Overlapping: ${hits.slice(0, 4).join("; ")}.`)
      const out = boxes.filter(({ e, b }) => e.kind !== "strip" && (b.l < -0.5 || b.r > 100.5 || b.t < -0.5 || b.b > 100.5)).map(({ e }) => label(e))
      check(!out.length, "Everything is inside the frame", `Outside the frame: ${out.join(", ")}.`)
      // buttons: readable and going somewhere
      for (const e of els) {
        if (e.kind !== "button" || e.variant === "icon" || e.variant === "link") continue
        const c = contrast(e.color ?? defaultInk(e), e.bg ?? defaultFill(e))
        if (c !== undefined) check(c >= 3, "Button text is readable", `Button ${label(e)} text contrast is ${c.toFixed(1)}:1; needs 3:1. Change its text or background color.`)
        const linked = e.linkFeed ? shown.every((x) => x.feeds?.[e.linkFeed!]?.trim()) : !!e.link?.trim()
        check(linked, "Every button has a link", `Button ${label(e)} has no link${e.linkFeed ? " on some variations" : ""}.`)
      }
      const issues = feedIssues()
      check(!issues.length, "Every feed is filled", `Empty values: ${issues.join("; ")}.`)
      const noThumb = shown.filter((x) => !x.thumb).map(nameOfSlide)
      check(!noThumb.length, "Every variation has a thumbnail", `No thumbnail: ${noThumb.join(", ")}.`)
      return { pass, fail }
    },
    setThumbnail(target, url) {
      const sl = findSlide(target)
      if (!sl) return `Error: No variation called “${target}”.`
      commitSlides(slidesNow.current.map((x) => (x.id === sl.id ? { ...x, thumb: url } : x)))
      keepImage(url, `${nameOfSlide(sl)} thumbnail`)
      return `Set ${nameOfSlide(sl)}'s thumbnail.`
    },
    addImageToCanvas(url) {
      if (!slidesNow.current[0].startedAt) return "Error: Approve the storyboard first."
      addImage(url)
      keepImage(url, "image")
      return "Added the image to the canvas."
    },
  }
  const agent = useAgent(agentApi, { projectId: generation.id, prompt: agentMode ? generation.prompt : undefined, imageUrls: agentMode ? (generation.refs ?? []).filter((r) => !r.failed).map((r) => ({ url: r.url, name: r.name })) : [], autoStart: agentMode, fresh, template: generation.fromTemplate })
  const live = isLive(useAiConfig())
  liveRef.current = live
  // real videos: only in projects made with the AI chat, with the AI server connected; every video
  // started there is made for real (720p). Projects without the AI chat keep the sample videos.
  // The slide keeps a stand-in video until it's ready; a failure refunds and leaves it empty.
  // the reference video, ready and not yet approved, with variations waiting on it
  const mainNow = slides[0]
  const refReady = isMadeVideo(mainNow.video) && !mainNow.job
  const needsReview = agentMode && live && refReady && mainNow.approvedRef !== mainNow.startedAt && slides.some((x) => x.job?.status === "waiting")
  /** Variation 1 approved: the waiting variations start. From the chat's own tool (`byChat`) or the build card's button, which the chat hears about */
  const approveRef = (byChat = false) => {
    commitSlides(slidesNow.current.map((x, i) => (i === 0 ? { ...x, approvedRef: x.startedAt } : x)))
    if (!byChat) agent.notify("(App: the user approved Variation 1 with the button; the variations are being made from it. Nothing to reply.)", false)
  }
  // Variation 1 is in and waiting for review: wake the chat, once per version, so it looks and asks
  const toldReady = useRef(0)
  // only when this session watched it being made (a reload of a project already waiting stays quiet)
  const sawMaking = useRef(0)
  if (!refReady && mainNow.startedAt) sawMaking.current = mainNow.startedAt
  useEffect(() => {
    if (!needsReview || toldReady.current === mainNow.startedAt || sawMaking.current !== mainNow.startedAt) return
    toldReady.current = mainNow.startedAt ?? 0
    agent.notify("(App: Variation 1 is ready. Look at it once with view_flick and fix only clear clashes (text over the product or faces, the strip over the action). Then end with one short line asking the user to play it and press Make the variations in the build card, or say what to change. Don't ask with ask_user.)")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsReview, mainNow.startedAt])
  const changeRef = () => {
    select("main")
    setChatHidden(false)
    agentCtx.focusComposer()
    // the chat asks, in the chat, what to change (it proposes the remake as a Make card)
    agent.notify("(App: the user pressed Change it on the Variation 1 review. Ask in one line what should change in Variation 1; when they answer, propose the remake with set_variation regenerate. Nothing else.)")
  }
  const jobs = useRef(new Set<string>())
  useEffect(() => {
    if (!live || !agentMode) return
    for (const sl of slides) {
      if (!sl.startedAt || sl.startedAt <= 1 || isMadeVideo(sl.video) || !sl.used?.prompt) continue
      const key = `${sl.id}:${sl.startedAt}`
      if (jobs.current.has(key)) continue
      // a job from before a reload: keep checking it (one that never got an id is lost)
      if (sl.job && !sl.job.id && sl.job.status !== "waiting") continue
      const mine = (x: Slide) => x.id === sl.id && x.startedAt === sl.startedAt
      const patchJob = (p: Partial<Slide>) => commitSlides(slidesNow.current.map((x) => (mine(x) ? { ...x, ...p } : x)))
      // variations are made from the finished reference video (they copy its motion, camera and timing),
      // so they wait for it
      const fromRef = sl.id !== "main" && sl.used.fromReference
      const main = slides[0]
      // ...and for the user to approve it: always the latest version of the reference
      const refVideo = isMadeVideo(main.video) && !main.job && main.approvedRef === main.startedAt ? videoAt(main.video!).mp4 : undefined
      if (fromRef && !refVideo && !sl.job?.id) {
        if (!sl.job) patchJob({ job: { status: "waiting", since: Date.now() } })
        continue
      }
      jobs.current.add(key)
      const resume = sl.job?.id
      // which kind of generation fits what we have (see the models skill). Inputs are named by
      // position: [Image 1]… for images, [Video 1]… for videos, as the chat wrote them.
      // reference: edit the user's video · animate the user's image · else stay true to the references
      // variation: always an edit of the approved reference video
      const media = sl.used.media ?? {}
      const pics = media.images ?? []
      const vids = media.videos ?? []
      const end = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`)
      const named = (n: number, word: string) => (n === 1 ? `[${word} 1]` : `[${word} 1] to [${word} ${n}]`)
      const picsLine = pics.length ? ` ${named(pics.length, "Image")} ${pics.length === 1 ? "shows" : "show"} exactly how the change must look: match ${pics.length === 1 ? "it" : "them"}.` : ""
      const keep = "Keep everything else exactly the same: people, product, camera, framing, motion, timing, setting and lighting."
      // a change that comes later in the video: the opening is pinned with timecodes and the reference's first frame
      const keepS = fromRef ? media.keep_seconds : undefined
      const refPoster = fromRef && isMadeVideo(main.video) ? videoAt(main.video!).poster : undefined
      const pinned = keepS && refPoster ? refPoster : undefined
      const openingLine = keepS
        ? ` From 0 to ${keepS} s the video stays exactly as it is, frame for frame: same shot, same motion, nothing added or changed${pinned ? `; ${named(pics.length + 1, "Image").split(" to ").pop()} is its first frame, and the edited video must open on exactly that frame` : ""}. The change happens only after ${keepS} s.`
        : ""
      const plan: VideoInput = fromRef
        ? { mode: "edit", prompt: `Edit the video. Change only this: ${end(sl.used.prompt)}${picsLine}${openingLine} ${keep}`, video: refVideo, images: pinned ? [...pics, pinned] : pics }
        : media.mode === "edit" && media.source
          ? { mode: "edit", prompt: `Edit the video. ${end(sl.used.prompt)} Keep everything not mentioned exactly as it is.`, video: media.source, images: pics, videos: vids }
          : media.first_frame && media.mode !== "reference"
            ? { mode: "image", prompt: sl.used.prompt, image: media.first_frame, endImage: media.last_frame }
            : pics.length || vids.length
              ? { mode: "reference", prompt: end(sl.used.prompt), images: pics, videos: vids }
              : // an older plan with nothing to work from
                { mode: "text", prompt: sl.used.prompt }
      // a chat project never makes a prompt-only video: without its pictures the video would invent a new product or
      // person and still cost credits, so it doesn't start, and the chat says what's missing
      if (plan.mode === "text" && agentMode) {
        jobs.current.delete(key)
        setDev((d) => ({ credits: d.credits + VIDEO_COST }))
        const name = slideName(sl, slidesNow.current.indexOf(sl))
        patchJob({ job: undefined, startedAt: undefined, video: undefined, prompt: sl.used?.prompt, used: undefined, failed: { reason: "No reference images or video for it.", tries: sl.failed?.tries ?? 0 } })
        if (live) agent.notify(`(App: ${name} wasn't started: it has no reference images or video to stay true to, and a video from words alone would invent a new product or person. Refunded. Tell the user in one line and fix the inputs: set the reference images (the product photos, a look or a sheet) with a new storyboard or set_variation, or ask for photos with request_assets.)`)
        continue
      }
      if (!resume) patchJob({ job: { status: "starting", since: Date.now() } })
      // images that only live in this page go to the server first, so the video model can open them
      const share = (u?: string) => (u ? shareable(u).catch(() => undefined) : Promise.resolve(undefined))
      Promise.all([share(plan.image), share(plan.endImage), Promise.all((plan.images ?? []).map(share)), Promise.all((plan.videos ?? []).map(share)), share(plan.video)]).then(([image, endImage, images, videos, video]) =>
      generateVideo({ ...plan, image, endImage, video, images: images.filter((x): x is string => !!x), videos: videos.filter((x): x is string => !!x), aspect: videoAspectOf(generation.size), seconds: generation.duration ?? 8, resume, onId: (id) => commitSlides(slidesNow.current.map((x) => (mine(x) && x.job ? { ...x, job: { ...x.job, id } } : x))), meta: { project: title, variation: slideName(sl, slidesNow.current.indexOf(sl)), purpose: "video", chat: agentMode } }, (status) =>
        commitSlides(slidesNow.current.map((x) => (mine(x) && x.job ? { ...x, job: { ...x.job, status } } : x))),
      )).then(
        async ({ url, poster }) => {
          const still = poster ?? (await posterOf(url)) ?? videoAt(sl.video ?? generation.video ?? 0).poster
          const video = addMadeVideo({ name: `${slideName(sl, slidesNow.current.indexOf(sl))}-${sl.startedAt}`, size: generation.size, mp4: url, poster: still })
          patchJob({ video, job: undefined, failed: undefined })
        },
        (e) => {
          if (!slidesNow.current.some(mine)) return
          setDev((d) => ({ credits: d.credits + VIDEO_COST }))
          const name = slideName(sl, slidesNow.current.findIndex(mine))
          const reason = e instanceof Error ? e.message : "The video failed."
          const tries = (sl.failed?.tries ?? 0) + 1
          patchJob({ job: undefined, startedAt: undefined, video: undefined, prompt: sl.used?.prompt, used: undefined, failed: { reason, tries } })
          // in the chat the build card's tile says it (with Try again); a toast would say it twice
          if (!agentMode) toast({ title: `${name} didn’t generate`, description: `${reason} Credits refunded.` })
          // the chat hears about it: a variation's first failure, it retries once with a gentler change; after that it asks
          if (agentMode && live)
            agent.notify(
              sl.id === "main"
                ? `(App: Variation 1's video failed (${reason}); refunded. Tell the user in one short line; they can press Try again in the build card, or you can regenerate it with a simpler prompt if they ask.)`
                : tries === 1
                  ? `(App: ${name}'s video failed (${reason}); it's back to not started and refunded. Don't remake it yourself. Tell the user in one short line: Try again is on its tile, or you can propose a gentler version of the change (set_variation with regenerate) for them to approve.)`
                  : `(App: ${name} failed again (${reason}); refunded. Don't retry. Tell the user in one short line and suggest a different change, or Try again in the build card.)`,
            )
          // without the reference video, the variations waiting for it can't be made: refunded too
          if (sl.id === "main") {
            const waiting = slidesNow.current.filter((x) => x.job?.status === "waiting")
            if (waiting.length) {
              setDev((d) => ({ credits: d.credits + VIDEO_COST * waiting.length }))
              commitSlides(slidesNow.current.map((x) => (x.job?.status === "waiting" ? { ...x, job: undefined, startedAt: undefined, video: undefined, prompt: x.used?.prompt, used: undefined } : x)))
            }
          }
        },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, agentMode, slides])
  /**
   * Stops a video that isn't being made yet: one waiting for the OK on Variation 1 is simply removed,
   * one in the queue is canceled with the provider. Either way it's refunded. One that has started
   * can't be stopped (the provider refuses), and the toast says so.
   */
  const cancelVideo = async (slideId: string) => {
    const sl = slidesNow.current.find((x) => x.id === slideId)
    if (!sl?.job) return
    const name = slideName(sl, slidesNow.current.indexOf(sl))
    if (sl.job.id) {
      const r = await cancelJob(sl.job.id)
      if (!r.canceled) {
        toast({ title: `${name} is already being made`, description: "A video can't be stopped once it has started." })
        return
      }
    }
    // reset before the job's check sees it was canceled, so it isn't counted as a failure
    const now = slidesNow.current.find((x) => x.id === slideId)
    if (!now) return
    commitSlides(slidesNow.current.map((x) => (x.id === slideId ? { ...x, job: undefined, startedAt: undefined, video: undefined, prompt: x.used?.prompt, used: undefined } : x)))
    setDev((d) => ({ credits: d.credits + VIDEO_COST }))
    toast({ title: `${name} stopped`, description: "It wasn't made, so the credits are back." })
    agent.notify(`(App: the user stopped ${name}'s video before it was made; it's back to not started. Nothing to reply.)`, false)
  }
  /** a failed video, tried again as it was (from the build card) */
  const retryVideo = (slideId: string) => {
    const sl = slidesNow.current.find((x) => x.id === slideId)
    if (!sl?.failed || sl.job) return
    // the failure stays noted until a try succeeds, so the chat's retry count carries on
    startVideo(slideId, sl.prompt ?? "")
  }
  // every variation is made (this session watched them being made): wake the chat once, for a final
  // check of every variation and the hand-over
  const sawVariations = useRef("")
  const toldDone = useRef("")
  const batch = slides.map((x) => x.startedAt ?? 0).join(",")
  if (agentMode && slides.slice(1).some((x) => x.job && x.job.status !== "waiting")) sawVariations.current = batch
  const allMade = slides.length > 1 && slides.every((x) => !x.job && isMadeVideo(x.video)) && mainNow.approvedRef === mainNow.startedAt
  useEffect(() => {
    if (!agentMode || !live || !allMade || toldDone.current === batch || sawVariations.current !== batch) return
    toldDone.current = batch
    agent.notify("(App: every variation is made. Check each once: view_flick on each variation (or review_flick for all of them), fix only real clashes (text over faces or the product, the strip over the action), and make sure each has its label and link. Then hand over in two short lines.)")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMade, batch])
  // the composer in chat mode: talk to the chat, or write a video's prompt yourself
  const chatting = true
  // planning: nothing generated yet, so no editor tools; just the chat and a live preview
  const planning = agentMode && !slides[0].startedAt
  const samplePosters = [1, 2, 3, 4, 5].map((i) => videoAt(inSet(generation.video ?? 0, i)).poster)
  const agentCtx: AgentCtx = {
    videoCost: VIDEO_COST,
    credits: dev.credits,
    addToCanvas: (u) => void agentApi.addImageToCanvas(u),
    focusComposer: () => {
        document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.focus()
    },
    ratio,
    posters: samplePosters.slice(0, Math.max(2, agent.plan?.variations.length ?? 3)),
    brand,
    size: generation.size,
    seconds: generation.duration ?? 8,
    videos: () =>
      slides.map((s) => {
        const st = status(s)
        const v = st === "done" && s.video !== undefined ? videoAt(wrapVideo(s.video)) : undefined
        // can be stopped until it starts: waiting for the OK, or still in the queue
        const stoppable = !!s.job && (s.job.status === "waiting" || s.job.status === "starting" || s.job.status === "queued")
        const failed = !s.job && !isMadeVideo(s.video) && s.failed ? s.failed.reason : undefined
        return { name: nameOf(s), state: st, src: v?.mp4 || undefined, poster: v?.poster, since: s.job?.since ?? s.startedAt, ms: s.job ? undefined : ms, status: s.job?.status, stop: stoppable ? () => void cancelVideo(s.id) : undefined, failed, retry: failed ? () => retryVideo(s.id) : undefined }
      }),
    review: { needed: needsReview, approve: () => approveRef(), change: () => changeRef(), count: slides.filter((x) => x.job?.status === "waiting").length, cost: slides.filter((x) => x.job?.status === "waiting").length * VIDEO_COST },
    proposals: () => proposals.map((p) => ({ id: p.id, name: p.name, change: p.change ?? p.prompt, cost: p.cost, make: () => void makeProposed(p.id), dismiss: () => dropProposed(p.id) })),
    issues: () => publishIssues.filter((x) => !x.blocking).map((x) => x.text),
    progress: () => {
      const vs = slides.slice(1)
      return [
        { label: "Variation 1", state: status(slides[0]) === "done" ? "done" : "working" },
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
    ...(includeRef && !slides[0].thumb ? [{ text: "Add a thumbnail for Variation 1 to export.", blocking: true }] : []),
    ...included.filter(stale).map((s) => ({ text: `${nameOf(s)} was made from an older Variation 1` })),
    ...feeds
      .filter((f) => included.some((s) => !s.feeds?.[f.id]?.trim()))
      .map((f) => ({ text: `Feed ${f.name} is empty on some variations` })),
    // a button that goes nowhere: a warning (the Flick still works), the same rule the chat states
    ...elements
      .filter((e) => e.kind === "button" && e.variant !== "icon" && !(e.linkFeed ? included.every((x) => x.feeds?.[e.linkFeed!]?.trim()) : e.link?.trim()))
      .map((e) => ({ text: `The “${(e as { text?: string }).text?.trim() || "button"}” button has no link${(e as { linkFeed?: string }).linkFeed ? " on some variations" : ""}, so tapping it goes nowhere.` })),
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
    // a job that was running when the version was saved is long gone: a made video shows, anything else is empty
    const slidesBack = snap.slides.map((x) => ({ ...x, job: undefined, failed: undefined, startedAt: x.startedAt ? (isMadeVideo(x.video) ? x.startedAt : undefined) : undefined }))
    commitSlides(slidesBack)
    setFeeds(snap.feeds)
    setStart(snap.start)
    setSelected([])
    setEditing(null)
    if (!snap.slides.some((x) => x.id === active)) setActive("main")
    toast(`Restored ${v.name || `version ${n}`}`)
    return slidesBack
  }
  const [panel, setPanel] = useState<"history" | null>(null)

  // the project saves as you work, so it's in Projects with everything as you left it
  const { copy: _copy, resume: _resume, sample: _sample, back: _back, remixOf: _remixOf, ...base } = generation
  const startSlide = slides.find((x) => x.id === start) ?? slides[1] ?? slides[0]
  // a chat project's picture is only ever its own: a thumbnail or a finished video's still; until then, none (the card shows a placeholder)
  const ownPoster = (x?: Slide) => x?.thumb ?? (isMadeVideo(x?.video) ? videoAt(x!.video!).poster : undefined)
  const poster = agentMode
    ? (ownPoster(startSlide) ?? slides.map(ownPoster).find(Boolean) ?? "")
    : (startSlide.thumb ?? videoAt(startSlide.video ?? generation.video)?.poster ?? videoAt(generation.video).poster)
  const saveProject = (extra?: { versions?: Checkpoint<Snap>[] }) =>
    library.saveProject({ id: generation.id, name: title, size: generation.size, image: poster, video: generation.video, base, snap: snapNow(), versions: extra?.versions ?? versions, sample: generation.sample })
  const deleted = useRef(false)
  // A project exists because the user did something. A template opened and left untouched, or a saved project
  // reopened and only looked at, is never saved (no new card in Projects, no bumped "edited" time): saving starts
  // with the first real change (an element, a feed value, a variation, a video, an export). A chat project and a
  // new generation from Create are the user's work from the start.
  const startSig = useRef<string | null>(null)
  if (startSig.current === null && !firstRun) startSig.current = sig
  const dirtyFromStart = fresh
  const dirty = dirtyFromStart || (startSig.current !== null && sig !== startSig.current)
  useEffect(() => {
    if (!title || deleted.current || !dirty) return
    const t = setTimeout(() => saveProject(), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, sig, versions, dirty])
  const lib = useLibrary()
  const project = lib.projects.find((p) => p.id === generation.id)
  const lastFlick = project?.exports[0] ? lib.flicks.find((f) => f.id === project.exports[0]) : undefined
  // an export from this project still running in the background
  const exportBusy = lib.flicks.some((f) => f.projectId === generation.id && f.exporting)

  // Export: a new Flick from the canvas as it is now, made in the background; marked in Version history
  const exportFlick = (name: string) => {
    const snap = snapNow()
    const variants = included.map((x) => ({ name: nameOf(x), video: x.video ?? generation.video, poster: x.thumb ?? videoAt(x.video ?? generation.video).poster }))
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
  // not while the chat is planning (no canvas yet) or in Preview (the tour points at the editor)
  useEffect(() => {
    if (!mainDone || planning || previewing || ob.toured || ob.tour !== null || ob.spot) return
    const t = setTimeout(() => onboarding.startTour(0), 600)
    return () => clearTimeout(t)
  }, [mainDone, planning, previewing, ob.toured, ob.tour, ob.spot])
  // switching to Preview mid-tour ends it; leaving the editor closes any tour or tip, so neither follows into another project
  useEffect(() => {
    if (previewing && ob.tour !== null) onboarding.endTour()
  }, [previewing, ob.tour])
  useEffect(() => () => onboarding.leaveEditor(), [])
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
          setTitle={setTitle}
          size={generation.size}
          sizeLabel={sizeInfo?.label}
          duration={generation.duration ?? 8}
          onHome={() => (title && dirty && saveProject(), onBack())}
          onDuplicate={() => onDuplicate({ title: `${title} copy`, snap: snapNow() })}
          onHistory={() => setPanel("history")}
          // gone at once, with Undo in the toast, the same as on the Projects page (its Flicks stay)
          onDelete={() => {
            deleted.current = true
            const undo = library.deleteProject(generation.id)
            onBack()
            toast({ title: `“${title || "Untitled project"}” deleted`, description: "Its Flicks stay.", action: { label: "Undo", onClick: undo } })
          }}
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
            title={title || "Untitled project"}
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

      {/* file menu: Version history */}
      {panel === "history" && (
        <VersionHistoryPanel
          versions={versions}
          current={currentVersion}
          onRestore={restore}
          onRename={(n, name) => setVersions((v) => v.map((x) => (x.n === n ? { ...x, name: name || undefined } : x)))}
          onOpenFlick={(id) => (dirty && saveProject(), onOpenFlick(id))}
          onClose={() => setPanel(null)}
        />
      )}




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
                poster: v.video !== undefined && status(v) === "done" ? videoAt(v.video).poster : undefined,
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
          onAddShape={(id) => {
            const def = SHAPES.find((x) => x.id === id) ?? SHAPES[0]
            const w = def.ar >= 4 ? 40 : 30
            // new shapes start gray; lines and arrows as a gray stroke
            add({ kind: "shape", shape: def.shape, w, h: (w * ratio) / def.ar, ar: def.ar, lock: def.ar < 4, fill: def.filled ? SHAPE_GREY : "transparent", stroke: SHAPE_GREY, strokeWidth: def.filled ? 0 : 8, radius: def.shape === "rect" ? 12 : 0, ...(def.points ? { points: def.points } : {}) })
          }}
          onAddLayout={(els) => (setElements((e) => [...e, ...els]), setSelected(els.map((e) => e.id)))}
        />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
        {/* Canvas */}
        <div ref={viewport} className="relative min-h-0 flex-1 touch-none overflow-hidden bg-sidebar px-6 pb-6 pt-16 md:px-10 md:pb-10 md:pt-[72px]">
          {canEdit && !previewing && group.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3" style={{ transform: `translate(${tbOff.x}px, ${tbOff.y}px)` }}>
              <div
                role="toolbar"
                aria-label="Selection options"
                className="pointer-events-auto flex items-center gap-0.5 rounded-2xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
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
                      className="size-8"
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
                      className="size-8"
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
          {/* prompts hidden: a labeled button at the canvas's right edge brings them back */}
          {chatHidden && !previewing && (
            <Button
              data-no-pan
              variant="outline"
              size="sm"
              onClick={() => setChatHidden(false)}
              className="absolute right-3 top-3 z-20 gap-1.5 rounded-2xl bg-popover shadow-sm"
            >
              <HugeiconsIcon icon={BubbleChatIcon} className="size-4" />
              Prompts
              {slides.some((s) => status(s) === "generating") && <Spinner className="size-3.5 text-brand" />}
            </Button>
          )}
          {/* zoom: collapsed to the percentage; opens on hover and while zooming */}
          <div
            data-no-pan
            className="group/zoom absolute bottom-3 right-3 z-20 flex items-center rounded-2xl bg-popover p-1 text-popover-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <Reveal open={zooming}>
              <ZoomTool label="Zoom out" disabled={view.s <= MIN_ZOOM} onClick={() => zoomTo(view.s / 1.25)}>
                <HugeiconsIcon icon={MinusSignIcon} className="size-3.5" />
              </ZoomTool>
            </Reveal>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Fit to screen" onClick={fitView} className="min-w-12 px-1.5 text-xs tabular-nums">
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
                <span className="text-xs font-medium tabular-nums">1:1</span>
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
              className="relative bg-muted shadow-xl ring-1 ring-foreground/10"
              style={{ width: box.w * view.s, height: box.h * view.s, containerType: "size", transform: `translate(${view.x}px, ${view.y}px)`, flexShrink: 0 }}
            >
              {agentMode && !slides[0].startedAt ? (
                // the chat is still planning: nothing generated yet
                <div className="absolute inset-0 grid place-items-center overflow-hidden bg-muted">
                  <GeneratingGradient className="bg-transparent opacity-30" />
                  <div className="relative flex max-w-[75%] flex-col items-center gap-2 text-center">
                    <HugeiconsIcon icon={SparklesIcon} className="size-5 text-brand" />
                    <p className="text-sm font-medium">Planning your Flick</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">Answer a few questions in the chat. Your videos and design show up here once you approve the storyboard.</p>
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
                        focusPromptBox()
                      }}
                      className="absolute bottom-full right-0 z-30 mb-2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-background/90 py-1 pl-2 pr-2.5 text-xs font-medium shadow-sm ring-1 ring-foreground/10 backdrop-blur-md transition-colors hover:bg-background focus-ring"
                    >
                      <span aria-hidden className="size-2 rounded-full bg-destructive" />
                      Needs regenerating
                    </button>
                  )}
                  {/* media is clipped to the frame; the element layer is not, so toolbars can sit above the frame edge */}
                  <div className={cn("absolute inset-0 overflow-hidden transition-opacity", stale(activeSlide) && "opacity-50")}>
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
                      focusPromptBox()
                    }}
                    className="absolute bottom-full right-0 z-30 mb-2 flex items-center gap-1 whitespace-nowrap rounded-full bg-background/90 py-0.5 pl-1.5 pr-2 text-xs font-medium shadow-sm ring-1 ring-foreground/10 backdrop-blur-md transition-colors hover:bg-background focus-ring"
                  >
                    <HugeiconsIcon icon={SparklesIcon} className="size-3 text-brand" />
                    Generate this variation
                  </button>
                  {/* not generated yet: the reference video, faded, under this variation's elements */}
                  <div className="absolute inset-0 overflow-hidden bg-muted">
                    <img loading="lazy" decoding="async" src={videoAt(slides[0].video!).poster} alt="" className="absolute inset-0 size-full object-cover opacity-30 blur-[2px]" />
                  </div>
                  <CanvasStage elements={elements} setElements={setElements} selected={selected} setSelected={setSelected} editing={editing} setEditing={setEditing} ratio={ratio} thumbs={thumbs} activeThumb={activeThumb} feedOf={feedOf} onEditFeed={editFeed} onFeedValue={setFeedValue} feeds={feeds} onAddFeed={addFeed} onSeedFeed={seedFeed} onRenameFeed={renameFeed} onDeleteFeed={deleteFeed} hovered={hovered} selectedThumb={thumbSel} onSelectThumb={pickThumb} readOnly={previewing} onThumb={(n) => included[n] && select(included[n].id)} />
                </>
              ) : (
                <>
                  {/* the generating background: a drifting gradient with a soft band of light passing
                      across; the design stays editable on top */}
                  <GeneratingGradient sweep />
                  <span className="sr-only">
                    {activeSlide.job?.status === "waiting" ? (refReady ? "Waiting for your review of Variation 1" : "Waiting for Variation 1") : `Generating ${nameOf(activeSlide)}`}
                  </span>
                  <CanvasStage elements={elements} setElements={setElements} selected={selected} setSelected={setSelected} editing={editing} setEditing={setEditing} ratio={ratio} thumbs={thumbs} activeThumb={activeThumb} feedOf={feedOf} onEditFeed={editFeed} onFeedValue={setFeedValue} feeds={feeds} onAddFeed={addFeed} onSeedFeed={seedFeed} onRenameFeed={renameFeed} onDeleteFeed={deleteFeed} hovered={hovered} selectedThumb={thumbSel} onSelectThumb={pickThumb} readOnly={previewing} onThumb={(n) => included[n] && select(included[n].id)} />
                </>
              )}
            </div>
          </div>
        </div>
        {!previewing && !firstRun && (
        <SlidesStrip
          slides={slides}
          expectedMs={ms}
          onReorder={(ids) => setSlides((l) => [l[0], ...ids.map((id) => l.find((x) => x.id === id)!).filter(Boolean)])}
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
            focusPromptBox()
          }}
          onRemove={setConfirmRemove}
          start={start}
          onPreview={setPreview}
          stale={stale}
          onRename={(id, name) => patchSlide(id, { name: name || undefined })}
          includeRef
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
          referencePoster={videoAt(slides[0].video!).poster}
        />

        {/* regenerating the reference video: variations will need regenerating too */}

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
            history={[]} /* the chat is the history now; the old prompt log (history) is kept for the lightbox only */
            nameOf={(id) => {
              const s = slides.find((x) => x.id === id)
              return s && nameOf(s)
            }}
            posterOf={(v) => videoAt(wrapVideo(v)).poster}
            isGenerating={(h) => {
              const s = slides.find((x) => x.id === h.slideId)
              return !!s && s.startedAt === h.startedAt && status(s) === "generating"
            }}
            isCurrent={(h) => slides.find((x) => x.id === h.slideId)?.startedAt === h.startedAt}
            onSelect={select}
            target={{ id: activeSlide.id, name: nameOf(activeSlide), poster: activeStatus === "done" ? videoAt(activeSlide.video!).poster : undefined, isReference: activeIndex === 0 }}
            busy={chatting ? false : busy}
            collapsed={chatHidden}
            onCollapse={() => setChatHidden(true)}
            {...(agentMode && {
              title: "Chat",
              // questions waiting for an answer dock above the composer instead
              extra: threadGroups(agent.items.filter((it) => !isDocked(it, agent.pendingIds)), agent, agentCtx),
              // the chat is the only way to ask for a video: asking goes through the Make card, so nothing is made by accident
              head: <div />,
            })}
            composer={
              chatting ? (
                <div className="flex flex-col gap-2">
                  <ApprovalDock agent={agent} ctx={agentCtx} poster={isMadeVideo(slides[0].video) ? videoAt(slides[0].video!).poster : undefined} />
                  <QuestionDeck agent={agent} ctx={agentCtx} />
                  <QuickReplies agent={agent} ctx={agentCtx} />
                  <AgentComposer
                    agent={agent}
                    placeholder={agent.waiting ? "Or reply directly…" : slides[0].startedAt ? "Ask for a change: a headline, a color, another variation. Type @ to mention a photo or variation" : undefined}
                    variations={slides[0].startedAt ? slides.map((x) => ({ name: nameOf(x), poster: x.video !== undefined ? videoAt(wrapVideo(x.video))?.poster : undefined })) : undefined}
                    brand={!!brand}
                  />
                </div>
              ) : null
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
        <Button variant="ghost" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick} className="size-7 shrink-0">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** a video the chat asked for, waiting for the user's Make */
type VideoProposal = { id: string; slideId: string; name: string; prompt: string; change?: string; keep_seconds?: number; cost: number; at: number }

const VARIATION_PROMPTS = ["Same scene, the second colorway", "Same scene, the third colorway, warmer light"]

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
