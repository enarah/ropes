import { notFound } from "next/navigation";
import { saveVehicleAction } from "@/app/vehicles/actions";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getVehicleForOrganisationWithPersistence,
  getVehicleFormDefaults,
  getVehiclePersistenceState,
} from "@/lib/vehicles-data";

type EditVehiclePageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export default async function EditVehiclePage({
  params,
  searchParams,
}: EditVehiclePageProps) {
  const { vehicleId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [vehicle, persistence] = await Promise.all([
    getVehicleForOrganisationWithPersistence(selectedOrganisation.slug, vehicleId),
    getVehiclePersistenceState(selectedOrganisation.slug),
  ]);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-earth-200 pb-6">
        <p className="text-sm font-semibold text-ochre-700">
          Vehicles / {selectedOrganisation.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
          Edit vehicle
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
          Update the selected organisation vehicle record. Existing bookings
          remain unchanged.
        </p>
      </section>
      {resolvedSearchParams?.error ? (
        <StatusMessage error={resolvedSearchParams.error} tone="error" />
      ) : resolvedSearchParams?.saved === "demo" ? (
        <StatusMessage tone="demo" />
      ) : null}
      <VehicleForm
        action={persistence.organisationId ? saveVehicleAction : undefined}
        defaults={getVehicleFormDefaults(vehicle)}
        mode="edit"
        organisationId={persistence.organisationId}
        organisationName={selectedOrganisation.name}
        organisationSlug={selectedOrganisation.slug}
        persistenceEnabled={persistence.isDatabaseAvailable}
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

  if (error === "duplicate") {
    return {
      body: "Another vehicle in this organisation already uses that registration.",
      title: "Vehicle registration already exists",
    };
  }

  if (error === "tenant") {
    return {
      body: "The tenant guard rejected this vehicle write for the selected organisation.",
      title: "Organisation access required",
    };
  }

  if (error === "validation") {
    return {
      body: "Check registration, name, make, model, status, year and odometer values before saving again.",
      title: "Vehicle details need review",
    };
  }

  return {
    body: "The database lookup or persistence step rejected the write before anything was saved.",
    title: "Vehicle was not saved",
  };
}
