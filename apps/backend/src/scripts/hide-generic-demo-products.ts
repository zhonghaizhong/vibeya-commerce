import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

const DEMO_HANDLES = ["t-shirt", "sweatshirt", "sweatpants", "shorts"]

export default async function hideGenericDemoProducts({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "status"],
    filters: { handle: DEMO_HANDLES },
  })

  const published = products.filter((product: any) => product.status === ProductStatus.PUBLISHED)
  if (published.length) {
    await updateProductsWorkflow(container).run({
      input: {
        products: published.map((product: any) => ({
          id: product.id,
          status: ProductStatus.DRAFT,
        })),
      },
    })
  }

  logger.info(`Moved ${published.length} generic demo products out of the published VIBEYA catalog.`)
}
