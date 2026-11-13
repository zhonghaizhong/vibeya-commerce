import type { AuthenticationInput, AuthenticationResponse, AuthIdentityProviderService, Logger } from "@medusajs/framework/types"
import { AbstractAuthModuleProvider, MedusaError } from "@medusajs/framework/utils"
import { randomBytes } from "node:crypto"
import { decryptIntegrationSecret, readVibeyaIntegrationsConfig, VIBEYA_INTEGRATIONS_METADATA_KEY } from "../../lib/vibeya-integrations"

type StoreQuery = {
  graph: (query: { entity: string; fields: string[] }) => Promise<{ data: Array<{ metadata?: Record<string, unknown> | null }> }>
}

type Dependencies = { logger: Logger; query: StoreQuery }
type ProviderOptions = { clientId?: string; clientSecret?: string; callbackUrl?: string; environment?: string }

class VibeyaPayPalAuthService extends AbstractAuthModuleProvider {
  static identifier = "paypal"
  static DISPLAY_NAME = "PayPal Authentication"

  protected logger_: Logger
  protected query_: StoreQuery
  protected config_: { clientId: string; clientSecret: string; callbackUrl: string; environment: "sandbox" | "production" }
  protected fallback_: ProviderOptions

  static validateOptions(_options: ProviderOptions): void {}

  constructor({ logger, query }: Dependencies, options: ProviderOptions) {
    super()
    this.logger_ = logger
    this.query_ = query
    this.fallback_ = options
    this.config_ = { clientId: "", clientSecret: "", callbackUrl: "", environment: "sandbox" }
  }

