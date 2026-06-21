import { DashboardContent } from "@/components/dashboard-content";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";

type HomeProps = {
  searchParams?: Promise<{
    org?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const selectedOrganisationSlug = (await searchParams)?.org;
  const access = await getOrganisationPageAccess(selectedOrganisationSlug);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  return (
    <DashboardContent
      moduleSlug="overview"
      organisation={access.organisation}
      selectedOrganisationSlug={selectedOrganisationSlug}
    />
  );
}
