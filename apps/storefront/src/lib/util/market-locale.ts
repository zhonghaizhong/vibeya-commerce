import marketTranslations from "./market-translations.json"

const MARKET_DEFAULT_LOCALES: Record<string, string> = Object.fromEntries(
  Object.entries(marketTranslations.markets).map(([countryCode, market]) => [countryCode, market.defaultLocale])
)

const MARKET_SUPPORTED_LOCALES: Record<string, string[]> = Object.fromEntries(
  Object.entries(marketTranslations.markets).map(([countryCode, market]) => [countryCode, market.locales])
)

const MARKET_HREFLANG_LOCALES: Record<string, { hreflang: string; locale: string }[]> = Object.fromEntries(
  Object.entries(marketTranslations.markets).map(([countryCode, market]) => [
    countryCode,
    market.locales.map((locale) => ({ hreflang: locale, locale })),
  ])
)

export function getMarketDefaultLocale(countryCode: string) {
  return MARKET_DEFAULT_LOCALES[countryCode.toLowerCase()] ?? "en-US"
}

export function getMarketLocale(countryCode: string, requestedLocale?: string) {
  const market = countryCode.toLowerCase()
  return requestedLocale && (MARKET_SUPPORTED_LOCALES[market] ?? MARKET_SUPPORTED_LOCALES.us).includes(requestedLocale)
    ? requestedLocale
    : getMarketDefaultLocale(market)
}

export function getMarketLocales(countryCode: string) {
  return MARKET_HREFLANG_LOCALES[countryCode.toLowerCase()] ?? []
}

export function getMarketLocaleUrl(
  origin: string,
  countryCode: string,
  path: string,
  locale: string
) {
  const normalizedPath = path || "/"
  const base = `${origin.replace(/\/$/, "")}/${countryCode.toLowerCase()}${normalizedPath}`
  if (locale === getMarketDefaultLocale(countryCode)) {
    return base
  }

  return `${base}?locale=${encodeURIComponent(locale)}`
}

export function getMarketAlternateUrls(
  origin: string,
  path: string,
  countryCodes: string[]
) {
  const alternates = Object.fromEntries(
    countryCodes.flatMap((countryCode) =>
      getMarketLocales(countryCode).map(({ hreflang, locale }) => [
        hreflang,
        getMarketLocaleUrl(origin, countryCode, path, locale),
      ])
    )
  )
  const fallbackCountry = countryCodes.includes("us") ? "us" : countryCodes[0]

  return fallbackCountry
    ? {
        ...alternates,
        "x-default": getMarketLocaleUrl(
          origin,
          fallbackCountry,
          path,
          getMarketDefaultLocale(fallbackCountry)
        ),
      }
    : alternates
}
