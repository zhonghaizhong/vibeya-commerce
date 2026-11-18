import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | Record<string, never>
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | Record<string, never>> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

// `sameSite: "lax"` rather than `"strict"`: the customer returns from a
// redirect-based payment method (iDEAL, Bancontact, ...) via a cross-site
// top-level navigation. A "strict" cookie is withheld on that navigation, so
// the storefront would see a logged-out, cartless visitor and render a 404 for
// the checkout page instead of resuming the order. "lax" is sent on top-level
// GET navigations while still blocking cross-site subrequests.
export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
    path: "/",
  })
}

export type PendingCustomer = {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

// During the email verification flow the customer record isn't created until
// the customer verifies their email and logs in. We temporarily persist the
// extra signup fields in a cookie so they survive the customer leaving to open
// their inbox, and read them back when creating the customer at login.
export const setPendingCustomer = async (customer: PendingCustomer) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", JSON.stringify(customer), {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getPendingCustomer = async (): Promise<PendingCustomer | null> => {
  const cookies = await nextCookies()
  const value = cookies.get("_medusa_pending_customer")?.value

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PendingCustomer
  } catch {
    return null
  }
}

export const removePendingCustomer = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", "", {
    maxAge: -1,
  })
}

const MARKET_COUNTRY_CODES = ["us", "ca", "jp", "mx"] as const
type MarketCountryCode = (typeof MARKET_COUNTRY_CODES)[number]

const resolveCartCountry = async (countryCode?: string): Promise<MarketCountryCode> => {
  const cookies = await nextCookies()
  const requested = countryCode?.toLowerCase()
  if (MARKET_COUNTRY_CODES.includes(requested as MarketCountryCode)) {
    return requested as MarketCountryCode
  }
  const destination = cookies.get("vibeya_destination_country")?.value?.toLowerCase()
  return MARKET_COUNTRY_CODES.includes(destination as MarketCountryCode)
    ? (destination as MarketCountryCode)
    : "us"
}

const cartCookieName = (countryCode: MarketCountryCode) => `_medusa_cart_id_${countryCode}`

export const getDestinationCountryCode = async (): Promise<MarketCountryCode> =>
  resolveCartCountry()

export const getCartId = async (countryCode?: string) => {
  const cookies = await nextCookies()
  return cookies.get(cartCookieName(await resolveCartCountry(countryCode)))?.value
}

export const removeLegacyCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", { maxAge: -1, path: "/" })
}

// See the note on `setAuthToken`: `sameSite: "lax"` so market carts survive
// cross-site payment redirects while remaining isolated from one another.
export const setCartId = async (cartId: string, countryCode?: string) => {
  const cookies = await nextCookies()
  cookies.set(cartCookieName(await resolveCartCountry(countryCode)), cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export const removeCartId = async (countryCode?: string) => {
  const cookies = await nextCookies()
  if (countryCode) {
    cookies.set(cartCookieName(await resolveCartCountry(countryCode)), "", {
      maxAge: -1,
      path: "/",
    })
    return
  }
  for (const market of MARKET_COUNTRY_CODES) {
    cookies.set(cartCookieName(market), "", { maxAge: -1, path: "/" })
  }
  cookies.set("_medusa_cart_id", "", { maxAge: -1, path: "/" })
}
