#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/family-hub}"
ENV_FILE="${ENV_FILE:-/etc/family-hub/app.env}"
PAYLOAD_FILE="${PAYLOAD_FILE:-/tmp/family-hub-app.env}"
ROUTE_TEMPLATE="${ROUTE_TEMPLATE:-/tmp/family-hub.caddy.template}"
APP_DOMAIN="${APP_DOMAIN:-}"
VERIFY_PUBLIC_DEPLOYMENT="${VERIFY_PUBLIC_DEPLOYMENT:-1}"
PREVIOUS_IMAGE=""

compose() {
  sudo docker compose -p family-hub --env-file "$ENV_FILE" \
    -f "$APP_DIR/compose.yml" -f "$APP_DIR/compose.production.yml" "$@"
}

validate_inputs() {
  [[ "$APP_DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]
  [[ "$VERIFY_PUBLIC_DEPLOYMENT" =~ ^[01]$ ]]
  test -s "$PAYLOAD_FILE"
  test -s "$ROUTE_TEMPLATE"
}

acquire_lock() {
  exec 9>/tmp/vps-deploy-family-hub.lock
  flock 9
  sudo /usr/local/bin/vps-platform-check
}

prepare_release() {
  PREVIOUS_IMAGE="$(sudo sed -n 's/^FAMILY_HUB_IMAGE=//p' "$ENV_FILE" 2>/dev/null || true)"
  sudo install -d -m 0755 "$APP_DIR" "$APP_DIR/scripts"
  sudo install -m 0644 /tmp/family-hub-compose.yml "$APP_DIR/compose.yml"
  sudo install -m 0644 /tmp/family-hub-compose.production.yml "$APP_DIR/compose.production.yml"
  sudo install -m 0755 /tmp/family-hub-deploy-production.sh "$APP_DIR/scripts/deploy-production.sh"
  sudo install -d -m 0750 /etc/family-hub
  sudo install -m 0600 "$PAYLOAD_FILE" "$ENV_FILE"
}

rollback_release() {
  [[ -n "$PREVIOUS_IMAGE" ]] || return 0
  echo "Rolling Family Hub back to ${PREVIOUS_IMAGE}." >&2
  sudo sed -i "s#^FAMILY_HUB_IMAGE=.*#FAMILY_HUB_IMAGE=${PREVIOUS_IMAGE}#" "$ENV_FILE"
  compose pull family-hub || true
  compose up -d --no-build family-hub || true
}

deploy_release() {
  compose pull family-hub
  compose up -d --no-build family-hub
}

wait_for_health() {
  local attempt
  for attempt in $(seq 1 30); do
    if compose exec -T family-hub node -e \
      "fetch('http://127.0.0.1:8788/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" </dev/null; then
      return 0
    fi
    if [[ "$attempt" -eq 30 ]]; then
      compose logs --tail=80 family-hub >&2 || true
      return 1
    fi
    sleep 2
  done
}

install_route() {
  sed "s/{{FAMILY_DOMAIN}}/${APP_DOMAIN}/g" "$ROUTE_TEMPLATE" | sudo /usr/local/bin/vps-route family-hub
}

verify_public() {
  [[ "$VERIFY_PUBLIC_DEPLOYMENT" == "0" ]] || \
    curl -fsS --retry 6 --retry-delay 5 "https://${APP_DOMAIN}/api/health" >/dev/null
}

show_status() { compose ps; }
announce_success() { echo "Family Hub deployed from an immutable image."; }

main() {
  validate_inputs
  acquire_lock
  prepare_release
  if ! deploy_release; then rollback_release; return 1; fi
  if ! wait_for_health; then rollback_release; return 1; fi
  if ! install_route; then rollback_release; return 1; fi
  if ! verify_public; then rollback_release; return 1; fi
  show_status
  announce_success
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  trap 'rm -f /tmp/family-hub-app.env /tmp/family-hub.caddy.template /tmp/family-hub-deploy-production.sh' EXIT
  main "$@"
fi
