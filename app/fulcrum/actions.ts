"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantGuardSessionForRequest } from "@/lib/auth-session";
import { recordAuditLog } from "@/lib/audit-logs";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import {
  createFulcrumTokenHint,
  encryptFulcrumApiToken,
  isFulcrumEncryptionKeyError,
} from "@/lib/fulcrum-token-encryption";
import {
  createOrganisationWriteContext,
  isTenantGuardError,
} from "@/lib/tenant-guards";

class FulcrumConnectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FulcrumConnectionValidationError";
  }
}

export async function saveFulcrumConnectionAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const fallbackPath = `/fulcrum/connections?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const organisation = await prisma.organisation.findUnique({
      select: { id: true, slug: true },
      where: { id: organisationId },
    });

    if (!organisation) {
      throw new FulcrumConnectionValidationError("Organisation was not found.");
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      session,
    });
    const token = getValidatedToken(formData);
    const accountLabel =
      getOptionalString(formData, "accountLabel") ?? "Fulcrum account";
    const name =
      getOptionalString(formData, "connectionName") ??
      "Fulcrum API connection";
    const encryptedApiToken = encryptFulcrumApiToken(token);
    const tokenHint = createFulcrumTokenHint(token);
    const existingConnection = await prisma.fulcrumConnection.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
      where: {
        organisationId: context.organisationId,
      },
    });
    const connectionData = {
      accountLabel,
      disabledAt: null,
      encryptedApiToken,
      isDemo: false,
      lastCheckedAt: null,
      name,
      status: "CONNECTED" as const,
      tokenHint,
    };

    const savedConnection = existingConnection
      ? await prisma.fulcrumConnection.update({
          data: connectionData,
          where: {
            id: existingConnection.id,
          },
        })
      : await prisma.fulcrumConnection.create({
          data: {
            ...connectionData,
            organisationId: context.organisationId,
          },
        });
    await recordAuditLog(prisma, {
      action: existingConnection ? "UPDATED" : "CREATED",
      actorUserId: context.actorUserId,
      entityId: savedConnection.id,
      entityType: "FulcrumConnection",
      metadata: {
        accountLabelProvided: Boolean(accountLabel),
        event: existingConnection
          ? "fulcrum_connection_updated"
          : "fulcrum_connection_created",
      },
      organisationId: context.organisationId,
      summary: existingConnection
        ? "Updated encrypted Fulcrum connection token metadata."
        : "Created encrypted Fulcrum connection token metadata.",
    });

    revalidatePath("/fulcrum");
    revalidatePath("/fulcrum/connections");
    redirectTo = `/fulcrum/connections?org=${organisation.slug}&saved=connection`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${getConnectionErrorCode(error)}`;
  }

  redirect(redirectTo);
}

export async function disableFulcrumConnectionAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const fallbackPath = `/fulcrum/connections?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const connectionId = getRequiredString(formData, "connectionId");
    const [organisation, connection] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { id: organisationId },
      }),
      prisma.fulcrumConnection.findUnique({
        select: { id: true, organisationId: true },
        where: { id: connectionId },
      }),
    ]);

    if (!organisation || !connection) {
      throw new FulcrumConnectionValidationError(
        "Organisation or Fulcrum connection was not found.",
      );
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [{ label: "Fulcrum connection", record: connection }],
      session,
    });

    await prisma.fulcrumConnection.update({
      data: {
        disabledAt: new Date(),
        encryptedApiToken: null,
        status: "NOT_CONNECTED",
        tokenHint: null,
      },
      where: {
        id: connection.id,
      },
    });
    await recordAuditLog(prisma, {
      action: "UPDATED",
      actorUserId: context.actorUserId,
      entityId: connection.id,
      entityType: "FulcrumConnection",
      metadata: {
        event: "fulcrum_connection_disabled",
      },
      organisationId: context.organisationId,
      summary: "Disabled Fulcrum connection and cleared encrypted token storage.",
    });

    revalidatePath("/fulcrum");
    revalidatePath("/fulcrum/connections");
    redirectTo = `/fulcrum/connections?org=${organisation.slug}&saved=disabled`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${getConnectionErrorCode(error)}`;
  }

  redirect(redirectTo);
}

function getConnectionErrorCode(error: unknown) {
  if (isTenantGuardError(error)) {
    return "tenant";
  }

  if (isFulcrumEncryptionKeyError(error)) {
    return "encryption";
  }

  if (error instanceof FulcrumConnectionValidationError) {
    return "validation";
  }

  return "persistence";
}

function getValidatedToken(formData: FormData) {
  const token = getRequiredString(formData, "apiToken");

  if (token.length < 16) {
    throw new FulcrumConnectionValidationError(
      "Fulcrum API token must be at least 16 characters.",
    );
  }

  return token;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new FulcrumConnectionValidationError(`${key} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}
