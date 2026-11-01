# Organisation Operations Map — Slice 2

Implements issue #187 on top of the tracking foundation. No schema change or new
migration is required. This slice has no provider HTTP adapter, credentials,
polling, worker, trip assignment UI, or deployment changes.

## Data and access

The Overview dashboard places Operations Map immediately after its existing top
summary cards. The section is gated by `integrations.spotTracker`. A configured
demo database now uses the same organisation/session resolution and tenant guards
as authenticated reads, returning the persisted organisation ID and persisted
capabilities. A selected unknown or inaccessible organisation never falls back to
another tenant. Configured demo access also requires an `isDemo` organisation.
The existing database-free demo shell remains available, but it cannot supply
tracking data or map positions.

The server calls `getOrganisationTrackingOverview(organisationId)` after page
access; that reader independently enforces tenancy and the capability. Only its
sanitised DTOs and a snapshot timestamp cross the client boundary. No new API
route is exposed. Database/access failures show a neutral unavailable state; an
empty authorised result shows an explicit configuration empty state.

## Rendering and language

The client shell loads `leaflet-operations-map.tsx` through `next/dynamic` with
`ssr: false`. Only that browser renderer imports Leaflet, using a static namespace
import; the shell has no Leaflet runtime dependency during server rendering.
Leaflet CSS is imported once in the root layout, before the existing ROPES styles.
Custom DivIcons avoid default PNG asset paths.
Markers fit the visible tenant's fixes. Marker selection and the keyboard-usable
Field Operations list stay in sync. The list includes assets without fixes and
remains useful without the map or basemap. Popup strings are DOM text nodes,
never interpolated provider HTML.

The desktop layout uses approximately two-thirds map and one-third Field
Operations; smaller screens stack map first. The existing dashboard cards and
other sections are unchanged. Tracking counts are local to this section:

- Assets: all assets returned for the organisation.
- Current: assets with CURRENT position freshness (including a current HELP).
- Attention required: HELP, NO_FIX, STALE, or AGING; each asset counts once.
- Active trip-linked assets: assets whose relevant trip has IN_PROGRESS status.

The attention order is HELP, NO_FIX, STALE, AGING, CURRENT, with newest message time
first within a group. Message labels are provider-neutral; HELP is “Assistance
requested.” The UI makes no emergency-service dispatch claims. Snapshot timestamps
are displayed in UTC with a relative age calculated against the same server
snapshot, avoiding hydration/timezone differences or an implication of continuous
tracking. Refresh the page to update data; no automatic polling is introduced.
Latest valid fix and latest event remain independent, including HELP-CANCEL.

## Basemap boundary

`lib/tracking/basemap.ts` isolates the public OpenStreetMap configuration. This
service is approved **only for synthetic sandbox data**, not real ranger,
partner, or client locations. Public tiles are enabled only for an explicit demo
session and a database organisation marked `isDemo`; other environments show
markers and the Field Operations list without a basemap. Do not load operational
locations into this demo path. A future real-data basemap needs separate privacy,
provider, capacity, and operational review; this is not production configuration.

