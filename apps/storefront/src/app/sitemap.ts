import { sdk } from "@lib/config"
import { listRegions } from "@lib/data/regions"
import {
  DEFAULT_COUNTRY_CODE,
  getSiteOrigin,
  listCountryCodes,
} from "@lib/util/site"
import type { MetadataRoute } from "next"

export const dynamic = "force-dynamic"

const STATIC_PATHS = [
  "",
  "/shipping",
  "/returns",
  "/terms",
  "/privacy",
  "/contact",
]
const INDEXABLE_CONTENT_PATHS = [
  "/vibeya/inspiration/index.html",
  "/vibeya/inspiration/midnight-cat-cafe-custom-tumbler.html",
  "/vibeya/inspiration/hoodie-orbit-bloom.html",
  "/vibeya/inspiration/funny-skeleton-lazy-mood.html",
  "/vibeya/inspiration/duck-bubble-trouble-custom-bath-mat.html",
  "/vibeya/inspiration/no-nightmares-jesus-blanket.html",
  "/vibeya/inspiration/low-battery-club-custom-beanie.html",
  "/vibeya/inspiration/cat-bubble-cats-custom-shower-curtain.html",
  "/vibeya/inspiration/deadpan-penguin-custom-tankini.html",
]
const PAGE_SIZE = 200

type Page<T> = { items: T[]; count: number }

async function listAll<T>(fetchPage: (offset: number) => Promise<Page<T>>) {
  const all: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { items, count } = await fetchPage(offset)
    all.push(...items)
    if (offset + PAGE_SIZE >= count || !items.length) {
      return all
    }
  }
}

async function safelyListAll<T>(fetchPage: (offset: number) => Promise<Page<T>>) {
  try {
    return await listAll(fetchPage)
  } catch {
    return [] as T[]
  }
}

type Entry = {
  handle?: string | null
  updated_at?: string | Date | null
  products?: unknown[] | null
  category_children?: unknown[] | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const query = { fields: "handle,updated_at", limit: PAGE_SIZE }

  const [origin, regions, products, categories, collections] =
    await Promise.all([
      getSiteOrigin(),
      listRegions().catch(() => []),
      safelyListAll<Entry>((offset) =>
        sdk.store.product
          .list({ ...query, offset })
          .then((res) => ({ items: res.products, count: res.count }))
      ),
      safelyListAll<Entry>((offset) =>
        sdk.store.category
          .list({ ...query, fields: "handle,updated_at,*products,*category_children", offset })
          .then((res) => ({ items: res.product_categories, count: res.count }))
      ),
      safelyListAll<Entry>((offset) =>
        sdk.store.collection
          .list({ ...query, fields: "handle,updated_at,*products", offset })
          .then((res) => ({ items: res.collections, count: res.count }))
      ),
    ])

  const toEntries = (base: string, prefix: string, items: Entry[]) =>
    items
      .filter((item) => item.handle)
      .map((item) => ({
        url: `${base}/${prefix}/${item.handle}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : undefined,
      }))

  const countryCodes = listCountryCodes(regions)
  const localizedEntries = (countryCodes.length ? countryCodes : [DEFAULT_COUNTRY_CODE]).flatMap((countryCode) => {
    const base = `${origin}/${countryCode}`
    return [
      ...STATIC_PATHS.map((path) => ({ url: `${base}${path}` })),
      ...toEntries(base, "products", products),
      ...toEntries(
        base,
        "categories",
        categories.filter((category) => (category.products?.length ?? 0) > 0 || (category.category_children?.length ?? 0) > 0)
      ),
      ...toEntries(
        base,
        "collections",
        collections.filter((collection) => (collection.products?.length ?? 0) > 0)
      ),
    ]
  })

  return [
    ...localizedEntries,
    ...INDEXABLE_CONTENT_PATHS.map((path) => ({ url: `${origin}${path}` })),
  ]
}
