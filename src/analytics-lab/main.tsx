import { StrictMode, useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import "@/index.css"
import "./lab.css"
import { DevStateProvider } from "@/dev/state"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster, useToast } from "@/components/ui-extra/toaster"
import { AppSidebar, type Appearance } from "@/components/app-sidebar"
import { FlicksLogo } from "@/components/brand"
import { useLibrary } from "@/library"
import { useAds } from "@/ads/ads"
import { useEmbeds } from "@/embeds/embeds"
import { cn } from "@/lib/utils"
import { buildDataset } from "./data"
import { AnalyticsPage } from "./analytics-page"

type Mode = "normal" | "early" | "empty" | "loading"
const MODES: { id: Mode; label: string }[] = [
  { id: "normal", label: "Sample data" },
  { id: "early", label: "Early numbers" },
  { id: "empty", label: "No data" },
  { id: "loading", label: "Loading" },
]

/**
 * Analytics, as a separate experiment: the app's sidebar for context and the Analytics page,
 * built from the same sample Flicks, embeds and placements as the prototype.
 */
function Lab() {
  const toast = useToast()
  const [appearance, setAppearance] = useState<Appearance>("light")
  const [credits, setCredits] = useState(1000)
  const [buyOpen, setBuyOpen] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("normal")
  const lib = useLibrary()
  const adsState = useAds()
  const embedState = useEmbeds()
  const data = useMemo(() => buildDataset(lib.flicks, adsState.placements, embedState.embeds, adsState.campaigns, mode === "loading" ? "normal" : mode), [lib.flicks, adsState.placements, adsState.campaigns, embedState.embeds, mode])

  useEffect(() => {
    document.title = "Flicks · Analytics (experiment)"
    const mq = matchMedia("(prefers-color-scheme: dark)")
    const apply = () => document.documentElement.classList.toggle("dark", appearance === "dark" || (appearance === "auto" && mq.matches))
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [appearance])

  return (
    <div className="viz flex h-screen bg-sidebar text-foreground">
      <AppSidebar
        page="Analytics"
        onNavigate={(p) => p !== "Analytics" && toast({ title: "Analytics only", description: "This experiment has just the Analytics page. The rest lives in the main prototype." })}
        credits={credits}
        onAddCredits={(n) => setCredits((c) => c + n)}
        buyOpen={buyOpen}
        onBuyOpenChange={setBuyOpen}
        autoOpen={autoOpen}
        onAutoOpenChange={setAutoOpen}
        appearance={appearance}
        onAppearanceChange={setAppearance}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-2 p-2 md:pl-0">
        <header className="flex h-10 items-center px-2 md:hidden">
          <FlicksLogo className="h-6 text-foreground" />
        </header>
        <div className="relative min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-background pb-20">
          <AnalyticsPage data={data} loading={mode === "loading"} />
        </div>
      </main>

      {/* experiment controls: which data state to show */}
      <div role="toolbar" aria-label="Experiment" className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl bg-neutral-900/95 p-1 text-neutral-100 shadow-xl ring-1 ring-white/10 backdrop-blur">
        <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Experiment</span>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn("rounded-xl px-2.5 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/60", mode === m.id ? "bg-primary text-primary-foreground" : "text-neutral-300 hover:bg-white/10")}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DevStateProvider>
      <TooltipProvider delayDuration={300}>
        <Toaster>
          <Lab />
        </Toaster>
      </TooltipProvider>
    </DevStateProvider>
  </StrictMode>,
)
