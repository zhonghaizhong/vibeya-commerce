import { readFile } from "node:fs/promises"
import path from "node:path"

const PRODUCT_REFERENCE_PATHS: Record<string, string | Record<string, string> | Record<string, Record<string, string>>> = {
  "sds-97226": "vibeya/assets/products/sds-97226/blank-print-base.webp",
  "sds-138708": "vibeya/assets/products/sds-138708/blank-print-base.webp",
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

export async function getVibeyaProductReference(productId: string, color?: string, size?: string): Promise<string> {
  const configuredPath = PRODUCT_REFERENCE_PATHS[productId]
  const selectedPath = typeof configuredPath === "string"
    ? configuredPath
    : configuredPath?.[size || ""] ?? configuredPath?.[color || "Black"]
  const referencePath = typeof selectedPath === "string" ? selectedPath : selectedPath?.[color || "Black"]
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
      const mimeType = path.extname(filePath).toLowerCase() === ".png" ? "image/png" : "image/webp"
      return `data:${mimeType};base64,${image.toString("base64")}`
    } catch {
      // Try the other workspace layout before reporting a missing base image.
    }
  }

  throw new Error(`The print reference image for ${productId} is missing from the storefront assets.`)
}
