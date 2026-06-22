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
  vehicleMaintenanceStatusOptions,
  vehicleMaintenanceTypeOptions,
  type VehicleMaintenanceStatusValue,
  type VehicleMaintenanceTypeValue,
} from "@/lib/vehicles-data";

class MaintenanceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaintenanceValidationError";
  }
}

export async function createVehicleMaintenanceRecordAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const vehicleId = getRequiredString(formData, "vehicleId");
  const fallbackPath = `/vehicles/${vehicleId}/maintenance?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const defectId = getOptionalString(formData, "defectId");
    const [organisation, vehicle, defect] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { id: organisationId },
      }),
      prisma.vehicle.findUnique({
        select: { id: true, organisationId: true },
        where: { id: vehicleId },
      }),
      defectId
        ? prisma.vehicleDefect.findUnique({
            select: { id: true, organisationId: true, vehicleId: true },
            where: { id: defectId },
          })
        : null,
    ]);

    if (!organisation || !vehicle) {
      throw new Error("Organisation or vehicle was not found.");
    }

    if (defectId && !defect) {
      throw new MaintenanceValidationError("Linked defect was not found.");
    }

    if (defect && defect.vehicleId !== vehicle.id) {
      throw new MaintenanceValidationError(
        "Linked defect does not belong to this vehicle.",
      );
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [
        { label: "Vehicle", record: vehicle },
        { label: "Defect", record: defect, required: false },
      ],
      session,
    });
    const maintenanceData = getMaintenanceData(formData);

    const maintenanceRecord = await prisma.vehicleMaintenanceRecord.create({
      data: {
        ...maintenanceData,
        defectId: defect?.id ?? null,
        isDemo: false,
        organisationId: context.organisationId,
        recordedByUserId: context.actorUserId,
        vehicleId: vehicle.id,
      },
    });

    await recordAuditLog(prisma, {
      action: "CREATED",
      actorUserId: context.actorUserId,
      entityId: maintenanceRecord.id,
      entityType: "VehicleMaintenanceRecord",
      metadata: {
        costPresent: maintenanceRecord.costCents !== null,
        event: "vehicle_maintenance_record_created",
        hasLinkedDefect: Boolean(defect),
        maintenanceDate: maintenanceRecord.maintenanceDate.toISOString(),
        nextDueDatePresent: maintenanceRecord.nextDueDate !== null,
        notesLength: maintenanceRecord.notes?.length ?? 0,
        odometerPresent: maintenanceRecord.odometerKm !== null,
        providerPresent: maintenanceRecord.provider !== null,
        status: maintenanceRecord.status,
        type: maintenanceRecord.type,
        vehicleId: vehicle.id,
      },
      organisationId: context.organisationId,
      summary: "Created persisted vehicle maintenance record.",
    });

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${vehicle.id}`);
    revalidatePath(`/vehicles/${vehicle.id}/maintenance`);
    revalidatePath(`/vehicles/${vehicle.id}/defects`);
    redirectTo = `/vehicles/${vehicle.id}/maintenance?org=${organisation.slug}&saved=maintenance`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error)
        ? "tenant"
        : isMaintenanceValidationError(error)
          ? "validation"
          : "persistence"
    }`;
  }

  redirect(redirectTo);
}

function getMaintenanceData(formData: FormData) {
  return {
    costCents: getOptionalCostCents(formData, "cost"),
    maintenanceDate: getRequiredDate(formData, "maintenanceDate"),
    nextDueDate: getOptionalDate(formData, "nextDueDate"),
    notes: getOptionalLimitedString(formData, "notes", 300),
    odometerKm: getOptionalInteger(formData, "odometerKm", {
      max: 2_000_000,
      min: 0,
    }),
    provider: getOptionalLimitedString(formData, "provider", 120),
    status: getAllowedValue(
      formData,
      "status",
      vehicleMaintenanceStatusOptions.map((option) => option.value),
    ) as VehicleMaintenanceStatusValue,
    type: getAllowedValue(
      formData,
      "type",
      vehicleMaintenanceTypeOptions.map((option) => option.value),
    ) as VehicleMaintenanceTypeValue,
  };
}

function getAllowedValue(
  formData: FormData,
  key: string,
  allowedValues: string[],
) {
  const value = getRequiredString(formData, key);

  if (!allowedValues.includes(value)) {
    throw new MaintenanceValidationError(`${key} is not supported.`);
  }

  return value;
}

function getRequiredDate(formData: FormData, key: string) {
  return parseDate(getRequiredString(formData, key), key);
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? parseDate(value, key) : null;
}

function parseDate(value: string, key: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const futureLimit = new Date();

  futureLimit.setUTCFullYear(futureLimit.getUTCFullYear() + 5);
  futureLimit.setUTCHours(0, 0, 0, 0);

  if (Number.isNaN(date.getTime()) || date > futureLimit) {
    throw new MaintenanceValidationError(`${key} must be a valid date.`);
  }

  return date;
}

function getOptionalInteger(
  formData: FormData,
  key: string,
  bounds: { max: number; min: number },
) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  if (
    !Number.isInteger(numberValue) ||
    numberValue < bounds.min ||
    numberValue > bounds.max
  ) {
    throw new MaintenanceValidationError(`${key} must be a sensible number.`);
  }

  return numberValue;
}

function getOptionalCostCents(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const dollars = Number(value);

  if (!Number.isFinite(dollars) || dollars < 0 || dollars > 1_000_000) {
    throw new MaintenanceValidationError(`${key} must be a sensible amount.`);
  }

  return Math.round(dollars * 100);
}

function getOptionalLimitedString(
  formData: FormData,
  key: string,
  maxLength: number,
) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    throw new MaintenanceValidationError(`${key} is too long.`);
  }

  return value;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new MaintenanceValidationError(`${key} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isMaintenanceValidationError(
  error: unknown,
): error is MaintenanceValidationError {
  return error instanceof MaintenanceValidationError;
}
