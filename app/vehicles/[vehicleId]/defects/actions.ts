"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantGuardSessionForRequest } from "@/lib/auth-session";
import { recordAuditLog } from "@/lib/audit-logs";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import {
  createOrganisationWriteContext,
  isTenantGuardError,
} from "@/lib/tenant-guards";
import {
  vehicleDefectCategoryOptions,
  vehicleDefectSeverityOptions,
  vehicleDefectStatusOptions,
  type VehicleDefectCategoryValue,
  type VehicleDefectSeverityValue,
  type VehicleDefectStatusValue,
} from "@/lib/vehicles-data";

class DefectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DefectValidationError";
  }
}

export async function createVehicleDefectAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const vehicleId = getRequiredString(formData, "vehicleId");
  const fallbackPath = `/vehicles/${vehicleId}/defects?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const preStartChecklistId = getOptionalString(
      formData,
      "preStartChecklistId",
    );
    const [organisation, vehicle, preStartChecklist] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { id: organisationId },
      }),
      prisma.vehicle.findUnique({
        select: { id: true, organisationId: true },
        where: { id: vehicleId },
      }),
      preStartChecklistId
        ? prisma.vehiclePreStartChecklist.findUnique({
            select: { id: true, organisationId: true, vehicleId: true },
            where: { id: preStartChecklistId },
          })
        : null,
    ]);

    if (!organisation || !vehicle) {
      throw new Error("Organisation or vehicle was not found.");
    }

    if (preStartChecklistId && !preStartChecklist) {
      throw new DefectValidationError("Pre-start checklist was not found.");
    }

    if (preStartChecklist && preStartChecklist.vehicleId !== vehicle.id) {
      throw new DefectValidationError(
        "Pre-start checklist does not belong to this vehicle.",
      );
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [
        { label: "Vehicle", record: vehicle },
        {
          label: "Pre-start checklist",
          record: preStartChecklist,
          required: false,
        },
      ],
      session,
    });
    const defectData = getDefectData(formData);

    const defect = await prisma.vehicleDefect.create({
      data: {
        ...defectData,
        isDemo: false,
        organisationId: context.organisationId,
        preStartChecklistId: preStartChecklist?.id ?? null,
        reportedByUserId: context.actorUserId,
        vehicleId: vehicle.id,
      },
    });

    await recordAuditLog(prisma, {
      action: "CREATED",
      actorUserId: context.actorUserId,
      entityId: defect.id,
      entityType: "VehicleDefect",
      metadata: {
        category: defect.category,
        descriptionLength: defect.description.length,
        event: "vehicle_defect_reported",
        hasPreStartChecklistLink: Boolean(preStartChecklist),
        reportedAt: defect.reportedAt.toISOString(),
        severity: defect.severity,
        status: defect.status,
        vehicleId: vehicle.id,
      },
      organisationId: context.organisationId,
      summary: "Submitted persisted vehicle defect report.",
    });

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${vehicle.id}`);
    revalidatePath(`/vehicles/${vehicle.id}/defects`);
    revalidatePath(`/vehicles/${vehicle.id}/pre-start`);
    redirectTo = `/vehicles/${vehicle.id}/defects?org=${organisation.slug}&saved=defect`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error)
        ? "tenant"
        : isDefectValidationError(error)
          ? "validation"
          : "persistence"
    }`;
  }

  redirect(redirectTo);
}

function getDefectData(formData: FormData) {
  return {
    category: getAllowedValue(
      formData,
      "category",
      vehicleDefectCategoryOptions.map((option) => option.value),
    ) as VehicleDefectCategoryValue,
    description: getLimitedString(formData, "description", 300),
    reportedAt: getReportedAt(formData),
    severity: getAllowedValue(
      formData,
      "severity",
      vehicleDefectSeverityOptions.map((option) => option.value),
    ) as VehicleDefectSeverityValue,
    status: getAllowedValue(
      formData,
      "status",
      vehicleDefectStatusOptions.map((option) => option.value),
    ) as VehicleDefectStatusValue,
  };
}

function getAllowedValue(
  formData: FormData,
  key: string,
  allowedValues: string[],
) {
  const value = getRequiredString(formData, key);

  if (!allowedValues.includes(value)) {
    throw new DefectValidationError(`${key} is not supported.`);
  }

  return value;
}

function getReportedAt(formData: FormData) {
  const value = getRequiredString(formData, "reportedAt");
  const reportedAt = new Date(`${value}T00:00:00.000Z`);
  const tomorrow = new Date();

  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  if (Number.isNaN(reportedAt.getTime()) || reportedAt > tomorrow) {
    throw new DefectValidationError("reportedAt must be a valid date.");
  }

  return reportedAt;
}

function getLimitedString(formData: FormData, key: string, maxLength: number) {
  const value = getRequiredString(formData, key);

  if (value.length > maxLength) {
    throw new DefectValidationError(`${key} is too long.`);
  }

  return value;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new DefectValidationError(`${key} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isDefectValidationError(
  error: unknown,
): error is DefectValidationError {
  return error instanceof DefectValidationError;
}
