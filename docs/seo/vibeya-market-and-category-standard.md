# VIBEYA market and category standard

Reviewed 2026-11-17. This plan keeps the current storefront design and separates live U.S. inventory from markets that are still being prepared.

## 1. U.S. market today

- The U.S. (`/us/`) is the only currently launched market. Treat products and inspiration already online as U.S.-only unless availability is explicitly confirmed for another country.
- Keep product detail pages as the primary purchase and search landing pages. A product should have one stable detail URL; color, size, and print options remain selections on that page and do not create indexable duplicates.
- Make the six U.S. catalog groups below indexable and include their canonical routes in the U.S. sitemap. Keep other country versions `noindex` until their products are available there and their landing copy is localized.

| Category | U.S. route | Live products |
| --- | --- | --- |
| Custom Clothing | `/us/categories/custom-clothing` | Cotton long sleeve tee, washed hoodie, women's tankini, kids' basketball uniform |
| Custom Tumblers | `/us/categories/custom-tumblers` | 20 oz stainless steel tumbler |
| Custom Home & Bath | `/us/categories/custom-home-bath` | 3D bath mat, flannel throw blanket, shower curtain |
| Custom Kitchen & Dining | `/us/categories/custom-kitchen-dining` | Custom apron |
| Custom Hats | `/us/categories/custom-hats` | Knitted beanie, washed denim baseball cap |
| Custom Wall Decor | `/us/categories/custom-wall-decor` | Metal bottle-cap wall sign |

The current live catalog contains 12 products across these groups. The women's yoga set is not included in the U.S. live catalog yet; keep it out of U.S. category counts, links, and sitemap until it is launched.

## 2. Complete U.S. page map

| Page type | Current U.S. URL / route | Purpose and SEO treatment |
| --- | --- | --- |
| Home | `/us/` | Main brand and broad custom-gift landing page. Target the broad custom and personalized-gift intent and explain the photo upload, text-prompt design, preview, and order journey. Self-canonical. |
| Shop All | `/us/#shop` | Product browsing section on the home page, not a second SEO landing page. Keep its categories, search, and sort for shoppers; category links navigate to stable category URLs. |
| Product detail | `/us/products/{handle}` | Primary transactional landing page for each live product and its specific query intent. One canonical page per product; include accurate product data, price/availability, images, variants, customization capability, and structured data. |
| Category browse | `/us/categories/{slug}` | Six U.S. category landing pages mapped above. Indexable and included in the U.S. sitemap, with a self-canonical URL and distinct title/description. |
| Inspiration index | `/vibeya/inspiration/index.html` | U.S.-focused design discovery page. Link every inspiration to its relevant product and customization path. Self-canonical; in sitemap. |
| Inspiration stories | `/vibeya/inspiration/{story}.html` | The current sitemap lists 12 individual stories. Each story targets its own design/product-specific long-tail topic, has one clear product relationship, and links naturally to the matching product page. Keep the same market scope unless localized versions are authored. |
| Collections | `/us/collections/{handle}` | Use only for curated, distinct product groupings. A collection with products is not automatically a worthwhile SEO landing page; index only when it has a coherent assortment, unique title/description, and useful copy. |
| Store alias | `/us/store` | Redirects to `/us/#shop`; keep it out of canonical links and sitemap. |
| Customer information | `/us/shipping`, `/us/returns`, `/us/terms`, `/us/privacy`, `/us/contact` | Maintain accurate U.S. policies and contact details. These support trust and conversion; do not treat them as product keyword landing pages. |
| Search and account flows | `/us/search`, `/us/account`, `/us/cart`, `/us/checkout`, order and verification routes | Functional pages, not SEO targets. Keep out of sitemap and apply the appropriate `noindex`/robots protections. Never expose private order/account URLs as crawl targets. |

### U.S. keyword-to-page ownership

| Page owner | Main query theme (directional, not a volume claim) |
| --- | --- |
| Home | custom products, personalized gifts, custom gifts from photos, design your own products |
| Long sleeve tee PDP | custom long sleeve shirt, personalized long sleeve shirt |
| Washed hoodie PDP | custom graphic hoodie, personalized hoodie |
| Knitted beanie PDP | custom beanie, personalized knit beanie |
| 20 oz tumbler PDP | custom tumbler, personalized 20 oz tumbler |
| Bath mat PDP | custom bath mat, personalized bath mat, 3D bath mat |
| Flannel blanket PDP | custom photo blanket, personalized flannel throw blanket |
| Shower curtain PDP | custom shower curtain, personalized shower curtain |
| Tankini PDP | custom tankini swimsuit, personalized women's swimsuit |
| Kids basketball uniform PDP | custom kids basketball jersey, personalized basketball uniform |
| Apron PDP | custom apron, personalized cooking apron |
| Metal wall sign PDP | custom metal wall sign, personalized wall decor |
| Denim cap PDP | custom denim baseball cap, personalized cap |

