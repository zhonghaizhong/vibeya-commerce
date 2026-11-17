"use client"

import AuthModal from "./auth-modal"
import { updateRegion } from "@lib/data/cart"
import { updateLocale } from "@lib/data/locale-actions"
import { getMarketDefaultLocale, getMarketLocale } from "@lib/util/market-locale"
import { ProductCards } from "@modules/vibeya/components/product-explorer"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react"

type StudioRequest = { product?: string; color?: string; size?: string; print?: string; areas?: string; prompt?: string }
type ProductListing = { category: string; title: string; slug: string; handles: string[] }

function getStudioReturnUrl(countryCode: string, request: StudioRequest) {
  const params = new URLSearchParams({ openStudio: "1" })
  for (const key of ["product", "color", "size", "print", "areas", "prompt"] as const) {
    const value = request[key]
    if (typeof value === "string" && value) params.set(key, value)
  }
  return `/${countryCode}?${params.toString()}#top`
}

export default function VibeyaHome({ countryCode, locale, isAuthenticated, standaloneProductId, standaloneColor, standaloneSize, listing }: { countryCode: string; locale?: string | null; isAuthenticated: boolean; standaloneProductId?: string; standaloneColor?: string; standaloneSize?: string; listing?: ProductListing }) {
  const marketLocale = getMarketLocale(countryCode, locale ?? undefined)
  const standaloneHash = standaloneProductId
    ? `#product-${standaloneProductId}?color=${encodeURIComponent(standaloneColor || "Black")}${standaloneSize ? `&size=${encodeURIComponent(standaloneSize)}` : ""}`
    : "#top"
  const [authOpen, setAuthOpen] = useState(false)
  const [authRedirectTo, setAuthRedirectTo] = useState<string>()
  const [studioLayer, setStudioLayer] = useState(false)
  const [homeCardsTarget, setHomeCardsTarget] = useState<HTMLElement | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) return

    let lastRenewalCheck = 0
    const renewSession = () => {
      if (Date.now() - lastRenewalCheck < 5 * 60 * 1000) return
      lastRenewalCheck = Date.now()
      void fetch("/api/vibeya/session", {
        credentials: "same-origin",
        cache: "no-store",
      }).catch(() => undefined)
    }
    const renewWhenVisible = () => {
      if (document.visibilityState === "visible") renewSession()
    }
    const timer = window.setInterval(renewSession, 6 * 60 * 60 * 1000)

    window.addEventListener("focus", renewSession)
    document.addEventListener("visibilitychange", renewWhenVisible)
    renewSession()

    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", renewSession)
      document.removeEventListener("visibilitychange", renewWhenVisible)
    }
  }, [isAuthenticated])

  const closeAuth = useCallback(() => {
    setAuthOpen(false)
    setAuthRedirectTo(undefined)
  }, [])

  const mountProductCards = useCallback(() => {
    const frameDocument = frameRef.current?.contentDocument
    const productCards = frameDocument?.querySelector<HTMLElement>("#productCards")
    if (standaloneProductId) {
      frameRef.current?.contentWindow?.postMessage({ type: "vibeya:set-route", hash: standaloneHash }, window.location.origin)
    }
    if (!frameDocument || !productCards) return
    if (frameDocument.body.dataset.reactProductCards !== "true") {
      productCards.replaceChildren()
      frameDocument.body.dataset.reactProductCards = "true"
    }
    setHomeCardsTarget(productCards)
  }, [standaloneHash, standaloneProductId])

  useEffect(() => {
    if (!standaloneProductId && window.location.hash.startsWith("#product-mg8014061")) {
      router.replace(`/${countryCode}/products/vibeya-custom-metal-bottle-cap-wall-sign`)
      return
    }

    const currentParams = new URLSearchParams(window.location.search)
    const forwardedParams = new URLSearchParams()
    forwardedParams.set("v", "independent-pages-20261117-1")
    forwardedParams.set("country", countryCode.toLowerCase())
    forwardedParams.set("locale", marketLocale)
    if (standaloneProductId) forwardedParams.set("standalone", "1")
    if (listing) {
      forwardedParams.set("listing", listing.slug)
      forwardedParams.set("handles", listing.handles.join(","))
    }
    for (const key of ["viewCart", "openStudio", "openSearch", "product", "color", "size", "print", "areas", "prompt", "inspiration"]) {
      const value = currentParams.get(key)
      if (value) forwardedParams.set(key, value)
    }
    if (currentParams.get("openStudio") === "1" && !isAuthenticated) {
      setAuthRedirectTo(`${window.location.pathname}${window.location.search}${window.location.hash}`)
      setAuthOpen(true)
      forwardedParams.delete("openStudio")
    }

    const hash = standaloneProductId
      ? standaloneHash
      : listing
      ? "#shop"
      : [
      "#top",
      "#shop",
      "#create",
      "#how-it-works",
      "#inspiration",
      "#my-designs",
    ].includes(window.location.hash)
      ? window.location.hash
      : window.location.hash.startsWith("#product-")
        ? window.location.hash
      : ""
    const query = forwardedParams.toString()
    const homeUrl = `/vibeya/index.html${query ? `?${query}` : ""}${hash}`
    const frame = frameRef.current
    if (frame && frame.getAttribute("src") !== homeUrl) frame.src = homeUrl
  }, [countryCode, isAuthenticated, listing?.slug, listing?.handles.join(","), marketLocale, router, standaloneProductId, standaloneHash])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    frame.addEventListener("load", mountProductCards)
    mountProductCards()
    return () => frame.removeEventListener("load", mountProductCards)
  }, [mountProductCards])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      if (event.data?.type === "vibeya:open-auth") {
        setAuthRedirectTo(undefined)
        setAuthOpen(true)
        return
      }
      if (event.data?.type === "vibeya:request-studio") {
        const selection: StudioRequest = {
          product: typeof event.data.product === "string" ? event.data.product : undefined,
          color: typeof event.data.color === "string" ? event.data.color : undefined,
          size: typeof event.data.size === "string" ? event.data.size : undefined,
          print: typeof event.data.print === "string" ? event.data.print : undefined,
          areas: typeof event.data.areas === "string" ? event.data.areas : undefined,
          prompt: typeof event.data.prompt === "string" ? event.data.prompt : undefined,
        }
        if (!isAuthenticated) {
          setAuthRedirectTo(getStudioReturnUrl(countryCode, selection))
          setAuthOpen(true)
          return
        }
        setStudioLayer(true)
        frameRef.current?.contentWindow?.postMessage(
          { type: "vibeya:open-studio", ...selection },
          window.location.origin
        )
        return
      }
      if (event.data?.type === "vibeya:studio-state") {
        setStudioLayer(Boolean(event.data.open))
        return
      }
      if (event.data?.type === "vibeya:close-embedded-studio") {
        setStudioLayer(false)
        return
      }
      if (event.data?.type === "vibeya:change-destination" && typeof event.data.countryCode === "string") {
        const nextCountry = event.data.countryCode.toLowerCase()
        if (!["us", "ca", "jp", "mx"].includes(nextCountry) || nextCountry === countryCode.toLowerCase()) return
        const currentPath = window.location.pathname.replace(new RegExp(`^/${countryCode.toLowerCase()}(?=/|$)`), "")
        const nextLocale = getMarketDefaultLocale(nextCountry)
        const search = new URLSearchParams(window.location.search)
        search.set("locale", nextLocale)
        // Changing the market must not be blocked by a stale cart's locale update.
        void updateLocale(nextLocale)
          .catch(() => undefined)
          .then(() => updateRegion(nextCountry, `${currentPath}?${search.toString()}${window.location.hash}`))
        return
      }
      if (event.data?.type === "vibeya:change-language" && typeof event.data.locale === "string") {
        const nextLocale = getMarketLocale(countryCode, event.data.locale)
        if (nextLocale !== event.data.locale) return
        // The URL is the source of truth for visible copy; keep language switching
        // responsive even if synchronizing an existing cart locale fails.
        void updateLocale(nextLocale)
          .catch(() => undefined)
          .then(() => {
            const nextUrl = new URL(window.location.href)
            nextUrl.searchParams.set("locale", nextLocale)
            router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, { scroll: false })
          })
        return
      }
      if (event.data?.type === "vibeya:route" && typeof event.data.hash === "string") {
        if (standaloneProductId && event.data.hash.startsWith(`#product-${standaloneProductId}`)) return
        if (event.data.hash.startsWith("#product-")) {
          if (typeof event.data.handle === "string" && event.data.handle) {
            const target = new URL(`/${countryCode}/products/${encodeURIComponent(event.data.handle)}`, window.location.origin)
            if (typeof event.data.color === "string" && event.data.color) target.searchParams.set("color", event.data.color)
            const currentLocale = new URLSearchParams(window.location.search).get("locale")
            if (currentLocale) target.searchParams.set("locale", currentLocale)
            window.location.replace(target.href)
          } else if (event.data.hash === "#product-mg8014061") {
            router.replace(`/${countryCode}/products/vibeya-custom-metal-bottle-cap-wall-sign`)
          }
          return
        }
        const incomingHash = event.data.hash
        if (incomingHash && incomingHash !== window.location.hash) {
          window.history.pushState(null, "", incomingHash)
        }
      }
    }

    const syncFromHistory = () => {
      frameRef.current?.contentWindow?.postMessage(
        { type: "vibeya:set-route", hash: window.location.hash || (standaloneProductId ? standaloneHash : "#top") },
        window.location.origin
      )
    }

    window.addEventListener("message", handleMessage)
    window.addEventListener("popstate", syncFromHistory)
    window.addEventListener("hashchange", syncFromHistory)
    return () => {
      window.removeEventListener("message", handleMessage)
      window.removeEventListener("popstate", syncFromHistory)
      window.removeEventListener("hashchange", syncFromHistory)
    }
  }, [countryCode, isAuthenticated, router, standaloneProductId, standaloneHash])

  const addAccountLink = useCallback(
    (event: SyntheticEvent<HTMLIFrameElement>) => {
      const frame = event.currentTarget
      const document = frame.contentDocument
      if (!document) return

      document.body.dataset.vibeyaAuth = isAuthenticated ? "authenticated" : "guest"
      const labelsByLocale: Record<string, { account: string; signIn: string }> = {
        "en-US": { account: "Account", signIn: "Sign in" },
        "en-CA": { account: "Account", signIn: "Sign in" },
        "ja-JP": { account: "アカウント", signIn: "ログイン" },
        "es-MX": { account: "Cuenta", signIn: "Iniciar sesión" },
      }
      const localeKey = marketLocale
      const authLabels = labelsByLocale[localeKey]
      document.querySelectorAll<HTMLAnchorElement>(".account-link, .account-menu-link, .sign-in-link").forEach((link) => {
        link.href = `/${countryCode}/account`
        link.target = "_top"
        const label = link.classList.contains("sign-in-link") && !isAuthenticated ? authLabels.signIn : authLabels.account
        link.textContent = label
        link.setAttribute("aria-label", label)
        if (!isAuthenticated && link.dataset.authGate !== "bound") {
          link.dataset.authGate = "bound"
          link.addEventListener("click", (clickEvent) => {
            clickEvent.preventDefault()
            setAuthRedirectTo(undefined)
            setAuthOpen(true)
          })
        }
      })
      const frameWindow = frame.contentWindow as (Window & { vibeyaSetNavigationLocale?: (value: string) => void }) | null
      frameWindow?.vibeyaSetNavigationLocale?.(localeKey)

      document!.querySelectorAll<HTMLAnchorElement>("[data-store-route]").forEach((policyLink) => {
        policyLink.href = `/${countryCode}/${policyLink.dataset.storeRoute}`
      })

      frame.contentWindow?.postMessage(
        { type: "vibeya:set-route", hash: window.location.hash || (standaloneProductId ? standaloneHash : "#top") },
        window.location.origin
      )

      mountProductCards()
    },
    [countryCode, isAuthenticated, marketLocale, mountProductCards, standaloneProductId, standaloneHash]
  )

  const navigateTo = (hash: string) => {
    window.history.pushState(null, "", hash)
    frameRef.current?.contentWindow?.postMessage(
      { type: "vibeya:set-route", hash },
      window.location.origin
    )
  }

  return (
    <>
      <style>{`
        body:has(.vibeya-theme-frame) > main > [data-vibeya-shell-announcement],
        body:has(.vibeya-theme-frame) > main > header[data-vibeya-shell-nav],
        body:has(.vibeya-theme-frame) > main > footer {
          display: none !important;
        }
        body:has(.vibeya-theme-frame) > main {
          min-height: 100vh;
          overflow: hidden;
        }
      `}</style>
      <iframe
        ref={frameRef}
        className="vibeya-theme-frame"
        src={`/vibeya/index.html?v=independent-pages-20261117-1&country=${encodeURIComponent(countryCode.toLowerCase())}&locale=${encodeURIComponent(marketLocale)}${standaloneProductId ? `&standalone=1${standaloneHash}` : ""}`}
        title="VIBEYA storefront"
        onLoad={addAccountLink}
        style={{
          display: "block",
          width: "100%",
          height: "100vh",
          border: 0,
          visibility: "visible",
          position: studioLayer ? "fixed" : "relative",
          inset: studioLayer ? 0 : undefined,
          zIndex: studioLayer ? 60 : 0,
        }}
      />
      {homeCardsTarget && createPortal(
        <ProductCards countryCode={countryCode} locale={marketLocale} handles={listing?.handles} />,
        homeCardsTarget
      )}
      {authOpen && <AuthModal countryCode={countryCode} onClose={closeAuth} redirectTo={authRedirectTo} />}
    </>
  )
}
