FROM node:22-bookworm-slim

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @dtc/backend build

ENV NODE_ENV=production
EXPOSE 9000

WORKDIR /workspace/apps/backend
CMD ["sh", "-c", "cd /workspace/apps/backend/.medusa/server && pnpm start"]
