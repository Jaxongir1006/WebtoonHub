# Free deployment preparation

Target services: Supabase PostgreSQL and Storage, Render FastAPI and Redis,
and separate Vercel reader and admin projects. Deployment is still in progress.

## Supabase setup completed

Project reference: `mtzdzuetxohglhpxkztv`.

- All seven existing Alembic migrations were applied to an empty Supabase database.
- Current Alembic revision: `aa42ef631d90`; 36 application tables including
  `alembic_version`. A fresh temporary PostgreSQL migration and `alembic check`
  passed before applying the exported migration SQL remotely.
- RLS is enabled on all application tables. Direct table and sequence privileges
  for `anon` and `authenticated` were revoked, as were their default privileges
  for future tables and sequences created by `postgres` in `public`.
- There are intentionally no browser-facing RLS policies. The application retains
  its existing backend authentication and accesses PostgreSQL through its server
  connection. The initial migration ran as `postgres`, which can bypass RLS;
  a different runtime database role will require an explicit access design.
- `webtoonhub-media` and `webtoonhub-imports` are private Storage buckets with
  a 50 MiB object limit. The first accepts supported image types; the second
  accepts WebP chapter import pages. No files or accounts have been imported.

Do not rerun the initial schema against this project. Future schema changes should
use the existing Alembic migration workflow and retain backend-only table access.

## Private setup values

Copy `.env.example` to `.env.local`. The local file is ignored by Git and contains
setup inputs, not the backend runtime configuration. Do not paste its contents
into chat or commit it.

1. In Supabase **Connect**, select the **Session pooler** URI on port 5432.
   Save it as `SUPABASE_DATABASE_CONNECTION`, keeping `[YOUR-PASSWORD]` in the URI.
2. Save the actual database password separately as `SUPABASE_DATABASE_PASSWORD`.
   The connection preparation code must encode it before constructing a URL.
3. In **Settings > API Keys > Secret keys**, copy a backend secret beginning with
   `sb_secret_` into `SUPABASE_SECRET_KEY`. Use it only on the backend, sending it
   in the Storage API's `apikey` header, never as a browser environment variable.

## Backend configuration

Set `STORAGE_BACKEND=supabase` to keep uploads, animated cards and private chapter
import staging in Supabase. Database media URLs remain `/content/...`; the backend
checks unpublished chapter permissions before issuing short-lived download links.
SVGs are served through the backend with the existing restrictive CSP. The two
storage buckets must stay private. Existing local/VPS deployments continue using
local media storage unless this setting is changed.

`DATABASE_SSL_REQUIRE=true` enables encrypted connections for both the async
application and Alembic. The Render configuration uses a two-connection pool with
one overflow connection and a single server worker.

Run `backend/.venv/Scripts/python.exe deploy/free/prepare_render_env.py` from the
repository root. It writes a Git-ignored `.env.render.local` containing the values
to copy into Render. The database password is encoded programmatically. No secret
is printed. Until Vercel URLs are known, the generated file uses `example.invalid`
for allowed origins and the frontend URL. Replace these values on Render with the
actual reader and admin origins before testing browser flows or email links.

## Render setup

1. Create a Free workspace, connect this GitHub repository, and select
   **New > Blueprint** using the root `render.yaml` file.
2. The Blueprint creates `webtoonhub-cache` (Free Key Value) and `webtoonhub-api`
   (Free Python web service) in Frankfurt. Both resources explicitly use `free`.
   Cache external access is disabled; the API uses its internal connection URL.
3. Supply the prompted variables from `.env.render.local`. Render generates the
   application JWT secret and wires the cache connection automatically.
4. After deployment, check the backend's `/api/v1/health` endpoint. Record its
   public HTTPS URL for configuring Vercel's API and media routes.

Migrations run in the startup command because Free web services do not support
pre-deploy commands or interactive shells. Create the first staff admin with
`backend/scripts/bootstrap_admin.py` from a trusted local environment connected
to Supabase; the app is not automatically seeded with demo users or content.

Render's Free filesystem is ephemeral, services sleep after 15 minutes of idle
time, and the next request can take about a minute to wake up. Its Free Redis
cache may lose data on restart; durable application records remain in PostgreSQL.
Email delivery still needs a provider reachable from Render: outbound SMTP ports
25, 465 and 587 are blocked. Frontend/admin deployment and initial admin setup
are still pending.

References: [Render Free](https://render.com/docs/free),
[Blueprint configuration](https://render.com/docs/blueprint-spec),
[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
