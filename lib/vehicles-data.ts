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
export type VehicleBookingStatusValue =
  | "REQUESTED"
  | "APPROVED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";
export type VehicleDefectCategoryValue =
  | "MECHANICAL"
  | "SAFETY"
  | "TYRES"
  | "ELECTRICAL"
  | "COMMUNICATIONS"
  | "RECOVERY_GEAR"
  | "BODY"
  | "OTHER";
export type VehicleDefectSeverityValue =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";
export type VehicleDefectStatusValue = "OPEN" | "MONITORING" | "RESOLVED";
export type VehicleMaintenanceTypeValue =
  | "SERVICE"
  | "REPAIR"
  | "INSPECTION"
  | "TYRES"
  | "REGISTRATION"
  | "CLEANING"
  | "OTHER";
export type VehicleMaintenanceStatusValue =
  | "COMPLETED"
  | "SCHEDULED"
  | "DEFERRED";
export type VehicleDefectCategory =
  | "Mechanical"
  | "Safety"
  | "Tyres"
  | "Electrical"
  | "Communications"
  | "Recovery gear"
  | "Body"
  | "Other";
export type VehicleDefectSeverity = "Low" | "Medium" | "High" | "Critical";
export type VehicleDefectStatus = "Open" | "Monitoring" | "Resolved";
export type VehicleMaintenanceType =
  | "Service"
  | "Repair"
  | "Inspection"
  | "Tyres"
  | "Registration"
  | "Cleaning"
  | "Other";
export type VehicleMaintenanceStatus = "Completed" | "Scheduled" | "Deferred";
export type VehicleStatusFilter =
  | "all"
  | "available"
  | "booked"
  | "maintenance"
  | "retired";
export type VehicleBookingStatusFilter =
  | "all"
  | "requested"
  | "approved"
  | "active"
  | "completed"
  | "cancelled";
export type VehicleBookingTimingFilter =
  | "all"
  | "upcoming"
  | "current"
  | "past"
  | "cancelled";
