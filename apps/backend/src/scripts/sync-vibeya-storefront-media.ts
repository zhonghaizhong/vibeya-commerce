import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

const PRODUCTS = [
  {
    handle: "vibeya-custom-cotton-long-sleeve-tee",
    thumbnail: "/vibeya/assets/products/sds-167256/01-brand-lifestyle.webp",
    colorImages: {
      Black: "/vibeya/assets/products/sds-167256/01-brand-lifestyle.webp",
      White: "/vibeya/assets/products/sds-167256/white/01-brand-lifestyle.webp",
      Red: "/vibeya/assets/products/sds-167256/red/01-brand-lifestyle.webp",
      Gray: "/vibeya/assets/products/sds-167256/gray/01-brand-lifestyle.jpg",
      LightGray: "/vibeya/assets/products/sds-167256/light-gray/01-brand-lifestyle.webp",
      Cream: "/vibeya/assets/products/sds-167256/cream/01-brand-lifestyle.webp",
      Navy: "/vibeya/assets/products/sds-167256/navy/01-brand-lifestyle.webp",
    },
  },
  {
    handle: "vibeya-washed-vintage-hooded-sweatshirt",
    thumbnail: "/vibeya/assets/products/mg8003077/brown/01-brand-lifestyle.png",
    colorImages: {
      Black: "/vibeya/assets/products/mg8003077/black/01-brand-lifestyle.png",
      Gray: "/vibeya/assets/products/mg8003077/light-gray/01-brand-lifestyle.png",
      Khaki: "/vibeya/assets/products/mg8003077/brown/01-brand-lifestyle.png",
      Green: "/vibeya/assets/products/mg8003077/muted-green/01-brand-lifestyle.png",
      Pink: "/vibeya/assets/products/mg8003077/pink/01-brand-lifestyle.png",
      Purple: "/vibeya/assets/products/mg8003077/lavender/01-brand-lifestyle.png",
    },
  },
  {
    handle: "vibeya-custom-20oz-stainless-steel-tumbler",
    thumbnail: "/vibeya/assets/products/sds-128646/01-main-image.jpg",
    colorImages: {
      White: "/vibeya/assets/products/sds-128646/01-main-image.jpg",
    },
  },
]

export default async function syncVibeyaStorefrontMedia({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")

  for (const config of PRODUCTS) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "variants.id", "variants.options.value", "variants.options.option.title"],
      filters: { handle: config.handle },
    })
    const product = products[0]
    if (!product) throw new Error(`Product ${config.handle} was not found.`)

    const productThumbnail = `${storefrontUrl}${config.thumbnail}`
    await updateProductsWorkflow(container).run({
      input: { products: [{ id: product.id, thumbnail: productThumbnail }] },
    })

    for (const variant of product.variants ?? []) {
      const color = variant.options?.find(
        (option: any) => option.option?.title?.toLowerCase() === "color"
      )?.value
      const variantImagePath = config.colorImages[color as keyof typeof config.colorImages]
      if (!variantImagePath) continue

      await updateProductVariantsWorkflow(container).run({
        input: {
          selector: { id: variant.id, product_id: product.id },
          update: { thumbnail: `${storefrontUrl}${variantImagePath}` },
        },
      })
    }

    logger.info(`Synchronized storefront images to ${product.title} and its color variants.`)
  }
}
