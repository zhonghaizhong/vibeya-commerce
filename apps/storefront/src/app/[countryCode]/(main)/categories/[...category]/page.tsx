import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import {
  getMarketAlternateUrls,
  getMarketDefaultLocale,
  getMarketLocale,
} from "@lib/util/market-locale"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import VibeyaHome from "../../vibeya-home"
import { getVibeyaMarket } from "@lib/vibeya/region"
import { getCategoryByHandle } from "@lib/data/categories"
import {
  getProductCategoryGroup,
  getProductCategoryMarketCopy,
  isProductCategoryIndexable,
} from "@lib/seo/categories"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{ locale?: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [{ category, countryCode }, searchParams] = await Promise.all([props.params, props.searchParams])
  const handle = category.at(-1) ?? ""
  const group = getProductCategoryGroup(handle)
  if (!group) {
    if (category.length !== 1) notFound()
    const nativeCategory = await getCategoryByHandle([handle]).catch(() => null)
    const market = await getVibeyaMarket(countryCode).catch(() => null)
    const managed = market?.category_content?.[handle]
    const locale = getMarketDefaultLocale(countryCode)
    const localeCopy = managed?.locales?.[locale]
    const categoryHandles = Array.from(new Set([
      ...(managed?.productHandles ?? []),
      ...(market?.category_groups?.find((item) => item.handle === handle)?.productHandles ?? []),
      ...(nativeCategory?.products ?? []).map((product) => product.handle),
    ]))
      .filter((productHandle): productHandle is string => Boolean(productHandle && market?.handles.includes(productHandle)))
    if (!nativeCategory || !categoryHandles.length) notFound()
    const origin = await getSiteOrigin()
    const path = `/categories/${nativeCategory.handle}`
    const title = localeCopy?.seoTitle?.trim() || `${nativeCategory.name} | ${STORE_NAME}`
    const description = localeCopy?.description?.trim() || nativeCategory.description?.trim() || `${nativeCategory.name} products available from VIBEYA.`
    const categoryMarkets = await Promise.all(["us", "ca", "jp", "mx"].map(async (marketCountry) => {
      const marketData = marketCountry === countryCode ? market : await getVibeyaMarket(marketCountry).catch(() => null)
      const copy = marketData?.category_content?.[handle]?.locales?.[getMarketDefaultLocale(marketCountry)]
      const configuredHandles = [
        ...(marketData?.category_content?.[handle]?.productHandles ?? []),
        ...(marketData?.category_groups?.find((category) => category.handle === handle)?.productHandles ?? []),
      ]
      const hasProduct = configuredHandles.some((productHandle) => marketData?.handles.includes(productHandle))
      return copy?.seoTitle?.trim() && copy.description?.trim() && hasProduct ? marketCountry : null
    }))
    const eligibleMarkets = categoryMarkets.filter((marketCountry): marketCountry is string => Boolean(marketCountry))
    return {
      title,
      description,
      robots: { index: Boolean(localeCopy?.seoTitle?.trim() && localeCopy.description?.trim() && categoryHandles.length), follow: true },
      alternates: {
        canonical: `${origin}/${countryCode}${path}`,
        languages: getMarketAlternateUrls(origin, path, eligibleMarkets),
      },
      openGraph: { type: "website", title, description, url: `${origin}/${countryCode}${path}`, siteName: STORE_NAME },
    }
  }

  const currentLocale = getMarketLocale(countryCode, searchParams.locale)
  const fallbackGroup = getProductCategoryMarketCopy(group, currentLocale)
  const market = await getVibeyaMarket(countryCode).catch(() => null)
  const managed = market?.category_content?.[group.slug]
  const nativeHandles = market?.category_groups?.find((category) => category.handle === group.slug)?.productHandles ?? []
  const categoryHandles = Array.from(new Set([...group.productHandles, ...(managed?.productHandles ?? []), ...nativeHandles]))
    .filter((productHandle) => market?.handles.includes(productHandle))
  const localeCopy = managed?.locales?.[currentLocale]
  const localizedGroup = {
    ...fallbackGroup,
    label: localeCopy?.label || managed?.label || fallbackGroup.label,
    seoTitle: localeCopy?.seoTitle || fallbackGroup.seoTitle,
    description: localeCopy?.description || fallbackGroup.description,
  }
  const origin = await getSiteOrigin()
  const categoryPath = `/categories/${group.slug}`
  const canonical = `${origin}/${countryCode}${categoryPath}`
  const hasMarketProduct = categoryHandles.length > 0
  const hasLocalizedCopy = Boolean(localeCopy?.seoTitle?.trim() && localeCopy.description?.trim())
  const indexed = hasMarketProduct && (hasLocalizedCopy || isProductCategoryIndexable(group.slug, countryCode))
  const categoryMarkets = await Promise.all(["us", "ca", "jp", "mx"].map(async (marketCountry) => {
    const marketData = marketCountry === countryCode ? market : await getVibeyaMarket(marketCountry).catch(() => null)
    const marketCategory = marketData?.category_content?.[group.slug]
    const copy = marketCategory?.locales?.[getMarketDefaultLocale(marketCountry)]
    const hasCopy = marketCategory
      ? Boolean(copy?.seoTitle?.trim() && copy.description?.trim())
      : isProductCategoryIndexable(group.slug, marketCountry)
    const nativeHandles = marketData?.category_groups?.find((category) => category.handle === group.slug)?.productHandles ?? []
    const configuredHandles = Array.from(new Set([...group.productHandles, ...(marketCategory?.productHandles ?? []), ...nativeHandles]))
    const hasProduct = configuredHandles.some((handle) => marketData?.handles.includes(handle))
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
  const [{ category, countryCode }, searchParams] = await Promise.all([props.params, props.searchParams])
  const handle = category.at(-1) ?? ""
  const group = getProductCategoryGroup(handle)
  if (!group) {
    if (category.length !== 1) notFound()
    const nativeCategory = await getCategoryByHandle([handle]).catch(() => null)
    const market = await getVibeyaMarket(countryCode).catch(() => null)
    const managed = market?.category_content?.[handle]
    const localeCopy = managed?.locales?.[getMarketLocale(countryCode, searchParams.locale)]
    const nativeHandles = market?.category_groups?.find((category) => category.handle === handle)?.productHandles ?? []
    const handles = Array.from(new Set([
      ...(managed?.productHandles ?? []),
      ...nativeHandles,
      ...(nativeCategory?.products ?? []).map((product) => product.handle),
    ]))
      .filter((productHandle): productHandle is string => Boolean(productHandle && market?.handles.includes(productHandle)))
    if (!nativeCategory || !handles.length) notFound()
    const customer = await retrieveCustomer().catch(() => null)
    return (
      <VibeyaHome
        countryCode={countryCode}
        locale={searchParams.locale}
        isAuthenticated={Boolean(customer)}
        listing={{
          category: localeCopy?.label || managed?.label || nativeCategory.name,
          title: localeCopy?.label || managed?.label || nativeCategory.name,
          slug: nativeCategory.handle,
          handles,
          description: localeCopy?.description || nativeCategory.description || "",
        }}
      />
    )
  }

  if (category.join("/") !== group.slug) notFound()

  const currentLocale = getMarketLocale(countryCode, searchParams.locale)
  const fallbackGroup = getProductCategoryMarketCopy(group, currentLocale)
  const market = await getVibeyaMarket(countryCode).catch(() => null)
  const managed = market?.category_content?.[group.slug]
  const nativeHandles = market?.category_groups?.find((category) => category.handle === group.slug)?.productHandles ?? []
  const handles = Array.from(new Set([...group.productHandles, ...(managed?.productHandles ?? []), ...nativeHandles]))
    .filter((productHandle) => market?.handles.includes(productHandle))
  const localeCopy = managed?.locales?.[currentLocale]
  const localizedGroup = {
    ...fallbackGroup,
    label: localeCopy?.label || managed?.label || fallbackGroup.label,
  }
  const customer = await retrieveCustomer().catch(() => null)
  return (
    <VibeyaHome
      countryCode={countryCode}
      locale={searchParams.locale}
      isAuthenticated={Boolean(customer)}
      listing={{
        category: localizedGroup.label,
        title: localizedGroup.label,
        slug: group.slug,
        handles,
        description: localizedGroup.description,
      }}
    />
  )
}
