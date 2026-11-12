"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { getLocale } from "./locale-actions"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id")

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, { expire: 0 })
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, { expire: 0 })
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, { expire: 0 })

      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, { expire: 0 })
    })
    .catch(medusaError)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, { expire: 0 })
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, { expire: 0 })
    })
    .catch(medusaError)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, { expire: 0 })
    })
    .catch(medusaError)
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code")?.toString() ?? ""
  try {
    await applyPromotions([code])
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const getValue = (name: string) => {
      const value = formData.get(name)
      return typeof value === "string" ? value : null
    }
    const shippingPhone = getValue("shipping_address.phone")?.trim()
    if (!shippingPhone) {
      return "Please enter a phone number for the shipping address."
    }
    const shippingAddress = {
      first_name: getValue("shipping_address.first_name"),
      last_name: getValue("shipping_address.last_name"),
      address_1: getValue("shipping_address.address_1"),
      address_2: "",
      company: getValue("shipping_address.company"),
      postal_code: getValue("shipping_address.postal_code"),
      city: getValue("shipping_address.city"),
      country_code: getValue("shipping_address.country_code"),
      province: getValue("shipping_address.province"),
      phone: shippingPhone,
    }
    const data: HttpTypes.StoreUpdateCart = {
      shipping_address: shippingAddress,
      email: getValue("email"),
    }

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = shippingAddress

    if (sameAsBilling !== "on")
      data.billing_address = {
        first_name: getValue("billing_address.first_name"),
        last_name: getValue("billing_address.last_name"),
        address_1: getValue("billing_address.address_1"),
        address_2: "",
        company: getValue("billing_address.company"),
        postal_code: getValue("billing_address.postal_code"),
        city: getValue("billing_address.city"),
        country_code: getValue("billing_address.country_code"),
        province: getValue("billing_address.province"),
        phone: getValue("billing_address.phone"),
      }
    await updateCart(data)

  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const cart = await retrieveCart(id)
  if (!cart?.shipping_address?.phone?.trim()) {
    throw new Error("Please enter a phone number for the shipping address before placing your order.")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase()

    // Save the address only after checkout succeeds, so abandoned checkouts do
    // not add incomplete addresses to the customer's address book.
    const orderAddress = cartRes.order.shipping_address
    const customerHeaders = await getAuthHeaders()
    if (orderAddress?.address_1 && "authorization" in customerHeaders) {
      try {
        const { customer } = await sdk.store.customer.retrieve({}, customerHeaders)
        const savedAddress = {
          first_name: orderAddress.first_name,
          last_name: orderAddress.last_name,
          address_1: orderAddress.address_1,
          address_2: orderAddress.address_2 || "",
          company: orderAddress.company,
          postal_code: orderAddress.postal_code,
          city: orderAddress.city,
          country_code: orderAddress.country_code,
          province: orderAddress.province,
          phone: orderAddress.phone,
        }
        const normalize = (value?: string | null) => (value || "").trim().toLowerCase()
        const duplicate = customer.addresses?.find((address) =>
          normalize(address.address_1) === normalize(savedAddress.address_1) &&
          normalize(address.address_2) === normalize(savedAddress.address_2) &&
          normalize(address.city) === normalize(savedAddress.city) &&
          normalize(address.province) === normalize(savedAddress.province) &&
          normalize(address.postal_code) === normalize(savedAddress.postal_code) &&
          normalize(address.country_code) === normalize(savedAddress.country_code)
        )

        if (!duplicate) {
          await sdk.store.customer.createAddress({
            ...savedAddress,
            is_default_shipping: !(customer.addresses ?? []).some((address) => address.is_default_shipping),
          }, {}, customerHeaders)
          const customerCacheTag = await getCacheTag("customers")
          revalidateTag(customerCacheTag, { expire: 0 })
        }
      } catch (error) {
        console.error("Could not save completed order shipping address to customer address book", error)
      }
    }

    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag, { expire: 0 })

    removeCartId()
    redirect(`/${countryCode}/order/${cartRes?.order.id}/confirmed`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, { expire: 0 })
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag, { expire: 0 })

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag, { expire: 0 })

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}
