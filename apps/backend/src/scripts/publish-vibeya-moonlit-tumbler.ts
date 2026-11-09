import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

const PRODUCT_HANDLE = "vibeya-custom-20oz-stainless-steel-tumbler"

export default async function publishVibeyaMoonlitTumbler({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "status"],
    filters: { handle: PRODUCT_HANDLE },
  })
  const product = products[0]
  if (!product) throw new Error(`Product ${PRODUCT_HANDLE} was not found.`)

  if (product.status !== ProductStatus.PUBLISHED) {
    await updateProductsWorkflow(container).run({
      input: { products: [{ id: product.id, status: ProductStatus.PUBLISHED }] },
    })
  }

  logger.info(`Published ${product.title} to the store.`)
}
