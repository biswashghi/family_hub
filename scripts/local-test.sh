#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOCAL_DATA_DIR="${DATA_DIR:-${PROJECT_DIR}/data/local-test}"
LOCAL_HOST="${HOST:-127.0.0.1}"
LOCAL_PORT="${PORT:-8787}"

cd "${PROJECT_DIR}"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Checking types and building the production client..."
npm run typecheck
npm run build

mkdir -p "${LOCAL_DATA_DIR}"

echo
echo "Starting an editable, non-demo Family Hub environment"
echo "URL:      http://${LOCAL_HOST}:${LOCAL_PORT}"
echo "Data:     ${LOCAL_DATA_DIR}"
echo "Mode:     normal authenticated mode (sample records are editable)"
echo
echo "On the first run, open the URL and create the first household account."
echo "Press Ctrl+C to stop the server. Data is preserved for the next run."
echo

exec env \
  NODE_ENV=production \
  HOST="${LOCAL_HOST}" \
  PORT="${LOCAL_PORT}" \
  DATA_DIR="${LOCAL_DATA_DIR}" \
  FAMILY_HUB_SEED_DEMO_DATA=1 \
  npm start
