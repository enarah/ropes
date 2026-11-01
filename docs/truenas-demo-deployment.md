# ROPES TrueNAS synthetic integration sandbox

This environment is for internal demonstrations and integration acceptance with
clearly synthetic data only. It is separate from Argus and normal authenticated
production. Never enter real ranger, staff, partner or client operational data,
configure live integrations, or expose this unauthenticated demo to the public
internet. Keep it on the permitted LAN/VPN.

## Workstation, sandbox and controlled production

- Developer workstation: `npm run dev` / `next dev` for local development.
- TrueNAS integration sandbox: the `demo` Docker target compiles `next build`
  into the image and runs `next start` with `NODE_ENV=production`.
- Argus: its separate controlled release/deployment path is unchanged.

`NODE_ENV` describes the Next.js execution mode, not whether data is synthetic.
The compiled sandbox has no development HMR WebSocket or Fast Refresh transport.
Runtime application flags are server-only; do not add `NEXT_PUBLIC_` variants.

Production-mode demo fallback requires **all** of:

1. `NODE_ENV=production`.
2. `ROPES_RUNTIME_ENV=sandbox` (exact value).
3. `ROPES_DEMO_MODE=true`, `1`, or `enabled`.
4. A valid PostgreSQL `DATABASE_URL` with database exactly `ropes_demo`.

The shared disposable-database validator rejects other protocols/databases,
missing hosts, malformed URLs and connection overrides such as `dbname`,
`database`, `host` or `options`. Only the existing schema/SSL/pool query parameters
are permitted. Connection values never appear in gate errors. No sandbox flag,
wrong database or missing configuration means no production demo fallback.
Existing explicit non-production workstation demo behaviour is retained.

If real authentication is configured, the authenticated database path still takes
precedence. Fake sessions resolve only existing `isDemo` users and organisations;
the organisation page tenant guard and tracking capability checks still apply.
A runtime flag does not turn an ordinary organisation into a demo tenant.

This read-access exception grants no maintenance permission. The destructive seed
and tracking fixture loader still reject `NODE_ENV=production`, even if all
sandbox/demo flags and explicit write-permission flags are present.

```text
Browser → permitted TrueNAS host port → compiled ROPES sandbox → private PostgreSQL 16
```

## Build once, run the reviewed image

Use a checkout of the reviewed revision. Keep `.env.demo` private and uncommitted;
use a disposable URL-safe database password. Never use a production credential.
The repository's `.dockerignore` excludes private environment files and local
build/dependency directories.

```bash
cp .env.demo.example .env.demo
# Edit the private file: set a disposable demo password and exact reviewed image tag.
# Example ROPES_DEMO_IMAGE=ropes-demo-local:reviewed-sha

docker build --target demo --tag ropes-demo-local:reviewed-sha .
```

The Docker build installs OpenSSL for Prisma tools and runs `npm ci`, Prisma generation
and `npm run build` without a
runtime database or authentication configuration. It preserves Prisma/maintenance
tools in this sandbox-only image. It does not migrate, seed or load tracking data.
The application runs as the unprivileged `node` user and starts only
`npm run start -- --hostname 0.0.0.0 --port 3000`.

Use the proven manual/prebuilt-image path on TrueNAS: build the exact reviewed
image separately, then select that local image tag in the app configuration.
Do not rely on a long Custom App UI rebuild or mount development source/build
directories over the compiled application. The Compose file names an image and
retains an explicit build target for local/manual builds; startup should use
`--no-build --pull never` with the already-built image.

```bash
# Existing sandbox upgrade, after the reviewed local image is available:
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d --no-build --pull never ropes
```

Never seed an existing sandbox merely to upgrade the application. Existing data
and tracking fixtures remain in PostgreSQL. Normal startup does not migrate,
seed, reset, or reload fixtures. This runtime change adds no migration.

## First-time disposable database setup only

These commands are for an intentionally new disposable demo database. PostgreSQL
is on the Compose network with no published database port. Choose and verify the
correct project and volume before using maintenance commands.

```bash
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d postgres
# Explicit migration tool service, separate from application startup:
docker compose --env-file .env.demo -f docker-compose.demo.yml run --rm --no-deps migrate
# DESTRUCTIVE — DISPOSABLE DEMO DATABASE ONLY; never run for a routine upgrade:
docker compose --env-file .env.demo -f docker-compose.demo.yml run --rm --no-deps seed
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d --no-build --pull never ropes
```

Prisma 7 uses the explicit `migrations.seed` command in `prisma.config.ts`; this
points to the existing guarded seed script and adds no automatic seeding. See the
[Prisma 7 seed configuration](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding).

The seed deletes existing demo data. Its tool service explicitly uses
`NODE_ENV=development`, demo mode and `ALLOW_DESTRUCTIVE_DEMO_SEED=true`; the
normal production-style application has no write-permission flags. Synthetic
tracking loading, if intentionally needed during maintenance, likewise requires
a separate non-production one-off process and its existing explicit permission.
It is not part of normal startup. See `spot-operations-map.md` for loader details.

After future schema changes, run migrations only as a separately reviewed tool
operation. The `tools` profile keeps migration and seed services out of ordinary
application startup. No worker, scheduled update or automatic deployment is added.

## Runtime environment and checks

The application service supplies:

```text
NODE_ENV=production
ROPES_RUNTIME_ENV=sandbox
ROPES_DEMO_MODE=true
DATABASE_URL=<private PostgreSQL URL selecting exactly ropes_demo>
```

The default host port is `13061`; change `ROPES_DEMO_PORT` in `.env.demo` if needed.
Keep PostgreSQL private. Do not configure Argus, OAuth secrets or real tracking
provider credentials in this stack.

```bash
# Liveness semantics are unchanged; /api/ready remains a controlled-auth check.
curl http://<sandbox-host>:13061/api/health
docker compose --env-file .env.demo -f docker-compose.demo.yml ps
docker compose --env-file .env.demo -f docker-compose.demo.yml logs --tail 100 ropes
```

Acceptance should include the landing page, Trips, Vehicles and health; populated
Field Operations, Leaflet markers and synthetic OSM tiles; both selection
directions; and full reload. Check that required `_next` scripts/chunks return
HTTP 200 and that the browser makes no development HMR WebSocket requests or
Fast Refresh requests. Public OSM tiles remain approved only for synthetic data.

## Storage and operational boundary

The portable `ropes-demo-postgres` named volume is unchanged. A separately reviewed
local TrueNAS override may bind a dedicated demo dataset, but must never reuse a
live database dataset. Keep demo snapshots/backups separate and verify restores.
Volume removal destroys demo data and is never part of normal upgrades.

TrueNAS UI details depend on the installed version. Operators supply the private
connection and exact prebuilt image through the existing supported app workflow;
this repository change does not authorise or perform any deployment, TrueNAS
access, Argus change, fixture reload or live SPOT request.