  private async refreshSettings() {
    const { data } = await this.query_.graph({ entity: "store", fields: ["metadata"] })
    const raw = data[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY]
    const hasSavedSettings = Boolean(raw && typeof raw === "object")
    const config = readVibeyaIntegrationsConfig(raw)

    if (hasSavedSettings) {
      if (!config.paypal.loginEnabled || !config.paypal.clientId || !config.paypal.encryptedSecret || !config.paypal.loginCallbackUrl) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "PayPal 登录尚未在后台启用或配置完整。")
      }
      this.config_ = {
        clientId: config.paypal.clientId,
        clientSecret: decryptIntegrationSecret(config.paypal.encryptedSecret),
        callbackUrl: config.paypal.loginCallbackUrl,
        environment: config.paypal.environment,
      }
      return
    }

    const clientId = this.fallback_.clientId || process.env.PAYPAL_CLIENT_ID || ""
    const clientSecret = this.fallback_.clientSecret || process.env.PAYPAL_CLIENT_SECRET || ""
    const callbackUrl = this.fallback_.callbackUrl || process.env.PAYPAL_LOGIN_CALLBACK_URL || ""
    if (process.env.PAYPAL_LOGIN_ENABLED !== "true" || !clientId || !clientSecret || !callbackUrl) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "PayPal 登录尚未在后台启用或配置完整。")
    }
    this.config_ = {
      clientId,
      clientSecret,
      callbackUrl,
      environment: (this.fallback_.environment || process.env.PAYPAL_ENVIRONMENT) === "production" ? "production" : "sandbox",
    }
  }

  async register(_input: AuthenticationInput): Promise<AuthenticationResponse> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "PayPal 不支持密码注册，请使用 authenticate 登录。")
  }

  async authenticate(req: AuthenticationInput, authIdentityService: AuthIdentityProviderService): Promise<AuthenticationResponse> {
    await this.refreshSettings()
    const query = req.query ?? {}
    if (query.error) return { success: false, error: String(query.error_description || query.error) }

    const body = req.body ?? {}
    const callbackUrl = body.callback_url || this.config_.callbackUrl
    if (callbackUrl !== this.config_.callbackUrl) {
      return { success: false, error: "PayPal 登录回调地址必须与后台登记的地址完全一致。" }
    }

    const stateKey = randomBytes(32).toString("hex")
    await authIdentityService.setState(stateKey, { callback_url: callbackUrl })

    const host = this.config_.environment === "sandbox" ? "https://www.sandbox.paypal.com" : "https://www.paypal.com"
    const authorizationUrl = new URL(`${host}/connect`)
    authorizationUrl.searchParams.set("flowEntry", "static")
    authorizationUrl.searchParams.set("client_id", this.config_.clientId)
    authorizationUrl.searchParams.set("response_type", "code")
    authorizationUrl.searchParams.set("scope", "openid email profile address https://uri.paypal.com/services/paypalattributes")
    authorizationUrl.searchParams.set("redirect_uri", callbackUrl)
    authorizationUrl.searchParams.set("state", stateKey)
    return { success: true, location: authorizationUrl.toString() }
  }

  async validateCallback(req: AuthenticationInput, authIdentityService: AuthIdentityProviderService): Promise<AuthenticationResponse> {
    await this.refreshSettings()
    const query = req.query ?? {}
    if (query.error) return { success: false, error: String(query.error_description || query.error) }

    const code = query.code || req.body?.code
    const stateKey = query.state
    if (!code || !stateKey) return { success: false, error: "PayPal 没有返回有效的授权信息。" }

    const state = await authIdentityService.getState(String(stateKey))
    if (!state || state.callback_url !== this.config_.callbackUrl) {
      return { success: false, error: "PayPal 登录状态已过期，或回调地址不匹配，请重新尝试。" }
    }

    const apiHost = this.config_.environment === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"
    try {
      const tokenResponse = await fetch(`${apiHost}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config_.clientId}:${this.config_.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code: String(code) }),
      })
      const tokenPayload = await tokenResponse.json() as { access_token?: string; error_description?: string }
      if (!tokenResponse.ok || !tokenPayload.access_token) {
        throw new Error(tokenPayload.error_description || "PayPal authorization code could not be exchanged.")
      }

      const userInfoResponse = await fetch(`${apiHost}/v1/identity/openidconnect/userinfo?schema=openid`, {
        headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
      })
      const userInfo = await userInfoResponse.json() as {
        user_id?: string
        sub?: string
        email?: string
        email_verified?: boolean
        name?: string
        given_name?: string
        family_name?: string
        address?: {
          street_address?: string
          locality?: string
          region?: string
          postal_code?: string
          country?: string
        }
      }
      if (!userInfoResponse.ok) throw new Error("PayPal did not return account information. Check that Log in with PayPal is enabled for this app.")
      if (!userInfo.email || userInfo.email_verified !== true) {
        throw new Error("PayPal must return a verified email address to sign in.")
      }

      const entity_id = userInfo.user_id || userInfo.sub
      if (!entity_id) throw new Error("PayPal did not return a stable account identifier.")

      const paypalAddress = userInfo.address
      const country = paypalAddress?.country?.trim().toLowerCase()
      const shippingAddress = paypalAddress && ["us", "usa", "united states", "united states of america"].includes(country || "")
        ? {
            address_1: paypalAddress.street_address?.trim().slice(0, 255) || "",
            city: paypalAddress.locality?.trim().slice(0, 100) || "",
            province: paypalAddress.region?.trim().slice(0, 100) || "",
            postal_code: paypalAddress.postal_code?.trim().slice(0, 30) || "",
            country_code: "us",
          }
        : null
      const userMetadata = {
        email: userInfo.email,
        name: userInfo.name,
        first_name: userInfo.given_name,
        last_name: userInfo.family_name,
        paypal_shipping_address: shippingAddress,
      }

      let authIdentity
      try {
        authIdentity = await authIdentityService.retrieve({ entity_id })
        authIdentity = await authIdentityService.update(entity_id, {
          user_metadata: { ...authIdentity.user_metadata, ...userMetadata },
        })
      } catch (error) {
        if (error instanceof MedusaError && error.type !== MedusaError.Types.NOT_FOUND) throw error
        authIdentity = await authIdentityService.create({
          entity_id,
          user_metadata: userMetadata,
        })
      }
      return { success: true, authIdentity }
    } catch (error) {
      const message = error instanceof Error ? error.message : "PayPal sign-in could not finish."
      this.logger_.error(`PayPal sign-in failed: ${message}`)
      return { success: false, error: message }
    }
  }
}

export default VibeyaPayPalAuthService
