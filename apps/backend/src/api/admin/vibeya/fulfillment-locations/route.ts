import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  updateStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"
import createVibeyaFulfillmentLocationWorkflow from "../../../../workflows/create-vibeya-fulfillment-location"

const PRODUCT_IDS_METADATA_KEY = "vibeya_fulfillment_product_ids"

type LocationInput = {
  id?: unknown
  name?: unknown
  address_1?: unknown
  address_2?: unknown
  city?: unknown
  province?: unknown
  postal_code?: unknown
  country_code?: unknown
  product_ids?: unknown
}

const text = (value: unknown, max = 255) => typeof value === "string" ? value.trim().slice(0, max) : ""

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  try {
    const [{ data: locations }, { data: products }] = await Promise.all([
      query.graph({
        entity: "stock_location",
        fields: ["id", "name", "address.id", "address.address_1", "address.address_2", "address.city", "address.province", "address.postal_code", "address.country_code", "metadata"],
        pagination: { take: 1000, order: { created_at: "ASC" } },
      }),
      query.graph({
        entity: "product",
        fields: ["id", "title", "handle", "status"],
        pagination: { take: 1000, order: { title: "ASC" } },
      }),
    ])

    return res.json({
      locations: locations.map((location: any) => ({
        ...location,
        product_ids: Array.isArray(location.metadata?.[PRODUCT_IDS_METADATA_KEY])
          ? location.metadata[PRODUCT_IDS_METADATA_KEY]
          : [],
      })),
      products,
    })
  } catch (error) {
    console.error("Unable to load fulfillment locations", error)
    return res.status(500).json({ error: "发货地址暂时无法读取，请稍后重试。" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as LocationInput
  const id = text(body.id, 100)
  const name = text(body.name, 120)
  const address = {
    address_1: text(body.address_1, 255),
    address_2: text(body.address_2, 255),
    city: text(body.city, 120),
    province: text(body.province, 120),
    postal_code: text(body.postal_code, 32),
    country_code: text(body.country_code, 2).toUpperCase(),
  }
  const productIds = Array.isArray(body.product_ids)
    ? [...new Set(body.product_ids.filter((value): value is string => typeof value === "string" && value.length <= 100))]
    : []

  if (!name || !address.address_1 || !address.city || !address.country_code || !Array.isArray(body.product_ids)) {
    return res.status(400).json({ error: "请填写仓库名称、街道、城市、国家/地区，并选择关联商品。" })
  }
  if (address.country_code.length !== 2 || productIds.length > 100) {
    return res.status(400).json({ error: "国家/地区代码或关联商品数量不正确。" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  try {
    if (id) {
      const { data: currentLocations } = await query.graph({
        entity: "stock_location",
        fields: ["id", "metadata"],
        filters: { id },
        pagination: { take: 1 },
      })
      const current = currentLocations[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
      if (!current) return res.status(404).json({ error: "找不到要修改的发货地址。" })

      const { result } = await updateStockLocationsWorkflow(req.scope).run({
        input: {
          selector: { id },
          update: {
            name,
            address,
            metadata: { ...(current.metadata ?? {}), [PRODUCT_IDS_METADATA_KEY]: productIds },
          },
        },
      })
      return res.json({ location: result[0] })
    }

    const [{ data: regions }, { data: stores }, { data: shippingProfiles }] = await Promise.all([
      query.graph({
        entity: "region",
        fields: ["id", "countries.iso_2"],
        pagination: { take: 1000 },
      }),
      query.graph({ entity: "store", fields: ["default_sales_channel_id"] }),
      query.graph({ entity: "shipping_profile", fields: ["id"] }),
    ])
    const region = regions.find((candidate: any) =>
      candidate.countries?.some((country: any) => country.iso_2?.toLowerCase() === address.country_code.toLowerCase())
    )
    const shippingProfile = shippingProfiles[0]
    if (!region || !shippingProfile) {
      return res.status(400).json({ error: `请先在 Medusa 配置 ${address.country_code} 对应的销售区域和配送资料。` })
    }

    const { result: location } = await createVibeyaFulfillmentLocationWorkflow(req.scope).run({
      input: {
        name,
        address,
        metadata: { [PRODUCT_IDS_METADATA_KEY]: productIds },
        regionId: region.id,
        shippingProfileId: shippingProfile.id,
        salesChannelId: typeof stores[0]?.default_sales_channel_id === "string"
          ? stores[0].default_sales_channel_id
          : undefined,
      },
    })

    return res.status(201).json({ location })
  } catch (error) {
    console.error("Unable to save fulfillment location", error)
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    return res.status(500).json({ error: `保存发货地址失败：${message}` })
  }
}
