import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  decryptIntegrationSecret,
  readVibeyaIntegrationsConfig,
  VIBEYA_INTEGRATIONS_METADATA_KEY,
} from "../../../../../../lib/vibeya-integrations"
import { getTrackingInfo } from "../../../../../../lib/vibeya-tracking"

type OrderLabel = { tracking_number?: string; tracking_url?: string }
type OrderFulfillment = { labels?: OrderLabel[] }
type TrackedOrder = { id: string; customer_id?: string; fulfillments?: OrderFulfillment[] }

const statusLabels: Record<string, string> = {
  InfoReceived: "Shipping information received",
  InTransit: "In transit",
  OutForDelivery: "Out for delivery",
  Delivered: "Delivered",
  AvailableForPickup: "Ready for pickup",
  DeliveryFailure: "Delivery exception",
  Exception: "Delivery exception",
  Expired: "Tracking expired",
  NotFound: "Tracking information pending",
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!customerId) return res.status(401).json({ message: "Sign in to view shipment tracking." })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "fulfillments.labels.tracking_number", "fulfillments.labels.tracking_url"],
    filters: { id: req.params.id, customer_id: customerId },
  })
  const order = data[0] as TrackedOrder | undefined
  if (!order) return res.status(404).json({ message: "Order not found." })

  const labels = (order.fulfillments ?? []).flatMap((fulfillment) => fulfillment.labels ?? [])
    .filter((label): label is OrderLabel & { tracking_number: string } => Boolean(label.tracking_number?.trim()))
  if (labels.length === 0) return res.json({ shipments: [] })

  const { data: stores } = await query.graph({ entity: "store", fields: ["metadata"] })
  const config = readVibeyaIntegrationsConfig(stores[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY])
  if (!config.tracking.enabled || !config.tracking.encryptedApiKey) {
    return res.json({ shipments: labels.map((label) => ({ trackingNumber: label.tracking_number, trackingUrl: label.tracking_url, status: "Tracking not configured", events: [] })) })
  }

  try {
    const records = await getTrackingInfo(
      decryptIntegrationSecret(config.tracking.encryptedApiKey),
      labels.map((label) => label.tracking_number)
    )
    const shipments = labels.map((label) => {
      const record = records.find((item) => item.number === label.tracking_number)
      const track = record?.track_info
      const statusCode = track?.latest_status?.status ?? "NotFound"
      const events = (track?.tracking?.providers ?? []).flatMap((provider) =>
        (provider.events ?? []).map((event) => ({
          description: event.description ?? "Tracking update",
          location: event.location ?? "",
          time: event.time_iso ?? event.time_utc ?? "",
          carrier: provider.provider?.name ?? "",
        }))
      ).sort((left, right) => Date.parse(right.time) - Date.parse(left.time)).slice(0, 12)
      return {
        trackingNumber: label.tracking_number,
        trackingUrl: label.tracking_url,
        status: statusLabels[statusCode] ?? statusCode,
        statusCode,
        events,
      }
    })
    return res.json({ shipments })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.error(`17TRACK lookup failed for order ${order.id}: ${error instanceof Error ? error.message : String(error)}`)
    return res.json({ shipments: labels.map((label) => ({ trackingNumber: label.tracking_number, trackingUrl: label.tracking_url, status: "Tracking temporarily unavailable", events: [] })) })
  }
}
