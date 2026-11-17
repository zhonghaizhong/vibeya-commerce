import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import { getMarketUiCopy } from "@lib/util/market-ui-copy"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
  countryCode: string
}

const ItemsTemplate = ({ cart, countryCode }: ItemsTemplateProps) => {
  const marketCopy = getMarketUiCopy(countryCode)
  const items = cart?.items
  return (
    <div>
      <div className="vibeya-cart-heading pb-3">
        <Heading className="text-[2rem] leading-[2.75rem]">{marketCopy?.cart ?? "Cart"}</Heading>
        <p className="mt-1 text-sm text-ui-fg-subtle">{marketCopy?.cartReview ?? "Review your custom pieces before checkout."}</p>
      </div>
      <Table className="vibeya-cart-table">
        <Table.Header className="border-t-0">
          <Table.Row className="text-ui-fg-subtle txt-medium-plus">
            <Table.HeaderCell className="!pl-0">{marketCopy?.item ?? "Item"}</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
            <Table.HeaderCell>{marketCopy?.quantity ?? "Quantity"}</Table.HeaderCell>
            <Table.HeaderCell className="hidden small:table-cell">
              {marketCopy?.price ?? "Price"}
            </Table.HeaderCell>
            <Table.HeaderCell className="!pr-0 text-right">
              {marketCopy?.total ?? "Total"}
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => {
                  return (
                    <Item
                      key={item.id}
                      item={item}
                      currencyCode={cart?.currency_code}
                    />
                  )
                })
            : repeat(5).map((i) => {
                return <SkeletonLineItem key={i} />
              })}
        </Table.Body>
      </Table>
    </div>
  )
}

export default ItemsTemplate
