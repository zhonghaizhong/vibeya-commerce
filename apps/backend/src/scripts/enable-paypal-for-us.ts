import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"
import { readVibeyaIntegrationsConfig, VIBEYA_INTEGRATIONS_METADATA_KEY } from "../lib/vibeya-integrations"

export default async function enablePayPalForUs({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data: stores } = await query.graph({ entity: "store", fields: ["metadata"] })
  const rawConfig = stores[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY]
  const paypal = readVibeyaIntegrationsConfig(rawConfig).paypal
  const hasSavedConfig = Boolean(rawConfig && typeof rawConfig === "object")
  const isConfigured = hasSavedConfig
    ? paypal.enabled && Boolean(paypal.clientId && paypal.encryptedSecret)
    : Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "payment_providers"],
  })
  const usRegion = regions.find((region: any) =>
    region.currency_code === "usd" &&
    region.countries?.some((country: any) => country.iso_2?.toLowerCase() === "us")
  )

  if (!usRegion) throw new Error("The US USD region was not found.")

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: usRegion.id },
      update: {
        payment_providers: [
          ...new Set([
            ...(usRegion.payment_providers ?? [])
              .map((provider: any) => provider?.id)
              .filter((providerId: unknown): providerId is string =>
                typeof providerId === "string" && providerId !== "pp_paypal-invoice_paypal-invoice"
              ),
            "pp_paypal_paypal",
          ]),
        ],
      },
    },
  })
  logger.info(`PayPal is enabled for the US region. Merchant credentials configured: ${isConfigured}.`)
}
