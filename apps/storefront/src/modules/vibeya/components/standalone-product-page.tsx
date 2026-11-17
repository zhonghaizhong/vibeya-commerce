"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import AuthModal from "../../../app/[countryCode]/(main)/auth-modal"

type StudioRequest = {
  product?: string
  color?: string
  size?: string
  print?: string
  areas?: string
  prompt?: string
}

type StudioSession = {
  authenticated?: boolean
  temporarilyUnavailable?: boolean
}

export default function StandaloneProductPage({
  countryCode,
  handle = "vibeya-custom-metal-bottle-cap-wall-sign",
  productId = "mg8014061",
  title = "Custom Metal Bottle Cap Wall Sign",
  version = "metal-sign-flow-20261116-2",
}: {
  countryCode: string
  handle?: string
  productId?: string
  title?: string
  version?: string
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const router = useRouter()
  const [authOpen, setAuthOpen] = useState(false)
  const [authRedirectTo, setAuthRedirectTo] = useState<string>()

  const getStudioUrl = useCallback((request: StudioRequest) => {
    const params = new URLSearchParams({ openStudio: "1" })
    for (const [key, value] of Object.entries(request)) {
      if (value) params.set(key, value)
    }
    return `/${countryCode}/products/${handle}?${params.toString()}`
  }, [countryCode, handle])

  const openStudio = useCallback((request: StudioRequest) => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "vibeya:open-studio", ...request },
      window.location.origin
    )
  }, [])

  const handleFrameLoad = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("openStudio") !== "1") return

    const request: StudioRequest = {}
    for (const key of ["product", "color", "size", "print", "areas", "prompt"] as const) {
      const value = params.get(key)
      if (value) request[key] = value
    }

    try {
      const response = await fetch("/api/vibeya/session", {
        credentials: "same-origin",
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Session check unavailable")
      const session = (await response.json()) as StudioSession
      if (session.authenticated) {
        openStudio(request)
      } else if (session.temporarilyUnavailable) {
        window.alert("Could not verify your sign-in right now. Please try again in a moment.")
      } else {
        setAuthRedirectTo(getStudioUrl(request))
        setAuthOpen(true)
      }
    } catch {
      window.alert("Could not verify your sign-in right now. Please try again in a moment.")
    }
  }, [getStudioUrl, openStudio])

  useEffect(() => {
    const handleFrameMessage = async (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return
      }

      if (event.data?.type === "vibeya:route" && typeof event.data.hash === "string") {
        if (event.data.hash.startsWith("#product-") && typeof event.data.handle === "string") {
          const selectedId = event.data.hash.slice("#product-".length)
          if (selectedId !== productId) {
            const query = new URLSearchParams()
            if (typeof event.data.color === "string" && event.data.color) query.set("color", event.data.color)
            const queryString = query.toString()
            router.push(`/${countryCode}/products/${encodeURIComponent(event.data.handle)}${queryString ? `?${queryString}` : ""}`)
          }
          return
        }

        if (event.data.hash === "#inspiration") {
          const locale = typeof event.data.locale === "string" ? event.data.locale : undefined
          const inspirationPath = countryCode === "us"
            ? "/vibeya/inspiration/index.html"
            : `/${countryCode}/inspiration/`
          const target = new URL(inspirationPath, window.location.origin)
          if (locale) target.searchParams.set("locale", locale)
          router.push(`${target.pathname}${target.search}`)
          return
        }

        if (["#top", "#shop", "#create", "#how-it-works", "#my-designs"].includes(event.data.hash)) {
          const targetPath = event.data.hash === "#shop"
            ? `/${countryCode}/products`
            : `/${countryCode}/`
          const target = new URL(targetPath, window.location.origin)
          router.push(`${target.pathname}${target.search}${target.hash}`)
          return
        }
      }

      if (event.data?.type !== "vibeya:request-studio") return

      const request: StudioRequest = {}
      for (const key of ["product", "color", "size", "print", "areas", "prompt"] as const) {
        if (typeof event.data[key] === "string") request[key] = event.data[key]
      }

      try {
        const response = await fetch("/api/vibeya/session", {
          credentials: "same-origin",
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Session check unavailable")
        const session = (await response.json()) as StudioSession

        if (session.authenticated) {
          openStudio(request)
        } else if (session.temporarilyUnavailable) {
          window.alert("Could not verify your sign-in right now. Please try again in a moment.")
        } else {
          setAuthRedirectTo(getStudioUrl(request))
          setAuthOpen(true)
        }
      } catch {
        window.alert("Could not verify your sign-in right now. Please try again in a moment.")
      }
    }

    window.addEventListener("message", handleFrameMessage)
    return () => window.removeEventListener("message", handleFrameMessage)
  }, [countryCode, getStudioUrl, openStudio, productId, router])

  return (
    <>
      <style>{`
        body:has(.vibeya-standalone-product-frame) > main > [data-vibeya-shell-announcement],
        body:has(.vibeya-standalone-product-frame) > main > header[data-vibeya-shell-nav],
        body:has(.vibeya-standalone-product-frame) > main > footer {
          display: none !important;
        }
        body:has(.vibeya-standalone-product-frame) > main {
          min-height: 100vh;
          overflow: hidden;
        }
      `}</style>
      <iframe
        ref={frameRef}
        className="vibeya-standalone-product-frame"
        src={`/vibeya/index.html?v=${encodeURIComponent(version)}&standalone=1#product-${encodeURIComponent(productId)}`}
        title={title}
        onLoad={handleFrameLoad}
        style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
      />
      {authOpen && (
        <AuthModal
          countryCode={countryCode}
          onClose={() => setAuthOpen(false)}
          redirectTo={authRedirectTo}
        />
      )}
    </>
  )
}
