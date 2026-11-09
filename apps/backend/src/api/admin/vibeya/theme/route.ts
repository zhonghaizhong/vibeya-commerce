import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import {
  DEFAULT_VIBEYA_THEME_ID,
  toVibeyaThemeId,
  VIBEYA_THEMES,
  VIBEYA_THEME_METADATA_KEY,
} from "../../../../lib/vibeya-theme"

async function getStore(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["id", "metadata"] })
  return data[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
}

function toResponse(activeThemeId: unknown) {
  const activeId = toVibeyaThemeId(activeThemeId)
  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  return {
    themes: VIBEYA_THEMES.map((theme) => ({
      ...theme,
      previewUrl: `${storefrontUrl}${theme.previewPath}`,
      active: theme.id === activeId,
    })),
    activeThemeId: activeId,
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const store = await getStore(req)
  return res.json(toResponse(store?.metadata?.[VIBEYA_THEME_METADATA_KEY]))
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { activeThemeId?: unknown } | undefined
  if (typeof body?.activeThemeId !== "string" || !VIBEYA_THEMES.some((theme) => theme.id === body.activeThemeId)) {
    return res.status(400).json({ error: "请选择一个已配置的主题。" })
  }

  const store = await getStore(req)
  if (!store) return res.status(404).json({ error: "没有找到店铺配置。" })

  try {
    await updateStoresWorkflow(req.scope).run({
      input: {
        selector: { id: store.id },
        update: {
          metadata: {
            ...(store.metadata ?? {}),
            [VIBEYA_THEME_METADATA_KEY]: { activeThemeId: body.activeThemeId },
          },
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    return res.status(500).json({ error: `发布主题失败：${message}` })
  }

  return res.json(toResponse(body.activeThemeId))
}
