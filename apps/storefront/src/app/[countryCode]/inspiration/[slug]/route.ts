import { readFile } from "node:fs/promises"
import path from "node:path"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { getMarketDefaultLocale } from "@lib/util/market-locale"
import { isSupportedMarketCountry } from "@lib/vibeya/markets"
import {
  getInspirationCopy,
  getPublishedInspirations,
  hasIndexableInspirationCopy,
  type ManagedInspiration,
} from "@lib/vibeya/inspirations"

export const dynamic = "force-dynamic"
export const revalidate = 0

type RouteContext = {
  params: Promise<{ countryCode: string; slug: string }>
}

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;")

const marketLocale: Record<string, string> = {
  us: "en-US",
  ca: "en-CA",
  jp: "ja-JP",
  mx: "es-MX",
}

const productNames: Record<string, Record<string, string>> = {
  wallet: { "ja-JP": "カスタムウォレット", "es-MX": "Cartera personalizada" },
  "pu-wallet": { "ja-JP": "カスタムPUウォレット", "es-MX": "Cartera PU personalizada" },
}

const fieldNames: Record<string, Record<string, string>> = {
  en: { product: "Product", pattern: "Pattern", style: "Style" },
  ja: { product: "商品", pattern: "柄", style: "スタイル" },
  es: { product: "Producto", pattern: "Patrón", style: "Estilo" },
}

const typeNames: Record<string, Record<string, string>> = {
  "mushroom-night-garden": {
    "en-US": "Mushroom Night Garden",
    "en-CA": "Mushroom Night Garden",
    "ja-JP": "きのこと夜の庭",
    "es-MX": "Hongos y jardín nocturno",
  },
  "retro-whimsical": {
    "en-US": "Retro Whimsical",
    "en-CA": "Retro Whimsical",
    "ja-JP": "レトロで遊び心のあるスタイル",
    "es-MX": "Estilo retro y divertido",
  },
}

function getAssetUrl(value: string, origin: string) {
  if (/^(https?:)?\/\//i.test(value)) return new URL(value, origin).href
  if (value.startsWith("/")) return new URL(value, origin).href
  return new URL(`/vibeya/assets/inspiration/${encodeURIComponent(value)}`, origin).href
}

function getProductName(entry: ManagedInspiration, locale: string) {
  const translated = productNames[entry.product]?.[locale]
  if (translated) return translated
  if (entry.product === "wallet") return "Custom Wallet"
  if (entry.product === "pu-wallet") return "Custom PU Wallet"
  return entry.product.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getSchema(entry: ManagedInspiration, title: string, summary: string, image: string, url: string, locale: string) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: title,
        description: summary,
        image: [image],
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: { "@type": "Organization", name: STORE_NAME, url: "https://vibeyastudio.com/" },
        publisher: { "@type": "Organization", name: STORE_NAME, url: "https://vibeyastudio.com/" },
        inLanguage: locale,
        keywords: entry.tags,
        articleSection: [entry.product, entry.pattern, entry.style],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://vibeyastudio.com/" },
          { "@type": "ListItem", position: 2, name: "Inspiration", item: "https://vibeyastudio.com/vibeya/inspiration/index.html" },
          { "@type": "ListItem", position: 3, name: title, item: url },
        ],
      },
    ],
  }).replace(/</g, "\\u003c")
}

