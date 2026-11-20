import { sdk } from "@lib/config"
import { listRegions } from "@lib/data/regions"
import { getMarketAlternateUrls, getMarketDefaultLocale } from "@lib/util/market-locale"
import { DEFAULT_COUNTRY_CODE, getSiteOrigin, listCountryCodes } from "@lib/util/site"
import { getVibeyaMarket } from "@lib/vibeya/region"
import { isSupportedMarketCountry } from "@lib/vibeya/markets"
import {
  isProductCategoryIndexable,
  PRODUCT_CATEGORY_GROUPS,
} from "@lib/seo/categories"
import type { MetadataRoute } from "next"

export const dynamic = "force-dynamic"

const STATIC_PATHS = ["", "/shipping", "/returns", "/terms", "/privacy", "/contact"]
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
  "/vibeya/inspiration/custom-kids-basketball-jersey-set.html",
  "/vibeya/inspiration/sauce-boss-custom-cooking-apron.html",
  "/vibeya/inspiration/stars-stripes-custom-denim-baseball-cap.html",
  "/vibeya/inspiration/raccoon-bar-crew-custom-metal-wall-sign.html",
]
const YOGA_INSPIRATION_PATHS = {
  "en-US": "/vibeya/inspiration/animal-yoga-set.html",
  "en-CA": "/ca/inspiration/animal-yoga-set",
  "es-MX": "/mx/inspiration/animal-yoga-set",
  "ja-JP": "/jp/inspiration/animal-yoga-set",
} as const
const PAGE_SIZE = 200

type Page<T> = { items: T[]; count: number }
type Entry = {
  id?: string | null
  handle?: string | null
  updated_at?: string | Date | null
  products?: unknown[] | null
}

async function listAll<T>(fetchPage: (offset: number) => Promise<Page<T>>) {
  const all: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { items, count } = await fetchPage(offset)
    all.push(...items)
    if (offset + PAGE_SIZE >= count || !items.length) return all
  }
}

async function safelyListAll<T>(fetchPage: (offset: number) => Promise<Page<T>>) {
  try {
    return await listAll(fetchPage)
  } catch {
    return [] as T[]
  }
}

