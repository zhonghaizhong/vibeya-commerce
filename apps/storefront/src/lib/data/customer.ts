"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { FetchError } from "@medusajs/js-sdk"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheTag,
  getCartId,
  getPendingCustomer,
  removeAuthToken,
  removeCartId,
  removePendingCustomer,
  setAuthToken,
  setPendingCustomer,
} from "./cookies"

export type CustomerAuthState =
  | { state: "error"; error: string }
  | { state: "verification_required"; email: string }
  | { state: "success" }
  | null

async function verifyTurnstileToken(token: FormDataEntryValue | null) {
  if (typeof token !== "string" || !token.trim()) {
    return "Please complete the human verification before creating your account."
  }

  try {
    const result = await sdk.client.fetch<{ valid?: boolean }>(
      "/store/vibeya/integrations/turnstile",
      { method: "POST", body: { token }, cache: "no-store" }
    )
    return result.valid
      ? null
      : "Human verification failed. Please try again."
  } catch {
    return "Human verification could not be checked. Please try again."
  }
}

// Requests a verification email for the given customer. The request must be
// authenticated with a token tied to the auth identity (the token returned by
// register or by a login that requires verification).
async function requestVerificationEmail(email: string, token: string) {
  await sdk.auth.verification.request(
    {
      entity_id: email,
      entity_type: "email",
    },
    {
      authorization: `Bearer ${token}`,
    }
  )
}

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!("authorization" in authHeaders)) return null

    const headers = {
      ...authHeaders,
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        headers,
        cache: "no-store",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag, { expire: 0 })

  return updateRes
}

export async function signup(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const verificationError = await verifyTurnstileToken(
    formData.get("turnstile_token")
  )
  if (verificationError) {
    return { state: "error", error: verificationError }
  }

  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password,
    })
  } catch (error) {
    const fetchError = error as FetchError
    // An existing identity (for example, an admin user with the same email) is
    // expected and handled: the customer can still log in to link a customer
    // record. Any other error is surfaced.
    if (
      fetchError.statusText !== "Unauthorized" ||
      fetchError.message !== "Identity with email already exists"
    ) {
      return { state: "error", error: String(error) }
    }
  }

  // Persist the extra signup fields. The customer record is created during
  // login, which is deferred until after email verification when the backend
  // requires it.
  await setPendingCustomer(customerForm)

  // Continue by logging in. The login response tells us whether the backend
  // requires email verification — we don't need a storefront-side flag.
  return completeLogin(customerForm.email, password)
}

export async function login(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  return completeLogin(email, password)
}

export async function setGoogleCustomerToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || token.split(".").length !== 3) {
    return { success: false, error: "Google sign-in returned an invalid token." }
  }

  await setAuthToken(token)
  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag, { expire: 0 })

  await transferCartAfterAuthentication()
  return { success: true }
}

export type PaypalShippingAddress = {
  first_name?: string
  last_name?: string
  address_1: string
  city: string
  province?: string
  postal_code: string
  country_code: string
}

export async function savePaypalShippingAddress(
  input: PaypalShippingAddress
): Promise<{ success: boolean; error?: string }> {
  const address = {
    first_name: input.first_name?.trim().slice(0, 100) || "",
    last_name: input.last_name?.trim().slice(0, 100) || "",
    address_1: input.address_1.trim().slice(0, 255),
    address_2: "",
    city: input.city.trim().slice(0, 100),
    province: input.province?.trim().slice(0, 100) || "",
    postal_code: input.postal_code.trim().slice(0, 30),
    country_code: input.country_code.trim().toLowerCase(),
  }

  // VIBEYA currently ships to U.S. addresses only. Keep sign-in available if
  // PayPal returns an incomplete or unsupported address; checkout stays editable.
  if (
    address.country_code !== "us" ||
    !address.address_1 ||
    !address.city ||
    !address.postal_code
  ) {
    return { success: false, error: "PayPal did not return a complete U.S. shipping address." }
  }

  const headers = await getAuthHeaders()

  try {
    const { customer } = await sdk.store.customer.retrieve({}, headers)
    const normalize = (value?: string | null) => (value || "").trim().toLowerCase()
    const existingAddress = customer.addresses?.find(
      (savedAddress) =>
        normalize(savedAddress.address_1) === normalize(address.address_1) &&
        normalize(savedAddress.city) === normalize(address.city) &&
        normalize(savedAddress.postal_code) === normalize(address.postal_code) &&
        normalize(savedAddress.country_code) === "us"
    )

    if (existingAddress) {
      await sdk.store.customer.updateAddress(
        existingAddress.id,
        { ...address, is_default_shipping: true },
        {},
        headers
      )
    } else {
      await sdk.store.customer.createAddress(
        { ...address, is_default_shipping: true },
        {},
        headers
      )
    }

    const cartId = await getCartId()
    if (cartId) {
      await sdk.store.cart.update(
        cartId,
        { shipping_address: { ...address, phone: "" } },
        {},
        headers
      )
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, { expire: 0 })
    }

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag, { expire: 0 })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not save the PayPal shipping address.",
    }
  }
}

