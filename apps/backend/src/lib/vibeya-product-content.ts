import productContentDefaults from "./vibeya-product-content-defaults.json"

export const VIBEYA_PRODUCT_CONTENT_METADATA_KEY = "vibeya_storefront_content"

export const VIBEYA_PRODUCT_CONTENT_LOCALES = ["en-US", "en-CA", "ja-JP", "es-MX"] as const
export type VibeyaProductContentLocale = (typeof VIBEYA_PRODUCT_CONTENT_LOCALES)[number]

export type VibeyaProductContentCopy = {
  name: string
  detailTitle: string
  short: string
  eyebrow: string
  intro: string
  seoTitle: string
  seoDescription: string
  sizeGuide: string
  sizeNote: string
  variantSummary: string
  colorOptionLabel: string
  sizeOptionLabel: string
  productDetails: string
  productionDetails: string
  salesNotice: string
  galleryNote: string
  highlights: string[]
  services: [string, string][]
  sizeRows: (string | number)[][]
  measurementRows: [string, string][]
}

const MAX_TEXT = 5000
const MARKET_CONTENT_FALLBACKS: Partial<Record<VibeyaProductContentLocale, Record<string, Partial<VibeyaProductContentCopy>>>> = {
  "en-CA": {
    "vibeya-custom-womens-yoga-set": {
      seoTitle: "Custom Women's Yoga Set | VIBEYA Canada",
      seoDescription: "Personalize a coordinated women's yoga set with your own artwork or design prompt. Preview your matching print across the crop top and shorts before ordering.",
    },
  },
}
const cleanText = (value: unknown, maxLength = MAX_TEXT) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : ""

const stringList = (value: unknown, maxItems = 30) => Array.isArray(value)
  ? value.slice(0, maxItems).map((item) => cleanText(item, 1000)).filter(Boolean)
  : []

export function normalizeVibeyaProductContentCopy(value: unknown): VibeyaProductContentCopy {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const pairs = (source: unknown, maxItems = 20): [string, string][] => Array.isArray(source)
    ? source.slice(0, maxItems).flatMap((entry) => {
        if (!Array.isArray(entry)) return []
        const first = cleanText(entry[0], 300)
        const second = cleanText(entry[1], 1500)
        return first || second ? [[first, second]] : []
      })
    : []
  const sizeRows = Array.isArray(input.sizeRows)
    ? input.sizeRows.slice(0, 30).flatMap((row) => Array.isArray(row)
        ? [row.slice(0, 12).map((cell) => typeof cell === "number" ? cell : cleanText(cell, 100))]
        : [])
    : []

  return {
    name: cleanText(input.name, 200),
    detailTitle: cleanText(input.detailTitle, 200),
    short: cleanText(input.short, 500),
    eyebrow: cleanText(input.eyebrow, 200),
    intro: cleanText(input.intro),
    seoTitle: cleanText(input.seoTitle, 300),
    seoDescription: cleanText(input.seoDescription, 500),
    sizeGuide: cleanText(input.sizeGuide, 100),
    sizeNote: cleanText(input.sizeNote, 1500),
    variantSummary: cleanText(input.variantSummary, 300),
    colorOptionLabel: cleanText(input.colorOptionLabel, 100),
    sizeOptionLabel: cleanText(input.sizeOptionLabel, 100),
    productDetails: cleanText(input.productDetails),
    productionDetails: cleanText(input.productionDetails),
    salesNotice: cleanText(input.salesNotice),
    galleryNote: cleanText(input.galleryNote),
    highlights: stringList(input.highlights),
    services: pairs(input.services),
    sizeRows,
    measurementRows: pairs(input.measurementRows),
  }
}

export function normalizeVibeyaProductContent(value: unknown): Partial<Record<VibeyaProductContentLocale, VibeyaProductContentCopy>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const input = value as Record<string, unknown>
  return Object.fromEntries(VIBEYA_PRODUCT_CONTENT_LOCALES.flatMap((locale) => {
    const rawCopy = input[locale]
    if (!rawCopy || typeof rawCopy !== "object" || Array.isArray(rawCopy)) return []
    return [[locale, normalizeVibeyaProductContentCopy(rawCopy)]]
  }))
}

export function getVibeyaProductContent(handle: string, storedValue: unknown) {
  const defaults = normalizeVibeyaProductContent((productContentDefaults as Record<string, unknown>)[handle])
  const stored = normalizeVibeyaProductContent(storedValue)
  return Object.fromEntries(VIBEYA_PRODUCT_CONTENT_LOCALES.flatMap((locale) => {
    // Canada is English-only today. Fill any missing Canadian fields from
    // the approved U.S. English copy, while keeping explicit Canadian SEO.
    const fallback = locale === "en-CA" ? defaults["en-US"] : undefined
    const base = defaults[locale] ?? fallback
    const override = stored[locale]
    if (!base && !override) return []
    const marketFallback = MARKET_CONTENT_FALLBACKS[locale]?.[handle]
    const merged = { ...normalizeVibeyaProductContentCopy({}), ...(fallback ?? {}), ...(base ?? {}), ...(override ?? {}) }
    const text = (key: "name" | "detailTitle" | "short" | "eyebrow" | "intro" | "seoTitle" | "seoDescription" | "sizeGuide" | "sizeNote" | "variantSummary" | "colorOptionLabel" | "sizeOptionLabel" | "productDetails" | "productionDetails" | "salesNotice" | "galleryNote") => override?.[key] || marketFallback?.[key] || base?.[key] || fallback?.[key] || ""
    const list = <T,>(key: "highlights" | "services" | "sizeRows" | "measurementRows") => {
      const overrideValue = override?.[key]
      if (overrideValue?.length) return overrideValue
      const baseValue = base?.[key]
      if (baseValue?.length) return baseValue
      return fallback?.[key] ?? []
    }
    return [[locale, {
      ...merged,
      name: text("name"),
      detailTitle: text("detailTitle"),
      short: text("short"),
      eyebrow: text("eyebrow"),
      intro: text("intro"),
      seoTitle: text("seoTitle"),
      seoDescription: text("seoDescription"),
      sizeGuide: text("sizeGuide"),
      sizeNote: text("sizeNote"),
      variantSummary: text("variantSummary"),
      colorOptionLabel: text("colorOptionLabel"),
      sizeOptionLabel: text("sizeOptionLabel"),
      productDetails: text("productDetails"),
      productionDetails: text("productionDetails"),
      salesNotice: text("salesNotice"),
      galleryNote: text("galleryNote"),
      highlights: list("highlights"),
      services: list("services"),
      sizeRows: list("sizeRows"),
      measurementRows: list("measurementRows"),
    }]]
  })) as Partial<Record<VibeyaProductContentLocale, VibeyaProductContentCopy>>
}

export function isVibeyaProductContentLocale(value: unknown): value is VibeyaProductContentLocale {
  return typeof value === "string" && (VIBEYA_PRODUCT_CONTENT_LOCALES as readonly string[]).includes(value)
}
