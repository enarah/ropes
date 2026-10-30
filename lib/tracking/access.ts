import type { PrismaClient } from "@prisma/client";
import { requireOrganisationCapability } from "../organisation-capabilities";
import { requireOrganisationAccess, type TenantGuardSession } from "../tenant-guards";

export async function authorizeTrackingOrganisation(
  prisma: PrismaClient,
  organisationId: string,
  session: TenantGuardSession,
) {
  requireOrganisationAccess(session, organisationId);
  await requireOrganisationCapability(prisma, organisationId, "integrations.spotTracker");
}
