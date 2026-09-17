import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalRoleDefinitions } from "../lib/canonical-roles";
import {
  buildProvisioningPlan,
  normaliseEmail,
  type ProvisionUserInput,
  type ProvisioningState,
} from "../lib/provisioning";

const baseInput = {
  apply: false,
  bootstrapOrganisation: false,
  capabilities: [],
  displayName: "Test Operator",
  email: " Test.Operator@Example.Test ",
  membershipStatus: "ACTIVE",
  organisationName: "Enarah Services",
  organisationSlug: "enarah-services",
  organisationType: "ENARAH",
  roleName: "Enarah Admin",
} as const satisfies ProvisionUserInput;

test("normalises email consistently with auth lookup expectations", () => {
  assert.equal(normaliseEmail(" Test.Operator@Example.Test "), "test.operator@example.test");
  assert.equal(normaliseEmail("not-an-email"), "");
});

test("canonical role missing is planned for create", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    roles: matchingState().roles.filter((role) => role.name !== "Enarah Admin"),
  });

  assert.equal(action(plan, "role", "Enarah Admin")?.status, "would-create");
  assert.equal(plan.canApply, true);
});

test("matching canonical role is a no-op", () => {
  const plan = buildProvisioningPlan(baseInput, matchingState());

  assert.equal(action(plan, "role", "Enarah Admin")?.status, "exists");
  assert.equal(plan.canApply, true);
});

test("conflicting canonical role fails safely", () => {
  const state = matchingState();
  state.roles = state.roles.map((role) =>
    role.name === "Enarah Admin"
      ? { ...role, description: "Unexpected elevated scope." }
      : role,
  );
  const plan = buildProvisioningPlan(baseInput, state);

  assert.equal(action(plan, "role", "Enarah Admin")?.status, "conflict");
  assert.equal(plan.canApply, false);
});

test("missing organisation requires explicit bootstrap", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    organisation: undefined,
  });

  assert.equal(
    action(plan, "organisation", "enarah-services")?.status,
    "conflict",
  );
  assert.equal(plan.canApply, false);
});

test("missing organisation with explicit bootstrap is planned for create", () => {
  const plan = buildProvisioningPlan(
    { ...baseInput, bootstrapOrganisation: true },
    {
      ...matchingState(),
      membership: undefined,
      organisation: undefined,
    },
  );

  assert.equal(
    action(plan, "organisation", "enarah-services")?.status,
    "would-create",
  );
  assert.equal(plan.canApply, true);
});

test("matching organisation is a no-op", () => {
  const plan = buildProvisioningPlan(baseInput, matchingState());

  assert.equal(action(plan, "organisation", "enarah-services")?.status, "exists");
  assert.equal(plan.canApply, true);
});

test("conflicting organisation fails safely", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    organisation: {
      ...matchingState().organisation!,
      isDemo: true,
    },
  });

  assert.equal(action(plan, "organisation", "enarah-services")?.status, "conflict");
  assert.equal(plan.canApply, false);
});

test("missing user is planned for create with isDemo=false", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    membership: undefined,
    user: undefined,
  });

  const userAction = action(plan, "user", "test.operator@example.test");
  assert.equal(userAction?.status, "would-create");
  assert.match(userAction?.detail ?? "", /isDemo=false/);
});

test("matching user is safely reused", () => {
  const plan = buildProvisioningPlan(baseInput, matchingState());

  assert.equal(action(plan, "user", "test.operator@example.test")?.status, "exists");
  assert.equal(plan.canApply, true);
});

test("conflicting user does not silently overwrite", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    user: {
      ...matchingState().user!,
      name: "Different Name",
    },
  });

  assert.equal(action(plan, "user", "test.operator@example.test")?.status, "conflict");
  assert.equal(plan.canApply, false);
});

test("missing membership is planned for create", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    membership: undefined,
  });

  assert.equal(
    action(plan, "membership", "test.operator@example.test -> enarah-services")
      ?.status,
    "would-create",
  );
});

test("exact membership is a no-op", () => {
  const plan = buildProvisioningPlan(baseInput, matchingState());

  assert.equal(action(plan, "membership", "membership-1")?.status, "exists");
});

