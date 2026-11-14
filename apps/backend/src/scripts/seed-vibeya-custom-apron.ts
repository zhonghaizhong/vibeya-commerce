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

const handle = "vibeya-custom-prompt-design-apron"
const title = "VIBEYA Custom Prompt-Designed Apron"
const price = 17.99
const galleryFiles = Array.from(
  { length: 6 },
  (_, index) => `${String(index + 1).padStart(2, "0")}-carousel.png`
)
const variant = {
  title: "Black / One Size",
  sku: "VIBEYA-APRON-BLACK",
  manage_inventory: false,
  options: { Color: "Black", Size: "One Size" },
  prices: [{ amount: price, currency_code: "usd" }],
}

const optionValue = (productVariant: any, title: string) =>
  productVariant.options?.find(
    (option: any) => option.option?.title?.toLowerCase() === title.toLowerCase()
  )?.value

export default async function seedVibeyaCustomApron({ container }: ExecArgs) {
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
      "Run the initial Medusa seed before creating the VIBEYA apron."
    )
  }

  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  )
  const galleryBase = `${storefrontUrl}/vibeya/assets/products/sds-275844/black`
  const images = galleryFiles.map((file) => ({ url: `${galleryBase}/${file}` }))
  const category = categories.find(
    (candidate: any) => candidate.name === "Kitchen & Dining"
  )
  const productDetails = {
    title,
    handle,
    subtitle: "Prompt-designed custom print · black · one size",
    description:
      "Design a black cooking apron with a text prompt, preview the generated artwork, and personalize the front bib before ordering. The gallery images are examples; the buyer creates their own print. Approximate dimensions: 80 × 70 cm. 100% polyester, 180 GSM, with an adjustable neck strap and three divided front pockets.",
    status: ProductStatus.PUBLISHED,
    thumbnail: images[0].url,
    images,
    metadata: {
      supplier_product_id: "275844",
      customizable: true,
      customization_type: "text_prompt",
      print_areas: ["front_bib"],
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
            { title: "Size", values: ["One Size"] },
          ],
          variants: [variant],
        }],
      },
    })
    logger.info(`Created and published ${title} at $${price.toFixed(2)}.`)
    return
  }

  const productId = existingProducts[0].id
  await updateProductsWorkflow(container).run({
    input: { products: [{ id: productId, ...productDetails }] },
  })

  const currentVariants = existingProducts[0].variants ?? []
  const currentVariant = currentVariants.find(
    (candidate: any) =>
      optionValue(candidate, "Color") === "Black" &&
      optionValue(candidate, "Size") === "One Size"
  )

  if (!currentVariant) {
    await updateProductsWorkflow(container).run({
      input: {
        products: [{
          id: productId,
          variants: [variant],
        }],
      },
    })
  } else {
    const prices = (currentVariant as any).prices ?? []
    const hasUsdPrice = prices.some(
      (item: any) => item.currency_code?.toLowerCase() === "usd"
    )
    const updatedPrices: any[] = prices.map((item: any) =>
      item.currency_code?.toLowerCase() === "usd"
        ? { id: item.id, amount: price }
        : { id: item.id }
    )
    if (!hasUsdPrice) {
      updatedPrices.push({ amount: price, currency_code: "usd" })
    }
    await batchProductVariantsWorkflow(container).run({
      input: {
        update: [{ id: currentVariant.id, prices: updatedPrices }],
      },
    })
  }

  logger.info(`Synchronized ${title} at $${price.toFixed(2)} with the storefront gallery.`)
}
