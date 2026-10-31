import type { OrganisationType, PrismaClient } from "@prisma/client";
import {
  getDashboardAuthContext,
  getTenantGuardSessionForRequest,
} from "@/lib/auth-session";
import {
  defaultDemoCapabilityKeys,
  isOrganisationCapabilityKey,
} from "@/lib/capability-registry";
import {
  getSelectedOrganisation,
  type DashboardOrganisation,
} from "@/lib/dashboard-data";
import {
  getPrismaClient,
  isDatabaseConfigured,
} from "@/lib/db";
import { isAuthenticationConfigured } from "@/lib/auth-options";
import {
  isAuthenticatedDatabaseMode,
  isDemoFallbackMode,
} from "@/lib/read-access-mode";
import {
  isTenantGuardError,
  requireOrganisationAccess,
  type TenantGuardSession,
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
  const authenticated = isAuthenticatedDatabaseMode();
  if (!authenticated) {
    if (!isDemoFallbackMode()) {
      return deniedAccess({
        attemptedOrganisationSlug: selectedOrganisationSlug ?? undefined,
        message: unavailableAccessMessage(),
        title: unavailableAccessTitle(),
      });
    }

    if (isDatabaseConfigured()) {
      return getConfiguredOrganisationPageAccess(selectedOrganisationSlug, "demo-fallback");
    }

    const organisation = getSelectedOrganisation(selectedOrganisationSlug);

    return {
      mode: "demo-fallback",
      organisation: {
        ...organisation,
        capabilityKeys: [...defaultDemoCapabilityKeys],
      },
      status: "allowed",
    };
  }

  return getConfiguredOrganisationPageAccess(selectedOrganisationSlug, "authenticated");
}

async function getConfiguredOrganisationPageAccess(
  selectedOrganisationSlug: string | null | undefined,
  mode: "authenticated" | "demo-fallback",
): Promise<OrganisationPageAccess> {
  try {
    const prisma = getPrismaClient();
    const fallbackSlug = mode === "demo-fallback"
      ? getSelectedOrganisation().slug
      : (await getDashboardAuthContext(prisma)).availableOrganisations[0]?.slug;
    const requestedSlug = selectedOrganisationSlug ?? fallbackSlug;
    if (!requestedSlug) {
      return deniedAccess({ message: "No accessible organisation is available.", title: "No active organisation membership" });
    }
    return await resolveDatabaseOrganisationPageAccess(
      prisma, requestedSlug, await getTenantGuardSessionForRequest(prisma), mode,
    );
  } catch (error) {
    return deniedAccess({
      attemptedOrganisationSlug: selectedOrganisationSlug ?? undefined,
      message: isTenantGuardError(error)
        ? "Your session does not have access to this organisation."
        : "The database or session could not confirm organisation access.",
      title: isTenantGuardError(error) ? "Organisation access denied" : "Organisation access unavailable",
    });
  }
}

// Shared by authenticated and configured demo paths. No static tenant fallback.
export async function resolveDatabaseOrganisationPageAccess(
  prisma: PrismaClient,
  slug: string,
  session: TenantGuardSession,
  mode: "authenticated" | "demo-fallback",
): Promise<OrganisationPageAccess> {
  const organisation = await prisma.organisation.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true, isDemo: true,
      capabilities: { select: { key: true } } },
  });
  if (!organisation) {
    return deniedAccess({ attemptedOrganisationSlug: slug, message: "The requested organisation was not found.", title: "Organisation unavailable" });
  }
  requireOrganisationAccess(session, organisation.id);
  // A demo session must never turn a non-demo database tenant into a demo page.
  if (mode === "demo-fallback" && !organisation.isDemo) {
    return deniedAccess({ attemptedOrganisationSlug: slug, message: "This organisation is not available in demo mode.", title: "Organisation access denied" });
  }
  return {
    mode, status: "allowed",
    organisation: {
      id: organisation.id, isDemo: organisation.isDemo,
      capabilityKeys: normaliseCapabilityKeys(organisation.capabilities.map((capability) => capability.key)),
      name: organisation.name, slug: organisation.slug,
      type: formatOrganisationType(organisation.type), region: formatOrganisationType(organisation.type),
    },
  };
}

function normaliseCapabilityKeys(keys: string[]) {
  return [...new Set(keys)].filter(isOrganisationCapabilityKey);
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

function unavailableAccessTitle() {
  if (!isDatabaseConfigured()) {
    return "Database configuration required";
  }

  if (!isAuthenticationConfigured()) {
    return "Authentication configuration required";
  }

  return "Organisation access unavailable";
}

function unavailableAccessMessage() {
  if (!isDatabaseConfigured()) {
    return "ROPES cannot load organisation data until the database is configured.";
  }

  if (!isAuthenticationConfigured()) {
    return "ROPES cannot load organisation data until authentication is configured.";
  }

  return "ROPES could not confirm authenticated organisation access.";
}

function formatOrganisationType(type: OrganisationType) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
