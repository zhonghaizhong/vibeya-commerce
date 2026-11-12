import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"


type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const address = order.shipping_address
  const recipient = [address?.first_name, address?.last_name].filter(Boolean).join(" ")
  const addressLines = [address?.address_1, address?.address_2].filter(Boolean)
  const locality = [address?.city, address?.province, address?.postal_code].filter(Boolean).join(", ")
  const shippingMethod = order.shipping_methods?.[0]
  const shippingAmount = shippingMethod?.total ?? shippingMethod?.amount

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
          {recipient && <Text className="text-sm leading-6 text-[#77717d]">{recipient}</Text>}
          {addressLines.length > 0 ? (
            addressLines.map((line) => <Text key={line} className="text-sm leading-6 text-[#77717d]">{line}</Text>)
          ) : !recipient ? (
            <Text className="text-sm leading-6 text-[#77717d]">Address unavailable</Text>
          ) : null}
          {locality && <Text className="text-sm leading-6 text-[#77717d]">{locality}</Text>}
          {address?.country_code && (
            <Text className="text-sm leading-6 text-[#77717d]">{address.country_code.toUpperCase()}</Text>
          )}
        </div>

        <div
          className="flex flex-col"
          data-testid="shipping-contact-summary"
        >
          <Text className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-[#8f60ed]">Contact</Text>
          <Text className="text-sm leading-6 text-[#77717d]">
            {address?.phone || "Phone unavailable"}
          </Text>
          <Text className="break-all text-sm leading-6 text-[#77717d]">{order.email || "Email unavailable"}</Text>
        </div>

        <div
          className="flex flex-col"
          data-testid="shipping-method-summary"
        >
          <Text className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-[#8f60ed]">Method</Text>
          <Text className="text-sm leading-6 text-[#77717d]">
            {shippingMethod?.name || "Delivery method unavailable"}
            {typeof shippingAmount === "number" && (
              <span> · {shippingAmount === 0 ? "Free" : convertToLocale({ amount: shippingAmount, currency_code: order.currency_code })}</span>
            )}
          </Text>
        </div>
      </div>
    </div>
  )
}

export default ShippingDetails
