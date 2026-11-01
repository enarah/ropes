import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { assertSyntheticTrackingEnvironment, loadSyntheticTrackingData, syntheticTrackingOrganisationSlug, SyntheticTrackingGuardError } from "../lib/tracking/demo-loader";
import { createTrackingDataLayer } from "../lib/tracking/data";
import { authorizeTrackingOrganisation } from "../lib/tracking/access";
import { getFakeTenantGuardSession } from "../lib/demo-session";
import { resolveDatabaseOrganisationPageAccess } from "../lib/organisation-access";
import { loadTrackingDashboardData } from "../lib/tracking/dashboard";
import { buildTrackingOperationsModel } from "../lib/tracking/presentation";
import { OrganisationCapabilityError } from "../lib/organisation-capabilities";

const allowedEnv = {
  NODE_ENV: "development", DATABASE_URL: "postgresql://offline.invalid/ropes_demo",
  ROPES_DEMO_MODE: "true", ALLOW_SYNTHETIC_TRACKING_FIXTURES: "true",
};
const now = new Date("2030-01-01T12:00:00Z");

test("synthetic loader guards reject production, wrong database, missing permissions, and connection overrides before any database access", async () => {
  for (const changed of [
    { NODE_ENV: "production" }, { DATABASE_URL: "postgresql://offline.invalid/ropes" },
    { DATABASE_URL: "postgresql://offline.invalid/ropes_demo_copy" },
    { DATABASE_URL: "postgresql://offline.invalid/ropes_demo?dbname=other" },
    { DATABASE_URL: "postgresql://offline.invalid/ropes_demo?database=other" },
    { DATABASE_URL: "postgresql://offline.invalid/ropes_demo?options=-c%20dbname%3Dother" },
    { DATABASE_URL: "invalid" }, { ALLOW_SYNTHETIC_TRACKING_FIXTURES: "" },
    { ALLOW_SYNTHETIC_TRACKING_FIXTURES: "1" }, { ROPES_DEMO_MODE: "false" },
  ]) {
    assert.throws(() => assertSyntheticTrackingEnvironment({ ...allowedEnv, ...changed }), SyntheticTrackingGuardError);
    await assert.rejects(loadSyntheticTrackingData({} as PrismaClient, { ...allowedEnv, ...changed }, now), SyntheticTrackingGuardError);
  }
  assert.doesNotThrow(() => assertSyntheticTrackingEnvironment(allowedEnv));
});

