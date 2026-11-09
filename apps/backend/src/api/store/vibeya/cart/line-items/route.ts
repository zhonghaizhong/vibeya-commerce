import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"

type AddVibeyaLineItemBody = {
  cart_id?: string
  variant_id?: string
  quantity?: number
  metadata?: Record<string, unknown>
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as AddVibeyaLineItemBody
  if (!body?.cart_id || !body.variant_id) {
    return res.status(400).json({ error: "A cart and product variant are required." })
  }

  const quantity = Number(body.quantity ?? 1)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return res.status(400).json({ error: "Quantity must be between 1 and 100." })
  }

  await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: body.cart_id,
      items: [{
        variant_id: body.variant_id,
        quantity,
        metadata: body.metadata,
      }],
    },
  })

  return res.status(200).json({ cart_id: body.cart_id })
}
