"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { updateRegion } from "@lib/data/cart"
import { updateLocale } from "@lib/data/locale-actions"
import { getMarketDefaultLocale, getMarketLocale } from "@lib/util/market-locale"
import marketTranslations from "@lib/util/market-translations.json"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getVibeyaMenuHref, useVibeyaMenu } from "@modules/vibeya/data/use-vibeya-menu"
import styles from "./nav.module.css"

const DESTINATIONS = Object.keys(marketTranslations.markets)
const MARKET_LOCALES: Record<string, string[]> = Object.fromEntries(
  Object.entries(marketTranslations.markets).map(([market, config]) => [market, config.locales])
)
const MARKET_LANGUAGES = Object.fromEntries(
  Object.entries(marketTranslations.markets).map(([market, config]) => [
    market,
    config.locales.map((code) => ({ code, name: marketTranslations.localeNames[code as keyof typeof marketTranslations.localeNames] })),
  ])
)
const NAV_LABELS = marketTranslations.navigation

function getDestinationLabel(code: string, locale: string) {
  const names = marketTranslations.countryNames[locale as keyof typeof marketTranslations.countryNames] as Record<string, string> | undefined
  return names?.[code] ?? code
}

type NavProps = { countryCode: string; currentLocale: string | null }

export default function Nav({ countryCode, currentLocale }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const navigation = useVibeyaMenu()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const normalizedCountry = countryCode.toLowerCase()
  const requestedLocale = searchParams.get("locale")
  const cookieLocale = currentLocale && MARKET_LOCALES[normalizedCountry]?.includes(currentLocale) ? currentLocale : undefined
  const currentLanguage = getMarketLocale(normalizedCountry, requestedLocale || cookieLocale)
  const labels = NAV_LABELS[currentLanguage as keyof typeof NAV_LABELS] ?? NAV_LABELS["en-US"]
  const translatedMenuLabels: Record<string, string> = {
    home: labels.home,
    shop: labels.shop,
    create: labels.create,
    inspiration: labels.inspiration,
    "how-it-works": labels.how,
  }

  const closeMenu = () => setMenuOpen(false)
  const changeDestination = (nextCountry: string) => {
    if (nextCountry === normalizedCountry) return
    startTransition(async () => {
      await updateLocale(getMarketDefaultLocale(nextCountry)).catch(() => undefined)
      await updateRegion(nextCountry)
      router.push(`/${nextCountry}/`)
      router.refresh()
    })
  }
  const changeLanguage = (locale: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("locale", locale)
    const query = params.toString()
    const hash = typeof window === "undefined" ? "" : window.location.hash
    startTransition(async () => {
      await updateLocale(locale).catch(() => undefined)
      router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`)
      router.refresh()
    })
  }

  return (
    <>
      <div className={styles.announcement} data-vibeya-shell-announcement>
        {labels.announcement ?? "YOUR IDEA, YOUR VIBE, YOURS TO KEEP. ✳ MADE JUST FOR YOU"}
      </div>
      <header data-vibeya-shell-nav className={styles.header}>
        <nav className={styles.topnav} aria-label={labels.mainNavigation ?? "Main navigation"}>
          <LocalizedClientLink href="/" onClick={closeMenu} className={styles.logo} data-testid="nav-store-link">
            VIBEYA<span>.</span>
          </LocalizedClientLink>

          <div className={`${styles.navigation} ${menuOpen ? styles.open : ""}`} id="main-navigation">
            {navigation.map((item) => {
              const href = getVibeyaMenuHref(item)
              const destinationHref = item.target === "inspiration"
                ? `${href}?country=${encodeURIComponent(normalizedCountry)}&locale=${encodeURIComponent(currentLanguage)}`
                : href
              const className = item.featured ? styles.featured : styles.link
              const content = <>{item.target === "create" && "✦  "}{translatedMenuLabels[item.target] ?? item.label}</>

              return item.target === "inspiration" || href.startsWith("/vibeya/") ? (
                <a key={item.id} href={destinationHref} onClick={closeMenu} className={className}>
                  {content}
                </a>
              ) : (
                <LocalizedClientLink key={item.id} href={href} onClick={closeMenu} className={className}>
                  {content}
                </LocalizedClientLink>
              )
            })}
            <LocalizedClientLink href="/#my-designs" onClick={closeMenu} className={styles.link}>
              {labels.designs}
            </LocalizedClientLink>
            <LocalizedClientLink href="/account" onClick={closeMenu} className={`${styles.link} ${styles.accountMenuLink}`}>
              {labels.account}
            </LocalizedClientLink>
            <div className={styles.marketControls}>
              <label className={styles.marketControl}>
                <span>{labels.shipTo}</span>
                <select aria-label={labels.shipTo} value={normalizedCountry} onChange={(event) => changeDestination(event.target.value)} disabled={isPending}>
                  {DESTINATIONS.map((code) => <option key={code} value={code}>{getDestinationLabel(code, currentLanguage)}</option>)}
                </select>
              </label>
              <label className={styles.marketControl}>
                <span>{labels.language}</span>
                <select aria-label={labels.language} value={currentLanguage} onChange={(event) => changeLanguage(event.target.value)} disabled={isPending}>
                  {(MARKET_LANGUAGES[normalizedCountry] ?? MARKET_LANGUAGES.us).map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className={styles.actions}>
            <LocalizedClientLink href="/?openSearch=1" className={styles.iconButton} aria-label={labels.search}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16.2 16.2 5 5" /></svg>
            </LocalizedClientLink>
            <LocalizedClientLink href="/?viewCart=1" className={styles.iconButton} aria-label={labels.bag} data-testid="nav-cart-link">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.3 11.5h11.9L22 7H6" /><circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /></svg>
            </LocalizedClientLink>
            <LocalizedClientLink href="/account" className={styles.accountLink} data-testid="nav-account-link">
              {labels.account}
            </LocalizedClientLink>
            <button
              type="button"
              className={styles.menuButton}
              aria-label={menuOpen ? labels.closeMenu ?? "Close menu" : labels.openMenu ?? "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
            </button>
          </div>
        </nav>
      </header>
    </>
  )
}
