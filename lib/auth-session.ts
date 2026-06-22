import type { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions, isAuthenticationConfigured } from "@/lib/auth-options";
import {
  defaultDemoCapabilityKeys,
  isOrganisationCapabilityKey,
  type OrganisationCapabilityKey,
} from "@/lib/capability-registry";
import { demoOrganisations, fakeCurrentSession } from "@/lib/dashboard-data";
import { getFakeTenantGuardSession } from "@/lib/demo-session";
import { isDatabaseConfigured } from "@/lib/db";
import {
  requireOrganisationAccess,
  type TenantGuardSession,
} from "@/lib/tenant-guards";

export type AuthResolutionSource =
  | "authenticated"
  | "demo-fallback"
  | "unauthenticated";

export type DashboardAuthContext = {
  availableOrganisations: Array<{
    capabilityKeys: OrganisationCapabilityKey[];
    name: string;
    slug: string;
    type: string;
  }>;
  email?: string;
  isAuthConfigured: boolean;
  name: string;
  source: AuthResolutionSource;
};

export async function getTenantGuardSessionForRequest(
  prisma: PrismaClient,
): Promise<TenantGuardSession> {
  if (!isAuthenticationConfigured()) {
    return getFakeTenantGuardSession(prisma);
  }

  const authSession = await getServerSession(authOptions);
  const email = authSession?.user?.email;

  if (!email) {
    return { memberships: [], userId: null };
  }

  const user = await prisma.user.findUnique({
    include: {
      memberships: {
        include: {
          role: true,
        },
        where: {
          status: "ACTIVE",
        },
      },
    },
    where: {
      email,
    },
  });

  if (!user) {
    return { memberships: [], userId: null };
  }

  return {
    userId: user.id,
    memberships: user.memberships.map((membership) => ({
      organisationId: membership.organisationId,
      role: membership.role.name,
      status: membership.status,
    })),
  };
}

export async function canReadOrganisation(
  prisma: PrismaClient,
  organisationId: string,
) {
  const session = await getTenantGuardSessionForRequest(prisma);

  try {
    requireOrganisationAccess(session, organisationId);
    return true;
  } catch {
    return false;
  }
}

export async function getDashboardAuthContext(
  prisma?: PrismaClient,
): Promise<DashboardAuthContext> {
  const authConfigured = isAuthenticationConfigured();

  if (!isDatabaseConfigured() || !prisma) {
    return {
      availableOrganisations: demoOrganisations.map((organisation) => ({
        capabilityKeys: [...defaultDemoCapabilityKeys],
        name: organisation.name,
        slug: organisation.slug,
        type: "Demo fallback",
      })),
      email: fakeCurrentSession.user.email,
      isAuthConfigured: authConfigured,
      name: fakeCurrentSession.user.name,
      source: "demo-fallback",
    };
  }

  if (!authConfigured) {
    const fakeSession = await getFakeTenantGuardSession(prisma);
    const organisationIds = new Set(
      fakeSession.memberships?.map((membership) => membership.organisationId),
    );
    const organisations = await prisma.organisation.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        capabilities: {
          select: {
            key: true,
          },
        },
        id: true,
        name: true,
        slug: true,
        type: true,
      },
      where: {
        id: {
          in: [...organisationIds],
        },
      },
    });

    return {
      availableOrganisations: organisations.map((organisation) => ({
        capabilityKeys: normaliseCapabilityKeys(
          organisation.capabilities.map((capability) => capability.key),
        ),
        name: organisation.name,
        slug: organisation.slug,
        type: `${organisation.type} demo fallback`,
      })),
      email: fakeCurrentSession.user.email,
      isAuthConfigured: false,
      name: fakeCurrentSession.user.name,
      source: "demo-fallback",
    };
  }

  const authSession = await getServerSession(authOptions);
  const email = authSession?.user?.email;
  const name = authSession?.user?.name ?? "Signed-in user";

  if (!email) {
    return {
      availableOrganisations: [],
      isAuthConfigured: true,
      name: "Not signed in",
      source: "unauthenticated",
    };
  }

  const user = await prisma.user.findUnique({
    include: {
      memberships: {
        include: {
          organisation: {
            include: {
              capabilities: {
                select: {
                  key: true,
                },
              },
            },
          },
          role: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        where: {
          status: "ACTIVE",
        },
      },
    },
    where: {
      email,
    },
  });

  return {
    availableOrganisations:
      user?.memberships.map((membership) => ({
        capabilityKeys: normaliseCapabilityKeys(
          membership.organisation.capabilities.map(
            (capability) => capability.key,
          ),
        ),
        name: membership.organisation.name,
        slug: membership.organisation.slug,
        type: membership.role.name,
      })) ?? [],
    email,
    isAuthConfigured: true,
    name: user?.name ?? name,
    source: user ? "authenticated" : "unauthenticated",
  };
}

function normaliseCapabilityKeys(keys: string[]) {
  return [...new Set(keys)].filter(isOrganisationCapabilityKey);
}
