import { notFound } from "next/navigation";
import { TripsDetail } from "@/components/trips/trips-detail";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import { getTripForOrganisationWithPersistence } from "@/lib/trips-data";

type TripDetailPageProps = {
  params: Promise<{
    tripId: string;
  }>;
  searchParams?: Promise<{
    approval?: string;
    org?: string;
  }>;
};

export default async function TripDetailPage({
  params,
  searchParams,
}: TripDetailPageProps) {
  const { tripId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const trip = await getTripForOrganisationWithPersistence(
    selectedOrganisation.slug,
    tripId,
  );

  if (!trip) {
    notFound();
  }

  return (
    <TripsDetail
      organisationName={selectedOrganisation.name}
      organisationSlug={selectedOrganisation.slug}
      approvalResult={resolvedSearchParams?.approval}
      capabilityKeys={selectedOrganisation.capabilityKeys}
      trip={trip}
    />
  );
}
