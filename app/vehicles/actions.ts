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

type VehicleStatusValue = "AVAILABLE" | "BOOKED" | "MAINTENANCE" | "RETIRED";

class VehicleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehicleValidationError";
  }
}

export async function saveVehicleAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const vehicleId = getOptionalString(formData, "vehicleId");
  const fallbackPath = vehicleId
    ? `/vehicles/${vehicleId}/edit?org=${organisationSlug}`
    : `/vehicles/new?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const vehicleData = getVehicleFormData(formData);
    const [organisation, existingVehicle] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { id: organisationId },
      }),
      vehicleId
        ? prisma.vehicle.findUnique({
            select: { id: true, organisationId: true },
            where: { id: vehicleId },
          })
        : null,
    ]);

    if (!organisation || (vehicleId && !existingVehicle)) {
      throw new Error("Organisation or vehicle was not found.");
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: vehicleId
        ? [{ label: "Vehicle", record: existingVehicle }]
        : [],
      session,
    });
    const duplicateVehicle = await prisma.vehicle.findFirst({
      select: { id: true },
      where: {
        organisationId: context.organisationId,
        registration: {
          equals: vehicleData.registration,
          mode: "insensitive",
        },
        ...(vehicleId ? { NOT: { id: vehicleId } } : {}),
      },
    });

    if (duplicateVehicle) {
      redirectTo = `${fallbackPath}&error=duplicate`;
    } else {
      const savedVehicle = vehicleId
        ? await prisma.vehicle.update({
            data: vehicleData,
            where: { id: vehicleId },
          })
        : await prisma.vehicle.create({
            data: {
              ...vehicleData,
              isDemo: false,
              organisationId: context.organisationId,
            },
          });
      const isUpdate = Boolean(vehicleId);

      await recordAuditLog(prisma, {
        action: isUpdate ? "UPDATED" : "CREATED",
        actorUserId: context.actorUserId,
        entityId: savedVehicle.id,
        entityType: "Vehicle",
        metadata: {
          event: isUpdate ? "vehicle_updated" : "vehicle_created",
          odometerPresent: savedVehicle.odometerKm !== null,
          registration: savedVehicle.registration,
          status: savedVehicle.status,
          vehicleId: savedVehicle.id,
          yearPresent: savedVehicle.year !== null,
        },
        organisationId: context.organisationId,
        summary: isUpdate
          ? "Updated persisted vehicle record."
          : "Created persisted vehicle record.",
      });

      revalidatePath("/vehicles");
      revalidatePath(`/vehicles/${savedVehicle.id}`);
      redirectTo = `/vehicles/${savedVehicle.id}?org=${organisation.slug}&saved=vehicle`;
    }
  } catch (error) {
    const errorCode = isTenantGuardError(error)
      ? "tenant"
      : isVehicleValidationError(error)
        ? "validation"
        : "persistence";
    redirectTo = `${fallbackPath}&error=${errorCode}`;
  }

  redirect(redirectTo);
}

function getVehicleFormData(formData: FormData) {
  return {
    make: getRequiredString(formData, "make").slice(0, 120),
    model: getRequiredString(formData, "model").slice(0, 120),
    name: getRequiredString(formData, "name").slice(0, 160),
    odometerKm: getOptionalInteger(formData, "odometerKm", {
      max: 2_000_000,
      min: 0,
    }),
    registration: normaliseRegistration(
      getRequiredString(formData, "registration"),
    ).slice(0, 40),
    status: getVehicleStatus(formData),
    year: getOptionalInteger(formData, "year", {
      max: new Date().getFullYear() + 1,
      min: 1950,
    }),
  };
}

function getVehicleStatus(formData: FormData): VehicleStatusValue {
  const status = getRequiredString(formData, "status");

  if (
    status === "AVAILABLE" ||
    status === "BOOKED" ||
    status === "MAINTENANCE" ||
    status === "RETIRED"
  ) {
    return status;
  }

  throw new VehicleValidationError("Vehicle status is not supported.");
}

function normaliseRegistration(registration: string) {
  return registration.replace(/\s+/g, " ").trim().toUpperCase();
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
    throw new VehicleValidationError(`${key} must be a sensible number.`);
  }

  return numberValue;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new VehicleValidationError(`${key} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isVehicleValidationError(
  error: unknown,
): error is VehicleValidationError {
  return error instanceof VehicleValidationError;
}
