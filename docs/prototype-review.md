# Prototype Review

This document summarises the current ROPES prototype after the dashboard,
Prisma model, organisation context, Trips MVP, Vehicles MVP and Fulcrum shell
milestones, the first tenant-guarded persistence pass for core Trips and
Vehicles records, and the initial authentication foundation.

## Currently included

- Next.js, TypeScript and Tailwind app foundation.
- Mobile-friendly dashboard shell using ROPES/Enarah colours.
- Navigation for Overview, Organisations, Ranger Operations, Trips, Vehicles,
  Projects, People, Fulcrum, Reports, Compliance and Settings.
- Auth.js/NextAuth foundation with optional Google and Microsoft Entra ID OAuth
  providers configured through environment variables.
- Signed-in user resolution from OAuth email to the app `User` record and
  active organisation memberships.
- Local fake/demo session fallback when database/auth setup is not configured.
- Route-level active membership blocking for dashboard, Trips, Vehicles and
  Fulcrum pages when authentication and the database are configured.
- Organisation-scoped in-memory dashboard/module mock data.
- Initial Prisma schema and clearly fake seed data for organisations, users,
  memberships, roles, projects, ranger programs, organisation capability
  toggles, trips, vehicles, bookings, trip risk assessments, vehicle
  pre-starts, vehicle defects, vehicle maintenance records, Fulcrum
  placeholders and audit logs.
- Tenant guard foundation used by persisted trip and vehicle booking writes.
- Organisation capability-toggle foundation with stable module/capability keys,
  seeded defaults, capability-aware navigation, disabled feature states and
  proof checks for Trips TMP/JMP risk assessment and Vehicles maintenance.
- Capability checks are intentionally separate from tenant guards: tenant
  access decides whether a user can access an organisation, while capabilities
  decide which modules and workflows are enabled inside that organisation.
- AI provider abstraction placeholder describes future no-provider, local LLM
  and frontier/cloud provider modes without storing credentials, adding keys or
  calling any provider.
- APP&B reporting planning foundation adds optional Reporting/Grants capability
  keys, a gated Reporting placeholder page, source template references and
  typed placeholder profile/data-fit definitions for future NIAA/DCCEEW workbook
  mapping.
- Grants and APP&B data model foundation adds organisation-scoped `Grant`,
  `GrantReportingPeriod` and `AppbReport` records, seeded multi-grant examples
  and a capability-gated read-only APP&B overview.
- APP&B template mapping metadata foundation adds code-level template versions,
  expected sheets, sections, fields, repeatable tables, manual/formula-protected
  flags and export-readiness blockers without parsing or generating XLSX files.
- Local APP&B workbook inspection tooling can produce reviewed structural JSON
  or Markdown summaries for local XLSX files, separate from app runtime and
  without committing source workbooks.
- Verified APP&B workbook mapping metadata now records reviewed sheet
  inventories, common sections, formula-protected placeholders, manual-only
  areas and repeatable table candidates while keeping export blocked.
- APP&B report readiness summaries now show safe per-report status counts, top
  blockers and next actions without exposing finance, personnel, narrative or
  workbook values.
- APP&B manual report field capture foundation adds organisation-scoped
  report-only manual values with bounded status/type/sensitivity, guarded
  updates and safe audit metadata while keeping export blocked.
- APP&B manual field UX refinement groups editable fields by category, adds
  status/sensitivity labels and uses field-type-specific controls while keeping
  compact summaries value-free.
- APP&B manual field value preservation now preloads existing values only in
  the editing context, keeps compact summaries value-free and preserves stored
  values on status-only changes.
- APP&B manual field explicit clear controls make value and note clearing
  intentional through a clear action selector while keeping audit metadata
  value-free and workbook export blocked.
- APP&B manual field operator UX now adds compact status guidance and clearer
  preserve, replace and destructive clear wording while keeping manual values
  hidden outside the authorised editing context.
- APP&B exact workbook range mapping metadata now tracks reviewed/review-needed,
  formula-blocked, hidden-sheet and repeatable target status counts while
  keeping workbook export blocked.
- APP&B repeatable table range metadata now tracks header/data/formula row
  concepts, manual-only row groups and expansion rules while keeping all table
  export blocked pending review.
