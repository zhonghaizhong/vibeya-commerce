"use client"

import { HttpTypes } from "@medusajs/types"
import type { OrderTrackingShipment } from "@lib/data/orders"
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
  shipments?: OrderTrackingShipment[]
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({
  order,
  shipments = [],
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
      {shipments.length > 0 && (
        <AccountCard as="section" className="rounded-[22px] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#8f60ed]">DELIVERY UPDATES</p>
              <h2 className="mt-1 text-lg font-bold text-[#1a1028]">Shipment tracking</h2>
            </div>
            <span className="rounded-full bg-[#efffc0] px-3 py-1 text-xs font-semibold text-[#1a1028]">
              {shipments[0].status}
            </span>
          </div>
          <div className="flex flex-col gap-5">
            {shipments.map((shipment) => (
              <div key={shipment.trackingNumber} className="rounded-2xl border border-[#eadcf7] bg-[#fcf9ff] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-[#1a1028]">Tracking number</span>
                  <span className="break-all text-[#514665]">{shipment.trackingNumber}</span>
                </div>
                {shipment.trackingUrl && (
                  <a className="mt-2 inline-flex text-sm font-semibold text-[#6c3fc0] underline underline-offset-2" href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                    Track with carrier <span className="ml-1" aria-hidden="true">↗</span>
                  </a>
                )}
                {shipment.events.length > 0 ? (
                  <ol className="mt-4 space-y-4 border-l border-[#d9c3f4] pl-4">
                    {shipment.events.map((event, index) => (
                      <li key={`${event.time}-${index}`} className="relative">
                        <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-[#8f60ed]" : "bg-[#d9c3f4]"}`} />
                        <p className="text-sm font-medium text-[#241a33]">{event.description}</p>
                        <p className="mt-1 text-xs text-[#746b80]">
                          {[event.location, event.time ? new Date(event.time).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : ""].filter(Boolean).join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-[#746b80]">No carrier updates yet. Tracking events will appear here when available.</p>
                )}
              </div>
            ))}
          </div>
        </AccountCard>
      )}
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
