import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"
import {
  encryptIntegrationSecret,
  readVibeyaIntegrationsConfig,
  toPublicVibeyaIntegrationsConfig,
  VIBEYA_INTEGRATIONS_METADATA_KEY,
} from "../../../../lib/vibeya-integrations"

async function getStore(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["id", "metadata"] })
  return data[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const store = await getStore(req)
  return res.json({ config: toPublicVibeyaIntegrationsConfig(readVibeyaIntegrationsConfig(store?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY])) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as Record<string, any> | undefined
  const store = await getStore(req)
  if (!store) return res.status(404).json({ error: "没有找到店铺配置。" })

  const current = readVibeyaIntegrationsConfig(store.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY])
  const brevoKey = typeof body?.brevo?.key === "string" ? body.brevo.key.trim() : ""
  const turnstileSecret = typeof body?.turnstile?.secret === "string" ? body.turnstile.secret.trim() : ""
  const paypalSecret = typeof body?.paypal?.secret === "string" ? body.paypal.secret.trim() : ""
  const googleSecret = typeof body?.google?.secret === "string" ? body.google.secret.trim() : ""
  const trackingApiKey = typeof body?.tracking?.apiKey === "string" ? body.tracking.apiKey.trim() : ""
  const port = Number(body?.brevo?.port)
  const environment = body?.paypal?.environment
  const callbackUrl = typeof body?.google?.callbackUrl === "string" ? body.google.callbackUrl.trim() : current.google.callbackUrl
  const paypalLoginCallbackUrl = typeof body?.paypal?.loginCallbackUrl === "string" ? body.paypal.loginCallbackUrl.trim() : current.paypal.loginCallbackUrl
  let validPaypalLoginCallback = false
  try {
    const parsed = new URL(paypalLoginCallbackUrl)
    validPaypalLoginCallback = parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))
  } catch {}
  let validCallback = false
  try {
    const parsed = new URL(callbackUrl)
    validCallback = parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))
  } catch {}

  if (brevoKey.length > 1000 || turnstileSecret.length > 1000 || paypalSecret.length > 2000 || googleSecret.length > 2000 || trackingApiKey.length > 2000) return res.status(400).json({ error: "密钥长度不正确。" })
  if (!Number.isInteger(port) || port < 1 || port > 65535) return res.status(400).json({ error: "Brevo SMTP 端口必须是 1 到 65535 之间的数字。" })
  if (environment !== "sandbox" && environment !== "production") return res.status(400).json({ error: "请选择 PayPal 测试环境或正式环境。" })

  const fromEmail = typeof body?.brevo?.fromEmail === "string" ? body.brevo.fromEmail.trim() : ""
  if (!fromEmail.includes("@") || !(body?.brevo?.login || current.brevo.login) || !(brevoKey || current.brevo.encryptedKey)) {
    return res.status(400).json({ error: "注册邮件验证是必需功能，请填写发件邮箱、Brevo 登录名和 SMTP 密钥。" })
  }
  if (body?.turnstile?.enabled && (!(body?.turnstile?.siteKey || current.turnstile.siteKey) || !(turnstileSecret || current.turnstile.encryptedSecret))) {
    return res.status(400).json({ error: "启用人机验证前，请填写 Site Key 和 Secret Key。" })
  }
  if (body?.paypal?.enabled && (!(body?.paypal?.clientId || current.paypal.clientId) || !(paypalSecret || current.paypal.encryptedSecret))) {
    return res.status(400).json({ error: "启用 PayPal 前，请填写 Client ID 和 Secret。" })
  }
  if (body?.google?.enabled && (!(body?.google?.clientId || current.google.clientId) || !(googleSecret || current.google.encryptedSecret) || !validCallback)) {
    return res.status(400).json({ error: "启用 Google 登录前，请填写 Client ID、Client Secret 和有效的 HTTPS 回调地址（本地测试可用 localhost）。" })
  }
  if (body?.tracking?.enabled && !(trackingApiKey || current.tracking.encryptedApiKey)) {
    return res.status(400).json({ error: "启用 17TRACK 前，请先填写 API Key。" })
  }
  if (body?.paypal?.loginEnabled && (!(body?.paypal?.clientId || current.paypal.clientId) || !(paypalSecret || current.paypal.encryptedSecret) || !validPaypalLoginCallback)) {
    return res.status(400).json({ error: "启用 PayPal 登录前，请填写 PayPal Client ID、Secret 和有效回调地址。" })
  }

  const next = {
    brevo: {
      enabled: true,
      host: typeof body?.brevo?.host === "string" && body.brevo.host.trim() ? body.brevo.host.trim() : "smtp-relay.brevo.com",
      port,
      login: typeof body?.brevo?.login === "string" ? body.brevo.login.trim() : current.brevo.login,
      encryptedKey: brevoKey ? encryptIntegrationSecret(brevoKey) : current.brevo.encryptedKey,
      keyHint: brevoKey ? brevoKey.slice(-4) : current.brevo.keyHint,
      fromEmail,
      fromName: typeof body?.brevo?.fromName === "string" ? body.brevo.fromName.trim().slice(0, 100) : current.brevo.fromName,
    },
    turnstile: {
      enabled: body?.turnstile?.enabled === true,
      siteKey: typeof body?.turnstile?.siteKey === "string" ? body.turnstile.siteKey.trim() : current.turnstile.siteKey,
      encryptedSecret: turnstileSecret ? encryptIntegrationSecret(turnstileSecret) : current.turnstile.encryptedSecret,
      secretHint: turnstileSecret ? turnstileSecret.slice(-4) : current.turnstile.secretHint,
    },
    paypal: {
      enabled: body?.paypal?.enabled === true,
      clientId: typeof body?.paypal?.clientId === "string" ? body.paypal.clientId.trim() : current.paypal.clientId,
      encryptedSecret: paypalSecret ? encryptIntegrationSecret(paypalSecret) : current.paypal.encryptedSecret,
      secretHint: paypalSecret ? paypalSecret.slice(-4) : current.paypal.secretHint,
      environment,
      webhookId: typeof body?.paypal?.webhookId === "string" ? body.paypal.webhookId.trim() : current.paypal.webhookId,
      autoCapture: body?.paypal?.autoCapture !== false,
      loginEnabled: body?.paypal?.loginEnabled === true,
      loginCallbackUrl: paypalLoginCallbackUrl,
    },
    google: {
      enabled: body?.google?.enabled === true,
      clientId: typeof body?.google?.clientId === "string" ? body.google.clientId.trim() : current.google.clientId,
      encryptedSecret: googleSecret ? encryptIntegrationSecret(googleSecret) : current.google.encryptedSecret,
      secretHint: googleSecret ? googleSecret.slice(-4) : current.google.secretHint,
      callbackUrl,
    },
    tracking: {
      enabled: body?.tracking?.enabled === true,
      encryptedApiKey: trackingApiKey ? encryptIntegrationSecret(trackingApiKey) : current.tracking.encryptedApiKey,
      apiKeyHint: trackingApiKey ? trackingApiKey.slice(-4) : current.tracking.apiKeyHint,
    },
  }

  try {
    await updateStoresWorkflow(req.scope).run({
      input: {
        selector: { id: store.id },
        update: { metadata: { ...(store.metadata ?? {}), [VIBEYA_INTEGRATIONS_METADATA_KEY]: next } },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    return res.status(500).json({ error: `保存失败：${message}` })
  }

  return res.json({ config: toPublicVibeyaIntegrationsConfig(next) })
}
