import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"
import { isVariantInStock } from "@lib/util/inventory"
import {
  buildProductStructuredData,
  getPricedVariants,
  toJsonLd,
} from "@lib/util/product-structured-data"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { getVibeyaMarket } from "@lib/vibeya/region"
import { SUPPORTED_MARKET_COUNTRIES, SupportedMarketCountry } from "@lib/vibeya/markets"
import { getMarketAlternateUrls, getMarketLocale, getMarketLocaleUrl } from "@lib/util/market-locale"
import { retrieveCustomer } from "@lib/data/customer"
import VibeyaHome from "../../vibeya-home"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ locale?: string; v_id?: string; size?: string; color?: string; openStudio?: string; print?: string }>
}

const LOCALIZED_PRODUCT_SEO: Record<string, Record<string, { title: string; description: string }>> = {
  "vibeya-custom-womens-yoga-set": {
    "en-CA": {
      title: "Custom Women's Yoga Set | VIBEYA Canada",
      description: "Personalize a coordinated women's yoga set with your own artwork or design prompt. Preview your matching print across the crop top and shorts before ordering.",
    },
    "ja-JP": {
      title: "カスタム レディース ヨガウェアセット | VIBEYA",
      description: "トップスとショーツを自由にカスタマイズできるレディースヨガウェアセット。オリジナルデザインで自分らしい一着を作れます。",
    },
    "es-MX": {
      title: "Conjunto de yoga personalizado para mujer | VIBEYA",
      description: "Personaliza este conjunto de yoga para mujer con top y shorts. Crea un diseño propio para entrenar con tu estilo.",
    },
    "fr-CA": {
      title: "Ensemble de yoga personnalisé pour femmes | VIBEYA",
      description: "Personnalisez cet ensemble de yoga pour femmes comprenant un haut et un short. Créez un modèle unique à votre image.",
    },
  },
}

