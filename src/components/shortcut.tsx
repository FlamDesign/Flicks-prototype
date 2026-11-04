import { Kbd, KbdGroup } from "@/components/ui/kbd"

/** A keyboard shortcut as the theme shows it: one key per chip, e.g. ⌘ ↵ or Ctrl K. */
export function Shortcut({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <KbdGroup className={className}>
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </KbdGroup>
  )
}
