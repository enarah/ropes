import type { OrganisationType } from "@prisma/client";
import {
  getDashboardAuthContext,
  getTenantGuardSessionForRequest,
} from "@/lib/auth-session";
import {
  getSelectedOrganisation,
  type DashboardOrganisation,
} from "@/lib/dashboard-data";
import { getPrismaClient } from "@/lib/db";
import { isAuthenticatedDatabaseMode } from "@/lib/read-access-mode";
import {
  isTenantGuardError,
  requireOrganisationAccess,
} from "@/lib/tenant-guards";

export type OrganisationPageAccess =
  | {
      mode: "authenticated";
      organisation: DashboardOrganisation;
      status: "allowed";
    }
  | {
      mode: "demo-fallback";
      organisation: DashboardOrganisation;
      status: "allowed";
    }
  | {
      attemptedOrganisationSlug?: string;
      message: string;
      mode: "authenticated";
      status: "denied";
      title: string;
    };

export async function getOrganisationPageAccess(
  selectedOrganisationSlug?: string | null,
): Promise<OrganisationPageAccess> {
  if (!isAuthenticatedDatabaseMode()) {
    return {
      mode: "demo-fallback",
      organisation: getSelectedOrganisation(selectedOrganisationSlug),
      status: "allowed",
    };
  }

  try {
    const prisma = getPrismaClient();
    const authContext = await getDashboardAuthContext(prisma);
    const fallbackOrganisationSlug = authContext.availableOrganisations[0]?.slug;
    const requestedOrganisationSlug =
      selectedOrganisationSlug ?? fallbackOrganisationSlug;

    if (!requestedOrganisationSlug) {
      return deniedAccess({
        message:
          "Sign in with an account that has an active ROPES organisation membership.",
        title: "No active organisation membership",
      });
    }

    const organisation = await prisma.organisation.findUnique({
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
      },
      where: {
        slug: requestedOrganisationSlug,
      },
    });

    if (!organisation) {
      return deniedAccess({
        attemptedOrganisationSlug: requestedOrganisationSlug,
        message:
          "The requested organisation was not found in the configured database.",
        title: "Organisation unavailable",
      });
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    requireOrganisationAccess(session, organisation.id);

    return {
      mode: "authenticated",
      organisation: {
        id: organisation.id,
        name: organisation.name,
        region: formatOrganisationType(organisation.type),
        slug: organisation.slug,
        type: formatOrganisationType(organisation.type),
      },
      status: "allowed",
    };
  } catch (error) {
    if (isTenantGuardError(error)) {
      return deniedAccess({
        attemptedOrganisationSlug: selectedOrganisationSlug ?? undefined,
        message:
          "Your signed-in account does not have an active membership for this organisation.",
        title: "Organisation access denied",
      });
    }

    return deniedAccess({
      attemptedOrganisationSlug: selectedOrganisationSlug ?? undefined,
      message:
        "The configured database or authentication check could not confirm access, so ROPES did not load organisation data.",
      title: "Organisation access unavailable",
    });
  }
}

function deniedAccess({
  attemptedOrganisationSlug,
  message,
  title,
}: {
  attemptedOrganisationSlug?: string;
  message: string;
  title: string;
}): OrganisationPageAccess {
  return {
    attemptedOrganisationSlug,
    message,
    mode: "authenticated",
    status: "denied",
    title,
  };
}

function formatOrganisationType(type: OrganisationType) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
