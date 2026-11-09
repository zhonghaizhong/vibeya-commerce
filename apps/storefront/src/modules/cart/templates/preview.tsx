"use client"

import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
}

const ItemsPreviewTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart.items
  const hasOverflow = items && items.length > 4

  return (
    <div
      className={clx(
        "flex flex-col",
        hasOverflow && "max-h-[420px] overflow-y-auto overflow-x-hidden no-scrollbar"
      )}
      data-testid="items-table"
    >
      {items
        ? [...items]
            .sort((a, b) => (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1)
            .map((item) => (
              <Item
                key={item.id}
                item={item}
                type="preview"
                currencyCode={cart.currency_code}
              />
            ))
        : repeat(5).map((index) => (
            <div
              key={index}
              className="my-3 animate-pulse rounded-2xl border border-[#eee8f0] bg-white p-3"
            >
              <div className="flex gap-3">
                <div className="h-[68px] w-[68px] shrink-0 rounded-xl bg-[#f0ebf2]" />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                  <div className="h-3 w-4/5 rounded bg-[#f0ebf2]" />
                  <div className="h-3 w-2/5 rounded bg-[#f0ebf2]" />
                </div>
              </div>
            </div>
          ))}
    </div>
  )
}

export default ItemsPreviewTemplate
