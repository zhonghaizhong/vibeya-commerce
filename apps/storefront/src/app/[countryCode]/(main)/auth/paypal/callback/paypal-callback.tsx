"use client"

import { sdk } from "@lib/config"
import {
  savePaypalShippingAddress,
  setGoogleCustomerToken,
  type PaypalShippingAddress,
} from "@lib/data/customer"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

function decodeToken(token: string) {
  const payload = token.split(".")[1]
  if (!payload) throw new Error("PayPal sign-in returned an invalid token.")
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
  const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as {
    actor_id?: string
    user_metadata?: {
      email?: string
      first_name?: string
      last_name?: string
      paypal_shipping_address?: PaypalShippingAddress | null
    }
  }
}

export default function PayPalCallback({
  countryCode,
  query,
}: {
  countryCode: string
  query: Record<string, string>
}) {
  const router = useRouter()
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const finishLogin = async () => {
      try {
        const result = await sdk.auth.callback("customer", "paypal", query)
        if (typeof result !== "string") {
          throw new Error("PayPal sign-in needs another verification step.")
        }

        let token = result
        const claims = decodeToken(token)
        if (!claims.actor_id) {
          const email = claims.user_metadata?.email
          if (!email) throw new Error("PayPal did not return an email address.")

          const association = await sdk.client.fetch<{ linked: boolean }>(
            "/store/vibeya/auth/associate-customer",
            {
              method: "POST",
              headers: { authorization: `Bearer ${token}` },
              body: {},
              cache: "no-store",
            }
          )

          if (!association.linked) {
            await sdk.store.customer.create({
              email,
              first_name: claims.user_metadata?.first_name,
              last_name: claims.user_metadata?.last_name,
            })
          }

          const refreshed = await sdk.auth.refresh()
          if (!("token" in refreshed)) throw new Error("Could not finish creating your customer account.")
          token = refreshed.token
        }

        const saved = await setGoogleCustomerToken(token)
        if (!saved.success) throw new Error(saved.error || "Could not sign in.")
        const paypalAddress = claims.user_metadata?.paypal_shipping_address
        if (paypalAddress) {
          await savePaypalShippingAddress({
            ...paypalAddress,
            first_name: claims.user_metadata?.first_name,
            last_name: claims.user_metadata?.last_name,
          })
        }
        router.replace(`/${countryCode}/account`)
        router.refresh()
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : String(callbackError))
      }
    }

    void finishLogin()
  }, [countryCode, query, router])

  return (
    <main className="flex min-h-[65vh] items-center justify-center bg-[#fffdfa] px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-[#e9e3ea] bg-white p-8 text-center shadow-[0_26px_70px_rgba(35,17,56,.10)]">
        <div className="mb-5 inline-flex rounded-full bg-[#dcfc60] px-4 py-2 text-sm font-black tracking-[.12em] text-[#160d24]">VIBEYA<span className="text-[#8f60ed]">.</span></div>
        <h1 className="text-xl font-extrabold text-[#160d24]">{error ? "PayPal sign-in could not finish" : "Finishing sign-in…"}</h1>
        {error ? <><p className="mt-3 text-sm text-[#625c69]">{error}</p><a href={`/${countryCode}`} className="mt-6 inline-flex rounded-xl bg-[#dcfc60] px-5 py-3 font-bold text-[#160d24]">Back to VIBEYA</a></> : <p className="mt-3 text-sm text-[#625c69]">Please wait while we securely connect your account.</p>}
      </div>
    </main>
  )
}
