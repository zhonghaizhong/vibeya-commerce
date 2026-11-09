import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function createProductionPublishableKey({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const salesChannel = salesChannels[0]
  if (!salesChannel) throw new Error("No sales channel exists; run the initial data seed first.")

  const { result: [publishableKey] } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{
        title: "VIBEYA Production Storefront",
        type: "publishable",
        created_by: "",
      }],
    },
  })
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableKey.id, add: [salesChannel.id] },
  })

  if (!publishableKey.token) throw new Error("Medusa did not return the publishable token.")
  logger.info(`PRODUCTION_PUBLISHABLE_KEY=${publishableKey.token}`)
}
