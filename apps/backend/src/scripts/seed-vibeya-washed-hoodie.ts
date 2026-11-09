import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const PRODUCT_HANDLE = "vibeya-washed-vintage-hooded-sweatshirt"
const SIZES = ["S", "M", "L", "XL", "2XL"]
const COLORS = ["Black", "Gray", "Khaki", "Green", "Pink", "Purple"]
const PRICE_USD = 29.99

export default async function seedVibeyaWashedHoodie({ container }: ExecArgs) {
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
    throw new Error("Run the initial Medusa seed before creating the VIBEYA hoodie.")
  }

  const variants = SIZES.flatMap((size) =>
    COLORS.map((color) => ({
      title: `${color} / ${size}`,
      sku: `VIBEYA-HOODIE-${color.toUpperCase()}-${size}`,
      manage_inventory: false,
      options: { Color: color, Size: size },
      prices: [{ amount: PRICE_USD, currency_code: "usd" }],
    }))
  )

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "VIBEYA Washed Vintage Hooded Sweatshirt",
          handle: PRODUCT_HANDLE,
          subtitle: "400g washed cotton blend · six colors · sizes S–2XL",
          description:
            "A 400g washed vintage hooded sweatshirt made from 60% cotton and 40% polyester, with original double-sided white-ink heat-transfer artwork. Ships from the United States and is available for delivery within the United States only. Free U.S. shipping. Custom-made products are final sale and cannot be returned.\n\nSize guide (garment measurements; manual measurement may vary by 1–2 cm):\nS — Length 70 cm / 27.5 in; Bust 120 cm / 47 in; Shoulder 56.5 cm / 22 in; Sleeve 56 cm / 22 in.\nM — Length 72 cm / 28 in; Bust 124 cm / 49 in; Shoulder 58 cm / 23 in; Sleeve 57.5 cm / 22.5 in.\nL — Length 74 cm / 29 in; Bust 128 cm / 50 in; Shoulder 59.5 cm / 23.5 in; Sleeve 59 cm / 23 in.\nXL — Length 76 cm / 30 in; Bust 132 cm / 52 in; Shoulder 61 cm / 24 in; Sleeve 60.5 cm / 24 in.\n2XL — Length 78 cm / 30.5 in; Bust 136 cm / 53 in; Shoulder 62.5 cm / 24.5 in; Sleeve 62 cm / 24.5 in.",
          status: ProductStatus.DRAFT,
          shipping_profile_id: shippingProfile.id,
          sales_channels: [{ id: salesChannel.id }],
          options: [
            { title: "Color", values: COLORS },
            { title: "Size", values: SIZES },
          ],
          variants,
        },
      ],
    },
  })

  logger.info(
    `Created ${result[0].title} with ${variants.length} variants at $${PRICE_USD.toFixed(2)} USD. It remains a draft until the U.S. market is configured.`
  )
}
