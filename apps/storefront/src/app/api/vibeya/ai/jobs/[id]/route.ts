import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import { FetchError } from "@medusajs/js-sdk"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const customer = await retrieveCustomer()
  if (!customer) return NextResponse.json({ error: "Please sign in to view your designs." }, { status: 401 })
  const headers = await getAuthHeaders()
  const { id } = await context.params
  try {
    const result = await sdk.client.fetch<{ job: unknown }>(`/store/vibeya/ai/jobs/${encodeURIComponent(id)}`, {
      method: "GET", headers, cache: "no-store",
    })
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "This design task could not be loaded right now." }, { status: 502 })
  }
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const customer = await retrieveCustomer()
  if (!customer) return NextResponse.json({ error: "Please sign in to generate this design." }, { status: 401 })
  const headers = await getAuthHeaders()
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "This design is missing its task ID." }, { status: 400 })
  try {
    const result = await sdk.client.fetch<{ job: { id: string; status: string; error?: string } }>(`/store/vibeya/ai/jobs/${encodeURIComponent(id)}`, {
      method: "POST", headers, cache: "no-store",
    })
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const status = error instanceof FetchError ? error.status : 502
    const message = error instanceof Error ? error.message : "The image generation task could not be started."
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const customer = await retrieveCustomer()
  if (!customer) return NextResponse.json({ error: "Please sign in to delete your design." }, { status: 401 })
  const headers = await getAuthHeaders()
  const { id: pathId } = await context.params
  const requestBody = await request.json().catch(() => ({})) as { id?: unknown }
  const id = typeof requestBody.id === "string" && requestBody.id.trim() ? requestBody.id.trim() : pathId.trim()
  if (!id) return NextResponse.json({ error: "This design link is missing its task ID. Refresh My Designs and try again." }, { status: 400 })
  try {
    const result = await sdk.client.fetch<{ id: string; deleted: boolean }>(`/store/vibeya/ai/jobs/${encodeURIComponent(id)}?job_id=${encodeURIComponent(id)}`, {
      method: "DELETE", headers, body: { id }, cache: "no-store",
    })
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const status = error instanceof FetchError ? error.status : 502
    const message = error instanceof Error ? error.message : "This design could not be deleted right now."
    return NextResponse.json({ error: message }, { status })
  }
}
