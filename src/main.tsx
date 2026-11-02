import { StrictMode, lazy, Suspense, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { DevStateProvider } from "@/dev/state"
import { startSync } from "@/ai/sync"
import { SmallScreenNotice } from "@/components/small-screen"
import { MotionRoot } from "@/components/arrive"

const HelpCenter = lazy(() => import("@/help/help-center").then((m) => ({ default: m.HelpCenter })))
const FlickViewer = lazy(() => import("@/components/flick-viewer").then((m) => ({ default: m.FlickViewer })))
const isHelp = () => location.hash.startsWith("#help")
/** #f/<link>: a shared Flick, viewable on any screen */
const sharedFlick = () => location.hash.match(/^#f\/([\w-]+)/)?.[1]

/** #help opens the Help Center (in its own tab); anything else is the app. */
function Root() {
  const [help, setHelp] = useState(isHelp)
  const [flick, setFlick] = useState(sharedFlick)
  useEffect(() => {
    const on = () => (setHelp(isHelp()), setFlick(sharedFlick()))
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  if (flick)
    return (
      <Suspense fallback={null}>
        <FlickViewer slug={flick} />
      </Suspense>
    )
  return help ? (
    <Suspense fallback={null}>
      <HelpCenter />
    </Suspense>
  ) : (
    <DevStateProvider>
      <App />
      <SmallScreenNotice />
    </DevStateProvider>
  )
}

// projects, Flicks and AI chats load from and save to the AI server when a passcode is set
startSync()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionRoot>
      <Root />
    </MotionRoot>
  </StrictMode>,
)
