import { notFound } from "next/navigation";
import { DashboardContent } from "@/components/dashboard-content";
import { FulcrumShell } from "@/components/fulcrum/fulcrum-shell";
import { TripsList } from "@/components/trips/trips-list";
import { VehiclesRegister } from "@/components/vehicles/vehicles-register";
import { isModuleSlug, moduleSlugs } from "@/lib/dashboard-data";

type ModulePageProps = {
  params: Promise<{
    module: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
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

  if (module === "trips") {
    return <TripsList selectedOrganisationSlug={selectedOrganisationSlug} />;
  }

  if (module === "vehicles") {
    return (
      <VehiclesRegister selectedOrganisationSlug={selectedOrganisationSlug} />
    );
  }

  if (module === "fulcrum") {
    return (
      <FulcrumShell
        connectionError={resolvedSearchParams?.error}
        connectionSaved={resolvedSearchParams?.saved}
        selectedOrganisationSlug={selectedOrganisationSlug}
      />
    );
  }

  return (
    <DashboardContent
      moduleSlug={module}
      selectedOrganisationSlug={selectedOrganisationSlug}
    />
  );
}
