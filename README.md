# Family Hub

A fresh, single-container family hub app for:
- shared **bills/payments** (utilities, shared cards, home costs)
- shared **documents/manuals** (vaccination papers, home manuals, important family files)

## Stack
- Node.js + Express
- SQLite (`better-sqlite3`) for metadata
- Local file storage for uploaded docs (`data/files`)
- Plain frontend (HTML/CSS/JS) served by the same backend process

## Run locally
```bash
npm install
npm start
```

Open: [http://localhost:8787](http://localhost:8787)

## Login
App access is protected by username/password.

- Default username: `family_admin`
- Default password: `FamilyHub!2026`

Override with env vars:
- `FAMILY_HUB_USERNAME`
- `FAMILY_HUB_PASSWORD`

## Docker
```bash
docker build -t family-hub:local .
docker run --rm -p 8787:8787 -v family-hub-data:/app/data family-hub:local
```

## Docker Compose
```bash
docker compose up -d --build
docker compose down
```

## Hetzner Production Deployment (Shared Proxy)

Start deployment from:
- [/Users/biswash/Documents/repos/hetzner_tf/README.md](/Users/biswash/Documents/repos/hetzner_tf/README.md)

Family Hub deploy uses Bitwarden credentials via the shared wrapper:
- Default item: `family-hub-prod-credentials`
- Default fields: `username`, `password`

App-specific verify endpoint:
- `https://<family_domain>/login`

## E2E tests (Puppeteer)
```bash
npm run test:e2e
```

The e2e suite runs against a temporary DB/data directory, so local app data is not mutated.

## Feature-complete testing workflow
Default workflow is documented in [AGENTS.md](./AGENTS.md): after a completed feature, ask whether a new Puppeteer scenario should be added.

## Persistent data
- SQLite DB: `/app/data/family_hub.sqlite`
- Uploaded docs: `/app/data/files`

Both are persisted by the compose named volume `family-hub-data`.
