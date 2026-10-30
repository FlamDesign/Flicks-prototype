import { useMediaAdd } from "@/components/media-picker"
import { useEffect, useState } from "react"
import { WelcomeGiftDialog } from "@/components/welcome-gift-page"
import { HowFlicksWork } from "@/components/how-flicks-work"
import { WalkthroughDemo } from "@/help/help-center"
import { openHelp } from "@/help/open"
import { ALL_DATES, DateFilter, type DateFilterValue } from "@/components/ui-extra/date-filter"
import { AddToEmbed, NewEmbedDialog } from "@/embeds/embeds-ui"
import { AddFundsDialog, AdBalanceChip, NewPlacementDialog, RatesDialog, ServeInAds } from "@/ads/ads-ui"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ArrowRight01Icon, Delete02Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FontPicker } from "@/components/editor/element-toolbar"
import { AnalyticsRoute } from "@/analytics/analytics-route"
import { ModeSwitch, VideoToggle, FileTitle } from "@/components/editor/editor-topbar"
import { ExportControl } from "@/components/editor/export-flick"
import { onboarding } from "@/onboarding/onboarding"
import { AccountSkeleton, DetailSkeleton, FlickPageSkeleton, GridSkeleton, TableSkeleton } from "@/components/page-skeletons"
import { VersionHistoryPanel } from "@/components/editor/version-history"
import { ToolbarGrip } from "@/components/editor/element-toolbar"
import { LayersPanel } from "@/components/editor/layers-panel"
import { FeedsPanel, FeedsTitle, type FeedVideo } from "@/components/editor/feeds-panel"
import type { Feed } from "@/components/editor/elements"
import { SlidesStrip, type Slide, type SlideStatus } from "@/components/editor/slides-strip"
import { useToast } from "@/components/ui-extra/toaster"
import { GENERATED_VIDEOS, type CanvasElement } from "@/components/editor/elements"
import { PromptChat, type HistoryItem } from "@/components/editor/prompt-chat"
import { ReferenceThumb } from "@/components/prompt-composer"
import { DevBadge } from "@/dev/state-manager"
import { cn } from "@/lib/utils"
import { AgentItemView, QuestionDeck } from "@/components/editor/agent-chat"
import type { Item } from "@/ai/agent"
import type { Plan } from "@/ai/design"

/* ---------- forced states ----------
 * Hover, focus and pressed are pseudo-classes, so they can't be set from code.
 * Copy every CSS rule that uses them into a second rule keyed on a data attribute,
 * then `data-force="hover"` (etc.) on a wrapper shows that state without a pointer.
 */
const FORCE_STYLE_ID = "dev-forced-states"
const PSEUDO: [RegExp, string][] = [
  [/:hover/g, '[data-force~="hover"]'],
  [/:focus-visible/g, '[data-force~="focus"]'],
  [/:active/g, '[data-force~="active"]'],
]
function forcedCss(rules: CSSRuleList): string {
  let out = ""
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      if (!/:hover|:focus-visible|:active/.test(rule.selectorText)) continue
      // apply to the element itself and to anything inside a forced wrapper
      const sel = rule.selectorText
        .split(",")
        .flatMap((part) => {
          let a = part
          for (const [re, rep] of PSEUDO) a = a.replace(re, rep)
          // also match when the attribute sits on an ancestor wrapper
          let b = part
          for (const [re] of PSEUDO) b = b.replace(re, "")
          const states = PSEUDO.filter(([re]) => new RegExp(re.source).test(part)).map(([, rep]) => rep)
          return [a, ...states.map((st) => `${st} ${b.trim()}`)]
        })
        .join(", ")
      out += `${sel}{${rule.style.cssText}}`
    } else if (rule instanceof CSSMediaRule) {
      // hover styles sit inside @media (hover: hover); keep them unconditional here
      const inner = forcedCss(rule.cssRules)
      if (inner) out += /hover/.test(rule.conditionText) ? inner : `@media ${rule.conditionText}{${inner}}`
    } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
      const inner = forcedCss((rule as CSSGroupingRule).cssRules)
      if (!inner) continue
      const name = rule instanceof CSSLayerBlockRule ? `@layer ${rule.name}` : rule instanceof CSSSupportsRule ? `@supports ${rule.conditionText}` : ""
      out += name ? `${name}{${inner}}` : inner
    }
  }
  return out
}
function useForcedStates() {
  useEffect(() => {
    if (document.getElementById(FORCE_STYLE_ID)) return
    let css = ""
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        css += forcedCss(sheet.cssRules)
      } catch {
        /* cross-origin sheet */
      }
    }
    const el = document.createElement("style")
    el.id = FORCE_STYLE_ID
    el.textContent = css
    document.head.appendChild(el)
  }, [])
}

/* ---------- layout pieces ---------- */

type State = { label: string; node: React.ReactNode; force?: "hover" | "focus" | "active" }

