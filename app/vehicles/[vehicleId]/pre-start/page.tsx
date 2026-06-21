import { notFound } from "next/navigation";
import { createVehiclePreStartAction } from "@/app/vehicles/[vehicleId]/pre-start/actions";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { VehiclePreStartForm } from "@/components/vehicles/vehicle-pre-start-form";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getLatestVehiclePreStartForOrganisationWithPersistence,
  getVehicleForOrganisationWithPersistence,
  getVehiclePersistenceState,
} from "@/lib/vehicles-data";

type VehiclePreStartPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export default async function VehiclePreStartPage({
  params,
  searchParams,
}: VehiclePreStartPageProps) {
  const { vehicleId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [vehicle, latestPreStart, persistence] = await Promise.all([
    getVehicleForOrganisationWithPersistence(selectedOrganisation.slug, vehicleId),
    getLatestVehiclePreStartForOrganisationWithPersistence(
      selectedOrganisation.slug,
      vehicleId,
    ),
    getVehiclePersistenceState(selectedOrganisation.slug),
  ]);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-earth-200 pb-6">
        <p className="text-sm font-semibold text-ochre-700">
          Vehicle pre-start / {selectedOrganisation.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
          {vehicle.name}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
          Submit a small organisation-scoped pre-start checklist for this
          vehicle. This foundation records readiness only and does not create
          maintenance records, defects, approvals or booking changes.
        </p>
      </section>

      {resolvedSearchParams?.error ? (
        <StatusMessage error={resolvedSearchParams.error} tone="error" />
      ) : resolvedSearchParams?.saved ? (
        <StatusMessage saved={resolvedSearchParams.saved} tone="saved" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Current status" value={vehicle.preStartStatus} />
        <SummaryCard
          label="Latest odometer"
          value={
            latestPreStart
              ? `${latestPreStart.odometerKm.toLocaleString("en-AU")} km`
              : `${vehicle.odometerKm.toLocaleString("en-AU")} km`
          }
        />
        <SummaryCard
          label="Last checked"
          value={
            latestPreStart
              ? formatDateTime(latestPreStart.checkedAt)
              : "Not recorded"
          }
        />
      </section>

      {latestPreStart?.issueNotes ? (
        <section className="rounded-md border border-earth-200 bg-earth-50 p-4">
          <p className="text-sm font-semibold text-charcoal-950">
            Latest safe issue note
          </p>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">
            {latestPreStart.issueNotes}
          </p>
        </section>
      ) : null}

      <VehiclePreStartForm
        action={createVehiclePreStartAction}
        latestPreStart={latestPreStart}
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
      <p className="text-sm leading-6 text-charcoal-600">
        {message.body}
      </p>
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
      body: "The latest pre-start checklist was saved for this organisation-scoped vehicle.",
      title: "Pre-start submitted",
    };
  }

  if (error === "tenant") {
    return {
      body: "The tenant guard rejected this pre-start submission for the selected organisation.",
      title: "Organisation access required",
    };
  }

  if (error === "validation") {
    return {
      body: "Check odometer, checklist answers and issue note length before submitting again.",
      title: "Pre-start details need review",
    };
  }

  return {
    body: "The database lookup or persistence step rejected the checklist before anything was saved.",
    title: "Pre-start was not saved",
  };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-charcoal-600">{label}</p>
      <p className="mt-2 text-xl font-semibold text-charcoal-950">{value}</p>
    </article>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
