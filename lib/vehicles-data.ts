import {
  getSelectedOrganisation,
  type OrganisationSlug,
} from "@/lib/dashboard-data";
import { canReadOrganisation } from "@/lib/auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import { isAuthenticatedDatabaseMode } from "@/lib/read-access-mode";

export type VehicleStatus = "Available" | "Booked" | "Maintenance" | "Retired";
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
export type VehicleStatusFilter =
  | "all"
  | "available"
  | "booked"
  | "maintenance"
  | "retired";
export type VehicleRegisterFilters = {
  status: VehicleStatusFilter;
};
export type VehicleRegisterSearchParams = {
  status?: string;
};
export type VehicleSummaryCard = {
  count: number;
  description: string;
  filters: Partial<VehicleRegisterFilters>;
  id: string;
  label: string;
};

export type DemoVehicle = {
  id: string;
  organisationId?: string;
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
  organisationId?: string;
  organisationSlug: OrganisationSlug;
  vehicleId: string;
  tripTitle: string;
  requestedBy: string;
  startsAt: string;
  endsAt: string;
  status: VehicleBookingStatus;
  purpose: string;
};

export type VehiclePersistenceState = {
  isDatabaseConfigured: boolean;
  isDatabaseAvailable: boolean;
  organisationId?: string;
};

export type VehicleFormDefaults = {
  id?: string;
  make: string;
  model: string;
  name: string;
  odometerKm: string;
  registration: string;
  status: "AVAILABLE" | "BOOKED" | "MAINTENANCE" | "RETIRED";
  year: string;
};

type PersistedVehicle = {
  id: string;
  organisationId: string;
  name: string;
  registration: string;
  make: string;
  model: string;
  year: number | null;
  status: string;
  odometerKm: number | null;
};

type PersistedVehicleBooking = {
  id: string;
  organisationId: string;
  vehicleId: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  bookedBy: { name: string } | null;
  trip: { title: string } | null;
};

export function getVehiclesForOrganisation(organisationSlug: OrganisationSlug) {
  return demoVehicles.filter(
    (vehicle) => vehicle.organisationSlug === organisationSlug,
  );
}

export function getVehicleRegisterFilters(
  searchParams?: VehicleRegisterSearchParams,
): VehicleRegisterFilters {
  return {
    status: getAllowedValue(searchParams?.status, [
      "all",
      "available",
      "booked",
      "maintenance",
      "retired",
    ] as const),
  };
}

export function filterVehiclesForRegister(
  vehicles: DemoVehicle[],
  filters: VehicleRegisterFilters,
) {
  return vehicles.filter((vehicle) => {
    if (
      filters.status !== "all" &&
      getVehicleStatusFilterValue(vehicle.status) !== filters.status
    ) {
      return false;
    }

    return true;
  });
}

export function hasActiveVehicleRegisterFilters(
  filters: VehicleRegisterFilters,
) {
  return filters.status !== "all";
}

export function getVehicleSummaryCards(
  vehicles: DemoVehicle[],
): VehicleSummaryCard[] {
  return [
    {
      count: vehicles.length,
      description: "All vehicles in this organisation register.",
      filters: { status: "all" },
      id: "total",
      label: "Total vehicles",
    },
    {
      count: countVehiclesByStatus(vehicles, "Available"),
      description: "Ready for allocation or booking review.",
      filters: { status: "available" },
      id: "available",
      label: "Available",
    },
    {
      count: countVehiclesByStatus(vehicles, "Booked"),
      description: "Marked as booked in the register.",
      filters: { status: "booked" },
      id: "booked",
      label: "Booked",
    },
    {
      count: countVehiclesByStatus(vehicles, "Maintenance"),
      description: "Held for maintenance or operational review.",
      filters: { status: "maintenance" },
      id: "maintenance",
      label: "Maintenance",
    },
    {
      count: countVehiclesByStatus(vehicles, "Retired"),
      description: "Retained for history but not active allocation.",
      filters: { status: "retired" },
      id: "retired",
      label: "Retired",
    },
  ];
}

export function getVehicleBookingCounts(bookings: DemoVehicleBooking[]) {
  return bookings.reduce<Record<string, number>>((counts, booking) => {
    counts[booking.vehicleId] = (counts[booking.vehicleId] ?? 0) + 1;

    return counts;
  }, {});
}

export async function getVehiclesForOrganisationWithPersistence(
  organisationSlug: OrganisationSlug,
) {
  const persistedVehicles = await getPersistedVehiclesForOrganisation(
    organisationSlug,
  );

  return persistedVehicles ?? getVehiclesForOrganisation(organisationSlug);
}

export function getVehicleForOrganisation(
  organisationSlug: OrganisationSlug,
  vehicleId: string,
) {
  return getVehiclesForOrganisation(organisationSlug).find(
    (vehicle) => vehicle.id === vehicleId,
  );
}

export async function getVehicleForOrganisationWithPersistence(
  organisationSlug: OrganisationSlug,
  vehicleId: string,
) {
  const vehicles = await getVehiclesForOrganisationWithPersistence(
    organisationSlug,
  );

  return vehicles.find((vehicle) => vehicle.id === vehicleId);
}

export function getVehicleBookingsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  return demoVehicleBookings.filter(
    (booking) => booking.organisationSlug === organisationSlug,
  );
}

