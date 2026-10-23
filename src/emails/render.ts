/**
 * Email renderer: turns an email's blocks into production HTML and a plain-text part.
 *
 * Built to the usual email rules so it renders in Gmail, Apple Mail, Outlook (desktop, web, mobile)
 * and Yahoo, and stays out of spam:
 * - table layout, all styles inline (the <style> block only adds mobile, dark mode and client fixes)
 * - 600px fluid container with an Outlook (MSO) ghost table; stacks to one column under 600px
 * - bulletproof buttons (VML for Outlook, padded <a> everywhere else), 48px tall, full width on phones
 * - hidden preheader with filler so the inbox preview shows only it
 * - system font stack, 16px body, 4.5:1+ contrast in light and dark, alt text on every image
 * - dark mode via prefers-color-scheme plus Outlook.com's [data-ogsc] hooks, and a white logo swap
 * - mostly text with one or two images, no URL shorteners, no attachments, a plain-text part
 * - footer says why they got it, the company and postal address, and (where allowed) how to opt out
 * Merge tags look like {{first_name}}; the ESP fills them. Previews fill them with sample values.
 */

export type Stream = "transactional" | "notification" | "marketing"

export type Block =
  | { t: "h"; text: string }
  | { t: "p"; text: string; muted?: boolean; small?: boolean }
  | { t: "btn"; label: string; url: string }
  | { t: "link"; label: string; url: string }
  | { t: "stat"; value: string; label: string }
  | { t: "stats"; items: { value: string; label: string }[] }
  | { t: "rows"; rows: [string, string][]; title?: string }
  | { t: "list"; items: { title?: string; text: string }[]; numbered?: boolean }
  | { t: "image"; src: string; alt: string; href?: string; w?: number; h?: number }
  | { t: "fallback"; url: string }
  | { t: "note"; text: string }
  | { t: "hr" }

export type EmailDef = {
  id: string
  area: string
  name: string
  priority: "P0" | "P1" | "P2"
  layout: "Notice" | "Receipt" | "Status" | "Digest" | "Marketing"
  stream: Stream
  trigger: string
  subject: string
  preheader: string
  blocks: Block[]
  /** sample values just for this email's preview */
  sample?: Record<string, string>
}

const C = {
  bg: "#f4f4f5",
  card: "#ffffff",
  text: "#18181b",
  muted: "#52525b",
  faint: "#71717a",
  rule: "#e4e4e7",
  panel: "#f4f4f5",
  brand: "#bb4d00",
  brandText: "#ffffff",
}
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
/** text with **bold** */
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;">$1</strong>')
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1")

function button(label: string, url: string) {
  // Outlook gets a VML rounded rectangle; the width is estimated from the label
  const w = Math.max(200, Math.round(label.length * 9.2 + 64))
  return `<table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
<tr><td class="btn-td" align="center" bgcolor="${C.brand}" style="border-radius:8px;background-color:${C.brand};">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(url)}" style="height:48px;v-text-anchor:middle;width:${w}px;" arcsize="17%" stroke="f" fillcolor="${C.brand}"><w:anchorlock/><center style="color:${C.brandText};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${esc(url)}" class="btn-a" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;line-height:20px;color:${C.brandText};text-decoration:none;border-radius:8px;background-color:${C.brand};mso-hide:all;">${esc(label)}</a><!--<![endif]-->
</td></tr></table>`
}

const P = (inner: string, style = "") => `<p class="text" style="margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:26px;color:${C.text};${style}">${inner}</p>`

