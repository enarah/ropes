import type { PrismaClient } from "@prisma/client";
import { fakeCurrentSession } from "@/lib/dashboard-data";
import type {
  TenantGuardMembership,
  TenantGuardSession,
} from "@/lib/tenant-guards";

export async function getFakeTenantGuardSession(
  prisma: PrismaClient,
): Promise<TenantGuardSession> {
  const [user, organisations] = await Promise.all([
    prisma.user.findUnique({
      select: { id: true },
      where: { email: fakeCurrentSession.user.email },
    }),
    prisma.organisation.findMany({
      select: { id: true, slug: true },
      where: {
        slug: {
          in: fakeCurrentSession.memberships.map(
            (membership) => membership.organisationSlug,
          ),
        },
      },
    }),
  ]);

  const organisationsBySlug = new Map(
    organisations.map((organisation) => [organisation.slug, organisation.id]),
  );

  return {
    userId: user?.id ?? null,
    memberships: fakeCurrentSession.memberships
      .map((membership): TenantGuardMembership | null => {
        const organisationId = organisationsBySlug.get(
          membership.organisationSlug,
        );

        if (!organisationId) {
          return null;
        }

        return {
          organisationId,
          role: membership.role,
          status: "ACTIVE" as const,
        };
      })
      .filter(
        (membership): membership is TenantGuardMembership =>
          Boolean(membership),
      ),
  };
}
