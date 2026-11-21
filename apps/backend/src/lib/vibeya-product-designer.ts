export const VIBEYA_PRODUCT_DESIGNER_METADATA_KEY = "vibeya_product_designer"

export type VibeyaProductDesignerReference = {
  color: string
  size: string
  side: "front" | "back" | "surface"
  baseImageUrl: string
  printAreaImageUrl: string
}

export type VibeyaProductDesignerConfig = {
  enabled: boolean
  legacyProfile?: string
  generationPromptTemplate: string
  mode: "front-back" | "full-surface"
  placements: Array<"front" | "back" | "both" | "wrap">
  galleryUrls: string[]
  references: VibeyaProductDesignerReference[]
}

const allowedPlacements = new Set(["front", "back", "both", "wrap"])
const allowedModes = new Set(["front-back", "full-surface"])
const productIdAliases: Record<string, string> = {
  "vibeya-custom-cotton-long-sleeve-tee": "sds-167256",
  "vibeya-washed-vintage-hooded-sweatshirt": "vibeya-washed-hoodie",
  "vibeya-custom-knitted-beanie": "sds-172647",
  "vibeya-custom-20oz-stainless-steel-tumbler": "sds-128646",
  "vibeya-custom-3d-bath-mat": "sds-138708",
  "vibeya-custom-flannel-throw-blanket": "sds-97226",
  "vibeya-custom-prompt-design-apron": "sds-275844",
  "vibeya-custom-shower-curtain": "vibeya-shower-curtain",
  "vibeya-custom-womens-yoga-set": "sds-63823",
  "vibeya-custom-womens-tankini-swimsuit-set": "sds-137892",
  "vibeya-custom-kids-basketball-uniform": "sds-233939",
  "vibeya-custom-metal-bottle-cap-wall-sign": "mg8014061",
  "vibeya-custom-washed-denim-baseball-cap": "mg8012002",
}

const legacyGenerationPromptTemplates: Record<string, string> = {
  "sds-167256": "Long-sleeve tee: use the selected front/back print guide as a hard manufacturing boundary. Keep all ink, words, effects, and decorations inside the marked rectangle; preserve the shirt, fabric, color, seams, and unselected sides.",
  "vibeya-washed-hoodie": "Washed hoodie: preserve the selected wash color, garment construction, pocket, hood, seams, and fabric texture. Keep the complete print within the selected marked print region with visible fabric margin; do not print on sleeves, hood, pocket, cuffs, hem, or unselected side.",
  "sds-172647": "Knitted beanie: print only on the marked front folded cuff. Keep the crown, sides, back, knit texture, and selected color unchanged; leave the back view blank.",
  "sds-128646": "Stainless tumbler: apply one continuous full-wrap design across the complete cylindrical body and align it across the front, side, and back views. Keep the lid, straw, metal rim, and bottom edge unprinted.",
  "sds-138708": "Bath mat: cover the complete printable top fabric face edge to edge, including rounded corners. Preserve the mat silhouette, stitching, plush texture, and white photo background; never print outside the mat.",
  "sds-97226": "Flannel throw blanket: apply one continuous full-bleed design to the visible front face only. Preserve the soft flannel texture, natural folds, rectangular shape, and two-hook hanging presentation.",
  "sds-275844": "Apron: the white rectangle in the print-area guide is only a placement mask that marks the printable upper bib. It is not white apron fabric, a sewn patch, a white print background, or part of the artwork. The entire real apron is black; render continuous black fabric beneath and around the design. Print the complete design only inside the guide coordinates, and keep the straps, buckle, ties, seams, lower apron, pockets, and studio background unprinted. Unless the customer explicitly requests a background, use borderless artwork so the black fabric shows through.",
  "vibeya-shower-curtain": "Shower curtain: apply the design only to the printable curtain panel and preserve its selected dimensions, grommets, seams, folds, fabric, and clean hanging product presentation.",
  "sds-63823": "Yoga set: use the same coordinated print across the crop-top front and back and shorts front and back. Preserve the four-view layout, matte stretch-knit texture, black binding, seams, and product construction.",
  "sds-137892": "Tankini set: keep the top and shorts as a matching two-piece set. Apply coordinated artwork only to the marked printable fabric panels; preserve trim, seams, silhouette, fit, and selected color.",
  "sds-233939": "Kids' basketball uniform: preserve the front jersey, back jersey, and shorts layout. Print only on customer-selected marked panels; every unselected panel stays solid in the selected color with no stray marks.",
  "mg8014061": "Metal bottle-cap wall sign: follow the selected piece count and layout exactly. Print only inside each circular face; preserve the black scalloped metal rims and pure-white background.",
  "mg8012002": "Washed denim cap: show one front-facing cap and print only inside the marked front crown panel. Keep the brim, side panels, seams, eyelets, button, closure, and background unprinted.",
}

