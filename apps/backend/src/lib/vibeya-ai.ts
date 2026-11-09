import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

export const VIBEYA_AI_METADATA_KEY = "vibeya_ai_config"

export type VibeyaAIConfig = {
  baseUrl: string
  model: string
  aspectRatio: string
  quality: "auto" | "low" | "medium" | "high" | "xhigh" | "max"
  encryptedApiKey: string
  apiKeyHint: string
}

export const VIBEYA_AI_MODELS = [
  "gpt-image-2",
  "gpt-image-2-vip",
  "gpt-image-2.5",
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst",
  "gpt-image-2.6",
  "gpt-image-2.6-flare",
  "gpt-image-2.6-sunburst",
] as const

export const VIBEYA_AI_NODES = [
  "https://grsaiapi.com",
  "https://grsai.dakka.com.cn",
] as const

export const VIBEYA_AI_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const
export const VIBEYA_AI_PIXEL_SIZES = ["1024x1024", "2048x2048", "2880x2880", "1024x1536", "1536x1024"] as const

export function modelUsesPixelSizes(model: string): boolean {
  return ["gpt-image-2-vip", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2.6-flare", "gpt-image-2.6-sunburst"].includes(model)
}

export function isValidAIAspectRatio(model: string, aspectRatio: string): boolean {
  return modelUsesPixelSizes(model)
    ? VIBEYA_AI_PIXEL_SIZES.includes(aspectRatio as typeof VIBEYA_AI_PIXEL_SIZES[number])
    : VIBEYA_AI_ASPECT_RATIOS.includes(aspectRatio as typeof VIBEYA_AI_ASPECT_RATIOS[number])
}

export function isValidAIQuality(model: string, quality: string): boolean {
  if (model === "gpt-image-2.5-sunburst") return ["auto", "low", "medium", "high", "xhigh", "max"].includes(quality)
  if (["gpt-image-2-vip", "gpt-image-2.5-flare", "gpt-image-2.6-flare", "gpt-image-2.6-sunburst"].includes(model)) return ["auto", "low", "medium", "high"].includes(quality)
  return quality === "auto"
}

export type PublicVibeyaAIConfig = Pick<VibeyaAIConfig, "baseUrl" | "model" | "aspectRatio" | "quality"> & {
  hasApiKey: boolean
  apiKeyHint: string
}

export function validateAIBaseUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().replace(/\/+$/, "")
  // Accept the earlier typo so existing settings stay readable, but always
  // route requests to GrsAI's documented global host.
  if (normalized === "https://grsaapi.com") return "https://grsaiapi.com"
  return VIBEYA_AI_NODES.includes(normalized as typeof VIBEYA_AI_NODES[number]) ? normalized : null
}

function encryptionKey(): Buffer {
  const rootSecret = process.env.JWT_SECRET || process.env.COOKIE_SECRET
  if (!rootSecret) {
    throw new Error("后台缺少安全加密密钥。请先在服务端设置 JWT_SECRET 或 COOKIE_SECRET。")
  }
  return createHash("sha256").update(`vibeya-ai:${rootSecret}`).digest()
}

export function encryptAISecret(secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".")
}

export function decryptAISecret(encrypted: string): string {
  const [ivPart, tagPart, dataPart] = encrypted.split(".")
  if (!ivPart || !tagPart || !dataPart) throw new Error("AI 密钥配置无法读取，请重新保存密钥。")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"))
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function toPublicAIConfig(config: Partial<VibeyaAIConfig> | null | undefined): PublicVibeyaAIConfig {
  return {
    baseUrl: validateAIBaseUrl(config?.baseUrl) || "https://grsai.dakka.com.cn",
    model: config?.model || "gpt-image-2.5",
    aspectRatio: config?.aspectRatio || "1:1",
    quality: config?.quality || "auto",
    hasApiKey: Boolean(config?.encryptedApiKey),
    apiKeyHint: config?.apiKeyHint || "",
  }
}

export function isVibeyaAIConfig(value: unknown): value is VibeyaAIConfig {
  if (!value || typeof value !== "object") return false
  const config = value as Partial<VibeyaAIConfig>
  const model = config.model
  const aspectRatio = config.aspectRatio
  return Boolean(
    validateAIBaseUrl(config.baseUrl) &&
    typeof model === "string" && VIBEYA_AI_MODELS.includes(model as typeof VIBEYA_AI_MODELS[number]) &&
    typeof aspectRatio === "string" &&
    (VIBEYA_AI_ASPECT_RATIOS.includes(aspectRatio as typeof VIBEYA_AI_ASPECT_RATIOS[number]) ||
      VIBEYA_AI_PIXEL_SIZES.includes(aspectRatio as typeof VIBEYA_AI_PIXEL_SIZES[number])) &&
    isValidAIAspectRatio(model, aspectRatio) &&
    isValidAIQuality(model, config.quality || "") &&
    typeof config.encryptedApiKey === "string"
  )
}