export async function GET(_request: Request, context: RouteContext) {
  const { countryCode: rawCountry, slug } = await context.params
  const countryCode = rawCountry.toLowerCase()
  if (!isSupportedMarketCountry(countryCode)) {
    return new Response("Not found", { status: 404 })
  }

  const id = decodeURIComponent(slug)
  let entries: ManagedInspiration[]
  try {
    entries = await getPublishedInspirations(countryCode)
  } catch {
    return new Response("Inspiration is temporarily unavailable", { status: 503 })
  }

  const entry = entries.find((item) => item.id === id && item.published)
  if (!entry || !entry.slug.startsWith("story.html?inspiration=")) {
    return new Response("Not found", { status: 404 })
  }

  const locale = marketLocale[countryCode] ?? getMarketDefaultLocale(countryCode)
  const copy = getInspirationCopy(entry, locale)
  if (!hasIndexableInspirationCopy(copy)) {
    return new Response("Not found", { status: 404 })
  }

  const origin = await getSiteOrigin()
  const canonical = new URL(`/${countryCode}/inspiration/${encodeURIComponent(entry.id)}`, origin).href
  const title = copy.title!.trim()
  const summary = copy.summary!.trim()
  const heroImage = getAssetUrl(copy.image!, origin)
  const printImage = getAssetUrl(entry.printImage || copy.image!, origin)
  const articleBody = copy.articleBody!.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const tags = (copy.tags ?? []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")
  const schema = getSchema(entry, title, summary, heroImage, canonical, locale)
  const eligibleCountries = (entry.countryCodes ?? [countryCode]).filter((country) =>
    isSupportedMarketCountry(country) && (country === "us" || country === "ca" || hasIndexableInspirationCopy(getInspirationCopy(entry, marketLocale[country])))
  )
  const alternates = eligibleCountries.map((country) =>
    `<link rel="alternate" hreflang="${marketLocale[country]}" href="${new URL(`/${country}/inspiration/${encodeURIComponent(entry.id)}`, origin).href}">`
  ).join("")
  const xDefault = eligibleCountries.includes("us")
    ? `<link rel="alternate" hreflang="x-default" href="${new URL(`/us/inspiration/${encodeURIComponent(entry.id)}`, origin).href}">`
    : ""
  const localeKey = locale.startsWith("ja") ? "ja" : locale.startsWith("es") ? "es" : "en"
  const navCopy = localeKey === "ja"
    ? { home: "ホーム", inspiration: "インスピレーション", journal: "デザインストーリー", back: "← すべてのインスピレーションへ", shop: "ショップへ戻る", footerInspiration: "インスピレーション" }
    : localeKey === "es"
      ? { home: "Inicio", inspiration: "Inspiración", journal: "DIARIO DE DISEÑO", back: "← Volver a todas las ideas", shop: "Volver a la tienda", footerInspiration: "Inspiración" }
      : { home: "Home", inspiration: "Inspiration Market", journal: "DESIGN JOURNAL", back: "← Back to all inspiration", shop: "Return to Shop", footerInspiration: "Inspiration Market" }
  const labels = fieldNames[localeKey]
  const productName = getProductName(entry, locale)
  const patternName = typeNames[entry.pattern]?.[locale] ?? entry.pattern.replace(/-/g, " ")
  const styleName = typeNames[entry.style]?.[locale] ?? entry.style.replace(/-/g, " ")
  const glimpse = locale === "ja-JP"
    ? "商品に使われている印刷デザイン。色や配置をカスタマイズできます。"
    : locale === "es-MX"
      ? "Diseño de impresión usado en el producto. Personaliza los colores y la ubicación."
      : "The print artwork used on this product. Customize the colors and placement to make it yours."
  const documentPath = path.join(process.cwd(), "public", "vibeya", "inspiration", "story.html")
  let html = await readFile(documentPath, "utf8")

  html = html.replace(/<html lang="[^"]*">/, `<html lang="${escapeHtml(locale)}">`)
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(summary)}">`)
  html = html.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="index,follow,max-image-preview:large">')
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)} | VIBEYA Design Story</title>`)
  html = html.replace("<body data-inspiration-template=\"true\">", `<body data-inspiration-template="true" data-inspiration-id="${escapeHtml(entry.id)}" data-inspiration-route="true">`)
  html = html.replace('<a id="storyHomeLink" href="/us/">Home</a>', `<a id="storyHomeLink" href="/${countryCode}/">${navCopy.home}</a>`)
  html = html.replace('<a id="storyInspirationLink" href="/vibeya/inspiration/index.html">Inspiration Market</a>', `<a id="storyInspirationLink" href="/vibeya/inspiration/index.html?country=${countryCode}&locale=${locale}">${navCopy.inspiration}</a>`)
  html = html.replace('<span id="storyBreadcrumbTitle">Design Story</span>', `<span id="storyBreadcrumbTitle">${escapeHtml(title)}</span>`)
  html = html.replace('<span class="pill-label" id="storyEyebrow">DESIGN JOURNAL · VIBEYA INSPIRATION</span>', `<span class="pill-label" id="storyEyebrow">${navCopy.journal} · ${escapeHtml(productName)}</span>`)
  html = html.replace('<a id="storyBackLink" href="/vibeya/inspiration/index.html">← Back to all inspiration</a>', `<a id="storyBackLink" href="/vibeya/inspiration/index.html?country=${countryCode}&locale=${locale}">${navCopy.back}</a>`)
  html = html.replace('<span id="storyFooterCopyright">© 2026 VIBEYA · Inspiration Market</span>', `<span id="storyFooterCopyright">© 2026 VIBEYA · ${navCopy.footerInspiration}</span>`)
  html = html.replace('<a id="storyFooterInspiration" href="/vibeya/inspiration/index.html">Inspiration Market</a>', `<a id="storyFooterInspiration" href="/vibeya/inspiration/index.html?country=${countryCode}&locale=${locale}">${navCopy.footerInspiration}</a>`)
  html = html.replace('<a id="storyFooterShop" href="/us/">Return to Shop</a>', `<a id="storyFooterShop" href="/${countryCode}/">${navCopy.shop}</a>`)
  html = html.replace(/<\/head>/, `<link rel="canonical" href="${canonical}">${alternates}${xDefault}<meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(title)} | VIBEYA Design Story"><meta property="og:description" content="${escapeHtml(summary)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${heroImage}"><meta property="og:locale" content="${locale}"><script type="application/ld+json">${schema}</script></head>`)
  html = html.replace(/<img id="storyHeroImage" src="[^"]*" alt="[^"]*"/, `<img id="storyHeroImage" src="${heroImage}" alt="${escapeHtml(`${title} design inspiration`)}"`)
  html = html.replace(/<img id="storyPrintImage" src="[^"]*"/, `<img id="storyPrintImage" src="${printImage}"`)
  html = html.replace(/<h1 id="storyTitle">[^<]*<\/h1>/, `<h1 id="storyTitle">${escapeHtml(title)}</h1>`)
  html = html.replace(/<p id="storySummary"><\/p>/, `<p id="storySummary">${escapeHtml(summary)}</p>`)
  html = html.replace(/<div class="chips" id="storyTags"><\/div>/, `<div class="chips" id="storyTags">${tags}</div>`)
  html = html.replace(/<strong>Product<\/strong><span id="storyProduct"><\/span>/, `<strong>${labels.product}</strong><span id="storyProduct">${escapeHtml(productName)}</span>`)
  html = html.replace(/<strong>Pattern<\/strong><span id="storyPattern"><\/span>/, `<strong>${labels.pattern}</strong><span id="storyPattern">${escapeHtml(patternName)}</span>`)
  html = html.replace(/<strong>Style<\/strong><span id="storyStyle"><\/span>/, `<strong>${labels.style}</strong><span id="storyStyle">${escapeHtml(styleName)}</span>`)
  html = html.replace(/<section class="story-copy article-prose" id="storyBody"[^>]*><\/section>/, `<section class="story-copy article-prose" id="storyBody" aria-label="Design story">${articleBody.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`)
  html = html.replace(/<p id="storyGlanceText"><\/p>/, `<p id="storyGlanceText">${escapeHtml(glimpse)}</p>`)
  html = html.replace(/href="\/us\//g, `href="/${countryCode}/`)
  html = html.replace(/href="index\.html"/g, `href="/vibeya/inspiration/index.html?country=${countryCode}&locale=${locale}"`)
  html = html.replace(/href="\.\.\/index\.html/g, `href="/vibeya/index.html?country=${countryCode}&locale=${locale}`)
  html = html.replace(/(href|src)="\.\.\/assets\//g, '$1="/vibeya/assets/')

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "index, follow, max-image-preview:large",
    },
  })
}