export function getLegacyVibeyaGenerationPromptTemplate(productId: string) {
  const legacyId = (productIdAliases[productId] ?? productId)
  return legacyGenerationPromptTemplates[legacyId] ?? ""
}

function safeImageUrl(value: unknown) {
  if (typeof value !== "string") return ""
  const url = value.trim()
  if (!url || url.length > 2048) return ""
  if (url.startsWith("/")) return url.startsWith("//") ? "" : url
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" ? url : ""
  } catch {
    return ""
  }
}

export function normalizeVibeyaProductDesigner(value: unknown): VibeyaProductDesignerConfig {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const placements: VibeyaProductDesignerConfig["placements"] = Array.isArray(input.placements)
    ? [...new Set(input.placements.filter((placement): placement is VibeyaProductDesignerConfig["placements"][number] => typeof placement === "string" && allowedPlacements.has(placement)))]
    : ["front"]
  const references: VibeyaProductDesignerReference[] = Array.isArray(input.references) ? input.references.flatMap((item): VibeyaProductDesignerReference[] => {
    if (!item || typeof item !== "object") return []
    const reference = item as Record<string, unknown>
    const baseImageUrl = safeImageUrl(reference.baseImageUrl)
    if (!baseImageUrl) return []
    return [{
      color: typeof reference.color === "string" ? reference.color.trim().slice(0, 80) : "",
      size: typeof reference.size === "string" ? reference.size.trim().slice(0, 80) : "",
      side: reference.side === "back" || reference.side === "surface" ? reference.side : "front",
      baseImageUrl,
      printAreaImageUrl: safeImageUrl(reference.printAreaImageUrl),
    }]
  }) : []
  return {
    enabled: input.enabled === true,
    ...(typeof input.legacyProfile === "string" && input.legacyProfile ? { legacyProfile: input.legacyProfile.slice(0, 100) } : {}),
    generationPromptTemplate: typeof input.generationPromptTemplate === "string" ? input.generationPromptTemplate.trim().slice(0, 8000) : "",
    mode: typeof input.mode === "string" && allowedModes.has(input.mode) ? input.mode as VibeyaProductDesignerConfig["mode"] : "front-back",
    placements,
    galleryUrls: Array.isArray(input.galleryUrls) ? input.galleryUrls.map(safeImageUrl).filter(Boolean).slice(0, 12) : [],
    references: references.slice(0, 100),
  }
}

export function getPublicVibeyaProductDesigner(value: unknown): Omit<VibeyaProductDesignerConfig, "generationPromptTemplate"> {
  const config = normalizeVibeyaProductDesigner(value)
  return {
    enabled: config.enabled,
    ...(config.legacyProfile ? { legacyProfile: config.legacyProfile } : {}),
    mode: config.mode,
    placements: config.placements,
    galleryUrls: config.galleryUrls,
    references: config.references,
  }
}

const asset = (path: string) => `/vibeya/assets/${path}`

