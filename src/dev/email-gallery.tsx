import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Download01Icon, Search01Icon, SmartPhone01Icon, ComputerIcon, Moon02Icon, Sun03Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EMAILS, SAMPLE } from "@/emails/catalog"
import { emailHtml, emailText, fill, tagsOf, type EmailDef } from "@/emails/render"
import logo from "@/assets/email/flicks-logo.png"
import logoWhite from "@/assets/email/flicks-logo-white.png"
import imgTemplate from "@/assets/email/preview-template.jpg"
import imgProject from "@/assets/email/preview-project.jpg"
import imgVideo from "@/assets/email/preview-video.jpg"
import imgFlick from "@/assets/email/preview-flick.jpg"
import imgFeature from "@/assets/email/preview-feature.jpg"

/** Preview-only images and logo; real sends use hosted files at {{asset_url}} and per-email image URLs. */
const PREVIEW_IMAGES: Record<string, string> = {
  template_image_url: imgTemplate,
  project_thumbnail_url: imgProject,
  video_thumbnail_url: imgVideo,
  flick_thumbnail_url: imgFlick,
  feature_image_url: imgFeature,
}
const preview = (e: EmailDef, dark: boolean) => {
  let html = emailHtml(e).replaceAll("{{asset_url}}/flicks-logo.png", logo).replaceAll("{{asset_url}}/flicks-logo-white.png", logoWhite)
  html = fill(html, { ...SAMPLE, ...PREVIEW_IMAGES, ...e.sample })
  // links do nothing in the preview
  html = html.replace("</head>", "<base target=\"_blank\"><style>a{pointer-events:none}</style></head>")
  return dark ? html.replace("@media (prefers-color-scheme: dark)", "@media all") : html
}

const STREAM_LABEL = { transactional: "Transactional", notification: "Notification", marketing: "Marketing" } as const
const PRIORITY_CLASS = {
  P0: "bg-red-500/10 text-red-700 dark:text-red-300",
  P1: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  P2: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
} as const

function copy(text: string) {
  return navigator.clipboard?.writeText(text).catch(() => fallbackCopy(text)) ?? Promise.resolve(fallbackCopy(text))
}
function fallbackCopy(text: string) {
  const t = document.createElement("textarea")
  t.value = text
  document.body.appendChild(t)
  t.select()
  document.execCommand("copy")
  t.remove()
}
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const GUIDE = "guide"

