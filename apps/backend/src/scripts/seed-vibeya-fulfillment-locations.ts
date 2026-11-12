import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createLocationFulfillmentSetWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  updateStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"

const PRODUCT_IDS_METADATA_KEY = "vibeya_fulfillment_product_ids"
const FULFILLMENT_SET_ID_METADATA_KEY = "vibeya_fulfillment_set_id"
const PRODUCT_HANDLES = {
  tee: "vibeya-custom-cotton-long-sleeve-tee",
  hoodie: "vibeya-washed-vintage-hooded-sweatshirt",
  tumbler: "vibeya-custom-20oz-stainless-steel-tumbler",
  beanie: "vibeya-custom-knitted-beanie",
  blanket: "vibeya-custom-flannel-throw-blanket",
  bathMat: "vibeya-custom-3d-bath-mat",
} as const

const locations = [
  {
    name: "El Monte · Rowland Ave",
    address: { address_1: "4323 Rowland Ave", city: "El Monte", province: "CA", country_code: "US" },
    products: ["tee", "hoodie"],
  },
  {
    name: "Commerce · Vail Ave",
    address: { address_1: "2836 Vail Ave", city: "Commerce", province: "CA", country_code: "US" },
    products: ["tumbler"],
  },
  {
    name: "Ontario · INKFLOW PRO",
    address: { address_1: "1175 S Grove Ave #101", city: "Ontario", province: "CA", country_code: "US" },
    products: ["beanie"],
  },
  {
    name: "Montebello · Washington Blvd",
    address: { address_1: "841 E. Washington Blvd", city: "Montebello", province: "CA", country_code: "US" },
    products: ["blanket", "bathMat"],
  },
  {
    name: "Ridgewood · Metropolitan Ave",
    address: { address_1: "4929 Metropolitan Ave", city: "Ridgewood", province: "NY", country_code: "US" },
    products: ["blanket", "bathMat"],
  },
  {
    name: "Bay Shore · Cleveland Ave",
    address: { address_1: "70 Cleveland Ave", city: "Bay Shore", province: "NY", country_code: "US" },
    products: ["blanket"],
  },
] as const

