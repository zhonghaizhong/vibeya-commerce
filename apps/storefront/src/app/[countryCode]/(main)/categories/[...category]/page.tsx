import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import { getMarketLocale } from "@lib/util/market-locale"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import {
  getProductCategoryGroup,
  isProductCategoryIndexable,
} from "@lib/seo/categories"
import ShopCatalog from "../../products/shop-catalog"
import { SHOP_COPY } from "../../products/shop-copy"
import { getShopData } from "../../products/shop-data"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{ locale?: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, countryCode } = await props.params
  const group = getProductCategoryGroup(category.at(-1) ?? "")
  if (!group) notFound()

  const origin = await getSiteOrigin()
  const canonical = `${origin}/${countryCode.toLowerCase()}/categories/${group.slug}`
  const indexed = isProductCategoryIndexable(group.slug, countryCode)

  return {
    title: group.seoTitle,
    description: group.description,
    robots: { index: indexed, follow: true },
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${group.label} | ${STORE_NAME}`,
      description: group.description,
      url: canonical,
      siteName: STORE_NAME,
    },
  }
}

export default async function CategoryPage(props: Props) {
  const [{ category, countryCode }, search] = await Promise.all([
    props.params,
    props.searchParams,
  ])
  const group = getProductCategoryGroup(category.at(-1) ?? "")
  if (!group) notFound()

  if (category.join("/") !== group.slug) {
    permanentRedirect(`/${countryCode.toLowerCase()}/categories/${group.slug}`)
  }

  const locale = getMarketLocale(countryCode, search.locale)
  const data = await getShopData(countryCode, locale)
  if (!data) notFound()

  const handles = new Set(group.productHandles)
  const categoryProducts = data.products.filter((product) => handles.has(product.handle))
  if (!categoryProducts.length) notFound()

  const copy = SHOP_COPY[locale] ?? SHOP_COPY["en-US"]

  return (
    <ShopCatalog
      countryCode={countryCode.toLowerCase()}
      locale={locale}
      currency={data.region.currency_code.toUpperCase()}
      products={categoryProducts}
      allProducts={data.products}
      copy={copy}
      category={group}
    />
  )
}
