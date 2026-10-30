import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { createTrackingDataLayer } from "../lib/tracking/data";
import { authorizeTrackingOrganisation } from "../lib/tracking/access";
import { OrganisationCapabilityError } from "../lib/organisation-capabilities";
import { TenantGuardError } from "../lib/tenant-guards";
import {
  syntheticTrackingAssets, syntheticTrackingAssignment, syntheticTrackingIntegrations,
  syntheticTrackingMessages, syntheticTrackingNow, syntheticTrackingOrganisations,
  syntheticTrackingTrips, syntheticTrackingVehicles,
} from "../lib/tracking/fixtures";

// In-memory PostgreSQL only: never reads DATABASE_URL or opens a network connection.
test("tracking data layer and additive migration on isolated PostgreSQL", async (t) => {
  const database = new PGlite();
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(database) });
  t.after(async () => { await prisma.$disconnect(); await database.close(); });
  const migrations = new URL("../prisma/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => /^\d/.test(name) && name !== "0019_tracking_domain").sort()) {
    await database.exec(readFileSync(new URL(`${name}/migration.sql`, migrations), "utf8"));
  }
  await prisma.organisation.createMany({ data: syntheticTrackingOrganisations });
  await prisma.organisationCapability.createMany({ data: syntheticTrackingOrganisations.map((org) => ({
    organisationId: org.id, key: "integrations.spotTracker", moduleKey: "integrations",
  })) });
  await prisma.vehicle.createMany({ data: syntheticTrackingVehicles });
  await prisma.trip.createMany({ data: syntheticTrackingTrips });
  // Upgrade a populated pre-tracking schema, rather than only an empty database.
  await database.exec(readFileSync(new URL("0019_tracking_domain/migration.sql", migrations), "utf8"));
  assert.equal(await prisma.trip.count(), 2);
  assert.equal(await prisma.vehicle.count(), 2);
  await prisma.trackingIntegration.createMany({ data: syntheticTrackingIntegrations });
  await prisma.trackingAsset.createMany({ data: syntheticTrackingAssets });
  await prisma.tripTrackingAssignment.create({ data: syntheticTrackingAssignment });

  function layerFor(allowedOrganisation: string) {
    return createTrackingDataLayer({ prisma, async authorize(organisationId) {
      await authorizeTrackingOrganisation(prisma, organisationId, { userId: "synthetic-user", memberships: [
        { organisationId: allowedOrganisation, status: "ACTIVE" },
      ] });
    } });
  }
  const a = layerFor("synthetic-org-a");
  const b = layerFor("synthetic-org-b");
  for (const fixture of syntheticTrackingMessages) {
    const asset = syntheticTrackingAssets.find((asset) => asset.id === fixture.assetId)!;
    await (asset.organisationId === "synthetic-org-a" ? a : b).storeTrackingMessage(
      asset.organisationId, asset.trackingIntegrationId, asset.id, fixture.message,
    );
  }

  await t.test("latest valid position differs from latest event; trip/vehicle retained; DTO is sanitised", async () => {
    const overview = await a.getOrganisationTrackingOverview("synthetic-org-a", syntheticTrackingNow);
    assert.equal(overview.length, 3);
    const field = overview.find((asset) => asset.assetId === "synthetic-tracker-track")!;
    assert.equal(field.latitude, 0.12);
    assert.equal(field.longitude, -0.12);
    assert.equal(field.latestPositionAt, "2030-01-01T11:55:00.000Z");
    assert.equal(field.latestMessageAt, "2030-01-01T11:59:00.000Z");
    assert.equal(field.latestMessageKind, "HELP_CANCEL");
    assert.equal(field.freshness, "CURRENT");
    assert.equal(field.vehicle?.id, "synthetic-vehicle-a");
    assert.equal(field.trip?.id, "synthetic-trip-a");
    assert.equal(overview.find((asset) => asset.assetId === "synthetic-tracker-stale")?.freshness, "STALE");
    const noFix = overview.find((asset) => asset.assetId === "synthetic-tracker-no-fix")!;
    assert.equal(noFix.freshness, "NO_FIX");
    assert.equal(noFix.latitude, null);
    assert.equal(noFix.latestMessageKind, "HELP_CANCEL");
    const retained = await prisma.trackingMessage.findUniqueOrThrow({ where: {
      trackingIntegrationId_externalMessageId: { trackingIntegrationId: "synthetic-integration-0", externalMessageId: "synthetic-message-3" },
    } });
    assert.equal(retained.latitude, null);
    assert.equal(retained.longitude, null);
    assert.equal(retained.messageKind, "HELP_CANCEL");
    const json = JSON.stringify(overview);
    for (const forbidden of ["credentialKey", "synthetic-opaque-key", "externalAssetId", "externalMessageId",
      "trackingIntegrationId", "providerMessageType", "messageContent", "password", "feedId", "providerUrl"]) {
      assert.equal(json.includes(forbidden), false, forbidden);
    }
    assert.deepEqual(Object.keys(field).sort(), ["assetId", "displayName", "provider", "providerDisplayName", "model",
      "latitude", "longitude", "latestPositionAt", "latestMessageAt", "latestMessageKind", "vehicle", "trip", "freshness"].sort());
    assert.deepEqual(JSON.parse(json), overview);
  });

  await t.test("tenant isolation and authorisation fail closed for reads and writes", async () => {
    await assert.rejects(a.getOrganisationTrackingOverview("synthetic-org-b"), TenantGuardError);
    assert.deepEqual((await b.getOrganisationTrackingOverview("synthetic-org-b", syntheticTrackingNow))
      .map((asset) => asset.assetId), ["synthetic-tracker-b"]);
    const unavailable = createTrackingDataLayer({ prisma, authorize: async () => { throw new Error("No access"); } });
    await assert.rejects(unavailable.getOrganisationTrackingOverview("synthetic-org-a"), /No access/);
    const fixture = syntheticTrackingMessages[6];
    await assert.rejects(a.storeTrackingMessage("synthetic-org-a", "synthetic-integration-1", fixture.assetId, fixture.message));
    await prisma.organisationCapability.delete({ where: { organisationId_key: {
      organisationId: "synthetic-org-b", key: "integrations.spotTracker",
    } } });
    await assert.rejects(b.getOrganisationTrackingOverview("synthetic-org-b"), OrganisationCapabilityError);
  });

  await t.test("cross-org trip/tracker assignments and both vehicle associations reject", async () => {
    for (const input of [
      { tripId: "synthetic-trip-a", assetId: "synthetic-tracker-b" },
      { tripId: "synthetic-trip-b", assetId: "synthetic-tracker-track" },
      { tripId: "synthetic-trip-a", assetId: "synthetic-tracker-track", vehicleId: "synthetic-vehicle-b" },
    ]) await assert.rejects(a.assignTrackingAssetToTrip("synthetic-org-a", input), TenantGuardError);
    await assert.rejects(a.associateTrackingAssetVehicle("synthetic-org-a", "synthetic-tracker-track", "synthetic-vehicle-b"), TenantGuardError);
    await assert.rejects(a.associateTrackingAssetVehicle("synthetic-org-a", "synthetic-tracker-b", "synthetic-vehicle-a"), TenantGuardError);
    assert.equal(await prisma.tripTrackingAssignment.count(), 1);
    await assert.rejects(prisma.tripTrackingAssignment.create({ data: {
      organisationId: "synthetic-org-a", tripId: "synthetic-trip-b", trackingAssetId: "synthetic-tracker-track",
    } }));
  });

  await t.test("duplicates are idempotent; out-of-order events do not replace latest event/position", async () => {
    const fixture = syntheticTrackingMessages[0];
    const count = await prisma.trackingMessage.count();
    await a.storeTrackingMessage("synthetic-org-a", "synthetic-integration-0", fixture.assetId, fixture.message);
    await a.storeTrackingMessage("synthetic-org-a", "synthetic-integration-0", fixture.assetId, fixture.message);
    assert.equal(await prisma.trackingMessage.count(), count);
    await assert.rejects(a.storeTrackingMessage("synthetic-org-a", "synthetic-integration-0",
      "synthetic-tracker-stale", fixture.message), /identity belongs to another asset/);
    await a.storeTrackingMessage("synthetic-org-a", "synthetic-integration-0", fixture.assetId,
      { ...fixture.message, externalMessageId: "synthetic-older-message", occurredAt: new Date("2029-12-31T12:00:00Z") });
    const field = (await a.getOrganisationTrackingOverview("synthetic-org-a", syntheticTrackingNow))
      .find((asset) => asset.assetId === fixture.assetId)!;
    assert.equal(field.latestMessageKind, "HELP_CANCEL");
    assert.equal(field.latitude, 0.12);
    await assert.rejects(a.storeTrackingMessage("synthetic-org-a", "synthetic-integration-1", fixture.assetId, fixture.message), /integration mismatch/);
  });

  await t.test("database rejects cross-org relations, integration/asset mismatch, and moving an empty asset", async () => {
    await assert.rejects(prisma.tripTrackingAssignment.create({ data: {
      organisationId: "synthetic-org-a", tripId: "synthetic-trip-a", trackingAssetId: "synthetic-tracker-b",
    } }));
    await assert.rejects(prisma.trackingAsset.update({ where: { id: "synthetic-tracker-track" }, data: { defaultVehicleId: "synthetic-vehicle-b" } }));
    await assert.rejects(prisma.tripTrackingAssignment.updateMany({ data: { vehicleId: "synthetic-vehicle-b" } }));
    await assert.rejects(prisma.trackingMessage.create({ data: {
      organisationId: "synthetic-org-a", trackingIntegrationId: "synthetic-integration-1", trackingAssetId: "synthetic-tracker-track",
      externalMessageId: "synthetic-invalid-integration", occurredAt: syntheticTrackingNow, messageKind: "TRACKING", providerMessageType: "TRACK",
    } }));
    await prisma.trackingAsset.create({ data: { id: "synthetic-empty-asset", organisationId: "synthetic-org-a",
      trackingIntegrationId: "synthetic-integration-0", externalAssetId: "synthetic-empty", displayName: "Empty synthetic asset" } });
    await assert.rejects(prisma.trackingAsset.update({ where: { id: "synthetic-empty-asset" },
      data: { organisationId: "synthetic-org-b", trackingIntegrationId: "synthetic-integration-1" } }), /ownership is immutable/);
    await prisma.trackingAsset.delete({ where: { id: "synthetic-empty-asset" } });
  });

  await t.test("database rejects invalid fixes and intervals", async () => {
    const base = { organisationId: "synthetic-org-a", trackingIntegrationId: "synthetic-integration-0",
      trackingAssetId: "synthetic-tracker-track", externalMessageId: "synthetic-invalid-fix", occurredAt: syntheticTrackingNow,
      messageKind: "TRACKING" as const, providerMessageType: "TRACK" };
    await assert.rejects(prisma.trackingMessage.create({ data: { ...base, latitude: 91, longitude: 0 } }));
    await assert.rejects(prisma.trackingMessage.create({ data: { ...base, latitude: 0, longitude: null } }));
    await assert.rejects(prisma.trackingAsset.update({ where: { id: "synthetic-tracker-track" }, data: { expectedTrackingIntervalMinutes: 0 } }));
  });

  await t.test("assignment upsert/windows and stable vehicle survive trip allocation recreation", async () => {
    const input = { tripId: "synthetic-trip-a", assetId: "synthetic-tracker-track", vehicleId: "synthetic-vehicle-a", role: "SUPPORT" as const };
    await a.assignTrackingAssetToTrip("synthetic-org-a", input);
    await a.assignTrackingAssetToTrip("synthetic-org-a", input);
    assert.equal(await prisma.tripTrackingAssignment.count(), 1);
    await prisma.tripVehicleAllocation.create({ data: {
      organisationId: "synthetic-org-a", tripId: "synthetic-trip-a", vehicleId: "synthetic-vehicle-a",
      name: "Synthetic", registration: "SYNTHETIC-0", status: "Assigned", rowOrder: 0,
    } });
    await prisma.tripVehicleAllocation.deleteMany({ where: { tripId: "synthetic-trip-a" } });
    await prisma.tripVehicleAllocation.create({ data: {
      organisationId: "synthetic-org-a", tripId: "synthetic-trip-a", vehicleId: "synthetic-vehicle-a",
      name: "Synthetic recreated allocation", registration: "SYNTHETIC-0", status: "Assigned", rowOrder: 0,
    } });
    assert.equal(await prisma.tripTrackingAssignment.count(), 1);
    assert.equal((await a.getOrganisationTrackingOverview("synthetic-org-a", syntheticTrackingNow))
      .find((asset) => asset.assetId === input.assetId)?.trip?.role, "SUPPORT");
    await assert.rejects(a.assignTrackingAssetToTrip("synthetic-org-a", { ...input,
      assignedFrom: new Date("2030-01-02T00:00:00Z") }), /Invalid tracking assignment window/);
    const later = await a.getOrganisationTrackingOverview("synthetic-org-a", new Date("2030-01-02T00:00:00Z"));
    assert.equal(later.find((asset) => asset.assetId === input.assetId)?.trip, null);
    await a.associateTrackingAssetVehicle("synthetic-org-a", input.assetId, null);
    assert.equal((await prisma.trackingAsset.findUniqueOrThrow({ where: { id: input.assetId } })).defaultVehicleId, null);
  });
});
