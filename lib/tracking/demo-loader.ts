import type { Prisma, PrismaClient } from "@prisma/client";
import { isExplicitDemoModeEnabled } from "../read-access-mode";
import { getModuleKeyForCapability } from "../capability-registry";
import { normaliseSpotMessage } from "./domain";

export const syntheticTrackingOrganisationSlug = "ropes-demo-aboriginal-corporation";
const otherDemoSlug = "demo-enarah-services";
export class SyntheticTrackingGuardError extends Error {}

export function assertSyntheticTrackingEnvironment(env: Record<string, string | undefined>) {
  if (env.NODE_ENV === "production") throw new SyntheticTrackingGuardError("Synthetic tracking is forbidden in production mode.");
  if (!isExplicitDemoModeEnabled(env)) throw new SyntheticTrackingGuardError("Explicit ROPES demo mode is required.");
  if (env.ALLOW_SYNTHETIC_TRACKING_FIXTURES !== "true") {
    throw new SyntheticTrackingGuardError("ALLOW_SYNTHETIC_TRACKING_FIXTURES=true is required.");
  }
  let url: URL;
  try { url = new URL(env.DATABASE_URL ?? ""); }
  catch { throw new SyntheticTrackingGuardError("A valid disposable demo database URL is required."); }
  // Reject connection-string overrides that could replace the database selected
  // by the path. Do not print the URL, username, password, or host in errors.
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== "/ropes_demo" ||
      [...url.searchParams.keys()].some((key) => !["schema", "sslmode", "connection_limit", "pool_timeout"].includes(key))) {
    throw new SyntheticTrackingGuardError("Synthetic tracking requires exactly the ropes_demo database without connection overrides.");
  }
}

const scenarios = [
  { key: "current", name: "Synthetic field tracker", minutes: 5, type: "TRACK", latitude: 0.1, longitude: -0.1 },
  { key: "aging", name: "Synthetic check-in tracker", minutes: 30, type: "OK", latitude: 0.12, longitude: -0.12 },
  { key: "stale", name: "Synthetic stale tracker", minutes: 180, type: "TRACK", latitude: 0.14, longitude: -0.14 },
  { key: "no-fix", name: "Synthetic no-fix tracker", minutes: 2, type: "HELP-CANCEL", latitude: null, longitude: null },
  { key: "help", name: "Synthetic assistance tracker", minutes: 4, type: "HELP", latitude: 0.16, longitude: -0.16 },
  { key: "cancelled", name: "Synthetic cancelled assistance", minutes: 5, type: "HELP", latitude: 0.18, longitude: -0.18 },
] as const;

