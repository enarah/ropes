"use server";

import type { PrismaClient } from "@prisma/client";
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
  isVehicleBookingOverlapError,
  requireNoVehicleBookingOverlap,
} from "@/lib/vehicle-booking-overlaps";

type BookingStatusValue =
  | "REQUESTED"
  | "APPROVED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

class VehicleBookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehicleBookingValidationError";
  }
}

export async function createVehicleBookingAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const requestedVehicleId = getOptionalString(formData, "vehicleId");
  const fallbackPath = `/vehicles/bookings/new?org=${organisationSlug}${
    requestedVehicleId ? `&vehicle=${encodeURIComponent(requestedVehicleId)}` : ""
  }`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;
  let overlapAuditContext: OverlapAuditContext | null = null;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const vehicleId = getRequiredString(formData, "vehicleId");
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

    const startsAt = getRequiredDate(formData, "startsAt");
    const endsAt = getRequiredDate(formData, "endsAt");

    if (startsAt >= endsAt) {
      throw new VehicleBookingValidationError(
        "Booking start must be before booking end.",
      );
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [{ label: "Vehicle", record: vehicle }],
      session,
    });
    const tripTitle = getRequiredString(formData, "tripTitle");
    const purpose = getRequiredString(formData, "purpose");
    overlapAuditContext = {
      actorUserId: context.actorUserId,
      endsAt,
      organisationId: context.organisationId,
      prisma,
      startsAt,
      vehicleId: vehicle.id,
    };

    await requireNoVehicleBookingOverlap(prisma, {
      endsAt,
      organisationId: context.organisationId,
      startsAt,
      vehicleId: vehicle.id,
    });

    const booking = await prisma.vehicleBooking.create({
      data: {
        bookedByUserId: context.actorUserId,
        endsAt,
        isDemo: true,
        notes: `${tripTitle}: ${purpose}`,
        organisationId: context.organisationId,
        startsAt,
        status: "REQUESTED",
        vehicleId: vehicle.id,
      },
    });
    await recordAuditLog(prisma, {
      action: "CREATED",
      actorUserId: context.actorUserId,
      entityId: booking.id,
      entityType: "VehicleBooking",
      metadata: {
        endsAt: endsAt.toISOString(),
        event: "vehicle_booking_created",
        startsAt: startsAt.toISOString(),
        vehicleId: vehicle.id,
      },
      organisationId: context.organisationId,
      summary: "Created persisted vehicle booking request.",
    });

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${booking.vehicleId}`);
    redirectTo = `/vehicles/${booking.vehicleId}?org=${organisation.slug}&saved=booking`;
  } catch (error) {
    if (isVehicleBookingOverlapError(error)) {
      if (overlapAuditContext) {
        await recordAuditLog(overlapAuditContext.prisma, {
          action: "REJECTED",
          actorUserId: overlapAuditContext.actorUserId,
          entityId: null,
          entityType: "VehicleBooking",
          metadata: {
            event: "vehicle_booking_overlap_rejected",
            overlappingBookingId: error.overlappingBooking.id,
            overlappingEndsAt: error.overlappingBooking.endsAt.toISOString(),
            overlappingStartsAt:
              error.overlappingBooking.startsAt.toISOString(),
            requestedEndsAt: overlapAuditContext.endsAt.toISOString(),
            requestedStartsAt: overlapAuditContext.startsAt.toISOString(),
            vehicleId: overlapAuditContext.vehicleId,
          },
          organisationId: overlapAuditContext.organisationId,
          summary:
            "Rejected persisted vehicle booking because it overlapped an existing booking.",
        });
      }
      redirectTo = `${fallbackPath}&error=overlap`;
      redirect(redirectTo);
    }

    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error)
        ? "tenant"
        : isVehicleBookingValidationError(error)
          ? "validation"
          : "persistence"
    }`;
  }

  redirect(redirectTo);
}

