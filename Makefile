SHELL := /bin/bash

LOCAL_COMPOSE = docker compose -p family-hub-local -f compose.yml -f compose.local.yml
STAGING_PROJECT ?= family-hub-staging
STAGING_COMPOSE = docker compose -p $(STAGING_PROJECT) -f compose.yml -f compose.staging.yml
PRODUCTION_COMPOSE = docker compose -p family-hub -f compose.yml -f compose.production.yml

.PHONY: local-up local-test local-down local-reset docker-build staging-test production-validate deployment-test

local-up:
	$(LOCAL_COMPOSE) up -d --build --wait

local-test:
	npm ci
	npm run test:e2e
	npm run typecheck
	npm run build
	$(LOCAL_COMPOSE) up -d --build --wait
	curl --fail --silent --show-error http://127.0.0.1:$${FAMILY_HUB_LOCAL_PORT:-8788}/api/health >/dev/null

local-down:
	$(LOCAL_COMPOSE) down

local-reset:
	$(LOCAL_COMPOSE) down --volumes --remove-orphans

docker-build:
	$(STAGING_COMPOSE) build family-hub

staging-test:
	@set -uo pipefail; rm -f staging.log; \
	  cleanup() { $(STAGING_COMPOSE) down --volumes --remove-orphans; }; \
	  trap cleanup EXIT; \
	  status=0; \
	  $(STAGING_COMPOSE) up -d $${STAGING_NO_BUILD:+--no-build} --wait || status=$$?; \
	  if [[ $$status -eq 0 ]]; then curl --fail --silent --show-error http://127.0.0.1:$${FAMILY_HUB_STAGING_PORT:-18788}/api/health >/dev/null || status=$$?; fi; \
	  if [[ $$status -ne 0 ]]; then $(STAGING_COMPOSE) logs --no-color > staging.log 2>&1 || true; fi; \
	  exit $$status

production-validate:
	$(PRODUCTION_COMPOSE) config --quiet
	$(MAKE) deployment-test

deployment-test:
	bash tests/deploy-production.test.sh
