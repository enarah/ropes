"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantGuardSessionForRequest } from "@/lib/auth-session";
import { recordAuditLog } from "@/lib/audit-logs";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import { testFulcrumApiToken } from "@/lib/fulcrum-connection-test";
import {
  hasInvalidSelectedFulcrumAppIds,
  importFulcrumRecordsForConnection,
  parseFulcrumImportLimit,
  parseSelectedFulcrumAppIds,
} from "@/lib/fulcrum-import";
import {
  createFulcrumTokenHint,
  decryptFulcrumApiToken,
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
      lastTestMessage: null,
      name,
      status: "READY_FOR_SETUP" as const,
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

export async function testFulcrumConnectionAction(formData: FormData) {
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
        select: {
          encryptedApiToken: true,
          id: true,
          organisationId: true,
        },
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

    if (!connection.encryptedApiToken) {
      await recordFulcrumConnectionTestFailure({
        actorUserId: context.actorUserId,
        category: "missing_token",
        connectionId: connection.id,
        organisationId: context.organisationId,
        prisma,
      });
      redirectTo = `/fulcrum/connections?org=${organisation.slug}&tested=missing-token`;
    } else {
      let apiToken: string | null = null;

      try {
        apiToken = decryptFulcrumApiToken(connection.encryptedApiToken);
      } catch (error) {
        const category = isFulcrumEncryptionKeyError(error)
          ? "missing_encryption_key"
          : "token_decryption_failed";
        await recordFulcrumConnectionTestFailure({
          actorUserId: context.actorUserId,
          category,
          connectionId: connection.id,
          organisationId: context.organisationId,
          prisma,
        });
        redirectTo = `/fulcrum/connections?org=${organisation.slug}&tested=${category}`;
      }

      if (apiToken) {
        const testResult = await testFulcrumApiToken(apiToken);

        if (testResult.ok) {
          await prisma.fulcrumConnection.update({
            data: {
              accountLabel: testResult.accountLabel ?? undefined,
              lastCheckedAt: new Date(),
              lastTestMessage: testResult.category,
              status: "CONNECTED",
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
              event: "fulcrum_connection_test_passed",
              result: testResult.category,
            },
            organisationId: context.organisationId,
            summary: "Tested Fulcrum connection credentials successfully.",
          });
          redirectTo = `/fulcrum/connections?org=${organisation.slug}&tested=passed`;
        } else {
          await recordFulcrumConnectionTestFailure({
            actorUserId: context.actorUserId,
            category: testResult.category,
            connectionId: connection.id,
            organisationId: context.organisationId,
            prisma,
          });
          redirectTo = `/fulcrum/connections?org=${organisation.slug}&tested=${testResult.category}`;
        }
      }
    }

    revalidatePath("/fulcrum");
    revalidatePath("/fulcrum/connections");
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${getConnectionErrorCode(error)}`;
  }

  redirect(redirectTo);
}

export async function startFulcrumSyncJobAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const fallbackPath = `/fulcrum/sync-settings?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&sync=demo`);
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
        select: {
          id: true,
          lastTestMessage: true,
          organisationId: true,
          status: true,
        },
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

    if (
      connection.status !== "CONNECTED" ||
      connection.lastTestMessage !== "credentials_accepted"
    ) {
      await recordAuditLog(prisma, {
        action: "REJECTED",
        actorUserId: context.actorUserId,
        entityId: null,
        entityType: "FulcrumSyncJob",
        metadata: {
          connectionId: connection.id,
          event: "fulcrum_sync_job_rejected",
          reason: "connection_not_tested",
        },
        organisationId: context.organisationId,
        summary:
          "Rejected Fulcrum sync job placeholder because the connection was not tested successfully.",
      });
      redirectTo = `/fulcrum/sync-settings?org=${organisation.slug}&sync=connection-not-tested`;
    } else {
      const syncJob = await prisma.fulcrumSyncJob.create({
        data: {
          fulcrumConnectionId: connection.id,
          metadata: {
            connectionId: connection.id,
            event: "manual_sync_placeholder_queued",
            status: "QUEUED",
          },
          organisationId: context.organisationId,
          requestedByUserId: context.actorUserId,
          status: "QUEUED",
          summary:
            "Manual Fulcrum sync placeholder queued. No records, apps or forms were imported.",
        },
      });
      await recordAuditLog(prisma, {
        action: "SYNC_STARTED",
        actorUserId: context.actorUserId,
        entityId: syncJob.id,
        entityType: "FulcrumSyncJob",
        metadata: {
          connectionId: connection.id,
          event: "fulcrum_sync_job_queued",
          status: "QUEUED",
        },
        organisationId: context.organisationId,
        summary:
          "Queued Fulcrum sync job placeholder without importing records.",
      });
      redirectTo = `/fulcrum/sync-settings?org=${organisation.slug}&sync=queued`;
    }

    revalidatePath("/fulcrum");
    revalidatePath("/fulcrum/connections");
    revalidatePath("/fulcrum/sync-settings");
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${getConnectionErrorCode(error)}`;
  }

  redirect(redirectTo);
}

