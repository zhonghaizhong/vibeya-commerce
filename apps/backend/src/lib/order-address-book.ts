import type { SubscriberArgs } from "@medusajs/medusa"
import { createCustomerAddressesWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type OrderPlacedData = { id: string }
type AddressSyncResult = "saved" | "already_saved" | "not_found" | "not_owned"

const normalize = (value?: string | null) => (value || "").trim().toLowerCase()

export const saveOrderShippingAddressToCustomer = async (
  container: SubscriberArgs<OrderPlacedData>["container"],
  orderId: string,
  expectedCustomerId?: string
): Promise<AddressSyncResult> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "email", "shipping_address.*"],
    filters: { id: orderId },
    pagination: { take: 1 },
  })
  const order = orders[0] as {
    customer_id?: string | null
    email?: string | null
    shipping_address?: {
      first_name?: string | null
      last_name?: string | null
      address_1?: string | null
      address_2?: string | null
      company?: string | null
      city?: string | null
      province?: string | null
      postal_code?: string | null
      country_code?: string | null
      phone?: string | null
    } | null
  } | undefined

  if (!order?.shipping_address?.address_1) return "not_found"
  if (!expectedCustomerId && !order.customer_id && !order.email) return "not_found"
  if (expectedCustomerId && order.customer_id && order.customer_id !== expectedCustomerId) {
    return "not_owned"
  }

  const customerFields = [
    "id",
    "email",
    "addresses.id",
    "addresses.address_1",
    "addresses.address_2",
    "addresses.city",
    "addresses.province",
    "addresses.postal_code",
    "addresses.country_code",
    "addresses.is_default_shipping",
  ]
  const customerFilters = expectedCustomerId
    ? { id: expectedCustomerId }
    : order.customer_id
      ? { id: order.customer_id }
      : { email: order.email?.trim().toLowerCase() }
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: customerFields,
    filters: customerFilters,
    pagination: { take: 1 },
  })
  const customer = customers[0] as {
    id: string
    email?: string | null
    addresses?: Array<{
      address_1?: string | null
      address_2?: string | null
      city?: string | null
      province?: string | null
      postal_code?: string | null
      country_code?: string | null
      is_default_shipping?: boolean | null
    }>
  } | undefined

  if (!customer) return "not_found"
  if (expectedCustomerId && !order.customer_id && normalize(customer.email) !== normalize(order.email)) {
    return "not_owned"
  }

  const address = order.shipping_address
  const duplicate = customer.addresses?.some((saved) =>
    normalize(saved.address_1) === normalize(address.address_1) &&
    normalize(saved.address_2) === normalize(address.address_2) &&
    normalize(saved.city) === normalize(address.city) &&
    normalize(saved.province) === normalize(address.province) &&
    normalize(saved.postal_code) === normalize(address.postal_code) &&
    normalize(saved.country_code) === normalize(address.country_code)
  )
  if (duplicate) return "already_saved"

  await createCustomerAddressesWorkflow(container).run({
    input: {
      addresses: [
        {
          customer_id: customer.id,
          first_name: address.first_name || "",
          last_name: address.last_name || "",
          address_1: address.address_1,
          address_2: address.address_2 || "",
          company: address.company || "",
          city: address.city || "",
          province: address.province || "",
          postal_code: address.postal_code || "",
          country_code: address.country_code || "us",
          phone: address.phone || "",
          is_default_shipping: !(customer.addresses ?? []).some((saved) => saved.is_default_shipping),
        },
      ],
    },
  })

  return "saved"
}
