#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${VIBEYA_APP_DIR:-/opt/vibeya}"
cd "$APP_DIR"
ENV_FILE="$APP_DIR/deploy/production/.env.production"
COMPOSE_FILE="$APP_DIR/deploy/production/compose.yml"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production environment file: $ENV_FILE" >&2
  exit 1
fi

compose=(docker compose --project-name vibeya --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
"${compose[@]}" up -d postgres redis
"${compose[@]}" build backend
"${compose[@]}" run --rm backend pnpm exec medusa db:migrate

for script in \
  hide-generic-demo-products \
  seed-vibeya-home-products \
  seed-vibeya-long-sleeve \
  seed-vibeya-washed-hoodie \
  seed-vibeya-moonlit-tumbler \
  configure-vibeya-us-market \
  publish-vibeya-long-sleeve \
  publish-vibeya-washed-hoodie \
  publish-vibeya-moonlit-tumbler; do
  "${compose[@]}" run --rm backend pnpm exec medusa exec "./src/scripts/${script}.ts"
done

key_output="$("${compose[@]}" run --rm backend pnpm exec medusa exec ./src/scripts/create-production-publishable-key.ts 2>&1)"
publishable_key="$(printf '%s\n' "$key_output" | sed -n 's/.*PRODUCTION_PUBLISHABLE_KEY=\([^[:space:]]*\).*/\1/p' | tail -n 1)"
if [[ -z "$publishable_key" ]]; then
  echo "Could not obtain a publishable key. Medusa output follows:" >&2
  printf '%s\n' "$key_output" >&2
  exit 1
fi

if grep -q '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' "$ENV_FILE"; then
  sed -i "s|^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${publishable_key}|" "$ENV_FILE"
else
  printf '\nNEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=%s\n' "$publishable_key" >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
"${compose[@]}" up -d --build backend storefront

install -d -m 0755 /var/lib/vibeya
git rev-parse HEAD > /var/lib/vibeya/deployed-revision
echo "Initial VIBEYA deployment is running. Add DNS and configure Caddy after reviewing the site."
