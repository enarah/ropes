import type { PrismaClient } from "@prisma/client";
import { canReadOrganisation } from "@/lib/auth-session";
import { recordAuditLog } from "@/lib/audit-logs";
import {
  defaultDemoCapabilityKeys,
  getModuleKeyForCapability,
  isOrganisationCapabilityKey,
  organisationHasCapability,
  type OrganisationCapabilityKey,
} from "@/lib/capability-registry";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import { isAuthenticatedDatabaseMode } from "@/lib/read-access-mode";

export type CapabilityCheckResult =
  | { capability: OrganisationCapabilityKey; status: "enabled" }
  | { capability: OrganisationCapabilityKey; status: "disabled" };

export class OrganisationCapabilityError extends Error {
  constructor(public readonly capability: OrganisationCapabilityKey) {
    super(`Organisation capability is disabled: ${capability}`);
    this.name = "OrganisationCapabilityError";
  }
}

export function isOrganisationCapabilityError(
  error: unknown,
): error is OrganisationCapabilityError {
  return error instanceof OrganisationCapabilityError;
}

export async function getOrganisationCapabilities(
  organisationSlug: string,
): Promise<OrganisationCapabilityKey[]> {
  if (!isDatabaseConfigured()) {
    return [...defaultDemoCapabilityKeys];
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      select: {
        capabilities: {
          select: {
            key: true,
          },
        },
        id: true,
      },
      where: {
        slug: organisationSlug,
      },
    });

    if (!organisation) {
      return isAuthenticatedDatabaseMode()
        ? []
        : [...defaultDemoCapabilityKeys];
    }

    if (!(await canReadOrganisation(prisma, organisation.id))) {
      return [];
    }

    return normaliseCapabilityKeys(
      organisation.capabilities.map((capability) => capability.key),
    );
  } catch {
    return isAuthenticatedDatabaseMode() ? [] : [...defaultDemoCapabilityKeys];
  }
}

export async function requireOrganisationCapability(
  prisma: PrismaClient,
  organisationId: string,
  capability: OrganisationCapabilityKey,
  auditContext?: {
    actorUserId?: string | null;
    entityId?: string | null;
    entityType: string;
  },
): Promise<CapabilityCheckResult> {
  const enabledCapability = await prisma.organisationCapability.findUnique({
    select: {
      id: true,
    },
    where: {
      organisationId_key: {
        key: capability,
        organisationId,
      },
    },
  });

  if (!enabledCapability) {
    await recordAuditLog(prisma, {
      action: "REJECTED",
      actorUserId: auditContext?.actorUserId,
      entityId: auditContext?.entityId,
      entityType: auditContext?.entityType ?? "OrganisationCapability",
      metadata: {
        capability,
        event: "organisation_capability_rejected",
        moduleKey: getModuleKeyForCapability(capability),
      },
      organisationId,
      summary: "Rejected feature-gated action for disabled organisation capability.",
    });

    throw new OrganisationCapabilityError(capability);
  }

  return {
    capability,
    status: "enabled",
  };
}

export function assertOrganisationHasCapability(
  capabilityKeys: readonly OrganisationCapabilityKey[] | undefined,
  capability: OrganisationCapabilityKey,
) {
  if (!organisationHasCapability(capabilityKeys, capability)) {
    throw new OrganisationCapabilityError(capability);
  }
}

export function toCapabilitySeedRows({
  capabilityKeys,
  isDemo,
  organisationId,
}: {
  capabilityKeys: readonly OrganisationCapabilityKey[];
  isDemo: boolean;
  organisationId: string;
}) {
  return capabilityKeys.map((key) => ({
    isDemo,
    key,
    moduleKey: getModuleKeyForCapability(key),
    organisationId,
  }));
}

function normaliseCapabilityKeys(keys: string[]) {
  return [...new Set(keys)].filter(isOrganisationCapabilityKey);
}
