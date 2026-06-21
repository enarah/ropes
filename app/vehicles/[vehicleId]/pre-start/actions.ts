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

class PreStartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreStartValidationError";
  }
}

export async function createVehiclePreStartAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const vehicleId = getRequiredString(formData, "vehicleId");
  const fallbackPath = `/vehicles/${vehicleId}/pre-start?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const [organisation, vehicle] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { id: organisationId },
      }),
      prisma.vehicle.findUnique({
        select: { id: true, organisationId: true },
        where: { id: vehicleId },
      }),
    ]);

    if (!organisation || !vehicle) {
      throw new Error("Organisation or vehicle was not found.");
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [{ label: "Vehicle", record: vehicle }],
      session,
    });
    const checklist = getChecklistData(formData);
    const issueReported =
      !checklist.tyresOk ||
      !checklist.lightsOk ||
      !checklist.fluidsOk ||
      !checklist.communicationsOk ||
      !checklist.recoveryGearOk ||
      !checklist.generalConditionOk ||
      Boolean(checklist.issueNotes);

    const preStart = await prisma.vehiclePreStartChecklist.create({
      data: {
        ...checklist,
        isDemo: false,
        organisationId: context.organisationId,
        submittedByUserId: context.actorUserId,
        vehicleId: vehicle.id,
      },
    });

    await recordAuditLog(prisma, {
      action: "CREATED",
      actorUserId: context.actorUserId,
      entityId: preStart.id,
      entityType: "VehiclePreStartChecklist",
      metadata: {
        event: "vehicle_pre_start_submitted",
        issueReported,
        odometerKm: preStart.odometerKm,
        vehicleId: vehicle.id,
      },
      organisationId: context.organisationId,
      summary: "Submitted persisted vehicle pre-start checklist.",
    });

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${vehicle.id}`);
    revalidatePath(`/vehicles/${vehicle.id}/pre-start`);
    redirectTo = `/vehicles/${vehicle.id}/pre-start?org=${organisation.slug}&saved=pre-start`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error)
        ? "tenant"
        : isPreStartValidationError(error)
          ? "validation"
          : "persistence"
    }`;
  }

  redirect(redirectTo);
}

function getChecklistData(formData: FormData) {
  return {
    communicationsOk: getRequiredCheck(formData, "communicationsOk"),
    fluidsOk: getRequiredCheck(formData, "fluidsOk"),
    generalConditionOk: getRequiredCheck(formData, "generalConditionOk"),
    issueNotes: getOptionalLimitedString(formData, "issueNotes", 500),
    lightsOk: getRequiredCheck(formData, "lightsOk"),
    odometerKm: getRequiredInteger(formData, "odometerKm", {
      max: 2_000_000,
      min: 0,
    }),
    recoveryGearOk: getRequiredCheck(formData, "recoveryGearOk"),
    tyresOk: getRequiredCheck(formData, "tyresOk"),
  };
}

function getRequiredCheck(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);

  if (value === "pass") {
    return true;
  }

  if (value === "fail") {
    return false;
  }

  throw new PreStartValidationError(`${key} must be pass or fail.`);
}

function getRequiredInteger(
  formData: FormData,
  key: string,
  bounds: { max: number; min: number },
) {
  const value = Number(getRequiredString(formData, key));

  if (
    !Number.isInteger(value) ||
    value < bounds.min ||
    value > bounds.max
  ) {
    throw new PreStartValidationError(`${key} must be a sensible number.`);
  }

  return value;
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
    throw new PreStartValidationError(`${key} is too long.`);
  }

  return value;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new PreStartValidationError(`${key} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isPreStartValidationError(
  error: unknown,
): error is PreStartValidationError {
  return error instanceof PreStartValidationError;
}
