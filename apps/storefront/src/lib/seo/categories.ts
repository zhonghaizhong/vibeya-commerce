export type ProductCategoryGroup = {
  slug: string
  label: string
  seoTitle: string
  description: string
  productHandles: readonly string[]
  legacyHandles: readonly string[]
  localizedCopy?: Partial<Record<"en-CA" | "ja-JP" | "es-MX", {
    label: string
    seoTitle: string
    description: string
  }>>
}

export const PRODUCT_CATEGORY_GROUPS: readonly ProductCategoryGroup[] = [
  {
    slug: "custom-clothing",
    label: "Custom Clothing",
    seoTitle: "Custom Clothing & Personalized Apparel | VIBEYA",
    description:
      "Design custom clothing including long sleeve shirts, washed hoodies, tankinis, and kids' basketball uniforms. Upload artwork or describe your idea, preview, and order online.",
    localizedCopy: {
      "en-CA": {
        label: "Custom Clothing",
        seoTitle: "Custom Yoga Wear & Clothing | VIBEYA",
        description:
          "Explore customizable clothing and yoga wear in Canada. Personalize a coordinated women's yoga set with your own artwork or a text prompt, preview the design, and order online.",
      },
      "ja-JP": {
        label: "カスタムウェア",
        seoTitle: "ヨガウェアセットをカスタマイズ | VIBEYA",
        description:
          "オリジナルのヨガウェアセットをデザイン。画像をアップロードするか、文章でデザインを説明し、注文前に上下セットの仕上がりを確認できます。",
      },
      "es-MX": {
        label: "Ropa personalizada",
        seoTitle: "Conjunto de yoga personalizado para mujer | VIBEYA",
        description:
          "Personaliza ropa y un conjunto de yoga para mujer en México con tu imagen o una descripción de texto. Previsualiza el diseño en el top y el short antes de pedirlo.",
      },
    },
    productHandles: [
      "vibeya-custom-cotton-long-sleeve-tee",
      "vibeya-washed-vintage-hooded-sweatshirt",
      "vibeya-custom-womens-tankini-swimsuit-set",
      "vibeya-custom-kids-basketball-uniform",
      "vibeya-custom-womens-yoga-set",
    ],
    legacyHandles: ["shirts", "apparel"],
  },
  {
    slug: "custom-tumblers",
    label: "Custom Tumblers",
    seoTitle: "Custom Tumblers & Personalized Cups | VIBEYA",
    description:
      "Design a custom stainless steel tumbler with a photo, artwork, or text prompt. Preview the full-wrap print on a 20 oz tumbler before ordering.",
    productHandles: ["vibeya-custom-20oz-stainless-steel-tumbler"],
    legacyHandles: ["drinkware", "tumblers"],
  },
  {
    slug: "custom-home-bath",
    label: "Custom Home & Bath",
    seoTitle: "Custom Home & Bath | Mats, Blankets & Curtains | VIBEYA",
    description:
      "Create custom bath mats, shower curtains, and throw blankets with a photo, artwork, or design prompt. Preview your personalized home design before ordering.",
    productHandles: [
      "vibeya-custom-3d-bath-mat",
      "vibeya-custom-flannel-throw-blanket",
      "vibeya-custom-shower-curtain",
    ],
    legacyHandles: ["home-bath", "home-and-bath", "bathroom"],
  },
  {
    slug: "custom-kitchen-dining",
    label: "Custom Kitchen & Dining",
    seoTitle: "Custom Aprons & Personalized Cooking Aprons | VIBEYA",
    description:
      "Make a custom apron with a photo, artwork, or design prompt. Preview your personalized cooking apron before ordering.",
    productHandles: ["vibeya-custom-prompt-design-apron"],
    legacyHandles: ["kitchen-dining", "kitchen-and-dining"],
  },
  {
    slug: "custom-hats",
    label: "Custom Hats",
    seoTitle: "Custom Hats, Beanies & Baseball Caps | VIBEYA",
    description:
      "Create a custom knitted beanie or washed denim baseball cap with your artwork or design prompt. Preview your personalized hat before ordering.",
    productHandles: [
      "vibeya-custom-knitted-beanie",
      "vibeya-custom-washed-denim-baseball-cap",
    ],
    legacyHandles: ["accessories", "hats", "headwear"],
  },
  {
    slug: "custom-wall-decor",
    label: "Custom Wall Decor",
    seoTitle: "Custom Metal Wall Signs & Personalized Decor | VIBEYA",
    description:
      "Design personalized metal wall decor as a custom bottle cap sign. Upload artwork or a photo, preview a one-, two-, or three-piece set, and order online.",
    productHandles: ["vibeya-custom-metal-bottle-cap-wall-sign"],
    legacyHandles: ["wall-decor", "wall-decorations"],
  },
] as const

export const getProductCategoryGroup = (handle: string) =>
  PRODUCT_CATEGORY_GROUPS.find(
    (group) =>
      group.slug === handle.toLowerCase() ||
      group.legacyHandles.includes(handle.toLowerCase())
  )

export const getProductCategoryMarketCopy = (
  group: ProductCategoryGroup,
  locale: string
) => ({
  ...group,
  ...(group.localizedCopy?.[locale as keyof NonNullable<ProductCategoryGroup["localizedCopy"]>] ?? {}),
})

const CATEGORY_MARKETS = ["us", "ca", "jp", "mx"] as const

export const getProductCategoryIndexableMarkets = (slug: string) =>
  CATEGORY_MARKETS.filter((countryCode) =>
    isProductCategoryIndexable(slug, countryCode)
  )

export const getProductCategoryLabel = (
  productHandle: string,
  fallback?: string | null
) => {
  const group = PRODUCT_CATEGORY_GROUPS.find((candidate) =>
    candidate.productHandles.includes(productHandle)
  )
  if (group) return group.label
  const normalizedFallback = fallback?.trim().toLowerCase().replace(/\s+/g, "-")
  return (
    PRODUCT_CATEGORY_GROUPS.find((candidate) =>
      candidate.legacyHandles.includes(normalizedFallback ?? "")
    )?.label ?? "New arrivals"
  )
}

// A category is indexable in a market when its localized landing copy exists.
// International category URLs without localized copy remain noindex.
export const isProductCategoryIndexable = (
  slug: string,
  countryCode: string
) => {
  const group = PRODUCT_CATEGORY_GROUPS.find((candidate) => candidate.slug === slug)
  if (!group) return false

  const market = countryCode.toLowerCase()
  if (market === "us") return true

  const localeByMarket: Record<string, "en-CA" | "ja-JP" | "es-MX"> = {
    ca: "en-CA",
    jp: "ja-JP",
    mx: "es-MX",
  }
  const locale = localeByMarket[market]
  return Boolean(locale && group.localizedCopy?.[locale])
}
