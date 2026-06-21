# Prototype Review

This document summarises the current ROPES prototype after the dashboard,
Prisma model, organisation context, Trips MVP, Vehicles MVP and Fulcrum shell
milestones.

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
- Trips MVP with demo list, detail pages, create/edit forms, structured
  participant/vehicle/itinerary demo rows, approval status and placeholder
  export actions.
- Vehicles MVP with demo register, vehicle detail pages, booking calendar-style
  view, booking form, overlap warning and pre-start status placeholders.
- Fulcrum shell with demo-only Overview, Connections, Apps & Forms, Field
  Records, Maps, Data Health, AI Assistant, App Builder and Sync Settings pages.

## Still demo-only

- Authentication is not implemented; the app still uses fake session data.
- Organisation switching is query-string demo state, not a real tenant/session
  control.
- Dashboard, Trips, Vehicles and Fulcrum UI data is in-memory demo data.
- Trip, vehicle and booking forms do not persist changes.
- Fulcrum connection setup, encrypted token storage, connection testing and sync
  actions are not implemented.
- Fulcrum AI Assistant and App Builder are non-functional demo shells and do not
  call AI providers or Fulcrum APIs.
- Maps and data health checks are static placeholders.
- Server-side permission checks, tenant guards and audit logging for real
  actions are still future work.

## Follow-up issues

- #11 Add server-side tenant guards before real writes.
- #12 Add structured trip form fields.
- #13 Persist trips and vehicles.
- #14 Add real authentication.
- #15 Add Fulcrum encrypted connection setup.
- #16 Add server-side booking overlap checks.
