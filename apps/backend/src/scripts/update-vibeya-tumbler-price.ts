import { batchProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const PRODUCT_HANDLE = "vibeya-custom-20oz-stainless-steel-tumbler"
const PRICE_USD = 19.99

export default async function updateVibeyaTumblerPrice({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "variants.id",
      "variants.prices.id",
      "variants.prices.currency_code",
      "variants.prices.amount",
    ],
    filters: { handle: PRODUCT_HANDLE },
  })
  const product = products[0]
  if (!product) {
    logger.info(`No product found for ${PRODUCT_HANDLE}; no price was changed.`)
    return
  }

  const updates = (product.variants ?? []).map((variant: any) => {
    const prices = variant.prices ?? []
    if (!prices.some((price: any) => price.currency_code?.toLowerCase() === "usd")) {
      throw new Error(`Variant ${variant.id} has no USD base price.`)
    }
    return {
      id: variant.id,
      prices: prices.map((price: any) => ({
        id: price.id,
        amount: price.currency_code?.toLowerCase() === "usd" ? PRICE_USD : price.amount,
      })),
    }
  })

  if (!updates.length) {
    logger.info(`Product ${PRODUCT_HANDLE} has no variants; no price was changed.`)
    return
  }

  await batchProductVariantsWorkflow(container).run({ input: { update: updates } })
  logger.info(`Updated ${product.title} USD variant price to $${PRICE_USD.toFixed(2)}.`)
}
