import { ContainerRegistrationKeys, Modules, loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const paymentModules = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
  ? [{
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [{
          resolve: "./src/modules/paypal",
          id: "paypal",
          options: {
            client_id: process.env.PAYPAL_CLIENT_ID,
            client_secret: process.env.PAYPAL_CLIENT_SECRET,
            environment: process.env.PAYPAL_ENVIRONMENT || "sandbox",
            autoCapture: process.env.PAYPAL_AUTO_CAPTURE !== "false",
            webhook_id: process.env.PAYPAL_WEBHOOK_ID,
          },
        }],
      },
    }]
  : undefined

const hasGoogleCredentials = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
)

const googleAuthModules = hasGoogleCredentials
  ? [{
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: [
          { resolve: "@medusajs/medusa/auth-emailpass", id: "emailpass" },
          {
            resolve: "@medusajs/medusa/auth-google",
            id: "google",
            options: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackUrl: process.env.GOOGLE_CALLBACK_URL,
            },
          },
        ],
      },
    }]
  : undefined

const hasBrevoSmtpCredentials = Boolean(
  process.env.BREVO_SMTP_LOGIN &&
    process.env.BREVO_SMTP_KEY &&
    process.env.BREVO_FROM_EMAIL
)

const notificationModules = hasBrevoSmtpCredentials
  ? [{
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/brevo-notification",
            id: "brevo",
            options: {
              channels: ["email"],
              host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
              port: Number(process.env.BREVO_SMTP_PORT || 587),
              login: process.env.BREVO_SMTP_LOGIN,
              key: process.env.BREVO_SMTP_KEY,
              fromEmail: process.env.BREVO_FROM_EMAIL,
              fromName: process.env.BREVO_FROM_NAME || "VIBEYA",
            },
          },
        ],
      },
    }]
  : undefined

const emailVerificationConfig = hasBrevoSmtpCredentials
  ? {
      customer: [{ entity_type: "email", auth_provider: "emailpass" }],
    }
  : undefined

const modules = [
  ...(process.env.REDIS_URL
    ? [
        {
          resolve: "@medusajs/medusa/cache-redis",
          options: { redisUrl: process.env.REDIS_URL },
        },
        {
          resolve: "@medusajs/medusa/event-bus-redis",
          options: { redisUrl: process.env.REDIS_URL },
        },
        {
          resolve: "@medusajs/medusa/workflow-engine-redis",
          options: { redis: { redisUrl: process.env.REDIS_URL } },
        },
        {
          resolve: "@medusajs/medusa/locking",
          options: {
            providers: [
              {
                resolve: "@medusajs/medusa/locking-redis",
                id: "locking-redis",
                is_default: true,
                options: { redisUrl: process.env.REDIS_URL },
              },
            ],
          },
        },
      ]
    : []),
  ...(paymentModules ?? []),
  ...(googleAuthModules ?? []),
  ...(notificationModules ?? []),
  { resolve: "./src/modules/vibeya-ai-jobs" },
]

module.exports = defineConfig({
  admin: {
    storefrontUrl: process.env.STOREFRONT_URL || "http://localhost:8000",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
      cookieSecret: process.env.COOKIE_SECRET,
      authVerificationsPerActor: emailVerificationConfig,
      authMethodsPerActor: hasGoogleCredentials
        ? { user: ["emailpass"], customer: ["emailpass", "google"] }
        : undefined,
    }
  },
  modules,
})