test("demo tracking loader, database demo tenant access, and dashboard use persisted isolated data", async (t) => {
  const database = new PGlite();
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(database) });
  t.after(async () => { await prisma.$disconnect(); await database.close(); });
  const migrations = new URL("../prisma/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => /^\d/.test(name)).sort()) {
    await database.exec(readFileSync(new URL(`${name}/migration.sql`, migrations), "utf8"));
  }
  await prisma.organisation.createMany({ data: [
    { id: "fixture-demo-a", slug: syntheticTrackingOrganisationSlug, name: "Synthetic demo A", isDemo: true },
    { id: "fixture-demo-b", slug: "demo-enarah-services", name: "Synthetic demo B", isDemo: true },
    { id: "fixture-empty", slug: "synthetic-empty", name: "Synthetic empty", isDemo: true },
  ] });
  await prisma.user.create({ data: { id: "fixture-user", email: "operations.manager@example.test", name: "Synthetic user", isDemo: true } });
  await prisma.role.create({ data: { id: "fixture-role", name: "Synthetic role", description: "Fixture" } });
  await prisma.membership.create({ data: { organisationId: "fixture-demo-a", userId: "fixture-user", roleId: "fixture-role" } });
  await prisma.vehicle.create({ data: { id: "fixture-vehicle", organisationId: "fixture-demo-a", name: "Synthetic vehicle", registration: "SYNTHETIC-ONLY", make: "Synthetic", model: "Fixture", isDemo: true } });
  await prisma.trip.create({ data: { id: "fixture-trip", organisationId: "fixture-demo-a", title: "Synthetic existing trip", purpose: "Fixture", destination: "Synthetic", status: "IN_PROGRESS", startsAt: new Date("2020-01-01T00:00:00Z"), endsAt: new Date("2020-01-02T00:00:00Z"), isDemo: true } });
  const businessSnapshot = async () => JSON.stringify(await Promise.all([
    prisma.organisation.findMany({ orderBy: { id: "asc" } }), prisma.vehicle.findMany(), prisma.trip.findMany(),
    prisma.user.findMany(), prisma.membership.findMany(), prisma.grant.findMany(),
  ]));

  await t.test("rejects a non-demo or missing target before writing tracking data", async () => {
    await prisma.organisation.update({ where: { id: "fixture-demo-a" }, data: { isDemo: false } });
    await assert.rejects(loadSyntheticTrackingData(prisma, allowedEnv, now), /must be marked as demo/);
    assert.equal(await prisma.trackingAsset.count(), 0);
    assert.equal((await resolveDatabaseOrganisationPageAccess(prisma, syntheticTrackingOrganisationSlug, await getFakeTenantGuardSession(prisma), "demo-fallback")).status, "denied");
    await prisma.organisation.update({ where: { id: "fixture-demo-a" }, data: { isDemo: true } });
    await prisma.organisation.update({ where: { id: "fixture-demo-a" }, data: { slug: "synthetic-renamed" } });
    await assert.rejects(loadSyntheticTrackingData(prisma, allowedEnv, now), /must be marked as demo/);
    await prisma.organisation.update({ where: { id: "fixture-demo-a" }, data: { slug: syntheticTrackingOrganisationSlug } });
  });
  // Ownership guard tests above intentionally changed updatedAt; take the baseline
  // after restoring those records, before exercising the loader itself.
  const restored = await businessSnapshot();
  assert.deepEqual(await loadSyntheticTrackingData(prisma, allowedEnv, now), { organisations: 2, assets: 7, tripLinked: 1 });
  const counts = async () => Promise.all([prisma.trackingIntegration.count(), prisma.trackingAsset.count(), prisma.trackingMessage.count(), prisma.tripTrackingAssignment.count(), prisma.organisationCapability.count()]);
  const initialCounts = await counts();
  assert.deepEqual(initialCounts, [2, 7, 8, 1, 2]);
  await t.test("safe rerun updates only fixture timestamps, keeps integrations disabled and business records unchanged", async () => {
    await loadSyntheticTrackingData(prisma, allowedEnv, new Date(now.getTime() + 10 * 60_000));
    assert.deepEqual(await counts(), initialCounts);
    assert.equal(await businessSnapshot(), restored);
    assert.equal(await prisma.trackingIntegration.count({ where: { enabled: true } }), 0);
    await loadSyntheticTrackingData(prisma, allowedEnv, now);
  });

  const session = await getFakeTenantGuardSession(prisma);
  const layer = createTrackingDataLayer({ prisma, authorize: async (organisationId) => authorizeTrackingOrganisation(prisma, organisationId, session) });
  await t.test("configured demo page resolves a real database ID and persisted capability through its existing session", async () => {
    const access = await resolveDatabaseOrganisationPageAccess(prisma, syntheticTrackingOrganisationSlug, session, "demo-fallback");
    assert.equal(access.status, "allowed");
    if (access.status !== "allowed") throw new Error("Expected access");
    assert.equal(access.organisation.id, "fixture-demo-a");
    assert.equal(access.organisation.isDemo, true);
    assert.deepEqual(access.organisation.capabilityKeys, ["integrations.spotTracker"]);
    const dashboard = await loadTrackingDashboardData(access.organisation, layer.getOrganisationTrackingOverview, now);
    assert.equal(dashboard.status, "ready");
    if (dashboard.status !== "ready") throw new Error("Expected dashboard data");
    assert.equal(dashboard.assets.length, 6);
    assert.equal(dashboard.assets.some((asset) => asset.assetId.includes("fixture-demo-b")), false);
    const model = buildTrackingOperationsModel(dashboard.assets);
    assert.deepEqual(model.counts, { assets: 6, current: 3, attentionRequired: 4, activeTripLinked: 1 });
    assert.equal(model.markers.length, 5);
    assert.equal(model.assets[0].latestMessageKind, "HELP");
    const cancelled = model.assets.find((asset) => asset.displayName === "Synthetic cancelled assistance")!;
    assert.equal(cancelled.latestMessageKind, "HELP_CANCEL");
    assert.equal(cancelled.latitude, 0.18);
    assert.equal(cancelled.latestPositionAt, "2030-01-01T11:55:00.000Z");
    assert.equal(cancelled.latestMessageAt, "2030-01-01T11:59:00.000Z");
    const json = JSON.stringify(dashboard);
    for (const forbidden of ["credentialKey", "externalAssetId", "externalMessageId", "providerMessageType", "providerUrl", "password", "feedId", "synthetic-operations-key", "synthetic-map-messenger"]) assert.equal(json.includes(forbidden), false, forbidden);
    assert.deepEqual(JSON.parse(json), dashboard);
  });

  await t.test("authenticated access stays fail-closed, selected tenant never falls back, and empty tenant is safe", async () => {
    await assert.rejects(resolveDatabaseOrganisationPageAccess(prisma, syntheticTrackingOrganisationSlug, { userId: null, memberships: [] }, "authenticated"));
    await assert.rejects(resolveDatabaseOrganisationPageAccess(prisma, "synthetic-empty", session, "demo-fallback"));
    assert.equal((await resolveDatabaseOrganisationPageAccess(prisma, "missing-org", session, "demo-fallback")).status, "denied");
    await prisma.organisationCapability.create({ data: { organisationId: "fixture-empty", key: "integrations.spotTracker", moduleKey: "integrations" } });
    const emptySession = { userId: "fixture-user", memberships: [{ organisationId: "fixture-empty", status: "ACTIVE" as const }] };
    const emptyLayer = createTrackingDataLayer({ prisma, authorize: async (id) => authorizeTrackingOrganisation(prisma, id, emptySession) });
    assert.deepEqual(await emptyLayer.getOrganisationTrackingOverview("fixture-empty", now), []);
    await assert.rejects(emptyLayer.getOrganisationTrackingOverview("fixture-demo-a", now));
    await prisma.organisationCapability.delete({ where: { organisationId_key: { organisationId: "fixture-empty", key: "integrations.spotTracker" } } });
    await assert.rejects(emptyLayer.getOrganisationTrackingOverview("fixture-empty", now), OrganisationCapabilityError);
    const access = await resolveDatabaseOrganisationPageAccess(prisma, "synthetic-empty", emptySession, "authenticated");
    if (access.status !== "allowed") throw new Error("Expected tenant access");
    let calls = 0;
    assert.deepEqual(await loadTrackingDashboardData(access.organisation, async () => { calls++; return []; }, now), { status: "hidden" });
    assert.equal(calls, 0);
  });

  await t.test("fixture collisions cannot reassign assets or modify a non-fixture integration", async () => {
    const integration = await prisma.trackingIntegration.findFirstOrThrow({ where: { organisationId: "fixture-demo-a" } });
    await prisma.trackingIntegration.update({ where: { id: integration.id }, data: { isDemo: false } });
    const before = await counts();
    await assert.rejects(loadSyntheticTrackingData(prisma, allowedEnv, now), /refusing to modify/);
    assert.deepEqual(await counts(), before);
    await prisma.trackingIntegration.update({ where: { id: integration.id }, data: { isDemo: true } });
    const asset = await prisma.trackingAsset.findFirstOrThrow({ where: { organisationId: "fixture-demo-a" } });
    await prisma.trackingAsset.update({ where: { id: asset.id }, data: { isDemo: false } });
    await assert.rejects(loadSyntheticTrackingData(prisma, allowedEnv, now), /refusing to move or modify/);
    await prisma.trackingAsset.update({ where: { id: asset.id }, data: { isDemo: true } });
    assert.equal(await businessSnapshot(), restored);
  });
});
