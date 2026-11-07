import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import { HelpCircleIcon } from "@hugeicons/core-free-icons"
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FlicksLogo } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RecipeCards } from "@/components/recipes"
import { withTransition } from "@/lib/transition"
import { isTyping } from "@/lib/keys"
import { AppSidebar, type Appearance } from "@/components/app-sidebar"
import { PromptComposer } from "@/components/prompt-composer"
import { TemplateGallery } from "@/components/template-gallery"
import { Toaster } from "@/components/ui-extra/toaster"
import { FlicksPage, ProjectsPage } from "@/components/flicks-page"
import { CoachLayer } from "@/onboarding/coach"
import { CAPTURE, onboarding } from "@/onboarding/onboarding"
import { SAMPLE_ID, sampleProject } from "@/onboarding/sample"
import { useDevAction } from "@/dev/dev-actions"
import { AccountSkeleton, ChatSkeleton, DetailSkeleton, EditorSkeleton, FlickPageSkeleton, GridSkeleton, PageLoader, TableSkeleton } from "@/components/page-skeletons"
import { WelcomeGiftDialog, WELCOME_CREDITS } from "@/components/welcome-gift-page"
import { type Generation } from "@/components/generation-canvas"
import { templateRef, type Template } from "@/data"
import { getLibrary, library, useLibrary, type FlickRecord, type Project } from "@/library"
import { DEV_TOOLS, useDevState } from "@/dev/state"
import { DevWidget } from "@/dev/dev-widget"
import { OpenAnalytics } from "@/analytics/open-analytics"
import type { AnalyticsTarget } from "@/analytics/analytics-page"
import type { Profile } from "@/components/onboarding-page"
import { embeds } from "@/embeds/embeds"
import { ads } from "@/ads/ads"
import { useToast } from "@/components/ui-extra/toaster"

// pages and dev tools load when first opened, so the first screen arrives sooner
const HowFlicksWork = lazy(() => import("@/components/how-flicks-work").then((m) => ({ default: m.HowFlicksWork })))
const OnboardingPage = lazy(() => import("@/components/onboarding-page").then((m) => ({ default: m.OnboardingPage })))
const CommandPalette = lazy(() => import("@/components/command-palette").then((m) => ({ default: m.CommandPalette })))
const StateManager = lazy(() => import("@/dev/state-manager").then((m) => ({ default: m.StateManager })))
const ComponentGallery = lazy(() => import("@/dev/component-gallery").then((m) => ({ default: m.ComponentGallery })))
const PrdDialog = lazy(() => import("@/dev/prd").then((m) => ({ default: m.PrdDialog })))
const EmailGallery = lazy(() => import("@/dev/email-gallery").then((m) => ({ default: m.EmailGallery })))
const HfRequests = lazy(() => import("@/dev/hf-requests").then((m) => ({ default: m.HfRequests })))
const ChatMetricsDialog = lazy(() => import("@/dev/chat-metrics").then((m) => ({ default: m.ChatMetricsDialog })))
const AnalyticsRoute = lazy(() => import("@/analytics/analytics-route").then((m) => ({ default: m.AnalyticsRoute })))
const CampaignsPage = lazy(() => import("@/ads/campaigns-page").then((m) => ({ default: m.CampaignsPage })))
const EmbedsPage = lazy(() => import("@/embeds/embeds-page").then((m) => ({ default: m.EmbedsPage })))
const AdBalancePage = lazy(() => import("@/ads/ad-balance-page").then((m) => ({ default: m.AdBalancePage })))
const AccountPage = lazy(() => import("@/components/account-page").then((m) => ({ default: m.AccountPage })))
const CreditsPage = lazy(() => import("@/components/credits-page").then((m) => ({ default: m.CreditsPage })))
const FlickPage = lazy(() => import("@/components/flick-page").then((m) => ({ default: m.FlickPage })))
const AssetsPage = lazy(() => import("@/components/assets-page").then((m) => ({ default: m.AssetsPage })))
const LoginPage = lazy(() => import("@/components/login-page").then((m) => ({ default: m.LoginPage })))
const GenerationCanvas = lazy(() => import("@/components/generation-canvas").then((m) => ({ default: m.GenerationCanvas })))
const TemplatePreview = lazy(() => import("@/components/template-preview").then((m) => ({ default: m.TemplatePreview })))

