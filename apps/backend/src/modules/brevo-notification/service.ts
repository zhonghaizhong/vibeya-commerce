import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  Logger,
  NotificationTypes,
} from "@medusajs/framework/types"
import nodemailer, { type Transporter } from "nodemailer"

type InjectedDependencies = {
  logger: Logger
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
  protected transporter_: Transporter
  protected from_: string

  constructor(
    { logger }: InjectedDependencies,
    options: BrevoNotificationOptions
  ) {
    super()
    this.logger_ = logger
    this.from_ = options.fromName
      ? `"${options.fromName.replaceAll('"', "")}" <${options.fromEmail}>`
      : options.fromEmail
    this.transporter_ = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.port === 465,
      requireTLS: options.port === 587,
      auth: {
        user: options.login,
        pass: options.key,
      },
    })
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
      const result = await this.transporter_.sendMail({
        from: notification.from?.trim() || this.from_,
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
