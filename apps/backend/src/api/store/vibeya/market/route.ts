import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getVibeyaProductContent, VIBEYA_PRODUCT_CONTENT_METADATA_KEY } from "../../../../lib/vibeya-product-content"
import { getVibeyaCategoryContent, VIBEYA_CATEGORY_CONTENT_METADATA_KEY } from "../../../../lib/vibeya-category-content"
import { getPublicVibeyaProductDesigner, VIBEYA_PRODUCT_DESIGNER_METADATA_KEY } from "../../../../lib/vibeya-product-designer"

const PRODUCT_IDS_METADATA_KEY = "vibeya_fulfillment_product_ids"
const MEDIA_METADATA_KEY = "vibeya_product_market_media"
const SUPPORTED_MARKET_COUNTRIES = new Set(["us", "ca", "jp", "mx"])

/** Returns products assigned to a warehouse whose service zone covers the destination. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const countryCode = String(req.query.country_code ?? "").trim().toLowerCase()
  if (!/^[a-z]{2}$/.test(countryCode)) return res.status(400).json({ error: "A valid destination country is required." })
  if (!SUPPORTED_MARKET_COUNTRIES.has(countryCode)) return res.status(404).json({ error: "This destination is not available." })

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const [{ data: locations }, { data: products }, { data: regions }, { data: stores }] = await Promise.all([
      query.graph({
        entity: "stock_location",
        fields: ["metadata", "fulfillment_sets.service_zones.geo_zones.country_code"],
        pagination: { take: 1000 },
      }),
      query.graph({ entity: "product", fields: ["id", "handle", "status", "metadata", "categories.id", "categories.name", "categories.handle", "categories.description"], pagination: { take: 1000 } }),
      query.graph({ entity: "region", fields: ["id", "currency_code", "countries.iso_2"], pagination: { take: 1000 } }),
      query.graph({ entity: "store", fields: ["metadata"] }),
    ])

    const allowedIds = new Set<string>()
    const assignedIds = new Set<string>()
    for (const location of locations as any[]) {
      const assigned = location.metadata?.[PRODUCT_IDS_METADATA_KEY]
      if (Array.isArray(assigned)) assigned.forEach((id) => { if (typeof id === "string") assignedIds.add(id) })
      const countryMatches = (location.fulfillment_sets ?? []).some((set: any) =>
        (set.service_zones ?? []).some((zone: any) =>
          (zone.geo_zones ?? []).some((geo: any) => String(geo.country_code ?? "").toLowerCase() === countryCode)
        )
      )
      if (!countryMatches) continue
      if (Array.isArray(assigned)) assigned.forEach((id) => { if (typeof id === "string") allowedIds.add(id) })
    }

    const region = (regions as any[]).find((item) => item.countries?.some((country: any) => country.iso_2?.toLowerCase() === countryCode))
    const availableProducts = (products as any[]).filter((product) =>
      product.status === "published"
      // Legacy VIBEYA catalog items without an explicit warehouse mapping are U.S.-only.
      && (allowedIds.has(product.id) || (countryCode === "us" && !assignedIds.has(product.id)))
    )
    const categorySources = new Map<string, { handle: string; name: string; productHandles: string[] }>()
    for (const product of availableProducts) {
      for (const category of product.categories ?? []) {
        if (!category.handle) continue
        const current: { handle: string; name: string; productHandles: string[] } = categorySources.get(category.handle) ?? { handle: category.handle, name: category.name, productHandles: [] }
        if (product.handle && !current.productHandles.includes(product.handle)) current.productHandles.push(product.handle)
        categorySources.set(category.handle, current)
      }
    }
    return res.json({
      country_code: countryCode,
      region: region ? { id: region.id, currency_code: region.currency_code } : null,
      product_ids: availableProducts.map((product) => product.id),
      handles: availableProducts.map((product) => product.handle),
      product_content: Object.fromEntries(availableProducts.map((product) => [
        product.id,
        getVibeyaProductContent(product.handle, product.metadata?.[VIBEYA_PRODUCT_CONTENT_METADATA_KEY]),
      ])),
      product_designer: Object.fromEntries(availableProducts.map((product) => [
        product.id,
        getPublicVibeyaProductDesigner(product.metadata?.[VIBEYA_PRODUCT_DESIGNER_METADATA_KEY]),
      ])),
      localized_media: (stores[0] as any)?.metadata?.[MEDIA_METADATA_KEY] ?? {},
      category_content: getVibeyaCategoryContent(
        (stores[0] as any)?.metadata?.[VIBEYA_CATEGORY_CONTENT_METADATA_KEY],
        Array.from(categorySources.values())
      ),
    })
  } catch (error) {
    console.error("Unable to resolve VIBEYA market availability", error)
    return res.status(500).json({ error: "Could not load destination availability." })
  }
}
