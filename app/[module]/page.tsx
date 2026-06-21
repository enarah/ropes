import { notFound } from "next/navigation";
import { DashboardContent } from "@/components/dashboard-content";
import { FulcrumShell } from "@/components/fulcrum/fulcrum-shell";
import { TripsList } from "@/components/trips/trips-list";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { VehiclesRegister } from "@/components/vehicles/vehicles-register";
import { isModuleSlug, moduleSlugs } from "@/lib/dashboard-data";
import { getOrganisationPageAccess } from "@/lib/organisation-access";

type ModulePageProps = {
  params: Promise<{
    module: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    import?: string;
    org?: string;
    saved?: string;
    sync?: string;
    tested?: string;
  }>;
};

export function generateStaticParams() {
  return moduleSlugs
    .filter((moduleSlug) => moduleSlug !== "overview")
    .map((moduleSlug) => ({ module: moduleSlug }));
}

export default async function ModulePage({
  params,
  searchParams,
}: ModulePageProps) {
  const { module } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedOrganisationSlug = resolvedSearchParams?.org;

  if (!isModuleSlug(module)) {
    notFound();
  }

  const access = await getOrganisationPageAccess(selectedOrganisationSlug);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  if (module === "trips") {
    return (
      <TripsList
        organisation={access.organisation}
        selectedOrganisationSlug={selectedOrganisationSlug}
      />
    );
  }

  if (module === "vehicles") {
    return (
      <VehiclesRegister
        organisation={access.organisation}
        selectedOrganisationSlug={selectedOrganisationSlug}
      />
    );
  }

  if (module === "fulcrum") {
    return (
      <FulcrumShell
        connectionError={resolvedSearchParams?.error}
        importStatus={resolvedSearchParams?.import}
        connectionSaved={resolvedSearchParams?.saved}
        connectionTested={resolvedSearchParams?.tested}
        organisation={access.organisation}
        selectedOrganisationSlug={selectedOrganisationSlug}
        syncStatus={resolvedSearchParams?.sync}
      />
    );
  }

  return (
    <DashboardContent
      moduleSlug={module}
      organisation={access.organisation}
      selectedOrganisationSlug={selectedOrganisationSlug}
    />
  );
}
