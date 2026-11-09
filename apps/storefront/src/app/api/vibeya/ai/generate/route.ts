import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 150

export async function POST(request: NextRequest) {
  try {
    const customer = await retrieveCustomer()
    if (!customer) return NextResponse.json({ error: "Sign in to start designing." }, { status: 401 })
    const body = await request.json()
    const result = await sdk.client.fetch<{ image: string; model: string }>("/store/vibeya/ai/generate", {
      method: "POST",
      body,
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 图片生成失败。"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
