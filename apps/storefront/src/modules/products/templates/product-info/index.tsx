import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductMarketCopy } from "@modules/products/market-copy"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

const ProductInfo = ({ product, countryCode }: ProductInfoProps) => {
  const marketCopy = getProductMarketCopy(countryCode)
  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-4 lg:max-w-[500px] mx-auto">
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="text-medium text-ui-fg-muted hover:text-ui-fg-subtle"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )}
        <Heading
          level="h1"
          className="text-3xl leading-10 text-ui-fg-base"
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        <Text
          className="text-medium text-ui-fg-subtle whitespace-pre-line"
          data-testid="product-description"
        >
          {marketCopy?.description(product.handle, product.description) ?? product.description}
        </Text>
      </div>
    </div>
  )
}

export default ProductInfo
