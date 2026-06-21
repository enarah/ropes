import { notFound } from "next/navigation";
import { VehicleBookingDetail } from "@/components/vehicles/vehicle-booking-detail";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  getVehicleBookingForOrganisationWithPersistence,
  getVehiclesForOrganisationWithPersistence,
} from "@/lib/vehicles-data";

type VehicleBookingDetailPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
  searchParams?: Promise<{
    org?: string;
    saved?: string;
  }>;
};

export default async function VehicleBookingDetailPage({
  params,
  searchParams,
}: VehicleBookingDetailPageProps) {
  const { bookingId } = await params;
  const resolvedSearchParams = await searchParams;
  const access = await getOrganisationPageAccess(resolvedSearchParams?.org);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  const selectedOrganisation = access.organisation;
  const [booking, vehicles] = await Promise.all([
    getVehicleBookingForOrganisationWithPersistence(
      selectedOrganisation.slug,
      bookingId,
    ),
    getVehiclesForOrganisationWithPersistence(selectedOrganisation.slug),
  ]);

  if (!booking) {
    notFound();
  }

  const vehicle = vehicles.find((item) => item.id === booking.vehicleId);

  return (
    <VehicleBookingDetail
      booking={booking}
      organisationName={selectedOrganisation.name}
      organisationSlug={selectedOrganisation.slug}
      saved={resolvedSearchParams?.saved}
      vehicle={vehicle}
    />
  );
}