function blockHtml(b: Block): string {
  switch (b.t) {
    case "h":
      return `<h1 class="text" style="margin:0 0 16px 0;font-family:${FONT};font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.2px;color:${C.text};">${rich(b.text)}</h1>`
    case "p":
      return b.small
        ? `<p class="muted" style="margin:0 0 16px 0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.faint};">${rich(b.text)}</p>`
        : `<p class="${b.muted ? "muted" : "text"}" style="margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:26px;color:${b.muted ? C.muted : C.text};">${rich(b.text)}</p>`
    case "btn":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 0 20px 0;">${button(b.label, b.url)}</td></tr></table>`
    case "link":
      return P(`<a href="${esc(b.url)}" target="_blank" class="link" style="color:${C.brand};text-decoration:underline;font-weight:600;">${esc(b.label)}</a>`)
    case "stat":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;">
<tr><td class="panel" style="background-color:${C.panel};border-radius:10px;padding:20px 24px;">
<p class="text" style="margin:0;font-family:${FONT};font-size:34px;line-height:40px;font-weight:700;color:${C.text};">${esc(b.value)}</p>
<p class="muted" style="margin:4px 0 0 0;font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};">${esc(b.label)}</p>
</td></tr></table>`
    case "stats": {
      const w = Math.floor(100 / b.items.length)
      const cells = b.items
        .map(
          (s, i) => `<td class="stack" width="${w}%" valign="top" style="padding:0 ${i < b.items.length - 1 ? 12 : 0}px 12px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="panel" style="background-color:${C.panel};border-radius:10px;padding:16px;">
<p class="text" style="margin:0;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;color:${C.text};">${esc(s.value)}</p>
<p class="muted" style="margin:2px 0 0 0;font-family:${FONT};font-size:13px;line-height:18px;color:${C.muted};">${esc(s.label)}</p>
</td></tr></table></td>`,
        )
        .join("")
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px 0;"><tr>${cells}</tr></table>`
    }
    case "rows":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;border-top:1px solid ${C.rule};" class="rule">
${b.rows
  .map(
    ([k, v], i) => `<tr><td class="muted rule" style="padding:12px 0;border-bottom:1px solid ${C.rule};font-family:${FONT};font-size:15px;line-height:22px;color:${C.muted};">${esc(k)}</td><td class="text rule" align="right" style="padding:12px 0;border-bottom:1px solid ${C.rule};font-family:${FONT};font-size:15px;line-height:22px;color:${C.text};font-weight:${i === b.rows.length - 1 && b.title === "total" ? 700 : 500};">${esc(v)}</td></tr>`,
  )
  .join("\n")}
</table>`
    case "list":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
${b.items
  .map(
    (it, i) => `<tr><td valign="top" width="28" class="text" style="padding:0 0 14px 0;font-family:${FONT};font-size:16px;line-height:26px;font-weight:700;color:${C.brand};">${b.numbered ? `${i + 1}.` : "&bull;"}</td>
<td valign="top" class="text" style="padding:0 0 14px 0;font-family:${FONT};font-size:16px;line-height:26px;color:${C.text};">${it.title ? `<strong style="font-weight:600;">${esc(it.title)}</strong><br>` : ""}<span class="${it.title ? "muted" : "text"}" style="color:${it.title ? C.muted : C.text};">${rich(it.text)}</span></td></tr>`,
  )
  .join("\n")}
</table>`
    case "image": {
      const w = b.w ?? 520
      const img = `<img src="${esc(b.src)}" width="${w}" ${b.h ? `height="${b.h}"` : ""} alt="${esc(b.alt)}" style="display:block;width:100%;max-width:${w}px;height:auto;border:0;border-radius:10px;font-family:${FONT};font-size:14px;color:${C.muted};">`
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:4px 0 20px 0;">${b.href ? `<a href="${esc(b.href)}" target="_blank">${img}</a>` : img}</td></tr></table>`
    }
    case "fallback":
      return `<p class="muted" style="margin:0 0 16px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.faint};">Button not working? Paste this link into your browser:<br><a href="${esc(b.url)}" target="_blank" class="link" style="color:${C.brand};text-decoration:underline;word-break:break-all;">${esc(b.url)}</a></p>`
    case "note":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;"><tr><td class="panel" style="background-color:${C.panel};border-radius:10px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:22px;color:${C.muted};"><span class="muted">${rich(b.text)}</span></td></tr></table>`
    case "hr":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;"><tr><td class="rule" style="border-top:1px solid ${C.rule};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
  }
}

function blockText(b: Block): string {
  switch (b.t) {
    case "h":
      return plain(b.text)
    case "p":
      return plain(b.text)
    case "btn":
    case "link":
      return `${b.label}: ${b.url}`
    case "stat":
      return `${b.value} ${b.label}`
    case "stats":
      return b.items.map((s) => `${s.label}: ${s.value}`).join("\n")
    case "rows":
      return b.rows.map(([k, v]) => `${k}: ${v}`).join("\n")
    case "list":
      return b.items.map((it, i) => `${b.numbered ? `${i + 1}.` : "-"} ${it.title ? `${it.title}: ` : ""}${plain(it.text)}`).join("\n")
    case "image":
      return ""
    case "fallback":
      return ""
    case "note":
      return plain(b.text)
    case "hr":
      return "---"
  }
}

function footer(stream: Stream) {
  const why =
    stream === "marketing"
      ? "You’re getting this because you signed up for Flicks news with {{email}}."
      : "You’re getting this because you have a Flicks account with {{email}}."
  const links: [string, string][] = [["Help Center", "{{help_url}}"]]
  if (stream !== "transactional") links.push(["Email preferences", "{{preferences_url}}"])
  if (stream === "marketing") links.push(["Unsubscribe", "{{unsubscribe_url}}"])
  return { why, links }
}

