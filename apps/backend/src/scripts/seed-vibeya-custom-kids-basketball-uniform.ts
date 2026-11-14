import {
  batchImageVariantsWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const handle = "vibeya-custom-kids-basketball-uniform"
const title = "VIBEYA Custom Kids' Basketball Uniform"
const colors = ["Black", "White", "Red", "Sapphire Blue", "Pure yellow"]
const sizes = ["100CM", "110CM", "120CM", "130CM", "140CM"]
const galleryFiles = Array.from(
  { length: 7 },
  (_, index) => `${String(index + 1).padStart(2, "0")}-carousel.jpg`
)
const colorFolders: Record<string, string> = {
  Black: "black",
  White: "white",
  Red: "red",
  "Sapphire Blue": "blue",
  "Pure yellow": "yellow",
}
const price = 19.99
const subtitle =
  "Custom kids' basketball jersey and shorts set · prompt-designed prints · 3 print areas · sizes 100–140 cm"
const description =
  "Design a custom kids' basketball uniform with a text prompt. This made-to-order two-piece set includes one sleeveless basketball jersey and one pair of shorts. Personalize three independent print areas—the jersey front, jersey back, and shorts—and mix and match different artwork across them for many unique combinations. Describe the artwork you want for each area and make a coordinated or one-of-a-kind set. The gallery artwork is a customization example, not a fixed print. Made from 100% polyester, 140 GSM. Available in Black, White, Red, Sapphire Blue, and Pure Yellow, in sizes 100–140 cm. Supplier garment measurements may vary by 1–2 cm. Search for custom kids basketball jersey, custom youth basketball uniform, personalized basketball jersey and shorts, and design your own basketball uniform."

const optionValue = (variant: any, title: string) =>
  variant.options?.find(
    (option: any) => option.option?.title?.toLowerCase() === title.toLowerCase()
  )?.value

const variantKey = (color: string, size: string) => `${color}::${size}`

export default async function seedVibeyaCustomKidsBasketballUniform({
  container,
}: ExecArgs) {
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
      fields: ["id", "handle"],
      filters: { handle },
    }),
  ])

  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]
  if (!salesChannel || !shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Run the initial Medusa seed before creating the VIBEYA basketball uniform."
    )
  }

  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  )
  const assetBase = `${storefrontUrl}/vibeya/assets/products/sds-233939`
  const gallery = colors.flatMap((color) =>
    galleryFiles.map((file) => ({
      url: `${assetBase}/${colorFolders[color]}/${file}`,
    }))
  )
  const variants = colors.flatMap((color) =>
    sizes.map((size) => ({
      title: `${color} / ${size}`,
      sku: `VIBEYA-BASKETBALL-${color.replace(/[^a-z0-9]/gi, "-").toUpperCase()}-${size}`,
      manage_inventory: false,
      options: { Color: color, Size: size },
      prices: [{ amount: price, currency_code: "usd" }],
    }))
  )
  const apparelCategory = categories.find(
    (category: any) => category.name === "Apparel"
  )

  if (!existingProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title,
            handle,
            subtitle,
            description,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            ...(apparelCategory ? { category_ids: [apparelCategory.id] } : {}),
            sales_channels: [{ id: salesChannel.id }],
            thumbnail: gallery[0].url,
            images: gallery,
            metadata: {
              supplier_product_id: "233939",
              customizable: true,
              customization_type: "text_prompt",
              print_areas: ["jersey_front", "jersey_back", "shorts"],
              print_areas_can_be_mixed_and_matched: true,
            },
            options: [
              { title: "Color", values: colors },
              { title: "Size", values: sizes },
            ],
            variants,
          },
        ],
      },
    })
  } else {
    const productId = existingProducts[0].id
    await updateProductsWorkflow(container).run({
      input: {
        products: [
          {
            id: productId,
            title,
            subtitle,
            description,
            status: ProductStatus.PUBLISHED,
            thumbnail: gallery[0].url,
            images: gallery,
            metadata: {
              supplier_product_id: "233939",
              customizable: true,
              customization_type: "text_prompt",
              print_areas: ["jersey_front", "jersey_back", "shorts"],
              print_areas_can_be_mixed_and_matched: true,
            },
          },
        ],
      },
    })

    const { data: currentProducts } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "variants.id",
        "variants.options.option.title",
        "variants.options.value",
      ],
      filters: { id: productId },
    })
    const currentProduct = currentProducts[0]
    const currentKeys = new Set(
      (currentProduct?.variants ?? []).map((variant: any) =>
        variantKey(optionValue(variant, "Color"), optionValue(variant, "Size"))
      )
    )
    const missingVariants = variants.filter(
      (variant) => !currentKeys.has(variantKey(variant.options.Color, variant.options.Size))
    )

    if (missingVariants.length) {
      await updateProductsWorkflow(container).run({
        input: {
          products: [{ id: productId, variants: missingVariants }],
        },
      })
    }
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "images.id",
      "images.url",
      "images.variants.id",
      "variants.id",
      "variants.options.option.title",
      "variants.options.value",
    ],
    filters: { handle },
  })
  const product = products[0]
  if (!product) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product ${handle} could not be loaded after saving.`
    )
  }

  const variantsByColor = new Map<string, string[]>()
  for (const variant of product.variants ?? []) {
    const color = optionValue(variant, "Color")
    if (!color) continue
    const current = variantsByColor.get(color) ?? []
    current.push(variant.id)
    variantsByColor.set(color, current)
  }

  for (const image of product.images ?? []) {
    const color = colors.find((candidate) =>
      image.url?.includes(`/${colorFolders[candidate]}/`)
    )
    if (!color) continue
    const wanted = variantsByColor.get(color) ?? []
    const linkedIds = new Set((image.variants ?? []).map((variant: any) => variant.id))
    const add = wanted.filter((id) => !linkedIds.has(id))
    const remove = [...linkedIds].filter((id) => !wanted.includes(id))
    if (add.length || remove.length) {
      await batchImageVariantsWorkflow(container).run({
        input: { image_id: image.id, add, remove },
      })
    }
  }

  logger.info(
    `Published ${title} locally with ${variants.length} size/color variants and color-specific galleries. Print customization is enabled for the jersey front, jersey back, and shorts.`
  )
}
