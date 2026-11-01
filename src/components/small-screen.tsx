import { HugeiconsIcon } from "@hugeicons/react"
import { ComputerIcon } from "@hugeicons/core-free-icons"

/** Flicks is made for larger screens: on phones (under 768 px) this covers the app with a short note. */
export function SmallScreenNotice() {
  return (
    <div role="alert" className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-background p-8 text-center md:hidden">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={ComputerIcon} className="size-6" />
      </span>
      <div className="flex max-w-xs flex-col gap-1.5">
        <h1 className="text-lg font-medium">Open Flicks on a larger screen</h1>
        <p className="text-sm text-muted-foreground">Flicks is made for laptops and desktops. Open this link on one to create and edit.</p>
      </div>
    </div>
  )
}
