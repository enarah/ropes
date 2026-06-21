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

export async function saveTripAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const fallbackPath = getTripFallbackPath(formData, organisationSlug);

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
      throw new Error("Organisation was not found.");
    }

    const tripId = getOptionalString(formData, "tripId");
    const existingTrip = tripId
      ? await prisma.trip.findUnique({
          select: { id: true, organisationId: true },
          where: { id: tripId },
        })
      : null;

    if (tripId && !existingTrip) {
      throw new Error("Trip was not found.");
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: tripId
        ? [{ label: "Trip", record: existingTrip }]
        : [],
      session,
    });
    const startsAt = getRequiredDate(formData, "startsAt");
    const endsAt = getRequiredDate(formData, "endsAt");

    if (startsAt >= endsAt) {
      throw new Error("Trip start must be before trip end.");
    }

    const tripData = {
      destination: getRequiredString(formData, "destination"),
      endsAt,
      purpose: getRequiredString(formData, "purpose"),
      startsAt,
      title: getRequiredString(formData, "title"),
    };

    const savedTrip = tripId
      ? await prisma.trip.update({
          data: tripData,
          where: { id: tripId },
        })
      : await prisma.trip.create({
          data: {
            ...tripData,
            isDemo: true,
            leadUserId: context.actorUserId,
            organisationId: context.organisationId,
            status: "DRAFT",
          },
        });
    const isUpdate = Boolean(tripId);

    await recordAuditLog(prisma, {
      action: isUpdate ? "UPDATED" : "CREATED",
      actorUserId: context.actorUserId,
      entityId: savedTrip.id,
      entityType: "Trip",
      metadata: {
        event: isUpdate ? "trip_updated" : "trip_created",
        endsAt: endsAt.toISOString(),
        startsAt: startsAt.toISOString(),
      },
      organisationId: context.organisationId,
      summary: isUpdate
        ? "Updated persisted trip core details."
        : "Created persisted trip draft.",
    });

    revalidatePath("/trips");
    revalidatePath(`/trips/${savedTrip.id}`);
    redirectTo = `/trips/${savedTrip.id}?org=${organisation.slug}&saved=trip`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error) ? "tenant" : "persistence"
    }`;
  }

  redirect(redirectTo);
}

function getTripFallbackPath(formData: FormData, organisationSlug: string) {
  const tripId = getOptionalString(formData, "tripId");

  if (tripId) {
    return `/trips/${tripId}/edit?org=${organisationSlug}`;
  }

  return `/trips/new?org=${organisationSlug}`;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getRequiredDate(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date.`);
  }

  return date;
}
