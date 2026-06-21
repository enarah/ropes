import { saveTripAction } from "@/app/trips/actions";
import { TripForm } from "@/components/trips/trip-form";
import { getSelectedOrganisation } from "@/lib/dashboard-data";
import {
  getTripFormDefaultsWithPersistence,
  getTripPersistenceState,
} from "@/lib/trips-data";

type NewTripPageProps = {
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedOrganisation = getSelectedOrganisation(
    resolvedSearchParams?.org,
  );
  const [trip, persistence] = await Promise.all([
    getTripFormDefaultsWithPersistence(selectedOrganisation.slug),
    getTripPersistenceState(selectedOrganisation.slug),
  ]);

  return (
    <div className="space-y-6">
      <section className="border-b border-earth-200 pb-6">
        <p className="text-sm font-semibold text-ochre-700">
          Trips / {selectedOrganisation.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
          New trip
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
          Create an organisation-scoped trip draft. Core trip details persist
          when a local database is configured; structured participant, vehicle
          and itinerary rows remain demo-only.
        </p>
      </section>
      {resolvedSearchParams?.error ? (
        <StatusMessage tone="error" />
      ) : resolvedSearchParams?.saved === "demo" ? (
        <StatusMessage tone="demo" />
      ) : null}
      <TripForm
        action={persistence.organisationId ? saveTripAction : undefined}
        mode="create"
        organisationId={persistence.organisationId}
        organisationName={selectedOrganisation.name}
        organisationSlug={selectedOrganisation.slug}
        persistenceEnabled={persistence.isDatabaseAvailable}
        trip={trip}
      />
    </div>
  );
}

function StatusMessage({ tone }: { tone: "demo" | "error" }) {
  return (
    <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
      <p className="text-sm font-semibold text-charcoal-950">
        {tone === "demo" ? "Demo fallback" : "Trip was not saved"}
      </p>
      <p className="text-sm leading-6 text-charcoal-600">
        {tone === "demo"
          ? "No local database is configured, so the form kept the demo-only behaviour."
          : "The tenant guard, database lookup or validation check rejected the write before anything was saved."}
      </p>
    </div>
  );
}