export function EmailGallery({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [current, setCurrent] = useState(EMAILS[0].id)
  const [q, setQ] = useState("")
  const list = EMAILS.filter((e) => `${e.name} ${e.subject} ${e.area}`.toLowerCase().includes(q.trim().toLowerCase()))
  const areas = [...new Set(list.map((e) => e.area))]
  const counts = { P0: EMAILS.filter((e) => e.priority === "P0").length, P1: EMAILS.filter((e) => e.priority === "P1").length, P2: EMAILS.filter((e) => e.priority === "P2").length }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(820px,92vh)] gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/40 p-3">
          <DialogHeader className="gap-1 px-2 pb-3 pt-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              Emails <Badge variant="secondary" className="font-mono text-[10px]">DEV</Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {EMAILS.length} emails · {counts.P0} P0 · {counts.P1} P1 · {counts.P2} P2
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-2 px-1">
            <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search emails" className="h-8 bg-background pl-8 text-sm" />
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" aria-label="Emails">
            <Button
              variant="ghost"
              aria-current={current === GUIDE}
              onClick={() => setCurrent(GUIDE)}
              className={cn("h-8 justify-start rounded-lg px-2 font-normal text-muted-foreground", current === GUIDE && "bg-background font-medium text-foreground shadow-sm hover:bg-background")}
            >
              Sending guidelines
            </Button>
            {areas.map((a) => (
              <div key={a} className="flex flex-col gap-0.5">
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{a}</p>
                {list
                  .filter((e) => e.area === a)
                  .map((e) => (
                    <Button
                      key={e.id}
                      variant="ghost"
                      aria-current={current === e.id}
                      onClick={() => setCurrent(e.id)}
                      className={cn("h-auto min-h-8 justify-between gap-2 whitespace-normal rounded-lg px-2 py-1.5 text-left font-normal text-muted-foreground", current === e.id && "bg-background font-medium text-foreground shadow-sm hover:bg-background")}
                    >
                      <span className="min-w-0">{e.name}</span>
                      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", PRIORITY_CLASS[e.priority])}>{e.priority}</span>
                    </Button>
                  ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">{current === GUIDE ? <Guidelines /> : <EmailView key={current} e={EMAILS.find((x) => x.id === current)!} />}</main>
      </DialogContent>
    </Dialog>
  )
}

function EmailView({ e }: { e: EmailDef }) {
  const [tab, setTab] = useState<"preview" | "html" | "text">("preview")
  const [mobile, setMobile] = useState(false)
  const [dark, setDark] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const html = useMemo(() => emailHtml(e), [e])
  const text = useMemo(() => emailText(e), [e])
  const shown = useMemo(() => preview(e, dark), [e, dark])
  const tags = useMemo(() => tagsOf(html + e.subject + e.preheader), [html, e])
  const done = (what: string) => {
    setCopied(what)
    setTimeout(() => setCopied(null), 1500)
  }
  const filledSubject = fill(e.subject, SAMPLE)
  const filledPre = fill(e.preheader, SAMPLE)

  return (
    <>
      <header className="flex flex-col gap-3 border-b px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-1 text-base font-medium">{e.name}</h3>
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", PRIORITY_CLASS[e.priority])}>{e.priority}</span>
          <Badge variant="secondary" className="font-normal">{e.layout}</Badge>
          <Badge variant="secondary" className="font-normal">{STREAM_LABEL[e.stream]}</Badge>
          <Badge variant="outline" className="font-normal">{e.stream === "transactional" ? "Always sent" : e.stream === "marketing" ? "Opt-in, unsubscribe link" : "Can be turned off"}</Badge>
        </div>
        <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="font-medium">{e.subject}</dd>
          <dt className="text-muted-foreground">Preheader</dt>
          <dd>{e.preheader}</dd>
          <dt className="text-muted-foreground">Sent when</dt>
          <dd>{e.trigger}</dd>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="text">Plain text</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === "preview" && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon-sm" aria-label={mobile ? "Show desktop width" : "Show phone width"} onClick={() => setMobile((m) => !m)}>
                    <HugeiconsIcon icon={mobile ? ComputerIcon : SmartPhone01Icon} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{mobile ? "Desktop width" : "Phone width (375px)"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon-sm" aria-label={dark ? "Show light mode" : "Show dark mode"} onClick={() => setDark((d) => !d)}>
                    <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{dark ? "Light mode" : "Dark mode (Apple Mail, Outlook.com)"}</TooltipContent>
              </Tooltip>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(html).then(() => done("html"))}>
              <HugeiconsIcon icon={copied === "html" ? Tick02Icon : Copy01Icon} className="size-3.5" />
              {copied === "html" ? "Copied" : "Copy HTML"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(text).then(() => done("text"))}>
              <HugeiconsIcon icon={copied === "text" ? Tick02Icon : Copy01Icon} className="size-3.5" />
              {copied === "text" ? "Copied" : "Copy text"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => download(`flicks-${e.id}.html`, html, "text/html")}>
              <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
              .html
            </Button>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-6">
        {tab === "preview" ? (
          <div className={cn("mx-auto flex flex-col gap-3", mobile ? "w-[375px]" : "w-full max-w-[760px]")}>
            {/* how it looks in the inbox list */}
            <div className="flex items-start gap-3 rounded-xl bg-background p-3 ring-1 ring-foreground/10">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">F</span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">Flicks</p>
                <p className="truncate font-medium">{filledSubject}</p>
                <p className="truncate text-muted-foreground">{filledPre}</p>
              </div>
            </div>
            <iframe
              title={`${e.name} preview`}
              srcDoc={shown}
              // grows to the email's height, so the whole email shows without an inner scrollbar
              onLoad={(ev) => {
                const f = ev.currentTarget
                const d = f.contentDocument
                if (d) f.style.height = `${d.documentElement.scrollHeight}px`
              }}
              className="h-[720px] w-full rounded-xl bg-white ring-1 ring-foreground/10"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tab === "html" && (
              <p className="text-xs text-muted-foreground">
                Merge tags ({tags.length}): {tags.map((t) => `{{${t}}}`).join(" ")}
              </p>
            )}
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-background p-4 font-mono text-xs leading-relaxed ring-1 ring-foreground/10">{tab === "html" ? html : text}</pre>
          </div>
        )}
      </div>
    </>
  )
}

const RULES: { title: string; items: string[] }[] = [
  {
    title: "Authentication and sending",
    items: [
      "SPF, DKIM (2048-bit) and DMARC on the sending domain; start DMARC at p=none, then move to quarantine once reports are clean.",
      "Send from a subdomain: transactional and notification mail from one (for example mail.flamapp.ai), marketing from another (for example news.flamapp.ai), so marketing never affects sign-in links and receipts.",
      "One consistent From name, “Flicks”, and a real reply-to that someone reads. No no-reply addresses.",
      "Warm up a new domain or IP over 2 to 4 weeks, starting with the most engaged users.",
      "Marketing mail carries List-Unsubscribe and List-Unsubscribe-Post (one-click) headers, as Gmail and Yahoo require for bulk senders. Keep spam complaints under 0.1%.",
    ],
  },
  {
    title: "Content",
    items: [
      "Every email has a plain-text part (Copy text) and a preheader.",
      "Mostly text: images are the logo and at most one product image, all with alt text. No image-only emails.",
      "No URL shorteners. Links go to flamapp.ai and the link text says where it goes.",
      "Subjects stay under 50 characters, in sentence case, with no “free”, all caps or exclamation marks.",
      "The sign-in link email has no tracking pixel or click tracking, so the link works and isn't rewritten.",
      "The footer says why they got it, the company and postal address, and for optional emails how to turn them off.",
    ],
  },
  {
    title: "Layout",
    items: [
      "600px max width, fluid below it; stacks to one column on phones. Buttons go full width on phones and are 48px tall.",
      "Table layout with inline styles; VML buttons for Outlook on Windows; Arial fallback in Outlook.",
      "16px body text, 26px line height; colours meet 4.5:1 contrast in light and dark mode.",
      "Dark mode via prefers-color-scheme (Apple Mail, iOS, Outlook for Mac) and [data-ogsc] (Outlook.com); a white logo swaps in.",
    ],
  },
  {
    title: "Before sending",
    items: [
      "Test in Litmus or Email on Acid across Gmail (web, iOS, Android), Apple Mail, Outlook (Windows, Mac, web) and Yahoo.",
      "Check spam scoring with mail-tester.com or GlockApps; aim for 10/10.",
      "Host the logos and images at {{asset_url}} on a flamapp.ai domain over HTTPS; never embed images as data or attachments.",
    ],
  },
]

function Guidelines() {
  return (
    <>
      <header className="border-b px-6 py-4">
        <h3 className="text-base font-medium">Sending guidelines</h3>
        <p className="text-sm text-muted-foreground">How these emails are built, and what sending needs so they reach the inbox.</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {RULES.map((r) => (
            <section key={r.title} className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold">{r.title}</h4>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                {r.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </section>
          ))}
          <section className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">Logos to host</h4>
            <div className="flex flex-wrap gap-3">
              {[
                ["flicks-logo.png", logo, "bg-white"],
                ["flicks-logo-white.png", logoWhite, "bg-neutral-900"],
              ].map(([name, src, bg]) => (
                <div key={name} className="flex items-center gap-3 rounded-xl p-2 pr-3 ring-1 ring-foreground/10">
                  <span className={cn("grid h-12 w-28 place-items-center rounded-lg", bg)}>
                    <img src={src} alt="" className="h-6 w-auto" />
                  </span>
                  <span className="text-sm">{name}</span>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fetch(src).then((r) => r.blob()).then((b) => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click() })}>
                    <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
