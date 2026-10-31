import { normaliseSpotMessage } from "./domain";

// Invented IDs and open-ocean coordinates around (0, 0). No operational data.
// Not connected to seed.ts or any production/demo fallback.
export const syntheticTrackingNow = new Date("2030-01-01T12:00:00Z");
export const syntheticTrackingOrganisations = [
  { id: "synthetic-org-a", name: "Synthetic A", slug: "synthetic-tracking-a" },
  { id: "synthetic-org-b", name: "Synthetic B", slug: "synthetic-tracking-b" },
];
export const syntheticTrackingIntegrations = syntheticTrackingOrganisations.map((org, index) => ({
  id: `synthetic-integration-${index}`, organisationId: org.id,
  provider: "SPOT" as const, name: `Synthetic integration ${index}`,
  credentialKey: `synthetic-opaque-key-${index}`, enabled: false, isDemo: true,
}));
export const syntheticTrackingAssets = [
  { id: "synthetic-tracker-track", organisationId: "synthetic-org-a", trackingIntegrationId: "synthetic-integration-0",
    externalAssetId: "synthetic-messenger-track", displayName: "Synthetic field tracker", defaultVehicleId: "synthetic-vehicle-a" },
  { id: "synthetic-tracker-stale", organisationId: "synthetic-org-a", trackingIntegrationId: "synthetic-integration-0",
    externalAssetId: "synthetic-messenger-stale", displayName: "Synthetic stale tracker", defaultVehicleId: null },
  { id: "synthetic-tracker-no-fix", organisationId: "synthetic-org-a", trackingIntegrationId: "synthetic-integration-0",
    externalAssetId: "synthetic-messenger-no-fix", displayName: "Synthetic no-fix tracker", defaultVehicleId: null },
  { id: "synthetic-tracker-b", organisationId: "synthetic-org-b", trackingIntegrationId: "synthetic-integration-1",
    externalAssetId: "synthetic-messenger-b", displayName: "Synthetic other organisation tracker", defaultVehicleId: null },
].map((asset) => ({ ...asset, providerDisplayName: "Synthetic messenger", model: "Synthetic SPOT-like model",
  expectedTrackingIntervalMinutes: 5, isDemo: true }));
export const syntheticTrackingVehicles = syntheticTrackingOrganisations.map((org, index) => ({
  id: `synthetic-vehicle-${index === 0 ? "a" : "b"}`, organisationId: org.id,
  name: `Synthetic vehicle ${index}`, registration: `SYNTHETIC-${index}`,
  make: "Synthetic", model: "Fixture", isDemo: true,
}));
export const syntheticTrackingTrips = syntheticTrackingOrganisations.map((org, index) => ({
  id: `synthetic-trip-${index === 0 ? "a" : "b"}`, organisationId: org.id,
  title: `Synthetic trip ${index}`, purpose: "Offline fixture only", destination: "Synthetic destination",
  status: "IN_PROGRESS" as const, startsAt: new Date("2030-01-01T10:00:00Z"),
  endsAt: new Date("2030-01-01T14:00:00Z"), isDemo: true,
}));
export const syntheticTrackingAssignment = {
  organisationId: "synthetic-org-a", tripId: "synthetic-trip-a", trackingAssetId: "synthetic-tracker-track",
  vehicleId: "synthetic-vehicle-a", role: "PRIMARY" as const, isDemo: true,
};

export const syntheticTrackingMessages = [
  { assetId: "synthetic-tracker-track", type: "TRACK", time: "11:50:00", latitude: 0.1, longitude: -0.1 },
  { assetId: "synthetic-tracker-track", type: "OK", time: "11:52:00", latitude: 0.11, longitude: -0.11 },
  { assetId: "synthetic-tracker-track", type: "HELP", time: "11:55:00", latitude: 0.12, longitude: -0.12 },
  { assetId: "synthetic-tracker-track", type: "HELP-CANCEL", time: "11:59:00", latitude: 999, longitude: null },
  { assetId: "synthetic-tracker-stale", type: "TRACK", time: "09:00:00", latitude: 0.2, longitude: -0.2 },
  { assetId: "synthetic-tracker-no-fix", type: "HELP-CANCEL", time: "11:58:00", latitude: null, longitude: null },
  { assetId: "synthetic-tracker-b", type: "TRACK", time: "11:58:00", latitude: -0.2, longitude: 0.2 },
].map((event, index) => ({
  assetId: event.assetId,
  message: normaliseSpotMessage({ externalMessageId: `synthetic-message-${index}`,
    occurredAt: new Date(`2030-01-01T${event.time}Z`), providerMessageType: event.type,
    latitude: event.latitude, longitude: event.longitude }),
}));
