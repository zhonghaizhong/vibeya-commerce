"use client"

import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { HttpTypes } from "@medusajs/types"
import React from "react"

const PayPalWrapper = ({
  paymentSession,
  children,
}: {
  paymentSession: HttpTypes.StorePaymentSession
  children: React.ReactNode
}) => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  if (!clientId) {
    return <div>PayPal is not configured for this storefront.</div>
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: paymentSession.currency_code.toUpperCase() || "USD",
        intent: paymentSession.data?.intent === "CAPTURE" ? "capture" : "authorize",
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}

export default PayPalWrapper
