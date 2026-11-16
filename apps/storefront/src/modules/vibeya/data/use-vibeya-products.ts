"use client"

import { useEffect, useState } from "react"
import { vibeyaProducts } from "./products"

type CatalogProduct = {
  id?: string
  handle?: string
  title?: string
  subtitle?: string | null
  description?: string | null
  image?: string | null
  category?: string
  price?: number | null
  currency_code?: string
  colors?: string[]
  sizes?: string[]
  size_prices?: Record<string, number>
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

export function useVibeyaProducts() {
  const [products, setProducts] = useState(vibeyaProducts)

  useEffect(() => {
    let active = true
    fetch("/api/vibeya/catalog", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { products?: CatalogProduct[] } | null) => {
        if (!active || !data?.products) return
        setProducts((current) => {
          const updated = current.map((product) => {
            const remote = data.products?.find((entry) => entry.handle === product.handle)
            if (!remote) return product
            return {
              ...product,
              price: typeof remote.price === "number" && Number.isFinite(remote.price) ? remote.price : product.price,
              sizePrices: remote.size_prices && Object.keys(remote.size_prices).length ? remote.size_prices : product.sizePrices,
              currency: remote.currency_code?.toUpperCase() ?? product.currency,
              colors: remote.colors?.length ? product.colors.filter((color) => remote.colors?.includes(color.id)) : product.colors,
              sizes: remote.sizes?.length ? product.sizes.filter((size) => remote.sizes?.includes(size)) : product.sizes,
            }
          })
          const knownHandles = new Set(updated.map((product) => product.handle))
          const added = (data.products ?? [])
            .filter((product) => product.handle && !knownHandles.has(product.handle))
            .map((product) => ({
              id: product.id || product.handle!,
              handle: product.handle!,
              catalogOnly: true,
              catalogImage: product.image,
              category: product.category || "New arrivals",
              priceUnavailable: typeof product.price !== "number",
              name: product.title || product.handle!,
              short: product.subtitle || product.title || product.handle!,
              price: product.price ?? 0,
              currency: product.currency_code?.toUpperCase() || "USD",
              colors: (product.colors ?? []).map(toCatalogColor),
              sizes: product.sizes ?? [],
              gallery: [],
              variantSummary: product.colors?.length
                ? `${product.colors.length === 1 ? product.colors[0] : `${product.colors.length} colors`}${product.sizes?.length ? ` · ${product.sizes.length} options` : ""}`
                : product.category || "New arrivals",
              eyebrow: "VIBEYA / NEW ARRIVAL",
              intro: product.description || product.title || product.handle!,
              highlights: [],
              sizeGuide: "",
              sizeRows: [],
              sizeNote: "",
              services: [],
            }))
          return [...updated, ...added]
        })
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  return products
}
