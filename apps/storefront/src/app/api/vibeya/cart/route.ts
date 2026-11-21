import { sdk } from "@lib/config"
import {
  getCartId,
  getDestinationCountryCode,
  removeCartId,
  removeLegacyCartId,
} from "@lib/data/cookies"
import { getVibeyaMarket } from "@lib/vibeya/region"
import { activateCart, MAX_LINE_ITEM_QUANTITY } from "@lib/util/server-cart"
import { vibeyaProducts } from "@modules/vibeya/data/products"
import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

const CART_FIELDS =
  "*items,*items.product,*items.variant,*items.thumbnail,*items.metadata,*region,+items.total,+shipping_methods.name"

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })

const normalizeOptionValue = (value: unknown) =>
  String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "")

const normalizeColorValue = (value: unknown, handle: string) =>
  normalizeOptionValue(handle === "vibeya-custom-20oz-stainless-steel-tumbler" && value === "NightGarden" ? "White" : value)

async function loadCart(cartId: string) {
  const { cart } = await sdk.store.cart.retrieve(cartId, { fields: CART_FIELDS })
  return cart
}

async function addLineItem(
  cartId: string,
  variantId: string,
  quantity: number,
  metadata: Record<string, unknown>
) {
  await sdk.client.fetch("/store/vibeya/cart/line-items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { cart_id: cartId, variant_id: variantId, quantity, metadata },
    cache: "no-store",
  })
}

export async function GET(request: NextRequest) {
  const requestedCountryCode = request.nextUrl.searchParams.get("country_code")
  const countryCode = (requestedCountryCode ?? await getDestinationCountryCode()).toLowerCase()
  const cartId = await getCartId(countryCode)
  const market = await getVibeyaMarket(countryCode)
  if (!cartId) return NextResponse.json({ cart: null })

  try {
    const cart = await loadCart(cartId)
    if (cart.region_id !== market.region?.id) {
      await removeCartId(countryCode)
      return NextResponse.json({ cart: null })
    }
    return NextResponse.json({ cart })
  } catch {
    return NextResponse.json({ cart: null })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return jsonError("Invalid cart item")

  const countryCode = String(body.countryCode ?? await getDestinationCountryCode()).toLowerCase()

  const requestedProduct = String(body.product ?? "").trim()
  if (!requestedProduct) return jsonError("This product is not available for purchase", 404)
  const productConfig = vibeyaProducts.find((product) =>
    product.id === requestedProduct || product.handle === requestedProduct
  )

  const color = String(body.color ?? "")
  const size = String(body.size ?? "")
  const quantity = Math.min(
    Math.max(Number.parseInt(String(body.quantity ?? 1), 10) || 1, 1),
    MAX_LINE_ITEM_QUANTITY
  )
  let market: Awaited<ReturnType<typeof getVibeyaMarket>>
  try {
    market = await getVibeyaMarket(countryCode)
  } catch {
    return jsonError("Could not check delivery availability for this destination.", 502)
  }
  if (!market.region) return jsonError("Checkout is not configured for this destination yet.", 400)
  const region = market.region

  try {
    const { products } = await sdk.store.product.list({
      ...(productConfig
        ? { handle: [productConfig.handle] }
        : requestedProduct.startsWith("prod_")
          ? { id: [requestedProduct] }
          : { handle: [requestedProduct] }),
      region_id: region.id,
      limit: 1,
      fields: "id,handle,*variants,*variants.options",
    })
    const product = products[0]
    if (!product) return jsonError("Product is not published", 404)
    if (!market.product_ids.includes(product.id)) return jsonError("This product cannot be delivered to the selected destination.", 400)
    const handle = product.handle

    const normalizedColor = normalizeColorValue(color, handle)
    const normalizedSize = normalizeOptionValue(size)
    const variant = product.variants?.find((candidate: HttpTypes.StoreProductVariant) => {
      const options = new Map(
        (candidate.options ?? []).map((option) => [
          normalizeOptionValue(option.option?.title),
          normalizeColorValue(option.value, handle),
        ])
      )
      const optionsMatch = options.get("color") === normalizedColor && options.get("size") === normalizedSize
      const titleOptions = String(candidate.title ?? "")
        .split(/\s*\/\s*|\s*[|·]\s*/)
        .map(normalizeOptionValue)
      const titleMatch = titleOptions.includes(normalizedColor) && titleOptions.includes(normalizedSize)
      return optionsMatch || titleMatch
    })
    if (!variant) return jsonError("That color and size combination is unavailable", 400)

    const isYogaSet = handle === "vibeya-custom-womens-yoga-set"
    const print = isYogaSet
      ? "both"
      : ["none", "front", "back", "both", "wrap"].includes(String(body.print))
        ? String(body.print)
        : "front"
    const metadata = {
      vibeya_design_name: String(body.designName ?? "Custom design").slice(0, 120),
      vibeya_design_prompt: String(body.prompt ?? "").slice(0, 4000),
      vibeya_print_placement: print,
      ...(isYogaSet
        ? { vibeya_customization_scope: "matching_top_and_shorts_complete_set" }
        : {}),
      vibeya_reference_images_not_attached: Number(body.referenceCount ?? 0) > 0,
      vibeya_inspiration_id: String(body.inspirationId ?? "").slice(0, 100),
    }
    if (body.generatedArtwork !== undefined && body.generatedArtwork !== null) {
      const artwork = String(body.generatedArtwork)
      if (!artwork.startsWith("data:image/webp;base64,") || artwork.length > 1_500_000) {
        return jsonError("Generated preview could not be attached. Please generate it again.", 400)
      }
      Object.assign(metadata, { vibeya_generated_artwork: artwork })
    }

    let cartId = await getCartId(countryCode)
    if (cartId) {
      try {
        const cart = await loadCart(cartId)
        if (cart.region_id !== region.id) {
          cartId = undefined
        }
      } catch {
        // A completed or stale cart cookie should not block a new purchase.
        cartId = undefined
      }
    }
    if (!cartId) {
      const { cart } = await sdk.store.cart.create({ region_id: region.id })
      cartId = cart.id
    }
    await addLineItem(cartId, variant.id, quantity, metadata)
    await activateCart(cartId, countryCode)
    await removeLegacyCartId()

    return NextResponse.json({ cart: await loadCart(cartId) }, { status: 201 })
  } catch (error) {
    console.error("Unable to add VIBEYA item to cart", error)
    return jsonError("Could not add this item to your bag. Please try again.", 502)
  }
}
