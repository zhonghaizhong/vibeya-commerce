import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  try {
    const { data, metadata } = await query.graph({
      entity: "order",
      fields: [
        "id", "display_id", "created_at", "status", "payment_status", "fulfillment_status",
        "total", "currency_code", "email", "customer.first_name", "customer.last_name",
        "shipping_address.first_name", "shipping_address.last_name", "shipping_address.address_1",
        "shipping_address.address_2", "shipping_address.city", "shipping_address.province",
        "shipping_address.postal_code", "shipping_address.country_code",
      ],
      pagination: { take: 250, order: { created_at: "DESC" } },
    })

    const orders = data

    return res.json({ orders, count: metadata?.count ?? orders.length })
  } catch (error) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
      `Unable to load order workspace: ${error instanceof Error ? error.message : String(error)}`
    )
    return res.status(500).json({ error: "订单列表暂时无法读取，请刷新后重试。" })
  }
}
