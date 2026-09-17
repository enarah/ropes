import type {
  MembershipStatus,
  OrganisationType,
  PrismaClient,
} from "@prisma/client";
import {
  canonicalRoleDefinitions,
  getCanonicalRoleDefinition,
} from "@/lib/canonical-roles";
import {
  getCapabilityDefinition,
  getModuleKeyForCapability,
  isOrganisationCapabilityKey,
  type OrganisationCapabilityKey,
} from "@/lib/capability-registry";

const membershipStatuses = ["ACTIVE", "INVITED", "SUSPENDED"] as const;
export type ProvisionUserInput = {
  apply: boolean;
  bootstrapOrganisation: boolean;
  capabilities: OrganisationCapabilityKey[];
  displayName: string;
  email: string;
  membershipStatus: MembershipStatus;
  organisationName?: string;
  organisationSlug: string;
  organisationType?: OrganisationType;
  roleName: string;
};

export type ProvisioningRoleState = {
  description: string;
  id: string;
  name: string;
};

export type ProvisioningOrganisationState = {
  id: string;
  isDemo: boolean;
  name: string;
  slug: string;
  type: OrganisationType;
};

export type ProvisioningUserState = {
  email: string;
  id: string;
  isDemo: boolean;
  name: string;
};

export type ProvisioningMembershipState = {
  id: string;
  organisationId: string;
  roleName: string;
  status: MembershipStatus;
  userId: string;
};

export type ProvisioningCapabilityState = {
  id: string;
  isDemo: boolean;
  key: string;
  moduleKey: string;
  organisationId: string;
};

export type ProvisioningState = {
  capabilities: ProvisioningCapabilityState[];
  membership?: ProvisioningMembershipState;
  organisation?: ProvisioningOrganisationState;
  roles: ProvisioningRoleState[];
  user?: ProvisioningUserState;
};

export type ProvisioningActionStatus =
  | "conflict"
  | "exists"
  | "missing"
  | "would-create";

export type ProvisioningAction = {
  detail: string;
  entity: "capability" | "membership" | "organisation" | "role" | "user";
  identifier: string;
  status: ProvisioningActionStatus;
};

export type ProvisioningPlan = {
  actions: ProvisioningAction[];
  canApply: boolean;
  conflicts: string[];
  input: NormalisedProvisionUserInput;
};

export type NormalisedProvisionUserInput = ProvisionUserInput & {
  email: string;
  organisationType: OrganisationType;
};

export function normaliseProvisionUserInput(
  input: ProvisionUserInput,
): NormalisedProvisionUserInput {
  const email = normaliseEmail(input.email);
  const displayName = input.displayName.trim();
  const organisationSlug = input.organisationSlug.trim();
  const organisationName = input.organisationName?.trim();
  const roleName = input.roleName.trim();

  if (!email) {
    throw new ProvisioningInputError("A valid email address is required.");
  }

  if (!displayName) {
    throw new ProvisioningInputError("A display name is required.");
  }

  if (!organisationSlug) {
    throw new ProvisioningInputError("An organisation slug is required.");
  }

  if (!roleName) {
    throw new ProvisioningInputError("A role name is required.");
  }

  if (!membershipStatuses.includes(input.membershipStatus)) {
    throw new ProvisioningInputError(
      `Membership status must be one of: ${membershipStatuses.join(", ")}.`,
    );
  }

  const organisationType = input.organisationType ?? "ENARAH";

  if (organisationType !== "ENARAH") {
    throw new ProvisioningInputError(
      "Controlled-test organisation bootstrap currently supports ENARAH only.",
    );
  }

  const capabilities = [...new Set(input.capabilities)];

  for (const capability of capabilities) {
    if (!isOrganisationCapabilityKey(capability)) {
      throw new ProvisioningInputError(
        `Unknown organisation capability: ${capability}`,
      );
    }
  }

  return {
    ...input,
    capabilities,
    displayName,
    email,
    organisationName,
    organisationSlug,
    organisationType,
    roleName,
  };
}

export function normaliseEmail(email: string) {
  const normalised = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) {
    return "";
  }

  return normalised;
}

export class ProvisioningInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisioningInputError";
  }
}

