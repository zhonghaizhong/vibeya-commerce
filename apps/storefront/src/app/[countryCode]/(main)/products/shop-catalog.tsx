import Link from "next/link"

import { getMarketLocaleUrl } from "@lib/util/market-locale"
import { toJsonLd } from "@lib/util/product-structured-data"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { PRODUCT_CATEGORY_GROUPS, type ProductCategoryGroup } from "@lib/seo/categories"
import type { HttpTypes } from "@medusajs/types"
import ShopProductGrid from "./shop-product-grid"
import type { ShopCopy } from "./shop-copy"
import styles from "./shop-all.module.css"

export default async function ShopCatalog({
  countryCode,
  locale,
  currency,
  products,
  allProducts,
  copy,
  category,
}: {
  countryCode: string
  locale: string
  currency: string
  products: HttpTypes.StoreProduct[]
  allProducts: HttpTypes.StoreProduct[]
  copy: ShopCopy
  category?: ProductCategoryGroup
}) {
  const origin = await getSiteOrigin()
  const pagePath = category ? `/categories/${category.slug}` : "/products"
  const pageUrl = `${origin}/${countryCode}${pagePath}`
  const pageTitle = category?.label ?? copy.heading
  const pageDescription = category?.description ?? copy.description
  const productListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: pageTitle,
    description: pageDescription,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/${countryCode}/products/${product.handle}`,
        name: product.title,
      })),
    },
  }
  const availableHandles = new Set(allProducts.map((product) => product.handle))
  const visibleCategories = countryCode.toLowerCase() === "us"
    ? PRODUCT_CATEGORY_GROUPS.filter((group) => group.productHandles.some((handle) => availableHandles.has(handle)))
    : []
  const homeLabel = locale === "ja-JP" ? "ホーム" : locale === "es-MX" ? "Inicio" : "Home"
  const shopLabel = locale === "ja-JP" ? "商品一覧" : locale === "es-MX" ? "CATÁLOGO" : "SHOP"
  const categoryNavLabel = locale === "ja-JP" ? "商品カテゴリー" : "Product categories"

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(productListSchema) }} />
      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={getMarketLocaleUrl(origin, countryCode, "/", locale)}>{homeLabel}</Link>
          <span aria-hidden="true">/</span>
          {category && <>
            <Link href={getMarketLocaleUrl(origin, countryCode, "/products", locale)}>{copy.all}</Link>
            <span aria-hidden="true">/</span>
          </>}
          <span aria-current="page">{category?.label ?? copy.all}</span>
        </nav>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{STORE_NAME} / {shopLabel}</p>
          <h1>{category?.label ?? copy.heading}</h1>
          <p>{category?.description ?? copy.intro}</p>
        </header>
        <nav className={styles.categories} aria-label={categoryNavLabel}>
          {category
            ? <Link href={getMarketLocaleUrl(origin, countryCode, "/products", locale)}>{copy.all}</Link>
            : <span className={styles.activeCategory}>{copy.all}</span>}
          {visibleCategories.map((item) => item.slug === category?.slug
            ? <span key={item.slug} className={styles.activeCategory} aria-current="page">{item.label}</span>
            : <Link key={item.slug} href={getMarketLocaleUrl(origin, countryCode, `/categories/${item.slug}`, locale)}>{item.label}</Link>)}
        </nav>
        <ShopProductGrid
          countryCode={countryCode}
          locale={locale}
          currency={currency}
          products={products.map((product) => {
            const amounts = (product.variants ?? [])
              .map((variant) => variant.calculated_price?.calculated_amount)
              .filter((amount): amount is number => typeof amount === "number")
            return {
              handle: product.handle,
              title: product.title,
              subtitle: product.subtitle ?? "",
              thumbnail: product.thumbnail,
              price: amounts.length ? Math.min(...amounts) : null,
            }
          })}
          copy={copy}
        />
      </div>
    </main>
  )
}
