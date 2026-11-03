/**
 * One format for numbers and dates everywhere (US English, whatever the browser's language):
 *   counts   9,500 · 656K · 1.2M   (abbreviated from 10,000)
 *   money    $4,212.00             (always cents; the short form $656K only where space is tight)
 *   percent  2.4%
 *   dates    Oct 21 · Oct 21, 2025 (the year only when it isn't this year)
 *   times    Oct 21, 3:04 PM
 */
const L = "en-US"

export const int = (n: number) => Math.round(n).toLocaleString(L)

export const compact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (a >= 10_000) return `${Math.round(n / 1000).toLocaleString(L)}K`
  return int(n)
}

export const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const usdShort = (n: number) => (Math.abs(n) >= 10_000 ? `${n < 0 ? "−" : ""}$${compact(Math.abs(n))}` : usd(n))

export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`

const sameYear = (d: Date) => d.getFullYear() === new Date().getFullYear()
export const date = (t: number | Date) => {
  const d = new Date(t)
  return d.toLocaleDateString(L, { month: "short", day: "numeric", ...(sameYear(d) ? {} : { year: "numeric" }) })
}
/** with the year always (invoices, records) */
export const fullDate = (t: number | Date) => new Date(t).toLocaleDateString(L, { month: "short", day: "numeric", year: "numeric" })
export const dateTime = (t: number | Date) => `${date(t)}, ${new Date(t).toLocaleTimeString(L, { hour: "numeric", minute: "2-digit" })}`
/** Mon, Oct 21 (day lists) */
export const weekdayDate = (t: number | Date) => {
  const d = new Date(t)
  return d.toLocaleDateString(L, { weekday: "short", month: "short", day: "numeric", ...(sameYear(d) ? {} : { year: "numeric" }) })
}
