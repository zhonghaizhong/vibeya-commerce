import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"

/** Resolve the U.S. region without using the storefront's cached region list. */
export async function getVibeyaUsRegion() {
  const { regions } = await sdk.client.fetch<{
    regions: HttpTypes.StoreRegion[]
  }>("/store/regions", { cache: "no-store" })

  return regions.find((region) =>
    region.countries?.some((country) => country.iso_2?.toLowerCase() === "us")
  )
}
