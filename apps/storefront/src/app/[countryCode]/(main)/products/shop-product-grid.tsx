"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import styles from "./shop-all.module.css"

type ShopProduct = {
  handle: string
  title: string
  subtitle: string
  thumbnail: string | null
  price: number | null
}

type Copy = {
  search: string
  sort: string
  featured: string
  name: string
  priceLow: string
  priceHigh: string
  countPrefix: string
  countSuffix: string
  empty: string
  priceUnavailable: string
}

export default function ShopProductGrid({
  countryCode,
  locale,
  currency,
  products,
  copy,
}: {
  countryCode: string
  locale: string
  currency: string
  products: ShopProduct[]
  copy: Copy
}) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState("featured")
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency })
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(locale)
    const matches = products.filter((product) =>
      !term || `${product.title} ${product.subtitle}`.toLocaleLowerCase(locale).includes(term)
    )
    if (sort === "name") matches.sort((a, b) => a.title.localeCompare(b.title, locale))
    if (sort === "price-low") matches.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))
    if (sort === "price-high") matches.sort((a, b) => (b.price ?? Number.NEGATIVE_INFINITY) - (a.price ?? Number.NEGATIVE_INFINITY))
    return matches
  }, [locale, products, query, sort])

  return (
    <>
      <div className={styles.tools}>
        <label>
          <span className={styles.visuallyHidden}>{copy.search}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} />
        </label>
        <label>
          <span className={styles.visuallyHidden}>{copy.sort}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label={copy.sort}>
            <option value="featured">{copy.featured}</option>
            <option value="name">{copy.name}</option>
            <option value="price-low">{copy.priceLow}</option>
            <option value="price-high">{copy.priceHigh}</option>
          </select>
        </label>
      </div>
      <p className={styles.resultCount} aria-live="polite">{copy.countPrefix}{filtered.length}{copy.countSuffix}</p>
      {filtered.length ? (
        <div className={styles.grid}>
          {filtered.map((product) => (
            <article key={product.handle} className={styles.card}>
              <Link className={styles.imageLink} href={`/${countryCode}/products/${product.handle}`} aria-label={`${product.title} details`}>
                {product.thumbnail
                  ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.thumbnail} alt={product.title} loading="lazy" />
                  )
                  : <span className={styles.imageFallback}>VIBEYA</span>}
              </Link>
              <div className={styles.cardText}>
                <h2><Link href={`/${countryCode}/products/${product.handle}`}>{product.title}</Link></h2>
                <p>{product.price === null ? copy.priceUnavailable : formatter.format(product.price)}</p>
              </div>
            </article>
          ))}
        </div>
      ) : <p className={styles.empty}>{copy.empty}</p>}
    </>
  )
}
