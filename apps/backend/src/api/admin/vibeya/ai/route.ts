import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import {
  encryptAISecret,
  isValidAIAspectRatio,
  isValidAIQuality,
  isVibeyaAIConfig,
  toPublicAIConfig,
  validateAIBaseUrl,
  VIBEYA_AI_MODELS,
  VIBEYA_AI_METADATA_KEY,
  VibeyaAIConfig,
} from "../../../../lib/vibeya-ai"

async function getStore(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["id", "metadata"] })
  return data[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const store = await getStore(req)
  const saved = store?.metadata?.[VIBEYA_AI_METADATA_KEY]
  return res.json({ config: toPublicAIConfig(isVibeyaAIConfig(saved) ? saved : null) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as {
    baseUrl?: unknown
    model?: unknown
    aspectRatio?: unknown
    quality?: unknown
    apiKey?: unknown
    removeApiKey?: unknown
  } | undefined
  const baseUrl = validateAIBaseUrl(body?.baseUrl)
  const model = typeof body?.model === "string" ? body.model.trim() : ""
  const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : ""
  const quality = body?.quality
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : ""

  if (!baseUrl) return res.status(400).json({ error: "请填写有效的 HTTPS 服务地址。" })
  if (!VIBEYA_AI_MODELS.includes(model as typeof VIBEYA_AI_MODELS[number])) return res.status(400).json({ error: "请选择 GrsAI 支持的图片模型。" })
  if (!isValidAIAspectRatio(model, aspectRatio)) return res.status(400).json({ error: "这个模型不支持所选图片比例或尺寸。" })
  if (!isValidAIQuality(model, String(quality))) return res.status(400).json({ error: "这个模型不支持所选质量，请使用“自动”。" })
  if (apiKey.length > 500) return res.status(400).json({ error: "API 密钥长度无效。" })

  const store = await getStore(req)
  if (!store) return res.status(404).json({ error: "没有找到店铺配置。" })

  const oldValue = store.metadata?.[VIBEYA_AI_METADATA_KEY]
  const oldConfig = isVibeyaAIConfig(oldValue) ? oldValue : null
  let encryptedApiKey = body?.removeApiKey === true ? "" : oldConfig?.encryptedApiKey || ""
  let apiKeyHint = body?.removeApiKey === true ? "" : oldConfig?.apiKeyHint || ""

  if (apiKey) {
    try {
      encryptedApiKey = encryptAISecret(apiKey)
      apiKeyHint = apiKey.slice(-4)
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "无法安全保存 API 密钥。" })
    }
  }

  if (!encryptedApiKey) return res.status(400).json({ error: "请填写 API 密钥后再保存。" })

  const config: VibeyaAIConfig = {
    baseUrl,
    model,
    aspectRatio,
    quality: quality as VibeyaAIConfig["quality"],
    encryptedApiKey,
    apiKeyHint,
  }

  try {
    await updateStoresWorkflow(req.scope).run({
      input: {
        selector: { id: store.id },
        update: { metadata: { ...(store.metadata ?? {}), [VIBEYA_AI_METADATA_KEY]: config } },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    console.error("[VIBEYA AI config] Store metadata update failed:", message)
    return res.status(500).json({ error: `保存失败：${message}` })
  }

  return res.json({ config: toPublicAIConfig(config) })
}
