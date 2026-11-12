import { HttpTypes } from "@medusajs/types"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

const Item = ({ item, currencyCode }: ItemProps) => {
  const generatedArtwork = item.metadata?.vibeya_generated_artwork
  const orderImage =
    typeof generatedArtwork === "string" && generatedArtwork.startsWith("data:image/")
      ? generatedArtwork
      : item.thumbnail || item.product?.thumbnail || item.variant?.product?.thumbnail

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 py-5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:gap-x-5" data-testid="product-row">
      <div className="w-16 sm:w-[72px]">
          <Thumbnail
            thumbnail={orderImage}
            images={item.product?.images ?? []}
            size="square"
          />
      </div>
      <div className="min-w-0 self-center">
        <p className="txt-medium-plus break-words text-ui-fg-base" data-testid="product-name">
          {item.product_title}
        </p>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
      </div>
      <div className="col-start-2 mt-3 flex min-w-0 items-center justify-between gap-4 sm:col-start-auto sm:mt-0 sm:flex-col sm:items-end sm:justify-center sm:gap-1">
          <span className="flex shrink-0 items-center gap-x-1 whitespace-nowrap text-ui-fg-muted">
            <span data-testid="product-quantity">{item.quantity}</span> ×
            <LineItemUnitPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </span>
          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
      </div>
    </div>
  )
}

export default Item