export type VehicleRegisterFilters = {
  bookingStatus: VehicleBookingStatusFilter;
  bookingTiming: VehicleBookingTimingFilter;
  status: VehicleStatusFilter;
};
export type VehicleRegisterSearchParams = {
  bookingStatus?: string;
  bookingTiming?: string;
  status?: string;
};
export type VehicleSummaryCard = {
  count: number;
  description: string;
  filters: Partial<VehicleRegisterFilters>;
  id: string;
  label: string;
};
export type VehicleBookingSummaryCard = {
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
  latestDefectCategory?: VehicleDefectCategory;
  latestDefectReportedAt?: string;
  latestDefectSeverity?: VehicleDefectSeverity;
  latestDefectStatus?: VehicleDefectStatus;
  latestMaintenanceDate?: string;
  latestMaintenanceStatus?: VehicleMaintenanceStatus;
  latestMaintenanceType?: VehicleMaintenanceType;
  maintenanceRecordCount?: number;
  openDefectCount?: number;
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
export type DemoVehiclePreStartChecklist = {
  checkedAt: string;
  communicationsOk: boolean;
  fluidsOk: boolean;
  generalConditionOk: boolean;
  id: string;
  issueNotes?: string;
  lightsOk: boolean;
  odometerKm: number;
  organisationId?: string;
  organisationSlug: OrganisationSlug;
  recoveryGearOk: boolean;
  submittedBy: string;
  tyresOk: boolean;
  vehicleId: string;
};
export type DemoVehicleDefect = {
  category: VehicleDefectCategory;
  categoryValue: VehicleDefectCategoryValue;
  id: string;
  organisationId?: string;
  organisationSlug: OrganisationSlug;
  preStartChecklistId?: string;
  reportedAt: string;
  reportedBy: string;
  severity: VehicleDefectSeverity;
  severityValue: VehicleDefectSeverityValue;
  status: VehicleDefectStatus;
  statusValue: VehicleDefectStatusValue;
  vehicleId: string;
};
export type DemoVehicleMaintenanceRecord = {
  costCents?: number;
  defectId?: string;
  id: string;
  maintenanceDate: string;
  nextDueDate?: string;
  odometerKm?: number;
  organisationId?: string;
  organisationSlug: OrganisationSlug;
  provider?: string;
  recordedBy: string;
  status: VehicleMaintenanceStatus;
  statusValue: VehicleMaintenanceStatusValue;
  type: VehicleMaintenanceType;
  typeValue: VehicleMaintenanceTypeValue;
  vehicleId: string;
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
export type VehicleBookingFormDefaults = {
  endsAt: string;
  id?: string;
  purpose: string;
  requestedBy: string;
  startsAt: string;
  status: VehicleBookingStatusValue;
  tripTitle: string;
  vehicleId: string;
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
  preStartChecklists: PersistedVehiclePreStartChecklist[];
  vehicleDefects: PersistedVehicleDefect[];
  maintenanceRecords: PersistedVehicleMaintenanceRecord[];
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

type PersistedVehiclePreStartChecklist = {
  checkedAt: Date;
  communicationsOk: boolean;
  fluidsOk: boolean;
  generalConditionOk: boolean;
  id: string;
  issueNotes: string | null;
  lightsOk: boolean;
  odometerKm: number;
  organisationId: string;
  recoveryGearOk: boolean;
  submittedBy: { name: string } | null;
  tyresOk: boolean;
  vehicleId: string;
};

type PersistedVehicleDefect = {
  category: string;
  id: string;
  organisationId: string;
  preStartChecklistId: string | null;
  reportedAt: Date;
  reportedBy: { name: string } | null;
  severity: string;
  status: string;
  vehicleId: string;
};

type PersistedVehicleMaintenanceRecord = {
  costCents: number | null;
  defectId: string | null;
  id: string;
  maintenanceDate: Date;
  nextDueDate: Date | null;
  odometerKm: number | null;
  organisationId: string;
  provider: string | null;
  recordedBy: { name: string } | null;
  status: string;
  type: string;
  vehicleId: string;
};

export const vehicleDefectCategoryOptions: Array<{
  label: VehicleDefectCategory;
  value: VehicleDefectCategoryValue;
}> = [
  { label: "Mechanical", value: "MECHANICAL" },
  { label: "Safety", value: "SAFETY" },
  { label: "Tyres", value: "TYRES" },
  { label: "Electrical", value: "ELECTRICAL" },
  { label: "Communications", value: "COMMUNICATIONS" },
  { label: "Recovery gear", value: "RECOVERY_GEAR" },
  { label: "Body", value: "BODY" },
  { label: "Other", value: "OTHER" },
];

export const vehicleDefectSeverityOptions: Array<{
  label: VehicleDefectSeverity;
  value: VehicleDefectSeverityValue;
}> = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" },
];

export const vehicleDefectStatusOptions: Array<{
  label: VehicleDefectStatus;
  value: VehicleDefectStatusValue;
}> = [
  { label: "Open", value: "OPEN" },
  { label: "Monitoring", value: "MONITORING" },
  { label: "Resolved", value: "RESOLVED" },
];

export const vehicleMaintenanceTypeOptions: Array<{
  label: VehicleMaintenanceType;
  value: VehicleMaintenanceTypeValue;
}> = [
  { label: "Service", value: "SERVICE" },
  { label: "Repair", value: "REPAIR" },
  { label: "Inspection", value: "INSPECTION" },
  { label: "Tyres", value: "TYRES" },
  { label: "Registration", value: "REGISTRATION" },
  { label: "Cleaning", value: "CLEANING" },
  { label: "Other", value: "OTHER" },
];

export const vehicleMaintenanceStatusOptions: Array<{
  label: VehicleMaintenanceStatus;
  value: VehicleMaintenanceStatusValue;
}> = [
  { label: "Completed", value: "COMPLETED" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Deferred", value: "DEFERRED" },
];

export function getVehiclesForOrganisation(organisationSlug: OrganisationSlug) {
  return demoVehicles.filter(
    (vehicle) => vehicle.organisationSlug === organisationSlug,
  );
}

export function getVehicleRegisterFilters(
  searchParams?: VehicleRegisterSearchParams,
): VehicleRegisterFilters {
  return {
    bookingStatus: getAllowedValue(searchParams?.bookingStatus, [
      "all",
      "requested",
      "approved",
      "active",
      "completed",
      "cancelled",
    ] as const),
    bookingTiming: getAllowedValue(searchParams?.bookingTiming, [
      "all",
      "upcoming",
      "current",
      "past",
      "cancelled",
    ] as const),
    status: getAllowedValue(searchParams?.status, [
      "all",
      "available",
      "booked",
      "maintenance",
      "retired",
    ] as const),
  };
}

export function filterVehicleBookingsForRegister(
  bookings: DemoVehicleBooking[],
  filters: VehicleRegisterFilters,
) {
  return bookings.filter((booking) => {
    if (
      filters.bookingStatus !== "all" &&
      getVehicleBookingStatusFilterValue(booking.status) !==
        filters.bookingStatus
    ) {
      return false;
    }

    if (
      filters.bookingTiming !== "all" &&
      getVehicleBookingTimingState(booking).value !== filters.bookingTiming
    ) {
      return false;
    }

    return true;
  });
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

export function getVehicleBookingSummaryCards(
  bookings: DemoVehicleBooking[],
): VehicleBookingSummaryCard[] {
  return [
    {
      count: bookings.length,
      description: "All bookings in this organisation.",
      filters: {
        bookingStatus: "all",
        bookingTiming: "all",
      },
      id: "total-bookings",
      label: "Total bookings",
    },
    {
      count: filterVehicleBookingsForRegister(bookings, {
        ...getVehicleRegisterFilters(),
        bookingTiming: "upcoming",
      }).length,
      description: "Future non-cancelled bookings.",
      filters: { bookingTiming: "upcoming" },
      id: "upcoming-bookings",
      label: "Upcoming",
    },
    {
      count: filterVehicleBookingsForRegister(bookings, {
        ...getVehicleRegisterFilters(),
        bookingTiming: "current",
      }).length,
      description: "Currently inside the booking window.",
      filters: { bookingTiming: "current" },
      id: "current-bookings",
      label: "Active now",
    },
    {
      count: filterVehicleBookingsForRegister(bookings, {
        ...getVehicleRegisterFilters(),
        bookingStatus: "requested",
      }).length,
      description: "Requested bookings needing coordinator review.",
      filters: { bookingStatus: "requested" },
      id: "requested-bookings",
      label: "Requested",
    },
    {
      count: filterVehicleBookingsForRegister(bookings, {
        ...getVehicleRegisterFilters(),
        bookingTiming: "cancelled",
      }).length,
      description: "Cancelled bookings retained for visibility.",
      filters: { bookingTiming: "cancelled" },
      id: "cancelled-bookings",
      label: "Cancelled",
    },
  ];
}

export function getVehicleBookingTimingState(booking: DemoVehicleBooking): {
  label: "Upcoming" | "Active now" | "Past" | "Cancelled";
  value: Exclude<VehicleBookingTimingFilter, "all">;
} {
  if (booking.status === "Cancelled") {
    return {
      label: "Cancelled",
      value: "cancelled",
    };
  }

  const now = new Date();
  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(booking.endsAt);

  if (booking.status === "Completed" || endsAt < now) {
    return {
      label: "Past",
      value: "past",
    };
  }

  if (startsAt <= now && endsAt >= now) {
    return {
      label: "Active now",
      value: "current",
    };
  }

  return {
    label: "Upcoming",
    value: "upcoming",
  };
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

export async function getVehicleBookingForOrganisationWithPersistence(
  organisationSlug: OrganisationSlug,
  bookingId: string,
) {
  const bookings = await getVehicleBookingsForOrganisationWithPersistence(
    organisationSlug,
  );

  return bookings.find((booking) => booking.id === bookingId);
}

export async function getLatestVehiclePreStartForOrganisationWithPersistence(
  organisationSlug: OrganisationSlug,
  vehicleId: string,
) {
  const preStarts = await getPersistedVehiclePreStartsForOrganisation(
    organisationSlug,
  );

  if (!preStarts) {
    return null;
  }

  return preStarts.find((preStart) => preStart.vehicleId === vehicleId) ?? null;
}

export async function getVehicleDefectsForVehicleWithPersistence(
  organisationSlug: OrganisationSlug,
  vehicleId: string,
) {
  const persistedDefects = await getPersistedVehicleDefectsForOrganisation(
    organisationSlug,
  );

  if (persistedDefects) {
    return persistedDefects.filter((defect) => defect.vehicleId === vehicleId);
  }

  return getVehicleDefectsForOrganisation(organisationSlug).filter(
    (defect) => defect.vehicleId === vehicleId,
  );
}

export function getVehicleDefectsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  return demoVehicleDefects.filter(
    (defect) => defect.organisationSlug === organisationSlug,
  );
}

export async function getVehicleMaintenanceRecordsForVehicleWithPersistence(
  organisationSlug: OrganisationSlug,
  vehicleId: string,
) {
  const persistedRecords = await getPersistedVehicleMaintenanceRecordsForOrganisation(
    organisationSlug,
  );

  if (persistedRecords) {
    return persistedRecords.filter((record) => record.vehicleId === vehicleId);
  }

  return getVehicleMaintenanceRecordsForOrganisation(organisationSlug).filter(
    (record) => record.vehicleId === vehicleId,
  );
}

export function getVehicleMaintenanceRecordsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  return demoVehicleMaintenanceRecords.filter(
    (record) => record.organisationSlug === organisationSlug,
  );
}

export function getBookingFormDefaults(
  organisationSlug: OrganisationSlug,
  vehicleId?: string,
  booking?: DemoVehicleBooking,
): VehicleBookingFormDefaults {
  const organisation = getSelectedOrganisation(organisationSlug);
  const organisationVehicles = getVehiclesForOrganisation(organisationSlug);
  const selectedVehicle = organisationVehicles.find(
    (vehicle) => vehicle.id === (booking?.vehicleId ?? vehicleId),
  );
  const defaultVehicleId =
    booking?.vehicleId ?? selectedVehicle?.id ?? organisationVehicles[0]?.id ?? "";

  return {
    endsAt: booking?.endsAt ?? "",
    id: booking?.id,
    purpose:
      booking?.purpose ?? `Demo booking request for ${organisation.name}.`,
    requestedBy: booking?.requestedBy ?? "Demo Operations Manager",
    startsAt: booking?.startsAt ?? "",
    status: booking
      ? mapBookingStatusToEnum(booking.status)
      : ("REQUESTED" as VehicleBookingStatusValue),
    tripTitle: booking?.tripTitle ?? "",
    vehicleId: defaultVehicleId,
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
          include: {
            preStartChecklists: {
              include: {
                submittedBy: true,
              },
              orderBy: {
                checkedAt: "desc",
              },
              take: 1,
            },
            vehicleDefects: {
              include: {
                reportedBy: true,
              },
              orderBy: {
                reportedAt: "desc",
              },
              where: {
                status: {
                  not: "RESOLVED",
                },
              },
            },
            maintenanceRecords: {
              include: {
                recordedBy: true,
              },
              orderBy: {
                maintenanceDate: "desc",
              },
              take: 1,
            },
          },
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

async function getPersistedVehicleMaintenanceRecordsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        vehicleMaintenanceRecords: {
          include: {
            recordedBy: true,
          },
          orderBy: {
            maintenanceDate: "desc",
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

    return organisation.vehicleMaintenanceRecords.map((record) =>
      mapPersistedMaintenanceRecordToDemoMaintenanceRecord(
        organisationSlug,
        record,
      ),
    );
  } catch {
    return isAuthenticatedDatabaseMode() ? [] : null;
  }
}

async function getPersistedVehiclePreStartsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        vehiclePreStartChecklists: {
          include: {
            submittedBy: true,
          },
          orderBy: {
            checkedAt: "desc",
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

    return organisation.vehiclePreStartChecklists.map((preStart) =>
      mapPersistedPreStartToDemoPreStart(organisationSlug, preStart),
    );
  } catch {
    return isAuthenticatedDatabaseMode() ? [] : null;
  }
}

async function getPersistedVehicleDefectsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        vehicleDefects: {
          include: {
            reportedBy: true,
          },
          orderBy: {
            reportedAt: "desc",
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

    return organisation.vehicleDefects.map((defect) =>
      mapPersistedDefectToDemoDefect(organisationSlug, defect),
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
  const latestPreStart = vehicle.preStartChecklists[0];
  const latestDefect = vehicle.vehicleDefects[0];
  const latestMaintenanceRecord = vehicle.maintenanceRecords[0];

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
    preStartStatus: latestPreStart
      ? getPreStartStatusFromChecklist(latestPreStart)
      : "Not recorded",
    equipmentStatus: "Persisted vehicle core details only.",
    notes:
      "Persisted vehicle record with tenant-guarded booking, pre-start and defect visibility.",
    latestDefectCategory: latestDefect
      ? mapDefectCategory(latestDefect.category)
      : undefined,
    latestDefectReportedAt: latestDefect?.reportedAt.toISOString(),
    latestDefectSeverity: latestDefect
      ? mapDefectSeverity(latestDefect.severity)
      : undefined,
    latestDefectStatus: latestDefect
      ? mapDefectStatus(latestDefect.status)
      : undefined,
    latestMaintenanceDate: latestMaintenanceRecord?.maintenanceDate.toISOString(),
    latestMaintenanceStatus: latestMaintenanceRecord
      ? mapMaintenanceStatus(latestMaintenanceRecord.status)
      : undefined,
    latestMaintenanceType: latestMaintenanceRecord
      ? mapMaintenanceType(latestMaintenanceRecord.type)
      : undefined,
    maintenanceRecordCount: vehicle.maintenanceRecords.length,
    openDefectCount: vehicle.vehicleDefects.length,
  };
}

function mapPersistedPreStartToDemoPreStart(
  organisationSlug: OrganisationSlug,
  preStart: PersistedVehiclePreStartChecklist,
): DemoVehiclePreStartChecklist {
  return {
    checkedAt: preStart.checkedAt.toISOString(),
    communicationsOk: preStart.communicationsOk,
    fluidsOk: preStart.fluidsOk,
    generalConditionOk: preStart.generalConditionOk,
    id: preStart.id,
    issueNotes: preStart.issueNotes ?? undefined,
    lightsOk: preStart.lightsOk,
    odometerKm: preStart.odometerKm,
    organisationId: preStart.organisationId,
    organisationSlug,
    recoveryGearOk: preStart.recoveryGearOk,
    submittedBy: preStart.submittedBy?.name ?? "Demo Operations Manager",
    tyresOk: preStart.tyresOk,
    vehicleId: preStart.vehicleId,
  };
}

function mapPersistedDefectToDemoDefect(
  organisationSlug: OrganisationSlug,
  defect: PersistedVehicleDefect,
): DemoVehicleDefect {
  return {
    category: mapDefectCategory(defect.category),
    categoryValue: mapDefectCategoryValue(defect.category),
    id: defect.id,
    organisationId: defect.organisationId,
    organisationSlug,
    preStartChecklistId: defect.preStartChecklistId ?? undefined,
    reportedAt: defect.reportedAt.toISOString(),
    reportedBy: defect.reportedBy?.name ?? "Demo Operations Manager",
    severity: mapDefectSeverity(defect.severity),
    severityValue: mapDefectSeverityValue(defect.severity),
    status: mapDefectStatus(defect.status),
    statusValue: mapDefectStatusValue(defect.status),
    vehicleId: defect.vehicleId,
  };
}

function mapPersistedMaintenanceRecordToDemoMaintenanceRecord(
  organisationSlug: OrganisationSlug,
  record: PersistedVehicleMaintenanceRecord,
): DemoVehicleMaintenanceRecord {
  return {
    costCents: record.costCents ?? undefined,
    defectId: record.defectId ?? undefined,
    id: record.id,
    maintenanceDate: record.maintenanceDate.toISOString(),
    nextDueDate: record.nextDueDate?.toISOString(),
    odometerKm: record.odometerKm ?? undefined,
    organisationId: record.organisationId,
    organisationSlug,
    provider: record.provider ?? undefined,
    recordedBy: record.recordedBy?.name ?? "Demo Operations Manager",
    status: mapMaintenanceStatus(record.status),
    statusValue: mapMaintenanceStatusValue(record.status),
    type: mapMaintenanceType(record.type),
    typeValue: mapMaintenanceTypeValue(record.type),
    vehicleId: record.vehicleId,
  };
}

function getPreStartStatusFromChecklist(
  preStart: Pick<
    PersistedVehiclePreStartChecklist,
    | "communicationsOk"
    | "fluidsOk"
    | "generalConditionOk"
    | "issueNotes"
    | "lightsOk"
    | "recoveryGearOk"
    | "tyresOk"
  >,
): PreStartStatus {
  if (
    !preStart.tyresOk ||
    !preStart.lightsOk ||
    !preStart.fluidsOk ||
    !preStart.communicationsOk ||
    !preStart.recoveryGearOk ||
    !preStart.generalConditionOk ||
    Boolean(preStart.issueNotes?.trim())
  ) {
    return "Issue reported";
  }

  return "Ready";
}

function mapPersistedBookingToDemoBooking(
  organisationSlug: OrganisationSlug,
  booking: PersistedVehicleBooking,
): DemoVehicleBooking {
  const parsedNotes = parseBookingNotes(booking.notes);

  return {
    id: booking.id,
    organisationId: booking.organisationId,
    organisationSlug,
    vehicleId: booking.vehicleId,
    tripTitle:
      booking.trip?.title ?? parsedNotes.tripTitle ?? "Persisted booking request",
    requestedBy: booking.bookedBy?.name ?? "Demo Operations Manager",
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    status: mapBookingStatus(booking.status),
    purpose:
      parsedNotes.purpose ??
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

function mapDefectCategoryValue(category: string): VehicleDefectCategoryValue {
  return vehicleDefectCategoryOptions.some((option) => option.value === category)
    ? (category as VehicleDefectCategoryValue)
    : "OTHER";
}

function mapDefectCategory(category: string): VehicleDefectCategory {
  return (
    vehicleDefectCategoryOptions.find(
      (option) => option.value === mapDefectCategoryValue(category),
    )?.label ?? "Other"
  );
}

function mapDefectSeverityValue(severity: string): VehicleDefectSeverityValue {
  return vehicleDefectSeverityOptions.some((option) => option.value === severity)
    ? (severity as VehicleDefectSeverityValue)
    : "LOW";
}

function mapDefectSeverity(severity: string): VehicleDefectSeverity {
  return (
    vehicleDefectSeverityOptions.find(
      (option) => option.value === mapDefectSeverityValue(severity),
    )?.label ?? "Low"
  );
}

function mapDefectStatusValue(status: string): VehicleDefectStatusValue {
  return vehicleDefectStatusOptions.some((option) => option.value === status)
    ? (status as VehicleDefectStatusValue)
    : "OPEN";
}

function mapDefectStatus(status: string): VehicleDefectStatus {
  return (
    vehicleDefectStatusOptions.find(
      (option) => option.value === mapDefectStatusValue(status),
    )?.label ?? "Open"
  );
}

function mapMaintenanceTypeValue(type: string): VehicleMaintenanceTypeValue {
  return vehicleMaintenanceTypeOptions.some((option) => option.value === type)
    ? (type as VehicleMaintenanceTypeValue)
    : "OTHER";
}

function mapMaintenanceType(type: string): VehicleMaintenanceType {
  return (
    vehicleMaintenanceTypeOptions.find(
      (option) => option.value === mapMaintenanceTypeValue(type),
    )?.label ?? "Other"
  );
}

function mapMaintenanceStatusValue(
  status: string,
): VehicleMaintenanceStatusValue {
  return vehicleMaintenanceStatusOptions.some(
    (option) => option.value === status,
  )
    ? (status as VehicleMaintenanceStatusValue)
    : "COMPLETED";
}

function mapMaintenanceStatus(status: string): VehicleMaintenanceStatus {
  return (
    vehicleMaintenanceStatusOptions.find(
      (option) => option.value === mapMaintenanceStatusValue(status),
    )?.label ?? "Completed"
  );
}

function getVehicleStatusFilterValue(
  status: VehicleStatus,
): Exclude<VehicleStatusFilter, "all"> {
  return status.toLowerCase() as Exclude<VehicleStatusFilter, "all">;
}

function getVehicleBookingStatusFilterValue(
  status: VehicleBookingStatus,
): Exclude<VehicleBookingStatusFilter, "all"> {
  return status.toLowerCase() as Exclude<VehicleBookingStatusFilter, "all">;
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

function mapBookingStatusToEnum(
  status: VehicleBookingStatus,
): VehicleBookingStatusValue {
  if (status === "Approved") {
    return "APPROVED";
  }

  if (status === "Active") {
    return "ACTIVE";
  }

  if (status === "Completed") {
    return "COMPLETED";
  }

  if (status === "Cancelled") {
    return "CANCELLED";
  }

  return "REQUESTED";
}

function parseBookingNotes(notes: string | null) {
  if (!notes) {
    return {
      purpose: null,
      tripTitle: null,
    };
  }

  const [tripTitle, ...purposeParts] = notes.split(": ");
  const purpose = purposeParts.join(": ").trim();

  if (!tripTitle || !purpose) {
    return {
      purpose: notes,
      tripTitle: null,
    };
  }

  return {
    purpose,
    tripTitle,
  };
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
    latestMaintenanceDate: "2026-07-22T01:00:00.000Z",
    latestMaintenanceStatus: "Completed",
    latestMaintenanceType: "Service",
    maintenanceRecordCount: 1,
    notes: "Fake vehicle record for journey planning demos only.",
    openDefectCount: 0,
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
    latestMaintenanceDate: "2026-07-08T02:00:00.000Z",
    latestMaintenanceStatus: "Completed",
    latestMaintenanceType: "Inspection",
    maintenanceRecordCount: 1,
    notes: "Fake ute available for local operations in the selected tenant.",
    openDefectCount: 0,
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
    notes: "Fake maintenance signal with a demo defect summary only.",
    latestDefectCategory: "Electrical",
    latestDefectReportedAt: "2026-08-04T01:30:00.000Z",
    latestDefectSeverity: "High",
    latestDefectStatus: "Open",
    latestMaintenanceDate: "2026-08-05T03:00:00.000Z",
    latestMaintenanceStatus: "Deferred",
    latestMaintenanceType: "Repair",
    maintenanceRecordCount: 1,
    openDefectCount: 1,
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
    maintenanceRecordCount: 0,
    notes: "Fake internal pool vehicle separate from partner ranger data.",
    openDefectCount: 0,
  },
];

export const demoVehicleDefects: DemoVehicleDefect[] = [
  {
    category: "Electrical",
    categoryValue: "ELECTRICAL",
    id: "defect-demo-troopy-lights",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    reportedAt: "2026-08-04T01:30:00.000Z",
    reportedBy: "Demo Ranger",
    severity: "High",
    severityValue: "HIGH",
    status: "Open",
    statusValue: "OPEN",
    vehicleId: "demo-troopy",
  },
];

export const demoVehicleMaintenanceRecords: DemoVehicleMaintenanceRecord[] = [
  {
    id: "maintenance-demo-landcruiser-service",
    maintenanceDate: "2026-07-22T01:00:00.000Z",
    odometerKm: 67220,
    organisationSlug: "ropes-demo-aboriginal-corporation",
    provider: "Demo regional workshop",
    recordedBy: "Demo Operations Manager",
    status: "Completed",
    statusValue: "COMPLETED",
    type: "Service",
    typeValue: "SERVICE",
    vehicleId: "demo-landcruiser-1",
  },
  {
    id: "maintenance-demo-ranger-ute-inspection",
    maintenanceDate: "2026-07-08T02:00:00.000Z",
    odometerKm: 50910,
    organisationSlug: "ropes-demo-aboriginal-corporation",
    provider: "Demo depot",
    recordedBy: "Demo Head Ranger",
    status: "Completed",
    statusValue: "COMPLETED",
    type: "Inspection",
    typeValue: "INSPECTION",
    vehicleId: "demo-ranger-ute",
  },
  {
    costCents: 185000,
    defectId: "defect-demo-troopy-lights",
    id: "maintenance-demo-troopy-lights",
    maintenanceDate: "2026-08-05T03:00:00.000Z",
    nextDueDate: "2026-08-16T00:00:00.000Z",
    odometerKm: 90240,
    organisationSlug: "ropes-demo-aboriginal-corporation",
    provider: "Demo regional auto electrician",
    recordedBy: "Demo Ranger",
    status: "Deferred",
    statusValue: "DEFERRED",
    type: "Repair",
    typeValue: "REPAIR",
    vehicleId: "demo-troopy",
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
