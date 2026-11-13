import { readFile } from "node:fs/promises"
import path from "node:path"

const PRODUCT_REFERENCE_PATHS: Record<string, string | Record<string, string> | Record<string, Record<string, string>>> = {
  "sds-97226": "vibeya/assets/products/sds-97226/blank-print-base.webp",
  "sds-138708": "vibeya/assets/products/sds-138708/blank-print-base.webp",
  "sds-137892": "vibeya/assets/products/mg8011024/swimwear-blank-product-base.png",
  "vibeya-shower-curtain": {
    "36x70.8in": { White: "vibeya/assets/products/vibeya-shower-curtain/36x70.8in.webp" },
    "60x70.8in": { White: "vibeya/assets/products/vibeya-shower-curtain/60x70.8in.webp" },
    "70.8x70.8in": { White: "vibeya/assets/products/vibeya-shower-curtain/70.8x70.8in.png" },
    "70.8x84in": { White: "vibeya/assets/products/vibeya-shower-curtain/70.8x84in.webp" },
  },
  "sds-172647": {
    Black: "vibeya/assets/products/sds-172647/beanie-print-area-guide.webp",
    Red: "vibeya/assets/products/sds-172647/red/beanie-print-area-guide.webp",
    Gray: "vibeya/assets/products/sds-172647/gray/beanie-print-area-guide.webp",
  },
}

const PRODUCT_PRINT_AREA_REFERENCE_PATHS: Record<string, string> = {
  "sds-137892": "vibeya/assets/products/mg8011024/swimwear-front-print-area-guide.png",
}

async function readProductReference(referencePath: string): Promise<string> {
  if (!referencePath) return ""

  const candidates = [
    path.resolve(process.cwd(), "../storefront/public", referencePath),
    path.resolve(process.cwd(), "apps/storefront/public", referencePath),
    // Medusa production runs from apps/backend/.medusa/server, where the
    // storefront asset directory is three levels up and beside backend.
    path.resolve(process.cwd(), "../../../storefront/public", referencePath),
  ]

  for (const filePath of candidates) {
    try {
      const image = await readFile(filePath)
      const extension = path.extname(filePath).toLowerCase()
      const mimeType = extension === ".png" ? "image/png" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/webp"
      return `data:${mimeType};base64,${image.toString("base64")}`
    } catch {
      // Try the other workspace layout before reporting a missing reference.
    }
  }

  throw new Error(`The print reference image is missing from the storefront assets: ${referencePath}`)
}

export async function getVibeyaProductReference(productId: string, color?: string, size?: string): Promise<string> {
  const configuredPath = PRODUCT_REFERENCE_PATHS[productId]
  const selectedPath = typeof configuredPath === "string"
    ? configuredPath
    : configuredPath?.[size || ""] ?? configuredPath?.[color || "Black"]
  const referencePath = typeof selectedPath === "string" ? selectedPath : selectedPath?.[color || "Black"]
  return referencePath ? readProductReference(referencePath) : ""
}

export async function getVibeyaProductPrintAreaReference(productId: string): Promise<string> {
  const referencePath = PRODUCT_PRINT_AREA_REFERENCE_PATHS[productId]
  return referencePath ? readProductReference(referencePath) : ""
}
