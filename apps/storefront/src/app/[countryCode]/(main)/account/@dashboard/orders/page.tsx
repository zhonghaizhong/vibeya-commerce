import { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import AccountPageHeading from "@modules/account/components/account-page-heading"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import { retrieveCustomer } from "@lib/data/customer"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export const metadata: Metadata = {
  title: "Orders",
  description: "Overview of your previous orders.",
}

export default async function Orders() {
  const customer = await retrieveCustomer()
  if (!customer) return null

  const orders = await listOrders()

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <AccountPageHeading
        eyebrow="YOUR HISTORY"
        title="Orders"
        description="Track purchases, review order details, and get help when you need it."
      />
      <div className="space-y-5">
        <OrderOverview orders={orders} />
        {orders.length > 0 && (
          <section className="rounded-[22px] border border-[#e9e3ea] bg-white p-5 sm:p-6">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[.16em] text-[#8f60ed]">
              ORDER SUPPORT
            </p>
            <TransferRequestForm />
          </section>
        )}
      </div>
    </div>
  )
}
