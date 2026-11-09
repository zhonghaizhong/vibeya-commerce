export const VIBEYA_THEME_METADATA_KEY = "vibeya_theme"

export const VIBEYA_THEMES = [
  {
    id: "vibeya-original",
    name: "VIBEYA Original",
    description: "The current VIBEYA storefront design, including its navigation, product cards, colors, and custom product details.",
    previewPath: "/us#top",
  },
] as const

export const DEFAULT_VIBEYA_THEME_ID = VIBEYA_THEMES[0].id

export function toVibeyaThemeId(value: unknown) {
  return typeof value === "string" && VIBEYA_THEMES.some((theme) => theme.id === value)
    ? value
    : DEFAULT_VIBEYA_THEME_ID
}
