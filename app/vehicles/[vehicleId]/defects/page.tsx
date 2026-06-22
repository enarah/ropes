import { notFound } from "next/navigation";
import { createVehicleDefectAction } from "@/app/vehicles/[vehicleId]/defects/actions";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { VehicleDefectForm } from "@/components/vehicles/vehicle-defect-form";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getLatestVehiclePreStartForOrganisationWithPersistence,
  getVehicleDefectsForVehicleWithPersistence,
  getVehicleForOrganisationWithPersistence,
  getVehiclePersistenceState,
} from "@/lib/vehicles-data";

type VehicleDefectsPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    org?: string;
    preStart?: string;
    saved?: string;
  }>;
};

export default async function VehicleDefectsPage({
  params,
  searchParams,
}: VehicleDefectsPageProps) {
  const { vehicleId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [vehicle, defects, latestPreStart, persistence] = await Promise.all([
    getVehicleForOrganisationWithPersistence(selectedOrganisation.slug, vehicleId),
    getVehicleDefectsForVehicleWithPersistence(
      selectedOrganisation.slug,
      vehicleId,
    ),
    getLatestVehiclePreStartForOrganisationWithPersistence(
      selectedOrganisation.slug,
      vehicleId,
    ),
    getVehiclePersistenceState(selectedOrganisation.slug),
  ]);

  if (!vehicle) {
    notFound();
  }

  const linkedPreStart =
    latestPreStart?.id === resolvedSearchParams?.preStart
      ? latestPreStart
      : null;

  return (
    <div className="space-y-6">
      <section className="border-b border-earth-200 pb-6">
        <p className="text-sm font-semibold text-ochre-700">
          Vehicle defects / {selectedOrganisation.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
          {vehicle.name}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
          Report a short organisation-scoped defect for this vehicle. This
          foundation records defect visibility only and does not change
          bookings, scheduling or maintenance work orders.
        </p>
      </section>

      {resolvedSearchParams?.error ? (
        <StatusMessage error={resolvedSearchParams.error} tone="error" />
      ) : resolvedSearchParams?.saved ? (
        <StatusMessage saved={resolvedSearchParams.saved} tone="saved" />
      ) : null}

      <VehicleDefectForm
        action={createVehicleDefectAction}
        defects={defects}
        linkedPreStart={linkedPreStart}
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
      body: "The defect report was saved for this organisation-scoped vehicle.",
      title: "Defect submitted",
    };
  }

  if (error === "tenant") {
    return {
      body: "The tenant guard rejected this defect submission for the selected organisation.",
      title: "Organisation access required",
    };
  }

  if (error === "validation") {
    return {
      body: "Check category, severity, status, reported date and description length before submitting again.",
      title: "Defect details need review",
    };
  }

  return {
    body: "The database lookup or persistence step rejected the defect before anything was saved.",
    title: "Defect was not saved",
  };
}
