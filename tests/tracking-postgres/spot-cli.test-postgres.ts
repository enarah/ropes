import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { Client } from "pg";
import { batch, credentialKey, environment, event, feedId, integrationId, organisationId, password, xml } from "../tracking-server/spot-fixtures";

test("PostgreSQL 16: independent real CLI processes, loopback HTTP and durable coordination", { timeout: 420_000 }, async (t) => {
  const raw = process.env.ROPES_SPOT_REHEARSAL_ADMIN_URL;
  assert.ok(raw, "Set ROPES_SPOT_REHEARSAL_ADMIN_URL to a disposable loopback PostgreSQL 16 server");
  const adminUrl = new URL(raw);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(adminUrl.hostname), "Only loopback PostgreSQL is permitted");
  assert.equal(adminUrl.search, "", "No connection overrides permitted");
  const admin = new Client({ connectionString: adminUrl.href });
  await admin.connect();
  const cleanup: Array<() => unknown> = [() => admin.end()];
  t.after(async () => {
    const errors: unknown[] = [];
    for (const action of cleanup) { try { await action(); } catch (error) { errors.push(error); } }
    if (errors.length) throw new AggregateError(errors, "REHEARSAL_CLEANUP_FAILED");
  });
  const version = Number((await admin.query("SHOW server_version_num")).rows[0].server_version_num);
  assert.ok(version >= 160000 && version < 170000, "Real PostgreSQL 16 is required; no PGlite substitute");
  t.diagnostic(`PostgreSQL ${version}; Node ${process.version}; two independent OS processes; cooldown 150 seconds`);
  const databaseName = `ropes_spot_rehearsal_${randomBytes(8).toString("hex")}`;
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  cleanup.unshift(() => admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`));
  const databaseUrl = new URL(adminUrl);
  databaseUrl.pathname = `/${databaseName}`;
  const db = new Client({ connectionString: databaseUrl.href });
  await db.connect();
  // Prisma stores UTC in timestamp-without-time-zone columns. Keep test-only
  // SQL clock arithmetic in that same representation, regardless of host zone.
  await db.query("SET TIME ZONE 'UTC'");
  cleanup.unshift(() => db.end());
  const migrations = new URL("../../prisma/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => /^\d/.test(name)).sort()) {
    await db.query(readFileSync(new URL(`${name}/migration.sql`, migrations), "utf8"));
  }
  const otherOrg = "synthetic-sync-org-b", otherIntegration = "synthetic-sync-integration-b";
  for (const [org, integration] of [[organisationId, integrationId], [otherOrg, otherIntegration]]) {
    await db.query('INSERT INTO "Organisation" (id, slug, name, "updatedAt") VALUES ($1, $1, $1, NOW())', [org]);
    await db.query('INSERT INTO "OrganisationCapability" (id, "organisationId", key, "moduleKey", "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
      [`${org}-cap`, org, "integrations.spotTracker", "integrations"]);
    await db.query('INSERT INTO "TrackingIntegration" (id, "organisationId", provider, name, "credentialKey", enabled, "pollIntervalSeconds", "updatedAt") VALUES ($1, $2, $3, $1, $4, true, 150, NOW())',
      [integration, org, "SPOT", org === organisationId ? credentialKey : "synthetic-other"]);
  }
  let calls = 0, status = 200, payload = xml(batch()), hold = false;
  const pending: ServerResponse[] = [];
  const server = createServer((request, response) => {
    assert.equal(request.url, "/mock-feed");
    calls++;
    response.writeHead(status, { "content-type": "application/xml" });
    if (hold) pending.push(response);
    else response.end(payload);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanup.unshift(() => { server.closeAllConnections(); return new Promise<void>((resolve) => server.close(() => resolve())); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const mockPort = String(address.port);
  const allOutput: string[] = [];
  const children = new Set<ReturnType<typeof spawn>>();
  cleanup.unshift(() => { for (const child of children) child.kill("SIGKILL"); });
  function launch(options: { org?: string; integration?: string; grant?: string } = {}) {
    const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "--import",
      "./tests/tracking-postgres/mock-fetch.mjs", "scripts/sync-spot-once.ts",
      "--organisation-id", options.org ?? organisationId, "--integration-id", options.integration ?? integrationId,
      "--confirm-one-shot", "--discover-assets"], {
      cwd: new URL("../../", import.meta.url), stdio: ["ignore", "pipe", "pipe", "ipc"], env: {
        PATH: process.env.PATH, DOTENV_CONFIG_PATH: "/dev/null", ...environment, NODE_ENV: "test",
        ROPES_TRACKING_SYNTHETIC_OTHER_FEED_ID: feedId, ROPES_TRACKING_SYNTHETIC_OTHER_FEED_PASSWORD: password,
        DATABASE_URL: databaseUrl.href, ROPES_SPOT_SYNC_ORGANISATION_ID: options.grant ?? organisationId,
        ROPES_SPOT_MOCK_PORT: mockPort,
      },
    });
    children.add(child);
    let stdout = "", stderr = "";
    child.stdout!.on("data", (data) => { stdout += data; });
    child.stderr!.on("data", (data) => { stderr += data; });
    const ready = new Promise<void>((resolve, reject) => {
      child.once("message", (message) => { assert.equal(message, "ready"); resolve(); });
      child.once("error", reject);
      child.once("exit", () => reject(new Error("CLI_EXITED_BEFORE_BARRIER")));
    });
    const result = new Promise<{ exit: number | null; summary: Record<string, unknown> }>((resolve, reject) => {
      const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("CLI_TIMEOUT")); }, 25_000);
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("exit", (exit) => {
        clearTimeout(timer); children.delete(child); allOutput.push(stdout, stderr);
        try {
          for (const secret of [feedId, password, encodeURIComponent(password), "feedPassword", "api.findmespot.com", "latitude", "longitude", "credentialKey"]) {
            assert.ok(!`${stdout}${stderr}`.includes(secret), "CLI output must not expose provider or credential material");
          }
          assert.equal(stderr, "");
          assert.ok(stdout.length < 2048);
          resolve({ exit, summary: JSON.parse(stdout.trim()) });
        } catch (error) { reject(error); }
      });
    });
    return { child, ready, result };
  }
  async function command(options?: Parameters<typeof launch>[0]) {
    const process = launch(options);
    await process.ready; process.child.send("go"); return process.result;
  }
  const integration = async () => (await db.query('SELECT * FROM "TrackingIntegration" WHERE id=$1', [integrationId])).rows[0];
  const snapshot = async () => (await db.query(`SELECT
    (SELECT COALESCE(jsonb_agg(t ORDER BY id), '[]') FROM "TrackingAsset" t) AS assets,
    (SELECT COALESCE(jsonb_agg(t ORDER BY id), '[]') FROM "TrackingMessage" t) AS messages`)).rows[0];
  // Setup between independent scenarios only. Actual expiry tests below never
  // edit timestamps or shorten the schema/provider minimum.
  const expireForSetup = () => db.query('UPDATE "TrackingIntegration" SET "lastPollAttemptAt" = clock_timestamp() - interval \'151 seconds\' WHERE "lastPollAttemptAt" IS NOT NULL');
  async function waitForRealExpiry() {
    const before = Date.now();
    const remaining = Number((await db.query('SELECT GREATEST(0, EXTRACT(EPOCH FROM ("lastPollAttemptAt" + interval \'150 seconds\' - clock_timestamp())) * 1000) AS ms FROM "TrackingIntegration" WHERE id=$1', [integrationId])).rows[0].ms);
    await delay(Math.ceil(remaining) + 150);
    t.diagnostic(`Actual cooldown wait ${Date.now() - before}ms; persisted attempt timestamp left unchanged`);
  }
  async function waitForHttp() {
    for (let attempt = 0; attempt < 400 && pending.length === 0; attempt++) await delay(10);
    assert.equal(pending.length, 1, "Exactly one mock request must be in flight");
  }
  await t.test("held PostgreSQL advisory lock returns BUSY without HTTP or an attempt write", async () => {
    await db.query("BEGIN");
    try {
      await db.query("SELECT pg_advisory_xact_lock(187,4)");
      assert.equal((await command()).summary.result, "BUSY");
      assert.equal(calls, 0); assert.equal((await integration()).lastPollAttemptAt, null);
    } finally { await db.query("COMMIT"); }
  });
  await t.test("simultaneous independent CLI processes retrieve once; a fresh process sees durable cooldown", async () => {
    hold = true;
    const first = launch(), second = launch();
    assert.notEqual(first.child.pid, second.child.pid);
    await Promise.all([first.ready, second.ready]);
    first.child.send("go"); second.child.send("go");
    try {
      const loser = await Promise.race([first.result, second.result]);
      assert.equal(loser.exit, 0); assert.ok(["BUSY", "RATE_LIMITED"].includes(String(loser.summary.result)));
      await waitForHttp(); assert.equal(calls, 1);
      assert.ok((await integration()).lastPollAttemptAt);
    } finally { hold = false; for (const response of pending.splice(0)) response.end(payload); }
    const results = await Promise.all([first.result, second.result]);
    assert.equal(results.filter((result) => result.summary.result === "SUCCESS").length, 1);
    const saved = await integration();
    assert.ok(saved.lastPollSuccessAt);
    assert.equal((await command()).summary.result, "RATE_LIMITED");
    assert.equal(calls, 1); assert.deepEqual((await integration()).lastPollAttemptAt, saved.lastPollAttemptAt);
  });
  await t.test("real elapsed success cooldown permits retry and identical messages are skipped", async () => {
    const before = await snapshot();
    await waitForRealExpiry();
    const result = await command();
    assert.equal(result.summary.result, "SUCCESS"); assert.equal(result.summary.duplicatesSkipped, 4);
    assert.equal(result.summary.messagesInserted, 0); assert.equal(calls, 2);
    assert.deepEqual(await snapshot(), before);
  });
  await t.test("failed provider attempt persists safely, blocks retry and succeeds after real elapsed cooldown", async () => {
    await expireForSetup(); status = 503; payload = `${feedId} ${password}`;
    const before = await snapshot(), previousSuccess = (await integration()).lastPollSuccessAt;
    const failed = await command();
    assert.equal(failed.exit, 1); assert.equal(failed.summary.code, "PROVIDER_ERROR");
    const saved = await integration();
    assert.equal(saved.lastErrorCode, "PROVIDER_ERROR"); assert.ok(saved.lastErrorAt); assert.ok(saved.lastPollAttemptAt);
    assert.deepEqual(saved.lastPollSuccessAt, previousSuccess); assert.deepEqual(await snapshot(), before);
    const count = calls;
    assert.equal((await command()).summary.result, "RATE_LIMITED"); assert.equal(calls, count);
    await waitForRealExpiry(); status = 200; payload = xml(batch());
    assert.equal((await command()).summary.result, "SUCCESS"); assert.equal(calls, count + 1);
    assert.equal((await integration()).lastErrorCode, null); assert.deepEqual(await snapshot(), before);
  });
  await t.test("conflicting duplicate rolls back earlier asset/message writes and retains history", async () => {
    await expireForSetup();
    const before = await snapshot(), previousSuccess = (await integration()).lastPollSuccessAt;
    payload = xml([event({ id: "synthetic-rollback", messengerId: "synthetic-rollback-asset" }), event({ latitude: 0.13 })]);
    const result = await command();
    assert.equal(result.exit, 1); assert.equal(result.summary.code, "MESSAGE_CONFLICT");
    assert.equal(result.summary.assetsDiscovered, 0); assert.equal(result.summary.messagesInserted, 0);
    assert.deepEqual(await snapshot(), before); assert.deepEqual((await integration()).lastPollSuccessAt, previousSuccess);
    const count = calls;
    assert.equal((await command()).summary.result, "RATE_LIMITED"); assert.equal(calls, count);
  });
  await t.test("cross-organisation commands fail before HTTP; identical provider IDs remain independently scoped", async () => {
    const before = await snapshot(), count = calls;
    assert.equal((await command({ integration: otherIntegration })).summary.code, "INTEGRATION_UNAVAILABLE");
    assert.equal((await command({ org: otherOrg })).summary.code, "PERMISSION_DENIED");
    assert.equal((await command({ org: otherOrg, grant: otherOrg })).summary.code, "INTEGRATION_UNAVAILABLE");
    assert.equal(calls, count); assert.deepEqual(await snapshot(), before);
    await expireForSetup(); payload = xml(batch());
    assert.equal((await command({ org: otherOrg, grant: otherOrg, integration: otherIntegration })).summary.messagesInserted, 4);
    const rows = (await db.query('SELECT "organisationId", count(*)::int AS count FROM "TrackingMessage" GROUP BY "organisationId" ORDER BY "organisationId"')).rows;
    assert.deepEqual(rows, [{ organisationId, count: 4 }, { organisationId: otherOrg, count: 4 }]);
    const wrong = await db.query('SELECT count(*)::int AS count FROM "TrackingMessage" m JOIN "TrackingAsset" a ON a.id=m."trackingAssetId" JOIN "TrackingIntegration" i ON i.id=m."trackingIntegrationId" WHERE m."organisationId" <> a."organisationId" OR m."organisationId" <> i."organisationId"');
    assert.equal(wrong.rows[0].count, 0);
  });
  await t.test("newer durable attempt fences an in-flight CLI from overwriting messages or status", async () => {
    await expireForSetup(); hold = true;
    const before = await snapshot(); payload = xml([event({ id: "synthetic-fenced-event" })]);
    const running = command();
    try {
      await waitForHttp();
      await db.query('UPDATE "TrackingIntegration" SET "lastPollAttemptAt" = clock_timestamp() + interval \'1 second\', "lastErrorCode" = \'REQUEST_FAILED\' WHERE id=$1', [integrationId]);
    } finally { hold = false; for (const response of pending.splice(0)) response.end(payload); }
    const result = await running;
    assert.equal(result.summary.code, "ATTEMPT_SUPERSEDED");
    assert.deepEqual(await snapshot(), before); assert.equal((await integration()).lastErrorCode, "REQUEST_FAILED");
  });
  await t.test("captured process output and persisted diagnostics contain no credentials", async () => {
    const statuses = (await db.query('SELECT "lastErrorCode", "lastErrorAt" FROM "TrackingIntegration"')).rows;
    for (const secret of [feedId, password, "feedPassword", "api.findmespot.com"]) {
      assert.ok(!JSON.stringify([allOutput, statuses]).includes(secret));
    }
    t.diagnostic(`Mock HTTP requests: ${calls}; no live endpoint; all CLI stdout/stderr checked; fresh database dropped on completion`);
  });
});
