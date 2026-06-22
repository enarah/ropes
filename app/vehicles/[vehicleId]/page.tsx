import { notFound } from "next/navigation";
import { VehicleDetail } from "@/components/vehicles/vehicle-detail";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getBookingsForVehicleWithPersistence,
  getVehicleForOrganisationWithPersistence,
} from "@/lib/vehicles-data";

type VehicleDetailPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams?: Promise<{
    org?: string;
    saved?: string;
  }>;
};

export default async function VehicleDetailPage({
  params,
  searchParams,
}: VehicleDetailPageProps) {
  const { vehicleId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const vehicle = await getVehicleForOrganisationWithPersistence(
    selectedOrganisation.slug,
    vehicleId,
  );

  if (!vehicle) {
    notFound();
  }

  const bookings = await getBookingsForVehicleWithPersistence(
    selectedOrganisation.slug,
    vehicle.id,
  );

  return (
    <VehicleDetail
      bookings={bookings}
      capabilityKeys={selectedOrganisation.capabilityKeys}
      organisationName={selectedOrganisation.name}
      organisationSlug={selectedOrganisation.slug}
      saved={resolvedSearchParams?.saved}
      vehicle={vehicle}
    />
  );
}
