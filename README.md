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

### Manual Deploy

Current production target:

```text
host: 178.156.141.165
user: deploy
domain: family.bghimire.com
repo: https://github.com/biswashghi/family_hub.git
branch: main
```

Deploy from the shared Hetzner repo:

```bash
cd /Users/biswash/Documents/repos/hetzner_tf

./scripts/deploy-hetzner-prod-from-tf.sh \
  /Users/biswash/Documents/repos/family_hub \
  deploy \
  178.156.141.165 \
  https://github.com/biswashghi/family_hub.git \
  main
```

That wrapper refreshes the shared Caddy config, SSHes into the VPS, pulls `main`, writes `/opt/family-hub/.env.prod`, and runs:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### First Production Login

Production does not use an admin password from environment variables. On a fresh production database:

1. Open `https://family.bghimire.com/login`.
2. Create the first household username and password.
3. The account is stored in SQLite with a salted password hash.

Redeploys keep that login because the database lives in the Docker volume.

### GitHub Actions Auto Deploy

Auto deploy is configured in:

```text
.github/workflows/deploy.yml
```

Behavior:

- Pull requests to `main`: run tests and syntax checks only.
- Pushes to `main`: run tests, SSH to Hetzner, deploy, then verify `/api/health`.
- Manual deploy: run the `Deploy Family Hub` workflow from GitHub Actions.

Required GitHub Actions repository secrets:

```text
HETZNER_HOST=178.156.141.165
HETZNER_USER=deploy
HETZNER_SSH_KEY=<private deploy key>
```

Current dedicated deploy key paths on this machine:

```text
private: /Users/biswash/.ssh/family_hub_github_actions
public:  /Users/biswash/.ssh/family_hub_github_actions.pub
```

To recreate the key:

```bash
ssh-keygen -t ed25519 -C "family-hub-github-actions" -f ~/.ssh/family_hub_github_actions
```

Add the public key to the VPS:

```bash
ssh deploy@178.156.141.165 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
cat ~/.ssh/family_hub_github_actions.pub | ssh deploy@178.156.141.165 'cat >> ~/.ssh/authorized_keys'
```

Set GitHub secrets with `gh`:

```bash
cd /Users/biswash/Documents/repos/family_hub

gh secret set HETZNER_HOST --body "178.156.141.165"
gh secret set HETZNER_USER --body "deploy"
gh secret set HETZNER_SSH_KEY < ~/.ssh/family_hub_github_actions
```

Trigger and watch a deploy:

```bash
gh workflow run "Deploy Family Hub" --ref main
gh run watch --exit-status
```

Optional GitHub Actions variables:

```text
APP_HOST_PORT=8787
FAMILY_HUB_TIME_ZONE=America/Detroit
FAMILY_HUB_LOCATION_LABEL=Detroit, MI
FAMILY_HUB_WEATHER_LATITUDE=42.3314
FAMILY_HUB_WEATHER_LONGITUDE=-83.0458
```

If these variables are not set, the workflow and deploy script use those defaults.

## Persistent Data

- SQLite DB: `/app/data/family_hub.sqlite`
- Uploaded files: `/app/data/files`

Both are persisted by the compose named volume `family-hub-data`.

Create a backup:

```bash
npm run backup:data
```

In production, run the same command inside the `family-hub` container. Backups are written under `/app/data/backups` unless `BACKUP_DIR` is set.
