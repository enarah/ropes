# SPOT Tracking and Organisation Operations Map Architecture

Status: sandbox design for issue #187  
Target experiment branch: `experiment/spot-tracking-dashboard`  
Promotion target after sandbox review: `sandbox/truenas`

## 1. Objective

Integrate SPOT satellite tracker feeds into ROPES so that:

- tracking assets can be assigned to organisation-scoped trips;
- the organisation landing dashboard shows a near-real-time operations map;
- trip plans and TMP/JMP workflows show the tracking devices allocated to the trip;
- ROPES retains useful historical tracker messages beyond SPOT's short feed window;
- no tracker feed credential or cross-organisation location data is exposed to the browser.

This is an operations/safety aid. It is not a replacement for SPOT emergency response services.

## 2. Existing ROPES fit

ROPES already has:

- organisation-scoped access and fail-closed tenant guards;
- persisted Trips;
- TripVehicleAllocation;
- Vehicles;
- TripRiskAssessment, including the current free-text `spotGarminDetails` field;
- an organisation landing dashboard;
- the capability `integrations.spotTracker`.

Use those existing boundaries rather than creating a separate tracking tenancy model.

The current trip-save flow deletes and recreates TripVehicleAllocation rows. Therefore tracking assignments must not depend on a TripVehicleAllocation foreign key. A tracking assignment may reference a stable Vehicle directly.

## 3. Provider boundary

All provider access remains server-side.

The browser must never receive:

- SPOT Feed ID;
- SPOT feed password;
- provider request URLs containing credentials;
- raw provider configuration.

ROPES exposes only sanitised organisation-scoped tracking data to UI components.

Initial provider: SPOT.

The internal tracking model must remain provider-neutral enough to support future providers such as Garmin/inReach or another satellite tracking system.

## 4. Secret handling

Treat both the SPOT Feed ID and feed password as secrets.

Do not store either value in normal ROPES tables.

`TrackingIntegration` stores only a `credentialKey`, for example:

`enarah-primary-spot`

The server resolves secrets from private runtime configuration using a deterministic convention such as:

- `ROPES_TRACKING_ENARAH_PRIMARY_SPOT_FEED_ID`
- `ROPES_TRACKING_ENARAH_PRIMARY_SPOT_FEED_PASSWORD`

The exact environment variable names can be generated from the credential key.

TrueNAS keeps these variables in private app configuration. They are never committed.

Future production deployment can replace the environment resolver with a secret-manager-backed resolver without changing the tracking domain model.

## 5. Proposed data model

### TrackingProvider

Initial enum value:

- SPOT

Future provider values can be added without changing Trip relationships.

### TrackingIntegration

One organisation may have multiple feeds/integrations.

Fields:

- id
- organisationId
- provider
- name
- credentialKey
- enabled
- pollIntervalSeconds, default 180
- lastPollAttemptAt
- lastPollSuccessAt
- lastErrorCode
- lastErrorAt
- createdAt
- updatedAt
- isDemo

Constraints:

- credentialKey unique;
- organisation/provider/name unique or otherwise collision-safe;
- index organisationId;
- never persist provider secrets.

### TrackingAsset

Represents the physical messenger/device.

Fields:

- id
- organisationId
- trackingIntegrationId
- externalAssetId — SPOT messengerId
- displayName
- providerDisplayName — source messengerName
- model
- status: ACTIVE / INACTIVE / RETIRED
- defaultVehicleId nullable
- expectedTrackingIntervalMinutes nullable
- createdAt
- updatedAt
- isDemo

Constraints:

- unique trackingIntegrationId + externalAssetId;
- defaultVehicle must belong to the same organisation;
- index organisationId;
- index defaultVehicleId.

### TrackingMessage

Provider-neutral record of every relevant message.

Fields:

- id
- organisationId
- trackingIntegrationId
- trackingAssetId
- externalMessageId
- occurredAt
- receivedAt
- messageKind
- providerMessageType
- latitude nullable
- longitude nullable
- messageContent nullable
- createdAt
- isDemo

Normalised `messageKind`:

- TRACKING
- CHECK_IN
- MOVEMENT
- HELP
- HELP_CANCEL
- CUSTOM
- POINT_OF_INTEREST
- STOP
- UNKNOWN

Keep the original SPOT type in `providerMessageType`.

SPOT message IDs are used for idempotent ingestion.

Coordinates are nullable because some provider events can contain invalid or non-location values. Invalid latitude/longitude must never be rendered on the map.

Constraints/indexes:

- unique trackingIntegrationId + externalMessageId;
- index organisationId + occurredAt;
- index trackingAssetId + occurredAt;
- index trackingAssetId + messageKind + occurredAt.

Do not store the entire raw provider response by default.

### TripTrackingAssignment

Connects an organisation asset to a trip.

Fields:

- id
- organisationId
- tripId
- trackingAssetId
- vehicleId nullable
- role: PRIMARY / SUPPORT / PERSON / OTHER
- assignedFrom nullable
- assignedUntil nullable
- notes nullable
- createdAt
- updatedAt
- isDemo

