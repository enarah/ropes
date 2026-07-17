# ROPES

**Ranger Operations Platform for Enarah Services**

ROPES is a multi-organisation operations platform for Enarah and partner ranger organisations. It is intended to bring together trips, vehicles, ranger operations, projects, reporting, compliance, people, and Fulcrum field data into one secure dashboard.

## Current status

This repository now contains the first ROPES application foundation: a
Next.js, TypeScript and Tailwind dashboard shell, placeholder module
navigation, demo dashboard content, an initial Prisma data model and
tenant-guarded persistence for core trip and vehicle workflows when a local
database is configured, and an Auth.js/NextAuth foundation for resolving
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
ranger programs, organisation capability toggles, trips, trip risk
assessments, vehicles, bookings, vehicle pre-starts, vehicle defects, vehicle
maintenance records, Fulcrum placeholders and audit logs. The demo partner also
has APP&B capabilities, fake grant/report records, safe manual-field examples,
a current mapping decision, five value-free history events and value-free
rejected-note reason metadata. This exercises the three-event default and
per-target load-more without storing rejected text or real workbook/manual
values. The seed does not create authentication accounts, store cursor/Fulcrum
secrets, store AI provider credentials or call external APIs.

For deployment-style environments, use:

```bash
npm run db:deploy
```

Production deployments must also set one stable, server-side APP&B history
cursor secret on every application instance:

```bash
APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET="generate-with-openssl-rand-base64-32"
```

Generate it with `openssl rand -base64 32`. ROPES validates this setting when
the APP&B reporting overview is loaded in production and raises a server-side
configuration error if it is missing or shorter than 32 UTF-8 bytes. Keep the
same secret across instances. Rotating it safely invalidates outstanding
history cursors, so users must refresh the report to receive a newly signed
cursor. The secret is never returned to the client.

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

### APP&B production readiness

Before enabling APP&B review/history in production, operators must:

- configure and migrate `DATABASE_URL`
- configure `NEXTAUTH_URL`, `NEXTAUTH_SECRET` and a supported OAuth provider
- give each authorised user an active membership for the organisation
- enable `reporting`, `reporting.appb`, `grants` and `grants.appb` for that
  organisation
- configure one stable, server-side
  `APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET` of at least 32 UTF-8 bytes on
  every app instance
- confirm review/history responses remain value-free and rejected unsafe note
  text is neither stored nor exposed
- confirm manual APP&B values remain in authorised editing contexts and are not
  copied into review/history metadata
- acknowledge that workbook export, XLSX generation, uploaded template
  storage, AI calls, APP&B-specific external services and a broad audit-log
  browser remain blocked or unsupported

