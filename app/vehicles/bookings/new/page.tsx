import { createVehicleBookingAction } from "@/app/vehicles/bookings/actions";
import { VehicleBookingForm } from "@/components/vehicles/vehicle-booking-form";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getBookingFormDefaults,
  getVehicleBookingsForOrganisationWithPersistence,
  getVehiclePersistenceState,
  getVehiclesForOrganisationWithPersistence,
} from "@/lib/vehicles-data";

type NewVehicleBookingPageProps = {
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
    vehicle?: string;
  }>;
};

export default async function NewVehicleBookingPage({
  searchParams,
}: NewVehicleBookingPageProps) {
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [vehicles, bookings, persistence] = await Promise.all([
    getVehiclesForOrganisationWithPersistence(selectedOrganisation.slug),
    getVehicleBookingsForOrganisationWithPersistence(selectedOrganisation.slug),
    getVehiclePersistenceState(selectedOrganisation.slug),
  ]);
  const selectedVehicleId = vehicles.some(
    (vehicle) => vehicle.id === resolvedSearchParams?.vehicle,
  )
    ? resolvedSearchParams?.vehicle
    : vehicles[0]?.id;
  const demoDefaults = getBookingFormDefaults(
    selectedOrganisation.slug,
    selectedVehicleId,
  );
  const defaults = {
    ...demoDefaults,
    vehicleId:
      selectedVehicleId ?? demoDefaults.vehicleId,
  };

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
          Create an organisation-scoped vehicle booking request. This form keeps
          the client-side overlap warning, then enforces the same vehicle
          booking overlap rule on the server before a persisted booking is
          created.
        </p>
      </section>
      {resolvedSearchParams?.error ? (
        <StatusMessage error={resolvedSearchParams.error} tone="error" />
      ) : resolvedSearchParams?.saved === "demo" ? (
        <StatusMessage tone="demo" />
      ) : null}
      <VehicleBookingForm
        action={
          persistence.organisationId ? createVehicleBookingAction : undefined
        }
        bookings={bookings}
        defaults={defaults}
        organisationId={persistence.organisationId}
        organisationName={selectedOrganisation.name}
        organisationSlug={selectedOrganisation.slug}
        persistenceEnabled={persistence.isDatabaseAvailable}
        vehicles={vehicles}
      />
    </div>
  );
}

function StatusMessage({
  error,
  tone,
}: {
  error?: string;
  tone: "demo" | "error";
}) {
  const isOverlap = error === "overlap";

  return (
    <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
      <p className="text-sm font-semibold text-charcoal-950">
        {tone === "demo"
          ? "Demo fallback"
          : isOverlap
            ? "Booking overlaps an existing booking"
            : "Booking was not saved"}
      </p>
      <p className="text-sm leading-6 text-charcoal-600">
        {tone === "demo"
          ? "No local database is configured, so the form kept the demo-only behaviour."
          : isOverlap
            ? "The server rejected this booking because the selected vehicle already has a non-cancelled booking in that time window."
          : "The tenant guard, database lookup, date validation or server-side overlap check rejected the write before anything was saved."}
      </p>
    </div>
  );
}
