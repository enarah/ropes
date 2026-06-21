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
  memberships, roles, projects, ranger programs, trips, vehicles, bookings,
  Fulcrum placeholders and audit logs.
- Tenant guard foundation used by persisted trip and vehicle booking writes.
- Trips MVP with Prisma-backed core trip reads/create/update and persisted
  participant, vehicle allocation and itinerary rows when a local database is
  configured, plus demo fallback when no database is available.
- Structured trip participant/vehicle/itinerary rows, approval status,
  tenant-guarded approval workflow transitions and placeholder export actions
  in the UI.
- Trip approval notes are persisted as organisation-scoped plain-text records
  with safe author/timestamp display, required reasons for change requests and
  cancellations, and server-side length limits.
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
  calendar-style view, client-side overlap warning and pre-start status
  placeholders.
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
- Organisation-scoped audit entries for persisted trip create/update, vehicle
  booking create/update/overlap rejection, trip approval workflow transitions,
  Fulcrum connection save/update/disable, Fulcrum connection test
  success/failure, sync job placeholder events and safe Fulcrum import events.

## Still demo-only

- Local development still uses fake/demo session fallback when auth providers
  are not configured.
- User invitation, account provisioning and role management UI are not
  implemented.
- Organisation switching still uses query-string UI state, but the available
  options come from active memberships when auth/database are configured.
- Role-specific permission rules beyond active membership checks are not
  implemented yet.
- Dashboard and Fulcrum UI data is in-memory demo data.
- Trip participants are stored as free-text MVP rows; optional linkage to
  existing users remains future work.
- Trip approval workflow notifications and role-specific approval permissions
  are still future work.
- Vehicle maintenance records and decommission workflows are not implemented
  yet.
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
