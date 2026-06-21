# ROPES Permissions Model

## Goal

ROPES must support Enarah internal users and multiple partner organisations while keeping each organisation's data separate.

## Core concepts

- **User**: a person who can log in.
- **Organisation**: a tenant, such as Enarah or a partner ranger organisation.
- **Membership**: a user's relationship to an organisation.
- **Role**: a named access level attached to a membership.
- **Permission**: a granular action the user can perform.

## Suggested roles

### Platform Owner

Full control across the whole platform.

### Enarah Admin

High-level Enarah staff role. Can create organisations, manage templates, invite organisation admins and assist partner organisations.

### Organisation Admin

Lead administrator for one partner organisation. Can manage users, projects, trips, vehicles, reports and Fulcrum connection settings for that organisation.

### Operations Manager

Can manage trips, vehicles, ranger operations, staff allocation, approvals and reports.

### Ranger Coordinator / Head Ranger

Can create and update trips, assign field staff, update ranger activities, view relevant Fulcrum records and draft reports.

### Field Staff / Ranger

Can view assigned trips and activities, complete pre-starts, submit check-ins, field notes and incident records.

### Business / Finance Admin

Can view project, job code and reporting information, and export administrative reports.

### Cultural Advisor

Can review and advise on restricted cultural records where explicit access has been granted.

### Read-only Partner / Funder

Can view approved dashboards and reports. Cannot edit operational data.

### Demo User

Can access demo organisation only and interact with clearly fake demo data.

## Non-negotiable rules

1. All data queries must be filtered by current organisation.
2. Permission checks must occur server-side.
3. Users should only see organisations where they have an active membership.
4. Restricted data requires explicit access grants.
5. Fulcrum credentials must only be visible as connection status, never as raw token values after saving.
6. Audit logs should record permission changes, data exports, approval actions and external syncs.

## Organisation switcher

Users with access to multiple organisations should use an organisation switcher. The selected organisation becomes the active tenant for navigation and data queries.

## Data sensitivity levels

Suggested levels:

- Public within organisation
- Internal operational
- Restricted
- Cultural restricted
- Confidential commercial

## Implementation notes

Use helpers such as:

- `getCurrentUser()`
- `getCurrentOrganisation()`
- `requireOrganisationAccess(organisationId)`
- `requirePermission(permission)`
- `canViewRestrictedData(userId, organisationId, recordId)`

Every page and server action should use these helpers rather than ad hoc permission checks.
