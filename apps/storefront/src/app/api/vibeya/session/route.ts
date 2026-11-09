import { sdk } from "@lib/config"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const cookieStore = await cookies()
  let token = cookieStore.get("_medusa_jwt")?.value
  const headers = { "Cache-Control": "no-store" }
  if (!token) return NextResponse.json({ authenticated: false }, { headers })

  try {
    const refreshed = await sdk.client.fetch<{ token: string }>("/auth/token/refresh", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    token = refreshed.token
    cookieStore.set("_medusa_jwt", token, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })

    await sdk.client.fetch("/store/customers/me", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    return NextResponse.json({ authenticated: true }, { headers })
  } catch (error) {
    const status = (error as { status?: number; statusCode?: number })?.status
      ?? (error as { statusCode?: number })?.statusCode
    if (status === 401 || status === 403) {
      return NextResponse.json({ authenticated: false }, { headers })
    }

    // A backend/network hiccup is not proof that the customer signed out.
    console.error("Unable to verify VIBEYA customer session", error)
    return NextResponse.json(
      { authenticated: false, temporarilyUnavailable: true },
      { status: 503, headers }
    )
  }
}
