import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle } from "@lib/data/categories"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      optionValueIds?: string | string[]
    }
  >
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(params.category)
    const origin = await getSiteOrigin()
    const path = `/categories/${params.category.map(encodeURIComponent).join("/")}`
    const title = `${productCategory.name} | ${STORE_NAME}`
    const description =
      productCategory.description?.trim().slice(0, 160) ||
      `Shop ${productCategory.name.toLowerCase()} at VIBEYA. Discover original graphic apparel, made to order with free U.S. shipping.`

    return {
      title,
      description,
      robots: {
        index: (productCategory.products?.length ?? 0) > 0 || (productCategory.category_children?.length ?? 0) > 0,
        follow: true,
      },
      alternates: { canonical: `${origin}/${params.countryCode}${path}` },
      openGraph: {
        type: "website",
        title,
        description,
        url: `${origin}/${params.countryCode}${path}`,
        siteName: STORE_NAME,
      },
    }
  } catch {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
    />
  )
}