export function buildProvisioningPlan(
  input: ProvisionUserInput,
  state: ProvisioningState,
): ProvisioningPlan {
  const normalisedInput = normaliseProvisionUserInput(input);
  const actions: ProvisioningAction[] = [];
  const conflicts: string[] = [];
  const roleMap = new Map(state.roles.map((role) => [role.name, role]));
  const requestedRoleDefinition = getCanonicalRoleDefinition(
    normalisedInput.roleName,
  );

  for (const canonicalRole of canonicalRoleDefinitions) {
    const existingRole = roleMap.get(canonicalRole.name);

    if (!existingRole) {
      actions.push({
        detail: "Canonical role is missing and would be created.",
        entity: "role",
        identifier: canonicalRole.name,
        status: "would-create",
      });
      continue;
    }

    if (existingRole.description !== canonicalRole.description) {
      addConflict(
        actions,
        conflicts,
        "role",
        canonicalRole.name,
        "Existing canonical role has a conflicting description.",
      );
      continue;
    }

    actions.push({
      detail: "Canonical role already exists with the expected definition.",
      entity: "role",
      identifier: canonicalRole.name,
      status: "exists",
    });
  }

  if (!requestedRoleDefinition) {
    addConflict(
      actions,
      conflicts,
      "role",
      normalisedInput.roleName,
      "Requested role is not a canonical ROPES role.",
    );
  }

  const requestedRole = roleMap.get(normalisedInput.roleName);
  planOrganisation(normalisedInput, state, actions, conflicts);
  planUser(normalisedInput, state, actions, conflicts);
  planMembership({
    actions,
    conflicts,
    input: normalisedInput,
    requestedRole,
    requestedRoleDefinition,
    state,
  });
  planCapabilities(normalisedInput, state, actions, conflicts);

  return {
    actions,
    canApply: conflicts.length === 0,
    conflicts,
    input: normalisedInput,
  };
}

function planOrganisation(
  input: NormalisedProvisionUserInput,
  state: ProvisioningState,
  actions: ProvisioningAction[],
  conflicts: string[],
) {
  const organisation = state.organisation;

  if (!organisation) {
    if (!input.bootstrapOrganisation) {
      addConflict(
        actions,
        conflicts,
        "organisation",
        input.organisationSlug,
        "Organisation is missing and bootstrap was not explicitly requested.",
      );
      return;
    }

    if (!input.organisationName) {
      addConflict(
        actions,
        conflicts,
        "organisation",
        input.organisationSlug,
        "Organisation bootstrap requires an explicit organisation name.",
      );
      return;
    }

    actions.push({
      detail: `Organisation would be created as ${input.organisationType} with isDemo=false.`,
      entity: "organisation",
      identifier: input.organisationSlug,
      status: "would-create",
    });
    return;
  }

  if (organisation.isDemo) {
    addConflict(
      actions,
      conflicts,
      "organisation",
      organisation.slug,
      "Existing organisation is marked as demo and cannot be used for controlled testing.",
    );
    return;
  }

  if (organisation.type !== input.organisationType) {
    addConflict(
      actions,
      conflicts,
      "organisation",
      organisation.slug,
      `Existing organisation type is ${organisation.type}, expected ${input.organisationType}.`,
    );
    return;
  }

  if (input.organisationName && organisation.name !== input.organisationName) {
    addConflict(
      actions,
      conflicts,
      "organisation",
      organisation.slug,
      "Existing organisation name does not match the requested name.",
    );
    return;
  }

  actions.push({
    detail: "Organisation already exists and is suitable for controlled testing.",
    entity: "organisation",
    identifier: organisation.slug,
    status: "exists",
  });
}

function planUser(
  input: NormalisedProvisionUserInput,
  state: ProvisioningState,
  actions: ProvisioningAction[],
  conflicts: string[],
) {
  const user = state.user;

  if (!user) {
    actions.push({
      detail: `User would be created with display name "${input.displayName}" and isDemo=false.`,
      entity: "user",
      identifier: input.email,
      status: "would-create",
    });
    return;
  }

  if (user.isDemo) {
    addConflict(
      actions,
      conflicts,
      "user",
      user.email,
      "Existing user is marked as demo and cannot be reused for controlled testing.",
    );
    return;
  }

  if (user.name !== input.displayName) {
    addConflict(
      actions,
      conflicts,
      "user",
      user.email,
      "Existing user display name differs from the requested name.",
    );
    return;
  }

  actions.push({
    detail: "User already exists with matching safe profile details.",
    entity: "user",
    identifier: user.email,
    status: "exists",
  });
}

