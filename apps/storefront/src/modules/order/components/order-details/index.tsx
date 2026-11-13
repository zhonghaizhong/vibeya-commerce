import { HttpTypes } from "@medusajs/types"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const formatStatus = (str: string) => {
    if (!str) return "Status unavailable"
    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }
  const createdAt = order.created_at ? new Date(order.created_at) : null
  const orderDate = createdAt && Number.isFinite(createdAt.getTime())
    ? createdAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Date unavailable"

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm leading-6 text-[#77717d]">
          Confirmation sent to{" "}
          <span
            className="font-semibold text-[#160d24]"
            data-testid="order-email"
          >
            {order.email || "Email unavailable"}
          </span>
        </p>
        <p className="mt-2 text-sm text-[#77717d]">
          Placed on{" "}
          <span className="font-semibold text-[#160d24]" data-testid="order-date">
            {orderDate}
          </span>
        </p>
      </div>

      {showStatus && (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="inline-flex rounded-full bg-[#f1e5ff] px-3 py-1.5 text-xs font-bold text-[#7251b4]" data-testid="order-status">
            {formatStatus(order.fulfillment_status)}
          </span>
          <span className="inline-flex rounded-full bg-[#f6f4f7] px-3 py-1.5 text-xs font-bold text-[#625c69]" data-testid="order-payment-status">
            {formatStatus(order.payment_status)}
          </span>
        </div>
      )}
      <span className="sr-only" data-testid="order-id">{order.display_id}</span>
    </div>
  )
}

export default OrderDetails
