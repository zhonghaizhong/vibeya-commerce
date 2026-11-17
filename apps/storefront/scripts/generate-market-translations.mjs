import { readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const appDirectory = resolve(scriptDirectory, "..")
const sourcePath = resolve(appDirectory, "src/lib/util/market-translations.json")
const outputPath = resolve(appDirectory, "public/vibeya/assets/shared/market-translations.generated.js")
const catalog = JSON.parse(await readFile(sourcePath, "utf8"))

const serializedCatalog = JSON.stringify(catalog).replace(/</g, "\\u003c")
const generated = `/* Generated from src/lib/util/market-translations.json. Do not edit by hand. */\nwindow.VIBEYA_MARKET_TRANSLATIONS = ${serializedCatalog}\n`

await writeFile(outputPath, generated)
console.log(`Generated browser translations at ${outputPath}`)
