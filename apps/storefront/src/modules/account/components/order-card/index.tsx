import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import { AccountActionLink } from "../account-action"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import AccountCard from "../account-card"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const numberOfProducts = useMemo(() => {
    return order.items?.length ?? 0
  }, [order])
  const fulfillmentStatus = order.fulfillment_status
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase())

  return (
    <AccountCard
      as="article"
      className="rounded-[24px] p-5 transition hover:border-[#d9c9ed] hover:shadow-[0_16px_36px_rgba(35,17,56,.05)] sm:p-6"
      data-testid="order-card"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#8f60ed]">
            ORDER
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold tracking-[-.04em] text-[#160d24]">
            #<span data-testid="order-display-id">{order.display_id}</span>
          </h2>
          <p className="mt-1 text-sm text-[#77717d]" data-testid="order-created-at">
            {new Date(order.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            <span className="mx-2" aria-hidden="true">·</span>
            {numberOfLines} {numberOfLines === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <span className="inline-flex rounded-full bg-[#f1e5ff] px-3 py-1.5 text-xs font-bold text-[#7251b4]">
            {fulfillmentStatus}
          </span>
          <span className="text-base font-extrabold text-[#160d24]" data-testid="order-amount">
            {convertToLocale({
              amount: order.total,
              currency_code: order.currency_code,
            })}
          </span>
        </div>
      </div>
      <div className="my-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {order.items?.slice(0, 3).map((i) => {
          return (
            <div
              key={i.id}
              className="flex min-w-0 flex-col gap-2"
              data-testid="order-item"
            >
              <div className="overflow-hidden rounded-xl bg-[#f8f5fa]">
                <Thumbnail
                  thumbnail={i.thumbnail || i.product?.thumbnail || i.variant?.product?.thumbnail}
                  images={i.product?.images ?? []}
                  size="full"
                />
              </div>
              <div className="flex items-center text-xs text-[#625c69]">
                <span
                  className="truncate font-semibold text-[#160d24]"
                  data-testid="item-title"
                >
                  {i.title}
                </span>
                <span className="ml-1 shrink-0">×</span>
                <span className="shrink-0" data-testid="item-quantity">{i.quantity}</span>
              </div>
            </div>
          )
        })}
        {numberOfProducts > 3 && (
          <div className="flex min-h-24 flex-col items-center justify-center rounded-xl bg-[#f8f5fa] text-center">
            <span className="font-display text-2xl font-black text-[#160d24]">
              +{numberOfProducts - 3}
            </span>
            <span className="text-xs font-semibold text-[#77717d]">more items</span>
          </div>
        )}
      </div>
      <div className="flex justify-end border-t border-[#eee9ef] pt-4">
        <AccountActionLink
          href={`/account/orders/details/${order.id}`}
          data-testid="order-details-link"
        >
          View details <span className="ml-2 text-[#7251b4]" aria-hidden="true">↗</span>
        </AccountActionLink>
      </div>
    </AccountCard>
  )
}

export default OrderCard
