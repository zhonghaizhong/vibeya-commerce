import { Metadata } from "next"
import { listProducts } from "@lib/data/products"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { toJsonLd } from "@lib/util/product-structured-data"
import { retrieveCustomer } from "@lib/data/customer"
import VibeyaHome from "./vibeya-home"

const HOME_TITLE = "Custom Products & Personalized Gifts | VIBEYA"
const HOME_DESCRIPTION =
  "Create personalized gifts from a photo or AI prompt. Design custom apparel, drinkware, blankets, bath mats, and shower curtains, then preview and order online."

// Used only if the store catalog cannot be retrieved while rendering the page.
type ShopItem = { name: string; handle: string }

const SHOP_ITEMS_FALLBACK = [
  ["VIBEYA Custom Cotton Long Sleeve Tee", "vibeya-custom-cotton-long-sleeve-tee"],
  ["VIBEYA Washed Vintage Hooded Sweatshirt", "vibeya-washed-vintage-hooded-sweatshirt"],
  ["VIBEYA Custom Knitted Beanie", "vibeya-custom-knitted-beanie"],
  ["VIBEYA Custom 20 oz Stainless Steel Tumbler", "vibeya-custom-20oz-stainless-steel-tumbler"],
  ["VIBEYA Custom 3D Optical Illusion Bath Mat", "vibeya-custom-3d-bath-mat"],
  ["VIBEYA Custom Flannel Throw Blanket", "vibeya-custom-flannel-throw-blanket"],
  ["VIBEYA Custom Prompt-Designed Apron", "vibeya-custom-prompt-design-apron"],
  ["VIBEYA Custom Shower Curtain", "vibeya-custom-shower-curtain"],
  ["VIBEYA Custom Women’s Tankini Swimsuit Set", "vibeya-custom-womens-tankini-swimsuit-set"],
  ["VIBEYA Custom Kids' Basketball Uniform", "vibeya-custom-kids-basketball-uniform"],
  ["VIBEYA Custom Metal Bottle Cap Wall Sign", "vibeya-custom-metal-bottle-cap-wall-sign"],
] as const

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
  let shopItems: ShopItem[] = SHOP_ITEMS_FALLBACK.map(([name, handle]) => ({
    name,
    handle,
  }))

  try {
    const {
      response: { products },
    } = await listProducts({
      countryCode,
      queryParams: { limit: 100, fields: "id,handle,title" },
    })
    const publishedShopItems = products
      .filter((product) => product.handle && product.title)
      .map((product) => ({ name: product.title, handle: product.handle }))

    if (publishedShopItems.length) {
      shopItems = publishedShopItems
    }
  } catch {
    // Keep the existing fallback list when the store catalog is temporarily unavailable.
  }

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
        hasPart: { "@id": `${pageUrl}#shop` },
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#shop`,
        name: "Custom Products & Personalized Gifts",
        description: HOME_DESCRIPTION,
        itemListOrder: "https://schema.org/ItemListUnordered",
        numberOfItems: shopItems.length,
        itemListElement: shopItems.map(({ name, handle }, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name,
          url: `${origin}/${countryCode}/products/${encodeURIComponent(handle)}`,
        })),
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
