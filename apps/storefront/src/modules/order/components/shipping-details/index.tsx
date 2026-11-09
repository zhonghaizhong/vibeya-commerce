import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"


type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  return (
    <div>
      <Heading level="h2" className="mb-5 font-display text-2xl font-extrabold tracking-[-.04em]">
        Delivery
      </Heading>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div
          className="flex flex-col"
          data-testid="shipping-address-summary"
        >
          <Text className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-[#8f60ed]">
            Shipping Address
          </Text>
          <Text className="text-sm leading-6 text-[#77717d]">
            {order.shipping_address?.first_name}{" "}
            {order.shipping_address?.last_name}
          </Text>
          <Text className="text-sm leading-6 text-[#77717d]">
            {order.shipping_address?.address_1}{" "}
            {order.shipping_address?.address_2}
          </Text>
          <Text className="text-sm leading-6 text-[#77717d]">
            {order.shipping_address?.postal_code},{" "}
            {order.shipping_address?.city}
          </Text>
          <Text className="text-sm leading-6 text-[#77717d]">
            {order.shipping_address?.country_code?.toUpperCase()}
          </Text>
        </div>

        <div
          className="flex flex-col"
          data-testid="shipping-contact-summary"
        >
          <Text className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-[#8f60ed]">Contact</Text>
          <Text className="text-sm leading-6 text-[#77717d]">
            {order.shipping_address?.phone}
          </Text>
          <Text className="break-all text-sm leading-6 text-[#77717d]">{order.email}</Text>
        </div>

        <div
          className="flex flex-col"
          data-testid="shipping-method-summary"
        >
          <Text className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-[#8f60ed]">Method</Text>
          <Text className="text-sm leading-6 text-[#77717d]">
            {(order.shipping_methods?.[0] as { name?: string })?.name || "Standard delivery"}
            {" · "}
            {convertToLocale({
              amount: order.shipping_methods?.[0]?.total ?? 0,
              currency_code: order.currency_code,
            })}
          </Text>
        </div>
      </div>
    </div>
  )
}

export default ShippingDetails
