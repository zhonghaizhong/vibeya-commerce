import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  getVibeyaProductContent,
  isVibeyaProductContentLocale,
  normalizeVibeyaProductContent,
  normalizeVibeyaProductContentCopy,
  VIBEYA_PRODUCT_CONTENT_METADATA_KEY,
} from "../../../../lib/vibeya-product-content"

type ProductContentRow = {
  id: string
  title: string
  handle: string
  status: string
  metadata?: Record<string, unknown> | null
}

const loadProducts = async (req: MedusaRequest) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: Record<string, unknown>) => Promise<{ data: ProductContentRow[] }>
  }
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "status", "metadata"],
    pagination: { take: 1000, order: { title: "ASC" } },
  })
  return data.filter((product) => product.handle?.startsWith("vibeya-"))
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const products = await loadProducts(req)
    return res.json({
      products: products.map((product) => {
        const stored = normalizeVibeyaProductContent(product.metadata?.[VIBEYA_PRODUCT_CONTENT_METADATA_KEY])
        const content = getVibeyaProductContent(product.handle, stored)
        return {
          id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          content,
          content_source: Object.fromEntries(Object.keys(content).map((locale) => [locale, stored[locale as keyof typeof stored] ? "backend" : "current-site-default"])),
        }
      }),
    })
  } catch (error) {
    console.error("Unable to load VIBEYA product display content", error)
    return res.status(500).json({ error: "无法读取商品展示内容，请稍后重试。" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { productId?: unknown; locale?: unknown; content?: unknown; initializeDefaults?: unknown } | undefined
  const productId = typeof body?.productId === "string" ? body.productId.trim() : ""
  if (body?.initializeDefaults !== true && (!productId || !isVibeyaProductContentLocale(body?.locale))) {
    return res.status(400).json({ error: "请选择商品和有效的内容语言。" })
  }

  const products = await loadProducts(req).catch((error) => {
    console.error("Unable to find VIBEYA product for content update", error)
    return null
  })
  if (!products) return res.status(500).json({ error: "读取商品资料失败，请稍后重试。" })

  if (body?.initializeDefaults === true) {
    try {
      const updates = products.map((product) => {
        const stored = normalizeVibeyaProductContent(product.metadata?.[VIBEYA_PRODUCT_CONTENT_METADATA_KEY])
        const mergedContent = getVibeyaProductContent(product.handle, stored)
        return {
          id: product.id,
          metadata: {
            ...(product.metadata ?? {}),
            [VIBEYA_PRODUCT_CONTENT_METADATA_KEY]: mergedContent,
          },
        }
      })
      if (updates.length) await updateProductsWorkflow(req.scope).run({ input: { products: updates } })
      return res.json({ initialized: updates.length })
    } catch (error) {
      console.error("Unable to initialize VIBEYA product content", error)
      return res.status(500).json({ error: "导入当前商品文案失败，请稍后重试。" })
    }
  }

  if (!productId || !isVibeyaProductContentLocale(body?.locale)) {
    return res.status(400).json({ error: "请选择商品和有效的内容语言。" })
  }
  const locale = body.locale
  const product = products.find((item) => item.id === productId)
  if (!product) return res.status(404).json({ error: "没有找到这款 VIBEYA 商品。" })

  try {
    const content = normalizeVibeyaProductContent(product.metadata?.[VIBEYA_PRODUCT_CONTENT_METADATA_KEY])
    content[locale] = normalizeVibeyaProductContentCopy(body.content)
    await updateProductsWorkflow(req.scope).run({
      input: {
        products: [{
          id: product.id,
          metadata: {
            ...(product.metadata ?? {}),
            [VIBEYA_PRODUCT_CONTENT_METADATA_KEY]: content,
          },
        }],
      },
    })
    return res.json({ productId: product.id, locale, content: getVibeyaProductContent(product.handle, content)[locale] })
  } catch (error) {
    console.error("Unable to save VIBEYA product display content", error)
    return res.status(500).json({ error: "保存商品展示内容失败，请稍后重试。" })
  }
}