Keep these themes on their assigned page. Supporting terms may appear naturally when they match the product, but do not copy one keyword block across every product. U.S. category pages can target the broader group-level themes; product pages remain the primary destination for product-specific purchase searches. Inspiration stories can support their related product topic without replacing the product page as the purchase result.

### U.S. URL and navigation rules

- Product: `/us/products/{stable-product-handle}`.
- Category: `/us/categories/{stable-category-slug}`.
- Shop All: `/us#shop`.
- Category chips on both Shop All and category pages must be ordinary links to those canonical paths. Selecting a category changes the address and provides a direct, shareable destination; it must not be only an in-place JavaScript filter.
- Old category aliases redirect permanently to the matching canonical group. Never list aliases in internal navigation or sitemap.
- Keep category and product URL state free from color, size, sort, and pagination duplicates.

## 3. Japan, Canada, and Mexico rollout

Use country paths on the existing domain so each market can grow without splitting the site's authority:

| Market | Path prefix | Primary language | Currency |
| --- | --- | --- | --- |
| United States | `/us/` | English (U.S.) | USD |
| Canada | `/ca/` | English (Canada) at first; add French only when fully localized | CAD |
| Mexico | `/mx/` | Spanish (Mexico) | MXN |
| Japan | `/jp/` | Japanese | JPY |

Only the custom yoga set is currently identified as a product intended for all four markets, and it is local/pre-launch rather than a confirmed live listing. Prepare one localized product page per country only after that market has verified price, sizes/options, checkout, shipping, delivery estimate, returns policy, and customer support copy. Until then, do not link the product from that market and do not include its URL in that market's sitemap.

When ready, use one stable translated product route per market, for example `/ca/products/{handle}`, `/mx/products/{handle}`, and `/jp/products/{handle}`. Pages for the same product may reference one another with reciprocal `hreflang` only when each page is live, equivalent, and fully localized. Every live localized page should have a self-canonical URL. Do not canonicalize all countries to `/us/`.

## 4. Categories as products expand

- Do not create empty categories. A market exposes only groups that contain products purchasable in that market.
- Start the new markets with the custom clothing group only if the yoga set is the sole ready product. Keep other U.S. category groups hidden there until relevant products are prepared and purchasable.
- Reuse the six category families when relevant products launch, but write native market labels and descriptions. Do not translate U.S. copy mechanically or imply shipping/availability that is not configured.
- Keep new-market category pages `noindex` until their local search intent is validated, their assortment is purchasable and meaningful, and their copy is localized. Then add them to that market's sitemap and internal links.
- Keep category group mappings in the shared taxonomy registry and country-specific availability in explicit market data. Do not infer availability just from a product handle or a supplier catalog.

## 5. Sitemap, canonicals, and market safeguards

- The U.S. sitemap should contain the U.S. home, live product pages, six U.S. category pages, approved public policy/contact pages, and the inspiration index plus its live detail stories. It should exclude search results, account/cart/checkout/order flows, empty collections, aliases, and unpublished products.
- Every indexable page has one canonical URL that matches the chosen market path. Tracking parameters, sort, search, color, size, and old aliases must not create competing canonical pages.
- The current product route code builds language alternates from configured region codes and currently labels them using `en-{country}`. Before Canada, Mexico, or Japan is opened, replace this with explicit page availability and correct locale values (`en-CA`, `es-MX`, `ja-JP`) so an unavailable or untranslated page is never advertised as an alternate.
- The current sitemap code repeats published products under each detected country code. Before adding markets, gate each sitemap product by actual country availability and local indexability; do not assume that having a region means every product is purchasable there.
- Never use a single generic collection description for unrelated products. Current collection metadata uses apparel-focused text; review it before exposing any home, drinkware, kitchen, or mixed collection as an indexed landing page.
- Hash fragments such as `#shop` and legacy `#product-...` UI states are not separate SEO landing pages. For product search and sharing, use the stable `/us/products/{handle}` URL as the official destination and have legacy product entry behavior resolve to that page without breaking customization.

## 6. SEO validation and release checklist

For each product or candidate category, document one main query and a small set of close supporting terms. Validate using Google Trends for relative demand, free keyword tools for directional volume ranges, live search-result review for intent and competition, and Search Console after launch for real impressions and clicks. Trends is not a monthly search-volume source; estimates are directional and must not be presented as exact.

Before enabling an URL for a country, verify:

1. Product and checkout are actually available in that country, with truthful local pricing and fulfillment details.
2. The page language, title, description, headings, image alt text, currency, and policies match that country.
3. The URL returns the intended status, has one self-canonical, and does not duplicate another market or product variant.
4. Internal links point to the canonical URL; redirects have a single hop; no retired aliases are exposed.
5. Only launched, indexable pages appear in the correct sitemap. `noindex` pages stay out of the sitemap.
6. Existing visual layout and theme remain unchanged unless separately requested.

No keyword plan can guarantee a first-page ranking. Review Search Console monthly and adjust copy or indexability based on actual query and landing-page data.
