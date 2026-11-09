import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  DEFAULT_VIBEYA_THEME_ID,
  toVibeyaThemeId,
  VIBEYA_THEMES,
  VIBEYA_THEME_METADATA_KEY,
} from "../../../../lib/vibeya-theme"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const metadata = data[0]?.metadata as Record<string, unknown> | undefined
  const themeConfig = metadata?.[VIBEYA_THEME_METADATA_KEY] as Record<string, unknown> | undefined
  const activeThemeId = toVibeyaThemeId(themeConfig?.activeThemeId ?? DEFAULT_VIBEYA_THEME_ID)
  const theme = VIBEYA_THEMES.find((entry) => entry.id === activeThemeId) ?? VIBEYA_THEMES[0]

  return res.json({ theme: { id: theme.id, name: theme.name } })
}
