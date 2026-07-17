# Hetzner Production Runbook

Family Hub is intended to be private and family-only. Production should run behind HTTPS with the app container bound to localhost on the VPS.

## Optional Deployment Environment

```bash
export FAMILY_HUB_TIME_ZONE="America/Detroit"
export FAMILY_HUB_LOCATION_LABEL="Detroit, MI"
export FAMILY_HUB_WEATHER_LATITUDE="42.3314"
export FAMILY_HUB_WEATHER_LONGITUDE="-83.0458"
export APP_HOST_PORT="8788"
```

Do not set `FAMILY_HUB_SEED_DEMO_DATA=1` in production unless you intentionally want demo data.

## Deploy

```bash
scripts/deploy-hetzner.sh <deploy-user> <server-ip> <repo-url> [branch]
```

The script:
- installs Docker if needed
- clones or updates `/opt/family-hub`
- writes `/etc/family-hub/app.env`
- copies that env to `/opt/family-hub/.env.prod`
- runs `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build`

## Reverse Proxy

Expose only `80` and `443` publicly. Keep the app bound to localhost:

```yaml
ports:
  - "127.0.0.1:8788:8788"
```

Caddy example:

```caddyfile
family.example.com {
  reverse_proxy 127.0.0.1:8788
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
docker compose --env-file .env.prod -f docker-compose.prod.yml exec family-hub npm run backup:data
```

By default, backups are written under the persisted data volume:

```text
/app/data/backups/<timestamp>/
  family_hub.sqlite
  files/
```

For a host-visible backup directory:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec \
  -e BACKUP_DIR=/app/data/backups family-hub npm run backup:data
```

Copy backups off the VPS regularly.

## Verify

```bash
curl -I https://family.example.com/login
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=100 family-hub
```
