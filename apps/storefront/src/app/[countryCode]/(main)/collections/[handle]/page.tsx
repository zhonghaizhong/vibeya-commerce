import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      page?: string
      sortBy?: SortOptions
      optionValueIds?: string | string[]
    }
  >
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  const origin = await getSiteOrigin()
  const canonical = `${origin}/${params.countryCode}/collections/${encodeURIComponent(params.handle)}`
  const metadata = {
    title: `${collection.title} | ${STORE_NAME}`,
    description: `Shop the ${collection.title} collection at VIBEYA. Discover original graphic apparel made to order, with free U.S. shipping.`,
    robots: {
      index: (collection.products?.length ?? 0) > 0,
      follow: true,
    },
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${collection.title} | ${STORE_NAME}`,
      description: `Shop the ${collection.title} collection at VIBEYA. Discover original graphic apparel made to order, with free U.S. shipping.`,
      url: canonical,
      siteName: STORE_NAME,
    },
  } as Metadata

  return metadata
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const collection = await getCollectionByHandle(params.handle).then(
    (collection) => collection
  )

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
    />
  )
}