Constraints:

- unique tripId + trackingAssetId;
- trip, asset and vehicle must all belong to the same organisation;
- do not reference TripVehicleAllocation because those rows are currently recreated during trip edits.

The assignment window defaults logically to the trip start/end when explicit values are absent.

## 6. SPOT ingestion adapter

Module boundary:

`lib/tracking/providers/spot.ts`

Responsibilities:

- resolve provider credentials only on the server;
- construct the SPOT request;
- parse JSON responses defensively;
- normalise a single-message object or a message array;
- normalise provider message types;
- reject invalid coordinates while preserving the message event;
- return provider-neutral message objects.

Do not perform Prisma writes inside the provider adapter.

A separate service:

`lib/tracking/sync.ts`

handles:

- organisation/integration lookup;
- provider adapter invocation;
- asset discovery/upsert;
- message deduplication/upsert;
- sync timestamps;
- sanitised error recording;
- audit/log output.

## 7. SPOT polling strategy

Provider constraints require conservative polling.

Initial schedule:

- one poll per enabled feed approximately every 180 seconds;
- never poll one feed more frequently than the documented provider minimum;
- if multiple feeds exist, space requests by at least two seconds;
- add small jitter so all integrations do not fire simultaneously.

Initial ingestion should accept the newest available messages and then continue forward.

Do not aggressively page an existing feed in rapid succession because paging requests are still calls to the same feed.

Historical ROPES retention becomes independent of SPOT's provider-side feed window once messages are ingested.

## 8. Sandbox worker

TrueNAS sandbox should eventually run a second non-public container/service:

`tracking-worker`

It uses the same ROPES application image but runs a worker command such as:

`npm run tracking:sync:loop`

Characteristics:

- no exposed ports;
- same private database network;
- private tracking environment variables available only server-side;
- restart policy suitable for a worker;
- sleeps between cycles;
- exits/fails visibly on unrecoverable configuration errors;
- does not seed, migrate or build.

Deployment and tracking sync remain separate concepts. Automatic sync is acceptable; automatic code deployment remains disabled.

Future Argus deployment can use a systemd timer/service instead of the TrueNAS worker.

## 9. Dashboard read model

Server-side function:

`getOrganisationTrackingOverview(organisationId)`

Returns only sanitised data:

- assetId
- displayName
- latest valid latitude/longitude
- latest valid position time
- latest message time
- latest normalised message kind
- provider display name/model
- associated vehicle summary
- current trip summary
- freshness classification

Never return:

- integration credential key;
- Feed ID;
- feed password;
- provider URL.

The dashboard obtains organisation access through the existing organisation page access flow before querying tracking data.

## 10. Freshness model

Do not label a device “offline” merely because no new message arrived recently.

Use four presentation states:

- CURRENT
- AGING
- STALE
- NO_FIX

Thresholds should account for the configured expected tracking interval.

Initial rule:

- CURRENT: position age <= max(15 minutes, 2 x expected interval)
- AGING: position age <= max(60 minutes, 6 x expected interval)
- STALE: older than AGING threshold
- NO_FIX: no valid coordinate has ever been ingested

If no expected interval is configured, use 15 minutes / 60 minutes.

A stale asset is more operationally important when attached to a trip currently inside its monitoring window.

## 11. Message severity

SPOT public-feed HELP is not to be presented as an SOS response event.

Presentation:

- TRACKING / MOVEMENT: normal
- CHECK_IN: positive check-in
- CUSTOM / POI / STOP: informational
- HELP: high-attention “Assistance requested”
- HELP_CANCEL: “Assistance request cancelled”
- UNKNOWN: neutral provider event

Do not claim emergency-service dispatch or SOS state unless a future provider contract explicitly supplies that information.

## 12. Landing dashboard UX

For organisations with `integrations.spotTracker` enabled, the Overview page gains an **Operations Map** after the top summary cards.

Recommended desktop layout:

- map: approximately two-thirds width;
- Field Operations panel: approximately one-third width.

Map marker popover:

- asset display name;
- linked vehicle;
- active/planned trip;
- trip lead;
- latest valid position time;
- latest message time/type;
- freshness;
- links to Trip and Tracking Asset details.

Map behaviour:

- fit bounds to organisation-visible assets;
- never show another organisation's markers;
- show an empty state when no asset has a fix;
- optionally draw recent trail for selected asset;
- high-attention presentation for HELP events;
- timestamp every displayed location.

The first sandbox implementation may use Leaflet in a client component while all data loading remains server-side.

Tile provider is a separate infrastructure choice. Keep it replaceable.

## 13. Dashboard metrics

As tracking matures, replace placeholder overview metrics with operational values such as:

- Active trips
- Assets in field
- Current tracker fixes
- Attention required

Do not make “tracker stale” itself equivalent to an emergency.

## 14. Trip planning UX