test("membership role change is a conflict", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    membership: {
      ...matchingState().membership!,
      roleName: "Operations Manager",
    },
  });

  assert.equal(action(plan, "membership", "membership-1")?.status, "conflict");
});

test("INVITED membership is not silently activated", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    membership: {
      ...matchingState().membership!,
      status: "INVITED",
    },
  });

  assert.equal(action(plan, "membership", "membership-1")?.status, "conflict");
});

test("SUSPENDED membership is not silently activated", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    membership: {
      ...matchingState().membership!,
      status: "SUSPENDED",
    },
  });

  assert.equal(action(plan, "membership", "membership-1")?.status, "conflict");
});

test("second identical provisioning plan is idempotent", () => {
  const plan = buildProvisioningPlan(baseInput, matchingState());

  assert.equal(plan.canApply, true);
  assert.equal(plan.actions.some((candidate) => candidate.status === "would-create"), false);
  assert.equal(plan.actions.some((candidate) => candidate.status === "conflict"), false);
});

test("unrelated state remains untouched by target-only plan", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    roles: [
      ...matchingState().roles,
      {
        description: "Unrelated role",
        id: "role-unrelated",
        name: "Unrelated Role",
      },
    ],
  });

  assert.equal(
    plan.actions.some((candidate) => candidate.identifier === "Unrelated Role"),
    false,
  );
});

test("no cross-organisation membership is introduced", () => {
  const plan = buildProvisioningPlan(baseInput, {
    ...matchingState(),
    membership: undefined,
  });

  const membershipAction = action(
    plan,
    "membership",
    "test.operator@example.test -> enarah-services",
  );
  assert.equal(membershipAction?.status, "would-create");
  assert.match(membershipAction?.detail ?? "", /Enarah Admin/);
});

test("capabilities are not globally enabled unless explicitly requested", () => {
  const plan = buildProvisioningPlan(baseInput, matchingState());

  assert.equal(action(plan, "capability", "none")?.status, "exists");
  assert.equal(
    plan.actions.some((candidate) => candidate.identifier === "reporting.appb"),
    false,
  );
});

test("explicit capability bootstrap is scoped and planned", () => {
  const plan = buildProvisioningPlan(
    { ...baseInput, capabilities: ["trips"] },
    matchingState(),
  );

  assert.equal(action(plan, "capability", "trips")?.status, "would-create");
});

test("approved tester emails are not embedded in reusable provisioning logic", () => {
  const source = [
    readFileSync("lib/provisioning.ts", "utf8"),
    readFileSync("scripts/provision-user.ts", "utf8"),
  ].join("\n");

  assert.equal(source.includes("mabel@enarah.com.au"), false);
  assert.equal(source.includes("daryl.clarke@enarah.com.au"), false);
  assert.equal(source.includes("accounts@enarah.com.au"), false);
});

test("provisioning tooling does not use destructive reset operations", () => {
  const source = [
    readFileSync("lib/provisioning.ts", "utf8"),
    readFileSync("scripts/provision-user.ts", "utf8"),
  ].join("\n");

  assert.equal(source.includes("deleteMany"), false);
  assert.equal(source.includes("TRUNCATE"), false);
});

function matchingState(): ProvisioningState {
  return {
    capabilities: [],
    membership: {
      id: "membership-1",
      organisationId: "organisation-1",
      roleName: "Enarah Admin",
      status: "ACTIVE",
      userId: "user-1",
    },
    organisation: {
      id: "organisation-1",
      isDemo: false,
      name: "Enarah Services",
      slug: "enarah-services",
      type: "ENARAH",
    },
    roles: canonicalRoleDefinitions.map((role, index) => ({
      ...role,
      id: `role-${index}`,
    })),
    user: {
      email: "test.operator@example.test",
      id: "user-1",
      isDemo: false,
      name: "Test Operator",
    },
  };
}

function action(
  plan: ReturnType<typeof buildProvisioningPlan>,
  entity: string,
  identifier: string,
) {
  return plan.actions.find(
    (candidate) =>
      candidate.entity === entity && candidate.identifier === identifier,
  );
}