export default async function seedVibeyaFulfillmentLocations({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const [{ data: products }, { data: stores }, { data: stockLocations }, { data: regions }, { data: shippingProfiles }, { data: shippingOptions }] = await Promise.all([
    query.graph({ entity: "product", fields: ["id", "handle"] }),
    query.graph({ entity: "store", fields: ["default_sales_channel_id"] }),
    query.graph({ entity: "stock_location", fields: ["id", "name", "address.address_1", "address.city", "address.province", "address.country_code", "metadata", "fulfillment_sets.id", "fulfillment_sets.name", "fulfillment_sets.service_zones.id", "fulfillment_sets.service_zones.geo_zones.country_code"] }),
    query.graph({ entity: "region", fields: ["id", "countries.iso_2"] }),
    query.graph({ entity: "shipping_profile", fields: ["id"] }),
    query.graph({ entity: "shipping_option", fields: ["id", "name", "service_zone_id"] }),
  ])

  const productIds = new Map(Object.entries(PRODUCT_HANDLES).map(([key, handle]) => {
    const product = products.find((item: any) => item.handle === handle)
    if (!product) throw new Error(`Required product is missing: ${handle}`)
    return [key, product.id]
  }))
  const usRegion = regions.find((region: any) => region.countries?.some((country: any) => country.iso_2?.toLowerCase() === "us"))
  if (!usRegion) throw new Error("Configure the U.S. region before seeding VIBEYA fulfillment locations.")
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) throw new Error("No shipping profile is configured in Medusa.")

  const salesChannelId = stores[0]?.default_sales_channel_id
  let added = 0
  let updated = 0

  for (const definition of locations) {
    const assignedProductIds = definition.products.map((key) => productIds.get(key)!)
    const current = stockLocations.find((location: any) =>
      location.address?.address_1?.trim().toLowerCase() === definition.address.address_1.toLowerCase() &&
      location.address?.city?.trim().toLowerCase() === definition.address.city.toLowerCase() &&
      location.address?.province?.trim().toLowerCase() === definition.address.province.toLowerCase()
    ) as any

    let locationId: string
    let fulfillmentSetId = current?.fulfillment_sets?.[0]?.id as string | undefined

    if (current) {
      await updateStockLocationsWorkflow(container).run({
        input: {
          selector: { id: current.id },
          update: {
            name: definition.name,
            metadata: { ...(current.metadata ?? {}), [PRODUCT_IDS_METADATA_KEY]: assignedProductIds },
          },
        },
      })
      updated += 1
      locationId = current.id
    } else {
      const { result } = await createStockLocationsWorkflow(container).run({
        input: {
          locations: [{
            name: definition.name,
            address: definition.address,
            metadata: { [PRODUCT_IDS_METADATA_KEY]: assignedProductIds },
          }],
        },
      })
      const location = result[0]
      locationId = location.id
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      })
    }

    if (!fulfillmentSetId) {
      await createLocationFulfillmentSetWorkflow(container).run({
        input: {
          location_id: locationId,
          fulfillment_set_data: { name: `${definition.name} Shipping`, type: "shipping" },
        },
      })
      const { data: linkedLocations } = await query.graph({
        entity: "stock_location",
        fields: ["fulfillment_sets.id"],
        filters: { id: locationId },
        pagination: { take: 1 },
      })
      fulfillmentSetId = linkedLocations[0]?.fulfillment_sets?.[0]?.id
      if (!fulfillmentSetId) throw new Error(`Could not create a fulfillment set for ${definition.name}.`)

    }

    const { data: fulfillmentSets } = await query.graph({
      entity: "fulfillment_set",
      fields: ["id", "service_zones.id"],
      filters: { id: fulfillmentSetId },
      pagination: { take: 1 },
    })
    let serviceZoneId = fulfillmentSets[0]?.service_zones?.[0]?.id
    if (!serviceZoneId) {
      const { result: serviceZones } = await createServiceZonesWorkflow(container).run({
        input: {
          data: [{
            name: `${definition.name} U.S. Shipping Zone`,
            fulfillment_set_id: fulfillmentSetId,
            geo_zones: [{ type: "country", country_code: "us" }],
          }],
        },
      })
      serviceZoneId = serviceZones[0]?.id
    }
    if (!serviceZoneId) throw new Error(`Could not create a U.S. service zone for ${definition.name}.`)

    const names = ["USPS", "GOFO Parcel"]
    const existingNames = new Set(shippingOptions.filter((option: any) => option.service_zone_id === serviceZoneId).map((option: any) => option.name))
    const optionsToCreate = names.filter((name) => !existingNames.has(name)).map((name) => ({
      name,
      price_type: "flat" as const,
      provider_id: "manual_manual",
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: name,
        description: "Free shipping in the United States",
        code: name === "USPS" ? "ydl-usps-ga" : "gofo-parcel-mix",
      },
      prices: [{ region_id: usRegion.id, amount: 0 }],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
        { attribute: "is_return", value: "false", operator: "eq" as const },
      ],
    }))
    if (optionsToCreate.length) await createShippingOptionsWorkflow(container).run({ input: optionsToCreate })

    await updateStockLocationsWorkflow(container).run({
      input: {
        selector: { id: locationId },
        update: {
          metadata: {
            ...(current?.metadata ?? {}),
            [PRODUCT_IDS_METADATA_KEY]: assignedProductIds,
            [FULFILLMENT_SET_ID_METADATA_KEY]: fulfillmentSetId,
          },
        },
      },
    })
    if (salesChannelId) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: locationId, add: [salesChannelId] },
      })
    }
    if (!current) added += 1
  }

  logger.info(`VIBEYA fulfillment locations are ready. Added ${added}; updated ${updated}.`)
}
