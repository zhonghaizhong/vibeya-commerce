import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

const MARKETS = [
  { countryCode: "us", name: "United States", currencyCode: "usd" },
  { countryCode: "ca", name: "Canada", currencyCode: "cad" },
  { countryCode: "jp", name: "Japan", currencyCode: "jpy" },
  { countryCode: "mx", name: "Mexico", currencyCode: "mxn" },
] as const

export default async function configureVibeyaMarkets({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const [{ data: regions }, { data: taxRegions }] = await Promise.all([
    query.graph({
      entity: "region",
      fields: ["id", "name", "currency_code", "countries.iso_2", "payment_providers"],
    }),
    query.graph({ entity: "tax_region", fields: ["id", "country_code"] }),
  ])

  const usRegion = (regions as any[]).find((region) =>
    region.countries?.some((country: any) => country.iso_2?.toLowerCase() === "us")
  )
  const paymentProviders = (usRegion?.payment_providers ?? [])
    .map((provider: any) => provider?.id)
    .filter((id: unknown): id is string =>
      typeof id === "string" && id !== "pp_paypal-invoice_paypal-invoice"
    )

  if (!paymentProviders.includes("pp_paypal_paypal")) {
    throw new Error("The US region does not have the PayPal payment provider configured.")
  }

  const missingMarkets = MARKETS.filter(({ countryCode }) =>
    !(regions as any[]).some((region) =>
      region.countries?.some((country: any) => country.iso_2?.toLowerCase() === countryCode)
    )
  )

  if (missingMarkets.length) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: missingMarkets.map(({ countryCode, name, currencyCode }) => ({
          name,
          currency_code: currencyCode,
          countries: [countryCode],
          payment_providers: paymentProviders,
          metadata: { vibeya_market_status: "setup_required" },
        })),
      },
    })
  }

  const regionalMarkets = MARKETS.filter(({ countryCode }) => countryCode !== "us")
  const regionalProviderUpdates = regionalMarkets.flatMap(({ countryCode }) => {
    const region = (regions as any[]).find((item) =>
      item.countries?.some((country: any) => country.iso_2?.toLowerCase() === countryCode)
    )
    if (!region) return []

    const currentProviderIds = (region.payment_providers ?? [])
      .map((provider: any) => provider?.id)
      .filter((id: unknown): id is string => typeof id === "string")
    const nextProviderIds = [...new Set([...currentProviderIds, ...paymentProviders])]
    if (nextProviderIds.length === currentProviderIds.length &&
      nextProviderIds.every((id) => currentProviderIds.includes(id))) return []

    return [{ id: region.id, payment_providers: nextProviderIds }]
  })

  if (regionalProviderUpdates.length) {
    for (const { id, payment_providers: providerIds } of regionalProviderUpdates) {
      await updateRegionsWorkflow(container).run({
        input: {
          selector: { id },
          update: { payment_providers: providerIds },
        },
      })
    }
  }

  const missingTaxRegions = MARKETS
    .filter(({ countryCode }) =>
      !(taxRegions as any[]).some((taxRegion) => taxRegion.country_code?.toLowerCase() === countryCode)
    )
    .map(({ countryCode }) => ({ country_code: countryCode, provider_id: "tp_system" }))

  if (missingTaxRegions.length) {
    await createTaxRegionsWorkflow(container).run({ input: missingTaxRegions })
  }

  const { data: configuredRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "payment_providers"],
  })
  const summary = MARKETS.map(({ countryCode, currencyCode }) => {
    const region = (configuredRegions as any[]).find((item) =>
      item.countries?.some((country: any) => country.iso_2?.toLowerCase() === countryCode)
    )
    if (!region) throw new Error(`The ${countryCode.toUpperCase()} sales region could not be verified.`)
    if (region.currency_code?.toLowerCase() !== currencyCode) {
      throw new Error(`${countryCode.toUpperCase()} uses ${region.currency_code}, expected ${currencyCode}.`)
    }
    const providerIds = (region.payment_providers ?? [])
      .map((provider: any) => provider?.id)
      .filter((id: unknown): id is string => typeof id === "string")
    if (countryCode !== "us" && !providerIds.includes("pp_paypal_paypal")) {
      throw new Error(`${countryCode.toUpperCase()} payment providers could not be verified.`)
    }
    return `${countryCode.toUpperCase()} (${currencyCode.toUpperCase()}): ${providerIds.join(", ") || "no payment providers"}`
  })

  logger.info(`VIBEYA market shells configured: ${summary.join(", ")}. Product availability remains controlled by warehouse delivery zones.`)
}
