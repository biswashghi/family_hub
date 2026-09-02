#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: FAMILY_DOMAIN=family.example.com FAMILY_HUB_IMAGE=ghcr.io/owner/repo/family-hub@sha256:... $0 <deploy-user> <server-ip> [repo-url] [branch]"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then usage; exit 0; fi
if [[ $# -lt 2 || $# -gt 4 ]]; then usage >&2; exit 1; fi

DEPLOY_USER="$1"
SERVER_IP="$2"
APP_DOMAIN="${FAMILY_DOMAIN:-${APP_DOMAIN:-}}"
IMAGE="${FAMILY_HUB_IMAGE:-}"
VERIFY_PUBLIC_DEPLOYMENT="${VERIFY_PUBLIC_DEPLOYMENT:-1}"

[[ "$APP_DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo "FAMILY_DOMAIN must be a valid DNS name." >&2; exit 1; }
[[ "$IMAGE" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || { echo "FAMILY_HUB_IMAGE must be an immutable GHCR digest." >&2; exit 1; }
[[ "$VERIFY_PUBLIC_DEPLOYMENT" =~ ^[01]$ ]] || { echo "VERIFY_PUBLIC_DEPLOYMENT must be 0 or 1." >&2; exit 1; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
scp -q "$ROOT_DIR/compose.yml" "${DEPLOY_USER}@${SERVER_IP}:/tmp/family-hub-compose.yml"
scp -q "$ROOT_DIR/compose.production.yml" "${DEPLOY_USER}@${SERVER_IP}:/tmp/family-hub-compose.production.yml"

ENV_PAYLOAD_BASE64="$({
  printf '%s\n' \
    "FAMILY_HUB_IMAGE=${IMAGE}" \
    "NODE_ENV=production" \
    "FAMILY_HUB_TIME_ZONE=${FAMILY_HUB_TIME_ZONE:-America/Detroit}" \
    "FAMILY_HUB_LOCATION_LABEL=${FAMILY_HUB_LOCATION_LABEL:-Detroit, MI}" \
    "FAMILY_HUB_WEATHER_LATITUDE=${FAMILY_HUB_WEATHER_LATITUDE:-42.3314}" \
    "FAMILY_HUB_WEATHER_LONGITUDE=${FAMILY_HUB_WEATHER_LONGITUDE:--83.0458}" \
    "FAMILY_HUB_SEED_DEMO_DATA=0"
} | base64 | tr -d '\n')"

ssh "${DEPLOY_USER}@${SERVER_IP}" \
  APP_DOMAIN="$APP_DOMAIN" VERIFY_PUBLIC_DEPLOYMENT="$VERIFY_PUBLIC_DEPLOYMENT" \
  ENV_PAYLOAD_BASE64="$ENV_PAYLOAD_BASE64" 'bash -s' <<'REMOTE'
set -euo pipefail

APP_DIR=/opt/family-hub
ENV_FILE=/etc/family-hub/app.env
compose() { sudo docker compose -p family-hub --env-file "$ENV_FILE" -f "$APP_DIR/compose.yml" -f "$APP_DIR/compose.production.yml" "$@"; }

exec 9>/tmp/vps-deploy-family-hub.lock
flock 9
sudo /usr/local/bin/vps-platform-check

PREVIOUS_IMAGE="$(sudo sed -n 's/^FAMILY_HUB_IMAGE=//p' "$ENV_FILE" 2>/dev/null || true)"
sudo install -d -m 0755 "$APP_DIR"
sudo install -m 0644 /tmp/family-hub-compose.yml "$APP_DIR/compose.yml"
sudo install -m 0644 /tmp/family-hub-compose.production.yml "$APP_DIR/compose.production.yml"
sudo install -d -m 0750 /etc/family-hub
printf '%s' "$ENV_PAYLOAD_BASE64" | base64 -d | sudo tee "$ENV_FILE" >/dev/null
sudo chmod 0600 "$ENV_FILE"

rollback() {
  [[ -n "$PREVIOUS_IMAGE" ]] || return 0
  echo "Rolling Family Hub back to ${PREVIOUS_IMAGE}." >&2
  sudo sed -i "s#^FAMILY_HUB_IMAGE=.*#FAMILY_HUB_IMAGE=${PREVIOUS_IMAGE}#" "$ENV_FILE"
  compose pull family-hub || true
  compose up -d --no-build family-hub || true
}

compose pull family-hub
if ! compose up -d --no-build family-hub; then
  compose logs --tail=80 family-hub >&2 || true
  rollback
  exit 1
fi
for attempt in $(seq 1 30); do
  if compose exec -T family-hub node -e "fetch('http://127.0.0.1:8788/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then break; fi
  if [[ "$attempt" -eq 30 ]]; then compose logs --tail=80 family-hub >&2; rollback; exit 1; fi
  sleep 2
done

cat <<CADDY | sudo /usr/local/bin/vps-route family-hub
${APP_DOMAIN} {
  encode zstd gzip
  reverse_proxy family-hub:8788
}
CADDY

if [[ "$VERIFY_PUBLIC_DEPLOYMENT" == "1" ]] && ! curl -fsS --retry 6 --retry-delay 5 "https://${APP_DOMAIN}/api/health" >/dev/null; then
  rollback
  exit 1
fi
compose ps
echo "Family Hub deployed from an immutable image."
REMOTE
