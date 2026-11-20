import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import {
  getVibeyaCategoryContent,
  isKnownVibeyaCategorySlug,
  isVibeyaCategoryLocale,
  VIBEYA_CATEGORY_CONTENT_METADATA_KEY,
} from "../../../../lib/vibeya-category-content"

type Product = { id: string; title: string; handle: string; status: string }
type NativeCategory = { id: string; name: string; handle: string; products?: Array<{ handle: string }> }
type Store = { id: string; metadata?: Record<string, unknown> | null }

async function loadData(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: Record<string, unknown>) => Promise<{ data: any[] }>
  }
  const [{ data: stores }, { data: products }, { data: nativeCategories }] = await Promise.all([
    query.graph({ entity: "store", fields: ["id", "metadata"] }),
    query.graph({ entity: "product", fields: ["id", "title", "handle", "status"], pagination: { take: 1000, order: { title: "ASC" } } }),
    query.graph({ entity: "product_category", fields: ["id", "name", "handle", "products.handle"], pagination: { take: 1000, order: { name: "ASC" } } }),
  ])
  return { store: stores[0] as Store | undefined, products: products as Product[], nativeCategories: nativeCategories as NativeCategory[] }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { store, products, nativeCategories } = await loadData(req)
    const publishedHandles = new Set(products.filter((product) => product.handle?.startsWith("vibeya-") && product.status === "published").map((product) => product.handle))
    const categorySources = nativeCategories.map((category) => ({
      handle: category.handle,
      name: category.name,
      productHandles: (category.products ?? []).map((product) => product.handle).filter((handle) => publishedHandles.has(handle)),
    })).filter((category) => category.productHandles.length)
    return res.json({
      categories: getVibeyaCategoryContent(store?.metadata?.[VIBEYA_CATEGORY_CONTENT_METADATA_KEY], categorySources),
      products: products.filter((product) => product.handle?.startsWith("vibeya-") && product.status === "published"),
    })
  } catch (error) {
    console.error("Unable to load VIBEYA category content", error)
    return res.status(500).json({ error: "无法读取分类内容，请稍后重试。" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { slug?: unknown; locale?: unknown; copy?: unknown; productHandles?: unknown; initializeDefaults?: unknown } | undefined
  const slug = typeof body?.slug === "string" ? body.slug.trim() : ""
  const initializeDefaults = body?.initializeDefaults === true
  if (!initializeDefaults && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !isVibeyaCategoryLocale(body?.locale))) {
    return res.status(400).json({ error: "请选择有效的分类和站点语言。" })
  }
  if (!initializeDefaults && (!Array.isArray(body?.productHandles) || body.productHandles.length > 100 || body.productHandles.some((handle) => typeof handle !== "string"))) {
    return res.status(400).json({ error: "分类商品列表格式无效。" })
  }

  const label = typeof (body.copy as Record<string, unknown> | undefined)?.label === "string" ? String((body.copy as Record<string, unknown>).label).trim().slice(0, 200) : ""
  const seoTitle = typeof (body.copy as Record<string, unknown> | undefined)?.seoTitle === "string" ? String((body.copy as Record<string, unknown>).seoTitle).trim().slice(0, 300) : ""
  const description = typeof (body.copy as Record<string, unknown> | undefined)?.description === "string" ? String((body.copy as Record<string, unknown>).description).trim().slice(0, 1000) : ""
  try {
    const { store, products, nativeCategories } = await loadData(req)
    if (!store) return res.status(404).json({ error: "没有找到店铺配置。" })
    const publishedHandles = new Set(products.filter((product) => product.handle?.startsWith("vibeya-") && product.status === "published").map((product) => product.handle))
    const categorySources = nativeCategories.map((category) => ({
      handle: category.handle,
      name: category.name,
      productHandles: (category.products ?? []).map((product) => product.handle).filter((handle) => publishedHandles.has(handle)),
    })).filter((category) => category.productHandles.length)
    const content = getVibeyaCategoryContent(store.metadata?.[VIBEYA_CATEGORY_CONTENT_METADATA_KEY], categorySources)
    if (initializeDefaults) {
      await updateStoresWorkflow(req.scope).run({
        input: {
          selector: { id: store.id },
          update: { metadata: { ...(store.metadata ?? {}), [VIBEYA_CATEGORY_CONTENT_METADATA_KEY]: content } },
        },
      })
      return res.json({ initialized: Object.keys(content).length })
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !isVibeyaCategoryLocale(body?.locale) || (!isKnownVibeyaCategorySlug(slug) && !categorySources.some((category) => category.handle === slug))) {
      return res.status(400).json({ error: "请选择有效的分类和站点语言。" })
    }
    const productHandles = body!.productHandles as string[]
    if (productHandles.some((handle) => !publishedHandles.has(handle))) {
      return res.status(400).json({ error: "分类只能关联已发布的 VIBEYA 商品，请刷新列表后重试。" })
    }
    const nativeCategory = categorySources.find((category) => category.handle === slug)
    if (nativeCategory && !isKnownVibeyaCategorySlug(slug) && productHandles.some((handle) => !nativeCategory.productHandles.includes(handle))) {
      return res.status(400).json({ error: "新分类请先在 Medusa 商品分类中关联商品，再返回这里设置 SEO 文案。" })
    }

    if (!content[slug]) return res.status(404).json({ error: "没有找到该分类，请先在商品分类中创建分类并关联商品。" })
    const category = content[slug]
    category.productHandles = productHandles
    category.locales[body.locale] = { label, seoTitle, description }
    const saved = {
      ...(store.metadata ?? {}),
      [VIBEYA_CATEGORY_CONTENT_METADATA_KEY]: content,
    }
    await updateStoresWorkflow(req.scope).run({ input: { selector: { id: store.id }, update: { metadata: saved } } })
    return res.json({ slug, locale: body.locale, category })
  } catch (error) {
    console.error("Unable to save VIBEYA category content", error)
    return res.status(500).json({ error: "保存分类内容失败，请稍后重试。" })
  }
}
