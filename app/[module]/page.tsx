import { notFound } from "next/navigation";
import { DashboardContent } from "@/components/dashboard-content";
import { TripsList } from "@/components/trips/trips-list";
import { isModuleSlug, moduleSlugs } from "@/lib/dashboard-data";

type ModulePageProps = {
  params: Promise<{
    module: string;
  }>;
  searchParams?: Promise<{
    org?: string;
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
  const selectedOrganisationSlug = (await searchParams)?.org;

  if (!isModuleSlug(module)) {
    notFound();
  }

  if (module === "trips") {
    return <TripsList selectedOrganisationSlug={selectedOrganisationSlug} />;
  }

  return (
    <DashboardContent
      moduleSlug={module}
      selectedOrganisationSlug={selectedOrganisationSlug}
    />
  );
}
