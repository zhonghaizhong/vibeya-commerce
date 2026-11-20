import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"

/** Resolve a destination country's Medusa region without using the storefront's cached region list. */
export async function getVibeyaRegion(countryCode = "us") {
  const { regions } = await sdk.client.fetch<{
    regions: HttpTypes.StoreRegion[]
  }>("/store/regions", { cache: "no-store" })

  return regions.find((region) =>
    region.countries?.some((country) => country.iso_2?.toLowerCase() === countryCode.toLowerCase())
  )
}

export async function getVibeyaUsRegion() {
  return getVibeyaRegion("us")
}

export async function getVibeyaMarket(countryCode: string) {
  return sdk.client.fetch<{ country_code: string; region: { id: string; currency_code: string } | null; product_ids: string[]; handles: string[]; localized_media?: Record<string, Record<string, string[]>>; product_content?: Record<string, Record<string, Record<string, unknown>>>; product_designer?: Record<string, { enabled: boolean; legacyProfile?: string; mode: "front-back" | "full-surface"; placements: Array<"front" | "back" | "both" | "wrap">; galleryUrls: string[]; references: Array<{ color: string; size: string; side: "front" | "back" | "surface"; baseImageUrl: string; printAreaImageUrl: string }> }>; category_content?: Record<string, { label: string; productHandles: string[]; legacyHandles: string[]; locales: Record<string, { label: string; seoTitle: string; description: string }> }> }>(
    `/store/vibeya/market?country_code=${encodeURIComponent(countryCode.toLowerCase())}`,
    { cache: "no-store" }
  )
}