export async function importFulcrumRecordsAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const fallbackPath = `/fulcrum/sync-settings?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&import=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const connectionId = getRequiredString(formData, "connectionId");
    const selectedAppIdInput = getOptionalString(formData, "selectedAppIds");
    const selectedAppIds = parseSelectedFulcrumAppIds(selectedAppIdInput);
    const limit = parseFulcrumImportLimit(
      getOptionalString(formData, "recordLimit"),
    );

    if (
      !selectedAppIds.length ||
      hasInvalidSelectedFulcrumAppIds(selectedAppIdInput)
    ) {
      throw new FulcrumConnectionValidationError(
        "Selected Fulcrum app IDs are missing or invalid.",
      );
    }

    const [organisation, connection] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { id: organisationId },
      }),
      prisma.fulcrumConnection.findUnique({
        select: {
          encryptedApiToken: true,
          id: true,
          lastTestMessage: true,
          organisationId: true,
          status: true,
        },
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

    if (
      connection.status !== "CONNECTED" ||
      connection.lastTestMessage !== "credentials_accepted"
    ) {
      await recordAuditLog(prisma, {
        action: "REJECTED",
        actorUserId: context.actorUserId,
        entityId: null,
        entityType: "FulcrumSyncJob",
        metadata: {
          connectionId: connection.id,
          event: "fulcrum_import_rejected",
          reason: "connection_not_tested",
          selectedAppCount: selectedAppIds.length,
        },
        organisationId: context.organisationId,
        summary:
          "Rejected Fulcrum import because the connection was not tested successfully.",
      });
      redirectTo = `/fulcrum/sync-settings?org=${organisation.slug}&import=connection-not-tested`;
    } else if (!connection.encryptedApiToken) {
      await recordAuditLog(prisma, {
        action: "REJECTED",
        actorUserId: context.actorUserId,
        entityId: null,
        entityType: "FulcrumSyncJob",
        metadata: {
          connectionId: connection.id,
          event: "fulcrum_import_rejected",
          reason: "missing_token",
          selectedAppCount: selectedAppIds.length,
        },
        organisationId: context.organisationId,
        summary: "Rejected Fulcrum import because no encrypted token is stored.",
      });
      redirectTo = `/fulcrum/sync-settings?org=${organisation.slug}&import=missing-token`;
    } else {
      const apiToken = decryptFulcrumApiToken(connection.encryptedApiToken);
      const syncJob = await prisma.fulcrumSyncJob.create({
        data: {
          fulcrumConnectionId: connection.id,
          metadata: {
            connectionId: connection.id,
            event: "manual_fulcrum_import_started",
            recordLimit: limit,
            selectedAppCount: selectedAppIds.length,
            selectedAppIds,
            status: "QUEUED",
          },
          organisationId: context.organisationId,
          requestedByUserId: context.actorUserId,
          status: "QUEUED",
          summary:
            "Manual Fulcrum import queued for selected app IDs. Records are capped for the MVP.",
        },
      });

      await recordAuditLog(prisma, {
        action: "SYNC_STARTED",
        actorUserId: context.actorUserId,
        entityId: syncJob.id,
        entityType: "FulcrumSyncJob",
        metadata: {
          connectionId: connection.id,
          event: "fulcrum_import_started",
          recordLimit: limit,
          selectedAppCount: selectedAppIds.length,
        },
        organisationId: context.organisationId,
        summary: "Started manual Fulcrum import for selected app IDs.",
      });

      await prisma.fulcrumSyncJob.update({
        data: {
          metadata: {
            connectionId: connection.id,
            event: "manual_fulcrum_import_running",
            recordLimit: limit,
            selectedAppCount: selectedAppIds.length,
            selectedAppIds,
            status: "RUNNING",
          },
          startedAt: new Date(),
          status: "RUNNING",
          summary:
            "Manual Fulcrum import is reading selected apps/forms before records.",
        },
        where: {
          id: syncJob.id,
        },
      });

      const importResult = await importFulcrumRecordsForConnection({
        apiToken,
        connectionId: connection.id,
        limit,
        organisationId: context.organisationId,
        prisma,
        selectedAppIds,
      });

      if (importResult.ok) {
        await prisma.fulcrumSyncJob.update({
          data: {
            finishedAt: new Date(),
            metadata: {
              appCount: importResult.appCount,
              connectionId: connection.id,
              event: "manual_fulcrum_import_completed",
              filteredSensitiveFieldCount:
                importResult.filteredSensitiveFieldCount,
              importedRecordCount: importResult.importedRecordCount,
              missingGpsCount: importResult.missingGpsCount,
              recordLimit: limit,
              selectedAppCount: selectedAppIds.length,
              skippedRecordCount: importResult.skippedRecordCount,
              status: "SUCCEEDED",
              updatedRecordCount: importResult.updatedRecordCount,
            },
            status: "SUCCEEDED",
            summary: `Imported ${importResult.importedRecordCount} Fulcrum records, updated ${importResult.updatedRecordCount}, skipped ${importResult.skippedRecordCount} and filtered ${importResult.filteredSensitiveFieldCount} sensitive field preview(s).`,
          },
          where: {
            id: syncJob.id,
          },
        });
        await prisma.fulcrumConnection.update({
          data: {
            lastSyncedAt: new Date(),
          },
          where: {
            id: connection.id,
          },
        });
        await recordAuditLog(prisma, {
          action: "UPDATED",
          actorUserId: context.actorUserId,
          entityId: syncJob.id,
          entityType: "FulcrumSyncJob",
          metadata: {
            appCount: importResult.appCount,
            connectionId: connection.id,
            event: "fulcrum_import_app_metadata_imported",
            selectedAppCount: selectedAppIds.length,
            skippedRecordCount: importResult.skippedRecordCount,
          },
          organisationId: context.organisationId,
          summary: "Imported Fulcrum app/form metadata for selected app IDs.",
        });
        await recordAuditLog(prisma, {
          action: "UPDATED",
          actorUserId: context.actorUserId,
          entityId: syncJob.id,
          entityType: "FulcrumSyncJob",
          metadata: {
            connectionId: connection.id,
            event: "fulcrum_import_records_imported",
            filteredSensitiveFieldCount:
              importResult.filteredSensitiveFieldCount,
            importedRecordCount: importResult.importedRecordCount,
            missingGpsCount: importResult.missingGpsCount,
            skippedRecordCount: importResult.skippedRecordCount,
            updatedRecordCount: importResult.updatedRecordCount,
          },
          organisationId: context.organisationId,
          summary: "Imported capped Fulcrum records for selected app IDs.",
        });
        await recordAuditLog(prisma, {
          action: "UPDATED",
          actorUserId: context.actorUserId,
          entityId: syncJob.id,
          entityType: "FulcrumSyncJob",
          metadata: {
            appCount: importResult.appCount,
            connectionId: connection.id,
            event: "fulcrum_import_completed",
            filteredSensitiveFieldCount:
              importResult.filteredSensitiveFieldCount,
            importedRecordCount: importResult.importedRecordCount,
            missingGpsCount: importResult.missingGpsCount,
            skippedRecordCount: importResult.skippedRecordCount,
            status: "SUCCEEDED",
            updatedRecordCount: importResult.updatedRecordCount,
          },
          organisationId: context.organisationId,
          summary: "Completed manual Fulcrum import MVP run.",
        });
        redirectTo = `/fulcrum/sync-settings?org=${organisation.slug}&import=completed`;
      } else {
        await prisma.fulcrumSyncJob.update({
          data: {
            finishedAt: new Date(),
            metadata: {
              connectionId: connection.id,
              event: "manual_fulcrum_import_failed",
              recordLimit: limit,
              safeErrorCategory: importResult.category,
              selectedAppCount: selectedAppIds.length,
              status: "FAILED",
            },
            safeErrorCategory: importResult.category,
            status: "FAILED",
            summary:
              "Manual Fulcrum import failed with a safe API failure category.",
          },
          where: {
            id: syncJob.id,
          },
        });
        await recordAuditLog(prisma, {
          action: "SYNC_FAILED",
          actorUserId: context.actorUserId,
          entityId: syncJob.id,
          entityType: "FulcrumSyncJob",
          metadata: {
            connectionId: connection.id,
            event: "fulcrum_import_failed",
            safeErrorCategory: importResult.category,
            selectedAppCount: selectedAppIds.length,
          },
          organisationId: context.organisationId,
          summary: "Manual Fulcrum import failed with a safe failure category.",
        });
        redirectTo = `/fulcrum/sync-settings?org=${organisation.slug}&import=failed-${importResult.category}`;
      }
    }

    revalidatePath("/fulcrum");
    revalidatePath("/fulcrum/apps-forms");
    revalidatePath("/fulcrum/field-records");
    revalidatePath("/fulcrum/sync-settings");
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

async function recordFulcrumConnectionTestFailure({
  actorUserId,
  category,
  connectionId,
  organisationId,
  prisma,
}: {
  actorUserId: string;
  category: string;
  connectionId: string;
  organisationId: string;
  prisma: ReturnType<typeof getPrismaClient>;
}) {
  await prisma.fulcrumConnection.update({
    data: {
      lastCheckedAt: new Date(),
      lastTestMessage: category,
      status: "ERROR",
    },
    where: {
      id: connectionId,
    },
  });
  await recordAuditLog(prisma, {
    action: "UPDATED",
    actorUserId,
    entityId: connectionId,
    entityType: "FulcrumConnection",
    metadata: {
      event: "fulcrum_connection_test_failed",
      result: category,
    },
    organisationId,
    summary: "Tested Fulcrum connection credentials and recorded a safe failure category.",
  });
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
