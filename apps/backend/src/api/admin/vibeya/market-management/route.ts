import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import { getVibeyaProductContent, VIBEYA_PRODUCT_CONTENT_METADATA_KEY } from "../../../../lib/vibeya-product-content"

const PRODUCT_IDS_METADATA_KEY = "vibeya_fulfillment_product_ids"
const MEDIA_METADATA_KEY = "vibeya_product_market_media"
const VIBEYA_SITE_COUNTRIES = ["us", "ca", "mx", "jp"]

type Market = { country_code: string; currency_code: string; region_id?: string; region_name?: string }
type Price = { id: string; amount: number; currency_code: string; rules?: { attribute?: string; value?: string }[] }
type Product = {
  id: string
  title: string
  handle: string
  status: string
  thumbnail?: string | null
  images?: { url?: string | null }[]
  metadata?: Record<string, unknown> | null
  variants?: { id: string; price_set?: { prices?: Price[] } | null }[]
  markets?: string[]
}
type Location = {
  metadata?: Record<string, unknown> | null
  fulfillment_sets?: { service_zones?: { geo_zones?: { country_code?: string | null }[] }[] }[]
}

function resolveProductMarkets(products: Product[], locations: Location[], markets: Market[]) {
  const allAssignedIds = new Set<string>()
  const mappedByCountry = new Map<string, Set<string>>()

  for (const location of locations) {
    const productIds = location.metadata?.[PRODUCT_IDS_METADATA_KEY]
    if (!Array.isArray(productIds)) continue
    const countries = new Set((location.fulfillment_sets ?? []).flatMap((set) =>
      (set.service_zones ?? []).flatMap((zone) =>
        (zone.geo_zones ?? []).map((geo) => String(geo.country_code ?? "").toLowerCase())
      )
    ))
    for (const id of productIds) {
      if (typeof id !== "string") continue
      allAssignedIds.add(id)
      for (const countryCode of countries) {
        const assigned = mappedByCountry.get(countryCode) ?? new Set<string>()
        assigned.add(id)
        mappedByCountry.set(countryCode, assigned)
      }
    }
  }

  const published = products.filter((product) => product.status === "published")
  return published.map((product) => {
    const availableMarkets = markets
      .filter((market) => {
        const countryCode = market.country_code.toLowerCase()
        const explicitMatch = mappedByCountry.get(countryCode)?.has(product.id) ?? false
        const legacyUsProduct = countryCode === "us" && !allAssignedIds.has(product.id)
        return explicitMatch || legacyUsProduct
      })
      .map((market) => market.country_code.toLowerCase())
    return { ...product, markets: availableMarkets }
  })
}

const marketLocales: Record<string, string> = { us: "en-US", ca: "en-CA", jp: "ja-JP", mx: "es-MX" }
const requiredContentFields = ["name", "detailTitle", "intro", "productDetails", "productionDetails", "seoTitle", "seoDescription"] as const

