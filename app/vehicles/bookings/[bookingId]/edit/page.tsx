import { notFound } from "next/navigation";
import { updateVehicleBookingAction } from "@/app/vehicles/bookings/actions";
import { VehicleBookingForm } from "@/components/vehicles/vehicle-booking-form";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getBookingFormDefaults,
  getVehicleBookingForOrganisationWithPersistence,
  getVehicleBookingsForOrganisationWithPersistence,
  getVehiclePersistenceState,
  getVehiclesForOrganisationWithPersistence,
} from "@/lib/vehicles-data";

type EditVehicleBookingPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export default async function EditVehicleBookingPage({
  params,
  searchParams,
}: EditVehicleBookingPageProps) {
  const { bookingId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [booking, vehicles, bookings, persistence] = await Promise.all([
    getVehicleBookingForOrganisationWithPersistence(
      selectedOrganisation.slug,
      bookingId,
    ),
    getVehiclesForOrganisationWithPersistence(selectedOrganisation.slug),
    getVehicleBookingsForOrganisationWithPersistence(selectedOrganisation.slug),
    getVehiclePersistenceState(selectedOrganisation.slug),
  ]);

  if (!booking) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-earth-200 pb-6">
        <p className="text-sm font-semibold text-ochre-700">
          Vehicle bookings / {selectedOrganisation.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
          Edit vehicle booking
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
          Update an organisation-scoped booking. The server validates tenant
          access, vehicle ownership, booking dates and overlap safety before
          saving.
        </p>
      </section>
      {resolvedSearchParams?.error ? (
        <StatusMessage error={resolvedSearchParams.error} tone="error" />
      ) : resolvedSearchParams?.saved === "demo" ? (
        <StatusMessage tone="demo" />
      ) : null}
      <VehicleBookingForm
        action={
          persistence.organisationId ? updateVehicleBookingAction : undefined
        }
        bookings={bookings}
        defaults={getBookingFormDefaults(
          selectedOrganisation.slug,
          booking.vehicleId,
          booking,
        )}
        mode="edit"
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
  const message = getStatusMessage(error, tone);

  return (
    <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
      <p className="text-sm font-semibold text-charcoal-950">
        {message.title}
      </p>
      <p className="text-sm leading-6 text-charcoal-600">
        {message.body}
      </p>
    </div>
  );
}

function getStatusMessage(error: string | undefined, tone: "demo" | "error") {
  if (tone === "demo") {
    return {
      body: "No local database is configured, so the form kept the demo-only behaviour.",
      title: "Demo fallback",
    };
  }

  if (error === "overlap") {
    return {
      body: "The server rejected this booking because the selected vehicle already has a non-cancelled booking in that time window.",
      title: "Booking overlaps an existing booking",
    };
  }

  if (error === "tenant") {
    return {
      body: "The tenant guard rejected this booking update for the selected organisation.",
      title: "Organisation access required",
    };
  }

  if (error === "validation") {
    return {
      body: "Check the vehicle, title, requester, dates, status and notes before saving again.",
      title: "Booking details need review",
    };
  }

  return {
    body: "The database lookup or persistence step rejected the update before anything was saved.",
    title: "Booking was not saved",
  };
}
