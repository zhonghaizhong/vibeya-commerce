export const SUPPORTED_MARKET_COUNTRIES = ["us", "ca", "jp", "mx"] as const

export type SupportedMarketCountry = (typeof SUPPORTED_MARKET_COUNTRIES)[number]

export function isSupportedMarketCountry(value: string | null | undefined): value is SupportedMarketCountry {
  return SUPPORTED_MARKET_COUNTRIES.includes((value ?? "").toLowerCase() as SupportedMarketCountry)
}
