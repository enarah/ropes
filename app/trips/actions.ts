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
    const structuredRows = await getStructuredTripRows({
      formData,
      organisationId: context.organisationId,
      prisma,
      tripEndsAt: endsAt,
      tripStartsAt: startsAt,
    });

    const savedTrip = await prisma.$transaction(async (tx) => {
      const persistedTrip = tripId
        ? await tx.trip.update({
            data: tripData,
            where: { id: tripId },
          })
        : await tx.trip.create({
            data: {
              ...tripData,
              isDemo: true,
              leadUserId: context.actorUserId,
              organisationId: context.organisationId,
              status: "DRAFT",
            },
          });

      await Promise.all([
        tx.tripParticipant.deleteMany({
          where: {
            organisationId: context.organisationId,
            tripId: persistedTrip.id,
          },
        }),
        tx.tripVehicleAllocation.deleteMany({
          where: {
            organisationId: context.organisationId,
            tripId: persistedTrip.id,
          },
        }),
        tx.tripItineraryItem.deleteMany({
          where: {
            organisationId: context.organisationId,
            tripId: persistedTrip.id,
          },
        }),
      ]);

      if (structuredRows.participants.length) {
        await tx.tripParticipant.createMany({
          data: structuredRows.participants.map((participant) => ({
            ...participant,
            isDemo: false,
            organisationId: context.organisationId,
            tripId: persistedTrip.id,
          })),
        });
      }

      if (structuredRows.vehicleAllocations.length) {
        await tx.tripVehicleAllocation.createMany({
          data: structuredRows.vehicleAllocations.map((vehicle) => ({
            ...vehicle,
            isDemo: false,
            organisationId: context.organisationId,
            tripId: persistedTrip.id,
          })),
        });
      }

      if (structuredRows.itineraryItems.length) {
        await tx.tripItineraryItem.createMany({
          data: structuredRows.itineraryItems.map((item) => ({
            ...item,
            isDemo: false,
            organisationId: context.organisationId,
            tripId: persistedTrip.id,
          })),
        });
      }

      return persistedTrip;
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
        itineraryItemCount: structuredRows.itineraryItems.length,
        participantCount: structuredRows.participants.length,
        startsAt: startsAt.toISOString(),
        vehicleAllocationCount: structuredRows.vehicleAllocations.length,
      },
      organisationId: context.organisationId,
      summary: isUpdate
        ? "Updated persisted trip core and structured details."
        : "Created persisted trip draft with structured details.",
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

type StructuredTripRows = {
  participants: Array<{
    name: string;
    role: string;
    rowOrder: number;
    status: string;
    userId: null;
  }>;
  vehicleAllocations: Array<{
    name: string;
    registration: string;
    rowOrder: number;
    status: string;
    vehicleId: string | null;
  }>;
  itineraryItems: Array<{
    day: string;
    description: string;
    endsAt: Date | null;
    location: string | null;
    rowOrder: number;
    startsAt: Date | null;
    title: string;
  }>;
};

async function getStructuredTripRows({
  formData,
  organisationId,
  prisma,
  tripEndsAt,
  tripStartsAt,
}: {
  formData: FormData;
  organisationId: string;
  prisma: ReturnType<typeof getPrismaClient>;
  tripEndsAt: Date;
  tripStartsAt: Date;
}): Promise<StructuredTripRows> {
  const participants = getIndexedRows(formData, "participants")
    .map((row) => ({
      name: getRowValue(row, "name").slice(0, 160),
      role: getRowValue(row, "role").slice(0, 120),
      status: normaliseParticipantStatus(getRowValue(row, "status")),
    }))
    .filter((row) => row.name || row.role)
    .map((row, rowOrder) => ({
      ...row,
      rowOrder,
      userId: null,
    }));
  const submittedVehicleRows = getIndexedRows(formData, "vehicles")
    .map((row) => ({
      name: getRowValue(row, "name").slice(0, 160),
      registration: getRowValue(row, "registration").slice(0, 40),
      status: normaliseVehicleStatus(getRowValue(row, "status")),
    }))
    .filter((row) => row.name || row.registration);
  const vehicleRegistrations = submittedVehicleRows
    .map((row) => row.registration)
    .filter(Boolean);
  const matchedVehicles = vehicleRegistrations.length
    ? await prisma.vehicle.findMany({
        select: {
          id: true,
          name: true,
          organisationId: true,
          registration: true,
        },
        where: {
          organisationId,
          registration: {
            in: vehicleRegistrations,
          },
        },
      })
    : [];
  const vehiclesByRegistration = new Map(
    matchedVehicles.map((vehicle) => [vehicle.registration, vehicle]),
  );
  const vehicleAllocations = submittedVehicleRows.map((row, rowOrder) => {
    const matchedVehicle = vehiclesByRegistration.get(row.registration);

    return {
      name: matchedVehicle?.name ?? row.name,
      registration: matchedVehicle?.registration ?? row.registration,
      rowOrder,
      status: row.status,
      vehicleId: matchedVehicle?.id ?? null,
    };
  });
  const itineraryItems = getIndexedRows(formData, "itinerary")
    .map((row) => {
      const startsAt = getOptionalDateValue(getRowValue(row, "startsAt"));
      const endsAt = getOptionalDateValue(getRowValue(row, "endsAt"));

      if (startsAt && endsAt && startsAt >= endsAt) {
        throw new Error("Itinerary item start must be before end.");
      }

      if (startsAt && (startsAt < tripStartsAt || startsAt > tripEndsAt)) {
        throw new Error("Itinerary item start must be within the trip dates.");
      }

      if (endsAt && (endsAt < tripStartsAt || endsAt > tripEndsAt)) {
        throw new Error("Itinerary item end must be within the trip dates.");
      }

      return {
        day: getRowValue(row, "day").slice(0, 80),
        description: getRowValue(row, "description").slice(0, 1000),
        endsAt,
        location: getRowValue(row, "location").slice(0, 180) || null,
        startsAt,
        title: getRowValue(row, "title").slice(0, 180),
      };
    })
    .filter((row) => row.day || row.title || row.description || row.location)
    .map((row, rowOrder) => ({
      ...row,
      day: row.day || `Day ${rowOrder + 1}`,
      rowOrder,
    }));

  return {
    itineraryItems,
    participants,
    vehicleAllocations,
  };
}

function getIndexedRows(formData: FormData, groupName: string) {
  const rows = new Map<number, Record<string, string>>();
  const pattern = new RegExp(`^${groupName}\\[(\\d+)\\]\\[([^\\]]+)\\]$`);

  for (const [key, value] of formData.entries()) {
    const match = key.match(pattern);

    if (!match || typeof value !== "string") {
      continue;
    }

    const index = Number.parseInt(match[1], 10);
    const fieldName = match[2];
    const row = rows.get(index) ?? {};
    row[fieldName] = value.trim();
    rows.set(index, row);
  }

  return Array.from(rows.entries())
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, row]) => row);
}

function getRowValue(row: Record<string, string>, key: string) {
  return row[key]?.trim() ?? "";
}

function normaliseParticipantStatus(status: string) {
  return status === "Confirmed" ? "Confirmed" : "Pending";
}

function normaliseVehicleStatus(status: string) {
  return status === "Allocated" ? "Allocated" : "Requested";
}

function getOptionalDateValue(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Structured trip date must be valid.");
  }

  return date;
}
