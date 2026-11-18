import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getMarketLocale } from "@lib/util/market-locale"
import { getVibeyaMarket } from "@lib/vibeya/region"

export async function getShopData(countryCode: string, locale?: string) {
  const normalizedCountry = countryCode.toLowerCase()
  const market = await getVibeyaMarket(normalizedCountry).catch(() => null)
  if (!market?.region || !market.handles.length) return null

  const [{ response }, region] = await Promise.all([
    listProducts({
      countryCode: normalizedCountry,
      queryParams: { limit: 100, locale: getMarketLocale(normalizedCountry, locale) },
    }),
    getRegion(normalizedCountry),
  ])

  if (!region) return null
  const availableHandles = new Set(market.handles)
  const products = response.products.filter((product) => availableHandles.has(product.handle))
  return products.length ? { products, region } : null
}
