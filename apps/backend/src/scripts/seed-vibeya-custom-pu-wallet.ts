import {
  batchProductVariantsWorkflow,
  updateStoresWorkflow,
  updateProductsWorkflow,
  updateStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { getVibeyaProductContent, VIBEYA_PRODUCT_CONTENT_METADATA_KEY } from "../lib/vibeya-product-content"

const handle = "vibeya-custom-pu-wallet"
const productId = "prod_01M7VVPR5E2K827AHXDNXKQR1W"
const imageBase = "/vibeya/assets/products/vibeya-custom-pu-wallet"
const baseImageUrl = `${imageBase}/wallet-print-base.jpg`
const printGuideUrl = `${imageBase}/wallet-print-guide.png`
const galleryUrls = [
  `${imageBase}/wallet-gallery-01.jpg`,
  `${imageBase}/wallet-gallery-02.jpg`,
  `${imageBase}/wallet-gallery-03.jpg`,
  `${imageBase}/wallet-gallery-04.jpg`,
  `${imageBase}/wallet-gallery-05.jpg`,
  `${imageBase}/wallet-gallery-06.jpg`,
]
const walletGalleryForLocale = (locale: "en-US" | "ja-JP" | "es-MX") => Array.from(
  { length: 6 },
  (_, index) => `${imageBase}/localized/${locale}/wallet-gallery-${String(index + 1).padStart(2, "0")}.jpg`
)
const walletGenerationPrompt = "Custom black PU bifold wallet. Image 1 is one open wallet showing BOTH inner panels in a single spread view. Image 2 is the placement guide for this same wallet. Offer only two print placements: Front Only and Front + Back. Orientation is fixed: the product FRONT is the RIGHT inner panel in the open-wallet guide; the product BACK is the LEFT inner panel. Front Only: print only inside the marked RIGHT inner panel; keep the LEFT inner panel plain black. Front + Back: print inside BOTH marked inner panels; follow the customer's right/front and left/back instructions exactly when they specify different artwork. If they describe one unified design, apply it to both panels. Never make a back-only option or leave either panel unprinted when Front + Back is selected. Preserve the wallet's black matte PU texture, natural folds, exact proportions, center hinge, edge piping, stitching, and white background. Never print on hinge, borders, stitching, piping, outer edge, or background. Do not reproduce the guide color. Make ink look absorbed into matte textured PU, never like a sticker or glossy overlay. Output exactly one open-wallet view; no duplicate products or separate front/back views."
const marketPrices = [
  { country: "us", currency: "usd", amount: 15.99 },
  { country: "ca", currency: "cad", amount: 22.99 },
  { country: "mx", currency: "mxn", amount: 304.99 },
  { country: "jp", currency: "jpy", amount: 2549 },
] as const
const marketCountries = marketPrices.map(({ country }) => country)
const chinaLocationName = "China · Yoga Set Dispatch (address pending)"

const DESIGNER_KEY = "vibeya_product_designer"
const FULFILLMENT_PRODUCTS_KEY = "vibeya_fulfillment_product_ids"
const MARKET_MEDIA_KEY = "vibeya_product_market_media"

export default async function seedVibeyaCustomPuWallet({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const [
    { data: products },
    { data: regions },
    { data: locations },
    { data: categories },
    { data: stores },
  ] = await Promise.all([
    query.graph({
      entity: "product",
      fields: [
        "id",
        "handle",
        "title",
        "description",
        "thumbnail",
        "images.url",
        "metadata",
        "categories.id",
        "variants.id",
        "variants.options.option.title",
        "variants.options.value",
        "variants.prices.id",
        "variants.prices.currency_code",
      ],
      filters: { handle },
      pagination: { take: 1 },
    }),
    query.graph({ entity: "region", fields: ["id", "currency_code", "countries.iso_2"] }),
    query.graph({
      entity: "stock_location",
      fields: ["id", "name", "metadata"],
      filters: { name: chinaLocationName },
      pagination: { take: 1 },
    }),
    query.graph({ entity: "product_category", fields: ["id", "name", "handle"] }),
    query.graph({ entity: "store", fields: ["id", "metadata"] }),
  ])

  const product = (products as any[]).find((item) => item.id === productId || item.handle === handle)
  if (!product) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Published wallet not found: ${handle}`)

  for (const market of marketPrices) {
    const region = (regions as any[]).find((entry) =>
      entry.currency_code?.toLowerCase() === market.currency &&
      entry.countries?.some((country: any) => country.iso_2?.toLowerCase() === market.country)
    )
    if (!region) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Missing ${market.country.toUpperCase()} ${market.currency.toUpperCase()} region.`)
    }
  }

  const designer = product.metadata?.[DESIGNER_KEY] && typeof product.metadata[DESIGNER_KEY] === "object"
    ? product.metadata[DESIGNER_KEY] as Record<string, unknown>
    : {}
  const nextDesigner = {
    ...designer,
    mode: "front-back",
    enabled: true,
    placements: ["front", "both"],
    references: [
      { side: "front", size: "One Size", color: "Black", baseImageUrl, printAreaImageUrl: printGuideUrl },
      { side: "back", size: "One Size", color: "Black", baseImageUrl, printAreaImageUrl: printGuideUrl },
    ],
    galleryUrls,
    generationPromptTemplate: walletGenerationPrompt,
  }
  const content = getVibeyaProductContent(handle, product.metadata?.[VIBEYA_PRODUCT_CONTENT_METADATA_KEY])
  const defaultContent = getVibeyaProductContent(handle, undefined)
  // Keep the wallet's Japanese and Mexican Spanish detail copy aligned with
  // the reviewed locale source so stale English metadata cannot leak through.
  for (const locale of ["ja-JP", "es-MX"] as const) {
    if (defaultContent[locale]) content[locale] = defaultContent[locale]
  }

  const bagsCategory = (categories as any[]).find((category) =>
    category.handle === "custom-bags" || category.name?.trim().toLowerCase() === "custom bags"
  )
  const categoryIds = new Set<string>((product.categories ?? []).map((category: any) => category.id).filter(Boolean))
  if (bagsCategory?.id) categoryIds.add(bagsCategory.id)

  const publicBase = (process.env.STOREFRONT_URL || "https://vibeyastudio.com").replace(/\/$/, "")
  const productImages = galleryUrls.map((url) => ({ url: `${publicBase}${url}` }))
  const metadata = {
    ...(product.metadata ?? {}),
    vibeya_available_countries: marketCountries,
    [DESIGNER_KEY]: nextDesigner,
    [VIBEYA_PRODUCT_CONTENT_METADATA_KEY]: content,
  }
  await updateProductsWorkflow(container).run({
    input: {
      products: [{
        id: product.id,
        status: "published",
        thumbnail: productImages[0].url,
        images: productImages,
        metadata,
        ...(categoryIds.size ? { category_ids: [...categoryIds] } : {}),
      }],
    },
  })

  const store = (stores as any[])[0]
  if (!store) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Store configuration not found for wallet localization.")
  const currentMedia = store.metadata?.[MARKET_MEDIA_KEY] && typeof store.metadata[MARKET_MEDIA_KEY] === "object"
    ? store.metadata[MARKET_MEDIA_KEY] as Record<string, Record<string, string[]>>
    : {}
  const productMedia = { ...(currentMedia[product.id] ?? {}) }
  productMedia.us = galleryUrls
  productMedia.ca = galleryUrls
  productMedia.jp = walletGalleryForLocale("ja-JP")
  productMedia.mx = walletGalleryForLocale("es-MX")
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { metadata: { ...(store.metadata ?? {}), [MARKET_MEDIA_KEY]: { ...currentMedia, [product.id]: productMedia } } },
    },
  })

  const variants = product.variants ?? []
  if (variants.length !== 1) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Expected one wallet variant; found ${variants.length}.`)
  }
  const variant = variants[0]
  const prices = variant.prices ?? []
  const nextPrices = prices.map((price: any) => {
    const market = marketPrices.find((candidate) => candidate.currency === price.currency_code?.toLowerCase())
    return market ? { id: price.id, amount: market.amount } : { id: price.id }
  })
  for (const market of marketPrices) {
    if (!prices.some((price: any) => price.currency_code?.toLowerCase() === market.currency)) {
      nextPrices.push({ amount: market.amount, currency_code: market.currency })
    }
  }
  await batchProductVariantsWorkflow(container).run({
    input: { update: [{ id: variant.id, prices: nextPrices }] },
  })

  const chinaLocation = (locations as any[])[0]
  if (!chinaLocation) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `China dispatch location not found: ${chinaLocationName}`)
  }
  const assigned = Array.isArray(chinaLocation.metadata?.[FULFILLMENT_PRODUCTS_KEY])
    ? chinaLocation.metadata[FULFILLMENT_PRODUCTS_KEY].filter((id: unknown): id is string => typeof id === "string")
    : []
  const assignedIds = [...new Set([...assigned, product.id])]
  await updateStockLocationsWorkflow(container).run({
    input: {
      selector: { id: chinaLocation.id },
      update: { metadata: { ...(chinaLocation.metadata ?? {}), [FULFILLMENT_PRODUCTS_KEY]: assignedIds } },
    },
  })

  logger.info(`Synchronized published PU wallet: six optimized gallery images, persistent design base and print guide, single-spread front/back mapping, four market prices, Custom Bags category, and China-dispatch market association. Current China street address remains marked pending in the existing location.`)
}
