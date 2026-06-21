import type { PrismaClient } from "@prisma/client";

export type VehicleBookingOverlapInput = {
  endsAt: Date;
  ignoreBookingId?: string;
  organisationId: string;
  startsAt: Date;
  vehicleId: string;
};

export class VehicleBookingOverlapError extends Error {
  constructor(
    public readonly overlappingBooking: {
      endsAt: Date;
      id: string;
      startsAt: Date;
    },
  ) {
    super("This vehicle already has a booking that overlaps those times.");
    this.name = "VehicleBookingOverlapError";
  }
}

export function isVehicleBookingOverlapError(
  error: unknown,
): error is VehicleBookingOverlapError {
  return error instanceof VehicleBookingOverlapError;
}

export async function requireNoVehicleBookingOverlap(
  prisma: PrismaClient,
  input: VehicleBookingOverlapInput,
) {
  if (
    !input.organisationId ||
    !input.vehicleId ||
    input.startsAt >= input.endsAt
  ) {
    throw new Error("Valid organisation, vehicle and booking dates are required.");
  }

  const overlappingBooking = await prisma.vehicleBooking.findFirst({
    orderBy: {
      startsAt: "asc",
    },
    select: {
      endsAt: true,
      id: true,
      startsAt: true,
    },
    where: {
      endsAt: {
        gt: input.startsAt,
      },
      ...(input.ignoreBookingId ? { id: { not: input.ignoreBookingId } } : {}),
      organisationId: input.organisationId,
      startsAt: {
        lt: input.endsAt,
      },
      status: {
        not: "CANCELLED",
      },
      vehicleId: input.vehicleId,
    },
  });

  if (overlappingBooking) {
    throw new VehicleBookingOverlapError(overlappingBooking);
  }
}