function buildReadiness(products: Product[], markets: Market[], localizedMedia: Record<string, Record<string, string[]>>) {
  return products.flatMap((product) => markets.map((market) => {
    const locale = marketLocales[market.country_code]
    const content = locale
      ? getVibeyaProductContent(product.handle, product.metadata?.[VIBEYA_PRODUCT_CONTENT_METADATA_KEY])[locale as keyof ReturnType<typeof getVibeyaProductContent>]
      : undefined
    const missingContent = content
      ? requiredContentFields.filter((field) => !String(content[field] ?? "").trim())
      : [...requiredContentFields]
    const variants = product.variants ?? []
    const pricedAmounts = variants.flatMap((variant) => {
      const matching = (variant.price_set?.prices ?? []).filter((price) => {
        if (price.currency_code?.toLowerCase() !== market.currency_code.toLowerCase()) return false
        const regionRules = (price.rules ?? []).filter((rule) => rule.attribute === "region_id")
        return !regionRules.length || regionRules.some((rule) => rule.value === market.region_id)
      })
      return matching.map((price) => Number(price.amount)).filter(Number.isFinite)
    })
    const marketImages = localizedMedia[product.id]?.[market.country_code] ?? []
    const hasBaseImage = Boolean(product.thumbnail || product.images?.some((image) => image.url))
    const availableMarkets = product.markets ?? []
    const storedContent = product.metadata?.[VIBEYA_PRODUCT_CONTENT_METADATA_KEY]
    const contentManaged = Boolean(
      locale
      && storedContent
      && typeof storedContent === "object"
      && !Array.isArray(storedContent)
      && (storedContent as Record<string, unknown>)[locale]
    )
    return {
      product_id: product.id,
      title: product.title,
      handle: product.handle,
      country_code: market.country_code,
      currency_code: market.currency_code,
      available: availableMarkets.includes(market.country_code),
      variant_count: variants.length,
      priced_variant_count: new Set(variants.flatMap((variant) => {
        const matching = (variant.price_set?.prices ?? []).some((price) => {
          if (price.currency_code?.toLowerCase() !== market.currency_code.toLowerCase()) return false
          const regionRules = (price.rules ?? []).filter((rule) => rule.attribute === "region_id")
          return !regionRules.length || regionRules.some((rule) => rule.value === market.region_id)
        })
        return matching ? [variant.id] : []
      })).size,
      minimum_price: pricedAmounts.length ? Math.min(...pricedAmounts) : null,
      locale: locale ?? "",
      missing_content: missingContent,
      content_managed: contentManaged,
      market_image_count: marketImages.length,
      has_base_image: hasBaseImage,
    }
  }))
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const [{ data: stores }, { data: products }, { data: locations }, { data: regions }] = await Promise.all([
      query.graph({ entity: "store", fields: ["id", "metadata"] }),
      query.graph({ entity: "product", fields: ["id", "title", "handle", "status", "thumbnail", "images.url", "metadata", "variants.id", "variants.price_set.prices.amount", "variants.price_set.prices.currency_code", "variants.price_set.prices.rules.attribute", "variants.price_set.prices.rules.value"], pagination: { take: 1000, order: { title: "ASC" } } }),
      query.graph({ entity: "stock_location", fields: ["metadata", "fulfillment_sets.service_zones.geo_zones.country_code"], pagination: { take: 1000 } }),
      query.graph({ entity: "region", fields: ["id", "name", "currency_code", "countries.iso_2"], pagination: { take: 1000 } }),
    ])

    const store = stores[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
    const markets: Market[] = (regions as any[]).flatMap((region) =>
      (region.countries ?? [])
        .map((country: any) => ({ country_code: country.iso_2?.toLowerCase() ?? "", currency_code: region.currency_code ?? "", region_id: region.id, region_name: region.name }))
        .filter((market) => VIBEYA_SITE_COUNTRIES.includes(market.country_code))
    ).sort((left, right) => VIBEYA_SITE_COUNTRIES.indexOf(left.country_code) - VIBEYA_SITE_COUNTRIES.indexOf(right.country_code))
    const productsWithMarkets = resolveProductMarkets(products as Product[], locations as Location[], markets)
    const localizedMedia = store?.metadata?.[MEDIA_METADATA_KEY] ?? {}
    return res.json({
      markets,
      products: productsWithMarkets,
      localized_media: localizedMedia,
      readiness: buildReadiness(productsWithMarkets, markets, localizedMedia as Record<string, Record<string, string[]>>),
    })
  } catch (error) {
    console.error("Unable to load market management data", error)
    return res.status(500).json({ error: "无法读取国家销售设置，请稍后重试。" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { product_id?: unknown; country_code?: unknown; image_urls?: unknown } | undefined
  const productId = typeof body?.product_id === "string" ? body.product_id.trim().slice(0, 100) : ""
  const countryCode = typeof body?.country_code === "string" ? body.country_code.trim().toLowerCase() : ""
  const rawImageUrls = Array.isArray(body?.image_urls) ? body.image_urls : null
  const imageUrls = rawImageUrls
    ? [...new Set(rawImageUrls.filter((url): url is string => typeof url === "string" && url.length <= 2048 && (/^https:\/\//i.test(url) || url.startsWith("/"))))].slice(0, 8)
    : []

  if (!productId || !/^[a-z]{2}$/.test(countryCode) || !rawImageUrls || imageUrls.length !== rawImageUrls.length) {
    return res.status(400).json({ error: "商品、国家或图片资料无效，请重新检查。" })
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const [{ data: stores }, { data: products }, { data: locations }, { data: regions }] = await Promise.all([
      query.graph({ entity: "store", fields: ["id", "metadata"] }),
      query.graph({ entity: "product", fields: ["id", "title", "handle", "status"], pagination: { take: 1000 } }),
      query.graph({ entity: "stock_location", fields: ["metadata", "fulfillment_sets.service_zones.geo_zones.country_code"], pagination: { take: 1000 } }),
      query.graph({ entity: "region", fields: ["currency_code", "countries.iso_2"], pagination: { take: 1000 } }),
    ])

    const store = stores[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
    const product = (products as Product[]).find((entry) => entry.id === productId && entry.status === "published")
    const markets: Market[] = (regions as any[]).flatMap((region) =>
      (region.countries ?? [])
        .map((country: any) => ({ country_code: country.iso_2?.toLowerCase() ?? "", currency_code: region.currency_code ?? "", region_id: region.id, region_name: region.name }))
        .filter((market) => VIBEYA_SITE_COUNTRIES.includes(market.country_code))
    )
    const productMarket = resolveProductMarkets(product ? [product] : [], locations as Location[], markets)[0]
    if (!store || !productMarket) return res.status(404).json({ error: "找不到已上架商品或店铺配置。" })
    if (!productMarket.markets.includes(countryCode)) return res.status(400).json({ error: "该商品目前不能配送到所选国家。请先配置仓库配送范围。" })
    if (productMarket.markets.length < 2) return res.status(400).json({ error: "只有配送到多个国家的商品需要设置国家版本图片。" })

    const savedMedia = store.metadata?.[MEDIA_METADATA_KEY]
    const localizedMedia = savedMedia && typeof savedMedia === "object" && !Array.isArray(savedMedia)
      ? savedMedia as Record<string, Record<string, string[]>>
      : {}
    const productMedia = { ...(localizedMedia[productId] ?? {}) }
    if (imageUrls.length) productMedia[countryCode] = imageUrls
    else delete productMedia[countryCode]
    if (Object.keys(productMedia).length) localizedMedia[productId] = productMedia
    else delete localizedMedia[productId]

    await updateStoresWorkflow(req.scope).run({
      input: {
        selector: { id: store.id },
        update: { metadata: { ...(store.metadata ?? {}), [MEDIA_METADATA_KEY]: localizedMedia } },
      },
    })

    return res.json({ product_id: productId, country_code: countryCode, image_urls: imageUrls })
  } catch (error) {
    console.error("Unable to save market-specific product images", error)
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    return res.status(500).json({ error: `保存商品图片失败：${message}` })
  }
}