- APP&B workbook mapping review workflow foundation now represents value-free
  review decisions for field mappings and repeatable ranges, with compact
  review summaries and expandable metadata-only panels while keeping workbook
  export blocked.
- APP&B persisted mapping review decision foundation stores report-scoped
  review decisions, short value-free notes, reviewer identity and reviewed
  timestamps with tenant guards, APP&B capability checks and safe audit
  metadata while keeping workbook export blocked.
- APP&B mapping review note safety guardrails now reject obvious unsafe
  review-note patterns server-side, audit only value-free rejection metadata and
  avoid storing or logging rejected note text.
- APP&B review note safety tuning now keeps the deterministic policy in a
  reusable helper with test coverage for allowed short metadata notes and
  rejected fake unsafe examples.
- APP&B mapping review history foundation now shows current value-free
  report-scoped review decisions and rejected-note reason counts without
  exposing raw audit logs, rejected note text, workbook values or manual report
  values.
- APP&B mapping review decision version history now appends organisation-scoped,
  value-free creation and update events while preserving the current
  one-row-per-target decision model. Safe history reads show compact previous
  and new decision metadata only; rejected-note reason counts remain separate
  and workbook export remains blocked.
- APP&B mapping review history readability now shows current decision metadata
  first, keeps the three most recent value-free events visible by default and
  places older events behind a compact local disclosure. Creation and update
  wording is explicit, rejected-note counts remain separate and workbook export
  remains blocked.
- APP&B mapping review history backend limits now load only the shared three
  newest value-free events per target and expose a safe older-event count.
  Current decision metadata and rejected-note counts remain separate, and full
  load-more or pagination stays deferred while workbook export remains blocked.
- APP&B mapping review history load-more now provides an authenticated,
  tenant- and capability-gated per-target action with bounded three-event
  cursor pages, safe remaining-count metadata and minimal append UI. The
  value-free cursor uses the stable reviewed timestamp, created timestamp and
  ID ordering and is verified against the requested target before use. Current
  decision metadata and rejected-note counts remain separate, and workbook
  export remains blocked.
- APP&B mapping review history cursors now use versioned HMAC-SHA-256
  signatures backed by a dedicated server-side production secret. Signature
  verification happens before the existing authorised target-anchor check;
  tampered, unsupported and stale cursors fail safely while cursor content and
  loaded history remain value-free.
- APP&B mapping review operator UX now adds decision guidance, value-free note
  examples, rejected-note handling reminders and clearer newest-three/load-more
  history wording while keeping workbook export blocked.
- APP&B cursor signing configuration now has a central production runtime
  validator. The APP&B overview fails with a clear server-side configuration
  error when the stable shared secret is missing or shorter than 32 UTF-8
  bytes, while the process-local non-production fallback remains available and
  no secret enters cursor payloads or client responses.
- APP&B production readiness guidance now consolidates database and
  authentication setup, active tenant membership, the four required APP&B
  capabilities, shared cursor-secret operations, value-free history and note
  rules, manual-value preservation and all intentionally blocked areas. This
  documents deployment of review/history foundations only; workbook export,
  XLSX generation, uploaded templates, AI calls, APP&B-specific external
  services and broad audit-log browsing remain unavailable.
- APP&B now has a compact runtime readiness panel shown only after tenant and
  capability guards pass. It reports safe database, membership, capability,
  cursor-configuration, report-presence and value-free-history status without
  exposing secret details, workbook/manual values or rejected unsafe note text;
  export remains blocked and unsupported areas remain explicitly labelled.
- The fake demo partner seed now exercises that panel and the review/history
  foundation with APP&B capabilities, fake grant/report and manual-field
  examples, one current mapping decision, five value-free history events and
  safe rejected-note reason metadata only. It stores no rejected text, real
  workbook/manual values or cursor secret, and export remains blocked.
- A docs-only local smoke-test checklist now covers database migration/seed,
  the exact demo APP&B route, readiness/capability rows, authorised manual-value
  visibility, three initial plus two load-more history events, the safe rejected
  reason count and blocked export state, with tenant/config troubleshooting.
