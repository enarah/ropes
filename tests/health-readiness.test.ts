import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHealthPayload,
  buildReadinessResult,
  isRawDemoModeFlagEnabled,
} from "../lib/health-readiness";

test("health payload is a small liveness response without dependencies", () => {
  assert.deepEqual(buildHealthPayload(), { status: "ok" });
});

test("readiness succeeds only when auth, database and demo-mode checks pass", async () => {
  const result = await buildReadinessResult({
    isAuthenticationConfigured: () => true,
    isDatabaseConfigured: () => true,
    isDemoModeFlagEnabled: () => false,
    probeDatabase: async () => true,
  });

  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.payload, {
    checks: {
      authentication: "ok",
      database: "ok",
      demoMode: "ok",
    },
    status: "ok",
  });
});

test("readiness fails closed when authentication is not configured", async () => {
  const result = await buildReadinessResult({
    isAuthenticationConfigured: () => false,
    isDatabaseConfigured: () => true,
    isDemoModeFlagEnabled: () => false,
    probeDatabase: async () => true,
  });

  assert.equal(result.httpStatus, 503);
  assert.equal(result.payload.status, "not_ready");
  assert.equal(result.payload.checks.authentication, "authentication_unconfigured");
  assert.equal(result.payload.checks.database, "ok");
});

test("readiness fails closed when the database is not configured", async () => {
  let probed = false;
  const result = await buildReadinessResult({
    isAuthenticationConfigured: () => true,
    isDatabaseConfigured: () => false,
    isDemoModeFlagEnabled: () => false,
    probeDatabase: async () => {
      probed = true;
      return true;
    },
  });

  assert.equal(result.httpStatus, 503);
  assert.equal(result.payload.status, "not_ready");
  assert.equal(result.payload.checks.database, "database_unconfigured");
  assert.equal(probed, false);
});

test("readiness fails closed when the database is unavailable", async () => {
  const result = await buildReadinessResult({
    isAuthenticationConfigured: () => true,
    isDatabaseConfigured: () => true,
    isDemoModeFlagEnabled: () => false,
    probeDatabase: async () => false,
  });

  assert.equal(result.httpStatus, 503);
  assert.equal(result.payload.status, "not_ready");
  assert.equal(result.payload.checks.database, "database_unavailable");
});

test("readiness flags explicitly enabled demo mode as not ready", async () => {
  const result = await buildReadinessResult({
    isAuthenticationConfigured: () => true,
    isDatabaseConfigured: () => true,
    isDemoModeFlagEnabled: () => true,
    probeDatabase: async () => true,
  });

  assert.equal(result.httpStatus, 503);
  assert.equal(result.payload.status, "not_ready");
  assert.equal(result.payload.checks.demoMode, "demo_mode_enabled");
});

test("raw demo-mode detection identifies explicit enabled values", () => {
  assert.equal(
    isRawDemoModeFlagEnabled({ ROPES_DEMO_MODE: "enabled" }),
    true,
  );
  assert.equal(isRawDemoModeFlagEnabled({ ROPES_DEMO_MODE: "true" }), true);
  assert.equal(isRawDemoModeFlagEnabled({ ROPES_DEMO_MODE: "1" }), true);
  assert.equal(
    isRawDemoModeFlagEnabled({
      NODE_ENV: "production",
      ROPES_DEMO_MODE: "enabled",
    }),
    true,
  );
  assert.equal(isRawDemoModeFlagEnabled({ ROPES_DEMO_MODE: "disabled" }), false);
});

test("readiness payload never includes raw errors or secret-like values", async () => {
  const rawError = "database.example.internal password=secret-stack";
  const cursorSecret = "test-cursor-secret-that-must-not-appear";
  const result = await buildReadinessResult({
    isAuthenticationConfigured: () => false,
    isDatabaseConfigured: () => true,
    isDemoModeFlagEnabled: () => true,
    probeDatabase: async () => {
      throw new Error(rawError);
    },
  });

  const serialised = JSON.stringify({
    ...result.payload,
    ignoredSecretValue: undefined,
  });

  assert.equal(result.httpStatus, 503);
  assert.equal(serialised.includes(rawError), false);
  assert.equal(serialised.includes(cursorSecret), false);
  assert.equal(serialised.includes("DATABASE_URL"), false);
  assert.equal(serialised.includes("NEXTAUTH_SECRET"), false);
});
