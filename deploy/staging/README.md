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

The database, Redis, uploaded content, and private import stages use separate named volumes. Media
uses the application's verified local storage in this single-server staging
stack; multiple API hosts require a shared media volume or an implemented
object-store adapter.
The API image starts with an empty `public_content` directory so a new media
volume does not inherit demo assets.
The stack uses the `webtoonhub-staging` Compose project. Keep the Compose
project name and named volumes when updating so database and uploaded media
remain attached.

Install `backup.sh` at `/opt/webtoonhub-staging/backup.sh` and the two systemd
units under `/etc/systemd/system/`. Enable `webtoonhub-staging-backup.timer`.
Install util-linux (`flock`) on the host. Both scheduled and release backups acquire
the same nonblocking `backups/.backup.lock`; an overlapping run exits 75 before
pausing anything. Snapshot filenames include the process ID. A failed `pause`
does not authorize that run to unpause an API already paused by another operator.
The backup captures PostgreSQL, local media, and private import stages, keeps seven days,
and stores files readable only by root under `/opt/webtoonhub-staging/backups`.
It briefly pauses the API while capturing the three stores, then resumes it
before validation or offsite transfer. Separate short-lived helper containers
read the shared volumes while the API is paused. A failure trap resumes the API;
if Docker cannot resume it, the script reports failure and prints an explicit
recovery instruction. Schedule backups during a quiet period because API
requests and uploads can wait or time out during the snapshot.

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


## Audit fixes: operational requirements

Account recovery requires FRONTEND_URL to be the public reader origin and a working SMTP service. This staging Compose stack defaults to Mailpit, so reset messages are captured for inspection and do not reach real inboxes. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_TLS for an actual provider before public release; recreate the API container to apply those environment values. New passwords use PBKDF2 SHA256 and existing bcrypt passwords remain compatible.

Uploads now persist verified/reencoded raster files in the local content volume; optional SVG assets are sanitized and served with a restrictive CSP. A shared media volume or an implemented object-store adapter is required before running API instances on multiple hosts. SQLite is supported for local single-process development; PostgreSQL row locks protect concurrent deployed wallet operations.

Offsite backup uploads are supported by backup.sh. Install AWS CLI, configure host credentials through its credential chain, and create a root-readable backup.env containing BACKUP_S3_URI=s3://your-independent-backup-bucket/webtoonhub. Configure encryption, retention and access controls on that bucket. The script checks dump/archive readability, writes a SHA256 manifest covering all three stores, uploads all four artifacts, and records separate latest-local-success and latest-offsite-success stamps; a failed upload does not report offsite success. With no destination configured, the script explicitly reports that recovery copies are local only. Perform a disposable restore drill for PostgreSQL, public media, and private import stages before relying on the schedule. Automated tests cover the shell flow with isolated fake Docker/AWS tools; they do not verify an actual bucket or disaster recovery.

Migrations reject duplicate chapter numbers before changing schema. Resolve those records deliberately before upgrading. This migration is additive; future incompatible releases must include an explicit tested downgrade or a database/media restore procedure. Image rollback does not restore database schema. deploy-release.sh records the exact pre-release backup in last-release-backup for manual recovery; automatic restore is deliberately not performed because it could discard post-backup reader activity.

Media cleanup is reference-aware for new replacement/deletion operations. The optional `python -m scripts.prune_orphan_media` command defaults to a dry run and reviews generated files older than seven days; inspect its candidates before invoking `--apply`. Existing original media was not pruned during the audit fixes.

## Resumable import storage and recovery

Unfinished manga/manhwa imports are private database records plus verified WebP
pages in `import_data`, mounted at `/app/private_chapter_imports`. They never
enter the public media mount. Keep this volume when recreating the API container
or changing application images. Multiple API hosts must share both file stores.
Finalization creates the chapter and its ordered page references atomically;
completed chapters use `content_data`. Upload sessions expire seven days after
the last successful page upload.

Review private cleanup with
`docker compose -f deploy/staging/compose.yml exec api python -m scripts.prune_chapter_imports`.
After reviewing the count, append `--apply` to discard expired uploads and
remove private staged files belonging to expired, discarded, or completed
imports. This command never deletes published chapter media.

For recovery, first verify the backup in a disposable Compose project. Use one
timestamp for `db-<timestamp>.dump`, `content-<timestamp>.tar.gz`,
`imports-<timestamp>.tar.gz`, and `manifest-<timestamp>.sha256`:

1. In the backup directory, run `sha256sum -c manifest-<timestamp>.sha256`.
   Validate the dump with `pg_restore --list` and both archives with `gzip -t`.
   Do not restore if any check fails.
2. Preserve a current recovery copy. Stop the API and every other database/file
   writer, and keep the API stopped throughout all three restores. Restore the
   dump into an empty disposable PostgreSQL database using `pg_restore` with
   the target database's own credentials.
3. With the target API stopped, restore public and private archives to empty
   target volumes using short-lived Compose API helpers with the same image
   and volumes. For example, with the disposable Compose directory as the
   working directory:

   ```sh
   docker compose run --rm --no-deps -T --entrypoint tar api -C /app/public_content -xzf - < content-<timestamp>.tar.gz
   docker compose run --rm --no-deps -T --entrypoint tar api -C /app/private_chapter_imports -xzf - < imports-<timestamp>.tar.gz
   ```

   Never extract private stages under `public_content`, and never overlay old
   files from a different timestamp onto the restored volumes.
4. Start the API, check health, read an existing published chapter, and resume
   a known unfinished import using the same staff account. Check uploaded page
   indexes, then upload only the missing pages. A restore does not extend the
   original seven-day expiry. Browser queue drafts must also still be available
   on that device; otherwise reselect the original folders/files.
5. After the disposable drill passes, plan the actual recovery with the same
   stopped-writer procedure and preserve the original volumes for rollback.
   Database restoration loses activity after the selected snapshot, so it is
   a deliberate operator action rather than an automatic deployment rollback.

Older backups without `imports-<timestamp>.tar.gz` can restore completed
chapters and public media. They cannot resume unfinished uploads: discard those
restored import sessions and start fresh with the original files. Keep import
archives private and include them in offsite retention and access controls.
