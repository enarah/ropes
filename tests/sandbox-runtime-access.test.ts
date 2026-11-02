import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { isDisposableDemoDatabaseUrl } from "../lib/disposable-demo-database";
import { isExplicitDemoModeEnabled, isAuthenticatedDatabaseMode } from "../lib/read-access-mode";
import { buildTenantGuardSessionFromAuthLookup } from "../lib/auth-session";
import { getFakeTenantGuardSession } from "../lib/demo-session";
import { resolveDatabaseOrganisationPageAccess } from "../lib/organisation-access";
import { assertSyntheticTrackingEnvironment, SyntheticTrackingGuardError } from "../lib/tracking/demo-loader";

const sandbox = {
  NODE_ENV: "production", ROPES_RUNTIME_ENV: "sandbox", ROPES_DEMO_MODE: "true",
  DATABASE_URL: "postgresql://synthetic@offline.invalid/ropes_demo",
} as const;

test("compiled production sandbox requires all explicit demo and disposable database conditions", () => {
  assert.equal(isExplicitDemoModeEnabled(sandbox), true);
  for (const flag of ["true", "1", "enabled"]) assert.equal(isExplicitDemoModeEnabled({ ...sandbox, ROPES_DEMO_MODE: flag }), true);
  for (const changed of [
    { ROPES_RUNTIME_ENV: undefined }, { ROPES_RUNTIME_ENV: "production" }, { ROPES_RUNTIME_ENV: "Sandbox" },
    { ROPES_DEMO_MODE: "false" }, { ROPES_DEMO_MODE: undefined },
    { DATABASE_URL: "postgresql://synthetic@offline.invalid/ropes" },
    { DATABASE_URL: "postgresql://synthetic@offline.invalid/ropes_demo_copy" },
    { DATABASE_URL: "postgresql://synthetic@offline.invalid/ropes_demo?dbname=ropes" },
    { DATABASE_URL: "postgresql://synthetic@offline.invalid/ropes_demo?options=-c%20dbname=ropes" },
    { DATABASE_URL: "http://offline.invalid/ropes_demo" }, { DATABASE_URL: "postgresql:/ropes_demo" },
    { DATABASE_URL: "malformed" }, { DATABASE_URL: undefined },
  ]) assert.equal(isExplicitDemoModeEnabled({ ...sandbox, ...changed }), false, JSON.stringify(Object.keys(changed)));
});

test("disposable database validation is exact, protocol checked, override resistant and never throws", () => {
  for (const value of ["postgresql://synthetic@offline.invalid/ropes_demo", "postgres://offline.invalid:5432/ropes_demo?schema=public&sslmode=require"]) {
    assert.equal(isDisposableDemoDatabaseUrl(value), true);
  }
  for (const value of [undefined, "", "not a URL", "https://offline.invalid/ropes_demo", "postgresql:///ropes_demo",
    "postgresql://offline.invalid/ropes", "postgresql://offline.invalid/ropes_demo_copy", "postgresql://offline.invalid//ropes_demo",
    "postgresql://offline.invalid/ropes_demo/", "postgresql://offline.invalid/%72opes_demo", "postgresql://offline.invalid/ropes_demo#other",
    "postgresql://offline.invalid/ropes_demo?database=ropes", "postgresql://offline.invalid/ropes_demo?host=other"]) {
    assert.equal(isDisposableDemoDatabaseUrl(value), false);
  }
});

test("existing non-production workstation demo behaviour remains available without a database", () => {
  for (const NODE_ENV of ["development", "test", undefined]) {
    assert.equal(isExplicitDemoModeEnabled({ NODE_ENV, ROPES_DEMO_MODE: "enabled" }), true);
    assert.equal(isExplicitDemoModeEnabled({ NODE_ENV, ROPES_DEMO_MODE: "false" }), false);
  }
});

test("sandbox read permission does not allow either production fixture loading or destructive seed", () => {
  const env = { ...sandbox, ALLOW_SYNTHETIC_TRACKING_FIXTURES: "true", ALLOW_DESTRUCTIVE_DEMO_SEED: "true" };
  assert.equal(isExplicitDemoModeEnabled(env), true);
  assert.throws(() => assertSyntheticTrackingEnvironment(env), SyntheticTrackingGuardError);
  const seed = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "seed"], { env: { ...process.env, ...env }, encoding: "utf8" });
  assert.equal(seed.status, 1);
  assert.match(seed.stderr, /Refusing destructive demo seed/);
  assert.doesNotMatch(seed.stderr, /offline\.invalid|ECONNREFUSED|ENOTFOUND/);
});

test("real authentication still selects authenticated database mode and unauthenticated lookup grants no membership", () => {
  const original = process.env;
  process.env = { ...original, ...sandbox, GOOGLE_CLIENT_ID: "synthetic-client", GOOGLE_CLIENT_SECRET: "synthetic-auth-canary", NEXTAUTH_SECRET: "synthetic-session-canary" };
  try {
    assert.equal(isAuthenticatedDatabaseMode(), true);
    assert.deepEqual(buildTenantGuardSessionFromAuthLookup(null, { id: "synthetic-user", memberships: [] }), { userId: null, memberships: [] });
  } finally { process.env = original; }
});

test("database-backed fake session only exposes demo users and demo-marked organisations", async (t) => {
  const database = new PGlite();
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(database) });
  t.after(async () => { await prisma.$disconnect(); await database.close(); });
  const migrations = new URL("../prisma/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => /^\d/.test(name)).sort()) {
    await database.exec(readFileSync(new URL(`${name}/migration.sql`, migrations), "utf8"));
  }
  await prisma.organisation.createMany({ data: [
    { id: "synthetic-demo", name: "Synthetic demo", slug: "ropes-demo-aboriginal-corporation", isDemo: true },
    { id: "synthetic-normal", name: "Synthetic non-demo record", slug: "demo-enarah-services", isDemo: false },
  ] });
  await prisma.user.create({ data: { id: "synthetic-demo-user", name: "Synthetic user", email: "operations.manager@example.test", isDemo: true } });
  const session = await getFakeTenantGuardSession(prisma);
  assert.deepEqual(session.memberships?.map((membership) => membership.organisationId), ["synthetic-demo"]);
  const access = await resolveDatabaseOrganisationPageAccess(prisma, "ropes-demo-aboriginal-corporation", session, "demo-fallback");
  assert.equal(access.status, "allowed");
  await assert.rejects(resolveDatabaseOrganisationPageAccess(prisma, "demo-enarah-services", session, "demo-fallback"));
  await prisma.user.update({ where: { id: "synthetic-demo-user" }, data: { isDemo: false } });
  assert.deepEqual(await getFakeTenantGuardSession(prisma), { userId: null, memberships: [] });
});
