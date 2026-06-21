import { notFound } from "next/navigation";
import { FulcrumShell } from "@/components/fulcrum/fulcrum-shell";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { fulcrumSections, isFulcrumSectionSlug } from "@/lib/fulcrum-data";
import { getOrganisationPageAccess } from "@/lib/organisation-access";

type FulcrumSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export function generateStaticParams() {
  return fulcrumSections
    .filter((section) => section.slug !== "overview")
    .map((section) => ({ section: section.slug }));
}

export default async function FulcrumSectionPage({
  params,
  searchParams,
}: FulcrumSectionPageProps) {
  const { section } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedOrganisationSlug = resolvedSearchParams?.org;

  if (section === "overview" || !isFulcrumSectionSlug(section)) {
    notFound();
  }

  const access = await getOrganisationPageAccess(selectedOrganisationSlug);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  return (
    <FulcrumShell
      connectionError={resolvedSearchParams?.error}
      connectionSaved={resolvedSearchParams?.saved}
      organisation={access.organisation}
      sectionSlug={section}
      selectedOrganisationSlug={selectedOrganisationSlug}
    />
  );
}
