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
PAYLOAD_FILE="$(mktemp)"
trap 'rm -f "$PAYLOAD_FILE"' EXIT
chmod 0600 "$PAYLOAD_FILE"
printf '%s\n' \
  "FAMILY_HUB_IMAGE=${IMAGE}" \
  "NODE_ENV=production" \
  "FAMILY_HUB_TIME_ZONE=${FAMILY_HUB_TIME_ZONE:-America/Detroit}" \
  "FAMILY_HUB_LOCATION_LABEL=${FAMILY_HUB_LOCATION_LABEL:-Detroit, MI}" \
  "FAMILY_HUB_WEATHER_LATITUDE=${FAMILY_HUB_WEATHER_LATITUDE:-42.3314}" \
  "FAMILY_HUB_WEATHER_LONGITUDE=${FAMILY_HUB_WEATHER_LONGITUDE:--83.0458}" \
  "FAMILY_HUB_SEED_DEMO_DATA=0" >"$PAYLOAD_FILE"

scp -q "$ROOT_DIR/compose.yml" "${DEPLOY_USER}@${SERVER_IP}:/tmp/family-hub-compose.yml"
scp -q "$ROOT_DIR/compose.production.yml" "${DEPLOY_USER}@${SERVER_IP}:/tmp/family-hub-compose.production.yml"
scp -q "$ROOT_DIR/deploy/family-hub.caddy.template" "${DEPLOY_USER}@${SERVER_IP}:/tmp/family-hub.caddy.template"
scp -q "$ROOT_DIR/scripts/remote/deploy-production.sh" "${DEPLOY_USER}@${SERVER_IP}:/tmp/family-hub-deploy-production.sh"
scp -q "$PAYLOAD_FILE" "${DEPLOY_USER}@${SERVER_IP}:/tmp/family-hub-app.env"

ssh "${DEPLOY_USER}@${SERVER_IP}" \
  APP_DOMAIN="$APP_DOMAIN" VERIFY_PUBLIC_DEPLOYMENT="$VERIFY_PUBLIC_DEPLOYMENT" \
  'bash /tmp/family-hub-deploy-production.sh'
