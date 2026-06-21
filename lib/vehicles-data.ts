import {
  getSelectedOrganisation,
  type OrganisationSlug,
} from "@/lib/dashboard-data";

export type VehicleStatus = "Available" | "Booked" | "Maintenance";
export type PreStartStatus =
  | "Ready"
  | "Due today"
  | "Issue reported"
  | "Not recorded";
export type VehicleBookingStatus =
  | "Requested"
  | "Approved"
  | "Active"
  | "Completed"
  | "Cancelled";

export type DemoVehicle = {
  id: string;
  organisationSlug: OrganisationSlug;
  name: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  status: VehicleStatus;
  odometerKm: number;
  homeBase: string;
  preStartStatus: PreStartStatus;
  equipmentStatus: string;
  notes: string;
};

export type DemoVehicleBooking = {
  id: string;
  organisationSlug: OrganisationSlug;
  vehicleId: string;
  tripTitle: string;
  requestedBy: string;
  startsAt: string;
  endsAt: string;
  status: VehicleBookingStatus;
  purpose: string;
};

export function getVehiclesForOrganisation(organisationSlug: OrganisationSlug) {
  return demoVehicles.filter(
    (vehicle) => vehicle.organisationSlug === organisationSlug,
  );
}

export function getVehicleForOrganisation(
  organisationSlug: OrganisationSlug,
  vehicleId: string,
) {
  return getVehiclesForOrganisation(organisationSlug).find(
    (vehicle) => vehicle.id === vehicleId,
  );
}

export function getVehicleBookingsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  return demoVehicleBookings.filter(
    (booking) => booking.organisationSlug === organisationSlug,
  );
}

export function getBookingsForVehicle(
  organisationSlug: OrganisationSlug,
  vehicleId: string,
) {
  return getVehicleBookingsForOrganisation(organisationSlug).filter(
    (booking) => booking.vehicleId === vehicleId,
  );
}

export function getBookingFormDefaults(
  organisationSlug: OrganisationSlug,
  vehicleId?: string,
) {
  const organisation = getSelectedOrganisation(organisationSlug);
  const organisationVehicles = getVehiclesForOrganisation(organisationSlug);
  const selectedVehicle = organisationVehicles.find(
    (vehicle) => vehicle.id === vehicleId,
  );
  const defaultVehicleId =
    selectedVehicle?.id ?? organisationVehicles[0]?.id ?? "";

  return {
    organisationSlug,
    vehicleId: defaultVehicleId,
    tripTitle: "",
    requestedBy: "Demo Operations Manager",
    startsAt: "",
    endsAt: "",
    status: "Requested" as VehicleBookingStatus,
    purpose: `Demo booking request for ${organisation.name}.`,
  };
}

export function organisationHref(pathname: string, organisationSlug: string) {
  return `${pathname}?org=${organisationSlug}`;
}

export const demoVehicles: DemoVehicle[] = [
  {
    id: "demo-landcruiser-1",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    name: "Demo LandCruiser 1",
    registration: "DEMO-001",
    make: "Toyota",
    model: "LandCruiser",
    year: 2021,
    status: "Booked",
    odometerKm: 68420,
    homeBase: "Demo Ranger Depot",
    preStartStatus: "Due today",
    equipmentStatus: "Satellite phone placeholder assigned",
    notes: "Fake vehicle record for journey planning demos only.",
  },
  {
    id: "demo-ranger-ute",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    name: "Demo Ranger Ute",
    registration: "DEMO-002",
    make: "Ford",
    model: "Ranger",
    year: 2020,
    status: "Available",
    odometerKm: 51280,
    homeBase: "Demo Ranger Depot",
    preStartStatus: "Ready",
    equipmentStatus: "Recovery kit placeholder checked",
    notes: "Fake ute available for local operations in the selected tenant.",
  },
  {
    id: "demo-troopy",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    name: "Demo Troopy",
    registration: "DEMO-003",
    make: "Toyota",
    model: "Troop Carrier",
    year: 2019,
    status: "Maintenance",
    odometerKm: 90215,
    homeBase: "Demo Workshop",
    preStartStatus: "Issue reported",
    equipmentStatus: "First aid kit placeholder needs review",
    notes: "Fake maintenance signal. No defect workflow exists yet.",
  },
  {
    id: "demo-enarah-pool-vehicle",
    organisationSlug: "demo-enarah-services",
    name: "Demo Enarah Pool Vehicle",
    registration: "EN-DEMO-01",
    make: "Subaru",
    model: "Forester",
    year: 2022,
    status: "Available",
    odometerKm: 21450,
    homeBase: "Demo Enarah Office",
    preStartStatus: "Not recorded",
    equipmentStatus: "Office travel kit placeholder",
    notes: "Fake internal pool vehicle separate from partner ranger data.",
  },
];

export const demoVehicleBookings: DemoVehicleBooking[] = [
  {
    id: "booking-water-point-inspection",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    vehicleId: "demo-landcruiser-1",
    tripTitle: "Demo Water Point Inspection Trip",
    requestedBy: "Demo Head Ranger",
    startsAt: "2026-08-10T22:30:00.000Z",
    endsAt: "2026-08-12T07:30:00.000Z",
    status: "Approved",
    purpose: "Fake remote inspection journey booking.",
  },
  {
    id: "booking-overlap-training",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    vehicleId: "demo-landcruiser-1",
    tripTitle: "Demo Driver Training Hold",
    requestedBy: "Demo Operations Manager",
    startsAt: "2026-08-11T00:30:00.000Z",
    endsAt: "2026-08-11T04:30:00.000Z",
    status: "Requested",
    purpose: "Fake overlapping hold to test warning behaviour.",
  },
  {
    id: "booking-track-condition-check",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    vehicleId: "demo-ranger-ute",
    tripTitle: "Demo Track Condition Check",
    requestedBy: "Demo Ranger",
    startsAt: "2026-08-18T23:00:00.000Z",
    endsAt: "2026-08-19T06:30:00.000Z",
    status: "Requested",
    purpose: "Fake access track condition run.",
  },
  {
    id: "booking-partner-visit",
    organisationSlug: "demo-enarah-services",
    vehicleId: "demo-enarah-pool-vehicle",
    tripTitle: "Demo Partner Visit Planning",
    requestedBy: "Demo Enarah Admin",
    startsAt: "2026-08-22T00:30:00.000Z",
    endsAt: "2026-08-22T07:00:00.000Z",
    status: "Approved",
    purpose: "Fake internal partner support travel.",
  },
];
