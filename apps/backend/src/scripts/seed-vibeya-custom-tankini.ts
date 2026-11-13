import { createProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const handle = "vibeya-custom-womens-tankini-swimsuit-set"
const title = "VIBEYA Custom Women's Tankini Swimsuit Set"
const colors = ["Black", "Red", "Pink", "Blue", "Cyan"]
const sizes = ["S", "M", "L", "XL"]
const galleryFiles = [
  "01-main-image.jpg",
  "02-prompt-preview.jpg",
  "03-fabric-fit.jpg",
  "04-two-piece.jpg",
  "05-sizes.jpg",
  "06-care.jpg",
  "07-customize.jpg",
]
const colorFolders: Record<string, string> = {
  Black: "black",
  Red: "red",
  Pink: "pink",
  Blue: "blue",
  Cyan: "cyan",
}

export default async function seedVibeyaCustomTankini({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: salesChannels }, { data: shippingProfiles }, { data: existingProducts }, { data: categories }] =
    await Promise.all([
      query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
      query.graph({ entity: "shipping_profile", fields: ["id"] }),
      query.graph({ entity: "product", fields: ["id", "handle"], filters: { handle } }),
      query.graph({ entity: "product_category", fields: ["id", "name"] }),
    ])

  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  if (!salesChannel || !shippingProfile) {
    throw new Error("Run the initial Medusa seed before creating the VIBEYA tankini.")
  }

  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  const imageBase = `${storefrontUrl}/vibeya/assets/products/mg8011024`
  const images = galleryFiles.map((file) => ({ url: `${imageBase}/black/${file}` }))
  const apparelCategory = categories.find((category: any) => category.name === "Apparel")
  const variants = colors.flatMap((color) => sizes.map((size) => ({
    title: `${color} / ${size}`,
    sku: `VIBEYA-TANKINI-${color.toUpperCase()}-${size}`,
    manage_inventory: false,
    options: { Color: color, Size: size },
    prices: [{ amount: 29.99, currency_code: "usd" }],
  })))
  const description =
    "Design your own women's tankini swimsuit set with a prompt or uploaded artwork, then preview the custom print before ordering. This two-piece set includes a halter-neck swim top and separate side-tie shorts; the custom print is applied to the front panel of the top while the shorts remain in the selected solid color. Made from 80% nylon and 20% spandex. Available in Black, Red, Pink, Blue, and Cyan, sizes S–XL. Gallery prints are samples. Search for custom swimsuit, custom swimwear, design your own swimsuit, personalized swimsuit, and women's tankini swimsuit."
  const subtitle = "Custom-print women's two-piece tankini · halter top and separate side-tie shorts · sizes S–XL"

  if (existingProducts.length) {
    await updateProductsWorkflow(container).run({
      input: {
        products: [{
          id: existingProducts[0].id,
          title,
          subtitle,
          description,
          thumbnail: images[0].url,
          images,
          status: ProductStatus.PUBLISHED,
        }],
      },
    })
    logger.info(`Updated the VIBEYA tankini listing and gallery. Existing variants were retained.`)
    return
  }

  await createProductsWorkflow(container).run({
    input: {
      products: [{
        title,
        handle,
        subtitle,
        description,
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfile.id,
        ...(apparelCategory ? { category_ids: [apparelCategory.id] } : {}),
        sales_channels: [{ id: salesChannel.id }],
        thumbnail: images[0].url,
        images,
        options: [
          { title: "Color", values: colors },
          { title: "Size", values: sizes },
        ],
        variants,
      }],
    },
  })
  logger.info(`Created and published ${title} with ${variants.length} color and size variants.`)
}
