import { StrictMode, lazy, Suspense, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { DevStateProvider } from "@/dev/state"

const HelpCenter = lazy(() => import("@/help/help-center").then((m) => ({ default: m.HelpCenter })))
const isHelp = () => location.hash.startsWith("#help")

/** #help opens the Help Center (in its own tab); anything else is the app. */
function Root() {
  const [help, setHelp] = useState(isHelp)
  useEffect(() => {
    const on = () => setHelp(isHelp())
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  return help ? (
    <Suspense fallback={null}>
      <HelpCenter />
    </Suspense>
  ) : (
    <DevStateProvider>
      <App />
    </DevStateProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
