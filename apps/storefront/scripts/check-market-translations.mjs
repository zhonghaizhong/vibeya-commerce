import { readFile, readdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const appDirectory = resolve(scriptDirectory, "..")
const catalog = JSON.parse(await readFile(resolve(appDirectory, "src/lib/util/market-translations.json"), "utf8"))
const requiredMarkets = ["us", "ca", "jp", "mx"]
const requiredLocalizedMarkets = ["jp", "mx"]
const errors = []

const flattenPaths = (value, prefix = "") => Object.entries(value ?? {}).flatMap(([key, item]) => {
  const path = prefix ? `${prefix}.${key}` : key
  return item && typeof item === "object" && !Array.isArray(item)
    ? flattenPaths(item, path)
    : [path]
})
const findEmptyPaths = (value, prefix = "") => Object.entries(value ?? {}).flatMap(([key, item]) => {
  const path = prefix ? `${prefix}.${key}` : key
  return item && typeof item === "object" && !Array.isArray(item)
    ? findEmptyPaths(item, path)
    : typeof item !== "string" || !item.trim() ? [path] : []
})

for (const market of requiredMarkets) {
  const config = catalog.markets?.[market]
  if (!config?.defaultLocale || !Array.isArray(config.locales) || !config.locales.includes(config.defaultLocale)) {
    errors.push(`Market ${market} is missing a valid default locale.`)
  }
  if (!catalog.countryNames?.[config?.defaultLocale]?.[market]) {
    errors.push(`Market ${market} is missing its localized destination name.`)
  }
}

for (const market of requiredLocalizedMarkets) {
  const copy = catalog.ui?.[market]
  if (!copy || findEmptyPaths(copy).length) {
    errors.push(`Market ${market} has a missing UI translation.`)
  }
  const product = catalog.products?.[market]
  if (!product || findEmptyPaths(product).length) {
    errors.push(`Market ${market} has a missing product translation.`)
  }
  const inspiration = catalog.inspirationTerms?.[catalog.markets?.[market]?.locales?.[0]]
  if (!inspiration || findEmptyPaths(inspiration).length) errors.push(`Market ${market} has incomplete inspiration labels.`)
}

for (const section of ["ui", "products", "inspirationTerms"]) {
  const referencePaths = new Set(flattenPaths(catalog[section]?.jp))
  const marketPaths = new Set(flattenPaths(catalog[section]?.mx))
  const missing = [...referencePaths].filter((path) => !marketPaths.has(path))
  const extra = [...marketPaths].filter((path) => !referencePaths.has(path))
  if (missing.length || extra.length) {
    errors.push(`${section} catalogs differ between Japan and Mexico (missing ${missing.join(", ")}; extra ${extra.join(", ")}).`)
  }
}

const phraseLocales = ["ja-JP", "es-MX"]
const phraseSets = phraseLocales.map((locale) => new Set(Object.keys(catalog.phrases?.[locale] ?? {})))
const firstSet = phraseSets[0]
for (const [index, locale] of phraseLocales.entries()) {
  const missing = [...firstSet].filter((key) => !phraseSets[index].has(key))
  const extra = [...phraseSets[index]].filter((key) => !firstSet.has(key))
  if (missing.length || extra.length) {
    errors.push(`${locale} phrase catalog differs from ja-JP (missing ${missing.length}, extra ${extra.length}).`)
  }
  if ([...phraseSets[index]].some((key) => !catalog.phrases[locale][key]?.trim())) {
    errors.push(`${locale} has empty phrase translations.`)
  }
  const allowedIdenticalPhrases = new Set(["Color", "Subtotal", "Total", "© 2026 VIBEYA."])
  const untranslated = Object.entries(catalog.phrases?.[locale] ?? {}).filter(([source, target]) => source === target && !allowedIdenticalPhrases.has(source))
  if (untranslated.length) errors.push(`${locale} has untranslated phrases: ${untranslated.map(([source]) => JSON.stringify(source)).join(", ")}.`)
}

// Runtime design and saved-design states are inserted by the iframe after the
// initial HTML scan. Keep these critical dynamic messages behind the same
// build gate, and derive the job-state labels from their source map.
const requiredStudioPhrases = [
  "Your saved designs",
  "Your saved designs will appear here.",
  "Your request is saved in My Designs and is still processing. Please wait 1–2 minutes; you can leave this page and come back later.",
  "Your submitted designs are saved to your account.",
  "Designs saved to your account will appear here.",
  "Sign in to see your designs",
  "Could not load your designs.",
  "Unable to load designs",
  "Please refresh and try again.",
  "Load image",
  "Your image will appear here when it is ready",
  "Size for your bag",
  "Choose size",
  "Start generation",
  "Recover image",
  "Click to enlarge",
  "This design is not ready yet.",
  "Choose a product color before adding this design to your bag.",
  "Choose a product size before adding this design to your bag.",
  "Please choose a valid color.",
  "Please choose a valid size.",
  "This design is missing its task ID. Refresh My Designs and try again.",
  "Design deleted.",
  "Adding…",
  "Deleting…",
  "Could not add this design to your bag.",
  "Could not load this design image.",
  "This product is no longer available for design.",
  "This design already uses that color.",
  "This design could not be deleted.",
  "The provider task can be checked again. Recover it to load the generated image.",
  "No image was returned. Failed generations do not use a design credit.",
  "No image was returned. Edit the description and try again; failed generations do not use a design credit.",
]
const studioMarkup = await readFile(resolve(appDirectory, "public/vibeya/index.html"), "utf8")
const statusMap = studioMarkup.match(/function jobStatusLabel\(status\)\s*\{\s*return\s*\(\{([\s\S]*?)\}\)\[status\]\|\|'([^']+)'\s*;?\s*\}/)
if (!statusMap) {
  errors.push("Could not read the design-job status labels from the studio source.")
} else {
  const statusLabels = [...statusMap[1].matchAll(/:\s*'([^']+)'/g)].map((match) => match[1])
  requiredStudioPhrases.push(...statusLabels, statusMap[2])
}
for (const phrase of new Set(requiredStudioPhrases)) {
  for (const locale of phraseLocales) {
    if (!catalog.phrases?.[locale]?.[phrase]?.trim()) {
      errors.push(`${locale} is missing a translation for dynamic design UI text: ${JSON.stringify(phrase)}.`)
    }
  }
}
for (const [locale, labels] of Object.entries({ "ja-JP": ["表示", "閉じる"], "es-MX": ["Mostrar", "Ocultar"] })) {
  for (const label of labels) {
    if (!studioMarkup.includes(`content:'${label}'`)) errors.push(`${locale} is missing its localized saved-design prompt toggle label ${JSON.stringify(label)}.`)
  }
}

const navigationLocales = Object.keys(catalog.navigation ?? {})
const navigationKeys = new Set(Object.keys(catalog.navigation?.[navigationLocales[0]] ?? {}))
for (const locale of navigationLocales) {
  const current = catalog.navigation[locale]
  const missing = [...navigationKeys].filter((key) => !current[key]?.trim())
  const extra = Object.keys(current).filter((key) => !navigationKeys.has(key))
  if (missing.length || extra.length) errors.push(`${locale} navigation labels differ (missing ${missing.join(", ")}; extra ${extra.join(", ")}).`)
}

// Detect static storefront copy added without a matching Japanese or Mexican
// phrase entry. This complements the key and locale parity checks above.
const staticRoot = resolve(appDirectory, "public/vibeya")
const htmlFiles = [resolve(staticRoot, "index.html"), resolve(staticRoot, "checkout/index.html")]

const decodeHtml = (text) => text
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
const phraseCatalogs = Object.fromEntries(phraseLocales.map((locale) => [locale, new Set(Object.keys(catalog.phrases?.[locale] ?? {}).map((text) => text.replace(/\s+/g, " ").trim()))]))
const missingStatic = new Map(phraseLocales.map((locale) => [locale, new Map()]))
const localeNames = new Set(Object.values(catalog.localeNames ?? {}))
const untranslatedProductTokens = new Set(["VIBEYA", "XS", "S", "M", "L", "XL", "2XL", "3XL", "Facebook", "Instagram", ...localeNames])
const isTranslatable = (text) => /[A-Za-z]{2}/.test(text) && !/^[\d\W_]+$/.test(text)

for (const filePath of htmlFiles) {
  const markup = (await readFile(filePath, "utf8"))
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
  const candidates = []
  for (const match of markup.matchAll(/>([^<>]+)</g)) candidates.push(decodeHtml(match[1]).replace(/\s+/g, " ").trim())
  for (const match of markup.matchAll(/\b(?:alt|aria-label|title|placeholder)\s*=\s*(["'])(.*?)\1/gi)) candidates.push(decodeHtml(match[2]).replace(/\s+/g, " ").trim())
  for (const candidate of candidates) {
    if (!isTranslatable(candidate) || candidate.includes("{{") || candidate.includes("${") || untranslatedProductTokens.has(candidate) || /^[$¥€£\d.,\sA-Z-]+$/.test(candidate)) continue
    for (const locale of phraseLocales) {
      if (!phraseCatalogs[locale].has(candidate)) {
        const byFile = missingStatic.get(locale)
        const relativePath = filePath.slice(staticRoot.length + 1).replaceAll("\\", "/")
        if (!byFile.has(candidate)) byFile.set(candidate, new Set())
        byFile.get(candidate).add(relativePath)
      }
    }
  }
}
for (const [locale, missing] of missingStatic) {
  if (missing.size) {
    const sample = [...missing.keys()].slice(0, 12).map((text) => JSON.stringify(text)).join(", ")
    errors.push(`${locale}: ${missing.size} static homepage or checkout strings are missing phrase entries: ${sample}`)
  }
}

const sourceRoot = resolve(appDirectory, "src")
const sourceFiles = []
const collectSourceFiles = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name)
    if (entry.isDirectory()) await collectSourceFiles(entryPath)
    else if (entry.isFile() && /\.(?:tsx|ts)$/.test(entry.name)) sourceFiles.push(entryPath)
  }
}
await collectSourceFiles(sourceRoot)
for (const filePath of sourceFiles) {
  const source = await readFile(filePath, "utf8")
  const translationSection = source.includes("getProductMarketCopy") ? "products" : source.includes("getMarketUiCopy") ? "ui" : null
  if (!translationSection) continue
  const referencedKeys = new Set([...source.matchAll(/marketCopy\?\.([A-Za-z][A-Za-z\d]*)|text\(["']([A-Za-z][A-Za-z\d]*)["']/g)].map((match) => match[1] ?? match[2]))
  for (const key of referencedKeys) {
    for (const market of requiredLocalizedMarkets) {
      const copy = catalog[translationSection]?.[market]
      const exists = translationSection === "products"
        ? Object.hasOwn(copy ?? {}, key) || Object.values(copy ?? {}).some((section) => section && typeof section === "object" && Object.hasOwn(section, key))
        : Object.hasOwn(copy ?? {}, key)
      if (!exists) errors.push(`${market} ${translationSection} copy is missing the referenced key "${key}" (${filePath.slice(sourceRoot.length + 1)}).`)
    }
  }
}

if (errors.length) {
  console.error(`Market translation check failed:\n- ${errors.join("\n- ")}`)
  process.exitCode = 1
} else {
  console.log(`Market translations complete: ${requiredMarkets.length} markets, ${phraseLocales.length} full phrase catalogs, ${Object.keys(catalog.ui.jp).length} shared UI keys, navigation, and product detail copy.`)
}
