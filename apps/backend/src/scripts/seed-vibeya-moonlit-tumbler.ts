import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const PRODUCT_HANDLE = "vibeya-custom-20oz-stainless-steel-tumbler"
const PRICE_USD = 19.99

export default async function seedVibeyaMoonlitTumbler({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
    filters: { handle: PRODUCT_HANDLE },
  })
  if (existing.length) {
    logger.info(`Product ${PRODUCT_HANDLE} already exists; skipping creation.`)
    return
  }

  const [{ data: salesChannels }, { data: shippingProfiles }] = await Promise.all([
    query.graph({ entity: "sales_channel", fields: ["id"] }),
    query.graph({ entity: "shipping_profile", fields: ["id"] }),
  ])
  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  if (!salesChannel || !shippingProfile) {
    throw new Error("Run the initial Medusa seed before creating the VIBEYA tumbler.")
  }

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [{
        title: "VIBEYA Custom 20 oz Stainless Steel Tumbler",
        handle: PRODUCT_HANDLE,
        subtitle: "Custom full-wrap artwork · 20 oz · 304 stainless steel",
        description:
          "Custom 20 oz stainless steel tumbler with a made-to-order full-wrap print. Customers can describe a design or upload their own print artwork; gallery images show a sample Moonlit Cats design only. Includes a clear sliding lid and a separate clear straw. Supplier specifications: 304 stainless steel body; body height 21 cm / 8.3 in; straw length 23 cm / 9.1 in; top diameter 7.8 cm / 3.1 in; base diameter 7.2 cm / 2.8 in. Available for U.S. shipping.",
        status: ProductStatus.DRAFT,
        shipping_profile_id: shippingProfile.id,
        sales_channels: [{ id: salesChannel.id }],
        options: [
          { title: "Color", values: ["White"] },
          { title: "Size", values: ["20 oz"] },
        ],
        variants: [{
          title: "White / 20 oz",
          sku: "VIBEYA-TUMBLER-WHITE-20OZ",
          manage_inventory: false,
          options: { Color: "White", Size: "20 oz" },
          prices: [{ amount: PRICE_USD, currency_code: "usd" }],
        }],
      }],
    },
  })

  logger.info(`Created ${result[0].title} at $${PRICE_USD.toFixed(2)} USD as a draft.`)
}
