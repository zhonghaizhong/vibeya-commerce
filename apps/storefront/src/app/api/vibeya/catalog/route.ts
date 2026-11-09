import { sdk } from "@lib/config"
import { getVibeyaUsRegion } from "@lib/vibeya/region"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const region = await getVibeyaUsRegion()
  if (!region) {
    return NextResponse.json({ error: "U.S. catalog is unavailable" }, { status: 503 })
  }

  try {
    const { products } = await sdk.store.product.list({
      region_id: region.id,
      limit: 100,
      fields:
        "id,handle,title,subtitle,description,thumbnail,*images,*categories,*type,*options,*variants,*variants.options,*variants.calculated_price",
    })

    return NextResponse.json({
      region: { id: region.id, currency_code: region.currency_code },
      products: products.map((product) => {
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
          image: product.thumbnail ?? product.images?.[0]?.url ?? null,
          category: product.categories?.[0]?.name ?? product.type?.value ?? "New arrivals",
          colors: Array.from(colors),
          sizes: Array.from(sizes),
          size_prices: sizePrices,
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
