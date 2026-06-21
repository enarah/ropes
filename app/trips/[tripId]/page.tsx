import { notFound } from "next/navigation";
import { TripsDetail } from "@/components/trips/trips-detail";
import { getSelectedOrganisation } from "@/lib/dashboard-data";
import { getTripForOrganisationWithPersistence } from "@/lib/trips-data";

type TripDetailPageProps = {
  params: Promise<{
    tripId: string;
  }>;
  searchParams?: Promise<{
    org?: string;
  }>;
};

export default async function TripDetailPage({
  params,
  searchParams,
}: TripDetailPageProps) {
  const { tripId } = await params;
  const selectedOrganisation = getSelectedOrganisation((await searchParams)?.org);
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
      trip={trip}
    />
  );
}
