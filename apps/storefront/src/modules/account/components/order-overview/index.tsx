"use client"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  if (orders?.length) {
    return (
      <div className="flex w-full flex-col gap-4">
        {orders.map((o) => (
          <OrderCard order={o} key={o.id} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex w-full flex-col items-center rounded-[24px] border border-[#e9e3ea] bg-white px-6 py-12 text-center"
      data-testid="no-orders-container"
    >
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#f1e5ff] text-xl text-[#7251b4]" aria-hidden="true">
        ✳
      </span>
      <h2 className="font-display text-xl font-extrabold tracking-[-.03em] text-[#160d24]">
        Your story starts here
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#77717d]">
        Orders you place will appear here, ready whenever you need to check their progress.
      </p>
      <LocalizedClientLink
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#dcfc60] px-5 text-sm font-extrabold text-[#160d24] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(22,13,36,.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f60ed]"
        data-testid="continue-shopping-button"
      >
        Explore the store <span aria-hidden="true" className="ml-2">↗</span>
      </LocalizedClientLink>
    </div>
  )
}

export default OrderOverview
