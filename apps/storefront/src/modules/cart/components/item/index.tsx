"use client"

import { Table, Text } from "@modules/common/components/ui"
import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const designName = item.metadata?.vibeya_design_name
  const designPrompt = item.metadata?.vibeya_design_prompt
  const printPlacement = item.metadata?.vibeya_print_placement
  const referencesNotAttached = item.metadata?.vibeya_reference_images_not_attached
  const generatedArtwork = item.metadata?.vibeya_generated_artwork
  const printPlacementLabel =
    printPlacement === "both"
      ? "Front + Back"
      : printPlacement === "back"
        ? "Back Only"
        : printPlacement === "front"
          ? "Front Only"
          : null

  if (type === "preview") {
    return (
      <article
        className="my-3 rounded-2xl border border-[#e8e0eb] bg-[#fcf9fd] p-3 shadow-[0_4px_16px_rgba(32,16,48,0.04)]"
        data-testid="product-row"
      >
        <div className="flex min-w-0 items-start gap-3">
          <LocalizedClientLink
            href={`/products/${item.product_handle}`}
            className="block h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border border-[#eee8f0] bg-white"
          >
            <Thumbnail
              thumbnail={item.thumbnail}
              images={item.variant?.product?.images}
              size="square"
              alt={item.product_title}
              className="!h-full !w-full !rounded-xl !p-0 !shadow-none"
            />
          </LocalizedClientLink>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Text className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-[#190f24]" data-testid="product-title">
                  {item.product_title}
                </Text>
                <span
                  className="mt-1.5 inline-block max-w-full truncate rounded-full bg-[#f1e9f7] px-2 py-1 text-[10px] font-medium leading-none text-[#5f4a6c]"
                  data-testid="product-variant"
                  title={item.variant?.title || ""}
                >
                  {item.variant?.title || "Product variant"}
                </span>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold leading-none text-[#675d6e] ring-1 ring-inset ring-[#ece5ef]">
                  Qty {item.quantity}
                </span>
                <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
              </div>
            </div>
          </div>
        </div>

        {typeof designName === "string" && (
          <div className="mt-3 flex min-w-0 items-center gap-2.5 rounded-xl border border-[#eee8f2] bg-white/80 p-2.5">
            {typeof generatedArtwork === "string" && generatedArtwork.startsWith("data:image/webp;base64,") && (
              <Thumbnail
                thumbnail={generatedArtwork}
                alt="Generated design preview"
                size="square"
                className="!h-12 !w-12 !shrink-0 !rounded-lg !border !border-[#eee8f0] !bg-white !p-0 !shadow-none"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8a6c9c]">
                Your design
              </div>
              <p className="truncate text-[11px] font-semibold leading-4 text-[#34263e]">
                {designName}{printPlacementLabel ? ` · ${printPlacementLabel}` : ""}
              </p>
              {typeof designPrompt === "string" && designPrompt && (
                <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[10px] leading-4 text-[#746a7a]">
                  {designPrompt}
                </p>
              )}
              {referencesNotAttached === true && (
                <p className="mt-0.5 text-[10px] leading-4 text-[#746a7a]">
                  Original references stay on your device; the generated preview is included.
                </p>
              )}
            </div>
          </div>
        )}
      </article>
    )
  }

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  // TODO: Update this to grab the actual max inventory
  const maxQtyFromInventory = 10
  const maxQuantity = item.variant?.manage_inventory ? 10 : maxQtyFromInventory

  return (
    <Table.Row className="w-full" data-testid="product-row">
      <Table.Cell className="!pl-0 p-4 w-24">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="flex small:w-24 w-12"
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
          />
        </LocalizedClientLink>
      </Table.Cell>

      <Table.Cell className="text-left">
        <Text
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-title"
        >
          {item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        {typeof designName === "string" && (
          <div className="mt-2 max-w-xl text-xs leading-relaxed text-ui-fg-subtle">
            {typeof generatedArtwork === "string" && generatedArtwork.startsWith("data:image/webp;base64,") && (
              <Thumbnail
                thumbnail={generatedArtwork}
                alt="AI generated artwork preview"
                size="square"
                className="mb-2 !h-20 !w-20 !rounded-md !border !border-ui-border-base !p-0 !shadow-none"
              />
            )}
            <p>
              <span className="font-medium text-ui-fg-base">Design:</span> {designName}
              {printPlacementLabel && <> · {printPlacementLabel}</>}
            </p>
            {typeof designPrompt === "string" && designPrompt && (
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap">{designPrompt}</p>
            )}
            {referencesNotAttached === true && (
              <p className="mt-1">Original reference images stay on your device; the generated artwork preview is attached to this order.</p>
            )}
          </div>
        )}
      </Table.Cell>

      {type === "full" && (
        <Table.Cell>
          <div className="flex gap-2 items-center w-28">
            <DeleteButton id={item.id} data-testid="product-delete-button" />
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className="w-14 h-10 p-4"
              data-testid="product-select-button"
            >
              {/* TODO: Update this with the v2 way of managing inventory */}
              {Array.from(
                {
                  length: Math.min(maxQuantity, 10),
                },
                (_, i) => (
                  <option value={i + 1} key={i}>
                    {i + 1}
                  </option>
                )
              )}

              <option value={1} key={1}>
                1
              </option>
            </CartItemSelect>
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </Table.Cell>
      )}

      {type === "full" && (
        <Table.Cell className="hidden small:table-cell">
          <LineItemUnitPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </Table.Cell>
      )}

      <Table.Cell className="!pr-0">
        <span
          className="!pr-0"
        >
          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

export default Item
