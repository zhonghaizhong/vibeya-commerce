"use client"

import { useEffect, useState } from "react"

import { AccountActionLink } from "../account-action"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import AccountCard from "../account-card"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const formatOrderDate = (value?: string | Date | null) => {
  if (!value) return "Date unavailable"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const OrderCard = ({ order }: OrderCardProps) => {
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null)
  const items = order.items ?? []
  const quantity = items.reduce((total, item) => total + item.quantity, 0)
  const fulfillmentStatus = (order.fulfillment_status || "processing")
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase())
  const orderReference = order.custom_display_id || order.display_id

  useEffect(() => {
    if (!zoomedImage) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomedImage(null)
    }
    document.addEventListener("keydown", closeOnEscape)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", closeOnEscape)
      document.body.style.overflow = ""
    }
  }, [zoomedImage])

  return (
    <>
      <AccountCard
        as="article"
        className="overflow-hidden rounded-[24px] transition hover:border-[#d9c9ed] hover:shadow-[0_16px_36px_rgba(35,17,56,.06)]"
        data-testid="order-card"
      >
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee9ef] bg-[#fcfaff] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8f60ed]">Order</p>
              <span className="text-xs text-[#aaa2b1]" aria-hidden="true">/</span>
              <h2 className="font-display text-base font-extrabold tracking-[-.025em] text-[#160d24]">
                #<span data-testid="order-display-id">{orderReference ?? "—"}</span>
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#77717d]" data-testid="order-created-at">
              {formatOrderDate(order.created_at)}
              <span className="mx-2" aria-hidden="true">·</span>
              {quantity} {quantity === 1 ? "item" : "items"}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
            <span className="inline-flex rounded-full bg-[#f1e5ff] px-3 py-1.5 text-xs font-bold capitalize text-[#7251b4]">
              {fulfillmentStatus}
            </span>
            <span className="text-base font-extrabold text-[#160d24]" data-testid="order-amount">
              {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
            </span>
          </div>
        </header>

        <div className="divide-y divide-[#f0ebf2] px-4 sm:px-6">
          {items.map((item) => {
            const generatedArtwork = item.metadata?.vibeya_generated_artwork
            const image =
              typeof generatedArtwork === "string" && generatedArtwork.startsWith("data:image/")
                ? generatedArtwork
                : item.thumbnail || item.product?.thumbnail || item.variant?.product?.thumbnail
            const title = item.title || item.product_title || "Custom product"

            return (
              <div key={item.id} className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-4 py-4 sm:grid-cols-[136px_minmax(0,1fr)] sm:gap-5 sm:py-5" data-testid="order-item">
                <button
                  type="button"
                  disabled={!image}
                  onClick={() => image && setZoomedImage({ src: image, alt: title })}
                  aria-label={image ? `Enlarge image of ${title}` : `No image available for ${title}`}
                  className="group relative flex h-[104px] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#eee8f3] bg-[linear-gradient(145deg,#faf8fc,#f3eef8)] p-2 transition hover:border-[#a97cf0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f60ed] disabled:cursor-default sm:h-[128px]"
                >
                  {image ? (
                    <>
                      <img src={image} alt={title} loading="lazy" className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]" />
                      <span className="pointer-events-none absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-sm font-bold text-[#5f3ba6] opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">↗</span>
                    </>
                  ) : (
                    <span className="text-xs text-[#8b8490]">Image unavailable</span>
                  )}
                </button>

                <div className="min-w-0 py-1">
                  <p className="break-words text-sm font-bold leading-5 text-[#160d24]" data-testid="item-title">{title}</p>
                  {(item.variant_title || item.variant?.title) && (
                    <p className="mt-1 text-xs text-[#77717d]">{item.variant_title || item.variant?.title}</p>
                  )}
                  <p className="mt-2 text-xs font-medium text-[#77717d]" data-testid="item-quantity">Quantity: {item.quantity}</p>
                </div>
              </div>
            )
          })}
        </div>

        <footer className="flex justify-end border-t border-[#eee9ef] px-4 py-3 sm:px-6">
          <AccountActionLink href={`/account/orders/details/${order.id}`} data-testid="order-details-link">
            View order details <span className="ml-2 text-[#7251b4]" aria-hidden="true">↗</span>
          </AccountActionLink>
        </footer>
      </AccountCard>

      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#160d24]/80 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Order product image preview"
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            aria-label="Close image preview"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white text-xl font-medium text-[#160d24] shadow-lg transition hover:bg-[#f1e5ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-7 sm:top-7"
          >
            ×
          </button>
          <div className="flex max-h-[88vh] max-w-[min(94vw,1100px)] flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <img src={zoomedImage.src} alt={zoomedImage.alt} className="max-h-[80vh] max-w-full rounded-2xl bg-white object-contain p-2 shadow-2xl" />
            <p className="max-w-full truncate rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#160d24]">{zoomedImage.alt}</p>
          </div>
        </div>
      )}
    </>
  )
}

export default OrderCard
