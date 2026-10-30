import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import { HelpCircleIcon } from "@hugeicons/core-free-icons"
import { useCallback, useEffect, useRef, useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FlicksLogo } from "@/components/brand"
import { HowFlicksWork } from "@/components/how-flicks-work"
import { Button } from "@/components/ui/button"
import { AppSidebar, type Appearance } from "@/components/app-sidebar"
import { PromptComposer } from "@/components/prompt-composer"
import { TemplateGallery } from "@/components/template-gallery"
import { TemplatePreview } from "@/components/template-preview"
import { Toaster } from "@/components/ui-extra/toaster"
import { FlicksPage, ProjectsPage } from "@/components/flicks-page"
import { FlickPage } from "@/components/flick-page"
import { CoachLayer } from "@/onboarding/coach"
import { CAPTURE, onboarding } from "@/onboarding/onboarding"
import { SAMPLE_ID, sampleProject } from "@/onboarding/sample"
import { useDevAction } from "@/dev/dev-actions"
import { AccountSkeleton, DetailSkeleton, EditorSkeleton, FlickPageSkeleton, GridSkeleton, PageLoader, TableSkeleton } from "@/components/page-skeletons"
import { CreditsPage } from "@/components/credits-page"
import { WelcomeGiftDialog, WELCOME_CREDITS } from "@/components/welcome-gift-page"
import { GenerationCanvas, type Generation } from "@/components/generation-canvas"
import { REFERENCE_VIDEOS } from "@/components/editor/elements"
import { type Template } from "@/data"
import { getLibrary, library, useLibrary, type FlickRecord, type Project } from "@/library"
import { DEV_TOOLS, useDevState } from "@/dev/state"
import { StateManager } from "@/dev/state-manager"
import { ComponentGallery } from "@/dev/component-gallery"
import { PrdDialog } from "@/dev/prd"
import { DevWidget } from "@/dev/dev-widget"
import { AnalyticsRoute } from "@/analytics/analytics-route"
import { OpenAnalytics } from "@/analytics/open-analytics"
import type { AnalyticsTarget } from "@/analytics/analytics-page"
import { EmailGallery } from "@/dev/email-gallery"
import { LoginPage } from "@/components/login-page"
import { OnboardingPage, type Profile } from "@/components/onboarding-page"
import { AccountPage } from "@/components/account-page"
import { AssetsPage } from "@/components/assets-page"
import { CampaignsPage } from "@/ads/campaigns-page"
import { EmbedsPage } from "@/embeds/embeds-page"
import { embeds } from "@/embeds/embeds"
import { AdBalancePage } from "@/ads/ad-balance-page"
import { ads } from "@/ads/ads"
import { useToast } from "@/components/ui-extra/toaster"

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
  // Analytics opened on one Flick (from its page); the sidebar opens the overview
  const [analyticsTarget, setAnalyticsTarget] = useState<AnalyticsTarget | null>(null)
  const openAnalytics = useCallback((t: AnalyticsTarget) => {
    setAnalyticsTarget(t)
    setPage("Analytics")
    scroller.current?.scrollTo({ top: 0 })
  }, [])
  const [buyOpen, setBuyOpen] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)
  const [appearance, setAppearance] = useState<Appearance>("light")
  const scroller = useRef<HTMLDivElement>(null)

  // Auto follows the OS setting and updates live when it changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () =>
      document.documentElement.classList.toggle("dark", appearance === "dark" || (appearance === "auto" && mq.matches))
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [appearance])

  // clicking a template opens its page; Use template there opens a ready-made canvas
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  // templates saved from the editor, shown first in the gallery
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([])
  const openTemplate = (t: Template) => {
    setPreviewTemplate(t)
    setPage("Template")
    scroller.current?.scrollTo({ top: 0 })
  }
  const useTemplate = (t: Template) => {
    setGeneration({ id: crypto.randomUUID(), prompt: t.prompt, size: t.size, ...(t.duration ? { duration: t.duration } : {}), references: 0, refs: [], startedAt: 0, video: t.video ?? 0, template: t })
    setPage("Generate")
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
      <DevWidget onStateManager={() => setStateManagerOpen(true)} onComponents={() => setComponentsOpen(true)} onPrd={() => setPrdOpen(true)} onEmails={() => setEmailsOpen(true)} />
      <StateManager open={stateManagerOpen} onOpenChange={setStateManagerOpen} />
      {componentsOpen && <ComponentGallery open={componentsOpen} onOpenChange={setComponentsOpen} />}
      <PrdDialog open={prdOpen} onOpenChange={setPrdOpen} />
      {emailsOpen && <EmailGallery open={emailsOpen} onOpenChange={setEmailsOpen} />}
    </>
  )
  const dark = appearance === "dark" || (appearance === "auto" && isDark())
  const toggleTheme = () => setAppearance(isDark() ? "light" : "dark")

  if (dev.loggedIn && !dev.onboarded)
    return (
      <TooltipProvider delayDuration={300}>
        <Toaster>
          <OnboardingPage
            email={account.email}
            initialName={account.name}
            onDone={(p) => {
              setProfile(p)
              setWelcome(p.name.split(" ")[0])
              setPage("Create")
              // a new account starts at 0: How Flicks work, then the welcome gift, open on Create
              setDev({ onboarded: true, welcomeGift: true, featureIntro: true, credits: 0 })
            }}
            onSignOut={signOut}
            dark={dark}
            onToggleTheme={toggleTheme}
          />
          {devLayer}
        </Toaster>
      </TooltipProvider>
    )

  if (!dev.loggedIn)
    return (
      <TooltipProvider delayDuration={300}>
        <Toaster>
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
          {devLayer}
        </Toaster>
      </TooltipProvider>
    )

  return (
    <OpenAnalytics.Provider value={openAnalytics}>
    <TooltipProvider delayDuration={300}>
      <Toaster>
      {welcome && !dev.featureIntro && !dev.welcomeGift && <Welcome name={welcome} onShown={() => setWelcome(null)} />}
      <div className="flex h-screen bg-sidebar text-foreground">
        <AppSidebar page={page === "Flick" ? "Flicks" : page} onNavigate={(p) => { setAdsTarget(null); setEmbedTarget(null); setAnalyticsTarget(null); setNavCount((n) => n + 1); setPage(p); scroller.current?.scrollTo({ top: 0 }) }} credits={credits} onAddCredits={addCredits} buyOpen={buyOpen} onBuyOpenChange={setBuyOpen} autoOpen={autoOpen} onAutoOpenChange={setAutoOpen} appearance={appearance} onAppearanceChange={setAppearance} name={name} email={account.email} photo={photo} />

        <main className="flex min-w-0 flex-1 flex-col gap-2 p-2 md:pl-0">
          <header className="flex h-10 items-center px-2 md:hidden">
            <button type="button" aria-label="Flicks home" onClick={() => (setAdsTarget(null), setPage("Create"))} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <FlicksLogo className="h-6 text-foreground" />
            </button>
          </header>
          <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-background">
            {page === "Template" && previewTemplate ? (
              <TemplatePreview t={previewTemplate} onBack={() => setPage("Create")} onUse={useTemplate} onOpen={openTemplate} />
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
                  // a new project with this video as its reference video, already made
                  setGeneration({ id: crypto.randomUUID(), prompt: a.prompt, size: a.size, duration: a.duration, references: 0, refs: [], startedAt: 1, video: a.video, fromAsset: true, back: "Assets" })
                  setPage("Generate")
                }}
              />
              </Loaded>
            ) : page === "Account" ? (
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
            {/* Hero */}
            <section className="hero-mesh grain relative overflow-hidden px-4 pb-24 pt-14 md:pt-20">
              <div aria-hidden className="absolute inset-0 overflow-hidden">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
                <div className="blob blob-3" />
                <div className="blob blob-4" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-background" />
              <div className="relative mx-auto flex max-w-[760px] flex-col items-center gap-7">
                <div className="space-y-3 text-center">
                  <h1 className="text-balance text-3xl font-medium tracking-tight md:text-[40px] md:leading-[1.15]">
                    Hey {firstName}, let’s start with a video
                  </h1>
                  <p className="text-sm text-foreground">
                    Add photos or videos as references. Create variants of generated video in next step.
                  </p>
                </div>
                <PromptComposer
                  credits={credits}
                  onSpend={(n) => addCredits(-n)}
                  onGenerate={(g) => {
                    const chatFirst = dev.aiChat && !template
                    setGeneration((prev) => {
                      // each new generation shows the next product set's reference video
                      const next = prev ? REFERENCE_VIDEOS[(Math.max(0, REFERENCE_VIDEOS.indexOf(prev.video)) + 1) % REFERENCE_VIDEOS.length] : 0
                      // with the chat on, nothing generates yet: the chat plans the Flick first
                      return { ...g, id: crypto.randomUUID(), startedAt: chatFirst ? 0 : Date.now(), video: next, ...(chatFirst ? { agent: true } : {}) }
                    })
                    setPage("Generate")
                    // the editor keeps the template's details, so the home box starts fresh
                    setTemplate(null)
                  }}
                  onGetCredits={() => setBuyOpen(true)}
                  chat={dev.aiChat}
                  template={template}
                  onClearTemplate={() => setTemplate(null)}
                  prompt={prompt}
                  setPrompt={setPrompt}
                  size={size}
                  setSize={setSize}
                  pulse={pulse}
                />
                <Button variant="outline" size="sm" onClick={() => setDev({ featureIntro: true })} className="gap-1.5 rounded-full border-foreground/20 bg-transparent font-normal shadow-none hover:bg-foreground/5 dark:bg-transparent">
                  <HugeiconsIcon icon={HelpCircleIcon} className="size-4" />
                  How Flicks work
                </Button>
                <HowFlicksWork open={dev.featureIntro} onOpenChange={(o) => setDev({ featureIntro: o })} />
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
            <section id="templates" className="relative -mt-12 scroll-mt-4 px-3 pb-3 md:px-4 md:pb-4">
              <TemplateGallery onUse={openTemplate} saved={savedTemplates} />
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
          <Loaded k={generation.id} ms={dev.pageLoadMs} s={<div className="flex h-full flex-col"><div className="flex h-14 shrink-0 items-center gap-3 border-b px-4"><Skeleton className="h-5 w-40 rounded-md" /><Skeleton className="ml-auto h-9 w-48 rounded-xl" /><Skeleton className="h-9 w-24 rounded-xl" /></div><EditorSkeleton /></div>}>
          <GenerationCanvas key={generation.id} generation={generation} onBack={() => setPage(generation.back === "Flick" && !flickId ? "Flicks" : (generation.back ?? "Create"))} onGetCredits={() => setBuyOpen(true)} onOpenFlick={openFlickPage}
            onSaveTemplate={(t) => setSavedTemplates((list) => [t, ...list])}
            onDuplicate={(copy) => setGeneration((g) => (g ? { ...g, id: crypto.randomUUID(), copy, resume: undefined, sample: false, remixOf: undefined } : g))}
            onHomeTemplates={() => {
              setPage("Create")
              setTimeout(() => document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" }), 50)
            }}
          />
          </Loaded>
        </div>
      )}
      <ExportWatcher onOpen={openFlickPage} />
      <CoachLayer />
      {devLayer}
    </Toaster>
    </TooltipProvider>
    </OpenAnalytics.Provider>
  )
}

/** Flicks preparing in the background: when one finishes, mark it ready and say so, with View Flick. */
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
      {children}
    </PageLoader>
  )
}