export const revalidate = 60

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams])
  const { handle } = params
  const locale = getMarketLocale(params.countryCode, searchParams.locale)
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle, locale },
  }).then(({ response }) => response.products[0])

  const market = await getVibeyaMarket(params.countryCode).catch(() => null)
  if (!product || !market?.handles.includes(handle)) {
    notFound()
  }

  const origin = await getSiteOrigin()
  const path = `/products/${product.handle}`
  const productUrl = getMarketLocaleUrl(origin, params.countryCode, path, locale)
  const seoContent: Record<string, { title: string; description: string }> = {
    "vibeya-washed-vintage-hooded-sweatshirt": {
      title: "Custom Vintage Graphic Hoodie | VIBEYA",
      description:
        "Shop VIBEYA’s 400g washed vintage hoodie with original double-sided artwork. Choose from six colors and sizes S–2XL. Free U.S. shipping.",
    },
    "vibeya-custom-cotton-long-sleeve-tee": {
      title: "Custom Long Sleeve T-Shirt | VIBEYA",
      description:
        "Shop VIBEYA’s cotton long sleeve tee with the Funny Skeleton graphic. Choose from seven colors and sizes XS–3XL. Free U.S. shipping.",
    },
    "vibeya-custom-20oz-stainless-steel-tumbler": {
      title: "Custom 20 oz Stainless Steel Tumbler | VIBEYA",
      description:
        "Design your own full-wrap print for VIBEYA’s 20 oz stainless steel tumbler. Clear sliding lid, separate straw, and U.S. shipping available.",
    },
    "vibeya-custom-womens-tankini-swimsuit-set": {
      title: "Custom Women’s Tankini Swimsuit Set | Design Your Own | VIBEYA",
      description:
        "Design your own women’s tankini swimsuit with a custom print. Choose a halter swim top and separate side-tie shorts in five colors, sizes S–XL.",
    },
    "vibeya-custom-kids-basketball-uniform": {
      title: "Custom Kids Basketball Jersey & Shorts | Design Your Own | VIBEYA",
      description:
        "Design a custom kids basketball uniform with a text prompt. Customize the jersey front, back, and shorts independently, then mix and match prints. Five colors, sizes 100–140 cm.",
    },
    "vibeya-custom-metal-bottle-cap-wall-sign": {
      title: "Custom Metal Bottle Cap Wall Sign | Design Your Own | VIBEYA",
      description:
        "Create a custom 30 cm metal bottle-cap wall sign with your own prompt or uploaded artwork. Preview your full-face UV print before ordering. Choose a 1-, 2-, or 3-piece set.",
    },
  }
  const productSeo = seoContent[product.handle]
  const localizedSeo = LOCALIZED_PRODUCT_SEO[product.handle]?.[locale]
  const title = localizedSeo?.title ?? productSeo?.title ?? `${product.title} | ${STORE_NAME}`
  const description = localizedSeo?.description ??
    productSeo?.description ??
    `${product.subtitle || product.description || product.title}`
      .replace(/\s+/g, " ")
      .slice(0, 160)

  const eligibleCountries = await Promise.all(
    [...SUPPORTED_MARKET_COUNTRIES].map(async (countryCode) => {
      const market = await getVibeyaMarket(countryCode).catch(() => null)
      return market?.handles.includes(handle) ? countryCode : null
    })
  ).then((codes) => codes.filter((code): code is SupportedMarketCountry => code !== null))
  const languages = getMarketAlternateUrls(origin, path, eligibleCountries)

  return {
    title,
    description,
    alternates: {
      canonical: productUrl,
      languages,
      types: { "text/markdown": `${productUrl}.md` },
    },
    openGraph: {
      title,
      description,
      url: productUrl,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

const ProductMetaTags = ({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) => {
  const variants = getPricedVariants(product)
  const cheapest = variants.reduce<HttpTypes.StoreProductVariant | undefined>(
    (min, v) =>
      !min ||
      v.calculated_price!.calculated_amount! <
        min.calculated_price!.calculated_amount!
        ? v
        : min,
    undefined
  )
  const currency = region.currency_code.toUpperCase()
  const amount = cheapest?.calculated_price?.calculated_amount?.toFixed(2)

  return (
    <>
      <meta property="og:type" content="product" />
      {amount && (
        <>
          <meta property="product:price:amount" content={amount} />
          <meta property="product:price:currency" content={currency} />
          <meta property="og:price:amount" content={amount} />
          <meta property="og:price:currency" content={currency} />
        </>
      )}
      <meta
        property="product:availability"
        content={variants.some(isVariantInStock) ? "in stock" : "out of stock"}
      />
    </>
  )
}

export default async function ProductPage(props: Props) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams])
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle, locale: getMarketLocale(params.countryCode, searchParams.locale) },
  }).then(({ response }) => response.products[0])

  const market = await getVibeyaMarket(params.countryCode).catch(() => null)
  if (!pricedProduct || !market?.handles.includes(params.handle)) {
    notFound()
  }

  const origin = await getSiteOrigin()
  const locale = getMarketLocale(params.countryCode, searchParams.locale)
  const localizedSeo = LOCALIZED_PRODUCT_SEO[pricedProduct.handle]?.[locale]
  const structuredData = buildProductStructuredData({
    product: localizedSeo
      ? { ...pricedProduct, title: localizedSeo.title, description: localizedSeo.description }
      : pricedProduct,
    region,
    countryCode: params.countryCode,
    productUrl: `${origin}/${params.countryCode}/products/${pricedProduct.handle}`,
  })

  if (params.handle === "vibeya-custom-womens-yoga-set") {
    const queryValue = (key: "v_id" | "size" | "color") => searchParams?.[key]
    const selectedVariant = pricedProduct.variants?.find((variant) => variant.id === queryValue("v_id"))
    const variantSize = selectedVariant?.options?.find((option) => option.option?.title?.toLowerCase() === "size")?.value
    const initialSize = queryValue("size") || variantSize || "M"
    const customer = await retrieveCustomer().catch(() => null)

    return (
      <>
        <ProductMetaTags product={pricedProduct} region={region} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }} />
        <VibeyaHome
          countryCode={params.countryCode}
          locale={searchParams.locale}
          isAuthenticated={Boolean(customer)}
          standaloneProductId="sds-63823"
          standaloneColor={queryValue("color") || "White"}
          standaloneSize={initialSize}
        />
      </>
    )
  }
  if (params.handle === "vibeya-custom-metal-bottle-cap-wall-sign") {
    const customer = await retrieveCustomer().catch(() => null)
    return (
      <>
        <ProductMetaTags product={pricedProduct} region={region} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
        />
        <VibeyaHome
          countryCode={params.countryCode}
          locale={searchParams.locale}
          isAuthenticated={Boolean(customer)}
          standaloneProductId="mg8014061"
        />
      </>
    )
  }

  return (
    <>
      <ProductMetaTags product={pricedProduct} region={region} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
      />
    </>
  )
}
