import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const url = new URL(req.url, "http://localhost")
  const customerId = url.searchParams.get("customerId")?.trim() ?? ""
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? ""

  if (!customerId && !email) {
    return res.status(400).json({ error: "请提供客户邮箱或客户编号。" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: Record<string, unknown>) => Promise<{ data: any[] }>
  }

  try {
    const { data } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "customer_id",
        "email",
        "created_at",
        "updated_at",
        "completed_at",
        "items.id",
        "items.title",
        "items.product_title",
        "items.variant_title",
        "items.thumbnail",
        "items.quantity",
        "items.metadata",
      ],
      filters: {
        completed_at: null,
        ...(customerId && !customerId.startsWith("guest:") ? { customer_id: customerId } : { email }),
      },
      pagination: { take: 100, order: { updated_at: "DESC" } },
    })

    const normalized = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : ""
    const carts = data
      .filter((cart) => {
        if (customerId && !customerId.startsWith("guest:")) return cart.customer_id === customerId
        return email && normalized(cart.email) === email
      })
      .filter((cart) => Array.isArray(cart.items) && cart.items.length > 0)
      .map((cart) => ({
        id: cart.id,
        email: cart.email,
        created_at: cart.created_at,
        updated_at: cart.updated_at,
        items: cart.items.map((item: Record<string, any>) => {
          const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {}
          return {
            id: item.id,
            title: item.product_title || item.title || "商品",
            variant: item.variant_title || "",
            thumbnail: item.thumbnail || null,
            quantity: Math.max(1, Number(item.quantity) || 1),
            design_name: typeof metadata.vibeya_design_name === "string" ? metadata.vibeya_design_name : "",
            design_prompt: typeof metadata.vibeya_design_prompt === "string" ? metadata.vibeya_design_prompt : "",
            print_placement: typeof metadata.vibeya_print_placement === "string" ? metadata.vibeya_print_placement : "",
            preview: typeof metadata.vibeya_generated_artwork === "string" ? metadata.vibeya_generated_artwork : null,
            inspiration_id: typeof metadata.vibeya_inspiration_id === "string" ? metadata.vibeya_inspiration_id : "",
          }
        }),
      }))

    return res.json({ carts })
  } catch (error) {
    console.error("Unable to load customer cart details", error)
    return res.status(500).json({ error: "购物车设计详情暂时无法读取，请稍后重试。" })
  }
}
