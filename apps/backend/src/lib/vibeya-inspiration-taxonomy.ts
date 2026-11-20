export const VIBEYA_INSPIRATION_TAXONOMY_METADATA_KEY = "vibeya_inspiration_taxonomy"

export type VibeyaInspirationFacet = "product" | "pattern" | "style"
export type VibeyaInspirationFacetOption = {
  value: string
  labels: Partial<Record<"en-US" | "en-CA" | "es-MX" | "ja-JP", string>>
}
export type VibeyaInspirationTaxonomy = Record<VibeyaInspirationFacet, VibeyaInspirationFacetOption[]>

const localizedLabels: Record<VibeyaInspirationFacet, { "ja-JP": Record<string, string>; "es-MX": Record<string, string> }> = {
  product: {
    "ja-JP": { "long-sleeve": "カスタム長袖Tシャツ", hoodie: "ヴィンテージウォッシュパーカー", tumbler: "20オンスタンブラー", "bath-mat": "カスタムバスマット", blanket: "カスタムフランネルブランケット", beanie: "カスタムニット帽", "shower-curtain": "カスタムシャワーカーテン", tankini: "カスタムタンキニ水着セット", "basketball-uniform": "子ども用バスケットボールユニフォーム", apron: "カスタムエプロン", "metal-sign": "カスタムメタルウォールサイン", "baseball-cap": "カスタムウォッシュドデニムキャップ", "yoga-set": "レディース ヨガウェア セット" },
    "es-MX": { "long-sleeve": "Playera personalizada de manga larga", hoodie: "Sudadera vintage", tumbler: "Vaso térmico de 20 oz", "bath-mat": "Tapete de baño personalizado", blanket: "Manta de franela personalizada", beanie: "Gorro tejido personalizado", "shower-curtain": "Cortina de baño personalizada", tankini: "Conjunto tankini personalizado", "basketball-uniform": "Uniforme de básquetbol infantil", apron: "Delantal personalizado", "metal-sign": "Letrero metálico personalizado", "baseball-cap": "Gorra de mezclilla lavada personalizada", "yoga-set": "Conjunto de yoga para mujer" },
  },
  pattern: {
    "ja-JP": { skeleton: "ユーモアのあるスケルトン", "botanical-celestial": "植物と天体", animal: "動物柄", penguin: "無表情なペンギン", cat: "猫・バスタブ・泡", "rubber-duck": "アヒルと泡", "sleepy-sheep": "眠る羊", "sports-typography": "スポーツ文字デザイン", "tomato-chef": "トマトシェフ", raccoon: "アライグマ", flag: "アメリカ国旗", typography: "眠そうな猫と大胆な文字" },
    "es-MX": { skeleton: "Esqueleto divertido", "botanical-celestial": "Botánico y celestial", animal: "Estampado de animales", penguin: "Pingüino inexpresivo", cat: "Gatos, tina y burbujas", "rubber-duck": "Pato de goma y burbujas", "sleepy-sheep": "Ovejas dormidas", "sports-typography": "Tipografía deportiva", "tomato-chef": "Chef de tomate", raccoon: "Mapache", flag: "Bandera estadounidense", typography: "Gato soñoliento y letras llamativas" },
  },
  style: {
    "ja-JP": { "street-graffiti": "ストリートグラフィティ／リラックスムード", "nature-streetwear": "自然モチーフのストリートウェア", "retro-whimsical": "レトロで遊び心のあるスタイル", "playful-whimsy": "遊び心のあるバスルーム装飾", "cozy-humor": "くつろぎとユーモア", streetwear: "ストリートウェア", "cozy-cute": "心地よくかわいいデザイン", funny: "ユーモラスなグラフィック水着", "youth-sports": "ユーススポーツ／クラシックなバーシティスタイル", "retro-bar": "レトロなバーインテリア", "retro-americana": "レトロなアメリカンスタイル", "playful-activewear": "遊び心のあるアクティブウェア" },
    "es-MX": { "street-graffiti": "Grafiti urbano y estilo relajado", "nature-streetwear": "Moda urbana inspirada en la naturaleza", "retro-whimsical": "Estilo retro y divertido", "playful-whimsy": "Decoración alegre para el baño", "cozy-humor": "Humor acogedor", streetwear: "Moda urbana", "cozy-cute": "Acogedor, tierno y divertido", funny: "Estampado divertido para traje de baño", "youth-sports": "Deporte juvenil y estilo universitario clásico", "retro-bar": "Decoración retro para bar", "retro-americana": "Estilo americano retro", "playful-activewear": "Ropa deportiva alegre y divertida" },
  },
}