function planMembership({
  actions,
  conflicts,
  input,
  requestedRole,
  requestedRoleDefinition,
  state,
}: {
  actions: ProvisioningAction[];
  conflicts: string[];
  input: NormalisedProvisionUserInput;
  requestedRole?: ProvisioningRoleState;
  requestedRoleDefinition?: { description: string; name: string };
  state: ProvisioningState;
}) {
  const membership = state.membership;

  if (!state.organisation && !input.bootstrapOrganisation) {
    actions.push({
      detail: "Membership cannot be planned until the organisation exists or bootstrap is explicitly requested.",
      entity: "membership",
      identifier: `${input.email} -> ${input.organisationSlug}`,
      status: "missing",
    });
    return;
  }

  if (!requestedRole && !requestedRoleDefinition) {
    actions.push({
      detail: "Membership cannot be planned with a non-canonical role.",
      entity: "membership",
      identifier: `${input.email} -> ${input.organisationSlug}`,
      status: "missing",
    });
    return;
  }

  if (!membership) {
    actions.push({
      detail: `Membership would be created with role "${input.roleName}" and status ${input.membershipStatus}.`,
      entity: "membership",
      identifier: `${input.email} -> ${input.organisationSlug}`,
      status: "would-create",
    });
    return;
  }

  if (membership.roleName !== input.roleName) {
    addConflict(
      actions,
      conflicts,
      "membership",
      membership.id,
      `Existing membership role is "${membership.roleName}", expected "${input.roleName}".`,
    );
    return;
  }

  if (membership.status !== input.membershipStatus) {
    addConflict(
      actions,
      conflicts,
      "membership",
      membership.id,
      `Existing membership status is ${membership.status}, expected ${input.membershipStatus}.`,
    );
    return;
  }

  actions.push({
    detail: "Membership already exists with the requested role and status.",
    entity: "membership",
    identifier: membership.id,
    status: "exists",
  });
}

function planCapabilities(
  input: NormalisedProvisionUserInput,
  state: ProvisioningState,
  actions: ProvisioningAction[],
  conflicts: string[],
) {
  if (input.capabilities.length === 0) {
    actions.push({
      detail: "No capability bootstrap was requested; tenant capability gates remain unchanged.",
      entity: "capability",
      identifier: "none",
      status: "exists",
    });
    return;
  }

  if (!state.organisation && !input.bootstrapOrganisation) {
    addConflict(
      actions,
      conflicts,
      "capability",
      input.organisationSlug,
      "Capabilities cannot be planned until the organisation exists or bootstrap is explicitly requested.",
    );
    return;
  }

  const capabilityMap = new Map(
    state.capabilities.map((capability) => [capability.key, capability]),
  );

  for (const capabilityKey of input.capabilities) {
    const definition = getCapabilityDefinition(capabilityKey);
    const existingCapability = capabilityMap.get(capabilityKey);

    if (!definition) {
      addConflict(
        actions,
        conflicts,
        "capability",
        capabilityKey,
        "Capability is not defined in the registry.",
      );
      continue;
    }

    if (!existingCapability) {
      actions.push({
        detail: "Capability would be enabled explicitly for this organisation with isDemo=false.",
        entity: "capability",
        identifier: capabilityKey,
        status: "would-create",
      });
      continue;
    }

    if (existingCapability.isDemo) {
      addConflict(
        actions,
        conflicts,
        "capability",
        capabilityKey,
        "Existing capability is marked as demo and cannot be reused for controlled testing.",
      );
      continue;
    }

    if (existingCapability.moduleKey !== definition.moduleKey) {
      addConflict(
        actions,
        conflicts,
        "capability",
        capabilityKey,
        "Existing capability has a conflicting module key.",
      );
      continue;
    }

    actions.push({
      detail: "Capability is already enabled for this organisation.",
      entity: "capability",
      identifier: capabilityKey,
      status: "exists",
    });
  }
}

function addConflict(
  actions: ProvisioningAction[],
  conflicts: string[],
  entity: ProvisioningAction["entity"],
  identifier: string,
  detail: string,
) {
  conflicts.push(`${entity}:${identifier}: ${detail}`);
  actions.push({
    detail,
    entity,
    identifier,
    status: "conflict",
  });
}

