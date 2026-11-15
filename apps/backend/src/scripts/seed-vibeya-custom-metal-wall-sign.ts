import {
  batchProductVariantsWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const handle = "vibeya-custom-metal-bottle-cap-wall-sign"
const title = "VIBEYA Custom Metal Bottle Cap Wall Sign"
const packOptions = [
  { size: "1 Piece", amount: 16.99, sku: "VIBEYA-METAL-PLAQUE-1PC" },
  { size: "2 Pieces", amount: 22.99, sku: "VIBEYA-METAL-PLAQUE-2PC" },
  { size: "3 Pieces", amount: 28.99, sku: "VIBEYA-METAL-PLAQUE-3PC" },
]
const galleryFiles = Array.from(
  { length: 6 },
  (_, index) => `${String(index + 1).padStart(2, "0")}-carousel.png`
)

const variants = packOptions.map(({ size, amount, sku }) => ({
  title: `Black / ${size}`,
  sku,
  manage_inventory: false,
  options: { Color: "Black", Size: size },
  prices: [{ amount, currency_code: "usd" }],
}))

const optionValue = (variant: any, title: string) =>
  variant.options?.find(
    (option: any) => option.option?.title?.toLowerCase() === title.toLowerCase()
  )?.value

export default async function seedVibeyaCustomMetalWallSign({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const [
    { data: salesChannels },
    { data: shippingProfiles },
    { data: categories },
    { data: existingProducts },
  ] = await Promise.all([
    query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
    query.graph({ entity: "shipping_profile", fields: ["id"] }),
    query.graph({ entity: "product_category", fields: ["id", "name"] }),
    query.graph({
      entity: "product",
      fields: [
        "id",
        "variants.id",
        "variants.options.option.title",
        "variants.options.value",
        "variants.prices.id",
        "variants.prices.amount",
        "variants.prices.currency_code",
      ],
      filters: { handle },
    }),
  ])

  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  if (!salesChannel || !shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Run the initial Medusa seed before creating the VIBEYA metal wall sign."
    )
  }

  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  )
  const galleryBase = `${storefrontUrl}/vibeya/assets/products/mg8014061/black`
  const images = galleryFiles.map((file) => ({ url: `${galleryBase}/${file}` }))
  const category = categories.find((candidate: any) => candidate.name === "Home & Bath")
  const productDetails = {
    title,
    handle,
    subtitle: "Custom metal wall art · black · 1, 2, or 3 pieces",
    description:
      "Create a 30 cm (11.8 in) round metal wall sign with a custom design. Enter a text prompt or upload artwork, preview the design, and confirm before ordering. Choose a 1-, 2-, or 3-piece pack. The three-piece cat, dog, and mouse artwork shown in the gallery is a sample set. Black scalloped bottle-cap edge with full-face UV direct printing; ships from U.S. fulfillment locations.",
    status: ProductStatus.PUBLISHED,
    thumbnail: images[0].url,
    images,
    metadata: {
      supplier_product_id: "124106",
      supplier_product_code: "MG8014061",
      customizable: true,
      customization_type: "text_prompt",
      print_areas: ["flat_face"],
      base_color: "Black",
    },
  }

  if (!existingProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: [{
          ...productDetails,
          shipping_profile_id: shippingProfile.id,
          ...(category ? { category_ids: [category.id] } : {}),
          sales_channels: [{ id: salesChannel.id }],
          options: [
            { title: "Color", values: ["Black"] },
            { title: "Size", values: packOptions.map(({ size }) => size) },
          ],
          variants,
        }],
      },
    })
    logger.info(`Created and published ${title} with three pack-size prices.`)
    return
  }

  const productId = existingProducts[0].id
  await updateProductsWorkflow(container).run({
    input: { products: [{ id: productId, ...productDetails }] },
  })

  const currentVariants = existingProducts[0].variants ?? []
  const missingVariants = packOptions
    .filter(({ size }) =>
      !currentVariants.some(
        (variant: any) =>
          optionValue(variant, "Color") === "Black" &&
          optionValue(variant, "Size") === size
      )
    )
    .map(({ size, amount, sku }) => ({
      title: `Black / ${size}`,
      sku,
      manage_inventory: false,
      options: { Color: "Black", Size: size },
      prices: [{ amount, currency_code: "usd" }],
    }))

  if (missingVariants.length) {
    await updateProductsWorkflow(container).run({
      input: { products: [{ id: productId, variants: missingVariants }] },
    })
  }

  const updates = currentVariants.flatMap((variant: any) => {
    const size = optionValue(variant, "Size")
    const pack = packOptions.find((candidate) => candidate.size === size)
    if (optionValue(variant, "Color") !== "Black" || !pack) return []
    const prices = variant.prices ?? []
    const hasUsdPrice = prices.some(
      (price: any) => price.currency_code?.toLowerCase() === "usd"
    )
    const updatedPrices = prices.map((price: any) =>
      price.currency_code?.toLowerCase() === "usd"
        ? { id: price.id, amount: pack.amount }
        : { id: price.id }
    )
    if (!hasUsdPrice) updatedPrices.push({ amount: pack.amount, currency_code: "usd" })
    return [{ id: variant.id, prices: updatedPrices }]
  })

  if (updates.length) {
    await batchProductVariantsWorkflow(container).run({ input: { update: updates } })
  }

  logger.info(`Synchronized ${title}, six gallery images, and all pack prices.`)
}