const options = (facet: VibeyaInspirationFacet, entries: Array<[string, string]>): VibeyaInspirationFacetOption[] => entries.map(([value, label]) => ({
  value,
  labels: { "en-US": label, "en-CA": label, "ja-JP": localizedLabels[facet]["ja-JP"][value], "es-MX": localizedLabels[facet]["es-MX"][value] },
}))

export const DEFAULT_VIBEYA_INSPIRATION_TAXONOMY: VibeyaInspirationTaxonomy = {
  product: options("product", [
    ["long-sleeve", "Custom Cotton Long Sleeve Tee"],
    ["hoodie", "Washed Vintage Hooded Sweatshirt"],
    ["tumbler", "Custom 20 oz Stainless Steel Tumbler"],
    ["bath-mat", "Custom 3D Optical Illusion Bath Mat"],
    ["blanket", "Custom Flannel Throw Blanket"],
    ["beanie", "Custom Knitted Beanie"],
    ["shower-curtain", "Custom Shower Curtain"],
    ["tankini", "Custom Women's Tankini Swimsuit Set"],
    ["basketball-uniform", "Custom Kids' Basketball Uniform"],
    ["apron", "Custom Prompt-Designed Apron"],
    ["metal-sign", "Custom Metal Bottle Cap Wall Sign"],
    ["baseball-cap", "Custom Washed Denim Baseball Cap"],
    ["yoga-set", "Custom Women's Yoga Set"],
  ]),
  pattern: options("pattern", [
    ["skeleton", "Skeleton"],
    ["botanical-celestial", "Botanical & Celestial"],
    ["animal", "Animal Print"],
    ["penguin", "Penguin"],
    ["cat", "Cats"],
    ["rubber-duck", "Rubber Duck"],
    ["sleepy-sheep", "Sleep & Dream"],
    ["sports-typography", "Basketball Typography"],
    ["tomato-chef", "Tomato Chef"],
    ["raccoon", "Raccoon"],
    ["flag", "American Flag"],
    ["typography", "Typography"],
  ]),
  style: options("style", [
    ["street-graffiti", "Streetwear & Graffiti"],
    ["nature-streetwear", "Nature-Inspired Streetwear"],
    ["retro-whimsical", "Retro Whimsical"],
    ["playful-whimsy", "Playful & Whimsical"],
    ["cozy-humor", "Cozy Humor"],
    ["streetwear", "Streetwear"],
    ["cozy-cute", "Cozy & Cute"],
    ["funny", "Funny & Humorous"],
    ["youth-sports", "Youth Sports"],
    ["retro-bar", "Retro Bar Decor"],
    ["retro-americana", "Retro Americana"],
    ["playful-activewear", "Playful Activewear"],
  ]),
}

export function normalizeVibeyaInspirationTaxonomy(value: unknown): VibeyaInspirationTaxonomy {
  const source = value && typeof value === "object" ? value as Partial<Record<VibeyaInspirationFacet, unknown>> : {}
  const locales = ["en-US", "en-CA", "es-MX", "ja-JP"] as const
  const result = {} as VibeyaInspirationTaxonomy
  for (const facet of ["product", "pattern", "style"] as const) {
    const rawOptions = Array.isArray(source[facet]) ? source[facet] : DEFAULT_VIBEYA_INSPIRATION_TAXONOMY[facet]
    result[facet] = rawOptions.filter((option): option is Record<string, unknown> => Boolean(option) && typeof option === "object")
      .map((option) => {
        const rawLabels = option.labels && typeof option.labels === "object" ? option.labels as Record<string, unknown> : {}
        const labels: VibeyaInspirationFacetOption["labels"] = {}
        for (const locale of locales) {
          if (typeof rawLabels[locale] === "string") labels[locale] = rawLabels[locale].trim().slice(0, 160)
        }
        if (!labels["en-US"] && labels["en-CA"]) labels["en-US"] = labels["en-CA"]
        if (!labels["en-CA"] && labels["en-US"]) labels["en-CA"] = labels["en-US"]
        return { value: typeof option.value === "string" ? option.value.trim().toLowerCase() : "", labels }
      })
      .filter((option) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(option.value) && Boolean(option.labels["en-US"]))
      .slice(0, 100)
  }
  return result
}

export function isValidVibeyaInspirationTaxonomy(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const taxonomy = value as Partial<Record<VibeyaInspirationFacet, unknown>>
  for (const facet of ["product", "pattern", "style"] as const) {
    if (!Array.isArray(taxonomy[facet]) || taxonomy[facet].length > 100) return false
    const options = taxonomy[facet] as VibeyaInspirationFacetOption[]
    const values = options.map((option) => option?.value)
    if (new Set(values).size !== values.length) return false
    if (options.some((option) => !option || typeof option.value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(option.value) || !option.labels || typeof option.labels["en-US"] !== "string" || !option.labels["en-US"].trim())) return false
  }
  return true
}
