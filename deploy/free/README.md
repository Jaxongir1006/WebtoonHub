# Free deployment preparation

Target services: Supabase PostgreSQL and Storage, Render FastAPI and Redis,
and separate Vercel reader and admin projects. Deployment is still in progress.

Backend URL: `https://webtoonhub-api.onrender.com`. Its production health check
passed after the initial Render deployment.
Reader URL: `https://webtoon-hub-xmfh.vercel.app`.
Admin URL: `https://webtoon-hub-nine.vercel.app`.

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

The GitHub workflow continues running all checks. Its legacy VPS deployment job
now runs only when the repository variable `VPS_AUTODEPLOY` is explicitly `true`.
Keep that variable unset for this deployment; Render and Vercel deploy from their
own connected GitHub projects.

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
25, 465 and 587 are blocked. Initial admin setup is still pending.

## Vercel setup

Create two projects from this repository on the Hobby plan. Select the Vite
framework, `npm run build` as the build command, and `dist` as the output directory.
Use `frontend` as the reader project's Root Directory and `admin` for the admin.
Both directories have `vercel.json` files for SPA refresh routing and `/content`
requests to the backend, including unpublished chapter media authentication.

Set these build environment variables before deploying:

| Project | Variable | Value |
| --- | --- | --- |
| Reader | `VITE_API_URL` | `https://webtoonhub-api.onrender.com/api/v1` |
| Reader | `VITE_API_TIMEOUT_MS` | `90000` |
| Reader | `VITE_ADMIN_URL` | Actual admin project HTTPS origin |
| Admin | `VITE_API_URL` | `https://webtoonhub-api.onrender.com/api/v1/staff` |
| Admin | `VITE_API_TIMEOUT_MS` | `90000` |
| Admin | `VITE_BASE_PATH` | `/` |

Deploy the admin first so its URL can be used when deploying the reader. These are
public frontend settings; do not add Supabase secrets or the database URL to either
Vercel project. API and clan WebSocket traffic connects directly to Render. The
longer bounded API timeout allows a sleeping Free backend to wake up.

Once both project URLs are known, update Render's `ALLOWED_ORIGINS` to a JSON array
containing both HTTPS origins and `FRONTEND_URL` to the reader's origin. Do not add
URL paths or trailing slashes to those origins. Save and redeploy the backend,
then verify login, browser page refresh, uploads and unpublished chapter previews.
The root Blueprint now contains these actual public origins so Blueprint sync can
apply them automatically. Private database and Supabase credentials remain manual
environment variables.

References: [Vercel Vite routing](https://vercel.com/docs/frameworks/frontend/vite),
[External rewrites](https://vercel.com/docs/routing/rewrites).

References: [Render Free](https://render.com/docs/free),
[Blueprint configuration](https://render.com/docs/blueprint-spec),
[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
