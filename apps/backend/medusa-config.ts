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
  { resolve: "./src/modules/vibeya-ai-jobs" },
]

module.exports = defineConfig({
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
      authMethodsPerActor: hasGoogleCredentials
        ? { user: ["emailpass"], customer: ["emailpass", "google"] }
        : undefined,
    }
  },
  modules,
})
