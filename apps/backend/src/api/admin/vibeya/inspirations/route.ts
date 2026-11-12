import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import { DEFAULT_VIBEYA_INSPIRATIONS, normalizeVibeyaInspirations, VIBEYA_INSPIRATIONS_METADATA_KEY } from "../../../../lib/vibeya-inspirations"

async function getStore(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["id", "metadata"] })
  return data[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const store = await getStore(req)
  const saved = store?.metadata?.[VIBEYA_INSPIRATIONS_METADATA_KEY]
  const inspirations = normalizeVibeyaInspirations(saved ?? DEFAULT_VIBEYA_INSPIRATIONS)
  return res.json({ inspirations })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { inspirations?: unknown } | undefined
  if (!Array.isArray(body?.inspirations) || body.inspirations.length > 100) {
    return res.status(400).json({ error: "灵感条目数量无效（最多 100 条）。" })
  }
  const inspirations = normalizeVibeyaInspirations(body.inspirations)
  if (inspirations.length !== body.inspirations.length) {
    return res.status(400).json({ error: "有灵感资料不完整，请检查标题、文章地址、图片和标签。" })
  }
  if (new Set(inspirations.map((entry) => entry.id)).size !== inspirations.length) {
    return res.status(400).json({ error: "灵感编号不能重复。" })
  }
  const incompletePublished = inspirations.find((entry) => entry.published && (
    !entry.title.trim()
    || !entry.image.trim()
    || !entry.cardImage.trim()
    || (entry.slug.startsWith("story.html?") && !entry.summary.trim())
  ))
  if (incompletePublished) {
    return res.status(400).json({ error: `“${incompletePublished.title || "新灵感"}”已设为发布，请补全标题、卡片图片、专题主图和文章介绍。` })
  }
  const mismatchedStory = inspirations.find((entry) => entry.slug.startsWith("story.html?") && entry.slug !== `story.html?inspiration=${entry.id}`)
  if (mismatchedStory) {
    return res.status(400).json({ error: `“${mismatchedStory.title || "新灵感"}”的文章地址需要与内部编号保持一致。` })
  }
  const store = await getStore(req)
  if (!store) return res.status(404).json({ error: "没有找到店铺配置。" })

  try {
    await updateStoresWorkflow(req.scope).run({
      input: {
        selector: { id: store.id },
        update: { metadata: { ...(store.metadata ?? {}), [VIBEYA_INSPIRATIONS_METADATA_KEY]: inspirations } },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    return res.status(500).json({ error: `保存灵感内容失败：${message}` })
  }
  return res.json({ inspirations })
}
