import marketTranslations from "./market-translations.json"

type LocalizedMarket = keyof typeof marketTranslations.ui

export function getMarketUiCopy(countryCode?: string) {
  const market = countryCode?.toLowerCase() as LocalizedMarket | undefined
  return market ? marketTranslations.ui[market] : undefined
}

export function getFreeShippingLabel(countryCode?: string) {
  switch (countryCode?.toLowerCase()) {
    case "jp":
      return "送料無料"
    case "mx":
      return "Envío gratis"
    default:
      return "Free shipping"
  }
}
