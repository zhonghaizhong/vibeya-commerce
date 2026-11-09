"use client"

import { HttpTypes } from "@medusajs/types"
import AccountPageHeading from "@modules/account/components/account-page-heading"
import AccountCard from "@modules/account/components/account-card"
import { AccountActionLink } from "@modules/account/components/account-action"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"
import React from "react"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({
  order,
}) => {
  return (
    <div className="flex flex-col gap-5" data-testid="order-details-container">
      <AccountPageHeading
        eyebrow="ORDER DETAILS"
        title={`Order #${order.display_id}`}
        description="Review your items, delivery details, and payment summary."
        trailing={
          <AccountActionLink
            href="/account/orders"
            size="large"
            data-testid="back-to-overview-button"
          >
            <span className="mr-2" aria-hidden="true">
              ←
            </span>
            Back to orders
          </AccountActionLink>
        }
      />
      <AccountCard as="section" className="rounded-[22px] p-5 sm:p-6">
        <OrderDetails order={order} showStatus />
      </AccountCard>
      <AccountCard as="section" className="rounded-[22px] p-5 sm:p-6">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[.16em] text-[#8f60ed]">
          ITEMS IN THIS ORDER
        </p>
        <Items order={order} />
      </AccountCard>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,.8fr)]">
        <AccountCard as="section" className="rounded-[22px] p-5 sm:p-6">
          <ShippingDetails order={order} />
        </AccountCard>
        <AccountCard as="section" className="rounded-[22px] p-5 sm:p-6">
          <OrderSummary order={order} />
        </AccountCard>
      </div>
      <section className="rounded-[22px] bg-[#f1e5ff] p-5 sm:p-6">
        <Help />
      </section>
    </div>
  )
}

export default OrderDetailsTemplate
