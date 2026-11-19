import { HttpTypes } from "@medusajs/types"
import { isVariantInStock } from "./inventory"
import { STORE_NAME } from "./site"
import {
  buildReturnPolicy,
  buildShippingDetails,
  getRegionPolicies,
} from "./store-policies"

const SCHEMA_IN_STOCK = "https://schema.org/InStock"
const SCHEMA_OUT_OF_STOCK = "https://schema.org/OutOfStock"

export const getPricedVariants = (product: HttpTypes.StoreProduct) =>
  (product.variants ?? []).filter(
    (variant) => variant.calculated_price?.calculated_amount != null
  )

export const buildProductStructuredData = ({
  product,
  region,
  countryCode,
  productUrl,
  fallbackImages = [],
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  productUrl: string
  fallbackImages?: string[]
}) => {
  const currency = region.currency_code.toUpperCase()
  const images = (product.images ?? [])
    .map((image) => image.url)
    .filter(Boolean)
  if (!images.length && product.thumbnail) {
    images.push(product.thumbnail)
  }
  if (!images.length) {
    images.push(...fallbackImages.filter(Boolean))
  }
  const description = product.description || product.title
  const brand = { "@type": "Brand", name: STORE_NAME }
  const policies = getRegionPolicies(region)
  const optionTitles = new Map(
    (product.options ?? []).map((option) => [option.id, option.title])
  )
  const getVariantAttributes = (variant: HttpTypes.StoreProductVariant) => {
    const attributes = (variant.options ?? [])
      .map((value) => ({
        name:
          value.option?.title ||
          optionTitles.get(value.option_id ?? ""),
        value: value.value,
      }))
      .filter((attribute) => attribute.name && attribute.value)

    const getAttribute = (pattern: RegExp) =>
      attributes.find((attribute) => pattern.test(attribute.name?.trim() ?? ""))?.value

    return {
      color: getAttribute(/\bcolou?r\b/i),
      size: getAttribute(/\bsizes?\b/i),
      additionalProperty: attributes.map((attribute) => ({
        "@type": "PropertyValue",
        name: attribute.name,
        value: attribute.value,
      })),
    }
  }
  const getSchemaProperty = (title: string): string | undefined => {
    if (/\bcolou?r\b/i.test(title)) return "https://schema.org/color"
    if (/\bsizes?\b/i.test(title)) return "https://schema.org/size"
    if (/\bpattern\b/i.test(title)) return "https://schema.org/pattern"
    if (/\bmaterial\b/i.test(title)) return "https://schema.org/material"
    return undefined
  }

  const buildOffer = (variant: HttpTypes.StoreProductVariant, url: string) => ({
    "@type": "Offer",
    url,
    sku: variant.sku || undefined,
    price: variant.calculated_price!.calculated_amount!.toFixed(2),
    priceCurrency: currency,
    availability: isVariantInStock(variant)
      ? SCHEMA_IN_STOCK
      : SCHEMA_OUT_OF_STOCK,
    itemCondition: "https://schema.org/NewCondition",
    hasMerchantReturnPolicy: buildReturnPolicy(countryCode),
    ...(policies
      ? {
          shippingDetails: buildShippingDetails(
            policies,
            countryCode,
            currency
          ),
        }
      : {}),
  })

  const variants = getPricedVariants(product)

  if (variants.length <= 1) {
    const variant = variants[0]
    const attributes = variant ? getVariantAttributes(variant) : undefined
    const variantImages = variant
      ? [
          ...(variant.images ?? []).map((image) => image.url),
          variant.thumbnail,
        ].filter((image): image is string => Boolean(image))
      : []

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description,
      image: variantImages.length ? variantImages : images.length ? images : undefined,
      brand,
      sku: variant?.sku || undefined,
      color: attributes?.color,
      size: attributes?.size,
      additionalProperty: attributes?.additionalProperty,
      url: productUrl,
      offers: variant ? buildOffer(variant, productUrl) : undefined,
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: product.title,
    description,
    image: images.length ? images : undefined,
    brand,
    url: productUrl,
    productGroupID: product.id,
    variesBy: Array.from(
      new Set(
        (product.options ?? [])
          .map((option) => getSchemaProperty(option.title.trim()))
          .filter((property): property is string => Boolean(property))
      )
    ),
    hasVariant: variants.map((variant) => {
      const variantUrl = `${productUrl}?v_id=${variant.id}`
      const attributes = getVariantAttributes(variant)
      const variantImages = [
        ...(variant.images ?? []).map((image) => image.url),
        variant.thumbnail,
        ...images,
      ].filter((image): image is string => Boolean(image))

      return {
        "@type": "Product",
        name: `${product.title} - ${variant.title}`,
        description,
        sku: variant.sku || undefined,
        image: variantImages.length ? variantImages : undefined,
        color: attributes.color,
        size: attributes.size,
        additionalProperty: attributes.additionalProperty,
        offers: buildOffer(variant, variantUrl),
      }
    }),
  }
}

/** Serializes JSON-LD for a `<script>` tag without allowing `</script>` breakouts. */
export const toJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c")
