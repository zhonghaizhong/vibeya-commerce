export function getVibeyaInspirationHref(countryCode: string, locale?: string): string {
  const country = countryCode.toLowerCase()
  const path = country === "us" ? "/vibeya/inspiration/index.html" : `/${country}/inspiration/`
  const params = new URLSearchParams({ country })
  if (locale) params.set("locale", locale)
  return `${path}?${params.toString()}`
}
