import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

/**
 * A part of the page that failed to draw never leaves a blank screen: the app says so and offers a
 * reload. The work is safe (projects and chats are saved as they change); the error itself is kept
 * for us behind Details.
 */
export class CrashScreen extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error("[crash]", error)
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div role="alert" className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <h1 className="text-lg font-medium">Something went wrong on this page</h1>
          <p className="text-sm text-muted-foreground">Your work is saved. Reload to carry on where you were.</p>
          <Button onClick={() => location.reload()}>Reload</Button>
          <details className="w-full text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer text-center">Details</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-2">{String(error.stack ?? error.message).slice(0, 1200)}</pre>
          </details>
        </div>
      </div>
    )
  }
}
