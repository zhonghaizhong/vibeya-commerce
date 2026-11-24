import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const folder = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(folder, "../../../apps/backend/package.json"))
const sharp = require("sharp")
const basePath = join(folder, "blank-front-base.png")
const outputPath = join(folder, "print-area-guide.png")

const mask = Buffer.from(`
  <svg width="1122" height="1402" viewBox="0 0 1122 1402" xmlns="http://www.w3.org/2000/svg">
    <path d="M 335 352 C 290 370 250 394 230 425 L 218 1138 C 216 1194 239 1236 278 1250 L 858 1250 C 896 1234 918 1193 914 1138 L 892 425 C 871 394 832 370 787 352 C 675 329 447 329 335 352 Z"
      fill="#30d6c1" fill-opacity="0.42" stroke="#00a996" stroke-width="7" stroke-linejoin="round"/>
  </svg>
`)

await sharp(basePath)
  .composite([{ input: mask }])
  .png()
  .toFile(outputPath)

console.log(outputPath)
