import { readFile } from "node:fs/promises"
import path from "node:path"

const PRODUCT_REFERENCE_PATHS: Record<string, string | Record<string, string>> = {
  "sds-97226": "vibeya/assets/products/sds-97226/blank-print-base.webp",
  "sds-138708": "vibeya/assets/products/sds-138708/blank-print-base.webp",
  "sds-172647": {
    Black: "vibeya/assets/products/sds-172647/beanie-print-area-guide.webp",
    Red: "vibeya/assets/products/sds-172647/red/beanie-print-area-guide.webp",
    Gray: "vibeya/assets/products/sds-172647/gray/beanie-print-area-guide.webp",
  },
}

export async function getVibeyaProductReference(productId: string, color?: string): Promise<string> {
  const configuredPath = PRODUCT_REFERENCE_PATHS[productId]
  const referencePath = typeof configuredPath === "string" ? configuredPath : configuredPath?.[color || "Black"]
  if (!referencePath) return ""

  const candidates = [
    path.resolve(process.cwd(), "../storefront/public", referencePath),
    path.resolve(process.cwd(), "apps/storefront/public", referencePath),
  ]

  for (const filePath of candidates) {
    try {
      const image = await readFile(filePath)
      return `data:image/webp;base64,${image.toString("base64")}`
    } catch {
      // Try the other workspace layout before reporting a missing base image.
    }
  }

  throw new Error(`The print reference image for ${productId} is missing from the storefront assets.`)
}
