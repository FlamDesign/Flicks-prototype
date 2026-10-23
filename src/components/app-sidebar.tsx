import { HugeiconsIcon } from "@hugeicons/react"
import {
  PlusSignIcon,
  AiVideoIcon,
  Layers01Icon,
  FolderLibraryIcon,
  LayoutTopIcon,
  CodeIcon,
  Wallet01Icon,
  ChartLineData01Icon,
  UnfoldMoreIcon,
  UserIcon,
  CreditCardIcon,
  HelpCircleIcon,
  LinkSquare02Icon,
  Sun03Icon,
  Moon02Icon,
  ComputerPhoneSyncIcon,
  ContrastIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FlicksLogo } from "@/components/brand"
import { CreditsCard } from "@/components/credits-card"
import { cn } from "@/lib/utils"
import { openHelp } from "@/help/open"

const NAV = [
  { label: "Create", icon: PlusSignIcon },
  { label: "Projects", icon: Layers01Icon },
  { label: "Flicks", icon: AiVideoIcon },
  { label: "Assets", icon: FolderLibraryIcon },
]
const MANAGE = [
  { label: "Campaigns", icon: LayoutTopIcon },
  { label: "Embeds", icon: CodeIcon },
  { label: "Analytics", icon: ChartLineData01Icon },
]

export type Appearance = "dark" | "auto" | "light"

const APPEARANCES = [
  { value: "auto", label: "System", icon: ComputerPhoneSyncIcon },
  { value: "light", label: "Light", icon: Sun03Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
] as const

export function AppSidebar({
  credits,
  onAddCredits,
  buyOpen,
  onBuyOpenChange,
  autoOpen,
  onAutoOpenChange,
  appearance,
  onAppearanceChange,
  name = "Divyansh Gupta",
  photo,
  email = "divyansh@flamapp.ai",
  page,
  onNavigate,
  extra,
}: {
  /** above the credits: Help */
  extra?: React.ReactNode
  page: string
  onNavigate: (page: string) => void
  credits: number
  onAddCredits: (n: number) => void
  buyOpen: boolean
  onBuyOpenChange: (o: boolean) => void
  autoOpen: boolean
  onAutoOpenChange: (o: boolean) => void
  appearance: Appearance
  onAppearanceChange: (v: Appearance) => void
  name?: string
  photo?: string
  email?: string
}) {
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col gap-4 overflow-y-auto px-3 py-4 [scrollbar-width:none] md:flex">
      <div className="flex h-10 items-center gap-1 px-2">
        {/* the logo goes home (Create) */}
        <button type="button" aria-label="Flicks home" onClick={() => onNavigate("Create")} className="-mx-1 rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <FlicksLogo className="h-7 text-foreground" />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => (
          <NavButton key={n.label} {...n} active={page === n.label || (n.label === "Create" && (page === "Generate" || page === "Template"))} onClick={() => onNavigate(n.label)} />
        ))}
      </nav>
      <div className="flex flex-col gap-0.5">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">Manage</p>
        {MANAGE.map((n) => (
          <NavButton key={n.label} {...n} active={page === n.label || (n.label === "Create" && (page === "Generate" || page === "Template"))} onClick={() => onNavigate(n.label)} />
        ))}
      </div>

      <div className="flex-1" />

      {extra}

      <div className="px-2">
        <CreditsCard credits={credits} onAdd={onAddCredits} buy={buyOpen} setBuy={onBuyOpenChange} autoOpen={autoOpen} setAutoOpen={onAutoOpenChange} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-12 w-full justify-start gap-2 rounded-lg px-2 text-left data-[state=open]:bg-sidebar-accent">
            <Avatar className="size-8 rounded-lg after:rounded-lg">
              {photo && <AvatarImage src={photo} alt="" className="rounded-lg object-cover" />}
              <AvatarFallback className="rounded-lg bg-primary text-xs font-semibold text-primary-foreground">{name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs font-normal">{email}</span>
            </span>
            <HugeiconsIcon icon={UnfoldMoreIcon} className="ml-auto size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[208px]">
          <DropdownMenuItem onSelect={() => onNavigate("Account")}><HugeiconsIcon icon={UserIcon} className="size-4" />Account</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onNavigate("Credits")}><HugeiconsIcon icon={CreditCardIcon} className="size-4" />Credits</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onNavigate("Ad Balance")}><HugeiconsIcon icon={Wallet01Icon} className="size-4" />Ad Balance</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openHelp()}><HugeiconsIcon icon={HelpCircleIcon} className="size-4" />Help Center<HugeiconsIcon icon={LinkSquare02Icon} className="ml-auto size-3.5 text-muted-foreground" /></DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={ContrastIcon} className="size-4" />
              Appearance
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={8} className="w-48">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={appearance} onValueChange={(v) => onAppearanceChange(v as Appearance)}>
                {APPEARANCES.map((a) => (
                  <DropdownMenuRadioItem key={a.value} value={a.value} onSelect={(e) => e.preventDefault()}>
                    <HugeiconsIcon icon={a.icon} className="size-4" />
                    {a.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <Separator className="hidden" />
    </aside>
  )
}

function NavButton({ label, icon, active, onClick }: { label: string; icon: typeof PlusSignIcon; active?: boolean; onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "h-9 justify-start gap-3 px-3 font-normal text-muted-foreground",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground hover:bg-sidebar-accent",
      )}
    >
      <HugeiconsIcon icon={icon} className="size-4" />
      {label}
    </Button>
  )
}

