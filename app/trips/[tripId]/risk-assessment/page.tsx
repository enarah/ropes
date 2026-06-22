import { notFound } from "next/navigation";
import { TripRiskAssessmentForm } from "@/components/trips/trip-risk-assessment-form";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getTripForOrganisationWithPersistence,
  getTripPersistenceState,
} from "@/lib/trips-data";

type TripRiskAssessmentPageProps = {
  params: Promise<{
    tripId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export default async function TripRiskAssessmentPage({
  params,
  searchParams,
}: TripRiskAssessmentPageProps) {
  const { tripId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [trip, persistence] = await Promise.all([
    getTripForOrganisationWithPersistence(selectedOrganisation.slug, tripId),
    getTripPersistenceState(selectedOrganisation.slug),
  ]);

  if (!trip) {
    notFound();
  }

  return (
    <TripRiskAssessmentForm
      error={resolvedSearchParams?.error}
      organisationId={persistence.organisationId}
      organisationName={selectedOrganisation.name}
      organisationSlug={selectedOrganisation.slug}
      persistenceEnabled={persistence.isDatabaseAvailable}
      saved={resolvedSearchParams?.saved}
      trip={trip}
    />
  );
}
