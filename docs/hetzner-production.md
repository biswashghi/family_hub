# Shared VPS production runbook

Family Hub is intended to be private and family-only. Production runs behind the
provider-neutral shared VPS platform. The container is not published on a host
port; it joins `vps-edge` under the `family-hub` alias.

## Optional Deployment Environment

```bash
export FAMILY_HUB_TIME_ZONE="America/Detroit"
export FAMILY_HUB_LOCATION_LABEL="Detroit, MI"
export FAMILY_HUB_WEATHER_LATITUDE="42.3314"
export FAMILY_HUB_WEATHER_LONGITUDE="-83.0458"
export FAMILY_DOMAIN="family.example.com"
export FAMILY_HUB_IMAGE="ghcr.io/owner/repo/family-hub@sha256:..."
```

Do not set `FAMILY_HUB_SEED_DEMO_DATA=1` in production unless you intentionally want demo data.

## Deploy

```bash
scripts/deploy-vps.sh <deploy-user> <server-ip>
```

The script:
- verifies that the shared VPS platform is already initialized
- installs the tested Compose manifests under `/opt/family-hub`
- writes `/etc/family-hub/app.env`
- pulls the immutable `FAMILY_HUB_IMAGE`
- updates only the `family-hub` Compose project
- waits for the internal health check
- atomically installs only `apps/family-hub.caddy`

Use `scripts/deploy-vps.sh` for direct app deploys.

That file is only the local coordinator: it validates inputs and uploads the
release bundle. The readable VPS-side sequence lives in
`scripts/remote/deploy-production.sh`, while the Caddy route is
`deploy/family-hub.caddy.template`. `make deployment-test` verifies health,
route installation, public verification, final success, and rollback order.

## Reverse Proxy

Expose only `80` and `443` publicly. The platform-owned Caddy container and
Family Hub share the external `vps-edge` Docker network:

```yaml
networks:
  edge:
    aliases: [family-hub]
```

Caddy example:

```caddyfile
family.example.com {
  reverse_proxy family-hub:8788
}
```

## Production Safety

Family Hub no longer takes production login credentials from environment variables. On a fresh database, open `/login` and create the first household sign-in. The account is stored in SQLite with a salted password hash.

Demo data is disabled by default. It only seeds when:

```bash
FAMILY_HUB_SEED_DEMO_DATA=1
```

## Backups

Inside the app container:

```bash
docker compose -p family-hub --env-file /etc/family-hub/app.env \
  -f /opt/family-hub/compose.yml -f /opt/family-hub/compose.production.yml \
  exec family-hub npm run backup:data
```

By default, backups are written under the persisted data volume:

```text
/app/data/backups/<timestamp>/
  family_hub.sqlite
  files/
```

For a host-visible backup directory:

```bash
docker compose -p family-hub --env-file /etc/family-hub/app.env \
  -f /opt/family-hub/compose.yml -f /opt/family-hub/compose.production.yml exec \
  -e BACKUP_DIR=/app/data/backups family-hub npm run backup:data
```

Copy backups off the VPS regularly.

## Verify

```bash
curl -I https://family.example.com/login
docker compose -p family-hub --env-file /etc/family-hub/app.env \
  -f /opt/family-hub/compose.yml -f /opt/family-hub/compose.production.yml ps
docker compose -p family-hub --env-file /etc/family-hub/app.env \
  -f /opt/family-hub/compose.yml -f /opt/family-hub/compose.production.yml logs --tail=100 family-hub
```