/** Snapshot image references used by the existing storefront designer profiles. */
export function getLegacyVibeyaProductDesigner(productId: string): VibeyaProductDesignerConfig | null {
  const legacyId = productIdAliases[productId] ?? productId
  const generationPromptTemplate = getLegacyVibeyaGenerationPromptTemplate(legacyId)
  const surfacePaths: Record<string, string> = {
    "sds-128646": "products/sds-128646/print-area-reference.png",
    "sds-63823": "products/sds-63823/blank-set-reference-v3.png",
    "sds-97226": "products/sds-97226/blank-print-base.webp",
    "sds-138708": "products/sds-138708/blank-print-base.webp",
    "mg8014061": "products/mg8014061/black/blank-sign-print-area.png",
    "sds-172647": "products/sds-172647/black/beanie-print-area-guide.webp",
    "mg8012002": "products/mg8012002/black/print-area-guide.webp",
    "vibeya-shower-curtain": "products/vibeya-shower-curtain/36x70.8in.webp",
    "sds-137892": "products/mg8011024/swimwear-blank-product-base.png",
  }
  if (surfacePaths[legacyId]) return normalizeVibeyaProductDesigner({
    enabled: true,
    legacyProfile: legacyId,
    generationPromptTemplate,
    mode: "full-surface",
    placements: ["wrap"],
    references: [{ color: "", size: "", side: "surface", baseImageUrl: asset(surfacePaths[legacyId]), printAreaImageUrl: "" }],
  })

  if (legacyId === "sds-275844") return normalizeVibeyaProductDesigner({
    enabled: true, legacyProfile: legacyId, generationPromptTemplate, mode: "front-back", placements: ["front"],
    references: [{ color: "Black", size: "", side: "front", baseImageUrl: asset("products/sds-275844/black/blank-front.png"), printAreaImageUrl: asset("products/sds-275844/black/print-area-guide.png") }],
  })

  if (legacyId === "sds-233939") return normalizeVibeyaProductDesigner({
    enabled: true, legacyProfile: legacyId, generationPromptTemplate, mode: "front-back", placements: ["front", "back", "both"],
    references: ["black", "white", "red", "blue", "yellow"].flatMap((folder, index) => {
      const color = ["Black", "White", "Red", "Sapphire Blue", "Pure yellow"][index]
      return [
        { color, size: "", side: "front", baseImageUrl: asset(`products/sds-233939/${folder}/print-area-front.png`), printAreaImageUrl: asset(`products/sds-233939/${folder}/print-area-front.png`) },
        { color, size: "", side: "back", baseImageUrl: asset(`products/sds-233939/${folder}/print-area-back.png`), printAreaImageUrl: asset(`products/sds-233939/${folder}/print-area-back.png`) },
      ]
    }),
  })

  if (legacyId === "sds-167256" || legacyId === "vibeya-washed-hoodie") {
    const hoodie = legacyId === "vibeya-washed-hoodie"
    const folders = hoodie
      ? [["Khaki", "brown"], ["Gray", "light-gray"], ["Black", "black"], ["Green", "muted-green"], ["Pink", "pink"], ["Purple", "lavender"]]
      : [["Black", "black"], ["White", "white"], ["Red", "red"], ["Gray", "gray"], ["LightGray", "light-gray"], ["Cream", "cream"], ["Navy", "navy"]]
    const base = hoodie ? "products/mg8003077" : "products/sds-167256"
    return normalizeVibeyaProductDesigner({
      enabled: true, legacyProfile: legacyId, generationPromptTemplate, mode: "front-back", placements: ["front", "back", "both"],
      references: folders.flatMap(([color, folder]) => ["front", "back"].map((side) => ({
        color, size: "", side,
        baseImageUrl: asset(`${base}/${folder}/blank-${side}.webp`),
        printAreaImageUrl: asset(`${base}/${folder}/print-zone-${side}.png`),
      }))),
    })
  }
  return null
}
