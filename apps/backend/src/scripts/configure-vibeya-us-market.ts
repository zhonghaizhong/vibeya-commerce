import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

const PRODUCT_HANDLES = [
  "vibeya-custom-cotton-long-sleeve-tee",
  "vibeya-washed-vintage-hooded-sweatshirt",
  "vibeya-custom-20oz-stainless-steel-tumbler",
]

const US_STORE_POLICIES = {
  return_window_days: 0,
  free_returns: false,
  shipping_rate: 0,
  handling_days_min: 0,
  handling_days_max: 1,
  transit_days_min: 2,
  transit_days_max: 3,
}

export default async function configureVibeyaUsMarket({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricing = container.resolve(ModuleRegistrationName.PRICING)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "metadata", "payment_providers"],
  })
  let usRegion: any = regions.find((region: any) =>
    region.countries?.some((country: any) => country.iso_2?.toLowerCase() === "us")
  )

  if (!usRegion) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [{
          name: "United States",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_paypal_paypal"],
          metadata: US_STORE_POLICIES,
        }],
      },
    })
    usRegion = result[0]
  } else if (usRegion.currency_code !== "usd") {
    throw new Error("The existing US region is not using USD; resolve that in Admin before continuing.")
  }

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: usRegion.id },
      update: {
        metadata: { ...(usRegion.metadata ?? {}), ...US_STORE_POLICIES },
        payment_providers: [
          ...new Set([
            ...(usRegion.payment_providers ?? [])
              .map((provider: any) => provider?.id)
              .filter((providerId: unknown): providerId is string => typeof providerId === "string"),
            "pp_paypal_paypal",
          ]),
        ],
      },
    },
  })

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  })
  if (!taxRegions.some((taxRegion: any) => taxRegion.country_code?.toLowerCase() === "us")) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "us", provider_id: "tp_system" }],
    })
  }

  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.id", "service_zones.name", "service_zones.geo_zones.country_code"],
  })
  const fulfillmentSet = fulfillmentSets.find((set: any) =>
    set.service_zones?.some((zone: any) => zone.geo_zones?.some((geo: any) => geo.country_code?.toLowerCase() === "us"))
  ) ?? fulfillmentSets[0]
  if (!fulfillmentSet) throw new Error("No fulfillment set is configured in Medusa.")

  let usZone: any = fulfillmentSet.service_zones?.find((zone: any) =>
    zone.geo_zones?.some((geo: any) => geo.country_code?.toLowerCase() === "us")
  )
  if (!usZone) {
    const { result } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [{ name: "United States", fulfillment_set_id: fulfillmentSet.id, geo_zones: [{ type: "country", country_code: "us" }] }],
      },
    })
    usZone = result[0]
  }

  const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) throw new Error("No shipping profile is configured in Medusa.")

  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  })
  const carrierOptions = [
    { name: "USPS", code: "ydl-usps-ga", aliases: ["YDL-USPS-GA"] },
    { name: "GOFO Parcel", code: "gofo-parcel-mix", aliases: ["GOFO Parcel-MIX"] },
  ]
  const optionsToCreate = carrierOptions
    .filter(({ name, aliases }) => !shippingOptions.some((option: any) => [name, ...aliases].includes(option.name) && option.service_zone_id === usZone.id))
    .map(({ name, code }) => ({
      name,
      price_type: "flat" as const,
      provider_id: "manual_manual",
      service_zone_id: usZone.id,
      shipping_profile_id: shippingProfile.id,
      type: { label: name, description: "Free shipping in the United States", code },
      prices: [{ region_id: usRegion.id, amount: 0 }],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
        { attribute: "is_return", value: "false", operator: "eq" as const },
      ],
    }))
  if (optionsToCreate.length) {
    await createShippingOptionsWorkflow(container).run({ input: optionsToCreate })
  }

  const priceRuleIds: string[] = []
  for (const handle of PRODUCT_HANDLES) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "variants.id", "variants.price_set.id", "variants.price_set.prices.id", "variants.price_set.prices.currency_code", "variants.price_set.prices.rules.attribute", "variants.price_set.prices.rules.value"],
      filters: { handle },
    })
    const product = products[0]
    if (!product) {
      if (handle === PRODUCT_HANDLES[0]) throw new Error(`Product ${handle} was not found.`)
      logger.info(`Product ${handle} is not in the catalog yet; skipping its U.S. price rules.`)
      continue
    }

    const usdPrices = (product.variants ?? [])
      .flatMap((variant: any) => variant.price_set?.prices ?? [])
      .filter((price: any) => price.currency_code === "usd")
    const existingUsPriceRules = await pricing.listPriceRules({
      price_id: usdPrices.map((price: any) => price.id),
      attribute: "region_id",
      value: usRegion.id,
      operator: "eq",
    })
    const rulesOnUsPrices = new Set(existingUsPriceRules.map((rule: any) => rule.price_id))
  const rulesToCreate: Array<{ price_id: string; attribute: string; value: string }> = []
    for (const price of usdPrices) {
      if (!rulesOnUsPrices.has(price.id)) {
        rulesToCreate.push({ price_id: price.id, attribute: "region_id", value: usRegion.id })
      }
    }
    if (rulesToCreate.length) await pricing.createPriceRules(rulesToCreate)
    priceRuleIds.push(...rulesToCreate.map((rule) => rule.price_id))
  }

  logger.info(`Configured the U.S. market, created ${optionsToCreate.length} free U.S. shipping options, and restricted ${priceRuleIds.length} VIBEYA prices to the U.S. region.`)
}
