import type { Prisma, PrismaClient } from "@prisma/client";
import { requireOrganisationScopedRecord } from "../tenant-guards";
import { OrganisationCapabilityError } from "../organisation-capabilities";
import { normaliseTripTrackingInputs } from "./trip-assignment-input";
import { trackingFreshness } from "./domain";
import type { TripTrackingAssetOptionDTO, TripTrackingAssignmentDTO, TripTrackingInput } from "./types";

const assetSelect = {
  id: true, displayName: true, model: true, status: true,
  expectedTrackingIntervalMinutes: true, integration: { select: { provider: true } },
} satisfies Prisma.TrackingAssetSelect;
function assetDTO(asset: Prisma.TrackingAssetGetPayload<{ select: typeof assetSelect }>): TripTrackingAssetOptionDTO {
  return { assetId: asset.id, displayName: asset.displayName, model: asset.model, status: asset.status,
    expectedTrackingIntervalMinutes: asset.expectedTrackingIntervalMinutes, provider: asset.integration.provider };
}

async function scopedTrip(db: Prisma.TransactionClient, organisationId: string, tripId: string) {
  const trip = await db.trip.findFirst({ where: { id: tripId, organisationId }, select: {
    id: true, organisationId: true, startsAt: true, endsAt: true,
    vehicleAllocations: { where: { organisationId }, select: { vehicleId: true } },
  } });
  requireOrganisationScopedRecord(organisationId, trip, "Trip");
  return trip!;
}

// Call only inside an already tenant-authorised Trip transaction. Capability and
// every relationship are revalidated here before the authoritative set changes.
export async function replaceTripTrackingAssignments(db: Prisma.TransactionClient, organisationId: string,
  tripId: string, inputs: readonly TripTrackingInput[]) {
  if (!await db.organisationCapability.findUnique({ where: { organisationId_key: {
    organisationId, key: "integrations.spotTracker",
  } }, select: { id: true } })) throw new OrganisationCapabilityError("integrations.spotTracker");
  const trip = await scopedTrip(db, organisationId, tripId);
  const rows = normaliseTripTrackingInputs(inputs, trip.startsAt, trip.endsAt);
  const existing = await db.tripTrackingAssignment.findMany({ where: { organisationId, tripId },
    select: { trackingAssetId: true } });
  const existingAssets = new Set(existing.map((row) => row.trackingAssetId));
  for (const row of rows) {
    const asset = await db.trackingAsset.findFirst({ where: { organisationId, id: row.trackingAssetId },
      select: { organisationId: true, status: true } });
    requireOrganisationScopedRecord(organisationId, asset, "Tracker");
    if (asset!.status !== "ACTIVE" && !existingAssets.has(row.trackingAssetId)) {
      throw new Error("Only active trackers can be newly assigned.");
    }
    if (row.vehicleId) requireOrganisationScopedRecord(organisationId,
      await db.vehicle.findFirst({ where: { organisationId, id: row.vehicleId }, select: { organisationId: true } }), "Vehicle");
  }
  await db.tripTrackingAssignment.deleteMany({ where: { organisationId, tripId,
    trackingAssetId: { notIn: rows.map((row) => row.trackingAssetId) } } });
  for (const row of rows) {
    await db.tripTrackingAssignment.upsert({
      where: { tripId_trackingAssetId: { tripId, trackingAssetId: row.trackingAssetId } },
      create: { organisationId, tripId, ...row },
      update: { role: row.role, vehicleId: row.vehicleId, assignedFrom: row.assignedFrom,
        assignedUntil: row.assignedUntil, notes: row.notes },
    });
  }
}

export function createTripTrackingDataLayer({ prisma, authorize }: {
  prisma: PrismaClient; authorize: (organisationId: string) => Promise<void>;
}) {
  async function assignments(db: Prisma.TransactionClient, organisationId: string, tripId: string, now: Date): Promise<TripTrackingAssignmentDTO[]> {
    const trip = await scopedTrip(db, organisationId, tripId);
    const allocatedVehicles = new Set(trip.vehicleAllocations.map((row) => row.vehicleId));
    const rows = await db.tripTrackingAssignment.findMany({ where: { organisationId, tripId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: {
        role: true, assignedFrom: true, assignedUntil: true, notes: true, vehicleId: true,
        vehicle: { select: { id: true, name: true, registration: true } },
        asset: { select: { ...assetSelect, messages: {
          where: { organisationId }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 1,
          select: { occurredAt: true, messageKind: true },
        } } },
      } });
    return Promise.all(rows.map(async (row) => {
      const fix = await db.trackingMessage.findFirst({ where: { organisationId, trackingAssetId: row.asset.id,
        latitude: { gte: -90, lte: 90 }, longitude: { gte: -180, lte: 180 } },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }], select: { occurredAt: true } });
      return { ...assetDTO(row.asset), role: row.role, vehicleId: row.vehicleId, vehicle: row.vehicle,
        assignedFrom: row.assignedFrom?.toISOString() ?? null, assignedUntil: row.assignedUntil?.toISOString() ?? null,
        effectiveFrom: (row.assignedFrom ?? trip.startsAt).toISOString(),
        effectiveUntil: (row.assignedUntil ?? trip.endsAt).toISOString(), notes: row.notes,
        vehicleNotAllocated: Boolean(row.vehicleId && !allocatedVehicles.has(row.vehicleId)),
        windowOutsideTrip: (row.assignedFrom ?? trip.startsAt) > trip.endsAt || (row.assignedUntil ?? trip.endsAt) < trip.startsAt,
        latestPositionAt: fix?.occurredAt.toISOString() ?? null,
        latestMessageAt: row.asset.messages[0]?.occurredAt.toISOString() ?? null,
        latestMessageKind: row.asset.messages[0]?.messageKind ?? null,
        freshness: trackingFreshness(fix?.occurredAt ?? null, row.asset.expectedTrackingIntervalMinutes, now) };
    }));
  }
  return {
    async getTripTrackingAssignments(organisationId: string, tripId: string, now = new Date()) {
      await authorize(organisationId);
      return prisma.$transaction((db) => assignments(db, organisationId, tripId, now), { isolationLevel: "RepeatableRead" });
    },
    async getTripTrackingForm(organisationId: string, tripId?: string, now = new Date()) {
      await authorize(organisationId);
      return prisma.$transaction(async (db) => {
        // Validate a supplied Trip before returning even the option lists.
        const current = tripId ? await assignments(db, organisationId, tripId, now) : [];
        const assets = await db.trackingAsset.findMany({ where: { organisationId, status: "ACTIVE" },
          orderBy: [{ displayName: "asc" }, { id: "asc" }], select: assetSelect });
        const vehicles = await db.vehicle.findMany({ where: { organisationId },
          orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, registration: true } });
        const options = assets.map(assetDTO);
        for (const row of current) if (!options.some((option) => option.assetId === row.assetId)) {
          options.push({ assetId: row.assetId, displayName: row.displayName, provider: row.provider, model: row.model,
            status: row.status, expectedTrackingIntervalMinutes: row.expectedTrackingIntervalMinutes });
        }
        return { assets: options, vehicles, assignments: current };
      }, { isolationLevel: "RepeatableRead" });
    },
  };
}
