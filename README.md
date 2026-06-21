# ROPES

**Ranger Operations Platform for Enarah Services**

ROPES is a multi-organisation operations platform for Enarah and partner ranger organisations. It is intended to bring together trips, vehicles, ranger operations, projects, reporting, compliance, people, and Fulcrum field data into one secure dashboard.

## Current status

This repository now contains the first ROPES application foundation: a
Next.js, TypeScript and Tailwind dashboard shell, placeholder module
navigation, demo dashboard content, an initial Prisma data model and
tenant-guarded persistence for core trip and vehicle booking workflows when a
local database is configured, and an Auth.js/NextAuth foundation for resolving
signed-in users to organisation memberships.

The first implementation stream will establish:

- product and architecture documentation
- multi-tenant data model
- role-based permissions
- dashboard shell
- demo organisation and demo data
- trips and vehicles MVP
- Fulcrum integration module shell
- AI assistant design for Fulcrum and ROPES data

## Local setup

Requirements:

- Node.js 20 or newer
- npm

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Open http://localhost:3000 to view the dashboard shell.

Useful checks:

```bash
npm run typecheck
npm run build
npm run lint
```

## Database setup

ROPES uses Prisma with PostgreSQL for the initial data model.

Create a local environment file from the example:

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env` for your local PostgreSQL database. The
example value is a placeholder only and does not contain real credentials.

Generate the Prisma client:

```bash
npm run db:generate
```

Apply the initial migration to a local development database:

```bash
npm run db:migrate
```

Seed clearly fake demo data:

```bash
npm run db:seed
```

The seed creates fake organisations, users, memberships, roles, projects,
ranger programs, trips, vehicles, bookings, Fulcrum placeholders and audit
logs. It does not create authentication accounts, store Fulcrum tokens or call
external APIs.

For deployment-style environments, use:

```bash
npm run db:deploy
```

## Authentication setup

ROPES uses Auth.js/NextAuth with JWT sessions for the initial authentication
foundation. Authentication is enabled only when a session secret and at least
one OAuth provider are configured.

Add local values to `.env`:

```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-local-secret"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
MICROSOFT_ENTRA_ID_CLIENT_ID=""
MICROSOFT_ENTRA_ID_CLIENT_SECRET=""
MICROSOFT_ENTRA_ID_TENANT_ID=""
```

Generate a local secret with a command such as:

```bash
openssl rand -base64 32
```

The signed-in OAuth email must match a `User.email` in the ROPES database.
Only active memberships for that user are exposed to the organisation switcher
and tenant guards. If auth providers are not configured, the local prototype
keeps the clearly labelled fake/demo session fallback for development.

When both authentication and `DATABASE_URL` are configured, organisation-scoped
dashboard, Trips, Vehicles and Fulcrum pages check the signed-in user's active
membership before loading server-side organisation data. Users without access
see an unauthorised state instead of fake fallback data. Local demo fallback is
kept only for development when authentication or the database is not configured.

## Fulcrum token encryption setup

ROPES can store a per-organisation Fulcrum API token encrypted at rest for the
connection setup flow. This does not run sync jobs or import Fulcrum records.

Add a local encryption key to `.env` before saving tokens:

```bash
FULCRUM_TOKEN_ENCRYPTION_KEY="base64-encoded-32-byte-key"
```

Generate a local key with:

```bash
openssl rand -base64 32
```

The raw token is encrypted before database storage and is never returned to the
client after save. The UI only shows connection status, account label, last
checked time and a masked token hint.

Saved Fulcrum connections can be tested from the server after tenant access is
confirmed. The test decrypts the token server-side only, calls a low-risk
credential-check endpoint, then stores safe metadata such as `lastCheckedAt`,
connection status, a safe result category and an account label/name when
returned safely. The default endpoint can be overridden for local testing:

```bash
FULCRUM_CONNECTION_TEST_URL="https://api.fulcrumapp.com/api/v2/users.json"
```

Connection tests do not sync Fulcrum records, import apps/forms or expose raw
tokens. Failed tests store safe categories such as missing token, missing
encryption key, token rejected, rate limited, network error or upstream
unavailable. Audit entries record safe success/failure categories only.

## Fulcrum sync job placeholders

Tested Fulcrum connections can queue organisation-scoped sync job status
records from the Sync Settings page. This is a status framework only: the
placeholder action creates a queued job linked to the organisation, Fulcrum
connection and requesting user, then records safe audit metadata.

Sync job placeholders do not call Fulcrum, import records, import apps/forms,
store Fulcrum response payloads, run background workers or schedule cron jobs.
Recent job status is shown in the Fulcrum UI with safe timestamps, status and
summary metadata only.

## Fulcrum manual import MVP

ROPES can run a small manual Fulcrum import from the Sync Settings page when a
database, authentication, token encryption and a tested Fulcrum connection are
configured. The import uses the authenticated tenant guard path, decrypts the
saved Fulcrum token on the server only, imports selected app/form metadata
before records, and caps each run at 100 records by default.

The first import stores organisation-scoped `FulcrumApp` and `FulcrumRecord`
rows, preserves external Fulcrum IDs, and updates records only within the same
organisation, connection and external record ID scope. Records without GPS are
stored with null coordinates and a safe `missing_gps` data-health flag. Project
and trip links remain empty unless a later safe mapping step sets them.

The import stores only deliberate safe record metadata and a small filtered
form-values preview for later mapping/debugging. It validates selected app IDs,
checks app/form and record payload shape before writing, skips unsupported
malformed records where possible, and reports safe skipped counts in sync job
metadata.

`rawJson.formValuesPreview` is capped at 25 fields, and string previews are
capped at 240 characters. Likely sensitive form value keys are filtered before
storage when they contain terms such as password, token, secret, api key,
licence, license, medicare, passport, date of birth, dob, phone, email,
address, bank, account, bsb, card, signature, photo, image or attachment.

The import does not store raw or encrypted tokens, request headers, media
blobs, full unfiltered Fulcrum API responses, clearly sensitive preview values
or secret metadata in records, UI, audit logs or sync job metadata.

The default read-only Fulcrum import endpoints can be overridden for local
testing:

```bash
FULCRUM_API_BASE_URL="https://api.fulcrumapp.com/api/v2"
FULCRUM_FORMS_IMPORT_URL="https://api.fulcrumapp.com/api/v2/forms.json"
FULCRUM_RECORDS_IMPORT_URL="https://api.fulcrumapp.com/api/v2/records.json"
```

Manual imports update Fulcrum sync job status through queued, running,
succeeded or failed states and write safe audit events for import start,
app/form metadata import, record import, failure and completion. Recent job UI
shows safe observability counts for records imported, records updated, records
skipped, missing GPS and filtered sensitive field previews. This is not a
background worker, scheduled sync system, media import, Fulcrum App Builder
write path or broad sync engine.

## Audit logging

Persisted trip create/update, trip approval transitions, vehicle booking
create, server-side vehicle booking overlap rejection, Fulcrum connection
save/update/disable, Fulcrum connection test success/failure actions, and
manual Fulcrum sync job placeholder creation/rejection write
organisation-scoped audit entries after tenant access has been confirmed.
Audit entries record the organisation, actor user when available, action,
target record type, target record ID when available, timestamp and safe
metadata.

Audit metadata deliberately avoids raw Fulcrum API tokens, encrypted token
values, auth/provider tokens, API keys, environment variables, full request
payloads and full trip approval note text. Audit writes are best-effort for
this prototype: if an audit insert fails after the primary operational write
succeeds, the user workflow continues.

## App foundation

The current app includes:

- Next.js App Router project files
- TypeScript configuration
- Tailwind configuration with ROPES/Enarah colours
- Mobile-friendly dashboard layout
- Navigation for all core ROPES modules
- Demo organisation switcher with organisation-scoped mock data views
- Auth.js/NextAuth foundation with Google and Microsoft Entra ID provider
  configuration through environment variables only
- Signed-in user resolution from OAuth email to the app `User` record and
  active organisation memberships
- Route-level access blocking for dashboard, Trips, Vehicles and Fulcrum pages
  when authentication and the database are configured
- Trips MVP with Prisma-backed core trip reads/create/update when
  `DATABASE_URL` is configured, plus demo fallback when no database is
  available
- Structured trip participant, vehicle allocation and itinerary rows persisted
  as organisation-scoped records, with row order preserved and vehicle
  allocations linked to matching organisation vehicles where practical
- Trip approval workflow foundation with tenant-guarded transitions from draft
  to ready for review, approved, changes requested or cancelled, including
  minimum review validation and safe audit entries
- Plain-text trip approval notes for approval transitions, including required
  change-request and cancellation reasons, safe author/timestamp display and
  server-side length limits
- Vehicles MVP with Prisma-backed vehicle and booking reads, tenant-guarded
  booking creation, server-side overlap enforcement for persisted booking
  writes, booking list/calendar view, client-side overlap warning and pre-start
  status placeholders
- Fulcrum module shell with in-memory demo overview, connections, apps/forms,
  field records, maps, data health, AI assistant, app builder and sync settings
  pages, plus encrypted per-organisation token storage and server-side
  credential testing for connection setup
- Organisation-scoped Fulcrum sync job status placeholders for tested
  connections and capped manual Fulcrum app/form and record imports for
  selected app IDs, without background sync workers
- Organisation-scoped audit logging for the first persisted trip, trip approval,
  vehicle booking and Fulcrum connection writes
- Placeholder summary cards and module panels using clearly fake demo content

This milestone intentionally does not include user invitation/provisioning,
role-specific permission rules beyond active memberships, an audit log viewer,
user-linked trip participants, approval notifications, vehicle
record create/edit forms, full server-side booking calendar/scheduling
features, real pre-start checklists, broad Fulcrum sync, media/photo import,
Fulcrum app writes, background workers, scheduled sync, AI provider calls, API
keys or external service credentials beyond local environment configuration.
Persisted writes and manual Fulcrum imports use Auth.js sessions when
configured, or the clearly labelled fake/demo session fallback when auth is not
configured for local development.

## Build principles

- Organisation-scoped data from day one
- No secrets committed to the repo
- Small reviewable pull requests
- Mobile-friendly field operations UI
- Demo data clearly marked as fake
- External-server deployable architecture