Secret rotation safely invalidates outstanding APP&B history cursors; users
must refresh the report afterward. The complete operator and safe-data
checklist is in the
[APP&B reporting guide](docs/appb-reporting.md#production-readiness-checklist).

Authorised operators can also use the compact runtime readiness panel on
`/reports/appb?org=...` to confirm database access, active tenant membership,
the four required capabilities, safe cursor-signing status, report presence and
value-free history support. The panel exposes status wording only: it never
shows secrets, workbook/manual values or rejected unsafe note text, and it
continues to mark workbook export and XLSX generation as blocked.

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

Persisted trip create/update, trip approval transitions, trip risk assessment
creation/update, vehicle booking create, server-side vehicle booking overlap
rejection, vehicle pre-start submission, vehicle defect submission, vehicle
maintenance record creation, Fulcrum connection save/update/disable, Fulcrum
connection test success/failure actions, and manual Fulcrum sync job
placeholder creation/rejection write
organisation-scoped audit entries after tenant access has been confirmed.
Audit entries record the organisation, actor user when available, action,
target record type, target record ID when available, timestamp and safe
metadata.

Audit metadata deliberately avoids raw Fulcrum API tokens, encrypted token
values, auth/provider tokens, API keys, environment variables, full request
payloads, full trip approval note text and full vehicle defect descriptions.
Trip risk assessment and vehicle maintenance audit metadata store safe counts,
flags, selected codes and note lengths, not full free-text controls, medical
notes, emergency contact details or maintenance notes.
Audit writes are best-effort for this prototype: if an audit insert fails after
the primary operational write succeeds, the user workflow continues.

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
- Organisation capability-toggle foundation with stable module/capability keys,
  seeded defaults, capability-aware navigation, disabled feature states and
  proof checks for Trips TMP/JMP risk assessment and Vehicles maintenance
- Tenant access and capability access are separate: tenant guards decide who
  can access an organisation, while capabilities decide which features are
  enabled for that organisation
- AI provider abstraction placeholder for future no-provider, local LLM and
  frontier/cloud provider modes, with no provider calls, API keys or stored
  credentials
- APP&B reporting planning foundation with optional `reporting.appb`,
  `reporting.funderTemplates`, `grants.appb` and `grants.progressReporting`
  capability keys, a gated Reporting placeholder page and code-level template
  profile references for future NIAA/DCCEEW workbook mapping
- Grants and APP&B data model foundation with organisation-scoped `Grant`,
  `GrantReportingPeriod` and `AppbReport` records, demo data for multiple
  grants/reporting periods and a capability-gated read-only APP&B overview
- APP&B template mapping metadata foundation with code-level template versions,
  expected sheets, sections, fields, repeatable tables, manual/formula-protected
  field flags and export-readiness blockers, without parsing or generating XLSX
  files
- Local APP&B workbook inspection tooling via `npm run appb:inspect`, producing
  reviewed JSON/Markdown structural summaries without committing source
  workbooks or running XLSX parsing in app runtime
- Verified APP&B workbook mapping metadata with reviewed sheet inventories,
  common sections, formula-protected placeholders, manual-only areas and
  repeatable table candidates while keeping exact cell/range mapping and export
  blocked
- Read-only APP&B report readiness summaries on `/reports/appb`, showing safe
  status counts, top blockers and next actions for each report without exposing
  finance, personnel, narrative or workbook values
- Tenant- and capability-gated APP&B runtime readiness panel with value-free
  database, membership, capability, cursor-configuration, report-presence and
  history-support status, while workbook export remains visibly blocked
- APP&B manual report field capture foundation with organisation-scoped
  `AppbManualFieldValue` records, bounded status/type/sensitivity values,
  safe summary counts, guarded updates and audit metadata without exposing raw
  sensitive values in compact cards
- APP&B manual field UX refinement with grouped editing cards, status and
  sensitivity labels, and field-type-specific inputs while keeping compact
  summaries value-free and export blocked
- APP&B manual field value preservation that preloads existing values only in
  the editing context, preserves values on status-only changes and keeps
  compact summaries value-free
- APP&B manual field explicit clear controls for intentionally clearing values,
  notes or both while keeping compact summaries and audit metadata value-free
- APP&B exact workbook range mapping metadata with safe status counts for
  review-needed, formula-blocked, hidden-sheet and repeatable targets while
  workbook export remains blocked
- APP&B repeatable table range metadata with review-gated header/data/formula
  row concepts, manual-only row groups and expansion-rule summaries
- APP&B workbook mapping review workflow foundation with value-free review
  decisions and compact metadata-only summaries for field mappings and
  repeatable ranges, while workbook export remains blocked
- APP&B persisted mapping review decisions with report-scoped saves, short
  value-free notes, reviewer identity, reviewed timestamps and safe audit
  metadata while workbook export remains blocked
- APP&B mapping review note safety guardrails with deterministic server-side
  checks, generic rejection feedback and value-free audit metadata for rejected
  unsafe notes
- APP&B review note safety tuning with a reusable validation helper and
  deterministic tests for allowed metadata notes and rejected fake unsafe notes
- APP&B mapping review history foundation with current value-free review
  decision details and rejected-note reason counts while workbook export remains
  blocked
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
- Trip Risk Assessment and Journey Management Plan foundation with a
  persisted organisation-scoped `TripRiskAssessment` model, trip-scoped TMP/JMP
  form, Enarah trip-type and activity-risk classification, base/final risk
  calculation, standard risks/mitigations/reference display, journey equipment,
  traveller, daily check-in and emergency guidance fields, and safe audit
  metadata
- Trips list workflow filters for approval state, trip status, timing and
  needs-action views, with count chips and short safe review-note previews
- Lightweight Trips summary cards for organisation-scoped operational counts
  with links into the existing filtered Trips list
- Vehicles MVP with Prisma-backed vehicle and booking reads, tenant-guarded
  vehicle create/update forms, booking creation/update, server-side overlap
  enforcement for persisted booking writes, vehicle booking detail/edit pages,
  vehicle register status filters, compact fleet summary counts, booking
  status/timing filters, compact booking summary counts, booking count
  visibility, booking list/calendar view, client-side overlap warning and
  tenant-guarded pre-start checklist submissions with latest status display
- Vehicle defect reporting foundation with a persisted organisation-scoped
  `VehicleDefect` model, vehicle-scoped report form, tenant-guarded create
  action, tenant-guarded status update action, optional pre-start link, short
  description validation, short status note validation, safe audit metadata and
  open/latest defect count/status visibility on register and detail screens
- Vehicle maintenance record foundation with a persisted organisation-scoped
  `VehicleMaintenanceRecord` model, vehicle-scoped create form, optional defect
  link, short note validation, safe audit metadata and latest/recent
  maintenance visibility on register and detail screens
- Fulcrum module shell with in-memory demo overview, connections, apps/forms,
  field records, maps, data health, AI assistant, app builder and sync settings
  pages, plus encrypted per-organisation token storage and server-side
  credential testing for connection setup
- Organisation-scoped Fulcrum sync job status placeholders for tested
  connections and capped manual Fulcrum app/form and record imports for
  selected app IDs, without background sync workers
- Organisation-scoped audit logging for the first persisted trip, trip approval,
  vehicle booking, vehicle pre-start, vehicle defect, vehicle maintenance and
  Fulcrum connection writes
- Placeholder summary cards and module panels using clearly fake demo content

This milestone intentionally does not include user invitation/provisioning,
role-specific permission rules beyond active memberships, an audit log viewer,
admin UI for managing capabilities, shared vehicles across organisations,
user-linked trip participants, approval notifications, vehicle maintenance work
orders, maintenance scheduling, decommission workflows, vehicle booking
approval workflow, automatic booking blocking from defects or maintenance, trip
dashboards, reporting, full server-side booking calendar/scheduling features,
APP&B workbook export, verified production cell/range mapping,
budget/acquittal finance logic, a full Grants module,
PDF/DOCX TMP/JMP export, live SPOT/GARMIN tracking, SPOT/finder integration,
Google Calendar sync, TMP/JMP notifications, full maintenance planning, full
defect timelines or persisted resolution notes, broad Fulcrum sync, media/photo
import, Fulcrum app writes, background workers, scheduled sync, AI provider
calls, AI API keys, AI provider credentials or external service credentials
beyond local environment configuration.
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
