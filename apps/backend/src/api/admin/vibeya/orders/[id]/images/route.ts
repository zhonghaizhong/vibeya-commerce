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
        "created_at",
        "status",
        "payment_status",
        "fulfillment_status",
        "total",
        "currency_code",
        "email",
        "customer.first_name",
        "customer.last_name",
        "customer.phone",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.province",
        "shipping_address.postal_code",
        "shipping_address.country_code",
        "shipping_address.phone",
        "shipping_methods.name",
        "fulfillments.id",
        "fulfillments.created_at",
        "fulfillments.items.id",
        "fulfillments.items.quantity",
        "fulfillments.labels.tracking_number",
        "fulfillments.labels.tracking_url",
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
        ...order,
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
