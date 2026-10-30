# ROPES Demo / Integration Environment

This isolated, non-production environment is for internal demonstrations, UX
and feature testing, and staff/customer walkthroughs with clearly fake data only.
It is separate from Argus controlled/live readiness. Never enter real Enarah,
ranger-program, customer, staff or partner operational data. Do not configure
OAuth credentials, AI providers or external integrations here.

The container intentionally runs Next's development server with
`NODE_ENV=development` and explicit `ROPES_DEMO_MODE=true`. Demo fallback remains
disabled in production. This setup is not a production deployment or a test of
production authentication. Initially restrict access to a trusted LAN or VPN;
never expose it publicly just because demo fallback needs no OAuth login.

```text
Browser → TrueNAS host port → ROPES demo container → PostgreSQL 16 demo container
```

## First-time setup

Run these commands from a checkout on a machine with Docker Compose and access
to the TrueNAS demo host. The database is isolated in the Compose network and
is not published to the host. The password in the example is fake and disposable:
choose a different local demo-only password, using URL-safe letters, digits,
hyphens or underscores so the constructed PostgreSQL URL remains valid. Never
use a production password. Keep `.env.demo` private and uncommitted.

```bash
cp .env.demo.example .env.demo
# Edit .env.demo and set a disposable demo-only password and optional host port.
docker compose --env-file .env.demo -f docker-compose.demo.yml build
docker compose --env-file .env.demo -f docker-compose.demo.yml run --rm migrate
# DESTRUCTIVE — DISPOSABLE DEMO DATABASE ONLY
docker compose --env-file .env.demo -f docker-compose.demo.yml run --rm seed
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d
```

The seed deletes existing data in the demo database before recreating fake demo
records. Never run it against a persistent/live or production database. Normal
`up -d` does not migrate or seed. The one-off services use a `tools` profile;
explicitly naming them with `run` starts them when needed.

The default host port is `13061`; change `ROPES_DEMO_PORT` in `.env.demo` if it
conflicts with another service. Browse `http://<truenas-host>:13061` from the
permitted LAN/VPN. An internal DNS name such as `ropes-demo.enarah.net.au` may
be configured separately in future; this stack does not configure DNS or TLS.

## Operations

```bash
# Liveness only; /api/ready is not a demo-mode health check.
curl http://<truenas-host>:13061/api/health
docker compose --env-file .env.demo -f docker-compose.demo.yml ps
docker compose --env-file .env.demo -f docker-compose.demo.yml logs -f ropes
docker compose --env-file .env.demo -f docker-compose.demo.yml stop
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d
```

After reviewing a new Git revision, rebuild with `build`, run `run --rm migrate`
explicitly if migrations changed, then run `up -d` using the same Compose
arguments above. Seed only when intentionally replacing demo data.

To reset deliberately, first confirm the selected Compose project and volume
belong only to this disposable demo. `docker compose --env-file .env.demo -f
docker-compose.demo.yml down --volumes` deletes its named database volume and
all demo data. Then repeat the first-time migration and seed steps. Do not use
this command against any other stack. Keep snapshots/backups separate from live
systems, protect them as potentially sensitive even if data should be fake, and
test restores before relying on them.

The default PostgreSQL storage is the portable `ropes-demo-postgres` named
volume. For explicit TrueNAS storage and snapshots, an operator may instead use
a dedicated dataset such as `/mnt/<POOL>/ropes-demo/postgres` as a bind mount in
a locally reviewed Compose override. Ensure the dataset permissions permit the
PostgreSQL container to write, and snapshot or restore only the demo dataset.
Do not hard-code a real pool name or repoint an existing live database.

On TrueNAS SCALE, use its supported Custom App / Compose YAML workflow if
available for the installed version. Supply the required demo password and port
privately, make the build context available to the host, and perform the same
explicit migration and destructive seed operations before normal startup. UI
and Compose support vary by TrueNAS version; verify the exact steps on the
target system. Container build and runtime have not been verified by this guide.