const getProductIds = (entry: Entry) =>
  (entry.products ?? []).flatMap((product) => {
    if (typeof product === "string") return [product]
    if (product && typeof product === "object" && "id" in product && typeof product.id === "string") {
      return [product.id]
    }
    return []
  })

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const query = { fields: "id,handle,updated_at", limit: PAGE_SIZE }
  const [origin, regions, products, collections] = await Promise.all([
    getSiteOrigin(),
    listRegions().catch(() => []),
    safelyListAll<Entry>((offset) =>
      sdk.store.product.list({ ...query, offset }).then((res) => ({ items: res.products, count: res.count }))
    ),
    safelyListAll<Entry>((offset) =>
      sdk.store.collection
        .list({ ...query, fields: "id,handle,updated_at,*products", offset })
        .then((res) => ({ items: res.collections, count: res.count }))
    ),
  ])

  const configured = listCountryCodes(regions).filter(isSupportedMarketCountry)
  const countryCodes = configured.length ? configured : [DEFAULT_COUNTRY_CODE].filter(isSupportedMarketCountry)
  const marketResults = await Promise.all(countryCodes.map(async (countryCode) => {
    const market = await getVibeyaMarket(countryCode).catch(() => null)
    return [countryCode, {
      productIds: new Set(market?.product_ids ?? []),
      handles: new Set(market?.handles ?? []),
      categories: market?.category_content ?? {},
    }] as const
  }))
  const marketsByCountry = new Map<string, (typeof marketResults)[number][1]>(marketResults)
  const productsByCountry = new Map<string, Set<string>>(marketResults.map(([countryCode, market]) => [countryCode, market.productIds]))
  const countriesByProduct = new Map<string, string[]>()
  productsByCountry.forEach((ids, countryCode) => {
    ids.forEach((id) => countriesByProduct.set(id, [...(countriesByProduct.get(id) ?? []), countryCode]))
  })

  const localizedEntries = countryCodes.flatMap((countryCode) => {
    const base = `${origin}/${countryCode}`
    const availableIds = productsByCountry.get(countryCode) ?? new Set<string>()
    const isManagedCategoryIndexable = (slug: string, targetCountry: string) => {
      const category = marketsByCountry.get(targetCountry)?.categories?.[slug]
      if (!category) return isProductCategoryIndexable(slug, targetCountry)
      const copy = category.locales?.[getMarketDefaultLocale(targetCountry)]
      const hasCopy = Boolean(copy?.seoTitle?.trim() && copy.description?.trim())
      const handles = category.productHandles?.length ? category.productHandles : []
      const hasProduct = handles.some((handle) => marketsByCountry.get(targetCountry)?.handles.has(handle))
      return hasCopy && hasProduct
    }
    const alternateUrls = (path: string, eligibleCountries: string[]) =>
      getMarketAlternateUrls(origin, path, eligibleCountries)
    const productEntries = products
      .filter((item) => item.id && item.handle && availableIds.has(item.id))
      .map((item) => {
        const path = `/products/${item.handle}`
        return {
          url: `${base}${path}`,
          lastModified: item.updated_at ? new Date(item.updated_at) : undefined,
          alternates: { languages: alternateUrls(path, countriesByProduct.get(item.id!) ?? []) },
        }
      })
    const productCategoryEntries = PRODUCT_CATEGORY_GROUPS
      .filter((group) => isManagedCategoryIndexable(group.slug, countryCode))
      .map((group) => {
        const path = `/categories/${group.slug}`
        const eligibleCountries = countryCodes.filter((marketCountry) =>
          isManagedCategoryIndexable(group.slug, marketCountry)
        )
        return {
          url: `${base}${path}`,
          alternates: { languages: alternateUrls(path, eligibleCountries) },
        }
      })
    const fixedCategoryHandles = new Set(PRODUCT_CATEGORY_GROUPS.flatMap((group) => [group.slug, ...group.legacyHandles]))
    const dynamicCategorySlugs = new Set(
      [...marketsByCountry.values()].flatMap((market) => Object.keys(market.categories ?? {}))
        .filter((slug) => !fixedCategoryHandles.has(slug))
    )
    const dynamicCategoryEntries = [...dynamicCategorySlugs]
      .filter((slug) => isManagedCategoryIndexable(slug, countryCode))
      .map((slug) => {
        const path = `/categories/${slug}`
        const eligibleCountries = countryCodes.filter((marketCountry) =>
          isManagedCategoryIndexable(slug, marketCountry)
        )
        return {
          url: `${base}${path}`,
          alternates: { languages: alternateUrls(path, eligibleCountries) },
        }
      })
    const contentEntries = (prefix: "categories" | "collections", entries: Entry[]) =>
      entries
        .filter((entry) =>
          entry.handle &&
          !(prefix === "categories" && PRODUCT_CATEGORY_GROUPS.some((group) =>
            group.slug === entry.handle || group.legacyHandles.includes(entry.handle!)
          )) &&
          getProductIds(entry).some((id) => availableIds.has(id))
        )
        .map((entry) => {
          const path = `/${prefix}/${entry.handle}`
          const productIds = getProductIds(entry)
          const eligibleCountries = countryCodes.filter((marketCountry) => {
            const marketProductIds = productsByCountry.get(marketCountry)
            return productIds.some((id) => marketProductIds?.has(id))
          })
          return {
            url: `${base}${path}`,
            lastModified: entry.updated_at ? new Date(entry.updated_at) : undefined,
            alternates: { languages: alternateUrls(path, eligibleCountries) },
          }
        })

    const hasAvailableProducts = products.some((item) => item.id && availableIds.has(item.id))
    return [
      ...STATIC_PATHS.map((path) => ({
        url: `${base}${path || "/"}`,
        alternates: { languages: alternateUrls(path, countryCodes) },
      })),
      ...(hasAvailableProducts
        ? [{
            url: `${base}/products`,
            alternates: { languages: alternateUrls("/products", countryCodes.filter((marketCountry) => (productsByCountry.get(marketCountry)?.size ?? 0) > 0)) },
          }]
        : []),
      ...productEntries,
      ...productCategoryEntries,
      ...dynamicCategoryEntries,
      ...contentEntries("collections", collections),
    ]
  })

  // The main inspiration catalog and stories are U.S. English. Yoga Buddies
  // has separate localized story pages and is listed with its market URLs below.
  return [
    ...localizedEntries,
    ...(countryCodes.includes("us")
      ? [
          ...INDEXABLE_CONTENT_PATHS.map((path) => ({ url: `${origin}${path}` })),
        ]
      : []),
    ...Object.values(YOGA_INSPIRATION_PATHS).map((path) => ({
      url: `${origin}${path}`,
      alternates: {
        languages: {
          "en-US": `${origin}${YOGA_INSPIRATION_PATHS["en-US"]}`,
          "en-CA": `${origin}${YOGA_INSPIRATION_PATHS["en-CA"]}`,
          "es-MX": `${origin}${YOGA_INSPIRATION_PATHS["es-MX"]}`,
          "ja-JP": `${origin}${YOGA_INSPIRATION_PATHS["ja-JP"]}`,
          "x-default": `${origin}${YOGA_INSPIRATION_PATHS["en-US"]}`,
        },
      },
    })),
    ...countryCodes.filter((countryCode) => countryCode !== "us").map((countryCode) => ({
      url: `${origin}/${countryCode}/inspiration/`,
    })),
  ]
}
