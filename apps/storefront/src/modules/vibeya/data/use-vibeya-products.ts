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
              colors: [],
              sizes: [],
              gallery: [],
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
