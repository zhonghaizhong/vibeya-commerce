import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { createAndLinkProductOptionsToProductWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"

const PREVIOUS_HANDLE = "vibeya-20oz-moonlit-cat-tumbler"
const PRODUCT_HANDLE = "vibeya-custom-20oz-stainless-steel-tumbler"

export default async function updateVibeyaCustomTumbler({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  let { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "options.id", "options.title", "options.values.id", "options.values.value", "variants.id", "variants.options.option.title", "variants.options.value"],
    filters: { handle: PREVIOUS_HANDLE },
  })
  if (!products.length) {
    const current = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle", "options.id", "options.title", "options.values.id", "options.values.value", "variants.id", "variants.options.option.title", "variants.options.value"],
      filters: { handle: PRODUCT_HANDLE },
    })
    products = current.data
  }
  const product = products[0]
  if (!product) {
    logger.info(`No tumbler product using ${PREVIOUS_HANDLE} or ${PRODUCT_HANDLE} was found; nothing to update.`)
    return
  }

  await updateProductsWorkflow(container).run({
    input: {
      products: [{
        id: product.id,
        title: "VIBEYA Custom 20 oz Stainless Steel Tumbler",
        handle: PRODUCT_HANDLE,
        subtitle: "Custom full-wrap artwork · 20 oz · 304 stainless steel",
        description:
          "Custom 20 oz stainless steel tumbler with a made-to-order full-wrap print. Customers can describe a design or upload their own print artwork; gallery images show a sample Moonlit Cats design only. Includes a clear sliding lid and a separate clear straw. Supplier specifications: 304 stainless steel body; body height 21 cm / 8.3 in; straw length 23 cm / 9.1 in; top diameter 7.8 cm / 3.1 in; base diameter 7.2 cm / 2.8 in. Available for U.S. shipping.",
      }],
    },
  })

  const colorOption = product.options?.find((option: any) => option.title.toLowerCase() === "color")
  if (!colorOption) throw new Error("The tumbler does not have a Color option.")

  await createAndLinkProductOptionsToProductWorkflow(container).run({
    input: {
      product_id: product.id,
      update: [{ product_option_id: colorOption.id, add: [{ value: "White" }] }],
    },
  })

  await updateProductsWorkflow(container).run({
    input: {
      products: [{
        id: product.id,
        variants: product.variants?.map((variant: any) => ({
          id: variant.id,
          title: "White / 20 oz",
          sku: "VIBEYA-TUMBLER-WHITE-20OZ",
          options: { Color: "White", Size: "20 oz" },
        })),
      }],
    },
  })

  const previousColorIds = colorOption.values
    ?.filter((value: any) => value.value === "NightGarden")
    .map((value: any) => value.id) ?? []
  if (previousColorIds.length) {
    await createAndLinkProductOptionsToProductWorkflow(container).run({
      input: {
        product_id: product.id,
        update: [{ product_option_id: colorOption.id, remove: previousColorIds }],
      },
    })
  }

  logger.info(`Updated ${product.title}; the tumbler color is now White.`)
}
