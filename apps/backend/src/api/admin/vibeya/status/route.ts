import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isVibeyaAIConfig, VIBEYA_AI_METADATA_KEY } from "../../../../lib/vibeya-ai"

const PRODUCT_HANDLES = [
  "vibeya-custom-cotton-long-sleeve-tee",
  "vibeya-washed-vintage-hooded-sweatshirt",
  "vibeya-custom-20oz-stainless-steel-tumbler",
  "vibeya-custom-3d-bath-mat",
  "vibeya-custom-flannel-throw-blanket",
]
const VIBEYA_SHIPPING_LABELS: Record<string, string> = {
  "GOFO Parcel": "GOFO Parcel",
  "GOFO Parcel-MIX": "GOFO Parcel",
  USPS: "USPS",
  "YDL-USPS-GA": "USPS",
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: products }, { data: regions }, { data: shippingOptions }] =
    await Promise.all([
      query.graph({
        entity: "product",
        fields: ["id", "handle", "title", "status", "variants.id"],
        filters: { handle: PRODUCT_HANDLES },
      }),
      query.graph({
        entity: "region",
        fields: ["id", "name", "currency_code", "countries.iso_2", "metadata"],
      }),
      query.graph({
        entity: "shipping_option",
        fields: ["id", "name"],
      }),
    ])
  const { data: stores } = await query.graph({ entity: "store", fields: ["metadata"] })
  const aiConfig = stores[0]?.metadata?.[VIBEYA_AI_METADATA_KEY]

  const usRegion = regions.find((region: any) =>
    region.countries?.some((country: any) => country.iso_2?.toLowerCase() === "us")
  )
  const paypalConfigured = Boolean(
    process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
  )
  const paypalMode = paypalConfigured
    ? (process.env.PAYPAL_ENVIRONMENT || "sandbox").toLowerCase()
    : "not_configured"

  return res.json({
    products: {
      total: products.length,
      published: products.filter((product: any) => product.status === "published").length,
      variants: products.reduce(
        (count: number, product: any) => count + (product.variants?.length ?? 0),
        0
      ),
    },
    market: {
      configured: Boolean(usRegion),
      currency: usRegion?.currency_code ?? null,
      country: "US",
      finalSale: usRegion?.metadata?.return_window_days === 0,
      freeShipping: usRegion?.metadata?.shipping_rate === 0,
    },
    shippingOptions: Array.from(new Set(
      shippingOptions
        .map((option: any) => VIBEYA_SHIPPING_LABELS[option.name])
        .filter((name: string | undefined): name is string => Boolean(name))
    )).sort((first, second) => first === "USPS" ? -1 : second === "USPS" ? 1 : 0),
    paypal: { configured: paypalConfigured, mode: paypalMode },
    designStudio: {
      aiGenerationConnected: isVibeyaAIConfig(aiConfig) && Boolean(aiConfig.encryptedApiKey),
      referenceStorageConnected: false,
    },
  })
}
