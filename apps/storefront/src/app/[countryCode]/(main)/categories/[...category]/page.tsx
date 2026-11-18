import { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import VibeyaHome from "../../vibeya-home"
import {
  getProductCategoryGroup,
  isProductCategoryIndexable,
} from "@lib/seo/categories"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, countryCode } = await props.params
  const group = getProductCategoryGroup(category.at(-1) ?? "")
  if (!group) notFound()

  const origin = await getSiteOrigin()
  const canonical = `${origin}/${countryCode}/categories/${group.slug}`
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
  const { category, countryCode } = await props.params
  const handle = category.at(-1) ?? ""
  const group = getProductCategoryGroup(handle)
  if (!group) notFound()

  if (category.join("/") !== group.slug) {
    permanentRedirect(`/${countryCode}/categories/${group.slug}`)
  }

  const customer = await retrieveCustomer().catch(() => null)
  return (
    <VibeyaHome
      countryCode={countryCode}
      isAuthenticated={Boolean(customer)}
      listing={{
        category: group.label,
        title: group.label,
        slug: group.slug,
        handles: [...group.productHandles],
      }}
    />
  )
}
