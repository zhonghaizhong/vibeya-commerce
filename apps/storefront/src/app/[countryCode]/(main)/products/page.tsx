import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getMarketAlternateUrls, getMarketLocale, getMarketLocaleUrl } from "@lib/util/market-locale"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { getVibeyaMarket } from "@lib/vibeya/region"
import ShopCatalog from "./shop-catalog"
import { SHOP_COPY } from "./shop-copy"
import { getShopData } from "./shop-data"

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ locale?: string }>
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
  return (
    <ShopCatalog
      countryCode={countryCode}
      locale={locale}
      currency={region.currency_code.toUpperCase()}
      products={products}
      allProducts={products}
      copy={copy}
    />
  )
}