export async function readProvisioningState(
  prisma: PrismaClient,
  input: ProvisionUserInput,
): Promise<ProvisioningState> {
  const normalisedInput = normaliseProvisionUserInput(input);
  const [roles, organisation, user] = await Promise.all([
    prisma.role.findMany({
      select: { description: true, id: true, name: true },
      where: {
        name: {
          in: canonicalRoleDefinitions.map((role) => role.name),
        },
      },
    }),
    prisma.organisation.findUnique({
      select: {
        capabilities: {
          select: {
            id: true,
            isDemo: true,
            key: true,
            moduleKey: true,
            organisationId: true,
          },
        },
        id: true,
        isDemo: true,
        name: true,
        slug: true,
        type: true,
      },
      where: { slug: normalisedInput.organisationSlug },
    }),
    prisma.user.findUnique({
      select: {
        email: true,
        id: true,
        isDemo: true,
        name: true,
      },
      where: { email: normalisedInput.email },
    }),
  ]);
  const membership =
    organisation && user
      ? await prisma.membership.findUnique({
          select: {
            id: true,
            organisationId: true,
            role: {
              select: {
                name: true,
              },
            },
            status: true,
            userId: true,
          },
          where: {
            organisationId_userId: {
              organisationId: organisation.id,
              userId: user.id,
            },
          },
        })
      : null;

  return {
    capabilities: organisation?.capabilities ?? [],
    membership: membership
      ? {
          id: membership.id,
          organisationId: membership.organisationId,
          roleName: membership.role.name,
          status: membership.status,
          userId: membership.userId,
        }
      : undefined,
    organisation: organisation
      ? {
          id: organisation.id,
          isDemo: organisation.isDemo,
          name: organisation.name,
          slug: organisation.slug,
          type: organisation.type,
        }
      : undefined,
    roles,
    user: user ?? undefined,
  };
}

export async function applyProvisioningPlan(
  prisma: PrismaClient,
  input: ProvisionUserInput,
) {
  const state = await readProvisioningState(prisma, input);
  const plan = buildProvisioningPlan(input, state);

  if (!plan.canApply) {
    throw new ProvisioningInputError(
      `Provisioning conflicts must be resolved before apply: ${plan.conflicts.join("; ")}`,
    );
  }

  await prisma.$transaction(async (transaction) => {
    for (const role of canonicalRoleDefinitions) {
      await transaction.role.upsert({
        create: role,
        update: {},
        where: { name: role.name },
      });
    }

    const organisation =
      (await transaction.organisation.findUnique({
        select: { id: true },
        where: { slug: plan.input.organisationSlug },
      })) ??
      (await transaction.organisation.create({
        data: {
          isDemo: false,
          name: requireValue(
            plan.input.organisationName,
            "Organisation name is required before apply.",
          ),
          slug: plan.input.organisationSlug,
          type: plan.input.organisationType,
        },
        select: { id: true },
      }));
    const user =
      (await transaction.user.findUnique({
        select: { id: true },
        where: { email: plan.input.email },
      })) ??
      (await transaction.user.create({
        data: {
          email: plan.input.email,
          isDemo: false,
          name: plan.input.displayName,
        },
        select: { id: true },
      }));
    const role = await transaction.role.findUniqueOrThrow({
      select: { id: true },
      where: { name: plan.input.roleName },
    });

    await transaction.membership.upsert({
      create: {
        organisationId: organisation.id,
        roleId: role.id,
        status: plan.input.membershipStatus,
        userId: user.id,
      },
      update: {},
      where: {
        organisationId_userId: {
          organisationId: organisation.id,
          userId: user.id,
        },
      },
    });

    for (const capability of plan.input.capabilities) {
      await transaction.organisationCapability.upsert({
        create: {
          isDemo: false,
          key: capability,
          moduleKey: getModuleKeyForCapability(capability),
          organisationId: organisation.id,
        },
        update: {},
        where: {
          organisationId_key: {
            key: capability,
            organisationId: organisation.id,
          },
        },
      });
    }
  });

  return plan;
}

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined || value === "") {
    throw new ProvisioningInputError(message);
  }

  return value;
}
