import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type OrderLabel = { tracking_number?: string; tracking_url?: string }
type OrderFulfillment = { labels?: OrderLabel[] }
type TrackingSnapshot = {
  trackingNumber?: string
  carrier?: string
  statusCode?: string
  updatedAt?: string
  events?: Array<{ description?: string; location?: string; time?: string; carrier?: string }>
}
type TrackedOrder = { id: string; customer_id?: string; metadata?: Record<string, unknown> | null; fulfillments?: OrderFulfillment[] }

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
    fields: ["id", "customer_id", "metadata", "fulfillments.labels.tracking_number", "fulfillments.labels.tracking_url"],
    filters: { id: req.params.id, customer_id: customerId },
  })
  const order = data[0] as TrackedOrder | undefined
  if (!order) return res.status(404).json({ message: "Order not found." })

  const labels = (order.fulfillments ?? []).flatMap((fulfillment) => fulfillment.labels ?? [])
    .filter((label): label is OrderLabel & { tracking_number: string } => Boolean(label.tracking_number?.trim()))
  if (labels.length === 0) return res.json({ shipments: [] })

  const pushedTracking = (order.metadata?.vibeya_tracking ?? {}) as Record<string, TrackingSnapshot>
  const shipments = labels.map((label) => {
    const snapshot = pushedTracking[label.tracking_number]
    const statusCode = snapshot?.statusCode ?? "NotFound"
    return {
      trackingNumber: label.tracking_number,
      trackingUrl: label.tracking_url,
      carrier: snapshot?.carrier,
      status: statusLabels[statusCode] ?? (snapshot ? statusCode : "Awaiting carrier updates"),
      statusCode: snapshot?.statusCode,
      updatedAt: snapshot?.updatedAt,
      events: snapshot?.events ?? [],
    }
  })
  return res.json({ shipments })
}