export async function updateVehicleBookingAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const bookingId = getRequiredString(formData, "bookingId");
  const fallbackPath = `/vehicles/bookings/${bookingId}/edit?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const vehicleId = getRequiredString(formData, "vehicleId");
    const [organisation, booking, vehicle] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { id: organisationId },
      }),
      prisma.vehicleBooking.findUnique({
        select: { id: true, organisationId: true, vehicleId: true },
        where: { id: bookingId },
      }),
      prisma.vehicle.findUnique({
        select: { id: true, organisationId: true },
        where: { id: vehicleId },
      }),
    ]);

    if (!organisation || !booking || !vehicle) {
      throw new Error("Organisation, booking or vehicle was not found.");
    }

    const startsAt = getRequiredDate(formData, "startsAt");
    const endsAt = getRequiredDate(formData, "endsAt");

    if (startsAt >= endsAt) {
      throw new VehicleBookingValidationError(
        "Booking start must be before booking end.",
      );
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [
        { label: "VehicleBooking", record: booking },
        { label: "Vehicle", record: vehicle },
      ],
      session,
    });
    const tripTitle = getRequiredLimitedString(formData, "tripTitle", 160);
    const requestedBy = getRequiredLimitedString(formData, "requestedBy", 160);
    const purpose = getRequiredLimitedString(formData, "purpose", 1000);
    const status = getBookingStatus(formData);

    if (status !== "CANCELLED") {
      await requireNoVehicleBookingOverlap(prisma, {
        endsAt,
        ignoreBookingId: booking.id,
        organisationId: context.organisationId,
        startsAt,
        vehicleId: vehicle.id,
      });
    }

    const updatedBooking = await prisma.vehicleBooking.update({
      data: {
        endsAt,
        notes: `${tripTitle}: ${purpose}`,
        startsAt,
        status,
        vehicleId: vehicle.id,
      },
      where: { id: booking.id },
    });
    await recordAuditLog(prisma, {
      action: "UPDATED",
      actorUserId: context.actorUserId,
      entityId: updatedBooking.id,
      entityType: "VehicleBooking",
      metadata: {
        endsAt: endsAt.toISOString(),
        event: "vehicle_booking_updated",
        requestedByPresent: Boolean(requestedBy),
        startsAt: startsAt.toISOString(),
        status,
        vehicleId: vehicle.id,
      },
      organisationId: context.organisationId,
      summary: "Updated persisted vehicle booking.",
    });

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${booking.vehicleId}`);
    revalidatePath(`/vehicles/${vehicle.id}`);
    revalidatePath(`/vehicles/bookings/${booking.id}`);
    redirectTo = `/vehicles/bookings/${booking.id}?org=${organisation.slug}&saved=booking`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isVehicleBookingOverlapError(error)
        ? "overlap"
        : isTenantGuardError(error)
          ? "tenant"
          : isVehicleBookingValidationError(error)
            ? "validation"
          : "persistence"
    }`;
  }

  redirect(redirectTo);
}

type OverlapAuditContext = {
  actorUserId: string;
  endsAt: Date;
  organisationId: string;
  prisma: PrismaClient;
  startsAt: Date;
  vehicleId: string;
};

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new VehicleBookingValidationError(`${key} is required.`);
  }

  return value;
}

function getRequiredLimitedString(
  formData: FormData,
  key: string,
  maxLength: number,
) {
  const value = getRequiredString(formData, key);

  if (value.length > maxLength) {
    throw new VehicleBookingValidationError(`${key} is too long.`);
  }

  return value;
}

function getBookingStatus(formData: FormData): BookingStatusValue {
  const status = getRequiredString(formData, "status");

  if (
    status === "REQUESTED" ||
    status === "APPROVED" ||
    status === "ACTIVE" ||
    status === "COMPLETED" ||
    status === "CANCELLED"
  ) {
    return status;
  }

  throw new VehicleBookingValidationError("Booking status is not supported.");
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getRequiredDate(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new VehicleBookingValidationError(`${key} must be a valid date.`);
  }

  return date;
}

function isVehicleBookingValidationError(
  error: unknown,
): error is VehicleBookingValidationError {
  return error instanceof VehicleBookingValidationError;
}