- `npm run smoke:appb` now provides a local-only seeded-database check for the
  demo organisation, capabilities, report/manual metadata presence, one review
  decision, five value-free history events, three-plus-two cursor-boundary
  behavior, safe rejected-reason metadata and blocked export state. Output is
  limited to safe pass/fail labels and the manual checklist still covers UI.
- A docs-only APP&B disposable-database runbook now gives developers the exact
  install, Prisma generation, migration, seed, automated smoke and browser
  checklist sequence, with safe expected output and local-failure guidance. It
  explicitly excludes production, CI and workbook-export readiness.
- APP&B operator guidance now documents the current tenant-scoped readiness,
  manual-field, mapping-decision and value-free history workflow, distinguishes
  local demo use from production operation and future export, and covers safe
  failure handling while workbook export remains blocked.
- Trips MVP with Prisma-backed core trip reads/create/update and persisted
  participant, vehicle allocation and itinerary rows when a local database is
  configured, plus demo fallback when no database is available.
- Structured trip participant/vehicle/itinerary rows, approval status,
  tenant-guarded approval workflow transitions and placeholder export actions
  in the UI.
- Trip approval notes are persisted as organisation-scoped plain-text records
  with safe author/timestamp display, required reasons for change requests and
  cancellations, and server-side length limits.
- Trip Risk Assessment and Journey Management Plan foundation with a persisted
  organisation-scoped assessment per trip, Enarah trip-type and activity-risk
  classifications, base/final risk calculation, standard risks, mitigations and
  reference display, trip-specific controls, journey equipment, traveller,
  daily check-in and emergency guidance capture, plus concise TMP/JMP summary
  visibility on trip detail pages.
- Trips list filters can narrow by approval state, trip status, timing and
  needs-action views, with visible workflow badges, count chips and short safe
  latest-review-note previews.
- Trips summary cards show lightweight organisation-scoped operational counts
  and link into the filtered Trips list without adding full reporting.
- Vehicles MVP with Prisma-backed vehicle and booking reads, tenant-guarded
  vehicle create/update forms, booking creation/update, server-side overlap
  enforcement for persisted bookings, vehicle booking detail/edit pages, vehicle
  register status filters, compact fleet summary counts, booking status/timing
  filters, compact booking summary counts, booking count visibility, booking
  calendar-style view, client-side overlap warning and tenant-guarded pre-start
  checklist submissions with latest status display.
- Vehicle defect reporting foundation with a persisted organisation-scoped
  defect model, vehicle-scoped report form, tenant-guarded create and status
  update actions, short description and status-note validation, safe audit
  metadata, optional pre-start link and open/latest count/status visibility on
  vehicle register and detail pages.
- Vehicle maintenance record foundation with a persisted organisation-scoped
  maintenance model, vehicle-scoped create form, optional defect link, short
  note validation, safe audit metadata and latest/recent maintenance
  visibility on vehicle register and detail pages.
- Fulcrum shell with demo-only Overview, Connections, Apps & Forms, Field
  Records, Maps, Data Health, AI Assistant, App Builder and Sync Settings pages.
- Fulcrum connection setup can save an organisation-scoped API token encrypted
  at rest when database, auth and encryption key configuration are available.
- Fulcrum connections can run a server-side credential test that decrypts the
  token only on the server, stores safe status metadata and does not sync
  records.
- Fulcrum Sync Settings can queue organisation-scoped sync job placeholder
  records for tested connections, showing recent status without importing
  records.
- Fulcrum Sync Settings can run a manual, capped import for selected Fulcrum
  app IDs from a tested connection, importing app/form metadata before records
  and storing organisation-scoped records with preserved external IDs.
- Fulcrum import validation now checks selected app ID format, app/form payload
  shape and record payload shape, skips unsupported malformed records where
  possible, and filters likely sensitive form values out of
  `rawJson.formValuesPreview`.
- Recent Fulcrum sync job status shows safe import counts for records imported,
  records updated, records skipped, missing GPS and filtered sensitive field
  previews.
