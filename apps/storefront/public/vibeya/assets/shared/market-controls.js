(() => {
  const catalog = window.VIBEYA_MARKET_TRANSLATIONS
  const destination = document.getElementById("navDestination")
  const language = document.getElementById("navLanguage")
  if (!catalog || !destination || !language) return

  const markets = catalog.markets || {}
  const countryCodes = Object.keys(markets)
  const params = new URLSearchParams(window.location.search)
  const localeFromUrl = params.get("locale")
  const pathCountry = window.location.pathname.match(/^\/(ca|mx|jp)\/inspiration\//i)?.[1]
  let country = (pathCountry || params.get("country") || countryCodes.find(code => (markets[code].locales || []).includes(localeFromUrl)) || "us").toLowerCase()
  if (!markets[country]) country = "us"
  const locales = markets[country].locales || [markets[country].defaultLocale]
  let locale = locales.includes(params.get("locale")) ? params.get("locale") : markets[country].defaultLocale

  const updateControls = () => {
    const names = catalog.countryNames?.[locale] || catalog.countryNames?.[markets[country].defaultLocale] || {}
    destination.replaceChildren(...countryCodes.map(code => new Option(names[code] || code.toUpperCase(), code)))
    destination.value = country

    const supportedLocales = markets[country].locales || [markets[country].defaultLocale]
    language.replaceChildren(...supportedLocales.map(code => new Option(catalog.localeNames?.[code] || code, code)))
    language.value = locale

    const labels = catalog.navigation?.[locale] || catalog.navigation?.[markets[country].defaultLocale] || {}
    const shipTo = document.querySelector('[data-nav-key="shipTo"]')
    const languageLabel = document.querySelector('[data-nav-key="language"]')
    if (shipTo) shipTo.textContent = labels.shipTo || "Ship to"
    if (languageLabel) languageLabel.textContent = labels.language || "Language"
    destination.setAttribute("aria-label", labels.shipTo || "Shipping destination")
    language.setAttribute("aria-label", labels.language || "Language")
    document.querySelector('header a[aria-label="Search"]')?.setAttribute("aria-label", labels.search || "Search")
    document.querySelector('header a[aria-label="Open shopping bag"]')?.setAttribute("aria-label", labels.bag || "Shopping bag")

    const menuButton = document.getElementById("menuBtn")
    if (menuButton) menuButton.setAttribute("aria-label", menuButton.getAttribute("aria-expanded") === "true" ? labels.closeMenu || "Close menu" : labels.openMenu || "Open menu")
  }

  const navigateWith = (nextCountry, nextLocale) => {
    const next = new URL(window.location.href)
    if (/^\/(?:us|ca|mx|jp)\/inspiration\//i.test(next.pathname)) {
      next.pathname = nextCountry === "us" ? "/vibeya/inspiration/index.html" : `/${nextCountry}/inspiration/`
      next.hash = ""
    }
    next.searchParams.set("country", nextCountry)
    next.searchParams.set("locale", nextLocale)
    window.location.assign(next.href)
  }

  updateControls()
  destination.addEventListener("change", () => {
    const nextCountry = destination.value.toLowerCase()
    const nextMarket = markets[nextCountry]
    if (!nextMarket) return
    navigateWith(nextCountry, nextMarket.defaultLocale)
  })
  language.addEventListener("change", () => {
    const nextLocale = language.value
    if (!(markets[country].locales || []).includes(nextLocale)) return
    navigateWith(country, nextLocale)
  })
})()
