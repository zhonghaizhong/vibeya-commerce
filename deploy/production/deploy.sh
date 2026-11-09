#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${VIBEYA_APP_DIR:-/opt/vibeya}"
COMPOSE_FILE="$APP_DIR/deploy/production/compose.yml"
ENV_FILE="$APP_DIR/deploy/production/.env.production"
STATE_DIR="/var/lib/vibeya"
DEPLOYED_REVISION_FILE="$STATE_DIR/deployed-revision"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production environment file: $ENV_FILE" >&2
  exit 1
fi

cd "$APP_DIR"
git fetch --prune origin main
target_revision="$(git rev-parse origin/main)"
deployed_revision="$(cat "$DEPLOYED_REVISION_FILE" 2>/dev/null || true)"

if [[ "$target_revision" == "$deployed_revision" ]]; then
  exit 0
fi

git checkout --detach "$target_revision"
compose=(docker compose --project-name vibeya --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
if [[ -f "$APP_DIR/deploy/production/.public-enabled" ]]; then
  compose+=(--profile public)
fi

COMPOSE_PARALLEL_LIMIT=1 "${compose[@]}" build backend storefront
"${compose[@]}" run --rm backend pnpm exec medusa db:migrate
"${compose[@]}" up -d --remove-orphans

for attempt in $(seq 1 60); do
  backend_id="$("${compose[@]}" ps -q backend)"
  storefront_id="$("${compose[@]}" ps -q storefront)"
  backend_status="$(docker inspect --format '{{.State.Health.Status}}' "$backend_id" 2>/dev/null || true)"
  storefront_status="$(docker inspect --format '{{.State.Health.Status}}' "$storefront_id" 2>/dev/null || true)"
  if [[ "$backend_status" == "healthy" && "$storefront_status" == "healthy" ]]; then
    install -d -m 0755 "$STATE_DIR"
    printf '%s\n' "$target_revision" > "$DEPLOYED_REVISION_FILE"
    echo "Deployment healthy at $target_revision"
    exit 0
  fi
  sleep 5
done

echo "Deployment did not become healthy. Inspect container logs before retrying." >&2
"${compose[@]}" ps
exit 1
