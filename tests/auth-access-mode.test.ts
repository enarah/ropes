import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTenantGuardSessionFromAuthLookup,
  getDashboardAuthContext,
} from "../lib/auth-session";
import { defaultDemoCapabilityKeys } from "../lib/capability-registry";
import { getOrganisationCapabilities } from "../lib/organisation-capabilities";
import { getOrganisationPageAccess } from "../lib/organisation-access";
import {
  isExplicitDemoModeEnabled,
  ROPES_DEMO_MODE_ENV,
} from "../lib/read-access-mode";
import {
  requireOrganisationAccess,
  TenantGuardError,
} from "../lib/tenant-guards";

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

test("explicit local demo mode works without auth or database configuration", async () => {
  process.env = {
    ...originalEnv,
    DATABASE_URL: "",
    NEXTAUTH_SECRET: "",
    NODE_ENV: "development",
    [ROPES_DEMO_MODE_ENV]: "enabled",
  };

  const authContext = await getDashboardAuthContext(undefined);
  const access = await getOrganisationPageAccess(undefined);
  const capabilities = await getOrganisationCapabilities("missing-demo-org");

  assert.equal(isExplicitDemoModeEnabled(), true);
  assert.equal(authContext.source, "demo-fallback");
  assert.ok(authContext.availableOrganisations.length > 0);
  assert.equal(access.status, "allowed");
  assert.equal(access.mode, "demo-fallback");
  assert.deepEqual(capabilities, defaultDemoCapabilityKeys);
});

test("production ignores demo mode even when the demo flag is present", () => {
  assert.equal(
    isExplicitDemoModeEnabled({
      NODE_ENV: "production",
      [ROPES_DEMO_MODE_ENV]: "enabled",
    }),
    false,
  );
});

test("controlled mode with missing auth fails closed without demo fallback", async () => {
  process.env = {
    ...originalEnv,
    DATABASE_URL: "postgresql://example.invalid/ropes",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    NEXTAUTH_SECRET: "",
    NODE_ENV: "development",
    [ROPES_DEMO_MODE_ENV]: "",
  };

  const authContext = await getDashboardAuthContext({} as never);
  const access = await getOrganisationPageAccess("ropes-demo-aboriginal-corporation");

  assert.equal(authContext.source, "unauthenticated");
  assert.equal(authContext.availableOrganisations.length, 0);
  assert.equal(access.status, "denied");
  assert.equal(access.title, "Authentication configuration required");
});

test("controlled mode with missing database fails closed without demo fallback", async () => {
  process.env = {
    ...originalEnv,
    DATABASE_URL: "",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    NEXTAUTH_SECRET: "test-nextauth-secret",
    NODE_ENV: "development",
    [ROPES_DEMO_MODE_ENV]: "",
  };

  const authContext = await getDashboardAuthContext(undefined);
  const access = await getOrganisationPageAccess("ropes-demo-aboriginal-corporation");
  const capabilities = await getOrganisationCapabilities(
    "ropes-demo-aboriginal-corporation",
  );

  assert.equal(authContext.source, "unauthenticated");
  assert.equal(authContext.availableOrganisations.length, 0);
  assert.equal(access.status, "denied");
  assert.equal(access.title, "Database configuration required");
  assert.deepEqual(capabilities, []);
});

test("tenant session lookup fails closed without an authenticated session", () => {
  const session = buildTenantGuardSessionFromAuthLookup(null, activeMemberUser());

  assert.deepEqual(session, { memberships: [], userId: null });
});

test("tenant session lookup fails closed without a session email", () => {
  const session = buildTenantGuardSessionFromAuthLookup(
    { user: { name: "Signed-in user" } },
    activeMemberUser(),
  );

  assert.deepEqual(session, { memberships: [], userId: null });
});

test("tenant session lookup fails closed for unknown authenticated user", () => {
  const session = buildTenantGuardSessionFromAuthLookup(
    { user: { email: "unknown@example.test" } },
    null,
  );

  assert.deepEqual(session, { memberships: [], userId: null });
});

test("user without ACTIVE membership receives no tenant access", () => {
  const session = buildTenantGuardSessionFromAuthLookup(
    { user: { email: "member@example.test" } },
    {
      id: "user-1",
      memberships: [],
    },
  );

  assert.equal(session.userId, "user-1");
  assert.deepEqual(session.memberships, []);
  assert.throws(
    () => requireOrganisationAccess(session, "org-1"),
    TenantGuardError,
  );
});

test("INVITED and SUSPENDED memberships do not grant access", () => {
  const session = buildTenantGuardSessionFromAuthLookup(
    { user: { email: "member@example.test" } },
    {
      id: "user-1",
      memberships: [
        {
          organisationId: "org-invited",
          role: { name: "Member" },
          status: "INVITED",
        },
        {
          organisationId: "org-suspended",
          role: { name: "Member" },
          status: "SUSPENDED",
        },
      ],
    },
  );

  assert.deepEqual(session.memberships, []);
  assert.throws(
    () => requireOrganisationAccess(session, "org-invited"),
    TenantGuardError,
  );
  assert.throws(
    () => requireOrganisationAccess(session, "org-suspended"),
    TenantGuardError,
  );
});

test("ACTIVE membership grants only its organisation with no cross-org fallback", () => {
  const session = buildTenantGuardSessionFromAuthLookup(
    { user: { email: "member@example.test" } },
    activeMemberUser(),
  );

  assert.deepEqual(requireOrganisationAccess(session, "org-active"), {
    actorUserId: "user-1",
    organisationId: "org-active",
  });
  assert.throws(
    () => requireOrganisationAccess(session, "org-other"),
    TenantGuardError,
  );
});

function activeMemberUser() {
  return {
    id: "user-1",
    memberships: [
      {
        organisationId: "org-active",
        role: { name: "Operations manager" },
        status: "ACTIVE",
      },
      {
        organisationId: "org-invited",
        role: { name: "Member" },
        status: "INVITED",
      },
    ],
  };
}
