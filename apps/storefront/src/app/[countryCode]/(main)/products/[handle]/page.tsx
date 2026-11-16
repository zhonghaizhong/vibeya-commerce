import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import StandaloneProductPage from "@modules/vibeya/components/standalone-product-page"
import VibeyaProductExperience from "@modules/vibeya/components/vibeya-product-experience"
import { vibeyaProducts } from "@modules/vibeya/data/products"
import { HttpTypes } from "@medusajs/types"
import { isVariantInStock } from "@lib/util/inventory"
import {
  buildProductStructuredData,
  getPricedVariants,
  toJsonLd,
} from "@lib/util/product-structured-data"
import { getSiteOrigin, listCountryCodes, STORE_NAME } from "@lib/util/site"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const PRODUCT_SEO: Partial<
  Record<string, { title: string; description: string }>
> = {
  "vibeya-custom-cotton-long-sleeve-tee": {
    title: "Custom Long Sleeve Shirt | Photo & AI Design | VIBEYA",
    description:
      "Design a custom long sleeve shirt with a photo, artwork, or AI prompt. Preview front, back, or double-sided print; choose from seven colors and sizes XS–3XL.",
  },
  "vibeya-washed-vintage-hooded-sweatshirt": {
    title: "Custom Graphic Hoodie | Washed Vintage Style | VIBEYA",
    description:
      "Design a custom graphic hoodie with front and back artwork on 400g washed fleece. Choose from six colors and sizes S–2XL, then preview your design.",
  },
  "vibeya-custom-knitted-beanie": {
    title: "Custom Knitted Beanie with Cuff Print | VIBEYA",
    description:
      "Create a custom knitted beanie with your design printed on the folded front cuff. Preview a personalized winter hat in black, red, or gray; one size.",
  },
  "vibeya-custom-20oz-stainless-steel-tumbler": {
    title: "Custom 20 oz Stainless Steel Tumbler | VIBEYA",
    description:
      "Design a custom 20 oz stainless steel tumbler with your art in a full-wrap print. Includes a clear lid and separate straw; preview before ordering.",
  },
  "vibeya-custom-3d-bath-mat": {
    title: "Custom 3D Bath Mat | Photo & AI Design | VIBEYA",
    description:
      "Create a custom photo bath mat or describe an original design with an AI prompt. Preview the full-surface print and choose from three sizes for your bathroom.",
  },
  "vibeya-custom-flannel-throw-blanket": {
    title: "Custom Photo Blanket | Flannel Throw Blanket | VIBEYA",
    description:
      "Design a custom flannel throw blanket with a full-surface printed front and soft white reverse. Preview your personalized blanket and choose from four sizes.",
  },
  "vibeya-custom-shower-curtain": {
    title: "Custom Shower Curtain | Design Your Own | VIBEYA",
    description:
      "Design a custom shower curtain with a single-sided, edge-to-edge print. Preview it hanging naturally and choose from four sizes.",
  },
  "vibeya-custom-womens-tankini-swimsuit-set": {
    title: "Custom Tankini Swimsuit Set for Women | VIBEYA",
    description:
      "Design a custom women's tankini swimsuit with artwork or a text prompt. Preview a halter top and separate side-tie shorts; five colors, sizes S–XL.",
  },
  "vibeya-custom-kids-basketball-uniform": {
    title: "Custom Kids Basketball Jersey and Shorts Set | VIBEYA",
    description:
      "Create a custom kids basketball jersey set with a text prompt. Design the jersey front, back, and shorts separately; five colors, sizes 100–140 cm.",
  },
  "vibeya-custom-prompt-design-apron": {
    title: "Custom Apron Design | Personalized Cooking Apron | VIBEYA",
    description:
      "Create a personalized cooking apron from a text prompt. Preview it on a black apron with an adjustable neck strap and three divided pockets; one size.",
  },
  "vibeya-custom-metal-bottle-cap-wall-sign": {
    title: "Custom Bottle Cap Wall Sign | Design & Preview | VIBEYA",
    description:
      "Design a custom bottle cap wall sign with a prompt or uploaded artwork. Preview your 30 cm metal wall art, then choose a 1, 2, or 3-piece pack.",
  },
  "vibeya-custom-washed-denim-baseball-cap": {
    title: "Custom Denim Baseball Cap | Design Your Own | VIBEYA",
    description:
      "Create a custom washed denim baseball cap from your artwork or a design prompt. Preview the front print before ordering. Choose black, khaki, or gray.",
  },
}

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])
  const path = `/products/${product.handle}`
  const productUrl = `${origin}/${params.countryCode}${path}`
  const productSeo = PRODUCT_SEO[product.handle]
  const title =
    productSeo?.title ??
    `${product.title.replace(/^VIBEYA\s+/i, "")} | ${STORE_NAME}`
  const description =
    productSeo?.description ??
    `${product.subtitle || product.description || product.title}`
      .replace(/\s+/g, " ")
      .slice(0, 160)

  return {
    title,
    description,
    alternates: {
      canonical: productUrl,
      languages: Object.fromEntries(
        listCountryCodes(regions).map((code) => [
          `en-${code.toUpperCase()}`,
          `${origin}/${code}${path}`,
        ])
      ),
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
  const params = await props.params
  const searchParams = await props.searchParams
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const origin = await getSiteOrigin()
  const productSeo = PRODUCT_SEO[pricedProduct.handle]
  const structuredProduct = productSeo
    ? {
        ...pricedProduct,
        description: productSeo.description,
      }
    : pricedProduct
  const structuredData = buildProductStructuredData({
    product: structuredProduct,
    region,
    countryCode: params.countryCode,
    productUrl: `${origin}/${params.countryCode}/products/${pricedProduct.handle}`,
  })

  if (
    pricedProduct.handle === "vibeya-custom-metal-bottle-cap-wall-sign" ||
    pricedProduct.handle === "vibeya-custom-washed-denim-baseball-cap"
  ) {
    const isDenimCap =
      pricedProduct.handle === "vibeya-custom-washed-denim-baseball-cap"
    return (
      <>
        <ProductMetaTags product={pricedProduct} region={region} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
        />
        <StandaloneProductPage
          countryCode={params.countryCode}
          handle={pricedProduct.handle}
          productId={isDenimCap ? "mg8012002" : "mg8014061"}
          title={pricedProduct.title}
          version={isDenimCap ? "denim-cap-20261116-1" : "metal-sign-exact-pack-count-20261117-4"}
        />
      </>
    )
  }

  const vibeyaProduct = vibeyaProducts.find(
    (product) => product.handle === pricedProduct.handle
  )
  const colorParam = searchParams?.color
  const initialColor = Array.isArray(colorParam) ? colorParam[0] : colorParam

  return (
    <>
      <ProductMetaTags product={pricedProduct} region={region} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      {vibeyaProduct ? (
        <VibeyaProductExperience
          countryCode={params.countryCode}
          productId={vibeyaProduct.id}
          initialColor={initialColor}
        />
      ) : (
        <ProductTemplate
          product={pricedProduct}
          region={region}
          countryCode={params.countryCode}
        />
      )}
    </>
  )
}
