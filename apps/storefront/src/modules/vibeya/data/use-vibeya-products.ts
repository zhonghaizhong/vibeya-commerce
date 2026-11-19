"use client"

import { useEffect, useState } from "react"
import { vibeyaProducts, type VibeyaProduct } from "./products"

type CatalogProduct = {
  id?: string
  handle?: string
  title?: string
  subtitle?: string | null
  description?: string | null
  image?: string | null
  market_images?: string[]
  category?: string
  price?: number | null
  currency_code?: string
  colors?: string[]
  sizes?: string[]
  size_prices?: Record<string, number>
  storefront_content?: Partial<VibeyaProduct>
}

const catalogColorHex: Record<string, string> = {
  black: "#17171b",
  white: "#ffffff",
  red: "#e52d3d",
  pink: "#c95178",
  blue: "#315ad8",
  "sapphire blue": "#315ad8",
  yellow: "#ffe100",
  "pure yellow": "#ffe100",
  khaki: "#aa936d",
  gray: "#77777b",
  grey: "#77777b",
  "heather gray": "#77777b",
  "light gray": "#d7d7d9",
  cream: "#f2e4cf",
  navy: "#283456",
  green: "#74846a",
  purple: "#776b86",
  lavender: "#9b83bd",
  brown: "#79675a",
}

function toCatalogColor(name: string) {
  return {
    id: name,
    name,
    hex: catalogColorHex[name.trim().toLocaleLowerCase()] ?? "#c9c8c8",
    folder: name.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-"),
  }
}

export function useVibeyaProducts(countryCode = "us", locale = "") {
  const [marketData, setMarketData] = useState<{ countryCode: string; products: VibeyaProduct[] } | null>(null)

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ country_code: countryCode })
    if (locale) params.set("locale", locale)
    fetch(`/api/vibeya/catalog?${params.toString()}`, { credentials: "same-origin", cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Market catalog unavailable")
        return response.json()
      })
      .then((data: { products?: CatalogProduct[] } | null) => {
        if (!active) return
        if (!data?.products) {
          setMarketData({ countryCode, products: [] })
          return
        }
        const marketHandles = new Set(data.products.map((product) => product.handle).filter((handle): handle is string => Boolean(handle)))
        const updated = vibeyaProducts.filter((product) => marketHandles.has(product.handle)).map((product) => {
            const remote = data.products?.find((entry) => entry.handle === product.handle)
            if (!remote) return product
            const content = Object.fromEntries(Object.entries(remote.storefront_content ?? {}).filter(([, value]) =>
              typeof value === "string" ? Boolean(value.trim()) : Array.isArray(value) ? value.length > 0 : value !== undefined
            )) as Partial<VibeyaProduct>
            return {
              ...product,
              ...content,
              marketGallery: remote.market_images?.length ? remote.market_images : product.marketGallery,
              price: typeof remote.price === "number" && Number.isFinite(remote.price) ? remote.price : product.price,
              sizePrices: remote.size_prices && Object.keys(remote.size_prices).length ? remote.size_prices : product.sizePrices,
              currency: remote.currency_code?.toUpperCase() ?? product.currency,
              colors: remote.colors?.length ? product.colors.filter((color) => remote.colors?.includes(color.id)) : product.colors,
              sizes: remote.sizes?.length ? product.sizes.filter((size) => remote.sizes?.includes(size)) : product.sizes,
            }
        })
        const knownHandles = new Set(updated.map((product) => product.handle))
        const added: VibeyaProduct[] = data.products
          .filter((product) => product.handle && !knownHandles.has(product.handle))
          .map((product) => {
            const content = Object.fromEntries(Object.entries(product.storefront_content ?? {}).filter(([, value]) =>
              typeof value === "string" ? Boolean(value.trim()) : Array.isArray(value) ? value.length > 0 : value !== undefined
            )) as Partial<VibeyaProduct>
            return ({
              id: product.id || product.handle!,
              handle: product.handle!,
              catalogOnly: true,
              catalogImage: product.image,
              category: product.category || "New arrivals",
              priceUnavailable: typeof product.price !== "number",
              name: content.name || product.title || product.handle!,
              short: content.short || product.subtitle || product.title || product.handle!,
              price: product.price ?? 0,
              currency: product.currency_code?.toUpperCase() || "USD",
              colors: (product.colors ?? []).map(toCatalogColor),
              sizes: product.sizes ?? [],
              gallery: [],
              eyebrow: content.eyebrow || "VIBEYA / NEW ARRIVAL",
              intro: content.intro || product.description || product.title || product.handle!,
              highlights: content.highlights ?? [],
              sizeGuide: content.sizeGuide ?? "",
              sizeRows: content.sizeRows ?? [],
              sizeNote: content.sizeNote ?? "",
              services: content.services ?? [],
              variantSummary: content.variantSummary || (product.colors?.length
                ? `${product.colors.length === 1 ? product.colors[0] : `${product.colors.length} colors`}${product.sizes?.length ? ` · ${product.sizes.length} options` : ""}`
                : product.category || "New arrivals"),
              seoTitle: content.seoTitle,
              seoDescription: content.seoDescription,
              colorOptionLabel: content.colorOptionLabel,
              sizeOptionLabel: content.sizeOptionLabel,
              measurementRows: content.measurementRows,
              ...content,
            })
          })
        setMarketData({ countryCode, products: [...updated, ...added] })
      })
      .catch(() => {
        if (!active) return
        setMarketData({ countryCode, products: [] })
      })
    return () => { active = false }
  }, [countryCode, locale])

  return marketData?.countryCode === countryCode ? marketData.products : []
}
