import { authenticate, configureStoreSearch, defineMiddlewares } from '@medusajs/framework/http'

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ['GET', 'POST'],
      matcher: '/store/vibeya/ai/jobs',
      bodyParser: { sizeLimit: '600kb' },
      middlewares: [authenticate('customer', ['session', 'bearer'])],
    },
    {
      method: ["POST"],
      matcher: "/store/vibeya/ai/generate",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      method: ["POST"],
      matcher: "/store/vibeya/cart/line-items",
      bodyParser: { sizeLimit: "2mb" },
    },
    {
      method: ['GET', 'POST', 'DELETE'],
      matcher: '/store/vibeya/ai/jobs/:id',
      middlewares: [authenticate('customer', ['session', 'bearer'])],
    },
  ],
})