export default function App() {
  const [template, setTemplate] = useState<Template | null>(null)
  const [prompt, setPrompt] = useState("")
  const [size, setSize] = useState("1080×1080")
  const [pulse] = useState(0)
  const [page, setPage] = useState("Create")
  // a placement to open on Campaigns (from the editor's Serve in ads)
  const [adsTarget, setAdsTarget] = useState<string | null>(null)
  // an embed to open on Embeds (from a Flick page)
  const [embedTarget, setEmbedTarget] = useState<string | null>(null)
  // each sidebar click opens its page fresh (e.g. Campaigns from inside a placement goes back to the list)
  const [navCount, setNavCount] = useState(0)
  const openEmbed = (id: string) => (setEmbedTarget(id), setPage("Embeds"))
  const [generation, setGeneration] = useState<Generation | null>(null)
  const { state: dev, update: setDev } = useDevState()
  // the Flick page open
  const [flickId, setFlickId] = useState<string | null>(null)
  const openFlickPage = (id: string) => {
    setFlickId(id)
    setAdsTarget(null)
    setPage("Flick")
    scroller.current?.scrollTo({ top: 0 })
  }
  /** how a sample opens when it has no saved canvas: made already, from its product set */
  const sampleBase = (size: string, video: number) => ({
    // sunglasses 0–4, boots 5–7, dresses 8–9
    prompt: FLICK_PROMPTS[video < 5 ? 0 : video < 8 ? 1 : 2],
    size,
    references: 0,
    refs: [],
    startedAt: 1,
    video,
  })
  // open a project in the editor, as it was left
  const openProject = (p: Project) => {
    const base = (p.base as Omit<Generation, "id"> | undefined) ?? sampleBase(p.size, p.video)
    setGeneration({ ...base, id: p.id, resume: { title: p.name, snap: p.snap, versions: p.versions }, sample: !p.snap && !p.base, back: "Projects" })
    setPage("Generate")
  }
  // Remix: a new project from a Flick's exact state, named "<Flick>_copy"
  const remix = (f: FlickRecord) => {
    const base = (f.base as Omit<Generation, "id"> | undefined) ?? sampleBase(f.size, f.video ?? 0)
    setGeneration({ ...base, id: crypto.randomUUID(), resume: { title: `${f.name}_copy`, snap: f.snap }, sample: !f.snap, remixOf: f.name, back: "Flick" })
    setPage("Generate")
  }
  // onboarding: the sample project and Help
  const openSample = () => {
    const s = sampleProject()
    setGeneration({ ...s.generation, resume: { title: s.title, snap: s.snap, versions: getLibrary().projects.find((p) => p.id === SAMPLE_ID)?.versions }, back: page === "Generate" ? "Create" : page })
    setPage("Generate")
  }
  const remixById = (id: string) => {
    const f = getLibrary().flicks.find((x) => x.id === id)
    if (f) remix(f)
  }
  // dev tools: start onboarding over (tour, tips, Campaigns intro)
  useDevAction({ id: "reset-onboarding", label: "Reset onboarding", run: () => onboarding.reset() })
  // dev: "New to ads" clears campaigns and funds; off brings the samples back
  const adsFirst = useRef(true)
  // dev: empty Projects / Flicks; off brings the samples back
  const libFirst = useRef(true)
  useEffect(() => {
    if (libFirst.current) return void (libFirst.current = false)
    library.reset({ projects: !dev.projectsEmpty, flicks: !dev.flicksEmpty })
  }, [dev.projectsEmpty, dev.flicksEmpty])
  const embedsFirst = useRef(true)
  useEffect(() => {
    if (embedsFirst.current) return void (embedsFirst.current = false)
    embeds.reset(dev.embedsEmpty)
  }, [dev.embedsEmpty])
  useEffect(() => {
    if (adsFirst.current) return void (adsFirst.current = false)
    ads.reset(dev.adsEmpty)
    setDev({ adBalance: dev.adsEmpty ? 0 : 2747 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev.adsEmpty])
  const credits = dev.credits
  const addCredits = (n: number) => setDev((s) => ({ credits: s.credits + n }))
  const [stateManagerOpen, setStateManagerOpen] = useState(false)
  const [componentsOpen, setComponentsOpen] = useState(false)
  const [prdOpen, setPrdOpen] = useState(false)
  const [emailsOpen, setEmailsOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)
  // Analytics opened on one Flick (from its page); the sidebar opens the overview
  const [analyticsTarget, setAnalyticsTarget] = useState<AnalyticsTarget | null>(null)
  const openAnalytics = useCallback((t: AnalyticsTarget) => {
    setAnalyticsTarget(t)
    setPage("Analytics")
    scroller.current?.scrollTo({ top: 0 })
  }, [])
  const [buyOpen, setBuyOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pageRef = useRef(page)
  pageRef.current = page
  const newVideoRef = useRef(() => {})
  // the palette's code loads on first ⌘K
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !paletteOpen) (e.preventDefault(), setPaletteOpen(true))
      // N: a new video, from anywhere outside a text box (not in the editor, which has its own keys)
      else if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e) && pageRef.current !== "Generate") (e.preventDefault(), newVideoRef.current())
    }
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
  }, [paletteOpen])
  const [autoOpen, setAutoOpen] = useState(false)
  // remembered in this browser; Light until the user picks
  const [appearance, setAppearanceNow] = useState<Appearance>(() => {
    try {
      const a = localStorage.getItem("flam.appearance")
      return a === "dark" || a === "auto" || a === "light" ? a : "auto"
    } catch {
      return "auto"
    }
  })
  // switching theme cross-fades the whole page
  const setAppearance = useCallback((a: Appearance) => {
    try {
      localStorage.setItem("flam.appearance", a)
    } catch {
      /* storage blocked: kept for this visit */
    }
    withTransition(() => setAppearanceNow(a), "theme")
  }, [])
  const scroller = useRef<HTMLDivElement>(null)

  // Auto follows the OS setting and updates live when it changes (applied before paint, so the
  // theme cross-fade captures the new colors)
  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () =>
      document.documentElement.classList.toggle("dark", appearance === "dark" || (appearance === "auto" && mq.matches))
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [appearance])

  // clicking a template opens its page; Use as reference there hands its pattern to the chat
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const openTemplate = (t: Template) => {
    setPreviewTemplate(t)
    setPage("Template")
    scroller.current?.scrollTo({ top: 0 })
  }
  // templates never open in the editor: the chat gets the pattern (mechanic, variations, size, length,
  // copy as a tone example, layout) and asks for the user's own brand and product
  const useTemplate = (t: Template) => {
    const ref = templateRef(t)
    const prompt = [
      `Make a Flick like the “${t.title}” template (${t.mechanic}): ${t.description}`,
      `Same pattern: ${ref.variants.length} variations viewers switch between (in the template: ${ref.variants.join(", ")}), ${t.size}, ${ref.duration} seconds, headline at the top, button below the middle, thumbnail strip at the bottom.`,
      `Its copy is only an example of tone and length: headline “${t.headline}”, button “${t.cta}”. Write mine fresh.`,
      `Use my own brand and product, not the template’s: ask me what they are, and for photos if you need them.`,
    ].join("\n")
    setGeneration({ id: crypto.randomUUID(), prompt, size: t.size, duration: ref.duration, references: 0, refs: [], startedAt: 0, video: 0, agent: true, fromTemplate: ref })
    setPage("Generate")
    setTemplate(null)
  }

  // who's signed in: the email from sign-in, the rest from onboarding
  const [account, setAccount] = useState<{ email: string; name?: string }>({ email: "divyansh@flamapp.ai", name: "Divyansh Gupta" })
  const [profile, setProfile] = useState<Profile | null>(null)
  const [photo, setPhoto] = useState<string | undefined>()
  const [welcome, setWelcome] = useState<string | null>(null)
  // until we know their name, a tidy version of the email's first part
  const name = profile?.name || account.name || account.email.split("@")[0].split(/[._-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  const firstName = name.split(" ")[0]
  const isDark = () => document.documentElement.classList.contains("dark")
  const signOut = () => {
    setDev({ loggedIn: false })
    setPage("Create")
    setGeneration(null)
  }

  // a page shows its skeleton briefly when opened, as if loading (State manager › Page load time)
  const loadKey = `${navCount}:${page}:${adsTarget ?? ""}:${embedTarget ?? ""}:${flickId ?? ""}`
  // the browser tab names the page ("Projects · Flicks"); the editor, the Flick page and Help set their own
  useEffect(() => {
    if (page === "Generate" || page === "Flick") return
    const name = page === "Template" ? previewTemplate?.title : page
    document.title = name && page !== "Create" ? `${name} · Flicks` : "Flicks"
  }, [page, previewTemplate])
  // dev tools float on every screen
  // links from the Help Center open the app on the sample project, or start the tour there
  useEffect(() => {
    const h = location.hash
    if (!h.includes("start=")) return
    history.replaceState(null, "", location.pathname + location.search)
    openSample()
    if (h.includes("start=tour")) setTimeout(() => onboarding.startTour(0), 600)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const devLayer = DEV_TOOLS && !CAPTURE && (
    <>
      <DevWidget onStateManager={() => setStateManagerOpen(true)} onComponents={() => setComponentsOpen(true)} onPrd={() => setPrdOpen(true)} onEmails={() => setEmailsOpen(true)} onRequests={() => setRequestsOpen(true)} onMetrics={() => setMetricsOpen(true)} />
      <Suspense fallback={null}>
        {stateManagerOpen && <StateManager open={stateManagerOpen} onOpenChange={setStateManagerOpen} />}
        {componentsOpen && <ComponentGallery open={componentsOpen} onOpenChange={setComponentsOpen} />}
        {prdOpen && <PrdDialog open={prdOpen} onOpenChange={setPrdOpen} />}
        {emailsOpen && <EmailGallery open={emailsOpen} onOpenChange={setEmailsOpen} />}
        {requestsOpen && <HfRequests open={requestsOpen} onOpenChange={setRequestsOpen} />}
        {metricsOpen && <ChatMetricsDialog open={metricsOpen} onOpenChange={setMetricsOpen} />}
      </Suspense>
    </>
  )
  const navigate = (p: string) => {
    setAdsTarget(null)
    setEmbedTarget(null)
    setAnalyticsTarget(null)
    setNavCount((n) => n + 1)
    setPage(p)
    scroller.current?.scrollTo({ top: 0 })
  }
  // a new video: Create, with the prompt box focused
  const newVideo = () => {
    navigate("Create")
    setTimeout(() => document.querySelector<HTMLTextAreaElement>("[data-create-prompt] textarea")?.focus(), 350)
  }
  newVideoRef.current = newVideo
  const dark = appearance === "dark" || (appearance === "auto" && isDark())
  const toggleTheme = () => setAppearance(isDark() ? "light" : "dark")

  if (dev.loggedIn && !dev.onboarded)
    return (
      <TooltipProvider delayDuration={300}>
        <Toaster>
          <Suspense fallback={null}>
          <OnboardingPage
            email={account.email}
            initialName={account.name}
            onDone={(p) => {
              setProfile(p)
              setWelcome(p.name.split(" ")[0])
              setPage("Create")
              // a new account starts at 0: How Flicks work, then the welcome gift, open on Create
              setDev({ onboarded: true, welcomeGift: true, featureIntro: true, credits: 0 })
              // and the editor tour and tips are still to come
              onboarding.reset()
            }}
            onSignOut={signOut}
            dark={dark}
            onToggleTheme={toggleTheme}
          />
          </Suspense>
          {devLayer}
        </Toaster>
      </TooltipProvider>
    )

  if (!dev.loggedIn)
    return (
      <TooltipProvider delayDuration={300}>
        <Toaster>
          <Suspense fallback={null}>
          <LoginPage
            onSignIn={(email, n) => {
              // the same person signing back in keeps their details
              if (email !== account.email) {
                setAccount({ email, name: n })
                setProfile(null)
              } else if (n) setAccount({ email, name: n })
              setDev({ loggedIn: true })
            }}
            dark={dark}
            onToggleTheme={toggleTheme}
          />
          </Suspense>
          {devLayer}
        </Toaster>
      </TooltipProvider>
    )

  return (
    <OpenAnalytics.Provider value={openAnalytics}>
    <TooltipProvider delayDuration={300}>
      <Toaster>
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            onNavigate={navigate}
            onOpenProject={openProject}
            onOpenFlick={openFlickPage}
            onNew={newVideo}
            onHowItWorks={() => (navigate("Create"), setDev({ featureIntro: true }))}
            dark={dark}
            onToggleTheme={toggleTheme}
          />
        </Suspense>
      )}
      {welcome && !dev.featureIntro && !dev.welcomeGift && <Welcome name={welcome} onShown={() => setWelcome(null)} />}
      <div className="flex h-screen bg-sidebar text-foreground">
        <AppSidebar page={page === "Flick" ? "Flicks" : page} onNavigate={navigate} onSearch={() => setPaletteOpen(true)} credits={credits} onAddCredits={addCredits} buyOpen={buyOpen} onBuyOpenChange={setBuyOpen} autoOpen={autoOpen} onAutoOpenChange={setAutoOpen} appearance={appearance} onAppearanceChange={setAppearance} name={name} email={account.email} photo={photo} />

        <main className="flex min-w-0 flex-1 flex-col gap-2 p-2 md:pl-0">
          <header className="flex h-10 items-center px-2 md:hidden">
            <button type="button" aria-label="Flicks home" onClick={() => (setAdsTarget(null), setPage("Create"))} className="rounded-lg focus-ring">
              <FlicksLogo className="h-6 text-foreground" />
            </button>
          </header>
          <div
            ref={scroller}
            className="relative min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border/60 bg-background shadow-sm"
          >
            {page === "Template" && previewTemplate ? (
              <Suspense fallback={<DetailSkeleton />}><TemplatePreview t={previewTemplate} onBack={() => setPage("Create")} onUse={useTemplate} onOpen={openTemplate} /></Suspense>
            ) : page === "Campaigns" ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={adsTarget ? <DetailSkeleton stats={4} /> : <TableSkeleton />}>
<CampaignsPage key={`${navCount}-${adsTarget ?? "list"}`} openPlacement={adsTarget} onAdBalance={() => setPage("Ad Balance")} onRemixFlick={remixById} onOpenFlick={openFlickPage} />
              </Loaded>
            ) : page === "Embeds" ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={embedTarget ? <DetailSkeleton /> : <GridSkeleton count={5} filters={0} action cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />}>
<EmbedsPage key={`${navCount}-${embedTarget ?? "list"}`} openEmbed={embedTarget} onRemixFlick={remixById} onOpenFlick={openFlickPage} />
              </Loaded>
            ) : page === "Ad Balance" ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={<AccountSkeleton stats={2} />}>
<AdBalancePage email={account.email} onCampaigns={() => (setAdsTarget(null), setPage("Campaigns"))} />
              </Loaded>
            ) : page === "Analytics" ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={<DetailSkeleton stats={4} />}>
                <AnalyticsRoute key={`${navCount}-${analyticsTarget?.id ?? "all"}`} target={analyticsTarget} />
              </Loaded>
            ) : page === "Assets" ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={<GridSkeleton count={12} filters={2} cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" />}>
<AssetsPage
                onCreate={() => setPage("Create")}
                onUse={(a) => {
                  // a new chat project with this video (or photo) attached as a reference; the chat plans from it
                  const ref = { id: a.id, name: a.name, url: a.url, loading: false, media: a.kind }
                  const prompt = a.kind === "video" ? "Make a Flick from this video. Use it as it is for Variation 1." : "Make a Flick with this image as the product reference."
                  setGeneration({ id: crypto.randomUUID(), prompt, size: "1080×1080", duration: 8, references: 1, refs: [ref], startedAt: 0, video: 0, agent: true, back: "Assets" })
                  setPage("Generate")
                }}
              />
              </Loaded>
            ) : page === "Account" ? (
              <Suspense fallback={<AccountSkeleton />}>
              <AccountPage
                email={account.email}
                profile={profile ?? { ...SAMPLE_PROFILE, name: account.name ?? SAMPLE_PROFILE.name }}
                photo={photo}
                onPhoto={setPhoto}
                onSave={(p) => {
                  setProfile(p)
                  setAccount((a) => ({ ...a, name: p.name }))
                }}
                onSignOut={signOut}
              />
              </Suspense>
            ) : page === "Projects" ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={<GridSkeleton />}>
