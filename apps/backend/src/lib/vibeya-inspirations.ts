export const VIBEYA_INSPIRATIONS_METADATA_KEY = "vibeya_inspirations"

export type VibeyaInspiration = {
  id: string
  title: string
  slug: string
  image: string
  cardImage: string
  summary: string
  articleBody: string
  useManagedImage: boolean
  product: string
  pattern: string
  style: string
  tags: string[]
  published: boolean
  homeFeatured: boolean
}

export const DEFAULT_VIBEYA_INSPIRATIONS: VibeyaInspiration[] = [
  { id: "funny-skeleton", title: "Funny Skeleton: Lazy Mode On", slug: "funny-skeleton-lazy-mood.html", image: "skeleton-model-banner-v2.png", cardImage: "skeleton-model-banner-v2.png", summary: "", articleBody: "", useManagedImage: false, product: "long-sleeve", pattern: "skeleton", style: "street-graffiti", tags: ["funny", "lazy-mood", "skull", "streetwear"], published: true, homeFeatured: true },
  { id: "hoodie-orbit-bloom", title: "Orbit Bloom Custom Hoodie Design", slug: "hoodie-orbit-bloom.html", image: "hoodie-orbit-bloom-01-hero.png", cardImage: "orbit-bloom-featured-card.png", summary: "", articleBody: "", useManagedImage: false, product: "hoodie", pattern: "botanical-celestial", style: "nature-streetwear", tags: ["lavender", "botanical", "celestial", "streetwear"], published: true, homeFeatured: true },
  { id: "midnight-cat-cafe", title: "Midnight Cat Café: Custom Tumbler Design", slug: "midnight-cat-cafe-custom-tumbler.html", image: "midnight-cat-cafe-tumbler-mockup.png", cardImage: "midnight-cat-cafe-featured-card.png", summary: "", articleBody: "", useManagedImage: false, product: "tumbler", pattern: "animal", style: "retro-whimsical", tags: ["cat", "custom-tumbler", "coffee-lover-gift", "celestial", "pet-gift"], published: true, homeFeatured: true },
  { id: "duck-bubble-trouble", title: "Duck Bubble Trouble: Funny Custom Bath Mat Design", slug: "duck-bubble-trouble-custom-bath-mat.html", image: "duck-bubble-trouble-bath-mat-print.png", cardImage: "duck-bubble-trouble-featured-card-v3.jpg", summary: "", articleBody: "", useManagedImage: false, product: "bath-mat", pattern: "rubber-duck", style: "playful-whimsy", tags: ["funny-bath-mat", "rubber-duck", "3d-optical-illusion", "bathroom-decor", "custom-bath-mat"], published: true, homeFeatured: true },
  { id: "no-nightmares-blanket", title: "Cozy Funny Blanket: Sleep Well, Dream Big", slug: "no-nightmares-jesus-blanket.html", image: "no-nightmares-blanket-sofa-scene.png", cardImage: "no-nightmares-blanket-sofa-scene.png", summary: "", articleBody: "", useManagedImage: false, product: "blanket", pattern: "sleepy-sheep", style: "cozy-humor", tags: ["cozy-blanket", "custom-flannel-throw", "funny-blanket", "blanket-gift"], published: true, homeFeatured: true },
  { id: "low-battery-club-beanie", title: "Low Battery Club: Funny Custom Knitted Beanie", slug: "low-battery-club-custom-beanie.html", image: "low-battery-club-beanie-spotlight-v1.jpg", cardImage: "low-battery-club-beanie-spotlight-v1.jpg", summary: "A sleepy cat, low-battery joke, and varsity-inspired lettering bring playful streetwear energy to a personalized custom knitted beanie.", articleBody: "", useManagedImage: false, product: "beanie", pattern: "typography", style: "streetwear", tags: ["custom-beanie", "personalized-beanie", "knit-winter-hat", "funny-cat", "winter-gift", "y2k-streetwear"], published: true, homeFeatured: true },
]

export function normalizeVibeyaInspirations(value: unknown): VibeyaInspiration[] {
  if (!Array.isArray(value)) return DEFAULT_VIBEYA_INSPIRATIONS
  const entries = value.filter((item): item is VibeyaInspiration => {
    if (!item || typeof item !== "object") return false
    const entry = item as Partial<VibeyaInspiration>
    return typeof entry.id === "string" && /^[a-z0-9-]{2,80}$/.test(entry.id)
      && typeof entry.title === "string" && entry.title.trim().length > 0
      && typeof entry.slug === "string" && (/^[a-z0-9-]+\.html$/.test(entry.slug) || /^story\.html\?inspiration=[a-z0-9-]+$/.test(entry.slug))
      && typeof entry.image === "string" && typeof entry.cardImage === "string"
      && typeof entry.product === "string" && typeof entry.pattern === "string" && typeof entry.style === "string"
      && Array.isArray(entry.tags) && entry.tags.every((tag) => typeof tag === "string")
      && typeof entry.published === "boolean" && typeof entry.homeFeatured === "boolean"
  }).map((entry) => ({ ...entry, summary: typeof entry.summary === "string" ? entry.summary.trim().slice(0, 3000) : "", articleBody: typeof entry.articleBody === "string" ? entry.articleBody.trim().slice(0, 12000) : "", useManagedImage: entry.useManagedImage === true, title: entry.title.trim().slice(0, 160), tags: entry.tags.map((tag) => tag.trim().slice(0, 50)).filter(Boolean).slice(0, 20) }))
  return entries
}
