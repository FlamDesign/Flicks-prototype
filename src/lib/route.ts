/**
 * Every page has its own address, so a reload, Back and a pasted link land where they should:
 * / (Create), /projects, /p/<project>, /flicks, /f/<flick>, /assets, /campaigns[/<placement>],
 * /embeds[/<embed>], /analytics[/<kind>/<id>], /templates/<id>, /ad-balance, /credits, /account.
 * The app's page state stays the source of truth; the address follows it, and a change of address
 * (Back, Forward, a reload) sets the state. Only on a host that serves the app from its root
 * (Cloudflare Pages, the dev server): a relative build keeps its one address.
 */
export type Route = { page: string; id?: string; kind?: string }

const PATHS: Record<string, string> = {
  Create: "/",
  Projects: "/projects",
  Generate: "/p",
  Flicks: "/flicks",
  Flick: "/f",
  Assets: "/assets",
  Campaigns: "/campaigns",
  Embeds: "/embeds",
  Analytics: "/analytics",
  Template: "/templates",
  "Ad Balance": "/ad-balance",
  Credits: "/credits",
  Account: "/account",
}
const PAGES = Object.fromEntries(Object.entries(PATHS).map(([p, path]) => [path, p]))

/** the app is served from the root of its host, so paths can carry pages */
export const routed = () => typeof window !== "undefined" && import.meta.env.BASE_URL === "/" && location.protocol !== "file:"

export function pathFor(r: Route): string {
  const base = PATHS[r.page] ?? "/"
  if (!r.id) return base
  return r.kind ? `${base}/${r.kind}/${encodeURIComponent(r.id)}` : `${base}/${encodeURIComponent(r.id)}`
}

export function parsePath(pathname: string): Route {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean)
  if (!parts.length) return { page: "Create" }
  const page = PAGES[`/${parts[0]}`]
  if (!page) return { page: "Create" }
  // /analytics/<kind>/<id>; every other page has at most an id
  if (page === "Analytics" && parts.length >= 3) return { page, kind: parts[1], id: decodeURIComponent(parts[2]) }
  return parts[1] ? { page, id: decodeURIComponent(parts[1]) } : { page }
}

export const currentRoute = () => parsePath(location.pathname)

/** sets the address to the route when it isn't already (a new entry in the history) */
export function showRoute(r: Route) {
  if (!routed()) return
  const path = pathFor(r)
  if (location.pathname === path) return
  history.pushState(null, "", path + location.search + location.hash)
}
