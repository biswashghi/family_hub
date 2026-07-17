#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <deploy-user> <server-ip> <repo-url> [branch]"
  exit 1
fi

DEPLOY_USER="$1"
SERVER_IP="$2"
REPO_URL="$3"
BRANCH="${4:-main}"
APP_DIR="/opt/family-hub"
SERVER_ENV_FILE="/etc/family-hub/app.env"
LOCAL_APP_USERNAME="${FAMILY_HUB_USERNAME:-}"
LOCAL_APP_PASSWORD="${FAMILY_HUB_PASSWORD:-}"
LOCAL_TIME_ZONE="${FAMILY_HUB_TIME_ZONE:-America/Detroit}"
LOCAL_LOCATION_LABEL="${FAMILY_HUB_LOCATION_LABEL:-Detroit, MI}"
LOCAL_WEATHER_LATITUDE="${FAMILY_HUB_WEATHER_LATITUDE:-42.3314}"
LOCAL_WEATHER_LONGITUDE="${FAMILY_HUB_WEATHER_LONGITUDE:--83.0458}"
LOCAL_APP_HOST_PORT="${APP_HOST_PORT:-8788}"

ssh "${DEPLOY_USER}@${SERVER_IP}" <<EOF
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl git
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo \$VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker ${DEPLOY_USER}
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  sudo mkdir -p "${APP_DIR}"
  sudo chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  cd "${APP_DIR}"
  git fetch origin
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
fi

cd "${APP_DIR}"

if [[ -z "${LOCAL_APP_USERNAME}" || -z "${LOCAL_APP_PASSWORD}" ]]; then
  echo "FAMILY_HUB_USERNAME and FAMILY_HUB_PASSWORD must be set for production deploy."
  exit 1
fi

sudo mkdir -p "\$(dirname "${SERVER_ENV_FILE}")"
printf '%s' '$(printf '%s\n' \
  "NODE_ENV=production" \
  "APP_HOST_PORT=${LOCAL_APP_HOST_PORT}" \
  "FAMILY_HUB_USERNAME=${LOCAL_APP_USERNAME}" \
  "FAMILY_HUB_PASSWORD=${LOCAL_APP_PASSWORD}" \
  "FAMILY_HUB_TIME_ZONE=${LOCAL_TIME_ZONE}" \
  "FAMILY_HUB_LOCATION_LABEL=${LOCAL_LOCATION_LABEL}" \
  "FAMILY_HUB_WEATHER_LATITUDE=${LOCAL_WEATHER_LATITUDE}" \
  "FAMILY_HUB_WEATHER_LONGITUDE=${LOCAL_WEATHER_LONGITUDE}" \
  "FAMILY_HUB_SEED_DEMO_DATA=0" \
  | base64 | tr -d '\n')' | base64 -d | sudo tee "${SERVER_ENV_FILE}" >/dev/null

sudo cp "${SERVER_ENV_FILE}" "${APP_DIR}/.env.prod"
sudo chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/.env.prod"

sudo docker compose --env-file "${APP_DIR}/.env.prod" -f "${APP_DIR}/docker-compose.prod.yml" up -d --build
sudo docker compose --env-file "${APP_DIR}/.env.prod" -f "${APP_DIR}/docker-compose.prod.yml" ps
EOF
