import { notFound } from "next/navigation";
import { DisabledFeatureState } from "@/components/disabled-feature-state";
import { TripRiskAssessmentForm } from "@/components/trips/trip-risk-assessment-form";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { organisationHasCapability } from "@/lib/capability-registry";
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

  if (
    !organisationHasCapability(
      selectedOrganisation.capabilityKeys,
      "trips.riskAssessment",
    )
  ) {
    return (
      <DisabledFeatureState
        capability="trips.riskAssessment"
        organisationName={selectedOrganisation.name}
      />
    );
  }

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
