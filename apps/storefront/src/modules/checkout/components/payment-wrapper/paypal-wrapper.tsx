"use client"

import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { HttpTypes } from "@medusajs/types"
import React, { useEffect, useState } from "react"

const PayPalWrapper = ({
  paymentSession,
  children,
}: {
  paymentSession: HttpTypes.StorePaymentSession
  children: React.ReactNode
}) => {
  const [clientId, setClientId] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    fetch(`${backendUrl.replace(/\/$/, "")}/store/vibeya/integrations`, {
      headers: publishableKey ? { "x-publishable-api-key": publishableKey } : {},
      cache: "no-store",
    })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { paypal?: { enabled?: boolean; clientId?: string } }) => {
        if (data.paypal?.enabled && data.paypal.clientId) setClientId(data.paypal.clientId)
      })
      .catch(() => setClientId(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ""))
      .finally(() => setLoading(false))
  }, [])

  if (!clientId) {
    return <div>{loading ? "Loading PayPal…" : "PayPal is not configured for this storefront."}</div>
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: paymentSession.currency_code.toUpperCase() || "USD",
        intent: paymentSession.data?.intent === "CAPTURE" ? "capture" : "authorize",
        locale: "en_US",
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}

export default PayPalWrapper
