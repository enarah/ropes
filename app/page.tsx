import { DashboardContent } from "@/components/dashboard-content";

type HomeProps = {
  searchParams?: Promise<{
    org?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const selectedOrganisationSlug = (await searchParams)?.org;

  return (
    <DashboardContent
      moduleSlug="overview"
      selectedOrganisationSlug={selectedOrganisationSlug}
    />
  );
}