export async function getVehicleBookingsForOrganisationWithPersistence(
  organisationSlug: OrganisationSlug,
) {
  const persistedBookings = await getPersistedVehicleBookingsForOrganisation(
    organisationSlug,
  );

  return (
    persistedBookings ?? getVehicleBookingsForOrganisation(organisationSlug)
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

export async function getBookingsForVehicleWithPersistence(
  organisationSlug: OrganisationSlug,
  vehicleId: string,
) {
  const bookings = await getVehicleBookingsForOrganisationWithPersistence(
    organisationSlug,
  );

  return bookings.filter((booking) => booking.vehicleId === vehicleId);
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

export function getVehicleFormDefaults(
  vehicle?: DemoVehicle,
): VehicleFormDefaults {
  return {
    id: vehicle?.id,
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    name: vehicle?.name ?? "",
    odometerKm: vehicle?.odometerKm ? String(vehicle.odometerKm) : "",
    registration: vehicle?.registration ?? "",
    status: vehicle ? mapVehicleStatusToEnum(vehicle.status) : "AVAILABLE",
    year: vehicle?.year ? String(vehicle.year) : "",
  };
}

export function organisationHref(pathname: string, organisationSlug: string) {
  return `${pathname}?org=${organisationSlug}`;
}

export async function getVehiclePersistenceState(
  organisationSlug: OrganisationSlug,
): Promise<VehiclePersistenceState> {
  if (!isDatabaseConfigured()) {
    return {
      isDatabaseAvailable: false,
      isDatabaseConfigured: false,
    };
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      select: { id: true },
      where: { slug: organisationSlug },
    });
    const hasAccess = organisation
      ? await canReadOrganisation(prisma, organisation.id)
      : false;

    return {
      isDatabaseAvailable: Boolean(organisation && hasAccess),
      isDatabaseConfigured: true,
      organisationId: hasAccess ? organisation?.id : undefined,
    };
  } catch {
    return {
      isDatabaseAvailable: false,
      isDatabaseConfigured: true,
    };
  }
}

async function getPersistedVehiclesForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        vehicles: {
          orderBy: {
            name: "asc",
          },
        },
      },
      where: { slug: organisationSlug },
    });

    if (!organisation) {
      return isAuthenticatedDatabaseMode() ? [] : null;
    }

    if (!(await canReadOrganisation(prisma, organisation.id))) {
      return [];
    }

    return organisation.vehicles.map((vehicle) =>
      mapPersistedVehicleToDemoVehicle(organisationSlug, vehicle),
    );
  } catch {
    return isAuthenticatedDatabaseMode() ? [] : null;
  }
}

async function getPersistedVehicleBookingsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        vehicleBookings: {
          include: {
            bookedBy: true,
            trip: true,
          },
          orderBy: {
            startsAt: "asc",
          },
        },
      },
      where: { slug: organisationSlug },
    });

    if (!organisation) {
      return isAuthenticatedDatabaseMode() ? [] : null;
    }

    if (!(await canReadOrganisation(prisma, organisation.id))) {
      return [];
    }

    return organisation.vehicleBookings.map((booking) =>
      mapPersistedBookingToDemoBooking(organisationSlug, booking),
    );
  } catch {
    return isAuthenticatedDatabaseMode() ? [] : null;
  }
}

function mapPersistedVehicleToDemoVehicle(
  organisationSlug: OrganisationSlug,
  vehicle: PersistedVehicle,
): DemoVehicle {
  return {
    id: vehicle.id,
    organisationId: vehicle.organisationId,
    organisationSlug,
    name: vehicle.name,
    registration: vehicle.registration,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year ?? 0,
    status: mapVehicleStatus(vehicle.status),
    odometerKm: vehicle.odometerKm ?? 0,
    homeBase: "Demo depot",
    preStartStatus: "Not recorded",
    equipmentStatus: "Persisted vehicle core details only.",
    notes:
      "Persisted vehicle record. Pre-starts, defects and equipment checks remain placeholders.",
  };
}

function mapPersistedBookingToDemoBooking(
  organisationSlug: OrganisationSlug,
  booking: PersistedVehicleBooking,
): DemoVehicleBooking {
  return {
    id: booking.id,
    organisationId: booking.organisationId,
    organisationSlug,
    vehicleId: booking.vehicleId,
    tripTitle: booking.trip?.title ?? "Persisted booking request",
    requestedBy: booking.bookedBy?.name ?? "Demo Operations Manager",
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    status: mapBookingStatus(booking.status),
    purpose:
      booking.notes ??
      "Persisted booking without linked trip details. Full booking workflow remains future work.",
  };
}

function mapVehicleStatus(status: string): VehicleStatus {
  if (status === "BOOKED") {
    return "Booked";
  }

  if (status === "RETIRED") {
    return "Retired";
  }

  if (status === "MAINTENANCE") {
    return "Maintenance";
  }

  return "Available";
}

function mapVehicleStatusToEnum(
  status: VehicleStatus,
): VehicleFormDefaults["status"] {
  if (status === "Booked") {
    return "BOOKED";
  }

  if (status === "Maintenance") {
    return "MAINTENANCE";
  }

  if (status === "Retired") {
    return "RETIRED";
  }

  return "AVAILABLE";
}

function getVehicleStatusFilterValue(
  status: VehicleStatus,
): Exclude<VehicleStatusFilter, "all"> {
  return status.toLowerCase() as Exclude<VehicleStatusFilter, "all">;
}

function countVehiclesByStatus(vehicles: DemoVehicle[], status: VehicleStatus) {
  return vehicles.filter((vehicle) => vehicle.status === status).length;
}

function getAllowedValue<const T extends readonly string[]>(
  value: string | undefined,
  allowedValues: T,
): T[number] {
  return allowedValues.includes(value ?? "")
    ? (value as T[number])
    : allowedValues[0];
}

function mapBookingStatus(status: string): VehicleBookingStatus {
  if (status === "APPROVED") {
    return "Approved";
  }

  if (status === "ACTIVE") {
    return "Active";
  }

  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  return "Requested";
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
