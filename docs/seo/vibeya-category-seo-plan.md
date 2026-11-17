# VIBEYA category taxonomy and SEO plan

Reviewed 2026-11-17. U.S. storefront only.

## Category rules

- Keep six stable browse categories. New products join a matching group instead of creating supplier-specific filters.
- Category names organize the catalog; the product pages target the more specific purchase searches.
- Category pages use clean `/us/categories/{slug}` URLs and the existing shop layout, with product search, sort, category links, count, and product cards.
- Legacy category paths redirect to the matching clean category path. They are not separate browse pages.
- Keep category pages crawlable for customers, but `noindex` and out of the sitemap until each page has its own validated search intent, sufficient products, and distinct useful landing-page content.
- Do not expose empty categories or create URLs for color, size, sort, or pagination states.

## Browse map and keyword intent

| Category | Canonical URL | Products | Search intent assigned to product pages |
| --- | --- | --- | --- |
| Custom Clothing | `/us/categories/custom-clothing` | Long sleeve tee, washed hoodie, women's tankini, kids' basketball uniform, women's yoga set | custom shirts, custom hoodie, custom tankini swimsuit, custom kids basketball jersey, custom yoga set |
| Custom Tumblers | `/us/categories/custom-tumblers` | 20 oz stainless steel tumbler | custom tumbler, personalized tumbler |
| Custom Home & Bath | `/us/categories/custom-home-bath` | 3D bath mat, flannel throw blanket, shower curtain | custom bath mat, custom blanket, custom shower curtain |
| Custom Kitchen & Dining | `/us/categories/custom-kitchen-dining` | Custom apron | custom apron, personalized apron |
| Custom Hats | `/us/categories/custom-hats` | Knitted beanie, washed denim baseball cap | custom hats, custom beanie, custom denim baseball cap |
| Custom Wall Decor | `/us/categories/custom-wall-decor` | Metal bottle cap wall sign | custom metal wall sign, personalized wall decor |

The working keyword themes were compared using free keyword estimates, Google Trends relative interest, and commercial search-result review. These checks guide product-level wording; they do not establish exact future traffic or guarantee rankings. Recheck Search Console queries and category-specific product count before enabling indexing.

## Current launch decision

All six categories are available as customer-facing browse pages. They retain canonical URLs and product-specific copy, but remain `noindex` for now because most groups are too small or combine several distinct search intents. The former `/us/categories/shirts` path redirects to `/us/categories/custom-clothing`; it is excluded from the sitemap.

The existing product URLs remain the purchase landing pages. Their canonical URLs and product detail layouts are unchanged by this category release.
