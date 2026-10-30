# Tracking domain foundation (Slice 1)

Implements the foundation in `spot-tracking-architecture.md` and issue #187.
No routes, dashboard, worker, credential resolver, HTTP adapter, or live service
access are included. Nothing automatically seeds tracking data or enables the
capability for an organisation.

## Server entry points

`lib/tracking/server.ts` is guarded with `server-only` and exposes:

- `getOrganisationTrackingOverview(organisationId, now?)`
- `associateTrackingAssetVehicle(organisationId, assetId, vehicleId)`
- `assignTrackingAssetToTrip(organisationId, input)`

Every operation checks the existing request tenant session and
`integrations.spotTracker`. Failures propagate; there is no tracking fixture
fallback. `lib/tracking/data.ts` provides the same data layer with an explicit,
mandatory authorizer for isolated tests and later trusted server ingestion.
`storeTrackingMessage` accepts normalised events there; it has no public route.

The overview returns only the DTO in `lib/tracking/types.ts`. It queries the latest
event and the latest valid fix independently in a repeatable-read snapshot, ordered by
source `occurredAt` with
a deterministic ID tie-breaker. A HELP-CANCEL without coordinates remains an event
and cannot erase the last valid fix. Freshness uses the fix time and an injectable
clock. No Prisma records, credential references, provider IDs, raw content, or
provider URLs are returned.

The relevant trip is a PLANNED or IN_PROGRESS trip with an unexpired effective
assignment window. Current windows win over future windows; otherwise the nearest
planned assignment wins. Window endpoints individually fall back to trip dates.
The assignment vehicle takes precedence over the asset's default vehicle.
Overview includes all organisation asset statuses so historical/stale assets are
not silently hidden. There is one indexed position lookup per asset; pagination
or a batched SQL read can be considered when building the dashboard at scale.

## Persistence and invariants

Migration `0019_tracking_domain` adds four tables and four enums, plus composite
unique indexes on existing Trip and Vehicle records. It does not modify existing
business data. Composite foreign keys enforce organisation ownership for all
tracking relationships and enforce that a message's integration matches its
asset's integration. Vehicle references point to stable Vehicle IDs, never
TripVehicleAllocation. Explicitly unlink a vehicle before deleting it; linked
assets and integrations retain their history through restrictive deletes.

Database triggers prevent changes to organisation ownership, even for an asset
without messages. SQL checks require either a complete valid coordinate pair or
two nulls, positive expected intervals, a poll interval of at least 150 seconds,
and ordered explicit assignment endpoints. The data layer also checks effective
assignment windows when only one endpoint is supplied.

Only an opaque, non-secret `credentialKey` is stored on an integration. No feed
identifier/password fields or raw response JSON exist. Message writes use an
explicit allowlist and currently omit free-text content. Duplicate external IDs
are ignored atomically per integration; a duplicate targeting another asset is
rejected. Previously stored events are immutable
through the ingestion helper. There is no provider polling in this slice.

## Synthetic verification

`lib/tracking/fixtures.ts` contains invented identifiers and coordinates close to
(0, 0) in open ocean, anchored to an injected 2030 clock. Integrations are disabled.
It covers TRACK, OK, HELP, a coordinate-less HELP-CANCEL, stale/no-fix assets, two
organisations, and a stable vehicle/trip assignment. It is not wired into
`prisma/seed.ts` or production reads.

`tests/tracking-domain.test.ts` tests normalisation and freshness boundaries.
`tests/tracking-data.test.ts` uses test-only PGlite (PostgreSQL in WebAssembly)
and a Prisma adapter, with no database URL or network. It applies the existing
migration chain, inserts pre-existing trips/vehicles, applies the additive
tracking migration, and exercises the real Prisma data helpers and constraints.
It checks tenant/capability rejection, both vehicle relationships, assignment
rejection, immutable ownership, duplicate ingestion, invalid fixes, stable trip
relationships, and DTO sanitisation. This complements, rather than replaces, a
later full PostgreSQL deployment rehearsal; no migration is applied to a live
database by these tests.
