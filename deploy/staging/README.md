# VPS staging on DuckDNS

The public staging endpoints are:

- Reader: `https://webtoonhub.duckdns.org/`
- Admin studio: `https://admin-webtoonhub.duckdns.org/`
- API: `https://api-webtoonhub.duckdns.org/api/v1/health`

DNS for all three names points to `189.74.97.228`. Host Nginx uses
`nginx-public.conf` as `/etc/nginx/sites-available/webtoonhub-staging` and
`nginx-tuning.conf` as `/etc/nginx/conf.d/webtoonhub-tuning.conf`. Nginx
proxies to Docker services bound only on `127.0.0.1:18080`, `18081`, and
`18082`. PostgreSQL, Redis, and SMTP have no host ports.

Build the React frontend with
`VITE_API_URL=https://api-webtoonhub.duckdns.org/api/v1` and
`VITE_ADMIN_URL=https://admin-webtoonhub.duckdns.org/`. Build the Vue admin app
with `VITE_API_URL=https://api-webtoonhub.duckdns.org/api/v1/staff` and
`VITE_BASE_PATH=/`. Then build the Docker images from the project root with
`docker compose -f deploy/staging/compose.yml build`. These Vite values are
embedded at build time; changing `.env` alone will not update browser clients.

The host TLS certificate covers all three domains. Certbot renews it with the
Nginx plugin while Nginx is running (`certbot reconfigure --cert-name
webtoonhub.duckdns.org --nginx`). Check the renewal timer with
`systemctl status certbot.timer`.

Copy `.env.example` to `.env` in this directory and replace all placeholder
credentials before running `docker compose -f deploy/staging/compose.yml up -d`.
The API runs Alembic migrations before starting. For a fresh empty database,
create only the first staff administrator with
`docker compose -f deploy/staging/compose.yml exec api python -m scripts.bootstrap_admin --username admin --email <admin-email>`.
This prompts for the password and creates the superadmin role and permissions.
Do not run `scripts.seed` on the live stack: it adds sample titles and shop items.

The database, Redis, and uploaded content use separate named volumes. Media
uses the application's local storage fallback in this single-server staging
stack; an object store should be configured before a scaled public launch.
The API image starts with an empty `public_content` directory so a new media
volume does not inherit demo assets.
The stack uses the `webtoonhub-staging` Compose project. Keep the Compose
project name and named volumes when updating so database and uploaded media
remain attached.

Install `backup.sh` at `/opt/webtoonhub-staging/backup.sh` and the two systemd
units under `/etc/systemd/system/`. Enable `webtoonhub-staging-backup.timer`.
The backup captures PostgreSQL and the local media volume, keeps seven days,
and stores files readable only by root under `/opt/webtoonhub-staging/backups`.

## Continuous delivery

The [CI workflow](../../.github/workflows/ci.yml) builds both browser apps and
checks backend tests and migrations on pull requests. A push to `main` deploys
only after both check jobs pass. The `staging` GitHub environment allows only
the `main` branch and holds `VPS_DEPLOY_KEY` and `VPS_SSH_KNOWN_HOSTS`.

The deploy job builds two Docker images from that exact commit and sends them
to the VPS. Its SSH key has a forced command in `/root/.ssh/authorized_keys`:
`/opt/webtoonhub-staging/deploy-gateway.sh`. The gateway accepts only image
upload and release commands. It must be installed alongside
`deploy-release.sh` whenever either server-side script changes.

The release script makes a fresh database and content backup, updates only
the API and web containers, and checks their health and local HTTP endpoints.
It keeps the existing Compose project and named volumes. If the checks fail,
it restores the prior application images. A migration that changes the
database cannot always be rolled back by changing images; restore its backup
before retrying an incompatible release.

For a manual release, build the images, upload them through the deploy key,
and invoke `release <40-character-commit-sha>`. Do not use `docker compose
down -v` on this stack.
