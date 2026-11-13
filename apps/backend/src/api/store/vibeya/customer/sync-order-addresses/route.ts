import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { saveOrderShippingAddressToCustomer } from "../../../../../lib/order-address-book"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

export const POST = async (req: AuthenticatedRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) return res.status(401).json({ message: "Sign in to sync delivery addresses." })

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email"],
      filters: { id: customerId },
      pagination: { take: 1 },
    })
    const customer = customers[0] as { id: string; email?: string | null } | undefined
    if (!customer) return res.status(404).json({ message: "Customer not found." })

    const ordersByCustomer = await query.graph({
      entity: "order",
      fields: ["id"],
      filters: { customer_id: customerId },
      pagination: { take: 500 },
    })
    const orderIds = new Set((ordersByCustomer.data as Array<{ id: string }>).map(({ id }) => id))

    // Older orders may not have a customer_id. Include only exact email matches;
    // the helper verifies ownership again before saving each address.
    if (customer.email?.trim()) {
      const ordersByEmail = await query.graph({
        entity: "order",
        fields: ["id"],
        filters: { email: customer.email.trim().toLowerCase() },
        pagination: { take: 500 },
      })
      for (const order of ordersByEmail.data as Array<{ id: string }>) orderIds.add(order.id)
    }

    let saved = 0
    let alreadySaved = 0
    for (const orderId of orderIds) {
      const result = await saveOrderShippingAddressToCustomer(req.scope, orderId, customerId)
      if (result === "saved") saved += 1
      if (result === "already_saved") alreadySaved += 1
    }

    return res.json({ saved, alreadySaved })
  } catch (error) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
      `Unable to sync order addresses for customer ${customerId}: ${error instanceof Error ? error.message : String(error)}`
    )
    return res.status(500).json({ message: "Delivery addresses could not be synced. Please try again." })
  }
}
