import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow, updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"

const PUBLIC_BACKEND_URL = "https://api.vibeyastudio.com"
const LOCAL_BACKEND_URL = /^http:\/\/(?:localhost|127\.0\.0\.1):9000(?=\/)/i

type ProductRecord = {
  id: string
  thumbnail?: string | null
  images?: Array<{ url?: string | null }>
  metadata?: Record<string, unknown> | null
}

function rewriteLocalUrls(value: unknown): unknown {
  if (typeof value === "string") return value.replace(LOCAL_BACKEND_URL, PUBLIC_BACKEND_URL)
  if (Array.isArray(value)) return value.map(rewriteLocalUrls)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteLocalUrls(item)]))
  }
  return value
}

export default async function fixLocalhostMediaUrls({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "thumbnail", "images.url", "metadata"],
    pagination: { take: 1000 },
  }) as { data: ProductRecord[] }

  const productUpdates = products.flatMap((product) => {
    const thumbnail = product.thumbnail ? rewriteLocalUrls(product.thumbnail) as string : product.thumbnail
    const images = (product.images ?? []).map((image) => ({
      ...image,
      url: image.url ? rewriteLocalUrls(image.url) as string : undefined,
    }))
    const metadata = rewriteLocalUrls(product.metadata ?? {}) as Record<string, unknown>
    const changed = thumbnail !== product.thumbnail || JSON.stringify(images) !== JSON.stringify(product.images ?? []) || JSON.stringify(metadata) !== JSON.stringify(product.metadata ?? {})
    return changed ? [{ id: product.id, thumbnail, images, metadata }] : []
  })

  if (productUpdates.length) {
    await updateProductsWorkflow(container).run({ input: { products: productUpdates } })
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "metadata"],
  }) as { data: Array<{ id: string; metadata?: Record<string, unknown> | null }> }

  let storesUpdated = 0
  for (const store of stores) {
    const metadata = rewriteLocalUrls(store.metadata ?? {}) as Record<string, unknown>
    if (JSON.stringify(metadata) === JSON.stringify(store.metadata ?? {})) continue
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { metadata },
      },
    })
    storesUpdated += 1
  }

  console.info(`Repaired localhost image URLs in ${productUpdates.length} products and ${storesUpdated} stores.`)
}