function States({ states, className }: { states: State[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2", className)}>
      {states.map((s) => (
        <figure key={s.label} className="flex min-h-24 flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <div data-force={s.force} className="flex flex-1 items-center justify-center bg-muted/30 p-4 [&_*]:!transition-none">
            {s.node}
          </div>
          <figcaption className="border-t px-2.5 py-1.5 text-[11px] text-muted-foreground">{s.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      {children}
    </section>
  )
}

/** the usual interaction states for one element */
const interaction = (render: (p: { disabled?: boolean; "aria-pressed"?: boolean; "aria-expanded"?: boolean }) => React.ReactNode, opts: { pressed?: boolean; expanded?: boolean } = {}): State[] => [
  { label: "Default", node: render({}) },
  { label: "Hover", node: render({}), force: "hover" },
  { label: "Focus", node: render({}), force: "focus" },
  { label: "Pressed", node: render({}), force: "active" },
  ...(opts.pressed ? [{ label: "On (aria-pressed)", node: render({ "aria-pressed": true }) }] : []),
  ...(opts.expanded ? [{ label: "Open (aria-expanded)", node: render({ "aria-expanded": true }) }] : []),
  { label: "Disabled", node: render({ disabled: true }) },
]

/* ---------- the catalogue ---------- */

type Entry = { name: string; kind: "UI" | "Editor" | "Feedback" | "Ads"; about: string; render: () => React.ReactNode }

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const
const SIZES = ["xs", "sm", "default", "lg"] as const
const ICON_SIZES = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const

const SAMPLE_ELEMENTS: CanvasElement[] = [
  { id: "a", kind: "text", variant: "heading", text: "Objects of quiet beauty.", x: 50, y: 20 },
  { id: "b", kind: "button", variant: "pill", text: "Shop now", x: 50, y: 70 },
  { id: "c", kind: "text", variant: "caption", text: "Hidden caption", x: 50, y: 80, hidden: true },
]

const ENTRIES: Entry[] = [
  {
    name: "Date filter",
    kind: "UI",
    about: "Presets (All period, Today, Last 7 days, Last 30 days) and a custom range on a calendar. Used on Assets, Flicks and Replace Flick.",
    render: () => <DateFilterDemo />,
  },
  {
    name: "Ad Balance chip",
    kind: "Ads",
    about: "On Campaigns: the Ad Balance in dollars (red when negative); opens the Ad Balance page.",
    render: () => <AdBalanceChip onOpen={() => {}} />,
  },
  {
    name: "Add funds",
    kind: "Ads",
    about: "$100 to $10,000, quick picks, what's owed settled first, the new balance, declined state (State manager).",
    render: () => <DialogDemo label="Add funds" render={(o, set) => <AddFundsDialog open={o} onOpenChange={set} />} />,
  },
  {
    name: "CPM rates",
    kind: "Ads",
    about: "The rate card by country, with the signed-in country highlighted.",
    render: () => <DialogDemo label="See all rates" render={(o, set) => <RatesDialog open={o} onOpenChange={set} />} />,
  },
  {
    name: "New placement",
    kind: "Ads",
    about: "Campaign (or new), name and fixed size. The Flick, platform and tag come next, on the placement.",
    render: () => <DialogDemo label="New placement" render={(o, set) => <NewPlacementDialog open={o} onOpenChange={set} onCreated={() => {}} />} />,
  },
  {
    name: "Page skeletons",
    kind: "Feedback",
    about: "Shown while a page loads, matching its layout: grid (Projects, Flicks, Assets, Embeds), table (Campaigns), Flick page, placement or embed, and Credits / Ad Balance.",
    render: () => (
      <div className="flex flex-col gap-6">
        {[<GridSkeleton count={4} />, <TableSkeleton rows={3} />, <FlickPageSkeleton />, <DetailSkeleton />, <AccountSkeleton />].map((el, i) => (
          <div key={i} className="max-h-[420px] overflow-hidden rounded-2xl ring-1 ring-foreground/10">
            {el}
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Coach mark",
    kind: "Feedback",
    about: "Tour stops and one-time tips point at their target. This shows one on the button below.",
    render: () => (
      <Button data-coach-demo variant="outline" onClick={() => onboarding.spotlight({ target: "[data-coach-demo]", title: "Show me", text: "This is what a coach mark looks like: it points at one thing, with a line on what to do." })}>
        Show a coach mark
      </Button>
    ),
  },
  {
    name: "Analytics",
    kind: "Feedback",
    about: "Sidebar › Analytics. Overview, Campaigns and Embeds; the same tile strip everywhere, compare up to 5 on the chart, lists with search, filters and pages, breadcrumbs, Top countries that filter on click. Turn on Large account in the State manager to see it at scale.",
    render: () => (
      <div className="h-[560px] overflow-y-auto rounded-xl ring-1 ring-foreground/10">
        <AnalyticsRoute />
      </div>
    ),
  },
  {
    name: "Font picker",
    kind: "Editor",
    about: "Text and button toolbar › Font. 100+ fonts in groups (sans serif, serif, display, handwriting, monospace, other languages, system), searchable, each shown in its own face. Fonts load only when seen or used.",
    render: () => <FontPickerDemo />,
  },
  {
    name: "Help Center walkthrough",
    kind: "Feedback",
    about: "Help Center guides (account menu › Help Center, new tab): real screens, a cursor that moves to what to click, numbered steps. Play, pause, step through.",
    render: () => (
      <div className="flex w-full max-w-xl flex-col gap-3">
        <WalkthroughDemo id="feeds" />
        <Button variant="outline" size="sm" className="self-start" onClick={() => openHelp()}>
          Open the Help Center
        </Button>
      </div>
    ),
  },
  {
    name: "How Flicks work",
    kind: "Feedback",
    about: "Feature intro popup on Create: four animated steps (one video, variations, one Flick, run it anywhere). New users see it once, then the welcome gift.",
    render: () => <PopupDemo kind="intro" />,
  },
  {
    name: "Welcome gift",
    kind: "Feedback",
    about: "Once, right after How Flicks work on a new account: the 1,000-credit welcome gift as a popup card. Click the card or Claim to see it open.",
    render: () => <PopupDemo kind="gift" />,
  },
  {
    name: "Export Flick",
    kind: "Editor",
    about: "Top-right of the editor. Name (prefilled from the project) and the checks; exports in the background (spinner on the button while one runs).",
    render: () => (
      <ExportControl title="Rain-ready boots launch" issues={[{ text: "@price is empty on some variations" }]} poster={GENERATED_VIDEOS[5].poster} count={3} size="1920×1080" last={{ name: "Rain-ready boots launch", at: Date.now() - 7_200_000 }} busy onExport={() => {}} />
    ),
  },
  {
    name: "Version history row",
    kind: "Editor",
    about: "File menu › Version history: autosaved checkpoints, exports marked with a link to their Flick; Restore on all but the current one.",
    render: () => <VersionHistoryDemo />,
  },
  {
    name: "Add to embed",
    kind: "Ads",
    about: "Add to embed dialog (Flick page): embeds of the Flick's size (Add, Replace, View) and New embed for this Flick. Free; the code stays the same.",
    render: () => (
      <div className="w-[360px]">
        <AddToEmbed flick={{ id: "demo", name: "Wild Haven", size: "1920×1080", image: GENERATED_VIDEOS[5].poster }} onOpenEmbed={() => {}} />
      </div>
    ),
  },
  {
    name: "New embed",
    kind: "Ads",
    about: "Name and fixed size. The Flick and the code come next, on the embed.",
    render: () => <DialogDemo label="New embed" render={(o, set) => <NewEmbedDialog open={o} onOpenChange={set} onCreated={() => {}} />} />,
  },
  {
    name: "Serve in ads",
    kind: "Ads",
    about: "Add to placement dialog (Flick page): placements of the Flick's size (Add, Replace, View) and New placement for this Flick.",
    render: () => (
      <div className="w-[360px]">
        <ServeInAds flick={{ id: "demo", name: "Wild Haven", size: "1920×1080", image: GENERATED_VIDEOS[5].poster }} onOpenPlacement={() => {}} />
      </div>
    ),
  },
  {
    name: "Button",
    kind: "UI",
    about: "Every variant through its interaction states, then sizes.",
    render: () => (
      <div className="flex flex-col gap-6">
        {VARIANTS.map((v) => (
          <Group key={v} title={`variant="${v}"`}>
            <States states={interaction((p) => <Button variant={v} {...p}>Button</Button>, { expanded: v !== "link" && v !== "default" && v !== "destructive" })} />
          </Group>
        ))}
        <Group title="Sizes">
          <States
            states={[
              ...SIZES.map((s) => ({ label: `size="${s}"`, node: <Button size={s}>Button</Button> })),
              ...ICON_SIZES.map((s) => ({ label: `size="${s}"`, node: <Button size={s} variant="secondary" aria-label="Add"><HugeiconsIcon icon={Add01Icon} /></Button> })),
              { label: "With icon", node: <Button>Next<HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" /></Button> },
            ]}
          />
        </Group>
      </div>
    ),
  },
  {
    name: "Badge",
    kind: "UI",
    about: "Variants.",
    render: () => <States states={VARIANTS.map((v) => ({ label: v, node: <Badge variant={v}>Badge</Badge> }))} />,
  },
  {
    name: "Input",
    kind: "UI",
    about: "Text field states.",
    render: () => (
      <States
        states={[
          { label: "Empty", node: <Input placeholder="Placeholder" /> },
          { label: "Filled", node: <Input defaultValue="Maison Living" /> },
          { label: "Hover", node: <Input placeholder="Placeholder" />, force: "hover" },
          { label: "Focus", node: <Input defaultValue="Maison Living" />, force: "focus" },
          { label: "Invalid", node: <Input defaultValue="flick" aria-invalid /> },
          { label: "Disabled", node: <Input defaultValue="Maison Living" disabled /> },
          { label: "With label", node: <div className="flex w-full flex-col gap-1.5"><Label htmlFor="dev-in">Name</Label><Input id="dev-in" placeholder="Name" /></div> },
        ]}
      />
    ),
  },
  {
    name: "Textarea",
    kind: "UI",
    about: "Multi-line field, and the input group with a counter used for descriptions.",
    render: () => (
      <States
        states={[
          { label: "Empty", node: <Textarea placeholder="Describe the video" /> },
          { label: "Focus", node: <Textarea defaultValue="Slow push-in on a sneaker" />, force: "focus" },
          { label: "Invalid", node: <Textarea defaultValue="Too long" aria-invalid /> },
          { label: "Disabled", node: <Textarea defaultValue="Slow push-in on a sneaker" disabled /> },
          {
            label: "Input group + counter",
            node: (
              <InputGroup>
                <InputGroupTextarea defaultValue="Tap to explore every variation." rows={2} />
                <InputGroupAddon align="block-end">
                  <InputGroupText className="ml-auto text-xs tabular-nums">31/160</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            ),
          },
        ]}
      />
    ),
  },
  {
    name: "Select",
    kind: "UI",
    about: "Closed trigger states; open it to see the list.",
    render: () => (
      <States
        states={[
          { label: "Placeholder", node: <Select><SelectTrigger className="w-36"><SelectValue placeholder="Pick one" /></SelectTrigger><SelectContent><SelectItem value="a">Vertical</SelectItem><SelectItem value="b">Square</SelectItem></SelectContent></Select> },
          { label: "Value", node: <Select defaultValue="a"><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a">Vertical</SelectItem><SelectItem value="b">Square</SelectItem></SelectContent></Select> },
          { label: "Disabled", node: <Select defaultValue="a" disabled><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a">Vertical</SelectItem></SelectContent></Select> },
          { label: "Small", node: <Select defaultValue="a"><SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a">Vertical</SelectItem></SelectContent></Select> },
        ]}
      />
    ),
  },
  {
    name: "Switch",
    kind: "UI",
    about: "Off, on, disabled, small.",
    render: () => (
      <States
        states={[
          { label: "Off", node: <Switch /> },
          { label: "On", node: <Switch defaultChecked /> },
          { label: "Focus", node: <Switch defaultChecked />, force: "focus" },
          { label: "Disabled off", node: <Switch disabled /> },
          { label: "Disabled on", node: <Switch disabled defaultChecked /> },
          { label: "Small", node: <Switch size="sm" defaultChecked /> },
        ]}
      />
    ),
  },
  {
    name: "Toggle",
    kind: "UI",
    about: "Two-state button used for B / I / U and similar.",
    render: () => <States states={interaction((p) => <Toggle aria-label="Bold" {...p}>B</Toggle>, { pressed: true })} />,
  },
  {
    name: "Tabs",
    kind: "UI",
    about: "Tab list with the active, inactive and disabled tab.",
    render: () => (
      <States
        states={[
          { label: "Default", node: <Tabs defaultValue="a"><TabsList><TabsTrigger value="a">Design</TabsTrigger><TabsTrigger value="b">Preview</TabsTrigger><TabsTrigger value="c" disabled>Code</TabsTrigger></TabsList></Tabs> },
          { label: "Line", node: <Tabs defaultValue="a"><TabsList variant="line"><TabsTrigger value="a">Design</TabsTrigger><TabsTrigger value="b">Preview</TabsTrigger></TabsList></Tabs> },
        ]}
      />
    ),
  },
  {
    name: "Slider",
    kind: "UI",
    about: "Single value.",
    render: () => (
      <States
        states={[
          { label: "Default", node: <Slider defaultValue={[40]} className="w-32" /> },
          { label: "Min", node: <Slider defaultValue={[0]} className="w-32" /> },
          { label: "Max", node: <Slider defaultValue={[100]} className="w-32" /> },
          { label: "Disabled", node: <Slider defaultValue={[40]} disabled className="w-32" /> },
        ]}
      />
    ),
  },
  {
    name: "Progress",
    kind: "UI",
    about: "Determinate progress.",
    render: () => <States states={[0, 35, 100].map((v) => ({ label: `${v}%`, node: <Progress value={v} className="w-32" /> }))} />,
  },
  {
    name: "Skeleton",
    kind: "UI",
    about: "Loading placeholder.",
    render: () => <States states={[{ label: "Line", node: <Skeleton className="h-4 w-32" /> }, { label: "Block", node: <Skeleton className="size-16 rounded-xl" /> }]} />,
  },
  {
    name: "Avatar",
    kind: "UI",
    about: "Sizes with a fallback.",
    render: () => <States states={(["sm", "default", "lg"] as const).map((s) => ({ label: s, node: <Avatar size={s}><AvatarFallback>DS</AvatarFallback></Avatar> }))} />,
  },
  {
    name: "Card",
    kind: "UI",
    about: "Surface with header.",
    render: () => (
      <States
        className="grid-cols-1"
        states={[{ label: "Default", node: <Card className="w-64"><CardHeader><CardTitle>Maison Living</CardTitle><CardDescription>3 variations · 1080×1920</CardDescription></CardHeader></Card> }]}
      />
    ),
  },
  {
    name: "Separator",
    kind: "UI",
    about: "Horizontal and vertical.",
    render: () => <States states={[{ label: "Horizontal", node: <Separator className="w-32" /> }, { label: "Vertical", node: <div className="h-10"><Separator orientation="vertical" /></div> }]} />,
  },
  {
    name: "Tooltip",
    kind: "Feedback",
    about: "Hover or focus the trigger.",
    render: () => (
      <States
        states={[
          { label: "Trigger (hover me)", node: <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="icon" aria-label="Delete"><HugeiconsIcon icon={Delete02Icon} /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip> },
          { label: "Open", node: <Tooltip open><TooltipTrigger asChild><Button variant="secondary" size="sm">Always open</Button></TooltipTrigger><TooltipContent>Tooltip text</TooltipContent></Tooltip> },
        ]}
      />
    ),
  },
  {
    name: "Popover",
    kind: "Feedback",
    about: "Click to open.",
    render: () => (
      <States
        states={[
          {
            label: "Closed (click)",
            node: (
              <Popover>
                <PopoverTrigger asChild><Button variant="outline">Open popover</Button></PopoverTrigger>
                <PopoverContent className="w-56"><p className="text-sm">Popover content</p></PopoverContent>
              </Popover>
            ),
          },
        ]}
      />
    ),
  },
  {
    name: "Dropdown menu",
    kind: "Feedback",
    about: "Click to open; items include a destructive one.",
    render: () => (
      <States
        states={[
          {
            label: "Closed (click)",
            node: (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline">File options</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />
    ),
  },
  {
    name: "Reference image",
    kind: "Editor",
    about: "Image references in the prompt boxes: uploading, ready, and failed (click to retry; × to remove). The row scrolls sideways when full.",
    render: () => (
      <States
        states={[
          { label: "Uploading", node: <ReferenceThumb r={{ id: "a", name: "lamp.png", url: GENERATED_VIDEOS[1].poster, loading: true }} onRemove={() => {}} /> },
          { label: "Ready", node: <ReferenceThumb r={{ id: "b", name: "lamp.png", url: GENERATED_VIDEOS[1].poster, loading: false }} onRemove={() => {}} /> },
          { label: "Failed", node: <ReferenceThumb r={{ id: "c", name: "lamp.png", url: GENERATED_VIDEOS[1].poster, loading: false, failed: true }} onRemove={() => {}} onRetry={() => {}} /> },
        ]}
      />
    ),
  },
  {
    name: "Media picker",
    kind: "Editor",
    about: "Opened by + in every prompt box (Create, the canvas and the AI chat). Search, then tabs for All, Images, Videos, Generated and Uploaded; generated items show their final prompt and references. Upload tile and drop take photos and videos (up to 100 MB). Videos over 15 s open the trimmer; Use clip adds it at once and it's cut in the background, for that prompt only.",
    render: () => <MediaPickerDemo />,
  },
  {
    name: "Reference video",
    kind: "Editor",
    about: "A video reference in a prompt box: its first frame with a play mark and length.",
    render: () => (
      <States states={[{ label: "Ready", node: <ReferenceThumb r={{ id: "v", name: "walk.mp4", url: GENERATED_VIDEOS[0].mp4, poster: GENERATED_VIDEOS[0].poster, media: "video", duration: 12, loading: false }} onRemove={() => {}} /> }]} />
    ),
  },
  {
    name: "Toast",
    kind: "Feedback",
    about: "Stacked notifications: success, info and error (upload failed with Retry, too large, wrong type). Buttons fire real toasts.",
    render: () => <ToastDemo />,
  },
  {
    name: "Mode switch",
    kind: "Editor",
    about: "Design / Preview in the top bar.",
    render: () => <States states={(["design", "preview"] as const).map((m) => ({ label: m, node: <ModeSwitch mode={m} onChange={() => {}} /> }))} />,
  },
  {
    name: "Video toggle",
    kind: "Editor",
    about: "Play / pause the canvas video.",
    render: () => (
      <States
        states={[
          { label: "Playing", node: <VideoToggle playing onToggle={() => {}} /> },
          { label: "Paused", node: <VideoToggle playing={false} onToggle={() => {}} /> },
          { label: "Hover", node: <VideoToggle playing onToggle={() => {}} />, force: "hover" },
          { label: "Disabled (generating)", node: <VideoToggle playing disabled onToggle={() => {}} /> },
        ]}
      />
    ),
  },
  {
    name: "File title",
    kind: "Editor",
    about: "Home, name (tap to rename) and the size badge.",
    render: () => (
      <States
        className="grid-cols-1"
        states={[
          { label: "Short name", node: <FileTitleDemo title="Maison Living" /> },
          { label: "Long name (truncated at 16)", node: <FileTitleDemo title="Summer collection launch campaign" /> },
          { label: "Naming (from prompt)", node: <FileTitleDemo title="" naming /> },
        ]}
      />
    ),
  },
  {
    name: "Toolbar grip",
    kind: "Editor",
    about: "Drag handle at the start of element toolbars.",
    render: () => <States states={[{ label: "Default", node: <ToolbarGrip onDragStart={() => {}} onReset={() => {}} /> }, { label: "Hover", node: <ToolbarGrip onDragStart={() => {}} onReset={() => {}} />, force: "hover" }]} />,
  },
  {
    name: "Chat cards",
    kind: "Editor",
    about: "What the planning chat shows: questions (words, layouts, palettes), an image request, the brand, the plan outline, build progress, images and notes. Answered cards shrink to one line.",
    render: () => <ChatCardsDemo />,
  },
  {
    name: "Layers panel",
    kind: "Editor",
    about: "Rows: normal, selected, hidden. Hover a row for hide and delete.",
    render: () => <LayersDemo />,
  },
  {
    name: "Feeds panel",
    kind: "Editor",
    about: "Left panel, two levels: the feed list, one feed's values per video with a breadcrumb title, and the empty state.",
    render: () => <FeedsDemo />,
  },
  {
    name: "Prompts panel",
    kind: "Editor",
    about: "Generation history as a chat: ready, generating and replaced results; the prompt box ready and dimmed while generating.",
    render: () => <PromptsDemo />,
  },
  {
    name: "Slides strip",
    kind: "Editor",
    about: "Reference video and variations: ready, generating, not generated, needs regenerating (faded, red dot by the name), starting variation (solid play in the corner); hover shows the start toggle and options.",
    render: () => <SlidesDemo />,
  },
]

/* ---------- live demos for stateful components ---------- */

function VersionHistoryDemo() {
  const [open, setOpen] = useState(false)
  const t = Date.now()
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open version history
      </Button>
      {open && (
        <VersionHistoryPanel
          versions={[
            { n: 1, at: t - 86_400_000, sig: "a", snap: null },
            { n: 2, at: t - 3_600_000, sig: "b", snap: null, exported: { flickId: "f9", name: "Rain-ready boots launch" } },
            { n: 3, at: t - 60_000, sig: "c", snap: null },
          ]}
          current={3}
          onRestore={() => {}}
          onRename={() => {}}
          onOpenFlick={() => {}}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function FileTitleDemo({ title, naming }: { title: string; naming?: boolean }) {
  const [t, setT] = useState(title)
  return <FileTitle title={t} naming={naming} setTitle={setT} size="1080×1920" sizeLabel="Vertical (9:16)" onHome={() => {}} onDuplicate={() => {}} onSaveTemplate={() => {}} onHistory={() => {}} onDelete={() => {}} />
}

function LayersDemo() {
  const [elements, setElements] = useState(SAMPLE_ELEMENTS)
  const [selected, setSelected] = useState<string[]>(["b"])
  return (
    <div className="w-72 rounded-xl p-2 ring-1 ring-foreground/10">
      <LayersPanel elements={elements} setElements={setElements} selected={selected} setSelected={setSelected} onHover={() => {}} />
    </div>
  )
}

function FeedsDemo() {
  const [feeds, setFeeds] = useState<Feed[]>([
    { id: "f1", name: "price", type: "text" },
    { id: "f2", name: "shop-link", type: "link" },
  ])
  const [videos, setVideos] = useState<FeedVideo[]>([
    { id: "v1", name: "Variation 1", poster: GENERATED_VIDEOS[1].poster, values: { f1: "$120", f2: "https://shop.example/1" } },
    { id: "v2", name: "Variation 2", poster: GENERATED_VIDEOS[2].poster, values: { f1: "$90" } },
  ])
  const [active, setActive] = useState("v1")
  const props = {
    onSelectVideo: setActive,
    onAdd: (f: Omit<Feed, "id">) => setFeeds((x) => [...x, { ...f, id: `f${x.length + 1}` }]),
    onRename: (id: string, name: string) => setFeeds((x) => x.map((f) => (f.id === id ? { ...f, name } : f))),
    onDelete: (id: string) => setFeeds((x) => x.filter((f) => f.id !== id)),
    onSelectElements: () => {},
  }
  const onValue = (vid: string, fid: string, value: string) => setVideos((vs) => vs.map((v) => (v.id === vid ? { ...v, values: { ...v.values, [fid]: value } } : v)))
  const usedBy = { f1: [{ id: "e1", kind: "text" as const, label: "$120" }] }
  const [listOpen, setListOpen] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState<string | null>("f1")
  const panel = (title: React.ReactNode, body: React.ReactNode) => (
    <div className="w-72 rounded-xl ring-1 ring-foreground/10">
      <div className="flex h-12 items-center px-4">{title}</div>
      <div className="px-3 pb-3">{body}</div>
    </div>
  )
  return (
    <div className="flex flex-wrap gap-6">
      {panel(
        <FeedsTitle feeds={feeds} openId={listOpen} onOpen={setListOpen} onRename={props.onRename} />,
        <FeedsPanel {...props} feeds={feeds} videos={videos} activeId={active} onValue={onValue} usedBy={usedBy} openId={listOpen} onOpen={setListOpen} />,
      )}
      {panel(
        <FeedsTitle feeds={feeds} openId={detailOpen} onOpen={setDetailOpen} onRename={props.onRename} />,
        <FeedsPanel {...props} feeds={feeds} videos={videos} activeId={active} onValue={onValue} usedBy={usedBy} openId={detailOpen} onOpen={setDetailOpen} activeFeed="f1" />,
      )}
      {panel(<FeedsTitle feeds={[]} openId={null} onOpen={() => {}} onRename={() => {}} />, <FeedsPanel {...props} feeds={[]} videos={videos} activeId={active} onValue={() => {}} usedBy={{}} onAdd={() => {}} openId={null} onOpen={() => {}} />)}
    </div>
  )
}

function SlidesDemo() {
  const slides: Slide[] = [
    { id: "main", video: 0, startedAt: 1, prompt: "Reference" },
    { id: "s1", n: 1, name: "Ready", video: 1, startedAt: 1 },
    { id: "s2", n: 2, name: "Generating", startedAt: 2 },
    { id: "s3", n: 3, name: "Not generated" },
    { id: "s4", n: 4, name: "Needs regen", video: 2, startedAt: 1 },
  ]
  const status = (s: Slide): SlideStatus => (s.id === "s2" ? "generating" : s.startedAt ? "done" : "empty")
  const [active, setActive] = useState("s1")
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <SlidesStrip
        slides={slides}
        active={active}
        ratio={9 / 16}
        status={status}
        locked={false}
        onSelect={setActive}
        onAdd={() => {}}
        onRemove={() => {}}
        start="s1"
        onPreview={() => {}}
        stale={(s) => s.id === "s4"}
        onRename={() => {}}
        includeRef={false}
        onIncludeRef={() => {}}
        onSetStart={() => {}}
      />
    </div>
  )
}

function PromptsDemo() {
  const history: HistoryItem[] = [
    { id: "1", slideId: "main", prompt: "Slow push-in on a red running sneaker on wet asphalt", refs: [], video: 0, startedAt: 1 },
    { id: "2", slideId: "s1", prompt: "Same shoe in electric blue", refs: [], fromReference: true, video: 1, startedAt: 1 },
    { id: "3", slideId: "s1", prompt: "Same shoe in electric blue, night city", refs: [], fromReference: true, video: 2, startedAt: 2 },
    { id: "4", slideId: "s2", prompt: "White colourway on a tennis court", refs: [], fromReference: true, video: 3, startedAt: 3 },
  ]
  const names: Record<string, string> = { main: "Reference video", s1: "Variation 1", s2: "Variation 2" }
  const composer = (
    <div className="rounded-2xl border bg-background p-3 text-sm text-muted-foreground shadow-sm">What should change? The product, character, scene or a mix</div>
  )
  const props = {
    history,
    nameOf: (id: string) => names[id],
    posterOf: (v: number) => GENERATED_VIDEOS[v % GENERATED_VIDEOS.length].poster,
    isGenerating: (h: HistoryItem) => h.id === "4",
    isCurrent: (h: HistoryItem) => h.id !== "2",
    onSelect: () => {},
    composer,
  }
  return (
    <div className="flex gap-4">
      <figure className="flex h-[560px] flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex min-h-0 flex-1"><PromptChat {...props} target={{ id: "s2", name: "Variation 2", isReference: false }} busy /></div>
        <figcaption className="border-t px-2.5 py-1.5 text-[11px] text-muted-foreground">Generating (prompt box dimmed)</figcaption>
      </figure>
      <figure className="flex h-[560px] flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex min-h-0 flex-1"><PromptChat {...props} history={history.slice(0, 3)} target={{ id: "s1", name: "Variation 1", poster: GENERATED_VIDEOS[2].poster, isReference: false }} busy={false} /></div>
        <figcaption className="border-t px-2.5 py-1.5 text-[11px] text-muted-foreground">Ready</figcaption>
      </figure>
    </div>
  )
}

function ToastDemo() {
  const toast = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => toast("Link copied")}>Simple</Button>
      <Button variant="secondary" onClick={() => toast({ title: "Your Flick is live", description: "flamapp.ai/f/maison-living" })}>With description</Button>
      <Button variant="secondary" onClick={() => toast({ title: "Saved to templates", action: { label: "View templates", onClick: () => {} } })}>With action</Button>
      <Button variant="secondary" onClick={() => toast({ title: "Unpublished", kind: "info" })}>Info</Button>
      <Button variant="secondary" onClick={() => toast({ kind: "error", title: "Couldn’t upload sofa.png", description: "Check your connection and try again.", action: { label: "Retry", onClick: () => {} } })}>Upload failed</Button>
      <Button variant="secondary" onClick={() => toast({ kind: "error", title: "sofa.png is too large", description: "Images can be up to 20 MB." })}>Too large</Button>
      <Button variant="secondary" onClick={() => toast({ kind: "error", title: "brief.pdf can’t be uploaded", description: "Use JPG, PNG, WebP or GIF images." })}>Wrong type</Button>
    </div>
  )
}

/* ---------- the panel ---------- */

/** Dev-only: every component and its states, like a small storybook. */
export function ComponentGallery({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  useForcedStates()
  const [current, setCurrent] = useState(ENTRIES[0].name)
  const [q, setQ] = useState("")
  const entry = ENTRIES.find((e) => e.name === current)!
  const list = ENTRIES.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()))
  const kinds = (["UI", "Editor", "Feedback", "Ads"] as const).filter((k) => list.some((e) => e.kind === k))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(760px,90vh)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/40 p-3">
          <DialogHeader className="gap-1 px-2 pb-3 pt-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              Components <DevBadge />
            </DialogTitle>
            <DialogDescription className="text-xs">Dev only. Every component and its states.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-2 px-1">
            <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search components" className="h-8 bg-background pl-8 text-sm" />
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" aria-label="Components">
            {kinds.map((k) => (
              <div key={k} className="flex flex-col gap-0.5">
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{k}</p>
                {list
                  .filter((e) => e.kind === k)
                  .map((e) => (
                    <Button
                      key={e.name}
                      variant="ghost"
                      aria-current={current === e.name}
                      onClick={() => setCurrent(e.name)}
                      className={cn("h-8 justify-start rounded-lg px-2 font-normal text-muted-foreground", current === e.name && "bg-background font-medium text-foreground shadow-sm hover:bg-background")}
                    >
                      {e.name}
                    </Button>
                  ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b px-6 py-4">
            <h3 className="text-base font-medium">{entry.name}</h3>
            <p className="text-sm text-muted-foreground">{entry.about}</p>
          </header>
          <div key={entry.name} className="min-h-0 flex-1 overflow-y-auto p-6">
            {entry.render()}
          </div>
        </main>
      </DialogContent>
    </Dialog>
  )
}

/** A button that opens a dialog, for showing dialogs in the gallery. */
function DialogDemo({ label, render }: { label: string; render: (open: boolean, set: (o: boolean) => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>{label}</Button>
      {render(open, setOpen)}
    </>
  )
}

function DateFilterDemo() {
  const [v, setV] = useState<DateFilterValue>(ALL_DATES)
  return <DateFilter value={v} onChange={setV} />
}

function FontPickerDemo() {
  const [font, setFont] = useState("DM Sans")
  return (
    <div className="flex items-center gap-3">
      <FontPicker font={font} onPick={setFont} />
      <span className="text-sm text-muted-foreground">{font}</span>
    </div>
  )
}

/** Opens a popup from the gallery. */
function PopupDemo({ kind }: { kind: "intro" | "gift" }) {
  const [open, setOpen] = useState(false)
  const [n, setN] = useState(0)
  return (
    <>
      <Button variant="outline" size="sm" className="self-start" onClick={() => (setN((x) => x + 1), setOpen(true))}>
        Open {kind === "intro" ? "How Flicks work" : "Welcome gift"}
      </Button>
      {kind === "intro" ? (
        <HowFlicksWork open={open} onOpenChange={setOpen} />
      ) : (
        <WelcomeGiftDialog key={n} open={open} name="Alex" onClaim={() => {}} onDone={() => setOpen(false)} />
      )}
    </>
  )
}

/* ---------- chat cards ---------- */

const fakeAgent = { items: [], busy: false, waiting: false, send: async () => {}, answer: async () => {}, addAssets: async () => {}, decidePlan: async () => {}, stop: () => {}, retry: () => {} } as unknown as Parameters<typeof AgentItemView>[0]["agent"]
const chatCtx = { videoCost: 48, credits: 1000, addToCanvas: () => {}, focusComposer: () => {}, ratio: 9 / 16, posters: [1, 2, 3].map((i) => GENERATED_VIDEOS[i].poster), progress: () => [{ label: "Reference video", state: "done" as const }, { label: "3 variations", state: "working" as const }, { label: "Thumbnail images", state: "waiting" as const }] }
const demoPlan: Plan = {
  title: "Sport lens drop",
  reference: { prompt: "Athlete against a sunlit concrete wall, slow push-in, golden hour." },
  variations: [
    { name: "Gold", prompt: "Same scene, gold mirrored lenses.", price: "$189", link: "https://example.com/gold" },
    { name: "Sapphire", prompt: "Same scene, sapphire lenses.", price: "$199" },
  ],
  design: { headline: "Find your lens", cta: "Shop now", show_price: true, layout: "bottom" },
}
function ChatCardsDemo() {
  const it = (x: Record<string, unknown>) => ({ id: String(Math.random()), at: 0, ...x }) as Item
  const states = [
    { label: "Thinking", node: <AgentItemView item={it({ kind: "assistant", text: "", streaming: true })} agent={fakeAgent} ctx={chatCtx} /> },
    {
      label: "Questions, docked (1 of 2)",
      node: (
        <QuestionDeck
          agent={{ ...fakeAgent, pendingIds: ["dq1", "dq2"], items: [it({ id: "dq1", kind: "question", toolId: "q1", question: "What should change between variations?", options: [{ label: "Colours", description: "Same scene, a new colourway each" }, { label: "Products" }, { label: "Scenes" }, { label: "Decide for me" }], display: "chips", multi: false, custom: true }), it({ id: "dq2", kind: "question", toolId: "q2", question: "Where will it run?", options: [{ label: "Ads" }, { label: "Website" }], display: "chips", multi: false, custom: true })] } as typeof fakeAgent}
          ctx={chatCtx}
        />
      ),
    },
    { label: "Question", node: <AgentItemView item={it({ kind: "question", toolId: "q", question: "Where will this Flick run?", options: [{ label: "Ads" }, { label: "My website" }, { label: "A link" }], display: "chips", multi: false, custom: true })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Question, answered", node: <AgentItemView item={it({ kind: "question", toolId: "q", question: "Where will this Flick run?", options: [{ label: "Ads" }], display: "chips", multi: false, custom: true, answer: "Ads" })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Images request", node: <AgentItemView item={it({ kind: "assets", toolId: "a", message: "Add product photos or your logo.", kinds: ["product", "logo"] })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Look: layouts (visual answers)", node: <AgentItemView item={it({ kind: "question", toolId: "l", question: "Which layout fits?", display: "layouts", step: "look", multi: false, custom: false, options: [{ label: "Bold bottom", design: { layout: "bottom", thumbnails: { position: "bottom" } } }, { label: "Editorial", design: { layout: "bottom", align: "left", button_style: "sharp", thumbnails: { position: "right", shape: "square", size: "small" } } }, { label: "Clean top", design: { layout: "top", button_style: "light", thumbnails: { shape: "circle" } } }] })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Look: palettes", node: <AgentItemView item={it({ kind: "question", toolId: "c", question: "And the colours?", display: "palettes", step: "look", multi: false, custom: false, options: [{ label: "Ink", colors: ["#09090b", "#a1a1aa", "#ffffff"] }, { label: "Sunset", colors: ["#ea580c", "#fdba74", "#ffffff"] }, { label: "Ocean", colors: ["#2563eb", "#93c5fd", "#ffffff"] }] })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Build progress", node: <AgentItemView item={it({ kind: "build", count: 3 })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Brand", node: <AgentItemView item={it({ kind: "brand", brand: { name: "Lumen", primary_color: "#ea580c", text_color: "#ffffff", font: "Montserrat", tone: "Bold" } })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Plan", node: <AgentItemView item={it({ kind: "plan", toolId: "p", plan: demoPlan, state: "open" })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Image, making", node: <AgentItemView item={it({ kind: "image", prompt: "Gold lens close-up", purpose: "thumbnail", target: "Gold", state: "working" })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Image, added", node: <AgentItemView item={it({ kind: "image", prompt: "Gold lens close-up", purpose: "thumbnail", target: "Gold", state: "done", url: GENERATED_VIDEOS[1].poster, placed: true })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Following guides", node: <AgentItemView item={it({ kind: "skill", names: ["flicks", "brief"] })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Review, to fix", node: <AgentItemView item={it({ kind: "review", pass: 7, fail: ["Gold: headline is 7 words; keep it to 5 for this size.", "Button text is hard to read on its colour."] })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Review, passed", node: <AgentItemView item={it({ kind: "review", pass: 9, fail: [] })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Note", node: <AgentItemView item={it({ kind: "note", text: "Changed the button text." })} agent={fakeAgent} ctx={chatCtx} /> },
    { label: "Error", node: <AgentItemView item={it({ kind: "error", text: "Couldn't reach the AI server." })} agent={fakeAgent} ctx={chatCtx} /> },
  ]
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {states.map((x) => (
        <figure key={x.label} className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <div className="flex flex-1 flex-col justify-center bg-[color-mix(in_oklch,var(--muted),var(--foreground)_4%)] p-3">{x.node}</div>
          <figcaption className="border-t px-2.5 py-1.5 text-[11px] text-muted-foreground">{x.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function MediaPickerDemo() {
  const [picked, setPicked] = useState<string[]>([])
  const media = useMediaAdd((items) => setPicked(items.map((i) => `${i.name}${i.trim ? ` (clip ${i.trim.start.toFixed(1)} to ${i.trim.end.toFixed(1)} s)` : ""}`)))
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" onClick={media.openPicker}>
        Open the picker
      </Button>
      {picked.length > 0 && <p className="text-xs text-muted-foreground">Added: {picked.join(", ")}</p>}
      {media.ui}
    </div>
  )
}
