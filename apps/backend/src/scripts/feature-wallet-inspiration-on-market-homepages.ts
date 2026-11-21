import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  includeReleasedDefaultInspirations,
  normalizeVibeyaInspirations,
  VIBEYA_INSPIRATIONS_METADATA_KEY,
} from "../lib/vibeya-inspirations"

const inspirationId = "mushroom-night-garden-wallet"
const migrationKey = "vibeya_wallet_inspiration_home_featured_v1"

export default async function featureWalletInspirationOnMarketHomepages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "metadata"],
  })
  const store = (stores as any[])[0]

  if (!store) throw new Error("Store configuration was not found.")
  if (store.metadata?.[migrationKey] === true) {
    logger.info("Wallet inspiration homepage feature has already been applied.")
    return
  }

  const metadata = store.metadata ?? {}
  const inspirations = includeReleasedDefaultInspirations(
    metadata[VIBEYA_INSPIRATIONS_METADATA_KEY]
  )
  const walletInspiration = inspirations.find((entry) => entry.id === inspirationId)

  if (!walletInspiration?.published || !walletInspiration.cardImage) {
    throw new Error(`Published wallet inspiration is incomplete: ${inspirationId}`)
  }

  const nextInspirations = normalizeVibeyaInspirations(
    inspirations.map((entry) => entry.id === inspirationId
      ? { ...entry, homeFeatured: true }
      : entry)
  )

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        metadata: {
          ...metadata,
          [VIBEYA_INSPIRATIONS_METADATA_KEY]: nextInspirations,
          [migrationKey]: true,
        },
      },
    },
  })

  logger.info("Enabled the wallet inspiration as a homepage candidate for its configured markets.")
}
