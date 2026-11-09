import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

export default async function enablePayPalForUs({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
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
      update: { payment_providers: ["pp_paypal_paypal"] },
    },
  })
  logger.info("PayPal is now the enabled payment method for the US region.")
}
