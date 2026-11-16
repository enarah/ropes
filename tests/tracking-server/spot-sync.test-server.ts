import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { createTrackingSync } from "../../lib/tracking/sync";
import { createEnvironmentCredentialResolver, SpotCredentials } from "../../lib/tracking/credentials";
import { createSpotAdapter, type SpotTransport } from "../../lib/tracking/providers/spot";
import { TrackingSyncError } from "../../lib/tracking/sync-errors";
import { runSpotOneShotCommand } from "../../lib/tracking/one-shot-command";
import { createTrackingDataLayer } from "../../lib/tracking/data";
import { requireOrganisationAccess } from "../../lib/tenant-guards";
import { feedId, password, credentialKey, organisationId, integrationId, environment, event, xml, batch } from "./spot-fixtures";

const request = { organisationId, integrationId, confirmed: true };
const expectedCode = (code: string) => (error: unknown) => {
  assert.ok(error instanceof TrackingSyncError); assert.equal(error.code, code);
  assert.doesNotMatch(String(error.stack), new RegExp(`${feedId}|${password}`)); return true;
};
test("one-shot SPOT sync on disposable PostgreSQL with mocked HTTP only", async (t) => {
  const database = new PGlite();
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(database) });
  t.after(async () => { await prisma.$disconnect(); await database.close(); });
  const migrations = new URL("../../prisma/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => /^\d/.test(name)).sort()) {
    await database.exec(readFileSync(new URL(`${name}/migration.sql`, migrations), "utf8"));
  }
  const otherOrg = "synthetic-sync-org-b", otherIntegration = "synthetic-sync-integration-b";
  await prisma.organisation.createMany({ data: [{ id: organisationId, slug: organisationId, name: "Synthetic sync A" },
    { id: otherOrg, slug: otherOrg, name: "Synthetic sync B" }] });
  await prisma.organisationCapability.createMany({ data: [organisationId, otherOrg].map((id) => ({
    organisationId: id, key: "integrations.spotTracker", moduleKey: "integrations",
  })) });
  await prisma.trackingIntegration.createMany({ data: [
    { id: integrationId, organisationId, credentialKey, provider: "SPOT", name: "Synthetic sync A", enabled: true },
    { id: otherIntegration, organisationId: otherOrg, credentialKey: "synthetic-other", provider: "SPOT", name: "Synthetic sync B", enabled: true },
  ] });
  const authorize = async (id: string) => { requireOrganisationAccess({ userId: "synthetic-operator", memberships: [{ organisationId, status: "ACTIVE" }] }, id); };
  function service(transport: SpotTransport = async () => new Response(xml([event()])), options: Partial<Parameters<typeof createTrackingSync>[0]> = {}) {
    return createTrackingSync({ prisma, environment, authorize, resolveCredentials: createEnvironmentCredentialResolver(environment),
      retrieve: createSpotAdapter({ transport }).retrieve, ...options });
  }
  const resetAttempts = () => prisma.trackingIntegration.updateMany({ data: { lastPollAttemptAt: null } });
  t.beforeEach(async () => { await resetAttempts(); });
  const snapshot = async () => ({ assets: await prisma.trackingAsset.findMany({ orderBy: { id: "asc" } }),
    messages: await prisma.trackingMessage.findMany({ orderBy: { id: "asc" } }),
    vehicles: await prisma.vehicle.findMany({ orderBy: { id: "asc" } }) });

  await t.test("runtime grant, confirmation, cross-org lookup, disabled capability/integration and synthetic boundaries reject before HTTP", async () => {
    let http = 0, secrets = 0;
    const make = (env = environment) => service(async () => { http++; throw new Error(password); }, {
      environment: env, resolveCredentials: async () => { secrets++; return new SpotCredentials(feedId, password); },
    });
    for (const bad of [{ ROPES_RUNTIME_ENV: "production" }, { ALLOW_SPOT_ONE_SHOT_SYNC: "false" },
      { ROPES_SPOT_SYNC_ORGANISATION_ID: otherOrg }, { ROPES_DEMO_MODE: "true" }, { NODE_ENV: "sandbox" }]) {
      await assert.rejects(make({ ...environment, ...bad }).syncOneIntegration(request), expectedCode("PERMISSION_DENIED"));
    }
    await assert.rejects(make().syncOneIntegration({ ...request, confirmed: false }), expectedCode("PERMISSION_DENIED"));
    await assert.rejects(make().syncOneIntegration({ ...request, integrationId: otherIntegration }), expectedCode("INTEGRATION_UNAVAILABLE"));
    await assert.rejects(make().syncOneIntegration({ ...request, organisationId: otherOrg }), expectedCode("PERMISSION_DENIED"));
    await prisma.trackingIntegration.update({ where: { id: integrationId }, data: { enabled: false } });
    await assert.rejects(make().syncOneIntegration(request), expectedCode("INTEGRATION_UNAVAILABLE"));
    await prisma.trackingIntegration.update({ where: { id: integrationId }, data: { enabled: true, isDemo: true } });
    await assert.rejects(make().syncOneIntegration(request), expectedCode("SYNTHETIC_BOUNDARY"));
    await prisma.trackingIntegration.update({ where: { id: integrationId }, data: { isDemo: false } });
    await prisma.organisation.update({ where: { id: organisationId }, data: { isDemo: true } });
    await assert.rejects(make().syncOneIntegration(request), expectedCode("SYNTHETIC_BOUNDARY"));
    await prisma.organisation.update({ where: { id: organisationId }, data: { isDemo: false } });
    await prisma.organisationCapability.delete({ where: { organisationId_key: { organisationId, key: "integrations.spotTracker" } } });
    await assert.rejects(make().syncOneIntegration(request), expectedCode("CAPABILITY_DISABLED"));
    await prisma.organisationCapability.create({ data: { organisationId, key: "integrations.spotTracker", moduleKey: "integrations" } });
    assert.equal(http, 0); assert.equal(secrets, 0);
    assert.equal((await prisma.trackingIntegration.findUniqueOrThrow({ where: { id: integrationId } })).lastPollAttemptAt, null);
  });
  await t.test("missing credentials fail closed with a safe status, and failed attempts consume cooldown", async () => {
    let calls = 0;
    const sync = service(async () => { calls++; return new Response(xml([])); }, { resolveCredentials: async () => { throw new Error(password); } });
    const result = await sync.syncOneIntegration(request);
    assert.equal(result.result, "FAILED"); assert.equal(result.code, "CREDENTIALS_UNAVAILABLE");
    const integration = await prisma.trackingIntegration.findUniqueOrThrow({ where: { id: integrationId } });
    assert.ok(integration.lastPollAttemptAt); assert.ok(integration.lastErrorAt);
    assert.equal(integration.lastErrorCode, "CREDENTIALS_UNAVAILABLE");
    assert.equal((await sync.syncOneIntegration(request)).result, "RATE_LIMITED"); assert.equal(calls, 0);
    assert.equal(await prisma.trackingAsset.count(), 0);
  });
  await t.test("unknown messenger aborts without discovery; explicit discovery creates only scoped asset/message records", async () => {
    const before = await snapshot();
    const rejected = await service().syncOneIntegration(request);
    assert.equal(rejected.code, "UNKNOWN_ASSET"); assert.deepEqual(await snapshot(), before);
    await resetAttempts();
    const accepted = await service().syncOneIntegration({ ...request, discoverAssets: true });
    assert.equal(accepted.result, "SUCCESS"); assert.equal(accepted.assetsDiscovered, 1); assert.equal(accepted.messagesInserted, 1);
    const asset = await prisma.trackingAsset.findFirstOrThrow({ where: { organisationId } });
    assert.equal(asset.displayName, "Discovered SPOT tracker"); assert.equal(asset.defaultVehicleId, null);
    assert.equal(asset.providerDisplayName, null); assert.equal(asset.status, "ACTIVE");
    assert.equal(asset.trackingIntegrationId, integrationId); assert.equal(asset.model, "SPOT2");
    assert.equal(await prisma.trackingAsset.count({ where: { organisationId: otherOrg } }), 0);
  });
  await t.test("fixture-based manual command stores events visible to the existing Operations Map read model", async () => {
    const output: string[] = [];
    const exit = await runSpotOneShotCommand(["--organisation-id", organisationId, "--integration-id", integrationId,
      "--confirm-one-shot"], environment, { createPrisma: () => prisma,
      transport: async () => new Response(xml(batch())), write: (text) => output.push(text) });
    assert.equal(exit, 0);
    const result = JSON.parse(output[0]);
    assert.ok(Math.abs(Date.parse(result.lastSuccessfulSynchronisation) - Date.now()) < 5000, "DB epoch clock must be UTC regardless of driver timezone conversion");
    assert.equal(result.messagesInserted, 3); assert.equal(result.duplicatesSkipped, 1);
    for (const forbidden of [feedId, password, "credentialKey", "messengerId", "latitude", "longitude", "api.findmespot.com"]) {
      assert.equal(output.join().includes(forbidden), false, forbidden);
    }
    const overview = await createTrackingDataLayer({ prisma, authorize }).getOrganisationTrackingOverview(organisationId, new Date("2030-01-01T12:00:00Z"));
    assert.equal(overview.length, 1); assert.equal(overview[0].latestMessageKind, "HELP_CANCEL");
    assert.equal(overview[0].latestMessageAt, "2030-01-01T11:59:00.000Z");
    assert.equal(overview[0].latestPositionAt, "2030-01-01T11:57:00.000Z");
    assert.equal(overview[0].latitude, 0.12); assert.equal(overview[0].freshness, "CURRENT");
  });
  await t.test("idempotent re-ingestion preserves manual labels, vehicle, model, interval and retirement", async () => {
    const asset = await prisma.trackingAsset.findFirstOrThrow({ where: { organisationId } });
    await prisma.vehicle.create({ data: { id: "synthetic-sync-vehicle", organisationId, name: "Synthetic vehicle", registration: "SYN-SYNC", make: "Synthetic", model: "Synthetic" } });
    await prisma.trackingAsset.update({ where: { id: asset.id }, data: { displayName: "Manual tracker name", model: "Manual model",
      defaultVehicleId: "synthetic-sync-vehicle", expectedTrackingIntervalMinutes: 5, status: "RETIRED" } });
    const before = await snapshot();
    const result = await service(async () => new Response(xml(batch()))).syncOneIntegration(request);
    assert.equal(result.result, "SUCCESS"); assert.equal(result.duplicatesSkipped, 4); assert.equal(result.messagesInserted, 0);
    assert.deepEqual(await snapshot(), before);
  });
  await t.test("conflicting duplicate IDs roll back new assets/messages and preserve all ownership/history", async () => {
    const before = await snapshot();
    const previousSuccess = (await prisma.trackingIntegration.findUniqueOrThrow({ where: { id: integrationId } })).lastPollSuccessAt;
    for (const conflict of [event({ latitude: 0.13 }), event({ messengerId: "synthetic-conflicting-messenger" })]) {
      await resetAttempts();
      const result = await service(async () => new Response(xml([
        event({ id: "synthetic-rollback-message", messengerId: "synthetic-rollback-messenger" }), conflict,
      ]))).syncOneIntegration({ ...request, discoverAssets: true });
      assert.equal(result.result, "FAILED"); assert.equal(result.code, "MESSAGE_CONFLICT");
      assert.equal(result.assetsDiscovered, 0); assert.equal(result.messagesInserted, 0);
      assert.deepEqual(await snapshot(), before);
    }
    const integration = await prisma.trackingIntegration.findUniqueOrThrow({ where: { id: integrationId } });
    assert.equal(integration.lastErrorCode, "MESSAGE_CONFLICT"); assert.deepEqual(integration.lastPollSuccessAt, previousSuccess);
  });
  await t.test("valid messages survive malformed siblings; an entirely malformed page does not mark success", async () => {
    const result = await service(async () => new Response(xml([event({ id: "synthetic-valid-new" }), event({ unixTime: undefined })]))).syncOneIntegration(request);
    assert.equal(result.messagesInserted, 1); assert.equal(result.malformedMessagesRejected, 1);
    await resetAttempts();
    const failed = await service(async () => new Response(xml([event({ unixTime: undefined })]))).syncOneIntegration(request);
    assert.equal(failed.result, "FAILED"); assert.equal(failed.code, "MALFORMED_RESPONSE"); assert.equal(failed.malformedMessagesRejected, 1);
  });
  await t.test("provider failures are durable attempts, repeat attempts skip, and configured/minimum intervals hold", async () => {
    let calls = 0;
    const sync = service(async (url) => { calls++; throw new Error(url.href + password); });
    assert.equal((await sync.syncOneIntegration(request)).code, "REQUEST_FAILED");
    assert.equal((await sync.syncOneIntegration(request)).result, "RATE_LIMITED"); assert.equal(calls, 1);
    await prisma.trackingIntegration.update({ where: { id: integrationId }, data: { pollIntervalSeconds: 300,
      lastPollAttemptAt: new Date(Date.now() - 151_000) } });
    assert.equal((await sync.syncOneIntegration(request)).result, "RATE_LIMITED"); assert.equal(calls, 1);
    await prisma.trackingIntegration.update({ where: { id: integrationId }, data: { pollIntervalSeconds: 150 } });
    assert.equal((await sync.syncOneIntegration(request)).code, "REQUEST_FAILED"); assert.equal(calls, 2);
    await prisma.trackingIntegration.update({ where: { id: integrationId }, data: { pollIntervalSeconds: 180 } });
    const stored = await prisma.trackingIntegration.findUniqueOrThrow({ where: { id: integrationId } });
    assert.equal(stored.lastErrorCode, "REQUEST_FAILED"); assert.ok(stored.lastErrorAt);
    assert.doesNotMatch(JSON.stringify(stored), new RegExp(`${feedId}|${password}|api.findmespot.com`));
  });
  await t.test("concurrent service instances/clients make one HTTP call while the durable cooldown blocks the other", { timeout: 5000 }, async () => {
    const secondClient = new PrismaClient({ adapter: new PrismaPGlite(database) });
    let entered!: () => void, release!: () => void, calls = 0;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const transport: SpotTransport = async () => { calls++; entered(); await gate; return new Response(xml([])); };
    const first = service(transport).syncOneIntegration(request);
    try {
      await started;
      const second = await service(transport, { prisma: secondClient }).syncOneIntegration(request);
      assert.equal(second.result, "RATE_LIMITED"); assert.equal(calls, 1);
    } finally { release(); await secondClient.$disconnect(); }
    assert.equal((await first).result, "SUCCESS");
  });
  await t.test("alternate credential keys/integrations cannot bypass a same-feed cooldown", async () => {
    await prisma.trackingIntegration.create({ data: { id: "synthetic-alias", organisationId, credentialKey: "synthetic-sync-alias",
      name: "Synthetic alias", provider: "SPOT", enabled: true } });
    let calls = 0;
    const sync = service(async () => { calls++; return new Response(xml([])); }, { resolveCredentials: async () => new SpotCredentials(feedId, password) });
    assert.equal((await sync.syncOneIntegration(request)).result, "SUCCESS");
    assert.equal((await sync.syncOneIntegration({ ...request, integrationId: "synthetic-alias" })).result, "RATE_LIMITED");
    assert.equal(calls, 1);
  });
  await t.test("in-flight enable/ownership configuration is rechecked and newer attempts fence old status writes", async () => {
    const before = await snapshot();
    const disabled = await service(async () => {
      await prisma.trackingIntegration.update({ where: { id: integrationId }, data: { enabled: false } });
      return new Response(xml([event({ id: "synthetic-in-flight" })]));
    }).syncOneIntegration(request);
    assert.equal(disabled.code, "INTEGRATION_UNAVAILABLE"); assert.deepEqual(await snapshot(), before);
    await prisma.trackingIntegration.update({ where: { id: integrationId }, data: { enabled: true } });
    await resetAttempts();
    const superseded = await service(async () => {
      await prisma.trackingIntegration.update({ where: { id: integrationId }, data: {
        lastPollAttemptAt: new Date(Date.now() + 1000), lastErrorCode: "REQUEST_FAILED",
      } });
      return new Response(xml([event({ id: "synthetic-superseded" })]));
    }).syncOneIntegration(request);
    assert.equal(superseded.code, "ATTEMPT_SUPERSEDED"); assert.deepEqual(await snapshot(), before);
    assert.equal((await prisma.trackingIntegration.findUniqueOrThrow({ where: { id: integrationId } })).lastErrorCode, "REQUEST_FAILED");
  });
  await t.test("CLI permission/argument failures do not construct clients or echo secret input", async () => {
    for (const argv of [[], ["--feed-password", password], ["--organisation-id", organisationId, "--integration-id", integrationId]]) {
      let constructed = false; const output: string[] = [];
      const exit = await runSpotOneShotCommand(argv, environment, { createPrisma: () => { constructed = true; return prisma; }, write: (text) => output.push(text) });
      assert.equal(exit, 1); assert.equal(constructed, false); assert.doesNotMatch(output.join(), new RegExp(`${feedId}|${password}`));
    }
  });
});
