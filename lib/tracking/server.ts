import "server-only";
import { getTenantGuardSessionForRequest } from "../auth-session";
import { getPrismaClient } from "../db";
import { authorizeTrackingOrganisation } from "./access";
import { createTrackingDataLayer } from "./data";

// Request-only entry point. No unauthenticated fixture fallback or public endpoint.
function requestTrackingData() {
  const prisma = getPrismaClient();
  return createTrackingDataLayer({
    prisma,
    async authorize(organisationId) {
      await authorizeTrackingOrganisation(prisma, organisationId, await getTenantGuardSessionForRequest(prisma));
    },
  });
}

export async function getOrganisationTrackingOverview(organisationId: string, now = new Date()) {
  return requestTrackingData().getOrganisationTrackingOverview(organisationId, now);
}

export async function associateTrackingAssetVehicle(organisationId: string, assetId: string, vehicleId: string | null) {
  return requestTrackingData().associateTrackingAssetVehicle(organisationId, assetId, vehicleId);
}

export async function assignTrackingAssetToTrip(organisationId: string,
  input: Parameters<ReturnType<typeof createTrackingDataLayer>["assignTrackingAssetToTrip"]>[1]) {
  return requestTrackingData().assignTrackingAssetToTrip(organisationId, input);
}