// Explicit, transactional fixture loading only. No seed, migrations, provider requests,
// provider polling, or modifications to existing business entities.
export async function loadSyntheticTrackingData(
  prisma: PrismaClient,
  env: Record<string, string | undefined>,
  now = new Date(),
) {
  assertSyntheticTrackingEnvironment(env);
  if (!Number.isFinite(now.getTime())) throw new SyntheticTrackingGuardError("A valid fixture clock is required.");
  return prisma.$transaction(async (db) => {
    const primary = await db.organisation.findUnique({ where: { slug: syntheticTrackingOrganisationSlug } });
    if (!primary?.isDemo) throw new SyntheticTrackingGuardError("The existing target organisation must be marked as demo.");
    const other = await db.organisation.findUnique({ where: { slug: otherDemoSlug } });
    const organisations = [primary, ...(other?.isDemo ? [other] : [])];
    let assetCount = 0;
    let linkedCount = 0;
    for (const organisation of organisations) {
      const integrationId = `synthetic-operations-${organisation.id}`;
      const credentialKey = `synthetic-operations-key-${organisation.id}`;
      const existing = await db.trackingIntegration.findUnique({ where: { id: integrationId } });
      if (existing && (!existing.isDemo || existing.organisationId !== organisation.id ||
          existing.provider !== "SPOT" || existing.credentialKey !== credentialKey || existing.enabled)) {
        throw new SyntheticTrackingGuardError("A fixture integration identity is already in use; refusing to modify it.");
      }
      await db.trackingIntegration.upsert({
        where: { id: integrationId }, update: {},
        create: { id: integrationId, organisationId: organisation.id, provider: "SPOT",
          name: "Synthetic Operations Map fixtures", credentialKey, enabled: false, isDemo: true },
      });
      await db.organisationCapability.upsert({
        where: { organisationId_key: { organisationId: organisation.id, key: "integrations.spotTracker" } },
        update: {}, create: { organisationId: organisation.id, key: "integrations.spotTracker",
          moduleKey: getModuleKeyForCapability("integrations.spotTracker"), isDemo: true },
      });
      const vehicle = await db.vehicle.findFirst({ where: { organisationId: organisation.id, isDemo: true }, orderBy: { id: "asc" } });
      const trip = await db.trip.findFirst({
        where: { organisationId: organisation.id, isDemo: true, status: { in: ["IN_PROGRESS", "PLANNED"] } },
        orderBy: [{ status: "desc" }, { startsAt: "asc" }, { id: "asc" }],
      });
      const selectedScenarios = organisation.id === primary.id ? scenarios : [scenarios[0]];
      for (const scenario of selectedScenarios) {
        const assetId = `${integrationId}-${scenario.key}`;
        const externalAssetId = `synthetic-map-messenger-${scenario.key}`;
        const existingAsset = await db.trackingAsset.findUnique({ where: { id: assetId } });
        if (existingAsset && (!existingAsset.isDemo || existingAsset.organisationId !== organisation.id ||
            existingAsset.trackingIntegrationId !== integrationId || existingAsset.externalAssetId !== externalAssetId)) {
          throw new SyntheticTrackingGuardError("A fixture asset identity is already in use; refusing to move or modify it.");
        }
        const fields = { displayName: scenario.name, providerDisplayName: "Synthetic messenger",
          model: "Synthetic SPOT-like model", expectedTrackingIntervalMinutes: 5,
          defaultVehicleId: scenario.key === "current" ? vehicle?.id ?? null : null };
        await db.trackingAsset.upsert({
          where: { id: assetId }, update: fields,
          create: { id: assetId, organisationId: organisation.id, trackingIntegrationId: integrationId,
            externalAssetId, isDemo: true, ...fields },
        });
        await writeFixtureMessage(db, organisation.id, integrationId, assetId,
          `synthetic-map-${scenario.key}`, scenario.type, scenario.minutes,
          scenario.latitude, scenario.longitude, now);
        if (scenario.key === "cancelled") {
          await writeFixtureMessage(db, organisation.id, integrationId, assetId,
            "synthetic-map-help-cancel", "HELP-CANCEL", 1, null, null, now);
        }
        if (scenario.key === "current" && trip) {
          const previous = await db.tripTrackingAssignment.findUnique({ where: {
            tripId_trackingAssetId: { tripId: trip.id, trackingAssetId: assetId },
          } });
          if (previous && (!previous.isDemo || previous.organisationId !== organisation.id)) {
            throw new SyntheticTrackingGuardError("A non-fixture tracking assignment cannot be modified.");
          }
          const assignment = { vehicleId: vehicle?.id ?? null, role: "PRIMARY" as const,
            assignedFrom: new Date(now.getTime() - 60 * 60_000), assignedUntil: new Date(now.getTime() + 60 * 60_000) };
          await db.tripTrackingAssignment.upsert({
            where: { tripId_trackingAssetId: { tripId: trip.id, trackingAssetId: assetId } }, update: assignment,
            create: { organisationId: organisation.id, tripId: trip.id, trackingAssetId: assetId, isDemo: true, ...assignment },
          });
          linkedCount++;
        }
        assetCount++;
      }
    }
    return { organisations: organisations.length, assets: assetCount, tripLinked: linkedCount };
  }, { isolationLevel: "Serializable" });
}

async function writeFixtureMessage(db: Prisma.TransactionClient, organisationId: string,
  integrationId: string, assetId: string, externalMessageId: string, type: string,
  minutes: number, latitude: number | null, longitude: number | null, now: Date,
) {
  const existing = await db.trackingMessage.findUnique({ where: {
    trackingIntegrationId_externalMessageId: { trackingIntegrationId: integrationId, externalMessageId },
  } });
  if (existing && (!existing.isDemo || existing.organisationId !== organisationId || existing.trackingAssetId !== assetId)) {
    throw new SyntheticTrackingGuardError("A fixture message identity is already in use; refusing to modify it.");
  }
  const message = normaliseSpotMessage({ externalMessageId, providerMessageType: type,
    occurredAt: new Date(now.getTime() - minutes * 60_000), latitude, longitude });
  // Refresh only owned synthetic timestamps on rerun so freshness cases remain
  // useful. Normal ingestion retains its existing immutable/idempotent semantics.
  await db.trackingMessage.upsert({
    where: { trackingIntegrationId_externalMessageId: { trackingIntegrationId: integrationId, externalMessageId } },
    update: { ...message, receivedAt: now },
    create: { organisationId, trackingIntegrationId: integrationId, trackingAssetId: assetId,
      isDemo: true, receivedAt: now, ...message },
  });
}
