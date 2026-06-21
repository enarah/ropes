import { notFound } from "next/navigation";
import { VehicleDetail } from "@/components/vehicles/vehicle-detail";
import { getSelectedOrganisation } from "@/lib/dashboard-data";
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
  }>;
};

export default async function VehicleDetailPage({
  params,
  searchParams,
}: VehicleDetailPageProps) {
  const { vehicleId } = await params;
  const selectedOrganisation = getSelectedOrganisation((await searchParams)?.org);
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
      organisationName={selectedOrganisation.name}
      organisationSlug={selectedOrganisation.slug}
      vehicle={vehicle}
    />
  );
}
