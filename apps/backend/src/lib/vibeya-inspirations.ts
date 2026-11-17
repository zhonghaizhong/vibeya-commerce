export const VIBEYA_INSPIRATIONS_METADATA_KEY = "vibeya_inspirations"

export type LocalizedVibeyaInspiration = {
  title: string
  summary: string
  articleBody: string
  tags: string[]
  image: string
  cardImage: string
}

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
  /** ISO-2 destination countries; '*' keeps legacy content available everywhere. */
  countryCodes?: string[]
  marketUrls?: Partial<Record<"us" | "ca" | "mx" | "jp", string>>
  translations?: Partial<Record<"ja-JP" | "es-MX", LocalizedVibeyaInspiration>>
}

export const DEFAULT_VIBEYA_INSPIRATIONS: VibeyaInspiration[] = [
  { id: "funny-skeleton", title: "Funny Skeleton: Lazy Mode On", slug: "funny-skeleton-lazy-mood.html", image: "skeleton-model-banner-v2.png", cardImage: "skeleton-model-banner-v2.png", summary: "", articleBody: "", useManagedImage: false, product: "long-sleeve", pattern: "skeleton", style: "street-graffiti", tags: ["funny", "lazy-mood", "skull", "streetwear"], published: true, homeFeatured: true },
  { id: "hoodie-orbit-bloom", title: "Orbit Bloom Custom Hoodie Design", slug: "hoodie-orbit-bloom.html", image: "hoodie-orbit-bloom-01-hero.png", cardImage: "orbit-bloom-featured-card.png", summary: "", articleBody: "", useManagedImage: false, product: "hoodie", pattern: "botanical-celestial", style: "nature-streetwear", tags: ["lavender", "botanical", "celestial", "streetwear"], published: true, homeFeatured: true },
  { id: "midnight-cat-cafe", title: "Midnight Cat Café: Custom Tumbler Design", slug: "midnight-cat-cafe-custom-tumbler.html", image: "midnight-cat-cafe-tumbler-mockup.png", cardImage: "midnight-cat-cafe-featured-card.png", summary: "", articleBody: "", useManagedImage: false, product: "tumbler", pattern: "animal", style: "retro-whimsical", tags: ["cat", "custom-tumbler", "coffee-lover-gift", "celestial", "pet-gift"], published: true, homeFeatured: true },
  { id: "duck-bubble-trouble", title: "Duck Bubble Trouble: Funny Custom Bath Mat Design", slug: "duck-bubble-trouble-custom-bath-mat.html", image: "duck-bubble-trouble-bath-mat-print.png", cardImage: "duck-bubble-trouble-featured-card-v3.jpg", summary: "", articleBody: "", useManagedImage: false, product: "bath-mat", pattern: "rubber-duck", style: "playful-whimsy", tags: ["funny-bath-mat", "rubber-duck", "3d-optical-illusion", "bathroom-decor", "custom-bath-mat"], published: true, homeFeatured: true },
  { id: "raccoon-bar-crew", title: "Raccoon Bar Crew: Funny Custom Metal Wall Signs", slug: "raccoon-bar-crew-custom-metal-wall-sign.html", image: "raccoon-bar-crew-print-art.png", cardImage: "raccoon-bar-crew-spotlight-portrait.jpg", summary: "Three mischievous raccoons turn a custom metal bottle cap wall sign set into playful man cave and home bar decor. Choose one, two, or three 30 cm signs, upload artwork or describe a design, preview it, and order from VIBEYA.", articleBody: "", useManagedImage: false, product: "metal-sign", pattern: "raccoon", style: "retro-bar", tags: ["funny-bar-sign", "man-cave-wall-decor", "custom-metal-wall-sign", "raccoon-decor", "home-bar-decor"], published: true, homeFeatured: true },
  { id: "stars-stripes-denim-cap", title: "Stars & Stripes: Custom American Flag Baseball Cap", slug: "stars-stripes-custom-denim-baseball-cap.html", image: "stars-stripes-denim-cap-gallery-01-model.jpg", cardImage: "stars-stripes-denim-cap-spotlight.jpg", summary: "A vintage distressed American flag brings classic red, cream, and navy to a washed denim cap. Choose a color, upload artwork or describe your own design, preview it on the product, and order from VIBEYA.", articleBody: "", useManagedImage: false, product: "baseball-cap", pattern: "flag", style: "retro-americana", tags: ["american-flag-hat", "custom-baseball-cap", "washed-denim-baseball-cap", "patriotic-hat", "personalized-baseball-cap"], published: true, homeFeatured: true },
  { id: "no-nightmares-blanket", title: "Cozy Funny Blanket: Sleep Well, Dream Big", slug: "no-nightmares-jesus-blanket.html", image: "no-nightmares-blanket-sofa-scene.png", cardImage: "no-nightmares-blanket-sofa-scene.png", summary: "", articleBody: "", useManagedImage: false, product: "blanket", pattern: "sleepy-sheep", style: "cozy-humor", tags: ["cozy-blanket", "custom-flannel-throw", "funny-blanket", "blanket-gift"], published: true, homeFeatured: true },
  { id: "low-battery-club-beanie", title: "Low Battery Club: Funny Custom Knitted Beanie", slug: "low-battery-club-custom-beanie.html", image: "low-battery-club-beanie-spotlight-v1.jpg", cardImage: "low-battery-club-beanie-spotlight-v1.jpg", summary: "A sleepy cat, low-battery joke, and varsity-inspired lettering bring playful streetwear energy to a personalized custom knitted beanie.", articleBody: "", useManagedImage: false, product: "beanie", pattern: "typography", style: "streetwear", tags: ["custom-beanie", "personalized-beanie", "knit-winter-hat", "funny-cat", "winter-gift", "y2k-streetwear"], published: true, homeFeatured: true },
  { id: "cat-bubble-cats-shower-curtain", title: "Bubble Bath Cats: Cute Custom Shower Curtain Design", slug: "cat-bubble-cats-custom-shower-curtain.html", image: "cat-bubble-bath-shower-curtain-print.png", cardImage: "cat-bubble-shower-curtain-scene-01-bathroom.jpg", summary: "Meet Bubble Bath Cats, a cute custom shower curtain idea with playful cats, soft bubbles, and a warm beige background. Choose a shower curtain, personalize the design, preview it, and order one made for you.", articleBody: "", useManagedImage: false, product: "shower-curtain", pattern: "cat", style: "cozy-cute", tags: ["custom-shower-curtain", "cat-shower-curtain", "cute-bathroom-decor", "beige-bathroom-decor", "personalized-shower-curtain"], published: true, homeFeatured: true, countryCodes: ["us"], marketUrls: { us: "/vibeya/inspiration/cat-bubble-cats-custom-shower-curtain.html" } },
  { id: "deadpan-penguin-tankini", title: "Deadpan Penguin: Funny Custom Tankini Swimsuit", slug: "deadpan-penguin-custom-tankini.html", image: "penguin-deadpan-tankini-print.png", cardImage: "penguin-tankini-spotlight-portrait-v5.png", summary: "Meet Deadpan Penguin, a funny custom tankini swimsuit with a bold penguin face print. Choose your tankini color, personalize the artwork, preview it, and order from VIBEYA.", articleBody: "", useManagedImage: false, product: "tankini", pattern: "penguin", style: "funny", tags: ["custom-tankini-swimsuit", "womens-tankini", "funny-penguin-print", "personalized-swimsuit", "custom-swimwear"], published: true, homeFeatured: true, countryCodes: ["us"], marketUrls: { us: "/vibeya/inspiration/deadpan-penguin-custom-tankini.html" } },
  { id: "never-stop-kids-basketball", title: "Never Stop: Custom Kids' Basketball Jersey Set", slug: "custom-kids-basketball-jersey-set.html", image: "kids-basketball-milo-gallery-01-front-court.png", cardImage: "kids-basketball-milo-spotlight-portrait.png", summary: "Create a custom basketball jersey for kids with matching shorts. Add a name, number, and varsity text, preview your youth basketball jersey set online, and order from VIBEYA.", articleBody: "", useManagedImage: false, product: "basketball-uniform", pattern: "sports-typography", style: "youth-sports", tags: ["custom-kids-basketball-jersey", "basketball-jersey-for-kids", "custom-basketball-jersey", "youth-basketball-uniform", "basketball-jersey-set"], published: true, homeFeatured: true, countryCodes: ["us"], marketUrls: { us: "/vibeya/inspiration/custom-kids-basketball-jersey-set.html" } },
  { id: "sauce-boss-apron", title: "Sauce Boss: A Funny Kitchen Apron", slug: "sauce-boss-custom-cooking-apron.html", image: "sauce-boss-apron-gallery-01-kitchen.jpg", cardImage: "sauce-boss-apron-spotlight-portrait.jpg", summary: "Meet Sauce Boss, a funny custom cooking apron idea with a playful tomato chef print. Personalize a VIBEYA kitchen apron, preview your design, and order online.", articleBody: "", useManagedImage: false, product: "apron", pattern: "tomato-chef", style: "funny", tags: ["kitchen-apron", "custom-cooking-apron", "funny-kitchen-apron", "funny-apron", "personalized-apron", "apron-gift"], published: true, homeFeatured: true, countryCodes: ["us"], marketUrls: { us: "/vibeya/inspiration/sauce-boss-custom-cooking-apron.html" } },
  {
    id: "yoga-animals-set", title: "Yoga Buddies: A Custom Animal Print Yoga Set", slug: "animal-yoga-set.html",
    image: "yoga-animals-set-spotlight-portrait.jpg", cardImage: "yoga-animals-set-spotlight-portrait.jpg",
    summary: "Small cats, rabbits, bears, dogs, foxes, and penguins bring a playful touch to a women's yoga set. Upload your own image or describe a print, preview it on the product, and customize it on VIBEYA.",
    articleBody: "A warm ivory ground and small, colorful animals in varied yoga poses make this coordinated sports-bra top and high-waisted biker shorts set playful and easy to wear.\n\nChoose the yoga set for your market, upload your own photo or artwork, or describe an original design with a text prompt. Preview the print on the product, adjust it in VIBEYA's design studio, and place your order when it looks right.",
    useManagedImage: true, product: "yoga-set", pattern: "animal", style: "playful-activewear",
    tags: ["custom-yoga-set", "womens-yoga-set", "animal-print-activewear", "yoga-sports-bra-and-shorts"],
    published: true, homeFeatured: true, countryCodes: ["us", "ca", "mx", "jp"],
    marketUrls: {
      us: "/vibeya/inspiration/animal-yoga-set.html", ca: "/ca/inspiration/animal-yoga-set",
      mx: "/mx/inspiration/animal-yoga-set", jp: "/jp/inspiration/animal-yoga-set",
    },
    translations: {
      "es-MX": {
        title: "Yoga en buena compañía: conjunto de yoga con estampado de animales",
        summary: "Gatos, conejos, osos, perros, zorros y pingüinos en distintas posturas dan un toque alegre a este conjunto de yoga para mujer. Sube tu imagen o describe un diseño, visualízalo en el producto y personalízalo en VIBEYA.",
        articleBody: "El fondo marfil y los animalitos de colores en distintas posturas hacen que este conjunto de top deportivo y short ciclista de cintura alta se sienta alegre y fácil de llevar.\n\nElige el conjunto de yoga disponible en México. Sube tu foto o diseño, o describe una idea con texto. Visualiza el estampado en el producto, ajústalo en el estudio de diseño de VIBEYA y haz tu pedido cuando te guste el resultado.",
        tags: ["Conjunto de yoga para mujer", "Ropa de yoga estampada", "Estampado de animales", "Top y short de yoga"],
        image: "yoga-animals-set-spotlight-es-MX.png", cardImage: "yoga-animals-set-spotlight-es-MX.png",
      },
      "ja-JP": {
        title: "ヨガ仲間：動物柄のカスタムヨガウェアセット",
        summary: "猫、うさぎ、くま、犬、きつね、ペンギンがさまざまなポーズをする、アイボリーカラーのヨガウェアセット。画像をアップロードするか、デザインを文章で伝えて、商品プレビューを見ながらカスタマイズできます。",
        articleBody: "アイボリーの生地に、ヨガポーズをする小さなカラフルな動物たちを不規則に散りばめました。スポーツブラ風トップスとハイウエストのバイカーショーツを、黒い縁取りを残したままコーディネートしています。\n\n日本向けのヨガウェアセットを選び、自分の写真や画像をアップロードするか、テキストでデザインを説明してください。商品プレビューで確認・調整してから注文できます。",
        tags: ["レディース ヨガウェア セット", "ヨガウェア 上下セット", "動物柄 アクティブウェア", "カスタムヨガウェア"],
        image: "yoga-animals-set-spotlight-ja-JP.png", cardImage: "yoga-animals-set-spotlight-ja-JP.png",
      },
    },
  },
]

