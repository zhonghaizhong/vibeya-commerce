import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DEFAULT_VIBEYA_INSPIRATIONS, normalizeVibeyaInspirations, VIBEYA_INSPIRATIONS_METADATA_KEY } from "../../../../lib/vibeya-inspirations"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const metadata = data[0]?.metadata as Record<string, unknown> | undefined
  const inspirations = normalizeVibeyaInspirations(metadata?.[VIBEYA_INSPIRATIONS_METADATA_KEY] ?? DEFAULT_VIBEYA_INSPIRATIONS)
  return res.json({ inspirations: inspirations.filter((entry) => entry.published) })
}
