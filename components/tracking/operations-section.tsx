import { OperationsMap } from "./operations-map";
import type { DashboardOrganisation } from "@/lib/dashboard-data";
import { isDemoFallbackMode } from "@/lib/read-access-mode";
import { loadTrackingDashboardData } from "@/lib/tracking/dashboard";
import { getOrganisationTrackingOverview } from "@/lib/tracking/server";

export async function OperationsSection({ organisation }: { organisation: DashboardOrganisation }) {
  const data = await loadTrackingDashboardData(organisation, getOrganisationTrackingOverview);
  if (data.status === "hidden") return null;
  if (data.status === "unavailable") {
    return (
      <section aria-labelledby="operations-map-heading" className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
        <h2 id="operations-map-heading" className="text-xl font-semibold text-charcoal-950">Operations Map</h2>
        <p className="mt-2 text-sm text-charcoal-600">Tracking data is unavailable. Organisation access and the configured database must be available to load this section.</p>
      </section>
    );
  }
  return <OperationsMap assets={data.assets} snapshotAt={data.snapshotAt}
    allowSyntheticBasemap={organisation.isDemo === true && isDemoFallbackMode()} />;
}
