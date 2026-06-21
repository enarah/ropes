import { TripForm } from "@/components/trips/trip-form";
import { getSelectedOrganisation } from "@/lib/dashboard-data";
import { getTripFormDefaults } from "@/lib/trips-data";

type NewTripPageProps = {
  searchParams?: Promise<{
    org?: string;
  }>;
};

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  const selectedOrganisation = getSelectedOrganisation((await searchParams)?.org);
  const trip = getTripFormDefaults(selectedOrganisation.slug);

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
          Create a fake organisation-scoped trip draft. This form is an MVP
          placeholder and does not persist data yet.
        </p>
      </section>
      <TripForm
        mode="create"
        organisationName={selectedOrganisation.name}
        trip={trip}
      />
    </div>
  );
}
