import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getMarketAlternateUrls, getMarketLocale, getMarketLocaleUrl } from "@lib/util/market-locale"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { toJsonLd } from "@lib/util/product-structured-data"
import { getVibeyaMarket } from "@lib/vibeya/region"
import { PRODUCT_CATEGORY_GROUPS } from "@lib/seo/categories"
import styles from "./shop-all.module.css"
import ShopProductGrid from "./shop-product-grid"

type ShopCopy = {
  title: string
  description: string
  heading: string
  intro: string
  all: string
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

const SHOP_COPY: Record<string, ShopCopy> = {
  "en-US": {
    title: "Shop Custom Products: Personalized Apparel, Home & Gifts | VIBEYA",
    description: "Shop custom apparel, tumblers, blankets, bath products, and home decor. Browse products available in the United States and create a design made for you.",
    heading: "Shop custom products",
    intro: "Browse customizable apparel, drinkware, and home products available in the United States.",
    all: "All products",
    search: "Search products",
    sort: "Sort products",
    featured: "Featured",
    name: "Name: A to Z",
    priceLow: "Price: low to high",
    priceHigh: "Price: high to low",
    countPrefix: "Showing ",
    countSuffix: " products",
    empty: "No products match your search.",
    priceUnavailable: "See product for pricing",
  },
  "en-CA": {
    title: "Shop Custom Products in Canada | VIBEYA",
    description: "Shop custom apparel, drinkware, blankets, and home products available in Canada. Browse the collection and make a design your own.",
    heading: "Shop custom products",
    intro: "Browse customizable apparel, drinkware, and home products available in Canada.",
    all: "All products",
    search: "Search products",
    sort: "Sort products",
    featured: "Featured",
    name: "Name: A to Z",
    priceLow: "Price: low to high",
    priceHigh: "Price: high to low",
    countPrefix: "Showing ",
    countSuffix: " products",
    empty: "No products match your search.",
    priceUnavailable: "See product for pricing",
  },
  "ja-JP": {
    title: "カスタム商品一覧｜オリジナルウェア・ギフト | VIBEYA",
    description: "日本で購入できるカスタムウェア、タンブラー、ブランケット、ホーム用品をご覧ください。自分だけのデザインを作成できます。",
    heading: "カスタム商品一覧",
    intro: "日本で購入できるカスタムウェア、ドリンクウェア、ホーム用品をご覧ください。",
    all: "すべての商品",
    search: "商品を検索",
    sort: "並び替え",
    featured: "おすすめ順",
    name: "名前順：A～Z",
    priceLow: "価格の安い順",
    priceHigh: "価格の高い順",
    countPrefix: "",
    countSuffix: " 件の商品",
    empty: "検索条件に一致する商品はありません。",
    priceUnavailable: "価格は商品ページをご確認ください",
  },
  "es-MX": {
    title: "Productos personalizados | Ropa, hogar y regalos | VIBEYA",
    description: "Compra ropa, vasos, mantas y artículos para el hogar personalizables disponibles en México. Explora los productos y crea un diseño propio.",
    heading: "Productos personalizados",
    intro: "Explora ropa, vasos y artículos para el hogar personalizables disponibles en México.",
    all: "Todos los productos",
    search: "Buscar productos",
    sort: "Ordenar productos",
    featured: "Destacados",
    name: "Nombre: A a Z",
    priceLow: "Precio: menor a mayor",
    priceHigh: "Precio: mayor a menor",
    countPrefix: "",
    countSuffix: " productos",
    empty: "No hay productos que coincidan con la búsqueda.",
    priceUnavailable: "Consulta el precio en el producto",
  },
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ locale?: string }>
}

async function getShopData(countryCode: string, locale?: string) {
  const normalizedCountry = countryCode.toLowerCase()
  const market = await getVibeyaMarket(normalizedCountry).catch(() => null)
  if (!market?.region || !market.handles.length) return null

  const [{ response }, region] = await Promise.all([
    listProducts({
      countryCode: normalizedCountry,
      queryParams: { limit: 100, locale: getMarketLocale(normalizedCountry, locale) },
    }),
    getRegion(normalizedCountry),
  ])

  if (!region) return null
  const availableHandles = new Set(market.handles)
  const products = response.products.filter((product) => availableHandles.has(product.handle))
  return products.length ? { products, region } : null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [{ countryCode }, search] = await Promise.all([props.params, props.searchParams])
  const locale = getMarketLocale(countryCode, search.locale)
  const copy = SHOP_COPY[locale] ?? SHOP_COPY["en-US"]
  const origin = await getSiteOrigin()
  const path = "/products"
  const canonical = getMarketLocaleUrl(origin, countryCode, path, locale)
  const eligibleCountries = await Promise.all(
    ["us", "ca", "jp", "mx"].map(async (marketCountry) => {
      const market = await getVibeyaMarket(marketCountry).catch(() => null)
      return market?.handles.length ? marketCountry : null
    })
  ).then((codes) => codes.filter((code): code is string => code !== null))

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical,
      languages: getMarketAlternateUrls(origin, path, eligibleCountries),
    },
    openGraph: {
      type: "website",
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: STORE_NAME,
    },
  }
}

export default async function ShopAllPage(props: Props) {
  const [{ countryCode }, search] = await Promise.all([props.params, props.searchParams])
  const locale = getMarketLocale(countryCode, search.locale)
  const copy = SHOP_COPY[locale] ?? SHOP_COPY["en-US"]
  const data = await getShopData(countryCode, locale)
  if (!data) notFound()

  const { products, region } = data
  const currency = region.currency_code.toUpperCase()
  const origin = await getSiteOrigin()
  const pageUrl = `${origin}/${countryCode}/products`
  const productListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.heading,
    description: copy.description,
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

  const availableHandles = new Set(products.map((product) => product.handle))
  const visibleCategories = countryCode === "us"
    ? PRODUCT_CATEGORY_GROUPS.filter((group) => group.productHandles.some((handle) => availableHandles.has(handle)))
    : []

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(productListSchema) }} />
      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={`/${countryCode}/`}>{locale === "ja-JP" ? "ホーム" : locale === "es-MX" ? "Inicio" : "Home"}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{copy.all}</span>
        </nav>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{STORE_NAME} / {locale === "ja-JP" ? "商品一覧" : locale === "es-MX" ? "CATÁLOGO" : "SHOP"}</p>
          <h1>{copy.heading}</h1>
          <p>{copy.intro}</p>
        </header>
        <nav className={styles.categories} aria-label={locale === "ja-JP" ? "商品カテゴリー" : "Product categories"}>
          <span className={styles.activeCategory}>{copy.all}</span>
          {visibleCategories.map((category) => (
            <Link key={category.slug} href={`/${countryCode}/categories/${category.slug}`}>
              {category.label}
            </Link>
          ))}
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
