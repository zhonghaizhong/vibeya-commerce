import marketTranslations from "./market-translations.json"

type LocalizedMarket = keyof typeof marketTranslations.ui

export function getMarketUiCopy(countryCode?: string) {
  const market = countryCode?.toLowerCase() as LocalizedMarket | undefined
  return market ? marketTranslations.ui[market] : undefined
}
