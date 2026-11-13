import { createHash, timingSafeEqual } from "node:crypto"

const TRACK17_API_BASE = "https://api.17track.net/track/v2.4"

export type Track17Event = {
  description?: string
  location?: string
  time_utc?: string
  time_iso?: string
}

export type Track17Info = {
  number?: string
  carrier?: number
  track_info?: {
    latest_status?: { status?: string }
    latest_event?: Track17Event
    tracking?: { providers?: Array<{ provider?: { name?: string }; events?: Track17Event[] }> }
  }
}

export type Track17Registration = { number: string; tag?: string }

export async function registerTrackingNumbers(apiKey: string, trackingNumbers: Track17Registration[]) {
  const numbers = [...new Map(trackingNumbers
    .map(({ number, tag }) => [number.trim(), { number: number.trim(), ...(tag ? { tag } : {}) }] as const)
    .filter(([number]) => Boolean(number))).values()]
  for (let index = 0; index < numbers.length; index += 40) {
    const batch = numbers.slice(index, index + 40)
    const response = await fetch(`${TRACK17_API_BASE}/register`, {
      method: "POST",
      headers: { "17token": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    })
    const payload = await response.json().catch(() => ({})) as { code?: number; message?: string }
    if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
      throw new Error(payload.message || `17TRACK registration failed (${response.status})`)
    }
  }
}

export function verifyTrack17Signature(rawBody: string | Buffer, signature: string, apiKey: string) {
  if (!signature || !apiKey) return false
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8")
  const expected = createHash("sha256").update(`${body}/${apiKey}`, "utf8").digest()
  const provided = Buffer.from(signature.trim(), "hex")
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export async function getTrackingInfo(apiKey: string, trackingNumbers: string[]) {
  const numbers = [...new Set(trackingNumbers.map((number) => number.trim()).filter(Boolean))]
  const results: Track17Info[] = []
  for (let index = 0; index < numbers.length; index += 40) {
    const batch = numbers.slice(index, index + 40)
    const response = await fetch(`${TRACK17_API_BASE}/gettrackinfo`, {
      method: "POST",
      headers: { "17token": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(batch.map((number) => ({ number }))),
      cache: "no-store",
    })
    const payload = await response.json().catch(() => ({})) as {
      code?: number
      message?: string
      data?: { accepted?: Track17Info[]; rejected?: unknown[] }
    }
    if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
      throw new Error(payload.message || `17TRACK lookup failed (${response.status})`)
    }
    results.push(...(payload.data?.accepted ?? []))
  }
  return results
}