Add **Tracking & Communications** after Vehicles and before Itinerary.

For a persisted trip, operators can select organisation-visible tracking assets.

For each assignment:

- tracker;
- linked vehicle, optional;
- role;
- expected monitoring interval, inherited/displayed from asset;
- optional notes.

The available vehicle dropdown should use stable organisation Vehicle records, not TripVehicleAllocation IDs.

On save, validate:

- trip organisation equals asset organisation;
- linked vehicle belongs to the same organisation;
- optionally warn if selected vehicle is not also allocated to the trip.

## 15. Trip detail UX

Add a Tracking panel showing:

- assigned trackers;
- associated vehicle;
- latest valid position;
- last message;
- freshness;
- link/focus on map;
- recent breadcrumb/trail.

For an active trip, this panel becomes the natural operational monitoring view.

The TMP/JMP risk assessment should display assigned trackers automatically and retain `spotGarminDetails` as “Other satellite / communications notes” for non-integrated equipment or special instructions.

Do not silently delete existing text from `spotGarminDetails`.

## 16. Map component boundary

Suggested component structure:

- `components/tracking/operations-map.tsx` — client-only map renderer
- `components/tracking/operations-summary.tsx`
- `components/tracking/trip-tracking-panel.tsx`
- `components/tracking/tracking-assignment-form.tsx`

The map receives a serialisable DTO only.

Do not import Prisma, auth helpers or provider adapters into client components.

## 17. Routes/actions

Initial server interfaces:

- dashboard uses server-side read functions directly;
- trip assignment uses normal server actions under existing tenant-guard patterns;
- tracking sync is operator/worker-only, not a public browser endpoint.

Optional later administrative pages:

- `/settings/integrations/tracking`
- `/tracking/assets/[assetId]`

Do not add a public unauthenticated tracking endpoint.

## 18. Capability gating

Use existing capability:

`integrations.spotTracker`

Rules:

- dashboard Operations Map only when enabled;
- assignment controls only when enabled;
- server reads/writes must still enforce organisation tenancy even when capability-gated;
- capability hiding is not a security boundary by itself.

For the sandbox demo organisation, enable the capability explicitly without reseeding the whole database.

## 19. Synthetic fixtures

Before real SPOT credentials are connected, build synthetic fixtures for:

- normal TRACK;
- OK/check-in;
- HELP;
- HELP-CANCEL with invalid/no coordinates;
- stale position;
- multiple assets in one organisation;
- another organisation asset to prove isolation;
- asset assigned to a trip and vehicle.

These fixtures should exercise the same read model used by real data.

## 20. Testing

Required tests:

### Provider adapter
- parses single message and arrays;
- recognises known message types;
- preserves unknown message type;
- rejects invalid coordinates without dropping message;
- no secret values in thrown/logged errors.

### Sync
- idempotent external message ingestion;
- asset discovery scoped to integration organisation;
- no cross-org reassignment;
- successful/failed sync metadata.

### Tenant isolation
- organisation A cannot read organisation B trackers/messages;
- organisation A cannot assign B tracker to its trip;
- organisation A cannot link B vehicle.

### Dashboard
- returns latest valid coordinate independently from latest event;
- freshness classifications;
- HELP presentation;
- empty state.

### Trip
- assignment create/update/remove;
- vehicle relationship validation;
- existing trip save does not orphan tracking assignments.

## 21. Delivery sequence

### Slice 1 — domain foundation
- Prisma models/migration
- normalisation types
- synthetic fixtures
- tenant-scoped tracking data layer
- tests

No real SPOT call.

### Slice 2 — dashboard map
- Operations Map
- organisation scoped synthetic assets
- freshness/status panel
- map UX

### Slice 3 — trip assignment
- Tracking & Communications section
- assignment persistence
- Trip detail tracking panel
- TMP/JMP display integration

### Slice 4 — SPOT adapter
- server-side SPOT provider adapter
- credential resolver
- response parsing
- manual one-shot sync command
- fixtures/tests

### Slice 5 — sandbox live feed
- private TrueNAS secret configuration
- real feed sync
- identify actual SPOT messengers
- map real locations
- no automatic worker yet until one-shot sync is proven

### Slice 6 — scheduled sandbox sync
- tracking worker
- approximately three-minute polling
- error/freshness telemetry
- TrueNAS deployment validation

### Slice 7 — field trial
- link one real SPOT asset to one sandbox trip
- conduct controlled movement test
- verify route and timing
- refine UX

Only after those stages should broader devices/organisations be added.

## 22. Argus promotion boundary

Nothing about the sandbox SPOT integration authorises Argus changes.

A successful feature is promoted by:

1. selecting the accepted commits;
2. creating a clean branch from current main;
3. reviewing schema changes and data migration;
4. PR to main;
5. full CI;
6. new Argus release artifact/preflight;
7. separate operational approval for secrets, scheduler and production tracking feed.

The TrueNAS feed credentials are not copied automatically to Argus.
