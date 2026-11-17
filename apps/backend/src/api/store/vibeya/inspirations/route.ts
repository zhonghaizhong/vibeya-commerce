import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DEFAULT_VIBEYA_INSPIRATIONS, includeReleasedDefaultInspirations, normalizeVibeyaInspirations, VIBEYA_INSPIRATIONS_METADATA_KEY } from "../../../../lib/vibeya-inspirations"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const metadata = data[0]?.metadata as Record<string, unknown> | undefined
  const inspirations = includeReleasedDefaultInspirations(metadata?.[VIBEYA_INSPIRATIONS_METADATA_KEY] ?? DEFAULT_VIBEYA_INSPIRATIONS)
  const countryCode = String(req.query.country_code ?? "us").toLowerCase()
  const matchesCountry = (entry: typeof inspirations[number]) => entry.countryCodes?.includes("*") || entry.countryCodes?.includes(countryCode)
  return res.json({
    inspirations: inspirations.filter((entry) => entry.published && matchesCountry(entry)),
    excluded_ids: inspirations.filter((entry) => !entry.published || !matchesCountry(entry)).map((entry) => entry.id),
  })
}