- Organisation-scoped audit entries for persisted trip create/update, trip risk
  assessment creation/update, vehicle booking create/update/overlap rejection,
  vehicle pre-start submission, vehicle defect submission and status changes,
  vehicle maintenance record creation, trip approval workflow transitions,
  Fulcrum connection
  save/update/disable, Fulcrum connection test success/failure, sync job
  placeholder events and safe Fulcrum import events.

## Dependency audit triage plan

Recent APP&B validation runs completed `npm install` successfully while
reporting existing dependency audit findings. Dependency remediation should be
handled as a small, reviewable triage pass before any package updates are made.
Do not run broad automated fixes, and do not use `npm audit fix --force`
unless a later issue explicitly scopes a major-upgrade path.

Recommended triage commands:

```bash
npm audit
npm audit --omit=dev
```

Run audit commands from a local shell without printing or pasting secrets,
tokens, database URLs, cursor secrets or other environment values. Audit output
should be treated as package metadata only.

For each finding, document:

- package
- direct or transitive dependency
- severity
- runtime production path or development-tooling only
- affected dependency path
- safe patch or minor update available
- major upgrade required
- proposed action
- deferred issue needed
- validation required after change

Triage should separate runtime risk from development-tooling risk. Findings
that affect production dependencies or request-time code should be prioritised
above findings isolated to local build/test tooling. Findings that are not
currently exploitable in the ROPES context should still be recorded with the
reason, affected path and revisit trigger.

Dependency changes should be small, justified and limited to the package or
lockfile entries needed for the reviewed finding. Avoid unrelated lockfile
churn. Safe patch or minor updates can be grouped only when they share the same
root cause and validation surface. Major framework or tooling upgrades need
separate issues with their own risk notes and rollback plan.

