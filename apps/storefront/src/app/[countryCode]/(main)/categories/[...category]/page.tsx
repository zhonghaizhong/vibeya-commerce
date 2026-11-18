import { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import {
  getMarketAlternateUrls,
  getMarketDefaultLocale,
} from "@lib/util/market-locale"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import VibeyaHome from "../../vibeya-home"
import {
  getProductCategoryGroup,
  getProductCategoryIndexableMarkets,
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

  const localizedGroup = getProductCategoryMarketCopy(
    group,
    getMarketDefaultLocale(countryCode)
  )
  const origin = await getSiteOrigin()
  const categoryPath = `/categories/${group.slug}`
  const canonical = `${origin}/${countryCode}${categoryPath}`
  const indexed = isProductCategoryIndexable(group.slug, countryCode)

  return {
    title: localizedGroup.seoTitle,
    description: localizedGroup.description,
    robots: { index: indexed, follow: true },
    alternates: {
      canonical,
      languages: getMarketAlternateUrls(
        origin,
        categoryPath,
        getProductCategoryIndexableMarkets(group.slug)
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

  if (category.join("/") !== group.slug) {
    permanentRedirect(`/${countryCode}/categories/${group.slug}`)
  }

  const localizedGroup = getProductCategoryMarketCopy(
    group,
    getMarketDefaultLocale(countryCode)
  )
  const customer = await retrieveCustomer().catch(() => null)
  return (
    <VibeyaHome
      countryCode={countryCode}
      isAuthenticated={Boolean(customer)}
      listing={{
        category: localizedGroup.label,
        title: localizedGroup.label,
        slug: group.slug,
        handles: [...group.productHandles],
      }}
    />
  )
}
