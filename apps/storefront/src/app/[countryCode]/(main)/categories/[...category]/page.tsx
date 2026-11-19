import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import {
  getMarketAlternateUrls,
  getMarketDefaultLocale,
} from "@lib/util/market-locale"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import VibeyaHome from "../../vibeya-home"
import { getVibeyaMarket } from "@lib/vibeya/region"
import {
  getProductCategoryGroup,
  getProductCategoryMarketCopy,
  isProductCategoryIndexable,
} from "@lib/seo/categories"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, countryCode } = await props.params
  const group = getProductCategoryGroup(category.at(-1) ?? "")
  if (!group) notFound()

  const fallbackGroup = getProductCategoryMarketCopy(
    group,
    getMarketDefaultLocale(countryCode)
  )
  const market = await getVibeyaMarket(countryCode).catch(() => null)
  const managed = market?.category_content?.[group.slug]
  const localeCopy = managed?.locales?.[getMarketDefaultLocale(countryCode)]
  const localizedGroup = {
    ...fallbackGroup,
    label: localeCopy?.label || managed?.label || fallbackGroup.label,
    seoTitle: localeCopy?.seoTitle || fallbackGroup.seoTitle,
    description: localeCopy?.description || fallbackGroup.description,
  }
  const origin = await getSiteOrigin()
  const categoryPath = `/categories/${group.slug}`
  const canonical = `${origin}/${countryCode}${categoryPath}`
  const hasMarketProduct = (managed?.productHandles ?? group.productHandles).some((productHandle) => market?.handles.includes(productHandle))
  const hasLocalizedCopy = Boolean(localeCopy?.seoTitle?.trim() && localeCopy.description?.trim())
  const indexed = hasMarketProduct && (hasLocalizedCopy || isProductCategoryIndexable(group.slug, countryCode))
  const categoryMarkets = await Promise.all(["us", "ca", "jp", "mx"].map(async (marketCountry) => {
    const marketData = marketCountry === countryCode ? market : await getVibeyaMarket(marketCountry).catch(() => null)
    const marketCategory = marketData?.category_content?.[group.slug]
    const copy = marketCategory?.locales?.[getMarketDefaultLocale(marketCountry)]
    const hasCopy = marketCategory
      ? Boolean(copy?.seoTitle?.trim() && copy.description?.trim())
      : isProductCategoryIndexable(group.slug, marketCountry)
    const hasProduct = (marketCategory?.productHandles ?? group.productHandles).some((handle) => marketData?.handles.includes(handle))
    return hasCopy && hasProduct ? marketCountry : null
  }))
  const eligibleMarkets = categoryMarkets.filter((marketCountry): marketCountry is string => Boolean(marketCountry))

  return {
    title: localizedGroup.seoTitle,
    description: localizedGroup.description,
    robots: { index: indexed, follow: true },
    alternates: {
      canonical,
      languages: getMarketAlternateUrls(
        origin,
        categoryPath,
        eligibleMarkets
      ),
    },
    openGraph: {
      type: "website",
      title: `${localizedGroup.label} | ${STORE_NAME}`,
      description: localizedGroup.description,
      url: canonical,
      siteName: STORE_NAME,
    },
  }
}

export default async function CategoryPage(props: Props) {
  const { category, countryCode } = await props.params
  const handle = category.at(-1) ?? ""
  const group = getProductCategoryGroup(handle)
  if (!group) notFound()

  if (category.join("/") !== group.slug) notFound()

  const fallbackGroup = getProductCategoryMarketCopy(
    group,
    getMarketDefaultLocale(countryCode)
  )
  const market = await getVibeyaMarket(countryCode).catch(() => null)
  const managed = market?.category_content?.[group.slug]
  const localeCopy = managed?.locales?.[getMarketDefaultLocale(countryCode)]
  const localizedGroup = {
    ...fallbackGroup,
    label: localeCopy?.label || managed?.label || fallbackGroup.label,
  }
  const customer = await retrieveCustomer().catch(() => null)
  return (
    <VibeyaHome
      countryCode={countryCode}
      isAuthenticated={Boolean(customer)}
      listing={{
        category: localizedGroup.label,
        title: localizedGroup.label,
        slug: group.slug,
        handles: [...(managed?.productHandles ?? group.productHandles)],
      }}
    />
  )
}
