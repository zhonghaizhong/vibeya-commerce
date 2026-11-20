import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { getLegacyVibeyaProductDesigner, normalizeVibeyaProductDesigner, VIBEYA_PRODUCT_DESIGNER_METADATA_KEY } from "../../../../lib/vibeya-product-designer"
import { getVibeyaProductContent, VIBEYA_PRODUCT_CONTENT_METADATA_KEY } from "../../../../lib/vibeya-product-content"

type ProductRow = { id: string; title: string; handle: string; status: string; metadata?: Record<string, unknown> | null; variants?: Array<{ options?: Array<{ value?: string; option?: { title?: string } }> }> }

async function loadProducts(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as { graph: (input: Record<string, unknown>) => Promise<{ data: ProductRow[] }> }
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "status", "metadata", "variants.options.value", "variants.options.option.title"],
    pagination: { take: 1000, order: { title: "ASC" } },
  })
  return data
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const products = await loadProducts(req)
    return res.json({ products: products.map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      colors: [...new Set((product.variants ?? []).flatMap((variant) => (variant.options ?? []).filter((option) => option.option?.title?.toLowerCase() === "color").map((option) => option.value).filter((value): value is string => Boolean(value))))],
      sizes: [...new Set((product.variants ?? []).flatMap((variant) => (variant.options ?? []).filter((option) => option.option?.title?.toLowerCase() === "size").map((option) => option.value).filter((value): value is string => Boolean(value))))],
      designer: normalizeVibeyaProductDesigner(product.metadata?.[VIBEYA_PRODUCT_DESIGNER_METADATA_KEY]),
    })) })
  } catch (error) {
    console.error("Unable to load product designer settings", error)
    return res.status(500).json({ error: "读取商品设计器设置失败，请稍后重试。" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { productId?: unknown; designer?: unknown; importCurrentConfigs?: unknown } | undefined
  if (body?.importCurrentConfigs === true) {
    try {
      const products = await loadProducts(req)
      let designerImported = 0
      let contentImported = 0
      const updates = products.flatMap((product) => {
        const metadata = { ...(product.metadata ?? {}) }
        let changed = false
        const designer = getLegacyVibeyaProductDesigner(product.handle)
        if (designer && !Object.prototype.hasOwnProperty.call(metadata, VIBEYA_PRODUCT_DESIGNER_METADATA_KEY)) {
          metadata[VIBEYA_PRODUCT_DESIGNER_METADATA_KEY] = designer
          designerImported += 1
          changed = true
        }
        if (product.handle?.startsWith("vibeya-")) {
          const currentContent = metadata[VIBEYA_PRODUCT_CONTENT_METADATA_KEY]
          const content = getVibeyaProductContent(product.handle, currentContent)
          if (Object.keys(content).length && JSON.stringify(content) !== JSON.stringify(currentContent)) {
            metadata[VIBEYA_PRODUCT_CONTENT_METADATA_KEY] = content
            contentImported += 1
            changed = true
          }
        }
        return changed ? [{ id: product.id, metadata }] : []
      })
      if (updates.length) await updateProductsWorkflow(req.scope).run({ input: { products: updates } })
      return res.json({ imported: designerImported, contentImported, updated: updates.length })
    } catch (error) {
      console.error("Unable to import current frontend product designer settings", error)
      return res.status(500).json({ error: "导入现有商品设计配置失败，请稍后重试。" })
    }
  }
  const productId = typeof body?.productId === "string" ? body.productId.trim() : ""
  if (!productId || !body?.designer || typeof body.designer !== "object") return res.status(400).json({ error: "请选择商品并填写设计器设置。" })
  const designer = normalizeVibeyaProductDesigner(body.designer)
  if (designer.enabled && !designer.references.length) return res.status(400).json({ error: "启用设计器前，请至少添加一张商品底图。" })
  if (designer.enabled && designer.mode === "front-back") {
    const sides = new Set(designer.references.map((reference) => reference.side))
    if (!sides.has("front") || !sides.has("back")) {
      return res.status(400).json({ error: "正反面设计需要同时配置正面和背面底图。" })
    }
    if (designer.references.some((reference) => (reference.side === "front" || designer.placements.some((placement) => ["back", "both"].includes(placement))) && !reference.printAreaImageUrl)) {
      return res.status(400).json({ error: "开放正反面设计的每一面都需要印花区域参考图。" })
    }
  }
  if (designer.enabled && designer.mode === "full-surface" && !designer.references.some((reference) => reference.side === "surface")) {
    return res.status(400).json({ error: "整面满印至少需要配置一张 surface 底图。" })
  }
  try {
    const products = await loadProducts(req)
    const product = products.find((item) => item.id === productId)
    if (!product) return res.status(404).json({ error: "没有找到该商品。" })
    await updateProductsWorkflow(req.scope).run({ input: { products: [{
      id: product.id,
      metadata: { ...(product.metadata ?? {}), [VIBEYA_PRODUCT_DESIGNER_METADATA_KEY]: designer },
    }] } })
    return res.json({ productId, designer })
  } catch (error) {
    console.error("Unable to save product designer settings", error)
    return res.status(500).json({ error: "保存商品设计器设置失败，请稍后重试。" })
  }
}
