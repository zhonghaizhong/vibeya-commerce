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
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [token, setToken] = useState("")

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
      ) : (
        <p className="text-sm text-red-700" role="status">
          Human verification is not configured yet. Please try again later.
        </p>
      )}
    </div>
  )
}

export default TurnstileField
