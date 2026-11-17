export type ProductCategoryGroup = {
  slug: string
  label: string
  description: string
  productHandles: readonly string[]
  legacyHandles: readonly string[]
}

export const PRODUCT_CATEGORY_GROUPS: readonly ProductCategoryGroup[] = [
  {
    slug: "custom-clothing",
    label: "Custom Clothing",
    description:
      "Explore custom shirts, hoodies, swimwear, and team apparel. Upload artwork or describe your design, preview it on the product, and order online.",
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
    description:
      "Create a custom tumbler with your photo, artwork, or design prompt. Preview the full-wrap print before you order.",
    productHandles: ["vibeya-custom-20oz-stainless-steel-tumbler"],
    legacyHandles: ["drinkware", "tumblers"],
  },
  {
    slug: "custom-home-bath",
    label: "Custom Home & Bath",
    description:
      "Explore custom bath mats, shower curtains, and throw blankets. Upload an image or describe a design, preview it, and order online.",
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
    description:
      "Design a custom apron with your artwork, photo, or a written prompt. Preview your print before ordering.",
    productHandles: ["vibeya-custom-prompt-design-apron"],
    legacyHandles: ["kitchen-dining", "kitchen-and-dining"],
  },
  {
    slug: "custom-hats",
    label: "Custom Hats",
    description:
      "Explore custom hats, from knitted beanies to washed denim baseball caps. Upload artwork or describe your idea, then preview it before ordering.",
    productHandles: [
      "vibeya-custom-knitted-beanie",
      "vibeya-custom-washed-denim-baseball-cap",
    ],
    legacyHandles: ["accessories", "hats", "headwear"],
  },
  {
    slug: "custom-wall-decor",
    label: "Custom Wall Decor",
    description:
      "Create a custom metal wall sign with your artwork, photo, or design prompt. Preview it before ordering.",
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

// Category filters are navigation and taxonomy. Keep thin groups out of search
// until a separate keyword brief justifies indexing them as landing pages.
export const isProductCategoryIndexable = (_slug: string) => false