<ProjectsPage onOpen={openProject} onCreate={() => setPage("Create")} />
              </Loaded>
            ) : page === "Flicks" ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={<GridSkeleton />}>
<FlicksPage onOpen={(f) => openFlickPage(f.id)} onRemix={remix} onProjects={() => setPage("Projects")} />
              </Loaded>
            ) : page === "Flick" && flickId ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={<FlickPageSkeleton />}>
<FlickPage
                key={flickId}
                id={flickId}
                onBack={() => setPage("Flicks")}
                onRemix={remix}
                onOpenProject={(id) => {
                  const p = getLibrary().projects.find((x) => x.id === id)
                  if (p) openProject(p)
                }}
                onAnalytics={() => (setAnalyticsTarget({ kind: "flick", id: flickId }), setPage("Analytics"))}
                onOpenPlacement={(id) => (setAdsTarget(id), setPage("Campaigns"))}
                onOpenEmbed={openEmbed}
              />
              </Loaded>
            ) : page === "Credits" ? (
              <Loaded k={loadKey} ms={dev.pageLoadMs} s={<AccountSkeleton />}>
<CreditsPage email={account.email} onGetCredits={() => setBuyOpen(true)} onAutoReload={() => setAutoOpen(true)} />
              </Loaded>
            ) : (
            <>
            {/* Hero: calm warm page, the prompt is the one focal point */}
            <section className="@container relative px-4 pb-20 pt-16 md:pt-24">
              <div className="relative mx-auto flex max-w-[760px] flex-col items-center gap-7">
                <div className="space-y-3 text-center">
                  <h1 className="text-balance text-4xl font-semibold tracking-tighter md:text-5xl">
                    Hey {firstName}, let’s start with a video
                  </h1>
                  <p className="text-sm text-muted-foreground md:text-base">Describe it, add photos or videos, and make variations next.</p>
                </div>
                <PromptComposer
                  onGenerate={(g) => {
                    // nothing generates yet: the chat plans the Flick first, asks where it runs and sets the size (a square until then)
                    setGeneration({ ...g, size: "1080×1080", duration: 8, id: crypto.randomUUID(), startedAt: 0, video: 0, agent: true })
                    setPage("Generate")
                    setTemplate(null)
                  }}
                  template={template}
                  onClearTemplate={() => setTemplate(null)}
                  prompt={prompt}
                  setPrompt={setPrompt}
                  size={size}
                  setSize={setSize}
                  pulse={pulse}
                />
                {/* starter ideas: fill the box with an example to edit (hidden once something is typed) */}
                <div className={cn("flex flex-wrap justify-center gap-2 transition-opacity duration-200", prompt.trim() && "pointer-events-none opacity-0")} aria-hidden={!!prompt.trim()}>
                  <Button variant="ghost" size="sm" onClick={() => setDev({ featureIntro: true })} className="gap-1.5 font-normal text-muted-foreground">
                    <HugeiconsIcon icon={HelpCircleIcon} className="size-4" />
                    How Flicks work
                  </Button>
                </div>
                {/* recipes: start from what you have; the short form hands everything to the AI chat */}
                <div className="w-[min(1040px,calc(100cqw-2rem))]">
                  <RecipeCards
                    onStart={(r) => {
                      setGeneration((prev) => ({
                        id: crypto.randomUUID(),
                        prompt: r.prompt,
                        size: r.size,
                        duration: r.duration,
                        references: r.refs.length,
                        refs: r.refs,
                        startedAt: 0,
                        video: 0,
                        agent: true,
                        recipe: r.recipe,
                      }))
                      setPage("Generate")
                      setTemplate(null)
                    }}
                  />
                </div>
                {dev.featureIntro && <Suspense fallback={null}><HowFlicksWork open={dev.featureIntro} onOpenChange={(o) => setDev({ featureIntro: o })} /></Suspense>}
                {/* the welcome gift follows How Flicks work */}
                <WelcomeGiftDialog
                  key={String(dev.welcomeGift)}
                  open={dev.welcomeGift && !dev.featureIntro}
                  name={name.split(" ")[0]}
                  onClaim={() => addCredits(WELCOME_CREDITS)}
                  onDone={() => setDev({ welcomeGift: false })}
                />
              </div>
            </section>

            {/* Templates sheet, pulled up so the first row sits above the fold */}
            <section id="templates" className="relative scroll-mt-4 px-3 pb-3 md:px-4 md:pb-4">
              <TemplateGallery onUse={openTemplate} />
            </section>
            </>
            )}
          </div>
        </main>
      </div>
      {/* Full-screen generation canvas, above the app shell */}
      {page === "Generate" && generation && (
        <div className="fixed inset-0 z-40 bg-background">
          {/* the editor loads its project first */}
          <Loaded k={generation.id} ms={dev.pageLoadMs} s={chatPlanning(generation) ? <ChatSkeleton /> : <div className="flex h-full flex-col"><div className="flex h-14 shrink-0 items-center gap-3 border-b px-4"><Skeleton className="h-5 w-40 rounded-md" /><Skeleton className="ml-auto h-9 w-48 rounded-xl" /><Skeleton className="h-9 w-24 rounded-xl" /></div><EditorSkeleton /></div>}>
          <GenerationCanvas key={generation.id} generation={generation} onFormat={(size, duration) => setGeneration((g) => (g ? { ...g, size, ...(duration ? { duration } : {}) } : g))} onBack={() => setPage(generation.back === "Flick" && !flickId ? "Flicks" : (generation.back ?? "Create"))} onGetCredits={() => setBuyOpen(true)} onOpenFlick={openFlickPage}
            onDuplicate={(copy) => setGeneration((g) => (g ? { ...g, id: crypto.randomUUID(), copy, resume: undefined, sample: false, remixOf: undefined } : g))}
          />
          </Loaded>
        </div>
      )}
      <ExportWatcher onOpen={openFlickPage} />
      <SyncWatcher />
      <CoachLayer />
      {devLayer}
    </Toaster>
    </TooltipProvider>
    </OpenAnalytics.Provider>
  )
}