// Logs the customer in and reconciles the customer record. The behavior is
// driven entirely by the backend's login response, so it works whether or not
// email verification is enabled.
async function completeLogin(
  email: string,
  password: string
): Promise<CustomerAuthState> {
  let result: Awaited<ReturnType<typeof sdk.auth.login>>

  try {
    result = await sdk.auth.login("customer", "emailpass", { email, password })
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  // A `location` is returned by third-party auth providers, which this flow
  // doesn't support.
  if (typeof result === "object" && "location" in result) {
    return {
      state: "error",
      error: "This login method isn't supported by the storefront.",
    }
  }

  // The backend requires email verification and the customer hasn't verified
  // yet. Send the verification email and ask them to check their inbox.
  if (
    typeof result === "object" &&
    "verification_required" in result &&
    result.verification_required
  ) {
    try {
      await requestVerificationEmail(email, result.token)
    } catch {
      // Ignore: the customer can resend from the verification page.
    }
    return { state: "verification_required", email }
  }

  if (typeof result !== "string") {
    return {
      state: "error",
      error: "Authentication requires additional steps that aren't supported.",
    }
  }

  let token = result

  // The token may not be tied to a customer record yet — right after
  // registration, or after verifying a brand-new account. Ask the backend to
  // link an existing customer with the same verified email before creating a
  // new record, then log in again to get a customer-bound token.
  const customerExists = await sdk.store.customer
    .retrieve({}, { authorization: `Bearer ${token}` })
    .then(() => true)
    .catch(() => false)

  if (!customerExists) {
    const association = await sdk.client.fetch<{ linked: boolean }>(
      "/store/vibeya/auth/associate-customer",
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: {},
        cache: "no-store",
      }
    )

    if (association.linked) {
      try {
        token = await sdk.auth.login("customer", "emailpass", { email, password }) as string
      } catch (error) {
        return { state: "error", error: String(error) }
      }
    } else {
      const pending = await getPendingCustomer()

      try {
        await sdk.store.customer.create(
          {
            email,
            first_name: pending?.first_name,
            last_name: pending?.last_name,
            phone: pending?.phone,
          },
          {},
          { authorization: `Bearer ${token}` }
        )

        token = (await sdk.auth.login("customer", "emailpass", {
          email,
          password,
        })) as string
      } catch (error) {
        return { state: "error", error: String(error) }
      }

      await removePendingCustomer()
    }
  }

  await setAuthToken(token)

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag, { expire: 0 })

  await transferCartAfterAuthentication()

  return { state: "success" }
}

// Cart migration is best-effort. Authentication has already succeeded, and a
// customer may sign in before creating a cart, so a missing cart must not make
// the sign-in action appear to fail or invalidate the authenticated session.
async function transferCartAfterAuthentication() {
  try {
    const cartId = await getCartId()
    if (cartId) await transferCart(cartId)
  } catch {
    // Keep the customer signed in if cart migration is unavailable.
  }
}

// Confirms a customer's email using the token from the verification link.
//
// The confirm route doesn't require authentication, so this works even when the
// customer opens the link on a different device than the one they signed up on.
export async function confirmEmailVerification(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sdk.auth.verification.confirm({ code: token })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag, { expire: 0 })

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag, { expire: 0 })

  redirect(`/${countryCode}/account`)
}

export async function transferCart(cartIdOverride?: string) {
  const cartId = cartIdOverride || (await getCartId())

  if (!cartId) {
    throw new Error("No cart is available to transfer")
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag, { expire: 0 })
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag, { expire: 0 })
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag, { expire: 0 })
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag, { expire: 0 })
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
