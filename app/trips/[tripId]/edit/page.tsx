import { notFound } from "next/navigation";
import { saveTripAction } from "@/app/trips/actions";
import { TripForm } from "@/components/trips/trip-form";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getTripForOrganisationWithPersistence,
  getTripPersistenceState,
} from "@/lib/trips-data";

type EditTripPageProps = {
  params: Promise<{
    tripId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export default async function EditTripPage({
  params,
  searchParams,
}: EditTripPageProps) {
  const { tripId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [trip, persistence] = await Promise.all([
    getTripForOrganisationWithPersistence(selectedOrganisation.slug, tripId),
    getTripPersistenceState(selectedOrganisation.slug),
  ]);

  if (!trip) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-earth-200 pb-6">
        <p className="text-sm font-semibold text-ochre-700">
          Trips / {selectedOrganisation.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
          Edit trip
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
          Edit the trip record for this selected organisation. Core trip
          details, participants, vehicle allocations and itinerary rows persist
          when a local database is configured.
        </p>
      </section>
      {resolvedSearchParams?.error ? (
        <StatusMessage tone="error" />
      ) : resolvedSearchParams?.saved === "demo" ? (
        <StatusMessage tone="demo" />
      ) : null}
      <TripForm
        action={persistence.organisationId ? saveTripAction : undefined}
        mode="edit"
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
