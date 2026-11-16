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

const handle = "vibeya-custom-washed-denim-baseball-cap"
const title = "VIBEYA Custom Washed Denim Baseball Cap"
const colors = ["Black", "Khaki", "Gray"]
const variants = colors.map((color) => ({
  title: `${color} / One Size`,
  sku: `VIBEYA-DENIM-CAP-${color.toUpperCase()}`,
  manage_inventory: false,
  options: { Color: color, Size: "One Size" },
  prices: [{ amount: 14.99, currency_code: "usd" }],
}))
const galleryFiles = Array.from(
  { length: 6 },
  (_, index) => `${String(index + 1).padStart(2, "0")}-carousel.webp`
)
const colorFolders: Record<string, string> = {
  Black: "black",
  Khaki: "khaki",
  Gray: "gray",
}
const optionValue = (variant: any, title: string) =>
  variant.options?.find(
    (option: any) => option.option?.title?.toLowerCase() === title.toLowerCase()
  )?.value

export default async function seedVibeyaCustomDenimCap({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const [
    { data: salesChannels },
    { data: stores },
    { data: shippingProfiles },
    { data: categories },
    { data: existingProducts },
  ] = await Promise.all([
    query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
    query.graph({ entity: "store", fields: ["default_sales_channel_id"] }),
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

  const salesChannel = salesChannels.find(
    (channel: any) => channel.id === stores[0]?.default_sales_channel_id
  )
  const shippingProfile = shippingProfiles[0]
  if (!salesChannel || !shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Run the initial Medusa seed before creating the VIBEYA denim cap."
    )
  }

  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  const images = colors.flatMap((color) =>
    galleryFiles.map((file) => ({
      url: `${storefrontUrl}/vibeya/assets/products/mg8012002/${colorFolders[color]}/${file}`,
    }))
  )
  const apparelCategory = categories.find((category: any) => category.name === "Apparel")
  const productDetails = {
    title,
    handle,
    subtitle: "Custom washed denim cap · 3 colors · one size",
    description:
      "Create a custom washed denim baseball cap from your own artwork or a written design prompt. Preview and confirm the front crown print before ordering. Choose Black, Khaki, or Gray. Made from 100% cotton washed denim with an adjustable one-size fit of approximately 55–59 cm. Carousel designs are examples. Ships from U.S. fulfillment locations.",
    status: ProductStatus.PUBLISHED,
    thumbnail: images[0].url,
    images,
    metadata: {
      supplier_product_id: "96763",
      supplier_product_code: "MG8012002",
      customizable: true,
      customization_type: "prompt_and_upload",
      print_areas: ["front_crown_curved_panel"],
      base_colors: colors,
      material: "100% cotton washed denim",
      size_fit_cm: "55-59",
      seo_primary_keyword: "custom denim baseball cap",
      seo_secondary_keywords: [
        "custom washed denim hat",
        "design your own baseball cap online",
        "personalized denim cap",
      ],
    },
  }

  if (!existingProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: [{
          ...productDetails,
          shipping_profile_id: shippingProfile.id,
          ...(apparelCategory ? { category_ids: [apparelCategory.id] } : {}),
          sales_channels: [{ id: salesChannel.id }],
          options: [
            { title: "Color", values: colors },
            { title: "Size", values: ["One Size"] },
          ],
          variants,
        }],
      },
    })
    logger.info(`Created and published ${title} with three color variants at $14.99.`)
    return
  }

  const productId = existingProducts[0].id
  await updateProductsWorkflow(container).run({
    input: {
      products: [{
        id: productId,
        ...productDetails,
        sales_channels: [{ id: salesChannel.id }],
      }],
    },
  })

  const currentVariants = existingProducts[0].variants ?? []
  const missingVariants = variants.filter(
    (candidate) =>
      !currentVariants.some(
        (variant: any) =>
          optionValue(variant, "Color") === candidate.options.Color &&
          optionValue(variant, "Size") === candidate.options.Size
      )
  )
  if (missingVariants.length) {
    await updateProductsWorkflow(container).run({
      input: { products: [{ id: productId, variants: missingVariants }] },
    })
  }

  const updates = currentVariants.flatMap((variant: any) => {
    const color = optionValue(variant, "Color")
    if (!colors.includes(color) || optionValue(variant, "Size") !== "One Size") return []
    const prices = variant.prices ?? []
    const hasUsdPrice = prices.some(
      (price: any) => price.currency_code?.toLowerCase() === "usd"
    )
    const updatedPrices = prices.map((price: any) =>
      price.currency_code?.toLowerCase() === "usd"
        ? { id: price.id, amount: 14.99 }
        : { id: price.id }
    )
    if (!hasUsdPrice) updatedPrices.push({ amount: 14.99, currency_code: "usd" })
    return [{ id: variant.id, prices: updatedPrices }]
  })
  if (updates.length) {
    await batchProductVariantsWorkflow(container).run({ input: { update: updates } })
  }

  logger.info(`Synchronized ${title}, 18 color-specific gallery images, and three $14.99 variants.`)
}
