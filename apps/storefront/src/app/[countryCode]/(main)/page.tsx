import { Metadata } from "next"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { toJsonLd } from "@lib/util/product-structured-data"
import { retrieveCustomer } from "@lib/data/customer"
import VibeyaHome from "./vibeya-home"

const HOME_TITLE = "Custom Hoodies & T-Shirts Designed by You | VIBEYA"
const HOME_DESCRIPTION =
  "Shop custom hoodies and graphic T-shirts made to order. Choose your garment color, size, and print placement, then personalize your look. Free U.S. shipping."

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await params
  const origin = await getSiteOrigin()
  const canonical = `${origin}/${countryCode}`

  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: canonical,
      siteName: STORE_NAME,
      images: ["/opengraph-image.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: ["/twitter-image.jpg"],
    },
  }
}

export default async function Home({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const customer = await retrieveCustomer().catch(() => null)
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
      <VibeyaHome countryCode={countryCode} isAuthenticated={Boolean(customer)} />
    </>
  )
}
