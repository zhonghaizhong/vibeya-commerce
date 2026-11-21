import { sdk } from "@lib/config"

export type LocalizedInspiration = {
  title?: string
  summary?: string
  articleBody?: string
  tags?: string[]
  image?: string
  cardImage?: string
}

export type ManagedInspiration = {
  id: string
  title: string
  slug: string
  image: string
  cardImage: string
  printImage?: string
  galleryImages?: string[]
  summary: string
  articleBody: string
  product: string
  pattern: string
  style: string
  tags: string[]
  published: boolean
  countryCodes?: string[]
  marketUrls?: Partial<Record<"us" | "ca" | "mx" | "jp", string>>
  translations?: Partial<Record<"ja-JP" | "es-MX", LocalizedInspiration>>
}

export async function getPublishedInspirations(countryCode: string) {
  const response = await sdk.client.fetch<{ inspirations?: ManagedInspiration[] }>(
    `/store/vibeya/inspirations?country_code=${encodeURIComponent(countryCode)}`,
    { cache: "no-store" }
  )

  return Array.isArray(response.inspirations) ? response.inspirations : []
}

export function getInspirationCopy(entry: ManagedInspiration, locale: string): LocalizedInspiration {
  const localized = locale === "ja-JP" || locale === "es-MX"
    ? entry.translations?.[locale]
    : undefined

  return {
    title: localized?.title ?? entry.title,
    summary: localized?.summary ?? entry.summary,
    articleBody: localized?.articleBody ?? entry.articleBody,
    tags: localized?.tags ?? entry.tags,
    image: localized?.image ?? entry.image,
    cardImage: localized?.cardImage ?? entry.cardImage,
  }
}

export function hasIndexableInspirationCopy(copy: LocalizedInspiration) {
  return Boolean(
    copy.title?.trim() &&
    copy.summary?.trim() &&
    copy.articleBody?.trim() &&
    copy.tags?.length &&
    copy.image?.trim() &&
    copy.cardImage?.trim()
  )
}

export function getInspirationPath(countryCode: string, id: string) {
  return `/${countryCode.toLowerCase()}/inspiration/${encodeURIComponent(id)}`
}
