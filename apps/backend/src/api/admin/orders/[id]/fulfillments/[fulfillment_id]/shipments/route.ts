import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { createOrderShipmentWorkflow } from "@medusajs/medusa/core-flows"
import {
  decryptIntegrationSecret,
  readVibeyaIntegrationsConfig,
  VIBEYA_INTEGRATIONS_METADATA_KEY,
} from "../../../../../../../lib/vibeya-integrations"
import { registerTrackingNumbers } from "../../../../../../../lib/vibeya-tracking"

type PayPalOrderPayment = {
  provider_id?: string
  data?: { order_id?: string; capture_id?: string }
}

type ShipmentLabel = {
  tracking_number: string
  tracking_url: string
  label_url: string
}

const getCarrier = (name: string) => {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes("usps")) return { carrier: "USPS" }
  if (normalized.includes("gofo")) return { carrier: "GOFO_EXPRESS" }
  if (normalized.includes("ups")) return { carrier: "UPS" }
  if (normalized.includes("fedex")) return { carrier: "FEDEX" }
  if (normalized.includes("dhl")) return { carrier: "DHL" }
  return { carrier: "OTHER", carrier_name_other: name.trim() || "Other carrier" }
}

async function syncTrackingToPayPal(
  req: MedusaRequest,
  orderId: string,
  labels: ShipmentLabel[]
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["metadata"],
  })
  const config = readVibeyaIntegrationsConfig(
    stores[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY]
  )

  if (!config.paypal.enabled || !config.paypal.clientId || !config.paypal.encryptedSecret) {
    return
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const orderQuery = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { id: orderId },
    fields: [
      "id",
      "shipping_methods.name",
      "shipping_methods.shipping_option.type.code",
      "payment_collections.payments.provider_id",
      "payment_collections.payments.data",
    ],
  })
  const [order] = await remoteQuery(orderQuery)
  if (!order) throw new Error(`Cannot load order ${orderId} for PayPal tracking sync`)

  const payment = (order.payment_collections ?? [])
    .flatMap((collection: { payments?: PayPalOrderPayment[] }) => collection.payments ?? [])
    .find((item: PayPalOrderPayment) => item.provider_id?.startsWith("pp_paypal_"))
  const paypalOrderId = payment?.data?.order_id
  if (!paypalOrderId) return

  const trackingLabels = labels.filter(
    (label) => typeof label.tracking_number === "string" && label.tracking_number.trim()
  )
  if (trackingLabels.length === 0) return

  const secret = decryptIntegrationSecret(config.paypal.encryptedSecret)
  const apiBase = config.paypal.environment === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"
  const tokenResponse = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.paypal.clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })
  const tokenPayload = await tokenResponse.json() as { access_token?: string; error_description?: string }
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || `PayPal token request failed (${tokenResponse.status})`)
  }

  let captureId = payment.data?.capture_id
  if (!captureId) {
    const paypalOrderResponse = await fetch(
      `${apiBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      { headers: { Authorization: `Bearer ${tokenPayload.access_token}` } }
    )
    const paypalOrder = await paypalOrderResponse.json() as {
      purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string }> } }>
      message?: string
    }
    if (!paypalOrderResponse.ok) {
      throw new Error(paypalOrder.message || `PayPal order lookup failed (${paypalOrderResponse.status})`)
    }
    captureId = paypalOrder.purchase_units?.[0]?.payments?.captures?.[0]?.id
  }
  if (!captureId) throw new Error("The PayPal order has no captured payment to attach tracking to")

  const shippingMethod = order.shipping_methods?.[0]
  const carrierName = shippingMethod?.type?.code || shippingMethod?.name || ""
  const carrier = getCarrier(carrierName)
  for (const label of trackingLabels) {
    const response = await fetch(
      `${apiBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/track`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          capture_id: captureId,
          tracking_number: label.tracking_number?.trim(),
          ...carrier,
          notify_payer: true,
        }),
      }
    )
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string; name?: string }
      throw new Error(payload.message || payload.name || `PayPal tracking request failed (${response.status})`)
    }
  }

  logger.info(`Sent ${trackingLabels.length} tracking number(s) for order ${orderId} to PayPal`)
}

async function registerTrackingWith17Track(
  req: MedusaRequest,
  orderId: string,
  labels: ShipmentLabel[]
) {
  const trackingNumbers = labels
    .map((label) => label.tracking_number?.trim())
    .filter((number): number is string => Boolean(number))
  if (trackingNumbers.length === 0) return

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: stores } = await query.graph({ entity: "store", fields: ["metadata"] })
  const config = readVibeyaIntegrationsConfig(
    stores[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY]
  )
  if (!config.tracking.enabled || !config.tracking.encryptedApiKey) return

  await registerTrackingNumbers(
    decryptIntegrationSecret(config.tracking.encryptedApiKey),
    trackingNumbers
  )
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`Registered ${trackingNumbers.length} tracking number(s) with 17TRACK for order ${orderId}`)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const orderId = req.params.id
  const fulfillmentId = req.params.fulfillment_id
  const body = req.validatedBody as {
    items: Array<{ id: string; quantity: number }>
    labels?: ShipmentLabel[]
    [key: string]: unknown
  }
  const input = {
    ...body,
    order_id: orderId,
    fulfillment_id: fulfillmentId,
    labels: body.labels ?? [],
    items: body.items,
  }

  await createOrderShipmentWorkflow(req.scope).run({ input })

  try {
    await syncTrackingToPayPal(req, orderId, input.labels)
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.error(`PayPal tracking sync failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`)
  }

  try {
    await registerTrackingWith17Track(req, orderId, input.labels)
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.error(`17TRACK registration failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`)
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { id: orderId },
    fields: req.queryConfig.fields,
  })
  const [order] = await remoteQuery(queryObject)
  return res.status(200).json({ order })
}
