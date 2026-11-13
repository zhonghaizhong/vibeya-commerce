"use client"

import AuthModal from "./auth-modal"
import { ProductCards } from "@modules/vibeya/components/product-explorer"
import { createPortal } from "react-dom"
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react"

type StudioRequest = { product?: string; color?: string; size?: string; print?: string; prompt?: string }

function getStudioReturnUrl(countryCode: string, request: StudioRequest) {
  const params = new URLSearchParams({ openStudio: "1" })
  for (const key of ["product", "color", "size", "print", "prompt"] as const) {
    const value = request[key]
    if (typeof value === "string" && value) params.set(key, value)
  }
  return `/${countryCode}?${params.toString()}#top`
}

export default function VibeyaHome({ countryCode, isAuthenticated }: { countryCode: string; isAuthenticated: boolean }) {
  const [authOpen, setAuthOpen] = useState(false)
  const [authRedirectTo, setAuthRedirectTo] = useState<string>()
  const [studioLayer, setStudioLayer] = useState(false)
  const [homeCardsTarget, setHomeCardsTarget] = useState<HTMLElement | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)

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
    if (!frameDocument || !productCards) return
    if (frameDocument.body.dataset.reactProductCards !== "true") {
      productCards.replaceChildren()
      frameDocument.body.dataset.reactProductCards = "true"
    }
    setHomeCardsTarget(productCards)
  }, [])

  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search)
    const forwardedParams = new URLSearchParams()
    forwardedParams.set("v", "home-inspiration-six-cards-1")
    for (const key of ["viewCart", "openStudio", "openSearch", "product", "color", "size", "print", "prompt", "inspiration"]) {
      const value = currentParams.get(key)
      if (value) forwardedParams.set(key, value)
    }
    if (currentParams.get("openStudio") === "1" && !isAuthenticated) {
      setAuthRedirectTo(`${window.location.pathname}${window.location.search}${window.location.hash}`)
      setAuthOpen(true)
      forwardedParams.delete("openStudio")
    }

    const hash = [
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
  }, [isAuthenticated])

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
      if (event.data?.type === "vibeya:route" && typeof event.data.hash === "string") {
        const incomingHash = event.data.hash.startsWith("#product-") && typeof event.data.color === "string"
          ? `${event.data.hash}?color=${encodeURIComponent(event.data.color)}`
          : event.data.hash
        if (incomingHash && incomingHash !== window.location.hash) {
          window.history.pushState(null, "", incomingHash)
        }
      }
    }

    const syncFromHistory = () => {
      frameRef.current?.contentWindow?.postMessage(
        { type: "vibeya:set-route", hash: window.location.hash || "#top" },
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
  }, [countryCode, isAuthenticated])

  const addAccountLink = useCallback(
    (event: SyntheticEvent<HTMLIFrameElement>) => {
      const frame = event.currentTarget
      const document = frame.contentDocument
      if (!document) return

      document.body.dataset.vibeyaAuth = isAuthenticated ? "authenticated" : "guest"
      document.querySelectorAll<HTMLAnchorElement>(".account-link, .account-menu-link, .sign-in-link").forEach((link) => {
        link.href = `/${countryCode}/account`
        link.target = "_top"
        link.textContent = isAuthenticated ? "Account" : "Sign in"
        link.setAttribute("aria-label", isAuthenticated ? "Account" : "Sign in or register")
        if (!isAuthenticated && link.dataset.authGate !== "bound") {
          link.dataset.authGate = "bound"
          link.addEventListener("click", (clickEvent) => {
            clickEvent.preventDefault()
            setAuthRedirectTo(undefined)
            setAuthOpen(true)
          })
        }
      })

      document!.querySelectorAll<HTMLAnchorElement>("[data-store-route]").forEach((policyLink) => {
        policyLink.href = `/${countryCode}/${policyLink.dataset.storeRoute}`
      })

      frame.contentWindow?.postMessage(
        { type: "vibeya:set-route", hash: window.location.hash || "#top" },
        window.location.origin
      )

      mountProductCards()
    },
    [countryCode, isAuthenticated, mountProductCards]
  )

  const navigateTo = (hash: string) => {
    window.history.pushState(null, "", hash)
    frameRef.current?.contentWindow?.postMessage(
      { type: "vibeya:set-route", hash },
      window.location.origin
    )
  }

  const selectProduct = (product: { id: string }, color: string) =>
    navigateTo(`#product-${product.id}?color=${encodeURIComponent(color)}`)

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
        src="/vibeya/index.html?v=home-inspiration-six-cards-1"
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
        <ProductCards onSelect={selectProduct} countryCode={countryCode} />,
        homeCardsTarget
      )}
      {authOpen && <AuthModal countryCode={countryCode} onClose={closeAuth} redirectTo={authRedirectTo} />}
    </>
  )
}
