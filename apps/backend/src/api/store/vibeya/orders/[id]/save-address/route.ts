import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { saveOrderShippingAddressToCustomer } from "../../../../../../lib/order-address-book"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

export const POST = async (req: AuthenticatedRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) return res.status(401).json({ message: "Sign in to save this delivery address." })

  try {
    const result = await saveOrderShippingAddressToCustomer(req.scope, req.params.id, customerId)
    if (result === "not_owned") return res.status(404).json({ message: "Order not found." })
    if (result === "not_found") return res.status(404).json({ message: "Order address is not available." })

    return res.json({ saved: result === "saved", alreadySaved: result === "already_saved" })
  } catch (error) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
      `Unable to sync the shipping address for order ${req.params.id}: ${error instanceof Error ? error.message : String(error)}`
    )
    return res.status(500).json({ message: "The delivery address could not be saved. Please try again." })
  }
}
