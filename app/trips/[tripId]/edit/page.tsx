import { notFound } from "next/navigation";
import { TripForm } from "@/components/trips/trip-form";
import { getSelectedOrganisation } from "@/lib/dashboard-data";
import { getTripForOrganisation } from "@/lib/trips-data";

type EditTripPageProps = {
  params: Promise<{
    tripId: string;
  }>;
  searchParams?: Promise<{
    org?: string;
  }>;
};

export default async function EditTripPage({
  params,
  searchParams,
}: EditTripPageProps) {
  const { tripId } = await params;
  const selectedOrganisation = getSelectedOrganisation((await searchParams)?.org);
  const trip = getTripForOrganisation(selectedOrganisation.slug, tripId);

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
          Edit the fake trip record for this selected organisation. No real
          database write occurs yet.
        </p>
      </section>
      <TripForm
        mode="edit"
        organisationName={selectedOrganisation.name}
        trip={trip}
      />
    </div>
  );
}
