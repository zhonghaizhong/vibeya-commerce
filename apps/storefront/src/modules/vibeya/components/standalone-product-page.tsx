"use client"

import { useEffect, useRef } from "react"

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

export default function StandaloneProductPage({ countryCode }: { countryCode: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const handleFrameMessage = async (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        event.data?.type !== "vibeya:request-studio"
      ) {
        return
      }

      const request: StudioRequest = {}
      for (const key of ["product", "color", "size", "print", "areas", "prompt"] as const) {
        if (typeof event.data[key] === "string") request[key] = event.data[key]
      }

      const returnUrl = () => {
        const params = new URLSearchParams({ openStudio: "1" })
        for (const [key, value] of Object.entries(request)) {
          if (value) params.set(key, value)
        }
        return `/${countryCode}?${params.toString()}#top`
      }

      try {
        const response = await fetch("/api/vibeya/session", {
          credentials: "same-origin",
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Session check unavailable")
        const session = (await response.json()) as StudioSession

        if (session.authenticated) {
          frameRef.current?.contentWindow?.postMessage(
            { type: "vibeya:open-studio", ...request },
            window.location.origin
          )
        } else if (session.temporarilyUnavailable) {
          window.alert("Could not verify your sign-in right now. Please try again in a moment.")
        } else {
          window.location.assign(returnUrl())
        }
      } catch {
        window.alert("Could not verify your sign-in right now. Please try again in a moment.")
      }
    }

    window.addEventListener("message", handleFrameMessage)
    return () => window.removeEventListener("message", handleFrameMessage)
  }, [countryCode])

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
        src="/vibeya/index.html?v=storefront-seo-copy-20261115-1&standalone=1#product-mg8014061"
        title="Custom Metal Bottle Cap Wall Sign"
        style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
      />
    </>
  )
}
