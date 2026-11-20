import categoryContentDefaults from "./vibeya-category-content-defaults.json"

export const VIBEYA_CATEGORY_CONTENT_METADATA_KEY = "vibeya_category_content"
export const VIBEYA_CATEGORY_CONTENT_LOCALES = ["en-US", "en-CA", "ja-JP", "es-MX"] as const
export type VibeyaCategoryLocale = (typeof VIBEYA_CATEGORY_CONTENT_LOCALES)[number]

export type VibeyaCategoryCopy = { label: string; seoTitle: string; description: string }
export type VibeyaCategoryContent = {
  label: string
  productHandles: string[]
  legacyHandles: string[]
  locales: Partial<Record<VibeyaCategoryLocale, VibeyaCategoryCopy>>
}
export type VibeyaNativeCategory = { handle: string; name: string; productHandles: string[] }

const defaults = categoryContentDefaults as Record<string, VibeyaCategoryContent>
const cleanText = (value: unknown, maxLength = 500) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : ""

export function isVibeyaCategoryLocale(value: unknown): value is VibeyaCategoryLocale {
  return typeof value === "string" && (VIBEYA_CATEGORY_CONTENT_LOCALES as readonly string[]).includes(value)
}

export function getVibeyaCategoryContent(storedValue: unknown, nativeCategories: VibeyaNativeCategory[] = []) {
  const stored = storedValue && typeof storedValue === "object" && !Array.isArray(storedValue)
    ? storedValue as Record<string, unknown>
    : {}
  const entries = Object.fromEntries(Object.entries(defaults).map(([slug, base]) => {
    const entry = stored[slug] && typeof stored[slug] === "object" && !Array.isArray(stored[slug])
      ? stored[slug] as Record<string, unknown>
      : {}
    const localeData = entry.locales && typeof entry.locales === "object" && !Array.isArray(entry.locales)
      ? entry.locales as Record<string, unknown>
      : {}
    const locales = Object.fromEntries(VIBEYA_CATEGORY_CONTENT_LOCALES.flatMap((locale) => {
      const baseCopy = base.locales[locale]
      const raw = localeData[locale] && typeof localeData[locale] === "object" && !Array.isArray(localeData[locale])
        ? localeData[locale] as Record<string, unknown>
        : {}
      if (!baseCopy && !raw.label && !raw.seoTitle && !raw.description) return []
      return [[locale, {
        label: cleanText(raw.label) || baseCopy?.label || "",
        seoTitle: cleanText(raw.seoTitle) || baseCopy?.seoTitle || "",
        description: cleanText(raw.description, 1000) || baseCopy?.description || "",
      }]]
    })) as Partial<Record<VibeyaCategoryLocale, VibeyaCategoryCopy>>
    const productHandles = Array.isArray(entry.productHandles)
      ? [...new Set(entry.productHandles.filter((handle): handle is string => typeof handle === "string" && base.productHandles.includes(handle)))]
      : [...base.productHandles]
    return [slug, {
      label: cleanText(entry.label) || base.label,
      productHandles,
      legacyHandles: [...base.legacyHandles],
      locales,
    } satisfies VibeyaCategoryContent]
  })) as Record<string, VibeyaCategoryContent>

  const validNativeCategories = nativeCategories.filter((category) =>
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.handle) && !entries[category.handle]
  )
  for (const category of validNativeCategories) {
    const raw = stored[category.handle] && typeof stored[category.handle] === "object" && !Array.isArray(stored[category.handle])
      ? stored[category.handle] as Record<string, unknown>
      : {}
    const rawLocales = raw.locales && typeof raw.locales === "object" && !Array.isArray(raw.locales)
      ? raw.locales as Record<string, unknown>
      : {}
    const locales = Object.fromEntries(VIBEYA_CATEGORY_CONTENT_LOCALES.flatMap((locale) => {
      const value = rawLocales[locale] && typeof rawLocales[locale] === "object" && !Array.isArray(rawLocales[locale])
        ? rawLocales[locale] as Record<string, unknown>
        : {}
      const copy = {
        label: cleanText(value.label, 200),
        seoTitle: cleanText(value.seoTitle, 300),
        description: cleanText(value.description, 1000),
      }
      return Object.values(copy).some(Boolean) ? [[locale, copy]] : []
    })) as Partial<Record<VibeyaCategoryLocale, VibeyaCategoryCopy>>
    const savedHandles = Array.isArray(raw.productHandles)
      ? raw.productHandles.filter((handle): handle is string => typeof handle === "string" && category.productHandles.includes(handle))
      : category.productHandles
    entries[category.handle] = {
      label: cleanText(raw.label, 200) || locales["en-US"]?.label || category.name,
      productHandles: [...new Set(savedHandles)],
      legacyHandles: [],
      locales,
    }
  }
  return entries
}

export function isKnownVibeyaCategorySlug(slug: string) {
  return Object.prototype.hasOwnProperty.call(defaults, slug)
}
