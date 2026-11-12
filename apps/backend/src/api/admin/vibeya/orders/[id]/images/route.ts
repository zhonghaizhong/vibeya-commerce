import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "items.id",
        "items.title",
        "items.product_title",
        "items.quantity",
        "items.thumbnail",
        "items.variant_title",
        "items.product.thumbnail",
        "items.product.images.url",
        "items.metadata",
      ],
      filters: { id },
      pagination: { take: 1 },
    })

    const order = data[0]
    if (!order) return res.status(404).json({ error: "没有找到这个订单。" })

    return res.json({
      order: {
        id: order.id,
        display_id: order.display_id,
        items: (order.items ?? []).map((item: any) => ({
          id: item.id,
          title: item.product_title || item.title,
          variant_title: item.variant_title,
          quantity: item.quantity,
          thumbnail:
            (typeof item.metadata?.vibeya_generated_artwork === "string" &&
            item.metadata.vibeya_generated_artwork.startsWith("data:image/")
              ? item.metadata.vibeya_generated_artwork
              : null) ||
            item.thumbnail || item.product?.thumbnail || item.product?.images?.[0]?.url || null,
          metadata: item.metadata,
        })),
      },
    })
  } catch (error) {
    console.error("Unable to load order item images", error)
    return res.status(500).json({ error: "订单商品图片暂时无法读取。" })
  }
}
