import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

type VerificationRequestedData = {
  entity_id: string
  entity_type: string
  code: string
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[character]
  })

export default async function sendCustomerEmailVerification({
  event: { data },
  container,
}: SubscriberArgs<VerificationRequestedData>) {
  if (data.entity_type !== "email") {
    return
  }

  const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const storefrontUrl = config.admin.storefrontUrl || "http://localhost:8000"
  const verificationUrl = new URL("/us/verify-account", storefrontUrl)
  verificationUrl.searchParams.set("token", data.code)
  const safeUrl = escapeHtml(verificationUrl.toString())

  await notificationService.createNotifications({
    to: data.entity_id,
    channel: "email",
    template: "customer-email-verification",
    content: {
      subject: "Verify your VIBEYA account",
      text: `Confirm your email to finish creating your VIBEYA account: ${verificationUrl.toString()}`,
      html: `<!doctype html><html><body style="margin:0;background:#f7f3ff;font-family:Arial,sans-serif;color:#211331"><main style="max-width:520px;margin:40px auto;padding:36px 28px;background:#fff;border:1px solid #eadcff;border-radius:18px"><p style="font-size:24px;font-weight:700;letter-spacing:1px">VIBEYA</p><h1 style="font-size:24px">Verify your email</h1><p>Confirm your email address to finish creating your account.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#d7ff29;color:#211331;text-decoration:none;font-weight:700">Verify email</a></p><p style="font-size:13px;color:#655a70">If you didn't create a VIBEYA account, you can ignore this email.</p></main></body></html>`,
    },
  })
}

export const config: SubscriberConfig = {
  event: "auth.verification_requested",
}
