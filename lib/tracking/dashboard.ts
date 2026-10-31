import { organisationHasCapability } from "../capability-registry";
import type { DashboardOrganisation } from "../dashboard-data";
import type { TrackingAssetOverviewDTO } from "./types";

export type TrackingDashboardData =
  | { status: "hidden" }
  | { status: "unavailable" }
  | { status: "ready"; assets: TrackingAssetOverviewDTO[]; snapshotAt: string };

// The caller must already have established organisation page access. The injected
// production reader independently checks the request tenant and capability again.
export async function loadTrackingDashboardData(
  organisation: DashboardOrganisation,
  readOverview: (organisationId: string, now: Date) => Promise<TrackingAssetOverviewDTO[]>,
  now = new Date(),
): Promise<TrackingDashboardData> {
  if (!organisationHasCapability(organisation.capabilityKeys, "integrations.spotTracker")) return { status: "hidden" };
  if (!organisation.id) return { status: "unavailable" };
  try {
    const assets = await readOverview(organisation.id, now);
    return { status: "ready", assets, snapshotAt: now.toISOString() };
  } catch {
    return { status: "unavailable" };
  }
}
