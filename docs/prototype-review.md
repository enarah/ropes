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
- APP&B cursor signing configuration now has a central production runtime
  validator. The APP&B overview fails with a clear server-side configuration
  error when the stable shared secret is missing or shorter than 32 UTF-8
  bytes, while the process-local non-production fallback remains available and
  no secret enters cursor payloads or client responses.
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
