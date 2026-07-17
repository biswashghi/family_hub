# Family Hub

Family Hub is a private household command center for day-to-day life.

Instead of centering the app around a family tree or a generic planner, the new direction is:
- a useful `Today` dashboard
- practical household money tracking
- home upkeep and replacement reminders
- important family and household documents
- quick notes and reference capture

## Current Shape

The app is organized around:
1. `Today`
2. `Money`
3. `Home`
4. `Docs`
5. `Notes`

## Stack

- Node.js + Express
- SQLite (`better-sqlite3`)
- Local file storage for uploaded files
- Plain HTML/CSS/JS frontend served by the same backend process

## Run locally

```bash
npm install
npm start
```

Open:
- [http://localhost:8787](http://localhost:8787)

## Login

App access is protected by username/password. On a fresh database, the login page asks you to create the first household sign-in. After setup, that account is stored in SQLite using a salted password hash.

## Docker

```bash
docker build -t family-hub:local .
docker run --rm \
  -e NODE_ENV=development \
  -p 8788:8788 \
  -v family-hub-data:/app/data \
  family-hub:local
```

## Docker Compose

```bash
docker compose up -d --build
docker compose down
```

## Hetzner Production Deployment

Repo-specific production notes:
- [Hetzner production runbook](./docs/hetzner-production.md)

Start deployment from:
- [Hetzner deployment runbook](https://github.com/biswashghi/hetzner_tf/blob/main/README.md)

Verify endpoint during deploy:
- `https://<family_domain>/login`

The app binds to localhost on the VPS via `docker-compose.prod.yml`; put Caddy or another reverse proxy in front for HTTPS.

## Persistent Data

- SQLite DB: `/app/data/family_hub.sqlite`
- Uploaded files: `/app/data/files`

Both are persisted by the compose named volume `family-hub-data`.

Create a backup:

```bash
npm run backup:data
```

In production, run the same command inside the `family-hub` container. Backups are written under `/app/data/backups` unless `BACKUP_DIR` is set.
