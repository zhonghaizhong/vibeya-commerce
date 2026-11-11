import { ContainerRegistrationKeys, Modules, loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const paymentModules = [{
      resolve: "@medusajs/medusa/payment",
      dependencies: [ContainerRegistrationKeys.QUERY],
      options: {
        providers: [{
          resolve: "./src/modules/paypal",
          id: "paypal",
          options: {
            client_id: process.env.PAYPAL_CLIENT_ID || "",
            client_secret: process.env.PAYPAL_CLIENT_SECRET || "",
            environment: process.env.PAYPAL_ENVIRONMENT || "sandbox",
            autoCapture: process.env.PAYPAL_AUTO_CAPTURE !== "false",
            webhook_id: process.env.PAYPAL_WEBHOOK_ID,
          },
        }],
      },
    }]

const googleAuthModules = [{
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER, ContainerRegistrationKeys.QUERY],
      options: {
        providers: [
          { resolve: "@medusajs/medusa/auth-emailpass", id: "emailpass" },
          {
            resolve: "./src/modules/vibeya-google-auth",
            id: "google",
            options: {
              clientId: process.env.GOOGLE_CLIENT_ID || "",
              clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
              callbackUrl: process.env.GOOGLE_CALLBACK_URL || "",
            },
          },
        ],
      },
    }]

const notificationModules = [{
      resolve: "@medusajs/medusa/notification",
      dependencies: [ContainerRegistrationKeys.QUERY],
      options: {
        providers: [
          {
            resolve: "./src/modules/brevo-notification",
            id: "brevo",
            options: {
              channels: ["email"],
              host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
              port: Number(process.env.BREVO_SMTP_PORT || 587),
              login: process.env.BREVO_SMTP_LOGIN || "",
              key: process.env.BREVO_SMTP_KEY || "",
              fromEmail: process.env.BREVO_FROM_EMAIL || "",
              fromName: process.env.BREVO_FROM_NAME || "VIBEYA",
            },
          },
        ],
      },
    }]

const emailVerificationConfig = {
  customer: [{ entity_type: "email", auth_provider: "emailpass" }],
}

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
  ...paymentModules,
  ...googleAuthModules,
  ...notificationModules,
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
      authMethodsPerActor: { user: ["emailpass"], customer: ["emailpass", "google"] },
    }
  },
  modules,
})
