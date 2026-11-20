import { sdk } from "@lib/config"
import { getVibeyaMarket } from "@lib/vibeya/region"
import { getMarketLocale } from "@lib/util/market-locale"
import { getVibeyaImage, vibeyaProducts } from "@modules/vibeya/data/products"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  const countryCode = (request.nextUrl.searchParams.get("country_code") || "us").toLowerCase()
  const locale = getMarketLocale(countryCode, request.nextUrl.searchParams.get("locale") || undefined)
  // Canada is currently English-only, so use the English product image set.
  const mediaCountryCode = countryCode === "ca" && locale === "en-CA" ? "us" : countryCode
  try {
    const market = await getVibeyaMarket(countryCode)
    if (!market.region) return NextResponse.json({ error: `No sales region is configured for ${countryCode}.` }, { status: 404 })
    const region = market.region
    const { products } = await sdk.store.product.list({
      region_id: region.id,
      ...(locale ? { locale } : {}),
      limit: 100,
      fields:
        "id,handle,title,subtitle,description,thumbnail,*images,*categories,*type,*options,*variants,*variants.options,*variants.calculated_price",
    })

    return NextResponse.json({
      region: { id: region.id, currency_code: region.currency_code },
      category_content: request.nextUrl.searchParams.get("listing")
        ? market.category_content?.[request.nextUrl.searchParams.get("listing")!]?.locales?.[locale] ?? null
        : null,
      products: products.filter((product) => market.product_ids.includes(product.id)).map((product) => {
        const localProduct = vibeyaProducts.find((entry) => entry.handle === product.handle)
        const yogaGalleryFiles = [
          "01-carousel.webp",
          "02-carousel.webp",
          "03-carousel-v2.webp",
          "04-carousel-v2.webp",
          "05-carousel-v2.webp",
          "06-carousel.webp",
        ]
        const yogaMediaCountry = ["ca", "jp", "mx"].includes(mediaCountryCode) ? mediaCountryCode : "us"
        const marketImages = localProduct?.id === "sds-63823"
          ? yogaGalleryFiles.map((file) => `/vibeya/assets/products/sds-63823/${yogaMediaCountry}/${file}`)
          : market.localized_media?.[product.id]?.[mediaCountryCode] ?? []
        const localImage = localProduct?.colors[0]
          ? getVibeyaImage(localProduct, localProduct.colors[0])
          : null
        const colors = new Set<string>()
        const sizes = new Set<string>()
        const sizePrices: Record<string, number> = {}
        for (const variant of product.variants ?? []) {
          let variantSize: string | undefined
          for (const option of variant.options ?? []) {
            const title = option.option?.title?.toLowerCase()
            if (title === "color") colors.add(option.value)
            if (title === "size") {
              sizes.add(option.value)
              variantSize = option.value
            }
          }
          const amount = variant.calculated_price?.calculated_amount
          if (variantSize && typeof amount === "number") sizePrices[variantSize] = amount
        }
        const price = (product.variants ?? [])
          .map((variant) => variant.calculated_price)
          .filter((variant) => typeof variant?.calculated_amount === "number")
          .sort((first, second) => (first?.calculated_amount ?? 0) - (second?.calculated_amount ?? 0))[0]
        return {
          id: product.id,
          handle: product.handle,
          title: product.title,
          subtitle: product.subtitle,
          description: product.description,
          image: marketImages[0] ?? product.thumbnail ?? product.images?.[0]?.url ?? localImage,
          market_images: marketImages,
          category: product.categories?.[0]?.name ?? product.type?.value ?? "New arrivals",
          colors: Array.from(colors),
          sizes: Array.from(sizes),
          size_prices: sizePrices,
          storefront_content: market.product_content?.[product.id]?.[locale] ?? {},
          designer_config: market.product_designer?.[product.id] ?? null,
          price: price?.calculated_amount ?? null,
          currency_code: price?.currency_code ?? region.currency_code,
        }
      }),
    })
  } catch (error) {
    console.error("Unable to load VIBEYA catalog", error)
    return NextResponse.json({ error: "Could not load products" }, { status: 502 })
  }
}
