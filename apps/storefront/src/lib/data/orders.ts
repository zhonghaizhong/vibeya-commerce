"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export type OrderTrackingEvent = {
  description: string
  location: string
  time: string
  carrier: string
}

export type OrderTrackingShipment = {
  trackingNumber: string
  trackingUrl?: string
  carrier?: string
  status: string
  statusCode?: string
  updatedAt?: string
  events: OrderTrackingEvent[]
}

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        fields: [
          "id",
          "display_id",
          "custom_display_id",
          "created_at",
          "email",
          "currency_code",
          "subtotal",
          "total",
          "tax_total",
          "shipping_total",
          "discount_total",
          "gift_card_total",
          "fulfillment_status",
          "payment_status",
          "*shipping_address",
          "*billing_address",
          "*shipping_methods",
          "*payment_collections.payments",
          "*items",
          "*items.metadata",
          "*items.variant",
          "*items.product",
          "items.thumbnail",
          "items.product.thumbnail",
        ].join(","),
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

export const retrieveOrderTracking = async (id: string) => {
  const headers = { ...(await getAuthHeaders()) }
  return sdk.client.fetch<{ shipments: OrderTrackingShipment[] }>(
    `/store/vibeya/orders/${encodeURIComponent(id)}/tracking`,
    { method: "GET", headers, cache: "no-store" }
  ).catch((err) => medusaError(err))
}

export const saveOrderAddressToAddressBook = async (id: string) => {
  const headers = { ...(await getAuthHeaders()) }
  return sdk.client.fetch<{ saved: boolean; alreadySaved: boolean }>(
    `/store/vibeya/orders/${encodeURIComponent(id)}/save-address`,
    { method: "POST", headers, cache: "no-store" }
  )
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, unknown>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields:
          "id,display_id,custom_display_id,created_at,email,total,currency_code,fulfillment_status,payment_status,shipping_address,*items,+items.metadata,*items.variant,*items.product,items.thumbnail,items.product.thumbnail",
        ...filters,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
