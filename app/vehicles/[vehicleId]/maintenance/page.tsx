import { notFound } from "next/navigation";
import { createVehicleMaintenanceRecordAction } from "@/app/vehicles/[vehicleId]/maintenance/actions";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { VehicleMaintenanceForm } from "@/components/vehicles/vehicle-maintenance-form";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getVehicleDefectsForVehicleWithPersistence,
  getVehicleForOrganisationWithPersistence,
  getVehicleMaintenanceRecordsForVehicleWithPersistence,
  getVehiclePersistenceState,
} from "@/lib/vehicles-data";

type VehicleMaintenancePageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams?: Promise<{
    defect?: string;
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export default async function VehicleMaintenancePage({
  params,
  searchParams,
}: VehicleMaintenancePageProps) {
  const { vehicleId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [vehicle, maintenanceRecords, defects, persistence] = await Promise.all([
    getVehicleForOrganisationWithPersistence(selectedOrganisation.slug, vehicleId),
    getVehicleMaintenanceRecordsForVehicleWithPersistence(
      selectedOrganisation.slug,
      vehicleId,
    ),
    getVehicleDefectsForVehicleWithPersistence(
      selectedOrganisation.slug,
      vehicleId,
    ),
    getVehiclePersistenceState(selectedOrganisation.slug),
  ]);

  if (!vehicle) {
    notFound();
  }

  const linkedDefectId = defects.some(
    (defect) => defect.id === resolvedSearchParams?.defect,
  )
    ? resolvedSearchParams?.defect
    : undefined;

  return (
    <div className="space-y-6">
      <section className="border-b border-earth-200 pb-6">
        <p className="text-sm font-semibold text-ochre-700">
          Vehicle maintenance / {selectedOrganisation.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
          {vehicle.name}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
          Add a short organisation-scoped maintenance record for this vehicle.
          This foundation records recent maintenance only and does not create
          work orders, scheduling or booking blocks.
        </p>
      </section>

      {resolvedSearchParams?.error ? (
        <StatusMessage error={resolvedSearchParams.error} tone="error" />
      ) : resolvedSearchParams?.saved ? (
        <StatusMessage saved={resolvedSearchParams.saved} tone="saved" />
      ) : null}

      <VehicleMaintenanceForm
        action={createVehicleMaintenanceRecordAction}
        defects={defects}
        linkedDefectId={linkedDefectId}
        maintenanceRecords={maintenanceRecords}
        organisationId={persistence.organisationId}
        organisationName={selectedOrganisation.name}
        organisationSlug={selectedOrganisation.slug}
        persistenceEnabled={persistence.isDatabaseAvailable}
        vehicle={vehicle}
      />
    </div>
  );
}

function StatusMessage({
  error,
  saved,
  tone,
}: {
  error?: string;
  saved?: string;
  tone: "error" | "saved";
}) {
  const message = getStatusMessage(error, saved, tone);

  return (
    <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
      <p className="text-sm font-semibold text-charcoal-950">
        {message.title}
      </p>
      <p className="text-sm leading-6 text-charcoal-600">{message.body}</p>
    </div>
  );
}

function getStatusMessage(
  error: string | undefined,
  saved: string | undefined,
  tone: "error" | "saved",
) {
  if (tone === "saved" && saved === "demo") {
    return {
      body: "No local database is configured, so the form kept the demo-only behaviour.",
      title: "Demo fallback",
    };
  }

  if (tone === "saved") {
    return {
      body: "The maintenance record was saved for this organisation-scoped vehicle. Bookings and defects were not changed.",
      title: "Maintenance recorded",
    };
  }

  if (error === "tenant") {
    return {
      body: "The tenant guard rejected this maintenance record for the selected organisation.",
      title: "Organisation access required",
    };
  }

  if (error === "validation") {
    return {
      body: "Check type, status, dates, odometer, cost and note length before submitting again.",
      title: "Maintenance details need review",
    };
  }

  return {
    body: "The database lookup or persistence step rejected the maintenance record before anything was saved.",
    title: "Maintenance was not saved",
  };
}
