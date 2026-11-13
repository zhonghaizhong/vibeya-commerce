import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { UCP_MCP_PATH, UCP_REST_BASE_PATH } from "@lib/ucp/ucp"
import {
  DEFAULT_COUNTRY_CODE,
  getDefaultCountryCode,
  getRequestOrigin,
  listCountryCodes,
  STORE_NAME,
} from "@lib/util/site"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const origin = getRequestOrigin(request)

  const [regions, categories, { collections }] = await Promise.all([
    listRegions().catch(() => []),
    listCategories({
      fields: "name,handle,parent_category_id",
      limit: 50,
    }).catch(() => []),
    listCollections({ fields: "title,handle", limit: "50" }).catch(() => ({
      collections: [],
    })),
  ])

  const countries = listCountryCodes(regions)
  const base = `${origin}/${getDefaultCountryCode(regions) || DEFAULT_COUNTRY_CODE}`
  const currencies = Array.from(
    new Set(regions.map((r) => r.currency_code?.toUpperCase()).filter(Boolean)),
  )

  const links = [
    ...categories
      .filter((c) => !c.parent_category_id)
      .map((c) => `- [${c.name}](${base}/categories/${c.handle})`),
    ...collections.map(
      (c) => `- [${c.title}](${base}/collections/${c.handle})`,
    ),
  ]

  const inspirations = [
    ["Inspiration Market", "index.html"],
    [
      "Midnight Cat Café custom tumbler",
      "midnight-cat-cafe-custom-tumbler.html",
    ],
    ["Orbit Bloom graphic hoodie", "hoodie-orbit-bloom.html"],
    ["Funny Skeleton Lazy Mood apparel", "funny-skeleton-lazy-mood.html"],
    [
      "Duck Bubble Trouble custom bath mat",
      "duck-bubble-trouble-custom-bath-mat.html",
    ],
    ["Sleep Well, Dream Big blanket", "no-nightmares-jesus-blanket.html"],
    ["Low Battery Club custom beanie", "low-battery-club-custom-beanie.html"],
    [
      "Bubble Bath Cats custom shower curtain",
      "cat-bubble-cats-custom-shower-curtain.html",
    ],
  ]
    .map(
      ([title, path]) => `- [${title}](${origin}/vibeya/inspiration/${path})`,
    )
    .join("\n")

  const body = `# ${STORE_NAME}

> VIBEYA is an online custom-products and personalized-gifts store. Customers can choose a product, create or upload artwork, preview the design, and order a personalized item.

VIBEYA offers customizable apparel and accessories, drinkware, blankets, and bathroom products, including bath mats and shower curtains. The catalog and available options are shown on each product page. VIBEYA ships to ${countries.length} countries; checkout shows the available destination, delivery options, and current prices${currencies.length ? ` in ${currencies.join(", ")}` : ""}.

URLs are prefixed with a two-letter country code that sets currency and pricing, for example \`${base}\`. Available country codes: ${countries.join(", ")}.

## Shop
- [All products](${base}/store)
${links.join("\n")}
- Search: ${base}/search?q={query}

## Design inspiration
Browse design ideas for custom gifts and products. Inspiration images are examples; product pages explain the available customization options.
${inspirations}

## Buying
- Choose a product and its available options, create a design or upload artwork where supported, preview it, and add the selected product to the cart.
- Product pages contain an add-to-cart form that posts \`variant_id\` and \`quantity\` to ${base}/cart/add.
- Preselect a variant with \`?v_id={variant_id}\` on a product URL.
- Append \`.md\` to a product URL (or send \`Accept: text/markdown\`) for a Markdown version with variant IDs, prices and stock.
- Checkout link: ${origin}/buy/{variant_id}:{quantity},{variant_id}:{quantity}
- [Cart](${base}/cart)

## Policies
- [Shipping information](${base}/shipping)
- [Return policy](${base}/returns)
- [Terms of service](${base}/terms)
- [Privacy policy](${base}/privacy)
- [Contact](${base}/contact)

## About VIBEYA
VIBEYA serves customers looking for personalized gifts and custom everyday products. The product pages are the source of truth for product materials, sizes, print areas, prices, and delivery details.

## For agents
- [Sitemap](${origin}/sitemap.xml)
- [UCP profile](${origin}/.well-known/ucp)
- UCP MCP endpoint: ${origin}${UCP_MCP_PATH}
- UCP REST endpoint: ${origin}${UCP_REST_BASE_PATH}
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
