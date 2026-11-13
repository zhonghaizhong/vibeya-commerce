import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import Item from "@modules/order/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsProps = {
  order: HttpTypes.StoreOrder
}

const Items = ({ order }: ItemsProps) => {
  const items = order.items

  return (
    <div className="flex flex-col divide-y divide-[#eee5f1]" data-testid="products-table">
      {items?.length ? (
        [...items]
          .sort((a, b) => (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1)
          .map((item) => (
            <Item key={item.id} item={item} currencyCode={order.currency_code} />
          ))
      ) : items ? (
        <p className="py-5 text-sm text-[#77717d]">No item details are available for this order.</p>
      ) : (
        repeat(5).map((i) => <SkeletonLineItem key={i} />)
      )}
    </div>
  )
}

export default Items
