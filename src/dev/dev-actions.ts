import { useEffect, useRef, useSyncExternalStore } from "react"

/** A shortcut a screen offers the dev tools while it's showing (e.g. "Open sign-in link"). */
export type DevAction = { id: string; label: string; run: () => void }

let actions: DevAction[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Offer an action in the floating dev tools while it is passed (null removes it). */
export function useDevAction(action: DevAction | null) {
  // always call the latest handler without re-registering every render
  const latest = useRef(action)
  latest.current = action
  useEffect(() => {
    if (!action) return
    actions = [...actions.filter((a) => a.id !== action.id), { ...action, run: () => latest.current?.run() }]
    emit()
    return () => {
      actions = actions.filter((a) => a.id !== action.id)
      emit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.id, action?.label])
}

/** The actions on offer right now. */
export function useDevActions() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => actions,
  )
}
