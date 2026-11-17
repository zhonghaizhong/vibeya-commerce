import {
  batchProductVariantsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createProductsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  updateProductsWorkflow,
  updateStockLocationsWorkflow,
  updateStoresWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const handle = "vibeya-custom-womens-yoga-set"
const title = "VIBEYA Custom Women's Yoga Set"
const supplierId = "63823"
const sizes = ["XS", "S", "M", "L", "XL", "2XL"]
const currencies = [
  { code: "usd", amount: 19.99, country: "us" },
  { code: "cad", amount: 28.99, country: "ca" },
  { code: "jpy", amount: 3299, country: "jp" },
  { code: "mxn", amount: 372.99, country: "mx" },
] as const
const countries = currencies.map(({ country }) => country)
const galleryFiles = Array.from({ length: 6 }, (_, index) => `${String(index + 1).padStart(2, "0")}-carousel.webp`)
const marketMedia = Object.fromEntries(currencies.map(({ country }) => [
  country,
  galleryFiles.map((file) => `/vibeya/assets/products/sds-${supplierId}/${country}/${file}`),
]))
const variant = (size: string) => ({
  title: `White · Black Trim / ${size}`,
  sku: `VIBEYA-YOGA-SET-WHITE-${size}`,
  manage_inventory: false,
  options: { Color: "White", Size: size },
  prices: currencies.map(({ code, amount }) => ({ amount, currency_code: code })),
})
const optionValue = (candidate: any, title: string) => candidate.options?.find(
  (option: any) => option.option?.title?.toLowerCase() === title.toLowerCase()
)?.value

export default async function seedVibeyaCustomYogaSet({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const [
    { data: salesChannels },
    { data: shippingProfiles },
    { data: categories },
    { data: existingProducts },
    { data: regions },
    { data: stores },
    { data: stockLocations },
    { data: shippingOptions },
  ] = await Promise.all([
    query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
    query.graph({ entity: "shipping_profile", fields: ["id"] }),
    query.graph({ entity: "product_category", fields: ["id", "name"] }),
    query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { handle },
    }),
    query.graph({ entity: "region", fields: ["id", "currency_code", "countries.iso_2"] }),
    query.graph({ entity: "store", fields: ["id", "metadata", "default_sales_channel_id"] }),
    query.graph({
      entity: "stock_location",
      fields: ["id", "name", "metadata", "fulfillment_sets.id", "fulfillment_sets.service_zones.id"],
      pagination: { take: 1000 },
    }),
    query.graph({ entity: "shipping_option", fields: ["id", "name", "service_zone_id"] }),
  ])

  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  const store = stores[0]
  if (!salesChannel || !shippingProfile || !store) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Run the initial VIBEYA seed before creating this yoga set.")
  }

  const marketRegions = currencies.map(({ code, country }) => {
    const region = (regions as any[]).find((candidate) =>
      candidate.countries?.some((entry: any) => entry.iso_2?.toLowerCase() === country)
    )
    if (!region || region.currency_code?.toLowerCase() !== code) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Configure the ${country.toUpperCase()} ${code.toUpperCase()} region before seeding this product.`)
    }
    return region
  })

  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  const imageBase = `${storefrontUrl}/vibeya/assets/products/sds-${supplierId}`
  const images = countries.flatMap((country) => galleryFiles.map((file) => ({ url: `${imageBase}/${country}/${file}` })))
  const apparelCategory = (categories as any[]).find((category) => category.name === "Apparel")
  const productMetadata = {
    supplier_product_id: supplierId,
    supplier_product_code: "NZ2204078",
    customizable: true,
    customization_type: "text_prompt_or_upload",
    customization_requires_complete_set: true,
    print_areas: ["matching_crop_top", "matching_mid_thigh_shorts"],
    print_areas_are_customized_together: true,
    base_color: "White with black binding",
    free_shipping_countries: countries,
    vibeya_available_countries: countries,
  }
  const productData = {
    title,
    handle,
    subtitle: "Custom women's yoga outfit · matching crop top + shorts · prompt or upload · sizes XS–2XL",
    description: "Design one coordinated custom women's yoga set using a written prompt or your uploaded artwork. Preview the matching print across both the crop top and mid-thigh shorts before confirming the order. The two pieces are always customized and sold together; neither piece can be ordered separately. The white top has black binding around its neckline and armholes, and the matching shorts have a wide waistband. Made from 77% polyester and 23% spandex with removable bra pads. Available in sizes XS–2XL. Flat-lay supplier measurements may vary by 1–2 cm. Free shipping to the United States, Canada, Japan, and Mexico. The gallery designs are examples; your own prompt or uploaded artwork determines the final print.",
    status: ProductStatus.PUBLISHED,
    thumbnail: `${imageBase}/us/01-carousel.webp`,
    images,
    metadata: productMetadata,
  }

  let productId = (existingProducts as any[])[0]?.id as string | undefined
  if (!productId) {
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [{
          ...productData,
          shipping_profile_id: shippingProfile.id,
          ...(apparelCategory ? { category_ids: [apparelCategory.id] } : {}),
          sales_channels: [{ id: salesChannel.id }],
          options: [
            { title: "Color", values: ["White"] },
            { title: "Size", values: sizes },
          ],
          variants: sizes.map(variant),
        }],
      },
    })
    productId = (result as any[])[0]?.id
    if (!productId) throw new Error("The yoga set product was not returned after creation.")
  } else {
    await updateProductsWorkflow(container).run({
      input: { products: [{ id: productId, ...productData }] },
    })
    const { data: currentProducts } = await query.graph({
      entity: "product",
      fields: ["id", "variants.id", "variants.options.option.title", "variants.options.value", "variants.prices.id", "variants.prices.currency_code"],
      filters: { id: productId },
    })
    const currentVariants = (currentProducts[0] as any)?.variants ?? []
    const currentKeys = new Set(currentVariants.map((entry: any) => optionValue(entry, "Size")))
    const missingVariants = sizes.filter((size) => !currentKeys.has(size)).map(variant)
    if (missingVariants.length) {
      await updateProductsWorkflow(container).run({ input: { products: [{ id: productId, variants: missingVariants }] } })
    }
    const priceUpdates = currentVariants.map((entry: any) => {
      const size = optionValue(entry, "Size")
      const currentPrices = entry.prices ?? []
      const prices = currentPrices.map((price: any) => {
        const target = currencies.find((currency) => currency.code === price.currency_code?.toLowerCase())
        return target ? { id: price.id, amount: target.amount } : { id: price.id }
      })
      for (const currency of currencies) {
        if (!currentPrices.some((price: any) => price.currency_code?.toLowerCase() === currency.code)) {
          prices.push({ amount: currency.amount, currency_code: currency.code })
        }
      }
      return { id: entry.id, prices }
    })
    if (priceUpdates.length) await batchProductVariantsWorkflow(container).run({ input: { update: priceUpdates } })
  }

  const currentStoreMetadata = store.metadata ?? {}
  const existingMedia = currentStoreMetadata.vibeya_product_market_media
  const mediaMap = existingMedia && typeof existingMedia === "object" && !Array.isArray(existingMedia)
    ? existingMedia as Record<string, unknown>
    : {}
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        metadata: {
          ...currentStoreMetadata,
          vibeya_product_market_media: { ...mediaMap, [productId]: marketMedia },
        },
      },
    },
  })

  const locationName = "China · Yoga Set Dispatch (address pending)"
  let location = (stockLocations as any[]).find((entry) => entry.name === locationName)
  if (!location) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{
          name: locationName,
          address: { address_1: "Dispatch address pending confirmation", city: "Address pending", country_code: "CN" },
          metadata: {
            vibeya_fulfillment_product_ids: [productId],
            vibeya_origin_address_pending: true,
            vibeya_fulfillment_note: "Do not fulfill orders until the actual China dispatch address is confirmed.",
          },
        }],
      },
    })
    location = (result as any[])[0]
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
  }

  const assignedIds = Array.from(new Set([
    ...(Array.isArray(location.metadata?.vibeya_fulfillment_product_ids) ? location.metadata.vibeya_fulfillment_product_ids : []),
    productId,
  ]))
  const fulfillmentSetId = location.fulfillment_sets?.[0]?.id as string | undefined
  if (!fulfillmentSetId) {
    await createLocationFulfillmentSetWorkflow(container).run({
      input: { location_id: location.id, fulfillment_set_data: { name: `${locationName} Shipping`, type: "shipping" } },
    })
  }
  const { data: linkedLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "metadata", "fulfillment_sets.id", "fulfillment_sets.service_zones.id"],
    filters: { id: location.id },
    pagination: { take: 1 },
  })
  const refreshedLocation = linkedLocations[0] as any
  const refreshedFulfillmentSetId = refreshedLocation.fulfillment_sets?.[0]?.id
  if (!refreshedFulfillmentSetId) throw new Error("Could not create the China yoga-set fulfillment set.")
  let serviceZoneId = refreshedLocation.fulfillment_sets?.[0]?.service_zones?.[0]?.id
  if (!serviceZoneId) {
    const { result } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [{
          name: "Yoga Set · US / Canada / Japan / Mexico",
          fulfillment_set_id: refreshedFulfillmentSetId,
          geo_zones: countries.map((country) => ({ type: "country" as const, country_code: country })),
        }],
      },
    })
    serviceZoneId = (result as any[])[0]?.id
  }
  if (!serviceZoneId) throw new Error("Could not configure the yoga-set destination zone.")

  if (!(shippingOptions as any[]).some((option) => option.name === "Yoga Set · Free Shipping" && option.service_zone_id === serviceZoneId)) {
    await createShippingOptionsWorkflow(container).run({
      input: [{
        name: "Yoga Set · Free Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Free Shipping", description: "Free shipping to the United States, Canada, Japan, and Mexico", code: "vibeya-yoga-free" },
        prices: marketRegions.map((region) => ({ region_id: region.id, amount: 0 })),
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      }],
    })
  }
  await updateStockLocationsWorkflow(container).run({
    input: {
      selector: { id: location.id },
      update: {
        metadata: {
          ...(refreshedLocation.metadata ?? {}),
          vibeya_fulfillment_product_ids: assignedIds,
          vibeya_fulfillment_set_id: refreshedFulfillmentSetId,
          vibeya_origin_address_pending: true,
        },
      },
    },
  })
  const salesChannelId = store.default_sales_channel_id ?? salesChannel.id
  await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: location.id, add: [salesChannelId] } })

  logger.info(`Published ${title}; configured six sizes, four market prices, localized image galleries, and free shipping in the US, Canada, Japan, and Mexico. China dispatch address remains explicitly pending confirmation.`)
}
