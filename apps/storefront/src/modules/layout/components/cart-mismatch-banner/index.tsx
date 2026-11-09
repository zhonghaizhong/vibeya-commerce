"use client"

import { transferCart } from "@lib/data/customer"
import { ExclamationCircleSolid } from "@medusajs/icons"
import { StoreCart, StoreCustomer } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
function CartMismatchBanner(props: {
  customer: StoreCustomer
  cart: StoreCart
}) {
  const { customer, cart } = props
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [actionText, setActionText] = useState("Run transfer again")
  const [hasError, setHasError] = useState(false)
  const hasAttemptedTransfer = useRef(false)

  const runTransfer = useCallback(async () => {
    try {
      setIsPending(true)
      setActionText("Transferring...")
      setHasError(false)

      await transferCart(cart.id)
      setActionText("Run transfer again")
      setIsPending(false)
      router.refresh()
    } catch {
      setHasError(true)
      setActionText("Run transfer again")
      setIsPending(false)
    }
  }, [cart.id, router])

  useEffect(() => {
    if (!customer || cart.customer_id) {
      return
    }

    if (hasAttemptedTransfer.current) {
      return
    }

    hasAttemptedTransfer.current = true
    void runTransfer()
  }, [customer, cart.customer_id, runTransfer])

  if (!customer || !!cart.customer_id) {
    return
  }

  const handleSubmit = async () => {
    await runTransfer()
  }

  return (
    <div className="flex items-center justify-center small:p-4 p-2 text-center bg-orange-300 small:gap-2 gap-1 text-sm mt-2 text-orange-800">
      <div className="flex flex-col small:flex-row small:gap-2 gap-1 items-center">
        <span className="flex items-center gap-1">
          <ExclamationCircleSolid className="inline" />
          {hasError
            ? "We couldn't sync your cart. Please try again."
            : "Your cart is being synced with your account."}
        </span>

        <span>·</span>

        <Button
          variant="transparent"
          className="hover:bg-transparent active:bg-transparent focus:bg-transparent disabled:text-orange-500 text-orange-950 p-0 bg-transparent"
          size="medium"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {actionText}
        </Button>
      </div>
    </div>
  )
}

export default CartMismatchBanner
