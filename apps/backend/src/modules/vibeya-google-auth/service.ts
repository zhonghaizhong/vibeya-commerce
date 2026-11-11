import { GoogleAuthService } from "@medusajs/auth-google/dist/services/google"
import type { AuthenticationInput, AuthIdentityProviderService, GoogleAuthProviderOptions, Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { decryptIntegrationSecret, readVibeyaIntegrationsConfig, VIBEYA_INTEGRATIONS_METADATA_KEY } from "../../lib/vibeya-integrations"

type StoreQuery = {
  graph: (query: { entity: string; fields: string[] }) => Promise<{ data: Array<{ metadata?: Record<string, unknown> | null }> }>
}

type Dependencies = { logger: Logger; query: StoreQuery }

class VibeyaGoogleAuthService extends GoogleAuthService {
  static validateOptions(_options: GoogleAuthProviderOptions): void {}

  protected query_: StoreQuery

  constructor({ logger, query }: Dependencies, options: GoogleAuthProviderOptions) {
    super({ logger }, {
      clientId: options.clientId || "not-configured",
      clientSecret: options.clientSecret || "not-configured",
      callbackUrl: options.callbackUrl || "http://localhost:8000/us/auth/google/callback",
    })
    this.query_ = query
  }

  private async refreshGoogleSettings() {
    const { data } = await this.query_.graph({ entity: "store", fields: ["metadata"] })
    const raw = data[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY]
    const hasSavedSettings = Boolean(raw && typeof raw === "object")
    const config = readVibeyaIntegrationsConfig(raw)
    if (hasSavedSettings) {
      if (!config.google.enabled || !config.google.clientId || !config.google.encryptedSecret || !config.google.callbackUrl) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Google 登录尚未在后台启用或配置完整。")
      }
      this.config_ = {
        clientId: config.google.clientId,
        clientSecret: decryptIntegrationSecret(config.google.encryptedSecret),
        callbackUrl: config.google.callbackUrl,
      }
      return
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || ""
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ""
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || ""
    if (!clientId || !clientSecret || !callbackUrl) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Google 登录尚未在后台启用或配置完整。")
    }
    this.config_ = { clientId, clientSecret, callbackUrl }
  }

  async authenticate(req: AuthenticationInput, authIdentityService: AuthIdentityProviderService) {
    await this.refreshGoogleSettings()
    return super.authenticate(req, authIdentityService)
  }

  async validateCallback(req: AuthenticationInput, authIdentityService: AuthIdentityProviderService) {
    await this.refreshGoogleSettings()
    return super.validateCallback(req, authIdentityService)
  }
}

export default VibeyaGoogleAuthService
