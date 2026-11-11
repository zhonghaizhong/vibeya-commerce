import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  decryptIntegrationSecret,
  readVibeyaIntegrationsConfig,
  VIBEYA_INTEGRATIONS_METADATA_KEY,
} from "../../../../../lib/vibeya-integrations"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { token?: unknown } | undefined
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  if (!token || token.length > 4096) return res.status(400).json({ valid: false })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const raw = data[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY]
  const config = readVibeyaIntegrationsConfig(raw)
  let secret = ""
  if (raw && typeof raw === "object") {
    if (!config.turnstile.enabled || !config.turnstile.encryptedSecret) return res.status(503).json({ valid: false })
    try { secret = decryptIntegrationSecret(config.turnstile.encryptedSecret) } catch { return res.status(503).json({ valid: false }) }
  } else {
    secret = process.env.TURNSTILE_SECRET_KEY || ""
  }
  if (!secret) return res.status(503).json({ valid: false })

  const verification = new FormData()
  verification.set("secret", secret)
  verification.set("response", token)
  const forwardedFor = req.headers["x-forwarded-for"]
  if (typeof forwardedFor === "string") verification.set("remoteip", forwardedFor.split(",")[0].trim())
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: verification,
      signal: AbortSignal.timeout(8000),
    })
    const result = await response.json() as { success?: boolean }
    return res.json({ valid: result.success === true })
  } catch {
    return res.status(502).json({ valid: false })
  }
}

