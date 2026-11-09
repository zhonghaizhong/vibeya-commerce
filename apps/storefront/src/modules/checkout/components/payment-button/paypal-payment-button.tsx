"use client"

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

const PayPalPaymentButton = ({
  cart,
  notReady,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [{ isResolved }] = usePayPalScriptReducer()
  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (session) => session.status === "pending"
  )
  const orderId = paymentSession?.data?.order_id

  const createOrder = async () => {
    if (!orderId || typeof orderId !== "string") {
      throw new Error("PayPal payment session is missing an order ID.")
    }
    return orderId
  }

  const onApprove = async () => {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await placeOrder()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setSubmitting(false)
    }
  }

  if (!isResolved) return <div className="py-3">Loading PayPal…</div>

  return (
    <>
      <div className="mb-4">
        <PayPalButtons
          createOrder={createOrder}
          onApprove={onApprove}
          onError={(error) => {
            setErrorMessage(String(error?.message || "PayPal payment failed."))
            setSubmitting(false)
          }}
          onCancel={() => setSubmitting(false)}
          disabled={notReady || submitting || !orderId}
          style={{ layout: "horizontal", color: "gold", shape: "rect", label: "paypal" }}
        />
      </div>
      <ErrorMessage error={errorMessage} data-testid="paypal-payment-error-message" />
    </>
  )
}

export default PayPalPaymentButton
