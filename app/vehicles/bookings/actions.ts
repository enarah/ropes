"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getFakeTenantGuardSession } from "@/lib/demo-session";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import {
  createOrganisationWriteContext,
  isTenantGuardError,
} from "@/lib/tenant-guards";

export async function createVehicleBookingAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const fallbackPath = `/vehicles/bookings/new?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

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
      throw new Error("Booking start must be before booking end.");
    }

    const session = await getFakeTenantGuardSession(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [{ label: "Vehicle", record: vehicle }],
      session,
    });
    const tripTitle = getRequiredString(formData, "tripTitle");
    const purpose = getRequiredString(formData, "purpose");

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

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${booking.vehicleId}`);
    redirectTo = `/vehicles/${booking.vehicleId}?org=${organisation.slug}&saved=booking`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error) ? "tenant" : "persistence"
    }`;
  }

  redirect(redirectTo);
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function getRequiredDate(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date.`);
  }

  return date;
}
