import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"

export const VIBEYA_INTEGRATIONS_METADATA_KEY = "vibeya_integrations_config"

export type VibeyaIntegrationsConfig = {
  brevo: {
    enabled: boolean
    host: string
    port: number
    login: string
    encryptedKey: string
    keyHint: string
    fromEmail: string
    fromName: string
  }
  turnstile: {
    enabled: boolean
    siteKey: string
    encryptedSecret: string
    secretHint: string
  }
  paypal: {
    enabled: boolean
    clientId: string
    encryptedSecret: string
    secretHint: string
    environment: "sandbox" | "production"
    webhookId: string
    autoCapture: boolean
    loginEnabled: boolean
    loginCallbackUrl: string
  }
  google: {
    enabled: boolean
    clientId: string
    encryptedSecret: string
    secretHint: string
    callbackUrl: string
  }
  tracking: {
    enabled: boolean
    encryptedApiKey: string
    apiKeyHint: string
  }
}

export type PublicVibeyaIntegrationsConfig = {
  brevo: Omit<VibeyaIntegrationsConfig["brevo"], "encryptedKey"> & { hasKey: boolean }
  turnstile: Omit<VibeyaIntegrationsConfig["turnstile"], "encryptedSecret"> & { hasSecret: boolean }
  paypal: Omit<VibeyaIntegrationsConfig["paypal"], "encryptedSecret"> & { hasSecret: boolean }
  google: Omit<VibeyaIntegrationsConfig["google"], "encryptedSecret"> & { hasSecret: boolean }
  tracking: Omit<VibeyaIntegrationsConfig["tracking"], "encryptedApiKey"> & { hasApiKey: boolean }
}

function encryptionKey(): Buffer {
  const rootSecret = process.env.JWT_SECRET || process.env.COOKIE_SECRET
  if (!rootSecret) throw new MedusaError(MedusaError.Types.INVALID_DATA, "后台缺少安全加密密钥，无法保存服务密钥。")
  return createHash("sha256").update(`vibeya-integrations:${rootSecret}`).digest()
}

export function encryptIntegrationSecret(secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function decryptIntegrationSecret(encrypted: string): string {
  const [iv, tag, ciphertext] = encrypted.split(".")
  if (!iv || !tag || !ciphertext) throw new MedusaError(MedusaError.Types.INVALID_DATA, "保存的服务密钥无法读取，请重新填写。")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8")
}

export function emptyVibeyaIntegrationsConfig(): VibeyaIntegrationsConfig {
  return {
    brevo: { enabled: false, host: "smtp-relay.brevo.com", port: 587, login: "", encryptedKey: "", keyHint: "", fromEmail: "", fromName: "VIBEYA" },
    turnstile: { enabled: false, siteKey: "", encryptedSecret: "", secretHint: "" },
    paypal: { enabled: false, clientId: "", encryptedSecret: "", secretHint: "", environment: "sandbox", webhookId: "", autoCapture: true, loginEnabled: false, loginCallbackUrl: "http://localhost:8000/us/auth/paypal/callback" },
    google: { enabled: false, clientId: "", encryptedSecret: "", secretHint: "", callbackUrl: "" },
    tracking: { enabled: false, encryptedApiKey: "", apiKeyHint: "" },
  }
}

export function readVibeyaIntegrationsConfig(value: unknown): VibeyaIntegrationsConfig {
  const defaults = emptyVibeyaIntegrationsConfig()
  if (!value || typeof value !== "object") return defaults
  const saved = value as Partial<VibeyaIntegrationsConfig>
  return {
    brevo: { ...defaults.brevo, ...(saved.brevo ?? {}) },
    turnstile: { ...defaults.turnstile, ...(saved.turnstile ?? {}) },
    paypal: { ...defaults.paypal, ...(saved.paypal ?? {}) },
    google: { ...defaults.google, ...(saved.google ?? {}) },
    tracking: { ...defaults.tracking, ...(saved.tracking ?? {}) },
  }
}

export function toPublicVibeyaIntegrationsConfig(config: VibeyaIntegrationsConfig): PublicVibeyaIntegrationsConfig {
  const { encryptedKey, ...brevo } = config.brevo
  const { encryptedSecret: turnstileSecret, ...turnstile } = config.turnstile
  const { encryptedSecret: paypalSecret, ...paypal } = config.paypal
  const { encryptedSecret: googleSecret, ...google } = config.google
  const { encryptedApiKey, ...tracking } = config.tracking
  return {
    brevo: { ...brevo, hasKey: Boolean(encryptedKey) },
    turnstile: { ...turnstile, hasSecret: Boolean(turnstileSecret) },
    paypal: { ...paypal, hasSecret: Boolean(paypalSecret) },
    google: { ...google, hasSecret: Boolean(googleSecret) },
    tracking: { ...tracking, hasApiKey: Boolean(encryptedApiKey) },
  }
}

