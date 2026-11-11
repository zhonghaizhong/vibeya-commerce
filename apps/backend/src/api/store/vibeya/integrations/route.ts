import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  decryptIntegrationSecret,
  readVibeyaIntegrationsConfig,
  VIBEYA_INTEGRATIONS_METADATA_KEY,
} from "../../../../lib/vibeya-integrations"

async function getStoreIntegrations(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const raw = data[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY]
  return { config: readVibeyaIntegrationsConfig(raw), hasSavedConfig: Boolean(raw && typeof raw === "object") }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { config, hasSavedConfig } = await getStoreIntegrations(req)
  const turnstileEnabled = hasSavedConfig ? config.turnstile.enabled : Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  return res.json({
    turnstile: {
      enabled: turnstileEnabled,
      siteKey: hasSavedConfig ? config.turnstile.siteKey : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
    },
    paypal: {
      enabled: hasSavedConfig ? config.paypal.enabled : Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
      clientId: hasSavedConfig ? config.paypal.clientId : process.env.PAYPAL_CLIENT_ID || "",
      environment: hasSavedConfig ? config.paypal.environment : process.env.PAYPAL_ENVIRONMENT || "sandbox",
      autoCapture: hasSavedConfig ? config.paypal.autoCapture : process.env.PAYPAL_AUTO_CAPTURE !== "false",
    },
    google: {
      enabled: hasSavedConfig ? config.google.enabled : Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL),
      callbackUrl: hasSavedConfig ? config.google.callbackUrl : process.env.GOOGLE_CALLBACK_URL || "",
    },
  })
}

