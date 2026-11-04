# Trip tracking assignments — Slice 3

References #187. Uses the existing tracking tables and `TripTrackingAssignment`
fields; no schema change or migration. No provider connection, credential handling,
polling, worker, alerting or deployment is introduced.

## Trip planning

For persisted organisations with `integrations.spotTracker`, the Trip form places
**Tracking & Communications** after Vehicles and before Itinerary. New trips can
include trackers in their first save. Rows support tracker, role, optional stable
organisation Vehicle, optional UTC assignment dates, and up to 500 characters of
plain-text notes. Remove every row to explicitly clear the Trip's assignment set.

New choices include only ACTIVE assets. Existing inactive/retired assignments
remain visible and can be retained, updated or removed; they cannot be newly
assigned after removal. Tracker identity and existing assignment row IDs survive
updates. Vehicle options put registrations in the current Trip allocation first.
An organisation vehicle outside that allocation is allowed and produces a warning;
it is never silently added to the allocation.

The expected interval is read-only and comes from the asset. Editing it would
change freshness for every Trip sharing that tracker, so asset administration is
left to a later slice. No assignment interval field or asset-update action is added.

Blank assignment endpoints independently fall back to the Trip start/end dates.
Invalid dates or reversed effective endpoints reject the entire save. An ordered
window outside the Trip dates produces a non-blocking warning, preserving valid
existing windows (including the accepted synthetic fixtures) and allowing explicit
monitoring before/after the Trip. Date controls are labelled UTC.

## Detail and TMP/JMP

Trip detail shows each assigned tracker's provider/model, status, role, vehicle,
effective dates, interval, last valid fix time, last event/time, freshness and
notes. Last fix and last event are independently queried: a coordinate-less
HELP_CANCEL event does not erase a fix. HELP is “Assistance requested”; HELP_CANCEL
is “Assistance request cancelled”. Coordinates are not sent in these Trip DTOs.
The Operations Map link returns to the organisation Overview; no new map is built.

TMP/JMP shows the structured assignment/interval summary and links to Trip edit.
When tracking is enabled, `spotGarminDetails` is labelled **Other satellite /
communications notes**. Its stored name, data and save path remain intact. There
is no automatic copy of assignments into this legacy free-text field. Organisations
without the tracking capability retain their existing interface and label.

A saved TMP/JMP with the existing `finalRiskLevel === HIGH` classification shows a
prominent missing-tracker warning. This is not an approval blocker. Other unassigned
Trips show an ordinary empty state; no remote-trip policy is invented.

## Access and persistence

Request-only exports in `lib/tracking/server.ts` bind the data layer to the existing
tenant session and capability authorizer. Each read authorizes before querying
tracking data and verifies a supplied Trip belongs to the organisation. Explicit
selects and DTO mapping omit credential keys, integration IDs, external asset or
message IDs, raw provider payloads, URLs, passwords and positions.

`persistTrip` revalidates the session/Trip relationship in a serializable Prisma
transaction. Trip core, participants, vehicle allocations, itinerary and submitted
assignments commit together. The assignment helper rechecks the persisted capability,
Trip, every tracker and every optional Vehicle in that transaction; duplicates and
invalid roles/dates/notes are rejected. Notes have markup/control characters removed
and are rendered as text. Stable Vehicle FKs are used; allocation rows may continue
to be recreated without breaking tracking assignments.

The submitted set is authoritative only for the current Trip and organisation.
Retained asset pairs are upserted without recreating their assignment IDs; omitted
assets are deleted with both organisation and Trip filters. A missing submission
marker preserves the existing set for older/capability-disabled forms. An explicit
zero count deletes the set. A forged marker in a disabled organisation is rejected
and rolls back the entire Trip save. No assignment ID from the client is trusted.
Concurrent saves may receive a serializable transaction conflict and must be retried
by the user; no partial assignment set is committed.

## Verification

`tests/trip-tracking.test.ts` uses the existing Node test runner, React server
rendering and isolated PGlite with the existing migration chain. It covers parsing,
plain-text/length/date/role checks, tenant-scoped options/status, capability-disabled
no-read behaviour, cross-tenant Trip/tracker/Vehicle rejection, first-save assignment,
update identity, removal scoping, retired/inactive handling, stable Vehicle links,
non-allocation/non-overlap warnings, date fallbacks, independent last fix/event,
DTO sanitisation and rollback of Trip core/structured/assignment changes. It also
checks form placement, persistence gating, neutral HELP language and preservation
of the legacy TMP/JMP field. No remote database is used by tests.

Local compiled-runtime browser acceptance used `next start` with production,
sandbox and explicit demo flags against a fresh localhost-only PostgreSQL 16
database populated directly with invented records. It did not invoke the fixture
loader or access TrueNAS. New-trip first-save assignment, multiple trackers,
updates, optional unallocated Vehicle, removal, Trip detail, TMP/JMP summaries,
legacy notes and high-risk missing-tracker warning passed. At 390px the assignment
fieldset and every control fit without horizontal overflow; desktop presentation
was also inspected. Browser warning/error logs were empty. The initial run exposed
server-local parsing of UTC Trip form dates; the save action now uses the same
explicit UTC parser as assignments, and the rebuilt application passed a date
round trip without shifting the persisted Trip time. General Trip summary date
formatting remains the existing environment-local display; tracking timestamps
are explicitly UTC.
