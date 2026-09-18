# Live testing deployment readiness: ropes.enarah.net.au

Issue #158 documents the repository-side plan for controlled internal testing.
It does not authorise deployment. Current decision: **NO-GO until the checklist
below is completed and Hera and Enarah approve the handover**. Since the
original planning text was written, Hera has completed a read-only inspection of
Argus and Enarah/DC has approved a clean-slate replacement direction in #171.
This document is a readiness summary; the canonical clean-slate decommission and
cutover runbook is [#172](https://github.com/enarah/ropes/issues/172) and
[the repository runbook](argus-clean-slate-cutover-runbook.md).

## Architecture and responsibility

| Term | Responsibility |
| --- | --- |
| Hera | Enarah's sentinel/admin agent and server-side authority. |
| Sentinel machine | Hera's dedicated operating/control machine. Hera runs here, not on Argus. |
| Argus | `argus.enarah.com.au`, the canonical control hostname for the deployment server which Hera administers remotely with full SSH administrative access. Legacy wording may refer to `argus.enarah.net.au`, but it is not the canonical admin hostname. |
| ROPES test domain | `ropes.enarah.net.au`, intended for controlled live testing before production rollout. |
| Codex | Repository-side implementation and documentation only. Prepares evidence and questions for Hera; does not choose or configure Argus infrastructure. |
| GitHub | Source of truth for application code, issues, reviewed pull requests and CI: [enarah/ropes](https://github.com/enarah/ropes). |

Deployment is a future handover and agreement between repository maintainers,
Enarah and Hera. Hera's read-only inspection confirmed a superseded Node 24
ROPES installation, old ROPES databases with zero application rows and the
current static Plesk root path. Enarah approves testers, data and access policy;
Hera confirms operational choices and the rollback owner before any server work.

## Current Argus findings and clean-slate decision

Issue #171 records the approved `CLEAN_SLATE_REPLACE` direction. The old
installation is not a rollback baseline, and old secrets/configuration values
are not the future baseline. The future target is a reviewed Node 26 / npm 11
release using the canonical `npm start` contract and a NEW PostgreSQL database.

Known old state from Hera's read-only evidence:

- `ropes.service` exists and ran a Node 24.21.0 direct-Next runtime.
- `/opt/ropes/current` pointed to `/opt/ropes/releases/sentinel-2cd48e1`.
- the old private Node listener was `127.0.0.1:13060`.
- old ROPES configuration existed at `/etc/ropes/production.env`.
- PostgreSQL DBs `ropes` and `ropes_restore_sentinel` existed and contained
  zero application rows, zero `User` rows, zero `Membership` rows, zero
  `Organisation` rows, zero `Role` rows and 18 Prisma migration records only.
- `/var/backups/ropes/sentinel-initial.dump` existed as a historical local dump.
- the current public root path is:

```text
internet
→ Plesk nginx
→ Apache loopback 7081
→ static index.html
```

The approved replacement plan does not migrate the old DBs or restore the old
dump. Removal of old ROPES-only state is approved in principle, but only during
a separately reviewed and authorised decommission/cutover runbook. The current
static Plesk page may remain until the later cutover window.

Repository readiness has advanced since the original issue #158 plan:

- fail-closed auth is implemented;
- safe explicit provisioning is implemented;
- `/api/health` exists;
- `/api/ready` exists;
- `npm start` is the production start contract;
- the disposable PostgreSQL rehearsal exists and proves migrations,
  provisioning idempotence, structural assertions, build, health and readiness
  on an ephemeral PostgreSQL 16 service.

Destructive demo seed is not part of the controlled bootstrap path.

## Repository facts and readiness gaps

These observations were made from the repository at the issue #158 planning
branch, based on main commit `8728c61`. Recheck them against the eventual
reviewed deployment commit; this base commit is not a release approval.

| Area | Evidence and implication |
| --- | --- |
| Runtime | `package-lock.json` locks Next.js 16.3.4 and Prisma/client/adapter 7.9.1. Next declares Node >=20.9.0; Prisma and client accept `^20.19`, `^22.12` or `>=24.0`. ROPES declares Node 26 / npm 11 as the repository validation and controlled-testing runtime contract. Use the same Node major for build and runtime unless a different pairing is explicitly tested and reviewed. |
| Install | CI runs `npm install`, including development dependencies needed for TypeScript, Prisma CLI and build tools. Pull request validation continues to use `npm install`; the release artifact workflow uses `npm ci` against the committed lockfile for reproducibility. Reject unexplained package/lockfile differences. Do not omit development dependencies before generation/build/migrations, or copy a developer's `node_modules` to Argus. |
| Generation/build | `npm run db:generate` runs `prisma generate`; generate before tests/typecheck/build on a clean checkout. `npm run build` runs `next build --webpack`. Generated client output under `node_modules` and `.next` are not source artifacts to commit. Build deployable Linux x86_64 artefacts on Linux for the chosen runtime/platform, not on the macOS sentinel machine. |
| Start | `npm start` is the supported repository entrypoint and runs `next start` against an already-built production application. `npm run dev` is a development server, not the live testing service. Startup must not run migrations, seed data, provisioning, package installation, rebuilds, capability changes or external service calls. |
| Bind address | Installed Next 16.3.4 documents `next start [directory]`, `--port <port>` / `PORT`, and `--hostname <hostname>`; defaults are port 3000 and hostname `0.0.0.0`. Do not expose that default directly. Hera must select a private upstream/interface and explicit port appropriate to the proxy/container arrangement, for example through supported `npm start -- --hostname ... --port ...` arguments. |
| Environment | Use Next's production build/start mode for controlled live testing, while keeping the database/data strictly test-only. Demo fallback is controlled by explicit `ROPES_DEMO_MODE` local/demo configuration rather than missing auth/database configuration. A build passing without runtime credentials is not an authentication or database readiness check. |
| Database | `prisma/schema.prisma` uses PostgreSQL and `prisma-client-js`. `lib/db.ts` uses the PostgreSQL adapter. `prisma.config.ts` reads `DATABASE_URL` and the committed `prisma/migrations` directory. `npm run db:deploy` applies migrations; `db:migrate` is `migrate dev` and belongs to local development. |
| Seed | `prisma/seed.ts` begins with broad `deleteMany` calls before creating demo records. It is destructive, not an incremental live environment update. It is for disposable local/demo data only and is not part of the controlled Argus bootstrap path. |
| Auth/access | `lib/auth-options.ts`, `lib/auth-session.ts`, `lib/read-access-mode.ts` and `lib/demo-session.ts` require explicit local/demo mode for fallback access. Controlled/live use still requires configured auth, `DATABASE_URL`, real users and active memberships. See the access gate below. |
| Operations | `next.config.ts` is empty. There is no repository service manager, deployment workflow or deployment-environment indicator. ROPES now includes minimal anonymous `/api/health` and `/api/ready` endpoints for application-level monitoring only. Architecture suggestions in `architecture.md` are not evidence of an installed Docker or storage setup. |
| Validation | `.github/workflows/pr-validation.yml` runs `Pull request validation` / `Validate` for PRs to main, with Prisma generation before typecheck. It has no database service, migration/seed/smoke test, deployment step or audit gate. Branch protection is a rollout plan, not proof that settings are enabled. |

The [prototype review](prototype-review.md) also documents incomplete user
provisioning, role-specific permissions and capability administration. Its
[Prisma audit follow-up](prototype-review.md#remaining-prisma-family-audit-findings-follow-up-plan)
is a dated snapshot, not a current clearance certificate. Before release,
maintainers must assess the selected lockfile's current audit and record the
decision without forced fixes or dependency changes in this planning slice.

## Authentication and initial access gate

Recommend an Enarah staff/tester-only stage with an outer access restriction
plus configured application authentication. Hera and Enarah must select among
VPN-only, IP allowlisting, reverse-proxy authentication, ROPES authenticated
users only, or a combination. Application-only access is not the recommended
initial choice until approved tester provisioning, role controls and operational
monitoring are proven.

`isAuthenticationConfigured()` requires a non-empty session secret and at least
one configured OAuth provider. Google requires its client ID and secret; Entra
requires its client ID and secret and defaults to a common tenant if the tenant
ID is absent. Enarah must approve the provider/tenant, callback registration and
test accounts. OAuth email must match a ROPES `User.email` with active
organisation membership; seed users are fake and do not create OAuth accounts.
There is no invitation/provisioning UI to fill that gap automatically.

Demo fallback is available only when `ROPES_DEMO_MODE` is explicitly enabled
outside production. Controlled/live mode fails closed when auth is missing,
`DATABASE_URL` is missing, the session has no email, the email is unknown, the
user has no active membership or the requested organisation is outside active
memberships. Therefore merely setting production mode or placing a proxy in
front still does not establish application identity or organisation isolation:
real auth provider configuration, approved test users and active memberships
must be verified before admitting testers.

Before any public exposure, resolve the test-user provisioning and permission
policy. This document does not implement or enable authentication credentials.
If configuration is lost during the restricted stage, Hera must withdraw access
until it is restored and verified.

Repository-side controlled-test user provisioning is handled by the explicit
operator command `npm run provision:user -- ...`. It defaults to dry-run and
requires `--apply` before writing User, Membership, canonical Role,
organisation or explicitly requested capability records. It must not run during
application startup, migration, build or OAuth sign-in. Do not use the
destructive demo seed for controlled/live tester provisioning.

## Environment inventory: names only

Never put actual environment values in issues, PRs, docs, workflow logs or
committed commands. `.env` and `.env*.local` are ignored, but that does not make
all possible environment filenames safe to commit. Hera selects a private
secret store, ownership/permissions and injection method. Do not print
environment dumps, URLs containing credentials, cursor tokens, payloads,
signatures or measured secret lengths.

| Variable/category | Classification | Requirement/decision |
| --- | --- | --- |
| `DATABASE_URL` | Required for live testing | Dedicated PostgreSQL test database; secure ownership, network path, credentials and backup agreed by Hera. |
| `NEXTAUTH_URL` | Required for live testing | Canonical HTTPS application origin matching the test domain and approved provider callbacks. |
| `NEXTAUTH_SECRET` | Required for live testing | Stable private session secret shared by app instances. Restart/reload behaviour and rotation/session invalidation must be agreed. |
| `AUTH_SECRET` | Optional compatibility alias | Code falls back to this only when `NEXTAUTH_SECRET` is absent; an empty primary setting masks it. Prefer one canonical configuration, not conflicting values. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Integration-specific; required if Google is chosen | Existing supported sign-in provider, separately provisioned/approved by Enarah. At least one supported provider must be configured. |
| `MICROSOFT_ENTRA_ID_CLIENT_ID`, `MICROSOFT_ENTRA_ID_CLIENT_SECRET`, `MICROSOFT_ENTRA_ID_TENANT_ID` | Integration-specific; required if Entra is chosen under the agreed tenant policy | Confirm intended tenant restriction rather than silently relying on the code's common-tenant fallback. |
| `APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET` | Required for live testing with APP&B | Stable shared server-only secret, at least 32 UTF-8 bytes. Missing/short production configuration blocks APP&B data loading. Rotation invalidates outstanding cursors; operators refresh the report. Non-production's random process-local fallback is not a live deployment setting. |
| `ROPES_DEMO_MODE` | Must stay disabled for live testing | Optional local/demo-only switch. Leave unset or blank for controlled/live environments; production builds ignore demo mode and fail closed without real auth and database configuration. |
| `NODE_ENV` | Required runtime mode decision | Production mode for build/start; it is not proof that the data or authentication configuration is production-ready. |
| `PORT` | Optional runtime setting | Next CLI supports this; Hera chooses an explicit upstream port. Host/interface is selected with Next's supported `--hostname` option in the service arrangement, not an invented app variable. |
| `FULCRUM_TOKEN_ENCRYPTION_KEY` | Integration-specific; unneeded for initial testing | Needed for real saved-token encryption, which initial testing must not enable. |
| `FULCRUM_CONNECTION_TEST_URL`, `FULCRUM_API_BASE_URL`, `FULCRUM_FORMS_IMPORT_URL`, `FULCRUM_RECORDS_IMPORT_URL` | Integration-specific; unneeded for initial testing | Existing server endpoint overrides. Do not set them to enable unplanned connection tests/imports. |
| AI provider credentials or other new integration secrets | Prohibited/unneeded for initial testing | No AI provider calls or new integrations are required for this deployment plan. |

Cursor configuration is checked in APP&B runtime/read paths; it is not a global
startup readiness check. The panel may report a safe blocked state without
loading report data. Health evidence must test the authorised APP&B route too.

## Verified Hera findings and remaining operational decisions

Record future handover evidence without secrets. These verified findings are
not execution approval and do not make deployment authorised.

Verified Hera findings:

- Argus OS/platform: AlmaLinux 9.8 x86_64.
- Canonical Argus admin hostname: `argus.enarah.com.au`.
- Node 26.9.0 is available.
- npm 11.19.1 is available.
- systemd is the existing service manager for the superseded ROPES service.
- dedicated runtime identity `ropes:ropes` exists.
- working/release layout exists under `/opt/ropes`.
- the old ROPES app listener model was loopback-only at `127.0.0.1:13060`.
- PostgreSQL 16.15 is available on Argus and is loopback-only.
- Plesk/nginx plus Apache currently serve the static-root path for
  `ropes.enarah.net.au`.
- a root-managed environment file mechanism exists.
- journald/Plesk logging exists.
- clean-slate replacement is approved in #171.
- #172 and the new repository runbook govern the future cutover sequence.

Remaining operational decisions and acceptance items:

- exact execution window and explicit DC/Enarah authorisation;
- final capacity/headroom acceptance;
- final deny-by-default access mechanism and allowed principals;
- final Google Workspace OAuth ownership/configuration;
- final Daryl/Accounts role assignments;
- final migration/runtime DB role names and credentials;
- final release artifact, Git SHA and checksum;
- final request-size and timeout policy;
- final monitoring/alert implementation and tested delivery;
- NEW backup retention and RPO;
- isolated restore proof and RTO;
- final rollback-baseline acceptance.

## Production runtime and start contract

The repository-supported production entrypoint is:

```bash
npm start
```

It runs the installed Next 16.3.4 production server command `next start`.
Inspection of the installed CLI confirms that `next start` starts a production
server from an application already compiled with `next build`; it supports
`next start [directory]`, `--port <port>` or `PORT`, `--hostname <hostname>`,
`--keepAliveTimeout`, and standard stdout/stderr logging. It defaults to port
3000 and hostname `0.0.0.0`, so Hera must provide an explicit private listener
choice through the service command/environment and keep the Node listener behind
the nginx/Plesk reverse proxy.

The supported invocation shape is:

```bash
npm start -- --hostname <private-or-loopback-host> --port <private-port>
```

Do not commit hostnames, private IPs, ports or secret values to the repository.
Do not intentionally expose the Node listener directly to the public internet.
Hera owns the eventual systemd/proxy/firewall implementation separately.

The production sequence is deliberately separated:

1. install the reviewed lockfile
2. run `npm run db:generate`
3. run validation, tests and `npm run build`
4. separately run authorised `npm run db:deploy` against the approved database
5. separately run `npm run provision:user` only if approved
6. run `npm start` against the already-built application
7. verify `/api/health`
8. verify `/api/ready`

`npm start` must not install packages, rebuild, generate Prisma output, run
`prisma migrate dev`, run `prisma migrate deploy`, seed data, provision users,
generate demo data, create databases, alter capabilities or call OAuth, Fulcrum,
AI or other external services. Application startup is therefore not database
mutation, migration approval, seed approval, user provisioning or deployment
approval.

Build the deployable artefact on Linux x86_64 for Argus. The macOS sentinel
machine is an administration/control machine, not the source of the deployable
Linux runtime artefact unless that is separately tested and approved. Build and
runtime Node major versions should match; repository validation and controlled
testing use Node 26 and npm 11.

With the current non-standalone Next mode, a reviewed release needs the built
`.next` output, installed `node_modules`, `package.json`, `package-lock.json`,
the generated Prisma client under `node_modules`, `prisma/schema.prisma`,
committed migrations, and any public/static assets. Do not switch to Next
standalone output, create release archives or add deployment automation in this
plan without a separate reviewed issue.

## Release artifact workflow

The repository now includes a manual build-only workflow:

```text
.github/workflows/release-artifact.yml
```

It is triggered with `workflow_dispatch` only. It must be dispatched from
`main`, and the required `expected_sha` input must exactly match the dispatch
commit SHA. This fail-closed check prevents an arbitrary branch build from being
treated as a controlled release.

The workflow:

1. checks the dispatch ref and full SHA;
2. runs on GitHub-hosted `ubuntu-24.04` Linux x86_64;
3. uses Node 26 and requires npm major 11;
4. installs with `npm ci`;
5. runs Prisma generation, tests, typecheck, lint, build, Prisma validation and
   `git diff --check`;
6. packages a `.tar.gz` archive named like
   `ropes-<short-sha>-linux-x64.tar.gz`;
7. creates a SHA-256 checksum and JSON/Markdown release manifests;
8. extracts the archive and proves `npm start` serves `/api/health` on
   `127.0.0.1` with an ephemeral CI port;
9. uploads the archive, checksum and manifests as GitHub Actions artifacts with
   30-day retention.

This is not CD. It does not SSH, SCP, rsync, contact Argus, use GitHub
deployment environments/secrets, create databases, run persistent migrations,
provision users, create OAuth credentials, deploy or mutate DNS/TLS/Plesk/nginx
or systemd.

The artifact intentionally retains the complete `npm ci` dependency tree for
the first controlled cutover. That larger artifact is safer than pruning because
the reviewed cutover procedure still needs `npm run db:deploy` and
`npm run provision:user` outside application startup, and those commands depend
on dev-scoped tools such as Prisma CLI and `tsx`. Do not introduce
`npm prune --omit=dev` until a later reviewed change proves migrations,
provisioning and `npm start` still work from the extracted release.

The artifact is environment-neutral. It must not contain `.git`, `.env`,
`.env.local`, secret-bearing files, database URLs, OAuth values, cursor secrets,
Fulcrum credentials, AI credentials, logs, demo databases or host-specific live
configuration. `NEXTAUTH_URL`, database credentials and other live environment
settings remain Hera-managed environment injection, not artifact content.

Hera later verifies the archive checksum and manifest, stages it under
`/opt/ropes/releases/<release-id>`, applies administrator ownership, gives the
runtime `ropes` user read-only access, keeps writable cache/state separate, and
switches `current` atomically only during authorised cutover. Artifact creation
alone does not satisfy cutover approval, capacity acceptance, access
restriction, DB creation, migrations, secrets, OAuth, provisioning, proxy
changes, monitoring, backup/restore proof or rollback-baseline acceptance.

Standard Next startup writes normal process logs to stdout/stderr and handles
SIGINT/SIGTERM cleanup itself before exiting with signal-based exit codes.
Prefer that standard behaviour. Do not add PM2, custom wrappers, file-based app
logs or custom signal handling unless a later issue demonstrates a repository
requirement. Logs must not include database URLs, session/cursor secrets, OAuth
tokens, APP&B values, request-header dumps or culturally sensitive/operational
record content.

## Database and safe test data plan

Hera must confirm a dedicated test database, credentials/ownership, PostgreSQL
version, access restrictions, available storage and backup/restore procedure.
Keep application access separate from migration privileges where the agreed
architecture supports it. Check the target privately; do not paste its URL as
evidence. No database is created or contacted by this planning work.

The repository now includes a dedicated `Disposable PostgreSQL rehearsal`
workflow for this proof. It is separate from normal pull request validation and
uses a PostgreSQL 16 GitHub Actions service container with synthetic ephemeral
credentials. It can be run manually with `workflow_dispatch` and also runs on
pull requests that touch the rehearsal workflow, Prisma schema/migrations,
provisioning, package/runtime, health/readiness or assertion paths. The service
container is destroyed with the job and must never become the Argus ROPES
database, a persistent staging database or a source of operational records.

The rehearsal sequence is: install the reviewed lockfile, run
`npm run db:generate`, validate the schema, inspect migration status on the
fresh database, apply committed migrations with `npm run db:deploy`, verify
status is clean, run `npm run db:deploy` a second time to prove idempotence,
then verify status again. It deliberately does not run `db:migrate`, reset,
`db push`, manual SQL or the destructive demo seed.

Provisioning proof uses only synthetic records:

- organisation `ROPES Rehearsal Organisation` / `ropes-rehearsal`, type
  `ENARAH`, `isDemo=false`
- user `ROPES Rehearsal Admin` / `rehearsal.admin@example.test`, `isDemo=false`
- role `Enarah Admin`
- membership status `ACTIVE`

The workflow first runs `npm run provision:user` without `--apply`, asserts the
dry-run wrote no synthetic records, then applies the same command, asserts the
expected organisation/user/membership/role state, repeats dry-run/apply to prove
idempotence, and reasserts no duplicates. No capabilities are enabled in the
minimum rehearsal, APP&B stays disabled, and no trips, vehicles, grants,
APP&B values, Fulcrum records, audit logs or other operational rows are created.

After migration/provisioning proof, the workflow builds the app, starts the
built application with `npm start -- --hostname 127.0.0.1 --port <test-port>`,
and verifies `/api/health` plus `/api/ready` using synthetic CI-only auth
configuration and the disposable database. It does not contact Google,
Microsoft, Fulcrum, AI providers or any production service. Passing the
rehearsal is evidence for the repository path only; it does not authorise
deployment, Argus changes, database creation, real-user provisioning or public
exposure.

Future live-test migration rehearsal against an approved target remains a
separate authorised operation. Do not run `db:migrate`, reset, or create new
migrations on the live test server. Back up before migration and confirm
database/app compatibility on restoration.

Seed only a confirmed disposable local/demo target with approved fixtures after
a backup. The destructive demo seed is not part of the controlled bootstrap
path and must not be run against Argus or a controlled/live database. Use the
explicit provisioning tool for controlled users instead.

Initial data must be synthetic, approved demo data or explicitly safe fixtures.
Do not load production, Traditional Owner, client, ranger personnel, cultural,
grant financial, real APP&B or Fulcrum data/credentials. Any later exception
requires a separately approved scope. Fake manual-field values belong only in
the authorised editing context; review/history remains value-free. No real data
is required for validation.

The existing [APP&B local runbook](appb-reporting.md#local-disposable-database-smoke-test-runbook)
and [manual checklist](appb-reporting.md#local-seed-smoke-test-checklist) provide
fixture checks, not authority to seed Argus. `npm run smoke:appb` expects the
pristine demo organisation `ropes-demo-aboriginal-corporation`, one current
mapping decision and five history events. Run it in the rehearsal immediately
after seed; later edits can legitimately break its fixture assumptions.

## Domain, service and operations agreement

For `ropes.enarah.net.au`, the clean-slate cutover plan targets a future path:

```text
internet
→ Plesk-managed nginx
→ http://127.0.0.1:13060
```

That replaces the current static-root path only during separately authorised
cutover. Hera must confirm DNS destination, reverse-proxy route, trusted
forwarded headers, private upstream host/port, TLS issuance/renewal,
HTTP-to-HTTPS redirect, request-size/timeout policy and firewall/access policy.
Do not disable origin checks to bypass failures. Do not expose a dev server for
hot reload.

The chosen service manager must support explicit build/start working
directories, private environment injection, controlled shutdown, restart,
automatic startup after reboot, log capture, crash recovery and return to a
previous release. Specify restart limits and how secret changes are loaded.
Hera's inspection confirmed an existing superseded systemd service. A future
service should retain compatible concepts such as a dedicated `ropes:ropes`
identity, loopback-only listener and useful hardening, but the current Node
24/direct-Next service is not the future contract. Do not add configuration
from this readiness document.

Minimum monitoring covers process health, startup failure, HTTP availability,
database connectivity failures, application errors, disk usage and backup
status. Hera selects existing tools and alert ownership; no new external
service is added. A successful HTTP response from `/` alone is insufficient:
the app can return an access-unavailable state. Use `/api/health` for a
liveness signal and `/api/ready` for coarse application-level readiness, then
pair those transport checks with authenticated route/data checks using safe
fixtures.

The monitoring endpoints are deliberately small and anonymous:

| Endpoint | Success behaviour | Failure behaviour | Scope limits |
| --- | --- | --- | --- |
| `GET /api/health` | HTTP 200 with `{ "status": "ok" }` when the app process can execute the route. | No dependency checks are performed by design. | No database, auth, session, tenant, APP&B, OAuth, Fulcrum, AI or other external calls. |
| `GET /api/ready` | HTTP 200 with coarse `ok` checks when database configuration/reachability, authentication configuration and explicit demo-mode checks pass. | HTTP 503 with `status: "not_ready"` and safe categories such as `database_unconfigured`, `database_unavailable`, `authentication_unconfigured` or `demo_mode_enabled`. | Does not reveal `DATABASE_URL`, hosts, users, OAuth/client/session/cursor secrets, SQL errors, stack traces, tenant/user data, capability assignments or APP&B values. It does not call OAuth providers, Fulcrum or AI providers. |

These endpoints do not replace Hera's systemd/process, reverse-proxy/TLS,
PostgreSQL, disk, backup, log and external HTTPS monitoring. APP&B-specific
operator checks remain in the authenticated APP&B readiness panel.

Logs must exclude database URLs, session/cursor secrets, API tokens, headers
containing credentials, sensitive APP&B values and cultural information. Agree
retention, rotation, access and redaction before startup. Inspect failures in a
restricted context; share only safe pass/fail categories, never raw environment,
request, auth or audit payloads. Record the test domain, approved release and
synthetic organisation as environment evidence; there is no dedicated live-test
banner today, so confirm how testers will recognise the environment before go-live.

Before the first migration/deployment, require a database backup (including an
empty baseline where applicable), protected configuration backup and a known-good
prior application release/commit. For the very first deployment with no prior
running ROPES, document that fact and agree withdrawal of the new service/access
plus restoration of the baseline as the fallback. Never invent a previous release.

Hera must provide the exact rollback procedure for the selected architecture and
identify the rollback decision owner. App rollback alone does not undo database
migrations: test restoring a compatible database/configuration snapshot or an
explicitly reviewed recovery path. Success requires the expected release running
(or safely withdrawn), compatible restored data, working approved access,
unauthorised access denied, tenant/capability checks passing, preserved safe test
records, no secret leakage and a still-available backup. Record evidence and
recovery time without values or credentials. Do not use seed/reset as rollback.

## CI, release and feature boundaries

Deploy only a specifically identified reviewed/merged commit with passing
`Pull request validation` / `Validate` evidence. Record the immutable commit and
any agreed tag/release; a moving `main` reference alone is not a rollback plan.
A repository administrator must confirm branch protection is enabled or record
an explicit deferral under the [rollout plan](prototype-review.md#pull-request-validation-branch-protection-rollout-plan).
Deployment must not bypass PR validation. Choose a release/build artifact strategy
with Hera before use; no automatic GitHub deployment is added here.

The existing validation sequence is:

```bash
npm install
npm run db:generate
npm test
npm run typecheck
npm run lint
npm run build
npx prisma validate
git diff --check
```

This is repository validation, not server, auth, backup or migration evidence.
Keep generated output and credentials out of source control. Dependencies,
schema, migrations, seed data and CI remain unchanged by this plan.

The current `tests/` suite covers APP&B cursor/history, note safety and readiness
helpers; it does not prove end-to-end session, tenant or capability enforcement
on deployed routes/actions. Arrange those negative access checks during the
approved rehearsal and track any required test implementation separately.

APP&B stays a manual-field/review/history foundation. Workbook export remains
blocked: no XLSX generation or uploaded template storage. Tenant and capability
guards remain required, including `reporting`, `reporting.appb`, `grants` and
`grants.appb`. No cross-organisation access or financial/workbook/manual-value
leakage into compact summaries, notes, history or audit observations is allowed.
Manual values render only inside authorised editing. Rejected unsafe review
notes are neither stored nor redisplayed; only safe reason/count metadata is
available. Current decisions, three newest history events and per-target older
history stay separate from rejected-note counts. Cursor secrets stay server-side;
operators refresh after stale cursors rather than inspecting or printing tokens.

Fulcrum has existing manual connection-test/import code that can call external
endpoints if configured; it is not merely a placeholder. Initial testing must
not introduce tokens, saved live connections, endpoint overrides or unplanned
sync/import activity. Keep capabilities/access restricted as agreed and use
safe placeholders only. AI remains optional/provider-agnostic and separately
scoped, with no provider calls added. No external integration is needed merely
to make ROPES run; the existing approved authentication provider is the explicit
sign-in dependency, not permission to add other integrations.

## Pre-deployment go/no-go checklist

Each item needs an owner and safe evidence in the eventual handover. All boxes
are intentionally unchecked. Any unsatisfied required item means **NO-GO**.

- [ ] Selected reviewed/merged commit/release identified; PR validation passes.
- [ ] Branch protection enabled or consciously deferred by a repository administrator.
- [ ] Hera has reviewed the handover and answered the infrastructure questions.
- [ ] Argus OS, Node/npm/runtime compatibility and storage constraints confirmed.
- [ ] Node 26 / npm 11 build and runtime contract accepted, or a separately tested exception recorded.
- [ ] Reviewed Linux x86_64 build artefact strategy agreed; no macOS sentinel build is treated as the deployable artefact.
- [ ] Deployment method, directory, service user and start/restart/reboot behaviour agreed.
- [ ] `npm start` service invocation agreed with explicit private host/port using supported Next options.
- [ ] Private upstream, reverse proxy, headers and firewall/access approach agreed.
- [ ] DNS destination and TLS issuance, renewal and redirect confirmed.
- [ ] Dedicated test database and credentials ready; target privately verified.
- [ ] Database/configuration backup and recovery ownership confirmed.
- [ ] Environment variables securely provisioned; production-mode cursor configuration valid.
- [ ] `ROPES_DEMO_MODE` left unset/blank; authenticated mode verified; no demo fallback visible in controlled/live access checks.
- [ ] `/api/health` and `/api/ready` monitoring expectations agreed, with only safe coarse response categories shared.
- [ ] Safe test users provisioned with intended active memberships and no unintended access, using the explicit provisioning command rather than the destructive demo seed.
- [ ] Safe fixture set approved; seed invocation rehearsed and destructive behaviour understood.
- [ ] No production/client/cultural/grant data or live Fulcrum credentials loaded.
- [ ] Migrations tested on a disposable target and selected database state verified.
- [ ] Rollback documented/rehearsed, with compatible prior release or first-deployment withdrawal plan.
- [ ] Tenant read/write isolation tests and unauthorised-access tests passing.
- [ ] Capability boundary tests passing, including the four APP&B capabilities.
- [ ] APP&B export blocked, values confined to editing, review/history value-free.
- [ ] Logging/redaction, rotation, monitoring, alert owner and backups confirmed.
- [ ] Enarah/Hera approve the internal access restriction and environment identification.
- [ ] Current dependency findings reviewed for the selected release; residual risk decision recorded.

## Planned post-deployment smoke test

Hera and an approved tester perform these only after a separately authorised
deployment. Record safe result categories and release identity, not record
contents, raw logs or credentials. Stop access and use the agreed recovery
procedure if a security boundary fails.

- [ ] HTTPS and HTTP redirect work; certificate/domain match; environment/release and synthetic organisation are identifiable.
- [ ] `/api/health` returns the expected liveness response and `/api/ready` reports ready only after required database/auth/demo-mode checks pass.
- [ ] Approved sign-in works, resolves a real session and correct active memberships, without demo fallback.
- [ ] Signed-out, unknown and inactive users cannot read/write organisation data; test direct routes/actions, not just navigation.
- [ ] Switching or tampering with another organisation's identifiers does not expose or change its records.
- [ ] Disabled capabilities block both page access and relevant writes; granted capabilities work.
- [ ] Dashboard `/`, `/trips` and `/vehicles` load for the intended organisation; placeholder content is recognised as such.
- [ ] `/reports/appb?org=ropes-demo-aboriginal-corporation` loads only for authorised membership/capabilities, when that approved fixture is used.
- [ ] APP&B readiness rows reflect working database/auth/cursor configuration; report fixtures appear.
- [ ] Manual values stay within editing; current mapping metadata and three initial history events are value-free; two older seeded events load where the fixture remains pristine.
- [ ] Rejected-note counts show safe metadata without rejected text; workbook export stays unavailable.
- [ ] Safe create/update flows work on synthetic trips/vehicles/manual fields, and persisted changes survive refresh and service restart.
- [ ] Logout/session behaviour denies subsequent protected operations as intended.
- [ ] Process health, database connectivity, disk/backup monitoring and logs meet the agreed expectations without value/secret leakage.
- [ ] Restart/reboot recovery and rollback pathway remain available; backup/restore evidence is retained safely.

## Future Hera handover block

Copy and complete this block only after review; unresolved fields remain NO-GO.

| Handover item | Repository position / Hera confirmation required |
| --- | --- |
| App/domain/server | ROPES controlled testing at `ropes.enarah.net.au` on Argus. Hera operates from the sentinel machine and administers Argus remotely. |
| Source/release | `https://github.com/enarah/ropes`; deployment commit/tag/release **unselected**. Supply reviewed immutable SHA and passing Validate link. |
| Runtime | Node 26 / npm 11 is the repository validation and controlled-testing runtime contract; lockfile engine constraints above. Hera confirms OS, Node/npm, service user, storage and deployment method. |
| Environment names | `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET`, `NODE_ENV`; `ROPES_DEMO_MODE` explicitly unset/blank; chosen Google or Entra variable names from the inventory; optional `PORT`. No values. No Fulcrum/AI credentials for initial testing. |
| Database | Dedicated test PostgreSQL, approved credentials/ownership, safe fixtures, tested backup/restore. Hera confirms location/version; seed/provisioning gaps must be resolved. |
| Generate/migrate | Future approved rehearsal: `npm run db:generate`, `npx prisma validate`, `npx prisma migrate status`, `npm run db:deploy`, then status again. No `migrate dev` or seed on existing live test data. Migrations are not part of `npm start`. |
| Build/start | `npm run build`, then `npm start` from the built release. Hera supplies explicit private host/port with supported Next `--hostname`/`--port` or `PORT` options, working directory, environment and service arrangement. `npm start` does not rebuild, migrate, seed or provision. |
| Health | `/api/health` is liveness; `/api/ready` is coarse application readiness and may be HTTP 503 while the process is running. Pair endpoint checks with authenticated route/DB/APP&B checks, process/disk/backup monitoring and safe error categories. Hera chooses check tooling and alert owner. |
| Safety | Staff/test users only, synthetic data, tenant/capability guards, value-free review/history, rejected notes unstored, export/XLSX/template storage blocked, no new AI/Fulcrum integration. |
| Decisions outstanding | All Hera questions above, public-exposure gate, provisioning, seed invocation, release method, environment identification and initial access policy. |
| Rollback | Hera provides command/process, decision owner, prior release or withdrawal baseline, protected DB/config backups and successful recovery evidence before deployment. |

Next steps are review of this plan, Hera's infrastructure answers, separately
scoped fixes for confirmed repository gaps, an approved disposable rehearsal,
and completion of the go/no-go evidence. Only then seek a separate deployment
decision from Enarah and Hera. This PR does not send the handover to Hera.

No SSH, server/DNS/TLS/proxy/database changes, secrets, deployment scripts,
service/container configuration, deployment workflow or application changes are
part of issue #158. Subsequent implementation and server operations require
separately scoped work after this handover has been reviewed.
