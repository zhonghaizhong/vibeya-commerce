import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isVibeyaAIConfig, toPublicAIConfig, VIBEYA_AI_METADATA_KEY } from "../../../../../lib/vibeya-ai"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const stored = data[0]?.metadata?.[VIBEYA_AI_METADATA_KEY]
  const config = isVibeyaAIConfig(stored) ? stored : null
  return res.json({ configured: Boolean(config?.encryptedApiKey), model: toPublicAIConfig(config).model })
}
