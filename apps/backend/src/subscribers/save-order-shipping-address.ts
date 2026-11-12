import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { saveOrderShippingAddressToCustomer } from "../lib/order-address-book"

type OrderPlacedData = { id: string }

export default async function saveOrderShippingAddress({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const result = await saveOrderShippingAddressToCustomer(container, data.id)
    if (result === "not_found") {
      logger.warn(`Order ${data.id} address-book sync skipped because no matching customer or shipping address was found`)
    }
  } catch (error) {
    logger.error(
      `Unable to save shipping address for placed order ${data.id}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
