import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

const PRODUCT_HANDLES = [
  "vibeya-custom-cotton-long-sleeve-tee",
  "vibeya-washed-vintage-hooded-sweatshirt",
  "vibeya-custom-20oz-stainless-steel-tumbler",
]

export default async function configureVibeyaMadeToOrderInventory({
  container,
}: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  for (const handle of PRODUCT_HANDLES) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "variants.id", "variants.manage_inventory"],
      filters: { handle },
    })
    const product = products[0]
    if (!product) throw new Error(`Product ${handle} was not found.`)

    const variants = (product.variants ?? []).filter(
      (variant: any) => variant.manage_inventory !== false
    )
    for (const variant of variants) {
      await updateProductVariantsWorkflow(container).run({
        input: {
          selector: { id: variant.id, product_id: product.id },
          update: { manage_inventory: false },
        },
      })
    }

    logger.info(
      `${product.title}: inventory tracking disabled for made-to-order variants (${product.variants?.length ?? 0} total).`
    )
  }
}
