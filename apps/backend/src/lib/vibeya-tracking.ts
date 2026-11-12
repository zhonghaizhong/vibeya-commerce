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

export async function registerTrackingNumbers(apiKey: string, trackingNumbers: string[]) {
  const numbers = [...new Set(trackingNumbers.map((number) => number.trim()).filter(Boolean))]
  for (let index = 0; index < numbers.length; index += 40) {
    const batch = numbers.slice(index, index + 40)
    const response = await fetch(`${TRACK17_API_BASE}/register`, {
      method: "POST",
      headers: { "17token": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(batch.map((number) => ({ number }))),
    })
    const payload = await response.json().catch(() => ({})) as { code?: number; message?: string }
    if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
      throw new Error(payload.message || `17TRACK registration failed (${response.status})`)
    }
  }
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
