import { batchProductVariantsWorkflow, createProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const products = [
  {
    title: "VIBEYA Custom 3D Optical Illusion Bath Mat",
    handle: "vibeya-custom-3d-bath-mat",
    subtitle: "Custom full-surface print · non-slip bath mat · 3 sizes",
    description:
      "Add a playful 3D optical-illusion print to your bathroom. The custom artwork covers the full surface and edges. Features thickened construction, short pile, neat edging, and a non-slip design. Available in three sizes.",
    assetFolder: "sds-138708",
    sizes: ["40x60cm", "50x80cm", "60x90cm"],
    prices: [19.99, 21.99, 23.99],
    skuPrefix: "VIBEYA-BATHMAT",
    galleryFiles: ["01-main-image.png", "02-core-reason.png", "03-need-solution.png", "04-product-structure.png", "05-detail-evidence.png", "06-usage-scene.png", "07-choice-reasons.png", "08-size-guide.png"],
  },
  {
    title: "VIBEYA Custom Flannel Throw Blanket",
    handle: "vibeya-custom-flannel-throw-blanket",
    subtitle: "Custom full-surface print · soft flannel · 4 sizes",
    description:
      "Make a cozy throw your own with a custom full-surface print. The printed front reaches the edges, while the reverse is soft white flannel. Available in four sizes.",
    assetFolder: "sds-97226",
    sizes: ["30x40", "40x50", "50x60", "60x80"],
    prices: [14.99, 16.99, 18.99, 20.99],
    skuPrefix: "VIBEYA-BLANKET",
    galleryFiles: ["01-main-image.png", "02-core-reason.png", "03-need-solution.png", "04-product-structure.png", "05-detail-evidence.png", "06-usage-scene.png", "07-choice-reasons.png", "08-size-guide.png"],
  },
  {
    title: "VIBEYA Custom Shower Curtain",
    handle: "vibeya-custom-shower-curtain",
    subtitle: "Custom single-sided print · polyester shower curtain · 4 sizes",
    description:
      "A custom polyester shower curtain with single-sided heat-transfer printing. Create a design or upload your own artwork for a full-panel print. Includes C-hooks: 12 for lengths up to 70.8 in and 24 for the 84 in length. Available in four sizes and ships from U.S. fulfillment locations.",
    assetFolder: "mg8014087",
    sizes: ["36x70.8in", "60x70.8in", "70.8x70.8in", "70.8x84in"],
    prices: [17.99, 19.99, 21.99, 23.99],
    skuPrefix: "VIBEYA-SHOWER-CURTAIN",
    galleryFiles: ["01-main-image.png", "02-print-detail.png", "03-size-guide.png", "04-design-your-own.png", "05-lifestyle-model.png", "06-product-details.png"],
  },
] as const

export default async function seedVibeyaHomeProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: salesChannels }, { data: shippingProfiles }, { data: categories }] =
    await Promise.all([
      query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
      query.graph({ entity: "shipping_profile", fields: ["id"] }),
      query.graph({ entity: "product_category", fields: ["id", "name"] }),
    ])

  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  if (!salesChannel || !shippingProfile) {
    throw new Error("Run the initial Medusa seed before creating VIBEYA home products.")
  }
  const homeCategory = categories.find((category: any) => category.name === "Home & Bath")
  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")

  for (const product of products) {
    const { data: existing } = await query.graph({
      entity: "product",
      fields: ["id", "title", "variants.id", "variants.title", "variants.prices.id", "variants.prices.currency_code", "variants.prices.amount", "variants.options.option.title", "variants.options.value"],
      filters: { handle: product.handle },
    })
    const variants = product.sizes.map((size, index) => ({
      title: `White / ${size}`,
      sku: `${product.skuPrefix}-${size.replace(/[^a-z0-9]/gi, "").toUpperCase()}`,
      manage_inventory: false,
      options: { Size: size, Color: "White" },
      prices: [{ amount: product.prices[index], currency_code: "usd" }],
    }))
    const assetBase = `/vibeya/assets/products/${product.assetFolder}`
    const gallery = product.galleryFiles.map((file) => ({ url: `${storefrontUrl}${assetBase}/${file}` }))

    if (existing.length) {
      const isShowerCurtain = product.handle === "vibeya-custom-shower-curtain"
      await updateProductsWorkflow(container).run({
        input: {
          products: [{
            id: existing[0].id,
            thumbnail: gallery[0].url,
            images: gallery,
            ...(isShowerCurtain ? {
              title: product.title,
              subtitle: product.subtitle,
              description: product.description,
              status: ProductStatus.PUBLISHED,
            } : {}),
          }],
        },
      })
      const existingProduct = existing[0] as any
      if (isShowerCurtain) {
        const updates = (existingProduct.variants ?? []).flatMap((variant: any) => {
          const size = variant.options?.find((option: any) => option.option?.title?.toLowerCase() === "size")?.value
          const price = product.sizes.indexOf(size)
          if (price < 0) return []
          const currentPrices = variant.prices ?? []
          if (!currentPrices.some((item: any) => item.currency_code?.toLowerCase() === "usd")) return []
          return [{
            id: variant.id,
            prices: currentPrices.map((item: any) => ({
              id: item.id,
              amount: item.currency_code?.toLowerCase() === "usd" ? product.prices[price] : item.amount,
            })),
          }]
        })
        if (updates.length) await batchProductVariantsWorkflow(container).run({ input: { update: updates } })
      }
      logger.info(`Synchronized product details, gallery, and any matching variant prices for ${product.title}.`)
      continue
    }

    await createProductsWorkflow(container).run({
      input: {
        products: [{
          title: product.title,
          handle: product.handle,
          subtitle: product.subtitle,
          description: product.description,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          ...(homeCategory ? { category_ids: [homeCategory.id] } : {}),
          sales_channels: [{ id: salesChannel.id }],
          thumbnail: gallery[0].url,
          images: gallery,
          options: [
            { title: "Size", values: [...product.sizes] },
            { title: "Color", values: ["White"] },
          ],
          variants,
        }],
      },
    })
    logger.info(`Created and published ${product.title} with ${variants.length} U.S. size variants.`)
  }
}
