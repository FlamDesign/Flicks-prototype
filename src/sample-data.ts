import { ads, flickRef, useAds } from "@/ads/ads"
import { embeds, useEmbeds } from "@/embeds/embeds"
import { getLibrary, watchLibrary, type FlickRecord } from "@/library"

/**
 * Campaigns, placements, embeds (and so Analytics and the Ad Balance ledger) are not kept on the
 * server yet. So that those pages show something real, a sample is built from the account's own
 * finished Flicks on every visit (campaigns and embeds aren't saved anywhere yet, so a reload
 * starts from the sample again); the dev tools can rebuild or clear it. The Flicks themselves are
 * never sample data.
 */

/** the Flicks a sample can point at: finished, not failed, newest first */
export const finishedFlicks = (flicks: FlickRecord[]) => flicks.filter((f) => !f.exporting && f.remote?.status !== "failed")

/** cleared from the dev tools: stays empty for this visit */
let cleared = false

/** builds the sample from the Flicks here now (nothing when there are none yet) */
export function seedSampleData(): boolean {
  const flicks = finishedFlicks(getLibrary().flicks).map(flickRef)
  if (!flicks.length) return false
  ads.seed(flicks)
  embeds.seed(flicks)
  cleared = false
  return true
}
export function clearSampleData() {
  ads.clear()
  embeds.clear()
  cleared = true
}

let started = false
/** once the server's Flicks arrive, the sample is built (unless it was cleared this visit) */
export function startSampleData() {
  if (started) return
  started = true
  let stop: (() => void) | undefined
  const tryNow = () => {
    const lib = getLibrary()
    if (!lib.synced || cleared) return
    if (seedSampleData()) stop?.()
  }
  stop = watchLibrary(() => tryNow())
  tryNow()
}

/** the Campaigns, Embeds and Analytics pages are empty until the sample is built or the user adds to them */
export const useSampleDataEmpty = () => {
  const a = useAds()
  const e = useEmbeds()
  return !a.campaigns.length && !a.placements.length && !e.embeds.length
}
