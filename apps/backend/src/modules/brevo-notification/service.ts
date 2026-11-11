import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  Logger,
  NotificationTypes,
} from "@medusajs/framework/types"
import nodemailer from "nodemailer"
import { decryptIntegrationSecret, readVibeyaIntegrationsConfig, VIBEYA_INTEGRATIONS_METADATA_KEY } from "../../lib/vibeya-integrations"

type StoreQuery = {
  graph: (query: { entity: string; fields: string[] }) => Promise<{ data: Array<{ metadata?: Record<string, unknown> | null }> }>
}

type InjectedDependencies = {
  logger: Logger
  query: StoreQuery
}

type BrevoNotificationOptions = {
  host: string
  port: number
  login: string
  key: string
  fromEmail: string
  fromName?: string
}

class BrevoNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "brevo-notification"

  protected logger_: Logger
  protected query_: StoreQuery
  protected options_: BrevoNotificationOptions

  constructor(
    { logger, query }: InjectedDependencies,
    options: BrevoNotificationOptions
  ) {
    super()
    this.logger_ = logger
    this.query_ = query
    this.options_ = options
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification?.to || !notification.content?.subject) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brevo email notifications require a recipient and subject"
      )
    }

    try {
      const { data } = await this.query_.graph({ entity: "store", fields: ["metadata"] })
      const rawConfig = data[0]?.metadata?.[VIBEYA_INTEGRATIONS_METADATA_KEY]
      const hasSavedConfig = Boolean(rawConfig && typeof rawConfig === "object")
      const config = readVibeyaIntegrationsConfig(rawConfig)
      const smtp = config.brevo.enabled
        ? {
            host: config.brevo.host,
            port: config.brevo.port,
            login: config.brevo.login,
            key: config.brevo.encryptedKey ? decryptIntegrationSecret(config.brevo.encryptedKey) : "",
            fromEmail: config.brevo.fromEmail,
            fromName: config.brevo.fromName,
          }
        : !hasSavedConfig
          ? {
              host: this.options_.host,
              port: this.options_.port,
              login: this.options_.login,
              key: this.options_.key,
              fromEmail: this.options_.fromEmail,
              fromName: this.options_.fromName || "VIBEYA",
            }
          : null
      if (!smtp?.login || !smtp.key || !smtp.fromEmail) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "Brevo 邮件服务尚未在后台启用或配置完整。")
      }
      const from = notification.from?.trim() || (smtp.fromName
        ? `"${smtp.fromName.replaceAll('"', "")}" <${smtp.fromEmail}>`
        : smtp.fromEmail)
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        requireTLS: smtp.port === 587,
        auth: { user: smtp.login, pass: smtp.key },
      })
      const result = await transporter.sendMail({
        from,
        to: notification.to,
        subject: notification.content.subject,
        html: notification.content.html,
        text: notification.content.text,
      })

      return { id: result.messageId }
    } catch (error) {
      this.logger_.error("Brevo SMTP email delivery failed", error)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Failed to send email through Brevo SMTP"
      )
    }
  }
}

export default BrevoNotificationProviderService
