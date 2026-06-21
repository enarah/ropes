import { VehicleBookingForm } from "@/components/vehicles/vehicle-booking-form";
import { getSelectedOrganisation } from "@/lib/dashboard-data";
import {
  getBookingFormDefaults,
  getVehicleBookingsForOrganisation,
  getVehiclesForOrganisation,
} from "@/lib/vehicles-data";

type NewVehicleBookingPageProps = {
  searchParams?: Promise<{
    org?: string;
    vehicle?: string;
  }>;
};

export default async function NewVehicleBookingPage({
  searchParams,
}: NewVehicleBookingPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedOrganisation = getSelectedOrganisation(
    resolvedSearchParams?.org,
  );
  const vehicles = getVehiclesForOrganisation(selectedOrganisation.slug);
  const defaults = getBookingFormDefaults(
    selectedOrganisation.slug,
    resolvedSearchParams?.vehicle,
  );

  return (
    <div className="space-y-6">
      <section className="border-b border-earth-200 pb-6">
        <p className="text-sm font-semibold text-ochre-700">
          Vehicles / {selectedOrganisation.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
          New vehicle booking
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
          Create a fake organisation-scoped vehicle booking draft. This form
          checks for demo booking overlaps and does not persist data yet.
        </p>
      </section>
      <VehicleBookingForm
        bookings={getVehicleBookingsForOrganisation(selectedOrganisation.slug)}
        defaults={defaults}
        organisationName={selectedOrganisation.name}
        vehicles={vehicles}
      />
    </div>
  );
}
