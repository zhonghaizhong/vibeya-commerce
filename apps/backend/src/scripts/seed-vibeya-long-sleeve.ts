import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const PRODUCT_HANDLE = "vibeya-custom-cotton-long-sleeve-tee"
const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"]
const COLORS = ["Black", "White", "Red", "Gray", "LightGray", "Cream", "Navy"]
const PRICE_USD = 19.99

export default async function seedVibeyaLongSleeve({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
    filters: { handle: PRODUCT_HANDLE },
  })

  if (existingProducts.length) {
    logger.info(`Product ${PRODUCT_HANDLE} already exists; skipping creation.`)
    return
  }

  const [{ data: salesChannels }, { data: shippingProfiles }, { data: categories }] =
    await Promise.all([
      query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
      query.graph({ entity: "shipping_profile", fields: ["id"] }),
      query.graph({
        entity: "product_category",
        fields: ["id", "name"],
        filters: { name: "Shirts" },
      }),
    ])

  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]

  if (!salesChannel || !shippingProfile) {
    throw new Error(
      "The initial Medusa seed must run before creating the VIBEYA product."
    )
  }

  const variants = SIZES.flatMap((size) =>
    COLORS.map((color) => ({
      title: `${size} / ${color}`,
      sku: `VIBEYA-LS-${size}-${color.toUpperCase()}`,
      manage_inventory: false,
      options: { Size: size, Color: color },
      prices: [{ amount: PRICE_USD, currency_code: "usd" }],
    }))
  )

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "VIBEYA Custom Cotton Long Sleeve Tee",
          handle: PRODUCT_HANDLE,
          subtitle: "Choose from seven colors and sizes XS–3XL.",
          description:
            "Custom cotton long sleeve tee with the VIBEYA Funny Skeleton design. Print placement is selected with the design.",
          status: ProductStatus.DRAFT,
          shipping_profile_id: shippingProfile.id,
          category_ids: categories.map((category) => category.id),
          sales_channels: [{ id: salesChannel.id }],
          options: [
            { title: "Size", values: SIZES },
            { title: "Color", values: COLORS },
          ],
          variants,
        },
      ],
    },
  })

  logger.info(
    `Created ${result[0].title} with ${variants.length} variants at $${PRICE_USD.toFixed(2)} USD. It remains a draft until sales regions are configured.`
  )
}