The map uses the [OSMF standard tile URL and visible attribution](https://operations.osmfoundation.org/policies/tiles/),
normal browser caching/referrers, no key, no prefetching, and no offline download.
Tile availability is best effort; failures show an inline notice while keeping
markers and the list usable. Leaflet API reference: [Leaflet core](https://leafletjs.com/reference.html).

## Explicit synthetic tracking loader

Command: `npm run tracking:demo:load`.

The command does not run automatically. It checks guards **before constructing a
database client**, then checks them again in the loading function:

- `DATABASE_URL` selects exactly `ropes_demo` (connection overrides rejected).
- `NODE_ENV` is not `production`.
- `ROPES_DEMO_MODE` is `true`, `1`, or `enabled`.
- `ALLOW_SYNTHETIC_TRACKING_FIXTURES` is exactly `true`.

Provide the database URL through existing private local configuration; never put
credentials in documentation, command history, commits, or PRs. An operator may
invoke the command in an authorised disposable environment with the above flags.
Codex has **not** run it against TrueNAS or another remote database.

The primary existing organisation must be
`ropes-demo-aboriginal-corporation` and have `isDemo=true`. If
`demo-enarah-services` also exists and is marked demo, one separate fixture asset
is added there to demonstrate isolation. No organisation is created or changed.
Non-demo organisations are never modified. The loader may add the existing SPOT
capability and only tracking integrations, assets, messages, and assignments.
It never changes Trips, Vehicles, Users, Memberships, Organisations, or Grants,
and never invokes the general seed or migration commands.

Six primary assets cover CURRENT, AGING, STALE, NO_FIX, TRACKING, CHECK_IN, HELP,
and a coordinate-less HELP-CANCEL following a valid fix. Coordinates near (0, 0)
are invented open-ocean points. A fixture may link to an existing demo Vehicle
and PLANNED/IN_PROGRESS Trip. Assignment windows surround the injected clock so
an older existing demo trip need not be edited. If no eligible trip/vehicle
exists, loading still succeeds with an unlinked asset.

The loader runs in one serializable transaction. Stable fixture identities make
reruns idempotent; only owned synthetic rows and timestamps are refreshed. A
collision with another organisation or non-fixture identity aborts the whole
transaction. Integrations are disabled and must remain disabled. No secrets are
resolved or used. The normal ingestion helper keeps its immutable duplicate
semantics; timestamp refresh is confined to this explicit synthetic loader.

## Tests and verification

`tests/tracking-operations.test.ts` covers labels, attention order, no-fix list
inclusion, timestamps, empty models, and dashboard capability gating.
`tests/tracking-demo-loader.test.ts` applies the existing migrations to an isolated
in-memory PostgreSQL engine, loads fixtures, and exercises actual Prisma helpers,
database demo sessions, tenant access, rerun safety, ownership conflicts, preserved
business records, empty tenants, DTO sanitisation, and guard failures.
No live database URL is used by these tests. No new test framework is added.


## Client initialisation fix

The deployed Slice 2 failure was isolated to map bootstrap; the old blanket catch
hid whether the module failed to load or map construction failed. The pre-fix
compiled map initialised locally, so the exact deployed exception is unconfirmed.
An environment-specific module/chunk or constructor failure remains plausible;
this change makes the browser-only boundary explicit rather than claiming a
confirmed namespace error. The unguarded ResizeObserver construction was another
failure path, now optional, but would occur after markers/tiles were created and
does not explain the reported absence of both by itself.

The renderer owns map construction, markers, tile layers, bounds, popups, focus
and cleanup. The existing shell owns list selection, counts, no-fix handling and
message language. Re-selecting the same item issues a new focus request. Effect
cleanup disconnects resize observation and removes the Leaflet instance before
Strict Mode setup or a later mount reuses the element. ResizeObserver absence
skips observation without disabling the map.

Browser diagnostics use fixed codes and allowlisted built-in error categories:

- `LEAFLET_COMPONENT_LOAD_FAILED`: renderer/module chunk import failed.
- `LEAFLET_MAP_CONSTRUCTOR_FAILED`: map construction failed.
- `LEAFLET_MAP_SETUP_FAILED`: marker/bounds setup failed.
- `LEAFLET_TILE_LAYER_FAILED`: tile creation/load failed; map remains usable.
- `LEAFLET_RESIZE_OBSERVER_FAILED`: optional resize observation failed.

Module/map failures preserve the existing user-safe map message and Field
Operations. Tile failures are warnings, reported once per map instance, and never
set the map-initialisation failure state. Diagnostics omit raw exception messages,
stacks, URLs, events, DTOs and provider payloads.

`tests/tracking-map-client.test.ts` adds server-rendering/boundary regressions,
marker filtering and exact-ID focus checks, absent observer/cleanup coverage and
safe diagnostic tests. Browser acceptance uses existing synthetic fixture DTOs on
a temporary localhost-only preview, removed before delivery; it does not load
fixtures into any database or contact TrueNAS. No tracking data, tenant logic,
DTO, freshness calculation, synthetic coordinate, schema or migration changes are
part of this fix.


Local browser acceptance for this fix:

- Development (`next dev`, including Strict Mode): one Leaflet container, two
  valid-position marker elements and nine loaded synthetic OSM tile images.
- Compiled (`next build` + `next start`): the same marker/tile checks, list-to-map
  pan and popup, marker-to-list selection, remount and full reload all passed.
- Development additionally passed repeated mount/unmount cycles, absent global
  ResizeObserver, disabled tiles, and deliberately browser-blocked tile requests.
  Failed tiles emitted only the tile-layer diagnostic and warning; marker focus
  and popups still worked. The approved basemap configuration was restored.
- Normal initialisation in both modes produced no browser console errors or
  warnings. No `Map container is already initialized` exception occurred.

The temporary QA page and controls are not part of the delivered application.
The sandbox's original exception still needs confirmation in that environment
if it recurs; no TrueNAS access or deployment was performed for this fix.
