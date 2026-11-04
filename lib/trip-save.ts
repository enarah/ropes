import type { PrismaClient } from "@prisma/client";
import { createOrganisationWriteContext, type TenantGuardSession } from "./tenant-guards";
import { replaceTripTrackingAssignments } from "./tracking/trip-data";
import type { TripTrackingInput } from "./tracking/types";

export type StructuredTripRows = {
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

// All Trip content and tracking changes commit or roll back together. A missing
// assignment submission preserves the set for capability-disabled/older forms.
export async function persistTrip({ prisma, organisationId, session, tripId, tripData, structuredRows, trackingInputs }: {
  prisma: PrismaClient;
  organisationId: string;
  session: TenantGuardSession;
  tripId?: string;
  tripData: { title: string; destination: string; purpose: string; startsAt: Date; endsAt: Date };
  structuredRows: StructuredTripRows;
  trackingInputs?: TripTrackingInput[];
}) {
  return prisma.$transaction(async (tx) => {
    const existingTrip = tripId ? await tx.trip.findFirst({ where: { id: tripId, organisationId },
      select: { id: true, organisationId: true } }) : null;
    const context = createOrganisationWriteContext({ organisationId, session,
      relatedRecords: tripId ? [{ label: "Trip", record: existingTrip }] : [] });
    if (!Number.isFinite(tripData.startsAt.getTime()) || !Number.isFinite(tripData.endsAt.getTime()) ||
      tripData.startsAt >= tripData.endsAt) throw new Error("Invalid trip dates.");
    const persistedTrip = tripId
      ? await tx.trip.update({
          data: tripData,
          where: { organisationId_id: { organisationId: context.organisationId, id: tripId } },
        })
      : await tx.trip.create({
          data: {
            ...tripData,
            isDemo: true,
            leadUserId: context.actorUserId,
            organisationId: context.organisationId,
            approvalStatus: "DRAFT",
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

    if (trackingInputs !== undefined) {
      await replaceTripTrackingAssignments(tx, context.organisationId, persistedTrip.id, trackingInputs);
    }
    return persistedTrip;
  }, { isolationLevel: "Serializable" });
}
