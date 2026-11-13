import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const PRODUCT_IDS_METADATA_KEY = "vibeya_fulfillment_product_ids"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  try {
    const [{ data: orders }, { data: locations }] = await Promise.all([
      query.graph({
        entity: "order",
        fields: ["id", "items.id", "items.quantity", "items.product.id", "fulfillments.items.id", "fulfillments.items.line_item_id", "fulfillments.items.quantity"],
        filters: { id: req.params.id },
        pagination: { take: 1 },
      }),
      query.graph({
        entity: "stock_location",
        fields: ["id", "name", "address.address_1", "address.city", "address.province", "address.country_code", "metadata"],
        pagination: { take: 1000, order: { created_at: "ASC" } },
      }),
    ])
    const order = orders[0] as any
    if (!order) return res.status(404).json({ error: "没有找到这个订单。" })

    const fulfilled = new Map<string, number>()
    for (const fulfillment of order.fulfillments ?? []) {
      for (const item of fulfillment.items ?? []) {
        const lineItemId = item.line_item_id || item.id
        fulfilled.set(lineItemId, (fulfilled.get(lineItemId) ?? 0) + Number(item.quantity ?? 0))
      }
    }
    const remaining = (order.items ?? [])
      .map((item: any) => ({
        id: item.id,
        product_id: item.product?.id,
        quantity: Math.max(0, Number(item.quantity ?? 0) - (fulfilled.get(item.id) ?? 0)),
      }))
      .filter((item: any) => item.quantity > 0)
    if (!remaining.length) return res.json({ locations: [], remaining_items: [], already_fulfilled: true })

    const productIds = [...new Set(remaining.map((item: any) => item.product_id).filter(Boolean))]
    const candidates = locations.filter((location: any) => {
      const assigned = location.metadata?.[PRODUCT_IDS_METADATA_KEY]
      return Array.isArray(assigned) && productIds.length > 0 && productIds.every((id) => assigned.includes(id))
    }).map((location: any) => ({
      id: location.id,
      name: location.name,
      address: [location.address?.address_1, location.address?.city, location.address?.province, location.address?.country_code?.toUpperCase()].filter(Boolean).join(", "),
    }))
    return res.json({ locations: candidates, remaining_items: remaining, already_fulfilled: false })
  } catch (error) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
      `Unable to resolve fulfillment locations for order ${req.params.id}: ${error instanceof Error ? error.message : String(error)}`
    )
    return res.status(500).json({ error: "发货仓库暂时无法读取，请刷新后重试。" })
  }
}
