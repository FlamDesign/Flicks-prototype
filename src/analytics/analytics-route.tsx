import { useMemo } from "react"
import { useLibrary } from "@/library"
import { useAds } from "@/ads/ads"
import { useEmbeds } from "@/embeds/embeds"
import { useDevState } from "@/dev/state"
import { buildDataset, buildLargeDataset } from "./data"
import { AnalyticsPage, type AnalyticsTarget } from "./analytics-page"

/** The Analytics page, built from the same Flicks, embeds and placements the rest of the app shows. */
export function AnalyticsRoute({ target }: { target?: AnalyticsTarget | null }) {
  const lib = useLibrary()
  const ads = useAds()
  const embeds = useEmbeds()
  const large = useDevState().state.largeAccount
  const base = useMemo(() => buildDataset(lib.flicks, ads.placements, embeds.embeds, ads.campaigns), [lib.flicks, ads.placements, ads.campaigns, embeds.embeds])
  const data = useMemo(() => (large ? buildLargeDataset(base) : base), [base, large])
  return <AnalyticsPage key={large ? "large" : "sample"} data={data} target={target} />
}
