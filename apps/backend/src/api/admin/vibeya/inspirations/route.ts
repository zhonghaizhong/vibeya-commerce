import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import { DEFAULT_VIBEYA_INSPIRATIONS, includeReleasedDefaultInspirations, normalizeVibeyaInspirations, VIBEYA_INSPIRATIONS_METADATA_KEY } from "../../../../lib/vibeya-inspirations"
import { DEFAULT_VIBEYA_INSPIRATION_TAXONOMY, isValidVibeyaInspirationTaxonomy, normalizeVibeyaInspirationTaxonomy, VIBEYA_INSPIRATION_TAXONOMY_METADATA_KEY } from "../../../../lib/vibeya-inspiration-taxonomy"

async function getStore(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["id", "metadata"] })
  return data[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const store = await getStore(req)
  const saved = store?.metadata?.[VIBEYA_INSPIRATIONS_METADATA_KEY]
  const taxonomy = normalizeVibeyaInspirationTaxonomy(store?.metadata?.[VIBEYA_INSPIRATION_TAXONOMY_METADATA_KEY] ?? DEFAULT_VIBEYA_INSPIRATION_TAXONOMY)
  const inspirations = includeReleasedDefaultInspirations(saved ?? DEFAULT_VIBEYA_INSPIRATIONS)
  return res.json({ inspirations, taxonomy })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { inspirations?: unknown; taxonomy?: unknown } | undefined
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
  const store = await getStore(req)
  if (!store) return res.status(404).json({ error: "没有找到店铺配置。" })
  const taxonomySource = body.taxonomy ?? store.metadata?.[VIBEYA_INSPIRATION_TAXONOMY_METADATA_KEY] ?? DEFAULT_VIBEYA_INSPIRATION_TAXONOMY
  if (!isValidVibeyaInspirationTaxonomy(taxonomySource)) {
    return res.status(400).json({ error: "灵感分类格式无效，请检查分类编号和英文显示名称是否重复或为空。" })
  }
  const taxonomy = normalizeVibeyaInspirationTaxonomy(taxonomySource)
  const missingCategory = inspirations.find((entry) => (["product", "pattern", "style"] as const).some((facet) => entry[facet] && !taxonomy[facet].some((option) => option.value === entry[facet])))
  if (missingCategory) {
    return res.status(400).json({ error: `“${missingCategory.title || "新灵感"}”引用了分类清单中不存在的商品、图案或风格。请先恢复该分类，或调整这条灵感的分类。` })
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
  const missingMarketTranslation = inspirations.find((entry) => {
    if (!entry.published) return false
    const countries = entry.countryCodes ?? ["us"]
    const requires = (country: string) => countries.includes(country) || countries.includes("*")
    const complete = (locale: "ja-JP" | "es-MX") => {
      const copy = entry.translations?.[locale]
      return Boolean(copy?.title.trim() && copy.summary.trim() && copy.articleBody.trim() && copy.tags.length && copy.image.trim() && copy.cardImage.trim())
    }
    return (requires("jp") && !complete("ja-JP")) || (requires("mx") && !complete("es-MX"))
  })
  if (missingMarketTranslation) {
    const countries = missingMarketTranslation.countryCodes ?? ["us"]
    const requiresJapan = countries.includes("jp") || countries.includes("*")
    const requiresMexico = countries.includes("mx") || countries.includes("*")
    const complete = (locale: "ja-JP" | "es-MX") => {
      const copy = missingMarketTranslation.translations?.[locale]
      return Boolean(copy?.title.trim() && copy.summary.trim() && copy.articleBody.trim() && copy.tags.length && copy.image.trim() && copy.cardImage.trim())
    }
    const missing = [requiresJapan && !complete("ja-JP") ? "日语" : "", requiresMexico && !complete("es-MX") ? "西班牙语" : ""].filter(Boolean)
    const localeLabel = missing.length ? missing.join("和") : "对应语言"
    return res.status(400).json({ error: `“${missingMarketTranslation.title || "新灵感"}”已面向对应国家发布，请补全${localeLabel}标题、介绍、正文和标签。` })
  }
  const mismatchedStory = inspirations.find((entry) => entry.slug.startsWith("story.html?") && entry.slug !== `story.html?inspiration=${entry.id}`)
  if (mismatchedStory) {
    return res.status(400).json({ error: `“${mismatchedStory.title || "新灵感"}”的文章地址需要与内部编号保持一致。` })
  }
  try {
    await updateStoresWorkflow(req.scope).run({
      input: {
        selector: { id: store.id },
        update: { metadata: { ...(store.metadata ?? {}), [VIBEYA_INSPIRATIONS_METADATA_KEY]: inspirations, [VIBEYA_INSPIRATION_TAXONOMY_METADATA_KEY]: taxonomy } },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    return res.status(500).json({ error: `保存灵感内容失败：${message}` })
  }
  return res.json({ inspirations, taxonomy })
}