After any future dependency update, run:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npx prisma validate
npm run db:generate
git diff --check
```

If a disposable local database is intentionally configured, also run:

```bash
npm run db:migrate
npm run db:seed
npm run smoke:appb
```

Dependency audit work must not change application features, database schema,
seed data, APP&B workbook export behaviour, XLSX generation, uploaded template
storage, AI calls, external services, tenant guards, capability checks or
value-free APP&B review/history boundaries.

## Runtime dependency audit triage snapshot

On 24 August 2026, runtime audit triage for issue #136 inspected:

```bash
npm audit --omit=dev
npm audit --json --omit=dev
```

Initial runtime audit output reported 14 findings: 5 moderate, 8 high and 1
critical. The only narrow direct runtime patch applied in this slice was
`next-auth` from `4.24.14` to `4.24.15`. That patch removes the critical
Auth.js finding and the runtime `uuid` finding that was introduced through
`next-auth`, with a small `package.json` and `package-lock.json` change only.

After the patch, `npm audit --omit=dev` reports 12 findings: 4 moderate, 8 high
and 0 critical. No broad automated fix or forced upgrade was run.

| Package | Direct/transitive | Severity | Dependency path | Context | Safe patch/minor available | Major required | Proposed action | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `next` | Direct | High | `ropes -> next@16.2.9` | Runtime production. ROPES uses the App Router and server actions, so framework advisories should be treated as runtime relevant even where exploitability depends on deployed routing/image/proxy configuration. | Patch candidate `16.2.11` exists; npm currently wants `16.3.2` under the existing range. | No | Open a focused Next.js patch/minor remediation issue, prefer the smallest version that clears direct advisories, then run the full validation suite. | Yes |
| `postcss` | Transitive | High | `ropes -> next -> postcss` | Next framework build/runtime dependency. Current ROPES does not expose user-controlled CSS/source-map processing as an app workflow, but the finding remains tied to the runtime framework package. | Likely through a focused Next.js update or override review. | No | Handle with the Next.js remediation issue; avoid standalone override unless Next cannot remediate cleanly. | Yes |
| `sharp` | Transitive | High | `ropes -> next -> sharp` | Optional Next image optimisation dependency. APP&B does not upload templates, generate XLSX files or process workbook images, but deployed image optimisation should still be reviewed. | Likely through Next.js/sharp update review. | No | Handle with the Next.js remediation issue and verify image optimisation behaviour if used. | Yes |
| `nanoid` | Transitive | High | `ropes -> next -> postcss -> nanoid` | Framework/tooling path under Next/PostCSS. ROPES does not call `nanoid` directly or expose custom generator size inputs. | Likely through Next/PostCSS update review. | No | Track with the Next.js remediation issue. | Yes |
| `prisma` | Direct | High | `ropes -> prisma@7.8.0` and `@prisma/client -> prisma@7.8.0` | Runtime install/tooling scope. Prisma CLI is used for generate, migrate and seed; it is not request-time application code. | Minor `7.9.1` is available for Prisma packages. | No | Open a focused Prisma-family minor update issue covering `prisma`, `@prisma/client` and `@prisma/adapter-pg` together. | Yes |
| `@prisma/config` | Transitive | High | `prisma -> @prisma/config -> deepmerge-ts` | Prisma CLI/config tooling path, not app request-time code. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `deepmerge-ts` | Transitive | High | `prisma -> @prisma/config -> deepmerge-ts` | Prisma config merge tooling path. No current ROPES workflow accepts recursive user-controlled config objects for this package. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `@prisma/dev` | Transitive | Moderate | `prisma -> @prisma/dev` | Prisma CLI/development tooling path, not ROPES request-time code. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `@hono/node-server` | Transitive | Moderate | `prisma -> @prisma/dev -> @hono/node-server` | Prisma development tooling server path. ROPES does not use Hono as its app server. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `hono` | Transitive | Moderate | `prisma -> @prisma/dev -> hono` | Prisma development tooling dependency. ROPES request handling is Next.js, not Hono. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `valibot` | Transitive | Moderate | `prisma -> @prisma/dev -> valibot` | Prisma development tooling validation path. ROPES does not call this dependency directly. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `fast-uri` | Transitive | High | `prisma -> @prisma/dev -> @prisma/streams-local -> ajv -> fast-uri` | Prisma tooling/validation path, not ROPES request-time URL parsing. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |

The attempted Next patch was not retained in this slice because the package
install did not complete cleanly in the local environment and produced no
Next-related lockfile diff. Keep the Next remediation separate so the framework
patch/minor choice, lockfile impact and validation results stay easy to review.

## Still demo-only

- Local development still uses fake/demo session fallback when auth providers
  are not configured.
- User invitation, account provisioning and role management UI are not
  implemented.
- Organisation switching still uses query-string UI state, but the available
  options come from active memberships when auth/database are configured.
- Role-specific permission rules beyond active membership checks are not
  implemented yet.
- Admin UI for managing organisation modules and capabilities is not
  implemented yet.
- Dashboard and Fulcrum UI data is in-memory demo data.
- Trip participants are stored as free-text MVP rows; optional linkage to
  existing users remains future work.
- Trip approval workflow notifications and role-specific approval permissions
  are still future work.
- TMP/JMP PDF/DOCX export, live SPOT/GARMIN tracking, notifications and a
  TMP-specific approval step are still future work.
- Live Google Calendar sync, SPOT/finder integrations, Teams/email/calendar
  integrations, AI provider execution and AI credential storage are still
  future work.
- APP&B workbook export, template upload storage, budget/acquittal finance
  logic, production workbook cell/range mapping, mapping admin bulk editing and
  full Grants workflows are still future work.
- Shared vehicles across organisations remain intentionally out of scope.
- Maintenance work orders, maintenance scheduling, full maintenance planning
  and decommission workflows are not implemented yet.
- Full vehicle defect timelines, persisted resolution notes, defect-triggered
  booking blocks and pre-start history reporting are not implemented yet.
- Vehicle booking approval workflows and advanced scheduling are not implemented
  yet.
- Broader calendar/scheduling features remain future work.
- Fulcrum connection testing validates credentials only; record import requires
  a separate manual action from Sync Settings.
- Fulcrum import is a capped MVP for selected app IDs only. It does not import
  media/photos, run background workers, schedule sync, perform broad app/form
  sync or write back to Fulcrum.
- Fulcrum field sensitivity rules are conservative key/label filtering only;
  richer form-schema-aware allowlists remain future work.
- Fulcrum AI Assistant and App Builder are non-functional demo shells and do not
  call AI providers or Fulcrum APIs.
- Maps and data health checks are static placeholders.
- Broader server-side permission enforcement, audit log review UI and wider
  audit coverage are still future work.
