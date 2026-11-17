import marketTranslations from "@lib/util/market-translations.json"

type ProductMarket = keyof typeof marketTranslations.products
type ProductMarketCopy = {
  title: (handle: string, fallback?: string | null) => string
  description: (handle: string, description?: string | null) => string
  productInformation: string
  shippingReturns: string
  material: string
  origin: string
  type: string
  weight: string
  dimensions: string
  fastDelivery: string
  deliveryDescription: string
  simpleExchanges: string
  exchangeDescription: string
  easyReturns: string
  returnDescription: string
  select: string
  selectOptions: string
  selectVariant: string
  outOfStock: string
  inStock: string
  addToCart: string
  from: string
  imageAlt: (index: number) => string
}

export function getProductMarketCopy(countryCode: string): ProductMarketCopy | undefined {
  const market = countryCode.toLowerCase() as ProductMarket
  const translations = marketTranslations.products[market]
  if (!translations) return undefined

  return {
    ...translations.details,
    title: (handle, fallback) => handle === "vibeya-custom-womens-yoga-set"
      ? translations.title
      : fallback ?? "",
    description: (handle, description) => handle === "vibeya-custom-womens-yoga-set"
      ? translations.description
      : description ?? "",
    imageAlt: (index) => translations.imageAlt.replace("{index}", String(index)),
  }
}

export function translateProductOption(countryCode: string, title: string) {
  const translations = marketTranslations.products[countryCode.toLowerCase() as ProductMarket]
  const normalized = title.trim().toLowerCase()
  if (!translations) return title
  if (normalized === "color") return translations.optionLabels.color
  if (normalized === "size") return translations.optionLabels.size
  return title
}

export function translateProductOptionValue(countryCode: string, title: string, value: string) {
  if (title.trim().toLowerCase() !== "color") return value
  const translations = marketTranslations.products[countryCode.toLowerCase() as ProductMarket]
  return translations?.colorOptions[value.trim().toLowerCase() as keyof typeof translations.colorOptions] ?? value
}

export function translateProductAttribute(countryCode: string, kind: "material" | "origin" | "type", value?: string | null) {
  if (!value) return value
  const translations = marketTranslations.products[countryCode.toLowerCase() as ProductMarket]
  if (!translations) return value
  const normalized = value.trim().toLowerCase()
  if (kind === "material" && /polyester/.test(normalized) && /spandex|elastane/.test(normalized)) {
    return translations.attributes.polyesterSpandex
  }
  if (kind === "origin" && normalized === "china") return translations.attributes.china
  if (kind === "type" && normalized === "apparel") return translations.attributes.apparel
  return value
}
