import type { Prisma, PrismaClient } from "@prisma/client";
import { requireOrganisationScopedRecord } from "../tenant-guards";
import { trackingFreshness, validCoordinates } from "./domain";
import type { NormalisedTrackingMessage, TrackingAssetOverviewDTO, TripTrackingRole } from "./types";

// Server-side data layer. The mandatory authorizer runs before every operation.
// Production binding is in server.ts; tests use an isolated database and explicit session.
export function createTrackingDataLayer({ prisma, authorize }: {
  prisma: PrismaClient;
  authorize: (organisationId: string) => Promise<void>;
}) {
  async function assetInOrganisation(db: Prisma.TransactionClient, organisationId: string, id: string) {
    const asset = await db.trackingAsset.findFirst({ where: { id, organisationId } });
    requireOrganisationScopedRecord(organisationId, asset, "Tracking asset");
    return asset!;
  }

  async function vehicleInOrganisation(db: Prisma.TransactionClient, organisationId: string, id?: string | null) {
    if (id) requireOrganisationScopedRecord(organisationId,
      await db.vehicle.findFirst({ where: { id, organisationId } }), "Vehicle");
  }

  return {
    async getOrganisationTrackingOverview(organisationId: string, now = new Date()): Promise<TrackingAssetOverviewDTO[]> {
      await authorize(organisationId);
      return prisma.$transaction(async (db) => {
        const assets = await db.trackingAsset.findMany({
          where: { organisationId },
          orderBy: [{ displayName: "asc" }, { id: "asc" }],
          select: {
            id: true, displayName: true, providerDisplayName: true, model: true,
            expectedTrackingIntervalMinutes: true,
            integration: { select: { provider: true } },
            defaultVehicle: { select: { id: true, name: true, registration: true } },
            messages: {
              where: { organisationId }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 1,
              select: { occurredAt: true, messageKind: true },
            },
            assignments: {
              where: { organisationId, trip: { organisationId, status: { in: ["PLANNED", "IN_PROGRESS"] } } },
              select: {
                assignedFrom: true, assignedUntil: true, role: true,
                vehicle: { select: { id: true, name: true, registration: true } },
                trip: { select: { id: true, title: true, status: true, startsAt: true, endsAt: true } },
              },
            },
          },
        });
        return Promise.all(assets.map(async (asset) => {
          const position = await db.trackingMessage.findFirst({
            where: { organisationId, trackingAssetId: asset.id,
              latitude: { gte: -90, lte: 90 }, longitude: { gte: -180, lte: 180 } },
            orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
            select: { latitude: true, longitude: true, occurredAt: true },
          });
          // Effective windows fall back individually to the trip dates. Current wins,
          // then nearest planned assignment; expired/cancelled/draft trips are excluded.
          const assignment = asset.assignments.filter((a) =>
            (a.assignedUntil ?? a.trip.endsAt) >= now &&
            (a.assignedFrom ?? a.trip.startsAt) <= (a.assignedUntil ?? a.trip.endsAt),
          ).sort((a, b) => {
            const aStart = (a.assignedFrom ?? a.trip.startsAt).getTime();
            const bStart = (b.assignedFrom ?? b.trip.startsAt).getTime();
            return Number(bStart <= now.getTime()) - Number(aStart <= now.getTime()) ||
              aStart - bStart || a.trip.id.localeCompare(b.trip.id);
          })[0];
          const hasFix = position && validCoordinates(position.latitude, position.longitude);
          return {
            assetId: asset.id, displayName: asset.displayName,
            provider: asset.integration.provider, providerDisplayName: asset.providerDisplayName,
            model: asset.model,
            latitude: hasFix ? position.latitude : null,
            longitude: hasFix ? position.longitude : null,
            latestPositionAt: hasFix ? position.occurredAt.toISOString() : null,
            latestMessageAt: asset.messages[0]?.occurredAt.toISOString() ?? null,
            latestMessageKind: asset.messages[0]?.messageKind ?? null,
            vehicle: assignment?.vehicle ?? asset.defaultVehicle,
            trip: assignment ? {
              id: assignment.trip.id, title: assignment.trip.title, status: assignment.trip.status,
              startsAt: assignment.trip.startsAt.toISOString(), endsAt: assignment.trip.endsAt.toISOString(),
              role: assignment.role,
            } : null,
            freshness: trackingFreshness(hasFix ? position.occurredAt : null,
              asset.expectedTrackingIntervalMinutes, now),
          };
        }));
      }, { isolationLevel: "RepeatableRead" });
    },

    async associateTrackingAssetVehicle(organisationId: string, assetId: string, vehicleId: string | null) {
      await authorize(organisationId);
      await prisma.$transaction(async (db) => {
        await assetInOrganisation(db, organisationId, assetId);
        await vehicleInOrganisation(db, organisationId, vehicleId);
        await db.trackingAsset.update({
          where: { organisationId_id: { organisationId, id: assetId } },
          data: { defaultVehicleId: vehicleId },
        });
      });
    },

    async assignTrackingAssetToTrip(organisationId: string, input: {
      tripId: string; assetId: string; vehicleId?: string | null; role?: TripTrackingRole;
      assignedFrom?: Date | null; assignedUntil?: Date | null;
    }) {
      await authorize(organisationId);
      await prisma.$transaction(async (db) => {
        await assetInOrganisation(db, organisationId, input.assetId);
        const trip = await db.trip.findFirst({ where: { id: input.tripId, organisationId } });
        requireOrganisationScopedRecord(organisationId, trip, "Trip");
        await vehicleInOrganisation(db, organisationId, input.vehicleId);
        const from = input.assignedFrom ?? trip!.startsAt;
        const until = input.assignedUntil ?? trip!.endsAt;
        if (!Number.isFinite(from.getTime()) || !Number.isFinite(until.getTime()) || from > until) {
          throw new Error("Invalid tracking assignment window.");
        }
        const data = { vehicleId: input.vehicleId ?? null, role: input.role ?? "PRIMARY",
          assignedFrom: input.assignedFrom ?? null, assignedUntil: input.assignedUntil ?? null };
        await db.tripTrackingAssignment.upsert({
          where: { tripId_trackingAssetId: { tripId: input.tripId, trackingAssetId: input.assetId } },
          create: { organisationId, tripId: input.tripId, trackingAssetId: input.assetId, ...data },
          update: data,
        });
      });
    },

    async storeTrackingMessage(organisationId: string, integrationId: string, assetId: string,
      message: NormalisedTrackingMessage) {
      await authorize(organisationId);
      await prisma.$transaction(async (db) => {
        const asset = await assetInOrganisation(db, organisationId, assetId);
        if (asset.trackingIntegrationId !== integrationId) throw new Error("Tracking integration mismatch.");
        if (!message.externalMessageId.trim() || !Number.isFinite(message.occurredAt.getTime())) {
          throw new Error("Invalid tracking message identity or timestamp.");
        }
        const hasFix = validCoordinates(message.latitude, message.longitude);
        // Explicit allowlist; never persist arbitrary input properties, raw content or secrets.
        await db.trackingMessage.createMany({
          skipDuplicates: true,
          data: [{ organisationId, trackingIntegrationId: integrationId, trackingAssetId: assetId,
            externalMessageId: message.externalMessageId, occurredAt: message.occurredAt,
            messageKind: message.messageKind, providerMessageType: message.providerMessageType,
            latitude: hasFix ? message.latitude : null, longitude: hasFix ? message.longitude : null }],
        });
        const stored = await db.trackingMessage.findUniqueOrThrow({
          where: { trackingIntegrationId_externalMessageId: {
            trackingIntegrationId: integrationId, externalMessageId: message.externalMessageId,
          } },
          select: { organisationId: true, trackingAssetId: true },
        });
        if (stored.organisationId !== organisationId || stored.trackingAssetId !== assetId) {
          throw new Error("Tracking message identity belongs to another asset.");
        }
      });
    },
  };
}
