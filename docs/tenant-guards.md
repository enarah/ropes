# Tenant Guards

Issue #11 adds the tenant-guard foundation that future persisted writes must
use before writing operational data.

## Purpose

Every future server action or API route that writes operational data must fail
closed unless it has:

- an authenticated user/session,
- an explicit `organisationId`,
- an active membership for that organisation, and
- related records that all belong to the same organisation.

This foundation does not add real authentication, persisted writes or external
integrations. It accepts a session-shaped object so the current prototype can
continue using fake/demo session data until #14 adds real authentication.

## Helpers

Use `lib/tenant-guards.ts` from server-side code:

- `requireOrganisationAccess(session, organisationId)` validates that the
  session has an active membership for the explicit organisation.
- `requireOrganisationScopedRecord(organisationId, record, label)` validates
  one related record.
- `requireRelatedRecordsInOrganisation(organisationId, relatedRecords)`
  validates a group of related records.
- `createOrganisationWriteContext({ session, organisationId, relatedRecords })`
  validates the session and related records, then returns `{ organisationId,
  actorUserId }` for the write.

## Future write pattern

Future work in #13, #15 and #16 should follow this pattern before writing:

```ts
const context = createOrganisationWriteContext({
  session,
  organisationId: input.organisationId,
  relatedRecords: [
    { label: "Trip", record: trip },
    { label: "Vehicle", record: vehicle },
  ],
});

await prisma.vehicleBooking.create({
  data: {
    organisationId: context.organisationId,
    bookedByUserId: context.actorUserId,
    vehicleId: vehicle.id,
    tripId: trip.id,
  },
});
```

## Follow-up work

- #13 should use these guards before persisted trip, vehicle or booking writes.
- #14 should replace fake/demo session input with the real authenticated
  session and active memberships.
- #15 should use these guards before Fulcrum connection setup, credential
  updates, connection tests or sync operations.
- #16 should use these guards before server-side booking overlap checks and
  booking writes.

## Notes

- Guards reject missing organisation IDs by default.
- Guards reject sessions without active membership.
- Guards reject related records with missing `organisationId`.
- Guards reject related records from another organisation.
- Client-side checks may still improve UX, but server-side guards must enforce
  tenant safety before real writes.
