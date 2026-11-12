"use client"

import { setGoogleCustomerToken } from "@lib/data/customer"
import { sdk } from "@lib/config"
import { useEffect, useState } from "react"

type GoogleSignInButtonProps = {
  countryCode: string
  onAuthenticated?: () => void
}

const GoogleSignInButton = ({
  countryCode,
  onAuthenticated,
}: GoogleSignInButtonProps) => {
  const [pending, setPending] = useState<"google" | "paypal" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState("")
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [paypalLoginEnabled, setPaypalLoginEnabled] = useState(false)
  const [paypalCallbackUrl, setPaypalCallbackUrl] = useState("")

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    fetch(`${backendUrl.replace(/\/$/, "")}/store/vibeya/integrations`, {
      headers: publishableKey ? { "x-publishable-api-key": publishableKey } : {},
      cache: "no-store",
    })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { google?: { enabled?: boolean; callbackUrl?: string }; paypalLogin?: { enabled?: boolean; callbackUrl?: string } }) => {
        setGoogleLoginEnabled(data.google?.enabled === true)
        setCallbackUrl(data.google?.callbackUrl || "")
        setPaypalLoginEnabled(data.paypalLogin?.enabled === true)
        setPaypalCallbackUrl(data.paypalLogin?.callbackUrl || "")
      })
      .catch(() => setGoogleLoginEnabled(process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true"))
      .finally(() => setSettingsLoaded(true))
  }, [])

  const continueWithProvider = async (provider: "google" | "paypal") => {
    const enabled = provider === "google" ? googleLoginEnabled : paypalLoginEnabled
    if (!enabled || pending) return

    setPending(provider)
    setError(null)

    try {
      const result = await sdk.auth.login("customer", provider, {
        callback_url: provider === "google"
          ? callbackUrl || `${window.location.origin}/${countryCode}/auth/google/callback`
          : paypalCallbackUrl || `${window.location.origin}/${countryCode}/auth/paypal/callback`,
      })

      if (typeof result === "string") {
        const saved = await setGoogleCustomerToken(result)
        if (!saved.success) throw new Error(saved.error || `${provider} sign-in failed.`)
        if (onAuthenticated) onAuthenticated()
        else window.location.assign(`/${countryCode}/account`)
        return
      }

      if ("location" in result) {
        window.location.assign(result.location)
        return
      }

      throw new Error(`${provider} sign-in needs an additional verification step.`)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : String(caughtError)
      setError(
        message === "Failed to fetch"
          ? `Couldn’t connect to ${provider === "google" ? "Google" : "PayPal"} sign-in. Please try again or sign in with email.`
          : message
      )
      setPending(null)
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => continueWithProvider("google")}
        disabled={!settingsLoaded || !googleLoginEnabled || pending !== null}
        title={!googleLoginEnabled ? "Google sign-in needs Google OAuth setup." : undefined}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#e9e3ea] bg-white px-4 font-bold text-[#160d24] transition hover:border-[#8f60ed] hover:bg-[#f1e5ff]/40 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span aria-hidden="true" className="text-xl font-black text-[#4285f4]">
          G
        </span>
        {pending === "google" ? "Connecting to Google…" : "Continue with Google"}
      </button>
      {!googleLoginEnabled && (
        <p className="mt-2 text-center text-xs text-[#625c69]">
          Google sign-in will be available after OAuth setup.
        </p>
      )}
      <button
        type="button"
        onClick={() => continueWithProvider("paypal")}
        disabled={!settingsLoaded || !paypalLoginEnabled || pending !== null}
        title={!paypalLoginEnabled ? "PayPal sign-in needs to be enabled in admin settings." : undefined}
        className="mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#e9e3ea] bg-white px-4 font-bold text-[#160d24] transition hover:border-[#0070ba] hover:bg-[#f4f9ff] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span aria-hidden="true" className="text-xl font-black italic text-[#0070ba]">P</span>
        {pending === "paypal" ? "Connecting to PayPal…" : "Continue with PayPal"}
      </button>
      {settingsLoaded && !paypalLoginEnabled && (
        <p className="mt-2 text-center text-xs text-[#625c69]">
          PayPal sign-in is not set up yet. Enable it in admin settings.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-left text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default GoogleSignInButton
