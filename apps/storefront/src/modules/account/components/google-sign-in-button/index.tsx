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
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState("")
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    fetch(`${backendUrl.replace(/\/$/, "")}/store/vibeya/integrations`, {
      headers: publishableKey ? { "x-publishable-api-key": publishableKey } : {},
      cache: "no-store",
    })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { google?: { enabled?: boolean; callbackUrl?: string } }) => {
        setGoogleLoginEnabled(data.google?.enabled === true)
        setCallbackUrl(data.google?.callbackUrl || "")
      })
      .catch(() => setGoogleLoginEnabled(process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true"))
      .finally(() => setSettingsLoaded(true))
  }, [])

  const continueWithGoogle = async () => {
    if (!googleLoginEnabled || pending) return

    setPending(true)
    setError(null)

    try {
      const result = await sdk.auth.login("customer", "google", {
        callback_url: callbackUrl || `${window.location.origin}/${countryCode}/auth/google/callback`,
      })

      if (typeof result === "string") {
        const saved = await setGoogleCustomerToken(result)
        if (!saved.success) throw new Error(saved.error || "Google sign-in failed.")
        if (onAuthenticated) onAuthenticated()
        else window.location.assign(`/${countryCode}/account`)
        return
      }

      if ("location" in result) {
        window.location.assign(result.location)
        return
      }

      throw new Error("Google sign-in needs an additional verification step.")
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : String(caughtError)
      setError(
        message === "Failed to fetch"
          ? "Couldn’t connect to Google sign-in. Please try again or sign in with email."
          : message
      )
      setPending(false)
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={!settingsLoaded || !googleLoginEnabled || pending}
        title={!googleLoginEnabled ? "Google sign-in needs Google OAuth setup." : undefined}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#e9e3ea] bg-white px-4 font-bold text-[#160d24] transition hover:border-[#8f60ed] hover:bg-[#f1e5ff]/40 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span aria-hidden="true" className="text-xl font-black text-[#4285f4]">
          G
        </span>
        {pending ? "Connecting to Google…" : "Continue with Google"}
      </button>
      {!googleLoginEnabled && (
        <p className="mt-2 text-center text-xs text-[#625c69]">
          Google sign-in will be available after OAuth setup.
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