const RELEASED_DEFAULT_INSPIRATION_IDS = new Set([
  "cat-bubble-cats-shower-curtain",
  "deadpan-penguin-tankini",
  "never-stop-kids-basketball",
  "sauce-boss-apron",
  "yoga-animals-set",
])

export function includeReleasedDefaultInspirations(value: unknown): VibeyaInspiration[] {
  const entries = normalizeVibeyaInspirations(value)
  const existingIds = new Set(entries.map((entry) => entry.id))
  const newlyReleased = DEFAULT_VIBEYA_INSPIRATIONS.filter((entry) => RELEASED_DEFAULT_INSPIRATION_IDS.has(entry.id) && !existingIds.has(entry.id))
  return [...entries, ...newlyReleased]
}

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
  }).map((entry) => {
    const rawTranslations = entry.translations && typeof entry.translations === "object" ? entry.translations as Record<string, unknown> : {}
    const translations: NonNullable<VibeyaInspiration["translations"]> = {}
    for (const locale of ["ja-JP", "es-MX"] as const) {
      const copy = rawTranslations[locale] && typeof rawTranslations[locale] === "object" ? rawTranslations[locale] as Record<string, unknown> : undefined
      if (!copy) continue
      const localizedTags = Array.isArray(copy.tags) ? copy.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim().slice(0, 50)).filter(Boolean).slice(0, 20) : []
      translations[locale] = {
        title: typeof copy.title === "string" ? copy.title.trim().slice(0, 160) : "",
        summary: typeof copy.summary === "string" ? copy.summary.trim().slice(0, 3000) : "",
        articleBody: typeof copy.articleBody === "string" ? copy.articleBody.trim().slice(0, 12000) : "",
        tags: localizedTags,
        image: typeof copy.image === "string" ? copy.image.trim().slice(0, 2000) : "",
        cardImage: typeof copy.cardImage === "string" ? copy.cardImage.trim().slice(0, 2000) : "",
      }
    }
    return {
      ...entry,
      summary: typeof entry.summary === "string" ? entry.summary.trim().slice(0, 3000) : "",
      articleBody: typeof entry.articleBody === "string" ? entry.articleBody.trim().slice(0, 12000) : "",
      useManagedImage: entry.useManagedImage === true,
      title: entry.title.trim().slice(0, 160),
      tags: entry.tags.map((tag) => tag.trim().slice(0, 50)).filter(Boolean).slice(0, 20),
      countryCodes: Array.isArray(entry.countryCodes) ? [...new Set(entry.countryCodes.map((code) => String(code).trim().toLowerCase()).filter((code) => code === "*" || /^[a-z]{2}$/.test(code)))].slice(0, 100) : ["us"],
      translations,
    }
  })
  return entries
}
