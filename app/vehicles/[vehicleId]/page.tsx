import { notFound } from "next/navigation";
import { VehicleDetail } from "@/components/vehicles/vehicle-detail";
import { getSelectedOrganisation } from "@/lib/dashboard-data";
import {
  getBookingsForVehicle,
  getVehicleForOrganisation,
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
  const vehicle = getVehicleForOrganisation(selectedOrganisation.slug, vehicleId);

  if (!vehicle) {
    notFound();
  }

  return (
    <VehicleDetail
      bookings={getBookingsForVehicle(selectedOrganisation.slug, vehicle.id)}
      organisationName={selectedOrganisation.name}
      organisationSlug={selectedOrganisation.slug}
      vehicle={vehicle}
    />
  );
}
