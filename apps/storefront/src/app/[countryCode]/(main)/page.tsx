import { Metadata } from "next"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { toJsonLd } from "@lib/util/product-structured-data"
import { retrieveCustomer } from "@lib/data/customer"
import VibeyaHome from "./vibeya-home"
import { getMarketAlternateUrls, getMarketLocale, getMarketLocaleUrl } from "@lib/util/market-locale"
import { SUPPORTED_MARKET_COUNTRIES } from "@lib/vibeya/markets"

const HOME_TITLE = "Custom Products & Personalized Gifts | VIBEYA"
const HOME_DESCRIPTION =
  "Create custom apparel, drinkware, blankets, shower curtains, and home decor online. Personalize a product, preview your design, and order one made for you."
const LOCALIZED_HOME_COPY: Record<string, { title: string; description: string }> = {
  "en-CA": {
    title: "Custom Products & Personalized Gifts in Canada | VIBEYA",
    description: "Create custom apparel, drinkware, blankets, shower curtains, and home decor in Canada. Preview your design and order a personalized product made for you.",
  },
  "ja-JP": {
    title: "オリジナル商品・パーソナライズギフト | VIBEYA",
    description: "アパレル、ドリンクウェア、ブランケット、シャワーカーテンなどをカスタマイズ。デザインをプレビューして、自分だけの商品を注文できます。",
  },
  "es-MX": {
    title: "Productos personalizados y regalos | VIBEYA",
    description: "Personaliza ropa, vasos, mantas, cortinas de baño y decoración. Previsualiza tu diseño y pide un producto hecho para ti.",
  },
  "fr-CA": {
    title: "Produits personnalisés et cadeaux | VIBEYA",
    description: "Personnalisez des vêtements, verres, couvertures, rideaux de douche et articles déco. Prévisualisez votre création et commandez un produit unique.",
  },
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ locale?: string }>
}): Promise<Metadata> {
  const [{ countryCode }, search] = await Promise.all([params, searchParams])
  const origin = await getSiteOrigin()
  const locale = getMarketLocale(countryCode, search.locale)
  const copy = LOCALIZED_HOME_COPY[locale] ?? { title: HOME_TITLE, description: HOME_DESCRIPTION }
  const canonical = getMarketLocaleUrl(origin, countryCode, "", locale)
  const alternates = getMarketAlternateUrls(origin, "", [...SUPPORTED_MARKET_COUNTRIES])

  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical, languages: alternates },
    openGraph: {
      type: "website",
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: STORE_NAME,
      images: ["/opengraph-image.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: ["/twitter-image.jpg"],
    },
  }
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const [{ countryCode }, search] = await Promise.all([params, searchParams])
  const customer = await retrieveCustomer().catch(() => null)
  const locale = getMarketLocale(countryCode, search.locale)
  const origin = await getSiteOrigin()
  const pageUrl = `${origin}/${countryCode}`
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: STORE_NAME,
        url: origin,
        description:
          "VIBEYA is an online store for customizable apparel, accessories, drinkware, blankets, and bathroom products. Customers can personalize supported products, preview their designs, and order online.",
        knowsAbout: [
          "Personalized gifts",
          "Custom apparel and accessories",
          "Custom drinkware",
          "Custom blankets",
          "Custom bath mats and shower curtains",
          "Online product customization",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: STORE_NAME,
        url: origin,
        publisher: { "@id": `${origin}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${origin}/${countryCode}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}/#webpage`,
        url: pageUrl,
        name: HOME_TITLE,
        description: HOME_DESCRIPTION,
        isPartOf: { "@id": `${origin}/#website` },
        about: { "@id": `${origin}/#organization` },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      <VibeyaHome countryCode={countryCode} locale={locale} isAuthenticated={Boolean(customer)} />
    </>
  )
}
