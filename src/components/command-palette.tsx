import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, HelpCircleIcon, Moon02Icon, Sun03Icon, BookOpen01Icon } from "@hugeicons/core-free-icons"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command"
import { MANAGE, NAV } from "@/components/app-sidebar"
import { useLibrary, type Project } from "@/library"
import { openHelp } from "@/help/open"


/**
 * ⌘K (Ctrl K): jump to any page, project or Flick, or run an action, by typing. Also opens from
 * the search hint in the sidebar.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onOpenProject,
  onOpenFlick,
  onNew,
  onHowItWorks,
  dark,
  onToggleTheme,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onNavigate: (page: string) => void
  onOpenProject: (p: Project) => void
  onOpenFlick: (id: string) => void
  onNew: () => void
  onHowItWorks: () => void
  dark: boolean
  onToggleTheme: () => void
}) {
  const { projects, flicks } = useLibrary()
  const [query, setQuery] = useState("")
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
  }, [open, onOpenChange])
  useEffect(() => void (open || setQuery("")), [open])
  const run = (fn: () => void) => () => (onOpenChange(false), fn())
  // the full lists only once something is typed, so the first view stays short
  const recent = query ? projects : projects.slice(0, 4)
  const recentFlicks = query ? flicks : flicks.slice(0, 4)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search Flicks" description="Jump to a page, project or Flick, or run an action">
      <Command>
      <CommandInput placeholder="Search pages, projects, Flicks and actions" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Nothing matches “{query}”.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={run(onNew)}>
            <HugeiconsIcon icon={Add01Icon} />
            New video
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(onToggleTheme)}>
            <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} />
            {dark ? "Switch to light" : "Switch to dark"}
          </CommandItem>
          <CommandItem onSelect={run(onHowItWorks)}>
            <HugeiconsIcon icon={HelpCircleIcon} />
            How Flicks work
          </CommandItem>
          <CommandItem onSelect={run(() => openHelp())}>
            <HugeiconsIcon icon={BookOpen01Icon} />
            Help Center
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {[...NAV, ...MANAGE].map((n) => (
            <CommandItem key={n.label} value={`Go to ${n.label}`} onSelect={run(() => onNavigate(n.label))}>
              <HugeiconsIcon icon={n.icon} />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {recent.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {recent.map((p) => (
                <CommandItem key={p.id} value={`project ${p.name} ${p.id}`} onSelect={run(() => onOpenProject(p))}>
                  {p.image ? <img src={p.image} alt="" className="size-6 rounded-md object-cover" /> : <span className="size-6 rounded-md bg-muted" />}
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{p.size}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {recentFlicks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Flicks">
              {recentFlicks.map((f) => (
                <CommandItem key={f.id} value={`flick ${f.name} ${f.id}`} onSelect={run(() => onOpenFlick(f.id))}>
                  {f.image ? <img src={f.image} alt="" className="size-6 rounded-md object-cover" /> : <span className="size-6 rounded-md bg-muted" />}
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{f.size}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      </Command>
    </CommandDialog>
  )
}