const CSS = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
html, body { margin:0 !important; padding:0 !important; height:100% !important; width:100% !important; }
* { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
table, td { mso-table-lspace:0pt !important; mso-table-rspace:0pt !important; }
table { border-collapse:collapse; border-spacing:0; }
img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
a[x-apple-data-detectors], .unstyle-auto-detected-links a { color:inherit !important; border-bottom:0 !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important; }
u + #body a, #MessageViewBody a { color:inherit; text-decoration:none; font-size:inherit; font-family:inherit; font-weight:inherit; line-height:inherit; }
.btn-a:hover { opacity:0.92; }
@media screen and (max-width:600px) {
  .outer { padding:12px 8px !important; }
  .card { padding:28px 20px !important; border-radius:10px !important; }
  .stack { display:block !important; width:100% !important; box-sizing:border-box; padding:0 0 12px 0 !important; }
  .btn, .btn-td { width:100% !important; }
  .btn-a { display:block !important; text-align:center !important; }
  h1 { font-size:23px !important; line-height:29px !important; }
}
@media (prefers-color-scheme: dark) {
  .body, .bg { background-color:#0f0f10 !important; }
  .card { background-color:#18181b !important; }
  .text, .text strong, h1 { color:#f4f4f5 !important; }
  .muted { color:#a1a1aa !important; }
  .panel { background-color:#27272a !important; }
  .rule { border-color:#3f3f46 !important; }
  .link { color:#fb923c !important; }
  .logo-light { display:none !important; }
  .logo-dark { display:block !important; max-height:none !important; overflow:visible !important; }
}
[data-ogsc] .card { background-color:#18181b !important; }
[data-ogsc] .text, [data-ogsc] h1 { color:#f4f4f5 !important; }
[data-ogsc] .muted { color:#a1a1aa !important; }
[data-ogsc] .panel { background-color:#27272a !important; }
[data-ogsc] .logo-light { display:none !important; }
[data-ogsc] .logo-dark { display:block !important; max-height:none !important; }
`

/** Full HTML for an email, merge tags left in place. */
export function emailHtml(e: EmailDef) {
  const f = footer(e.stream)
  // filler after the preheader so clients don't pull body text into the inbox preview
  const filler = "&#847;&zwnj;&nbsp;".repeat(90)
  return `<!DOCTYPE html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(e.subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<!--[if mso]><style>table,td,div,h1,p,a,span{font-family:Arial,sans-serif !important;}</style><![endif]-->
<style>${CSS}</style>
</head>
<body id="body" class="body" style="margin:0;padding:0;width:100%;word-spacing:normal;background-color:${C.bg};">
<div role="article" aria-roledescription="email" aria-label="${esc(e.subject)}" lang="en" dir="ltr" class="bg" style="font-size:16px;background-color:${C.bg};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(e.preheader)}${filler}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background-color:${C.bg};">
<tr><td align="center" class="outer" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">
<tr><td style="padding:0 4px 20px 4px;">
<a href="{{app_url}}" target="_blank" style="text-decoration:none;">
<img class="logo-light" src="{{asset_url}}/flicks-logo.png" width="112" height="35" alt="Flicks" style="display:block;width:112px;height:35px;border:0;font-family:${FONT};font-size:20px;font-weight:700;color:${C.text};">
<!--[if !mso]><!--><div class="logo-dark" style="display:none;mso-hide:all;max-height:0;overflow:hidden;"><img src="{{asset_url}}/flicks-logo-white.png" width="112" height="35" alt="Flicks" style="display:block;width:112px;height:35px;border:0;"></div><!--<![endif]-->
</a>
</td></tr>
<tr><td class="card" style="background-color:${C.card};border-radius:12px;padding:40px 40px 24px 40px;">
${e.blocks.map(blockHtml).join("\n")}
</td></tr>
<tr><td style="padding:24px 8px 0 8px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint};" class="muted">
<p class="muted" style="margin:0 0 8px 0;color:${C.faint};">${esc(f.why)}</p>
<p class="muted" style="margin:0 0 8px 0;color:${C.faint};">${f.links.map(([l, u]) => `<a href="${u}" target="_blank" class="muted" style="color:${C.faint};text-decoration:underline;">${l}</a>`).join(" &nbsp;·&nbsp; ")}</p>
<p class="muted" style="margin:0;color:${C.faint};">Flicks by Flam · {{company_address}}</p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</div>
</body>
</html>`
}

/** Plain-text part (sent alongside the HTML; helps deliverability and accessibility). */
export function emailText(e: EmailDef) {
  const f = footer(e.stream)
  const body = e.blocks.map(blockText).filter(Boolean).join("\n\n")
  return `Flicks\n\n${body}\n\n---\n${f.why}\n${f.links.map(([l, u]) => `${l}: ${u}`).join("\n")}\nFlicks by Flam · {{company_address}}\n`
}

/** Fills merge tags with values; unknown tags stay as they are. */
export const fill = (s: string, vars: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m))

/** Every merge tag an email uses. */
export const tagsOf = (s: string) => [...new Set([...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))].sort()
