"use client"

import Script from "next/script"
import { useEffect, useRef, useState } from "react"

type TurnstileRenderOptions = {
  sitekey: string
  callback: (token: string) => void
  "expired-callback": () => void
  "error-callback": () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

type TurnstileFieldProps = {
  resetKey?: string
}

const TurnstileField = ({ resetKey = "" }: TurnstileFieldProps) => {
  const [siteKey, setSiteKey] = useState("")
  const [configLoaded, setConfigLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [token, setToken] = useState("")

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    fetch(`${backendUrl.replace(/\/$/, "")}/store/vibeya/integrations`, {
      headers: publishableKey ? { "x-publishable-api-key": publishableKey } : {},
      cache: "no-store",
    })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { turnstile?: { enabled?: boolean; siteKey?: string } }) => {
        if (data.turnstile?.enabled && data.turnstile.siteKey) setSiteKey(data.turnstile.siteKey)
      })
      .catch(() => setSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""))
      .finally(() => setConfigLoaded(true))
  }, [])

  useEffect(() => {
    if (!scriptReady || !siteKey || !window.turnstile || !containerRef.current) {
      return
    }

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    })
    widgetIdRef.current = widgetId

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [scriptReady, siteKey])

  useEffect(() => {
    if (!resetKey || !widgetIdRef.current || !window.turnstile) return
    setToken("")
    window.turnstile.reset(widgetIdRef.current)
  }, [resetKey])

  return (
    <div className="mt-4">
      {siteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onReady={() => setScriptReady(true)}
          />
          <div ref={containerRef} aria-label="Human verification" />
          <input type="hidden" name="turnstile_token" value={token} readOnly />
        </>
      ) : configLoaded ? (
        <p className="text-sm text-red-700" role="status">
          Human verification is not configured yet. Please try again later.
        </p>
      ) : <p className="text-sm text-ui-fg-subtle" role="status">Loading verification…</p>}
    </div>
  )
}

export default TurnstileField
