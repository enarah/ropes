import { notFound } from "next/navigation";
import { FulcrumShell } from "@/components/fulcrum/fulcrum-shell";
import { fulcrumSections, isFulcrumSectionSlug } from "@/lib/fulcrum-data";

type FulcrumSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
  searchParams?: Promise<{
    org?: string;
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
  const selectedOrganisationSlug = (await searchParams)?.org;

  if (section === "overview" || !isFulcrumSectionSlug(section)) {
    notFound();
  }

  return (
    <FulcrumShell
      sectionSlug={section}
      selectedOrganisationSlug={selectedOrganisationSlug}
    />
  );
}
