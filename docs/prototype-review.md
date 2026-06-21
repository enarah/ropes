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
- Organisation-scoped in-memory dashboard/module mock data.
- Initial Prisma schema and clearly fake seed data for organisations, users,
  memberships, roles, projects, ranger programs, trips, vehicles, bookings,
  Fulcrum placeholders and audit logs.
- Tenant guard foundation used by persisted trip and vehicle booking writes.
- Trips MVP with Prisma-backed core trip reads/create/update when a local
  database is configured, plus demo fallback when no database is available.
- Structured trip participant/vehicle/itinerary rows, approval status and
  placeholder export actions.
- Vehicles MVP with Prisma-backed vehicle and booking reads, tenant-guarded
  booking creation, server-side overlap enforcement for persisted bookings,
  booking calendar-style view, client-side overlap warning and pre-start status
  placeholders.
- Fulcrum shell with demo-only Overview, Connections, Apps & Forms, Field
  Records, Maps, Data Health, AI Assistant, App Builder and Sync Settings pages.
- Fulcrum connection setup can save an organisation-scoped API token encrypted
  at rest when database, auth and encryption key configuration are available.

## Still demo-only

- Local development still uses fake/demo session fallback when auth providers
  are not configured.
- User invitation, account provisioning and role management UI are not
  implemented.
- Organisation switching still uses query-string UI state, but the available
  options come from active memberships when auth/database are configured.
- Full route-level access blocking for every demo page is not implemented yet.
- Dashboard and Fulcrum UI data is in-memory demo data.
- Trip participant rows, trip vehicle allocation rows and trip itinerary rows
  are still demo-only and are not persisted yet.
- Vehicle record create/edit forms are not implemented yet.
- Broader calendar/scheduling features remain future work.
- Fulcrum connection testing, real API sync and record imports are not
  implemented.
- Fulcrum AI Assistant and App Builder are non-functional demo shells and do not
  call AI providers or Fulcrum APIs.
- Maps and data health checks are static placeholders.
- Broader server-side permission enforcement and audit logging are still future
  work.