/** Flicks preparing in the background: when one finishes, mark it ready and say so, with View Flick. */
/** the server couldn't be reached when the app opened: one toast, so the user knows their work stays in this browser */
function SyncWatcher() {
  const toast = useToast()
  useEffect(() => {
    const on = () => toast({ title: "Couldn’t reach the AI server", description: "Your projects and Flicks are kept in this browser until it’s back; the chat can’t start." })
    window.addEventListener("flam:sync-failed", on)
    return () => window.removeEventListener("flam:sync-failed", on)
  }, [toast])
  return null
}

function ExportWatcher({ onOpen }: { onOpen: (id: string) => void }) {
  const { flicks } = useLibrary()
  const toast = useToast()
  const running = flicks.filter((f) => f.exporting)
  const key = running.map((f) => f.id).join(",")
  useEffect(() => {
    const timers = running.map((f) =>
      setTimeout(() => {
        library.finishExport(f.id)
        toast({ title: `“${f.name}” is ready`, description: "Share it, embed it or serve it in ads.", action: { label: "View Flick", onClick: () => onOpen(f.id) } })
      }, Math.max(0, f.exporting!.until - Date.now())),
    )
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

/** A chat-made project that hasn't generated yet opens in the chat view (no canvas yet). */
const chatPlanning = (g: Generation) => !!g.agent && !(g.resume?.snap as { slides?: { startedAt?: number }[] } | undefined)?.slides?.[0]?.startedAt

/** What the sample Flicks' reference videos were made from, matching their product set. */
const FLICK_PROMPTS = [
  "Athlete in black tee against a sunlit concrete wall, slow push-in, gold-lens sport sunglasses, then a street run at golden hour",
  "Wheat leather 6-inch boot on wet black rock in heavy rain, slow macro push along the stitching, then a splash as the boot lands",
  "Model in a rust tiered halter gown walking a sunlit stone alley, then a slow twirl seen from above, warm golden light",
]

/** One toast after onboarding. */
function Welcome({ name, onShown }: { name: string; onShown: () => void }) {
  const toast = useToast()
  useEffect(() => {
    toast({ title: `Welcome to Flicks, ${name}`, description: "Start with a prompt, or pick a template below." })
    onShown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/** What a set-up account looks like when the prototype starts signed in. */
const SAMPLE_PROFILE: Profile = {
  name: "Divyansh Gupta",
  company: "Flam",
  website: "flamapp.ai",
  goals: ["ads", "videos"],
  type: "Brand",
  size: "51–200",
  industry: "Media & entertainment",
}


/** A page behind its skeleton for a moment; a stable component so re-renders don't reload it. */
function Loaded({ k, ms, s: skeleton, children }: { k: string; ms: number; s: React.ReactNode; children: React.ReactNode }) {
  return (
    <PageLoader key={k} ms={ms} skeleton={skeleton}>
      <Suspense fallback={skeleton}>{children}</Suspense>
    </PageLoader>
  )
}
