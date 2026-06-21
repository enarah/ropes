# ROPES Architecture

## Architectural goal

ROPES should be a secure, multi-tenant web application that can run Enarah's internal operations and support separate partner organisations without data leakage between tenants.

## Recommended stack

### Application

- Next.js
- TypeScript
- Tailwind CSS
- Component library such as shadcn/ui
- React Hook Form and Zod for forms and validation

### Backend

- Next.js server actions/API routes or a small Node service layer
- PostgreSQL
- Prisma ORM
- Background jobs for sync tasks

### Authentication

- Auth.js / NextAuth
- Google OAuth
- Microsoft OAuth
- Optional email/password or magic-link login later

### Deployment

- Docker-ready application
- External web server deployable
- PostgreSQL as managed database or self-hosted database
- Environment-variable configuration

### Storage

- Object storage for uploaded files, photos, reports and exported documents
- Organisation-scoped file paths or metadata

### AI layer

- Provider abstraction so the AI implementation can be changed later
- Permission-aware access to ROPES and Fulcrum records
- Source-linked answers where possible

### Fulcrum layer

- Per-organisation Fulcrum API credentials
- Credentials encrypted at rest
- Manual sync first
- Scheduled sync later
- Sync logs and error reporting

## Core design principles

1. **Multi-tenancy first** — every operational object must belong to an organisation.
2. **Permission checks server-side** — do not rely only on frontend hiding.
3. **No secrets in source control** — all keys and tokens must be stored as environment variables or encrypted database fields.
4. **Audit sensitive actions** — track syncs, approvals, permission changes and data exports.
5. **Mobile-friendly UI** — field users may use tablets or phones.
6. **Modular product design** — Trips, Vehicles, Fulcrum Companion and Reporting should be separable subscription modules.

## High-level data domains

### Identity and access

- User
- Organisation
- Membership
- Role
- Permission
- AuditLog

### Operations

- RangerProgram
- Project
- Workplan
- Activity
- Trip
- TripParticipant
- TripItineraryItem
- Vehicle
- VehicleBooking
- VehicleCheck
- Incident

### Fulcrum

- FulcrumConnection
- FulcrumApp
- FulcrumField
- FulcrumRecord
- FulcrumMedia
- FulcrumSyncLog

### Reporting

- Report
- ReportTemplate
- ReportExport
- EvidenceItem

## Organisation scoping

All operational tables should include `organisationId` unless they are global platform configuration tables.

Examples that must be organisation-scoped:

- projects
- ranger programs
- trips
- vehicles
- bookings
- reports
- incidents
- Fulcrum connections
- Fulcrum apps
- Fulcrum records
- staff profiles

## Suggested app navigation

- Overview
- Organisations
- Ranger Operations
- Trips
- Vehicles
- Projects
- People
- Fulcrum
- Reports
- Compliance
- Settings

## Suggested folder structure

```text
/docs
  product-brief.md
  architecture.md
  permissions.md
  fulcrum-integration.md
  codex-rules.md
/app
  /(dashboard)
    /overview
    /organisations
    /ranger-operations
    /trips
    /vehicles
    /projects
    /people
    /fulcrum
    /reports
    /compliance
    /settings
/components
/lib
  /auth
  /db
  /permissions
  /fulcrum
  /ai
  /reports
/prisma
  schema.prisma
  seed.ts
```

## Build sequence

1. Documentation and rules
2. Dashboard shell
3. Prisma schema and seed data
4. Auth and organisation switcher
5. Trips module
6. Vehicles module
7. Fulcrum shell
8. Fulcrum API connector
9. Reports
10. AI assistant
