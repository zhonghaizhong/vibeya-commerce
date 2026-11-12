import { sdk } from "@lib/config"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const data = await sdk.client.fetch<{ inspirations: unknown[] }>("/store/vibeya/inspirations", { cache: "no-store" })
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Unable to load VIBEYA inspiration catalog", error)
    return NextResponse.json({ error: "Could not load inspiration content" }, { status: 502 })
  }
}
