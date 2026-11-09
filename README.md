# VIBEYA Commerce

VIBEYA is a custom apparel and home-goods storefront built on Medusa 2 and Next.js. It includes the branded shopping experience, AI-assisted design studio, customer accounts, and commerce integrations.

## Project layout

- `apps/backend` — Medusa backend, admin extensions, AI design jobs, and payment providers.
- `apps/storefront` — Next.js storefront and customer account flows.
- `apps/storefront/public/vibeya` — VIBEYA product, inspiration, and design-studio pages and media.

## Local development

Requirements: Node.js 22 or newer, pnpm, PostgreSQL, and Redis.

1. Install dependencies with `pnpm install`.
2. Copy `apps/backend/.env.template` to `apps/backend/.env` and `apps/storefront/.env.template` to `apps/storefront/.env`.
3. Set the local database, storefront, and Medusa keys. Add provider credentials only when configuring Google sign-in, PayPal, or image generation.
4. Start the backend with `pnpm backend:dev` and the storefront with `pnpm storefront:dev`.

Provider integrations require valid credentials and matching callback URLs. Verify the complete checkout and order flow in the target environment before accepting live orders. Keep `.env` files and provider secrets out of Git.
