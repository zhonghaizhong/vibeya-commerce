import { createProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const handle = "vibeya-custom-knitted-beanie"
const title = "VIBEYA Custom Knitted Beanie"
const galleryFiles = [
  "02-custom-print-model.png",
  "01-hero.png",
  "03-lifestyle-product.png",
  "04-front-back.png",
  "05-knit-print-detail.png",
  "06-model-lifestyle.png",
  "07-color-options.png",
  "08-size-specs.png",
]
const colors = ["Black", "Red", "Gray"]

export default async function seedVibeyaCustomBeanie({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: salesChannels }, { data: shippingProfiles }, { data: existingProducts }, { data: categories }] =
    await Promise.all([
      query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
      query.graph({ entity: "shipping_profile", fields: ["id"] }),
      query.graph({ entity: "product", fields: ["id", "title", "handle"], filters: { handle } }),
      query.graph({ entity: "product_category", fields: ["id", "name"] }),
    ])

  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  if (!salesChannel || !shippingProfile) {
    throw new Error("Run the initial Medusa seed before creating the VIBEYA beanie.")
  }

  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  const imageBase = `${storefrontUrl}/vibeya/assets/products/sds-172647/black`
  const images = galleryFiles.map((file, index) => ({ url: `${imageBase}/${file}${index < 2 ? "?rev=2" : ""}` }))
  const apparelCategory = categories.find((category: any) => category.name === "Apparel")
  const variants = colors.map((color) => ({
    title: `${color} / One Size`,
    sku: `VIBEYA-BEANIE-${color.toUpperCase()}`,
    manage_inventory: false,
    options: { Color: color, Size: "One Size" },
    prices: [{ amount: 14.99, currency_code: "usd" }],
  }))

  if (existingProducts.length) {
    await updateProductsWorkflow(container).run({
      input: {
        products: [{
          id: existingProducts[0].id,
          title,
          subtitle: "Custom folded-cuff print · 100% acrylic · 300g · one size",
          description: "A 300g, 100% acrylic knitted beanie with a custom print on the front folded cuff only. Customers can upload their own artwork or create a new design; gallery artwork is a sample. Available in Black, Red, and Gray, one size. Approximate dimensions: 8.3 in tall × 7.9 in wide with a 2.8 in folded cuff. Ships from a U.S. warehouse.",
          thumbnail: images[0].url,
          images,
        }],
      },
    })
    logger.info(`Updated storefront gallery for ${title}. Existing variants were retained.`)
    return
  }

  await createProductsWorkflow(container).run({
    input: {
      products: [{
        title,
        handle,
        subtitle: "Custom folded-cuff print · 100% acrylic · 300g · one size",
        description: "A 300g, 100% acrylic knitted beanie with a custom print on the front folded cuff only. Customers can upload their own artwork or create a new design; gallery artwork is a sample. Available in Black, Red, and Gray, one size. Approximate dimensions: 8.3 in tall × 7.9 in wide with a 2.8 in folded cuff. Ships from a U.S. warehouse.",
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfile.id,
        ...(apparelCategory ? { category_ids: [apparelCategory.id] } : {}),
        sales_channels: [{ id: salesChannel.id }],
        thumbnail: images[0].url,
        images,
        options: [
          { title: "Color", values: colors },
          { title: "Size", values: ["One Size"] },
        ],
        variants,
      }],
    },
  })
  logger.info(`Created and published ${title} with three color variants at $14.99 each.`)
}
