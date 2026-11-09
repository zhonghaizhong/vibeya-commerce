import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import {
  toVibeyaDesignCreditConfig,
  VIBEYA_DESIGN_CREDITS_METADATA_KEY,
} from "../../../../lib/vibeya-design-credits"

async function getStore(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["id", "metadata"] })
  return data[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const store = await getStore(req)
  return res.json({
    config: toVibeyaDesignCreditConfig(store?.metadata?.[VIBEYA_DESIGN_CREDITS_METADATA_KEY]),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { initialDesigns?: unknown; perPaidProductDesigns?: unknown; perOrderDesigns?: unknown } | undefined
  const initialDesigns = Number(body?.initialDesigns)
  const perPaidProductDesigns = Number(body?.perPaidProductDesigns ?? body?.perOrderDesigns)
  if (
    !Number.isInteger(initialDesigns) || initialDesigns < 0 || initialDesigns > 10000 ||
    !Number.isInteger(perPaidProductDesigns) || perPaidProductDesigns < 0 || perPaidProductDesigns > 10000
  ) {
    return res.status(400).json({ error: "免费设计次数必须是 0 到 10,000 之间的整数。" })
  }

  const store = await getStore(req)
  if (!store) return res.status(404).json({ error: "没有找到店铺配置。" })

  const config = { initialDesigns, perPaidProductDesigns }
  const oldConfig = store.metadata?.[VIBEYA_DESIGN_CREDITS_METADATA_KEY]
  const activatedAt = oldConfig && typeof oldConfig === "object" && typeof (oldConfig as Record<string, unknown>).activatedAt === "string"
    ? (oldConfig as Record<string, unknown>).activatedAt as string
    : new Date().toISOString()
  try {
    await updateStoresWorkflow(req.scope).run({
      input: {
        selector: { id: store.id },
        update: {
          metadata: {
            ...(store.metadata ?? {}),
            [VIBEYA_DESIGN_CREDITS_METADATA_KEY]: { ...config, activatedAt },
          },
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    return res.status(500).json({ error: `保存失败：${message}` })
  }

  const savedStore = await getStore(req)
  const savedConfig = toVibeyaDesignCreditConfig(savedStore?.metadata?.[VIBEYA_DESIGN_CREDITS_METADATA_KEY])
  if (savedConfig.initialDesigns !== initialDesigns || savedConfig.perPaidProductDesigns !== perPaidProductDesigns) {
    return res.status(500).json({ error: "设计次数规则未能写入店铺配置，请刷新后台后重试。" })
  }

  return res.json({ config: savedConfig })
}
