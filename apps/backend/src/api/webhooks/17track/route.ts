import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateOrderWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  decryptIntegrationSecret,
  readVibeyaIntegrationsConfig,
  VIBEYA_INTEGRATIONS_METADATA_KEY,
} from "../../../../../lib/vibeya-integrations"
import { verifyTrack17Signature } from "../../../../../lib/vibeya-tracking"

const TRACKING_METADATA_KEY = "vibeya_tracking"

type Track17Event = {
  description?: string
  description_translation?: { description?: string }
  location?: string
  time_iso?: string
  time_utc?: string
  stage?: string
  sub_status?: string
}

type Track17Data = {
  number?: string
  carrier?: number
  tag?: string | null
  track_info?: {
    latest_status?: { status?: string; sub_status?: string }
    latest_event?: Track17Event | null
    tracking?: { providers?: Array<{ provider?: { name?: string }; events?: Track17Event[] }> }
  }
}

type TrackingSnapshot = {
  trackingNumber: string
  carrier: string
  statusCode: string
  stopped: boolean
  updatedAt: string
  events: Array<{ description: string; location: string; time: string; status?: string; carrier: string }>
}

type TrackedOrder = { id: string; metadata?: Record<string, unknown> | null; fulfillments?: Array<{ labels?: Array<{ tracking_number?: string }> }> }

function getEvents(data: Track17Data) {
  const providerEvents = (data.track_info?.tracking?.providers ?? []).flatMap((provider) =>
    (provider.events ?? []).map((event) => ({
      description: event.description_translation?.description || event.description || "Tracking update",
      location: event.location ?? "",
      time: event.time_iso ?? event.time_utc ?? "",
      status: event.stage ?? event.sub_status,
      carrier: provider.provider?.name ?? "",
    }))
  )
  if (!providerEvents.length && data.track_info?.latest_event) {
    const event = data.track_info.latest_event
    providerEvents.push({
      description: event.description_translation?.description || event.description || "Tracking update",
      location: event.location ?? "",
      time: event.time_iso ?? event.time_utc ?? "",
      status: event.stage ?? event.sub_status,
      carrier: "",
    })
  }
  return providerEvents
    .filter((event) => event.description || event.time)
    .sort((left, right) => Date.parse(right.time) - Date.parse(left.time))
    .slice(0, 100)
}

// 17TRACK calls this server-to-server endpoint; its SHA-256 signature is verified against
// the saved API key before any order data is changed.
export const AUTHENTICATE = false

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const rawBody = (req as MedusaRequest & { rawBody?: string | Buffer }).rawBody
  const signature = req.headers.sign
  if (!rawBody || typeof signature !== "string") return res.status(401).json({ message: "Invalid 17TRACK signature." })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: stores } = await query.graph({ entity: "store", fields: ["metadata"] })
  const integrations = readVibeyaIntegrationsConfig(stores[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY])
  if (!integrations.tracking.enabled || !integrations.tracking.encryptedApiKey) {
    return res.status(503).json({ message: "17TRACK integration is not enabled." })
  }

  let apiKey: string
  try {
    apiKey = decryptIntegrationSecret(integrations.tracking.encryptedApiKey)
  } catch {
    return res.status(503).json({ message: "17TRACK integration is not configured correctly." })
  }
  if (!verifyTrack17Signature(rawBody, signature, apiKey)) {
    return res.status(401).json({ message: "Invalid 17TRACK signature." })
  }

  let body: { event?: string; data?: Track17Data | { accepted?: Track17Data[] } }
  try {
    body = JSON.parse(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"))
  } catch {
    return res.status(400).json({ message: "Invalid JSON payload." })
  }

  if (body.event !== "TRACKING_UPDATED" && body.event !== "TRACKING_STOPPED") {
    // Acknowledge unknown events so 17TRACK does not retry notifications this app doesn't use.
    return res.status(200).json({ received: true })
  }

  const rawData = body.data
  let data: Track17Data | undefined
  if (rawData && "accepted" in rawData) data = rawData.accepted?.[0]
  else data = rawData as Track17Data | undefined
  const trackingNumber = data?.number?.trim()
  const orderId = data?.tag?.trim()
  if (!data || !trackingNumber || !orderId) {
    // Older registrations may not have an order tag. Ignore safely; new shipments include it.
    return res.status(200).json({ received: true, matched: false })
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata", "fulfillments.labels.tracking_number"],
    filters: { id: orderId },
  })
  const order = orders[0] as TrackedOrder | undefined
  const belongsToOrder = order?.fulfillments?.some((fulfillment) =>
    fulfillment.labels?.some((label) => label.tracking_number?.trim() === trackingNumber)
  )
  if (!order || !belongsToOrder) return res.status(200).json({ received: true, matched: false })

  const previous = (order.metadata?.[TRACKING_METADATA_KEY] ?? {}) as Record<string, TrackingSnapshot>
  const oldSnapshot = previous[trackingNumber]
  const incomingEvents = body.event === "TRACKING_UPDATED" ? getEvents(data) : []
  const mergedEvents = [...incomingEvents, ...(oldSnapshot?.events ?? [])]
    .filter((event, index, all) => all.findIndex((candidate) =>
      candidate.time === event.time && candidate.description === event.description && candidate.location === event.location
    ) === index)
    .sort((left, right) => Date.parse(right.time) - Date.parse(left.time))
    .slice(0, 100)
  const snapshot: TrackingSnapshot = {
    trackingNumber,
    carrier: String(data.carrier ?? ""),
    statusCode: data.track_info?.latest_status?.status ?? oldSnapshot?.statusCode ?? "NotFound",
    stopped: body.event === "TRACKING_STOPPED",
    updatedAt: new Date().toISOString(),
    events: mergedEvents,
  }

  await updateOrderWorkflow(req.scope).run({
    input: {
      id: order.id,
      user_id: "system:17track-webhook",
      metadata: { ...(order.metadata ?? {}), [TRACKING_METADATA_KEY]: { ...previous, [trackingNumber]: snapshot } },
    },
  })

  return res.status(200).json({ received: true })
}
