# Prototype Review

This document summarises the current ROPES prototype after the dashboard,
Prisma model, organisation context, Trips MVP, Vehicles MVP and Fulcrum shell
milestones, plus the first tenant-guarded persistence pass for core Trips and
Vehicles records.

## Currently included

- Next.js, TypeScript and Tailwind app foundation.
- Mobile-friendly dashboard shell using ROPES/Enarah colours.
- Navigation for Overview, Organisations, Ranger Operations, Trips, Vehicles,
  Projects, People, Fulcrum, Reports, Compliance and Settings.
- Fake current-user/session data with a demo organisation switcher.
- Organisation-scoped in-memory dashboard/module mock data.
- Initial Prisma schema and clearly fake seed data for organisations, users,
  memberships, roles, projects, ranger programs, trips, vehicles, bookings,
  Fulcrum placeholders and audit logs.
- Tenant guard foundation for future persisted writes, with fake/demo session
  shape until real authentication is added.
- Trips MVP with Prisma-backed core trip reads/create/update when a local
  database is configured, plus demo fallback when no database is available.
- Structured trip participant/vehicle/itinerary rows, approval status and
  placeholder export actions.
- Vehicles MVP with Prisma-backed vehicle and booking reads, tenant-guarded
  booking creation, booking calendar-style view, overlap warning and pre-start
  status placeholders.
- Fulcrum shell with demo-only Overview, Connections, Apps & Forms, Field
  Records, Maps, Data Health, AI Assistant, App Builder and Sync Settings pages.

## Still demo-only

- Authentication is not implemented; the app still uses fake session data.
- Organisation switching is query-string demo state, not a real tenant/session
  control.
- Dashboard and Fulcrum UI data is in-memory demo data.
- Trip participant rows, trip vehicle allocation rows and trip itinerary rows
  are still demo-only and are not persisted yet.
- Vehicle record create/edit forms are not implemented yet.
- Full server-side booking overlap checks remain future work; the current
  overlap warning is still client-side.
- Fulcrum connection setup, encrypted token storage, connection testing and sync
  actions are not implemented.
- Fulcrum AI Assistant and App Builder are non-functional demo shells and do not
  call AI providers or Fulcrum APIs.
- Maps and data health checks are static placeholders.
- Real authentication, broader server-side permission enforcement and audit
  logging are still future work.

## Follow-up issues

- #14 Add real authentication.
- #15 Add Fulcrum encrypted connection setup.
- #16 Add server-side booking overlap checks.
