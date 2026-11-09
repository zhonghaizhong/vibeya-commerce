import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import { FetchError } from "@medusajs/js-sdk"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type DesignCreditSummary = {
  initialDesigns: number
  perPaidProductDesigns: number
  paidProductCount: number
  total: number
  used: number
  remaining: number
}

async function requireCustomer() {
  const customer = await retrieveCustomer()
  return customer ? getAuthHeaders() : null
}

export async function GET() {
  const headers = await requireCustomer()
  if (!headers) return NextResponse.json({ error: "Please sign in to view your designs." }, { status: 401 })
  try {
    const result = await sdk.client.fetch<{ jobs: unknown[]; credits: DesignCreditSummary }>("/store/vibeya/ai/jobs", {
      method: "GET", headers, cache: "no-store",
    })
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Your designs could not be loaded right now." }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const headers = await requireCustomer()
  if (!headers) return NextResponse.json({ error: "Please sign in before creating a design." }, { status: 401 })
  try {
    const body = await request.json()
    const result = await sdk.client.fetch<{ job: { id: string; status: string }; credits?: DesignCreditSummary }>("/store/vibeya/ai/jobs", {
      method: "POST", headers: { ...headers, "content-type": "application/json" }, body, cache: "no-store",
    })
    return NextResponse.json(result, { status: 202, headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const status = error instanceof FetchError ? error.status : 502
    const message = status === 403
      ? "You have used all available design generations."
      : error instanceof Error ? error.message : "Your design could not be submitted."
    return NextResponse.json({ error: message }, { status })
  }
}
