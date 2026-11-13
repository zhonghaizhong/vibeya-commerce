import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createOrderFulfillmentWorkflow } from "@medusajs/medusa/core-flows"

type RequestBody = { location_id?: string }
const PRODUCT_IDS_METADATA_KEY = "vibeya_fulfillment_product_ids"

export const POST = async (req: MedusaRequest<RequestBody>, res: MedusaResponse) => {
  const locationId = typeof req.body?.location_id === "string" ? req.body.location_id.trim() : ""
  if (!locationId) return res.status(400).json({ error: "请选择发货仓库。" })

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const [{ data: orders }, { data: locations }] = await Promise.all([
      query.graph({
        entity: "order",
        fields: ["id", "items.id", "items.quantity", "items.product.id", "fulfillments.items.id", "fulfillments.items.line_item_id", "fulfillments.items.quantity"],
        filters: { id: req.params.id },
        pagination: { take: 1 },
      }),
      query.graph({
        entity: "stock_location",
        fields: ["id", "metadata"],
        filters: { id: locationId },
        pagination: { take: 1 },
      }),
    ])
    const order = orders[0] as any
    const location = locations[0] as any
    if (!order) return res.status(404).json({ error: "没有找到这个订单。" })
    if (!location) return res.status(400).json({ error: "所选发货仓库不存在，请刷新后重试。" })

    const fulfilled = new Map<string, number>()
    for (const fulfillment of order.fulfillments ?? []) {
      for (const item of fulfillment.items ?? []) {
        const lineItemId = item.line_item_id || item.id
        fulfilled.set(lineItemId, (fulfilled.get(lineItemId) ?? 0) + Number(item.quantity ?? 0))
      }
    }
    const items = (order.items ?? []).map((item: any) => ({
      id: item.id,
      product_id: item.product?.id,
      quantity: Math.max(0, Number(item.quantity ?? 0) - (fulfilled.get(item.id) ?? 0)),
    })).filter((item: any) => item.quantity > 0)
    if (!items.length) return res.status(409).json({ error: "这个订单已全部发货。" })
    const assignedIds = location.metadata?.[PRODUCT_IDS_METADATA_KEY]
    if (!Array.isArray(assignedIds) || items.some((item: any) => !item.product_id || !assignedIds.includes(item.product_id))) {
      return res.status(400).json({ error: "所选仓库不适用于订单中的全部商品，请重新选择。" })
    }

    await createOrderFulfillmentWorkflow(req.scope).run({
      input: {
        order_id: req.params.id,
        location_id: locationId,
        items: items.map(({ id, quantity }: { id: string; quantity: number }) => ({ id, quantity })),
        no_notification: false,
      },
    })
    const { data: refreshed } = await query.graph({
      entity: "order",
      fields: ["fulfillments.id", "fulfillments.created_at"],
      filters: { id: req.params.id },
      pagination: { take: 1 },
    })
    const latest = [...((refreshed[0] as any)?.fulfillments ?? [])]
      .sort((left: any, right: any) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime())[0]
    const fulfillmentId = latest?.id
    if (!fulfillmentId) throw new Error("发货单已创建，但无法读取发货单编号，请刷新订单后继续。")
    return res.status(201).json({
      fulfillment_id: fulfillmentId,
      items: items.map(({ id, quantity }: { id: string; quantity: number }) => ({ id, quantity })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "后台发货流程未完成。"
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(`Unable to fulfill order ${req.params.id}: ${message}`)
    return res.status(400).json({ error: `发货失败：${message}` })
  }
}
