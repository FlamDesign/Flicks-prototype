import { lazy, Suspense, useState, type ComponentType } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { DevBadge } from "@/dev/state-manager"

/**
 * The Dev dialogs: one shell, a row of tabs at the top, one panel below. "AI" holds everything about
 * the server and the model (connection, the managed agent, requests, chat metrics, the library);
 * "Docs" holds the PRD, the Components gallery and the Emails. Each panel's code loads when its tab
 * is first opened.
 */
type Tab = { name: string; panel: ComponentType }

function DevShell({ open, onOpenChange, title, tabs, initial }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; tabs: Tab[]; initial?: string }) {
  const [tab, setTab] = useState(initial ?? tabs[0].name)
  const Panel = (tabs.find((t) => t.name === tab) ?? tabs[0]).panel
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(860px,92vh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="flex-row items-center gap-4 border-b px-5 py-2.5 pr-14 text-left">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium">
            {title} <DevBadge />
          </DialogTitle>
          <DialogDescription className="sr-only">Dev tools: {tabs.map((t) => t.name).join(", ")}.</DialogDescription>
          <nav role="tablist" aria-label={`${title} sections`} className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {tabs.map((t) => (
              <button
                key={t.name}
                type="button"
                role="tab"
                aria-selected={tab === t.name}
                onClick={() => setTab(t.name)}
                className={cn("h-7 rounded-md px-2.5 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground focus-ring", tab === t.name && "bg-background font-medium text-foreground shadow-sm")}
              >
                {t.name}
              </button>
            ))}
          </nav>
        </DialogHeader>
        <div className="flex min-h-0 flex-1" role="tabpanel">
          <Suspense fallback={<div className="grid flex-1 place-items-center"><Spinner className="size-5 text-muted-foreground" /></div>}>
            <Panel />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const AiSetup = lazy(() => import("@/dev/ai-connection").then((m) => ({ default: m.AiConnectionPanel })))
const AiLib = lazy(() => import("@/dev/ai-library").then((m) => ({ default: m.AiLibraryPanel })))
const Requests = lazy(() => import("@/dev/hf-requests").then((m) => ({ default: m.RequestsPanel })))
const Metrics = lazy(() => import("@/dev/chat-metrics").then((m) => ({ default: m.MetricsPanel })))
const Prd = lazy(() => import("@/dev/prd").then((m) => ({ default: m.PrdPanel })))
const Components = lazy(() => import("@/dev/component-gallery").then((m) => ({ default: m.ComponentsPanel })))
const Emails = lazy(() => import("@/dev/email-gallery").then((m) => ({ default: m.EmailsPanel })))

export function AiDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; initial?: string }) {
  return <DevShell {...props} title="AI" tabs={[{ name: "Connection", panel: AiSetup }, { name: "Requests", panel: Requests }, { name: "Chat metrics", panel: Metrics }, { name: "Library", panel: AiLib }]} />
}

export function DocsDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; initial?: string }) {
  return <DevShell {...props} title="Docs" tabs={[{ name: "PRD", panel: Prd }, { name: "Components", panel: Components }, { name: "Emails", panel: Emails }]} />
}
