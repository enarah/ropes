import {
  getSelectedOrganisation,
  type OrganisationSlug,
} from "@/lib/dashboard-data";
import { canReadOrganisation } from "@/lib/auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import { isAuthenticatedDatabaseMode } from "@/lib/read-access-mode";
import {
  isActivityRiskCode,
  isTripTypeCode,
  type TripRiskAssessmentDetails,
  type TripRiskAssessmentItineraryRow,
  type TripRiskLevelValue,
} from "@/lib/trip-risk-assessment";

export type TripApprovalStatus =
  | "Draft"
  | "Ready for review"
  | "Approved"
  | "Changes requested"
  | "Cancelled";

export type DemoTrip = {
  id: string;
  organisationId?: string;
  organisationSlug: OrganisationSlug;
  title: string;
  destination: string;
  purpose: string;
  status: "Draft" | "Planned" | "In progress" | "Completed" | "Cancelled";
  approvalStatus: TripApprovalStatus;
  approvalNotes: Array<{
    actorName: string;
    createdAt: string;
    fromApprovalStatus: TripApprovalStatus | null;
    id: string;
    note: string;
    toApprovalStatus: TripApprovalStatus;
  }>;
  riskAssessment?: TripRiskAssessmentDetails | null;
  startsAt: string;
  endsAt: string;
  lead: string;
  emergencyContact: string;
  participants: Array<{
    name: string;
    role: string;
    status: "Confirmed" | "Pending";
  }>;
  vehicles: Array<{
    name: string;
    registration: string;
    status: "Allocated" | "Requested";
  }>;
  itinerary: Array<{
    day: string;
    title: string;
    description: string;
  }>;
};

export type TripApprovalFilter =
  | "all"
  | "draft"
  | "ready-for-review"
  | "approved"
  | "changes-requested"
  | "cancelled";

export type TripStatusFilter =
  | "all"
  | "draft"
  | "planned"
  | "in-progress"
  | "completed"
  | "cancelled";

export type TripTimingFilter = "all" | "upcoming" | "past" | "cancelled";
export type TripActionFilter = "all" | "needs-action";

export type TripListFilters = {
  action: TripActionFilter;
  approval: TripApprovalFilter;
  status: TripStatusFilter;
  timing: TripTimingFilter;
};

export type TripListSearchParams = {
  action?: string;
  approval?: string;
  status?: string;
  timing?: string;
};

export type TripSummaryCard = {
  count: number;
  description: string;
  filters: Partial<TripListFilters>;
  id: string;
  label: string;
};

export type TripPersistenceState = {
  isDatabaseConfigured: boolean;
  isDatabaseAvailable: boolean;
  organisationId?: string;
};

type PersistedTrip = {
  id: string;
  organisationId: string;
  title: string;
  destination: string;
  purpose: string;
  approvalStatus: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  leadUser: { name: string } | null;
  approvalNotes: Array<{
    actor: { name: string } | null;
    createdAt: Date;
    fromApprovalStatus: string | null;
    id: string;
    note: string;
    toApprovalStatus: string;
  }>;
  participants: Array<{
    name: string;
    role: string;
    status: string;
  }>;
  vehicleAllocations: Array<{
    name: string;
    registration: string;
    status: string;
    vehicle: {
      name: string;
      registration: string;
    } | null;
  }>;
  itineraryItems: Array<{
    day: string;
    description: string;
    title: string;
  }>;
  vehicleBookings: Array<{
    status: string;
    vehicle: {
      name: string;
      registration: string;
    };
  }>;
  riskAssessment: {
    activityRiskCodes: string[];
    baseRiskLevel: string;
    dailyItinerary: unknown;
    defibDetails: string | null;
    dpfDetails: string | null;
    emergencyContacts: string | null;
    epirbDetails: string | null;
    escalationNotes: string | null;
    finalRiskLevel: string;
    firstAidDetails: string | null;
    leadDrivers: string | null;
    medicalAllergyNotes: string | null;
    mobilePhone: string | null;
    otherEquipment: string | null;
    partners: string | null;
    rangers: string | null;
    readyForManagerReview: boolean;
    relevantContacts: string | null;
    satellitePhone: string | null;
    spotGarminDetails: string | null;
    tripSpecificControls: string | null;
    tripTypeCode: string;
  } | null;
};

export function getTripsForOrganisation(organisationSlug: OrganisationSlug) {
  return demoTrips.filter((trip) => trip.organisationSlug === organisationSlug);
}

export async function getTripsForOrganisationWithPersistence(
  organisationSlug: OrganisationSlug,
) {
  const persistedTrips = await getPersistedTripsForOrganisation(
    organisationSlug,
  );

  return persistedTrips ?? getTripsForOrganisation(organisationSlug);
}

export function getTripForOrganisation(
  organisationSlug: OrganisationSlug,
  tripId: string,
) {
  return getTripsForOrganisation(organisationSlug).find(
    (trip) => trip.id === tripId,
  );
}

export async function getTripForOrganisationWithPersistence(
  organisationSlug: OrganisationSlug,
  tripId: string,
) {
  const trips = await getTripsForOrganisationWithPersistence(organisationSlug);

  return trips.find((trip) => trip.id === tripId);
}

export function getTripFormDefaults(
  organisationSlug: OrganisationSlug,
  tripId?: string,
) {
  const existingTrip = tripId
    ? getTripForOrganisation(organisationSlug, tripId)
    : undefined;
  const organisation = getSelectedOrganisation(organisationSlug);

  return (
    existingTrip ?? {
      id: "new-demo-trip",
      organisationSlug,
      title: "",
      destination: "",
      purpose: "",
      status: "Draft",
      approvalStatus: "Draft",
      approvalNotes: [],
      riskAssessment: null,
      startsAt: "",
      endsAt: "",
      lead: "",
      emergencyContact: "",
      participants: [],
      vehicles: [],
      itinerary: [
        {
          day: "Day 1",
          title: "",
          description: `Draft itinerary item for ${organisation.name}.`,
        },
      ],
    }
  );
}

export async function getTripFormDefaultsWithPersistence(
  organisationSlug: OrganisationSlug,
  tripId?: string,
) {
  const existingTrip = tripId
    ? await getTripForOrganisationWithPersistence(organisationSlug, tripId)
    : undefined;

  return existingTrip ?? getTripFormDefaults(organisationSlug);
}

export async function getTripPersistenceState(
  organisationSlug: OrganisationSlug,
): Promise<TripPersistenceState> {
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

export function organisationHref(pathname: string, organisationSlug: string) {
  return `${pathname}?org=${organisationSlug}`;
}

export function getTripListFilters(
  searchParams?: TripListSearchParams,
): TripListFilters {
  return {
    action: getAllowedValue(searchParams?.action, [
      "all",
      "needs-action",
    ] as const),
    approval: getAllowedValue(searchParams?.approval, [
      "all",
      "draft",
      "ready-for-review",
      "approved",
      "changes-requested",
      "cancelled",
    ] as const),
    status: getAllowedValue(searchParams?.status, [
      "all",
      "draft",
      "planned",
      "in-progress",
      "completed",
      "cancelled",
    ] as const),
    timing: getAllowedValue(searchParams?.timing, [
      "all",
      "upcoming",
      "past",
      "cancelled",
    ] as const),
  };
}

export function filterTripsForList(
  trips: DemoTrip[],
  filters: TripListFilters,
) {
  return trips.filter((trip) => {
    if (
      filters.approval !== "all" &&
      getApprovalFilterValue(trip.approvalStatus) !== filters.approval
    ) {
      return false;
    }

    if (
      filters.status !== "all" &&
      getStatusFilterValue(trip.status) !== filters.status
    ) {
      return false;
    }

    if (
      filters.timing !== "all" &&
      getTripTimingState(trip).value !== filters.timing
    ) {
      return false;
    }

    if (filters.action === "needs-action" && !tripNeedsAction(trip)) {
      return false;
    }

    return true;
  });
}

export function hasActiveTripListFilters(filters: TripListFilters) {
  return (
    filters.action !== "all" ||
    filters.approval !== "all" ||
    filters.status !== "all" ||
    filters.timing !== "all"
  );
}

export function getTripSummaryCards(trips: DemoTrip[]): TripSummaryCard[] {
  return [
    {
      count: trips.length,
      description: "All trips for this organisation.",
      filters: {
        action: "all",
        approval: "all",
        status: "all",
        timing: "all",
      },
      id: "total",
      label: "Total trips",
    },
    {
      count: filterTripsForList(trips, {
        ...getTripListFilters(),
        timing: "upcoming",
      }).length,
      description: "Trips still ahead or underway.",
      filters: {
        timing: "upcoming",
      },
      id: "upcoming",
      label: "Upcoming",
    },
    {
      count: filterTripsForList(trips, {
        ...getTripListFilters(),
        approval: "ready-for-review",
      }).length,
      description: "Waiting for coordinator review.",
      filters: {
        approval: "ready-for-review",
      },
      id: "ready-for-review",
      label: "Ready for review",
    },
    {
      count: filterTripsForList(trips, {
        ...getTripListFilters(),
        approval: "changes-requested",
      }).length,
      description: "Returned for updates.",
      filters: {
        approval: "changes-requested",
      },
      id: "changes-requested",
      label: "Changes requested",
    },
    {
      count: trips.filter((trip) => !hasMinimumTripReviewData(trip)).length,
      description: "Missing review-ready details.",
      filters: {
        action: "needs-action",
      },
      id: "missing-review-data",
      label: "Missing data",
    },
    {
      count: filterTripsForList(trips, {
        ...getTripListFilters(),
        status: "planned",
      }).length,
      description: "Approved or planned for operations.",
      filters: {
        status: "planned",
      },
      id: "planned",
      label: "Approved / planned",
    },
    {
      count: filterTripsForList(trips, {
        ...getTripListFilters(),
        timing: "cancelled",
      }).length,
      description: "Cancelled trips kept for visibility.",
      filters: {
        timing: "cancelled",
      },
      id: "cancelled",
      label: "Cancelled",
    },
  ];
}

export function getTripTimingState(trip: DemoTrip): {
  label: "Upcoming" | "Past" | "Cancelled" | "In progress";
  value: Exclude<TripTimingFilter, "all">;
} {
  if (trip.status === "Cancelled" || trip.approvalStatus === "Cancelled") {
    return {
      label: "Cancelled",
      value: "cancelled",
    };
  }

  const now = new Date();
  const startsAt = new Date(trip.startsAt);
  const endsAt = new Date(trip.endsAt);

  if (Number.isFinite(endsAt.getTime()) && endsAt < now) {
    return {
      label: "Past",
      value: "past",
    };
  }

  if (Number.isFinite(startsAt.getTime()) && startsAt <= now) {
    return {
      label: "In progress",
      value: "upcoming",
    };
  }

  return {
    label: "Upcoming",
    value: "upcoming",
  };
}

export function tripNeedsAction(trip: DemoTrip) {
  return (
    trip.approvalStatus === "Ready for review" ||
    trip.approvalStatus === "Changes requested" ||
    !hasMinimumTripReviewData(trip)
  );
}

export function hasMinimumTripReviewData(trip: DemoTrip) {
  const startsAt = new Date(trip.startsAt);
  const endsAt = new Date(trip.endsAt);

  return Boolean(
    trip.title.trim() &&
      trip.destination.trim() &&
      trip.purpose.trim() &&
      Number.isFinite(startsAt.getTime()) &&
      Number.isFinite(endsAt.getTime()) &&
      startsAt < endsAt &&
      trip.participants.length > 0 &&
      trip.itinerary.length > 0,
  );
}

export function getLatestTripReviewNotePreview(trip: DemoTrip) {
  const note = trip.approvalNotes[0]?.note.trim().replace(/\s+/g, " ");

  if (!note) {
    return "";
  }

  return note.length > 120 ? `${note.slice(0, 117)}...` : note;
}

function getAllowedValue<const T extends readonly [string, ...string[]]>(
  value: string | undefined,
  allowedValues: T,
): T[number] {
  return (
    allowedValues.find((allowedValue) => allowedValue === value) ??
    allowedValues[0]
  );
}

function getApprovalFilterValue(
  approvalStatus: DemoTrip["approvalStatus"],
): TripApprovalFilter {
  if (approvalStatus === "Ready for review") {
    return "ready-for-review";
  }

  if (approvalStatus === "Changes requested") {
    return "changes-requested";
  }

  return approvalStatus.toLowerCase() as TripApprovalFilter;
}

function getStatusFilterValue(status: DemoTrip["status"]): TripStatusFilter {
  if (status === "In progress") {
    return "in-progress";
  }

  return status.toLowerCase() as TripStatusFilter;
}

async function getPersistedTripsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        trips: {
          include: {
            leadUser: true,
            approvalNotes: {
              include: {
                actor: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 5,
            },
            riskAssessment: true,
            participants: {
              orderBy: {
                rowOrder: "asc",
              },
            },
            vehicleAllocations: {
              include: {
                vehicle: {
                  select: {
                    name: true,
                    registration: true,
                  },
                },
              },
              orderBy: {
                rowOrder: "asc",
              },
            },
            itineraryItems: {
              orderBy: {
                rowOrder: "asc",
              },
            },
            vehicleBookings: {
              include: {
                vehicle: true,
              },
              orderBy: {
                startsAt: "asc",
              },
            },
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

    return organisation.trips.map((trip) =>
      mapPersistedTripToDemoTrip(organisationSlug, trip),
    );
  } catch {
    return isAuthenticatedDatabaseMode() ? [] : null;
  }
}

function mapPersistedTripToDemoTrip(
  organisationSlug: OrganisationSlug,
  trip: PersistedTrip,
): DemoTrip {
  const leadName = trip.leadUser?.name ?? "Demo Operations Manager";

  return {
    id: trip.id,
    organisationId: trip.organisationId,
    organisationSlug,
    title: trip.title,
    destination: trip.destination,
    purpose: trip.purpose,
    status: mapTripStatus(trip.status),
    approvalStatus: mapTripApprovalStatus(trip.approvalStatus),
    approvalNotes: trip.approvalNotes.map((note) => ({
      actorName: note.actor?.name ?? "Unknown reviewer",
      createdAt: note.createdAt.toISOString(),
      fromApprovalStatus: note.fromApprovalStatus
        ? mapTripApprovalStatus(note.fromApprovalStatus)
        : null,
      id: note.id,
      note: note.note,
      toApprovalStatus: mapTripApprovalStatus(note.toApprovalStatus),
    })),
    riskAssessment: mapPersistedRiskAssessment(trip.riskAssessment),
    startsAt: trip.startsAt.toISOString(),
    endsAt: trip.endsAt.toISOString(),
    lead: leadName,
    emergencyContact: "Demo Operations Manager",
    participants: trip.participants.length
      ? trip.participants.map((participant) => ({
          name: participant.name,
          role: participant.role,
          status: mapParticipantStatus(participant.status),
        }))
      : [
          {
            name: leadName,
            role: "Trip lead",
            status: "Confirmed",
          },
        ],
    vehicles: trip.vehicleAllocations.length
      ? trip.vehicleAllocations.map((allocation) => ({
          name: allocation.vehicle?.name ?? allocation.name,
          registration:
            allocation.vehicle?.registration ?? allocation.registration,
          status: mapVehicleAllocationStatus(allocation.status),
        }))
      : trip.vehicleBookings.map((booking) => ({
          name: booking.vehicle.name,
          registration: booking.vehicle.registration,
          status: booking.status === "APPROVED" ? "Allocated" : "Requested",
        })),
    itinerary: trip.itineraryItems.length
      ? trip.itineraryItems.map((item) => ({
          day: item.day,
          description: item.description,
          title: item.title,
        }))
      : [
          {
            day: "Day 1",
            title: trip.destination,
            description:
              "Persisted trip core details are saved. Add itinerary rows to persist structured schedule details.",
          },
        ],
  };
}

function mapPersistedRiskAssessment(
  assessment: PersistedTrip["riskAssessment"],
): TripRiskAssessmentDetails | null {
  if (!assessment || !isTripTypeCode(assessment.tripTypeCode)) {
    return null;
  }

  const activityRiskCodes = assessment.activityRiskCodes.filter(
    isActivityRiskCode,
  );
  const baseRiskLevel = mapRiskLevel(assessment.baseRiskLevel);
  const finalRiskLevel = mapRiskLevel(assessment.finalRiskLevel);

  if (!baseRiskLevel || !finalRiskLevel) {
    return null;
  }

  return {
    activityRiskCodes,
    baseRiskLevel,
    dailyItinerary: parseRiskAssessmentItinerary(assessment.dailyItinerary),
    defibDetails: assessment.defibDetails,
    dpfDetails: assessment.dpfDetails,
    emergencyContacts: assessment.emergencyContacts,
    epirbDetails: assessment.epirbDetails,
    escalationNotes: assessment.escalationNotes,
    finalRiskLevel,
    firstAidDetails: assessment.firstAidDetails,
    leadDrivers: assessment.leadDrivers,
    medicalAllergyNotes: assessment.medicalAllergyNotes,
    mobilePhone: assessment.mobilePhone,
    otherEquipment: assessment.otherEquipment,
    partners: assessment.partners,
    rangers: assessment.rangers,
    readyForManagerReview: assessment.readyForManagerReview,
    relevantContacts: assessment.relevantContacts,
    satellitePhone: assessment.satellitePhone,
    spotGarminDetails: assessment.spotGarminDetails,
    tripSpecificControls: assessment.tripSpecificControls,
    tripTypeCode: assessment.tripTypeCode,
  };
}

function mapRiskLevel(value: string): TripRiskLevelValue | null {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH") {
    return value;
  }

  return null;
}

function parseRiskAssessmentItinerary(
  value: unknown,
): TripRiskAssessmentItineraryRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(parseRiskAssessmentItineraryRow)
    .filter(
      (row): row is TripRiskAssessmentItineraryRow =>
        row !== null && Boolean(row.day),
    );
}

function parseRiskAssessmentItineraryRow(
  row: unknown,
): TripRiskAssessmentItineraryRow | null {
  if (
    !row ||
    typeof row !== "object" ||
    !("day" in row) ||
    !("date" in row) ||
    !("amSchedule" in row) ||
    !("pmSchedule" in row) ||
    !("checkInRequired" in row)
  ) {
    return null;
  }

  return {
    amSchedule: typeof row.amSchedule === "string" ? row.amSchedule : "",
    checkInRequired: row.checkInRequired === true,
    date: typeof row.date === "string" ? row.date : "",
    day: typeof row.day === "string" ? row.day : "",
    pmSchedule: typeof row.pmSchedule === "string" ? row.pmSchedule : "",
  };
}

function mapParticipantStatus(status: string): DemoTrip["participants"][number]["status"] {
  return status === "Confirmed" ? "Confirmed" : "Pending";
}

function mapVehicleAllocationStatus(
  status: string,
): DemoTrip["vehicles"][number]["status"] {
  return status === "Allocated" ? "Allocated" : "Requested";
}

function mapTripStatus(status: string): DemoTrip["status"] {
  if (status === "PLANNED") {
    return "Planned";
  }

  if (status === "IN_PROGRESS") {
    return "In progress";
  }

  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  return "Draft";
}

function mapTripApprovalStatus(approvalStatus: string): TripApprovalStatus {
  if (approvalStatus === "READY_FOR_REVIEW") {
    return "Ready for review";
  }

  if (approvalStatus === "APPROVED") {
    return "Approved";
  }

  if (approvalStatus === "CHANGES_REQUESTED") {
    return "Changes requested";
  }

  if (approvalStatus === "CANCELLED") {
    return "Cancelled";
  }

  return "Draft";
}

export const demoTrips: DemoTrip[] = [
  {
    id: "water-point-inspection",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Water Point Inspection Trip",
    destination: "Demo Water Point 7",
    purpose:
      "Inspect water points, record fake condition notes and confirm follow-up work.",
    status: "Planned",
    approvalStatus: "Approved",
    approvalNotes: [],
    startsAt: "2026-08-10T22:30:00.000Z",
    endsAt: "2026-08-12T07:30:00.000Z",
    lead: "Demo Head Ranger",
    emergencyContact: "Demo Operations Manager",
    participants: [
      {
        name: "Demo Head Ranger",
        role: "Trip lead",
        status: "Confirmed",
      },
      {
        name: "Demo Ranger",
        role: "Field staff",
        status: "Confirmed",
      },
      {
        name: "Demo Cultural Advisor",
        role: "Advisor",
        status: "Pending",
      },
    ],
    vehicles: [
      {
        name: "Demo LandCruiser 1",
        registration: "DEMO-001",
        status: "Allocated",
      },
    ],
    itinerary: [
      {
        day: "Day 1",
        title: "Travel to Demo Water Point 7",
        description:
          "Depart depot, complete radio check and arrive at the fake inspection site.",
      },
      {
        day: "Day 2",
        title: "Inspect water points",
        description:
          "Capture fake Fulcrum notes, photos placeholders and follow-up actions.",
      },
      {
        day: "Day 3",
        title: "Return and debrief",
        description:
          "Return vehicle, record odometer placeholder and draft trip report.",
      },
    ],
  },
  {
    id: "track-condition-check",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Track Condition Check",
    destination: "Demo North Access Track",
    purpose:
      "Review fake track access conditions before the next ranger activity.",
    status: "Draft",
    approvalStatus: "Ready for review",
    approvalNotes: [],
    startsAt: "2026-08-18T23:00:00.000Z",
    endsAt: "2026-08-19T06:30:00.000Z",
    lead: "Demo Ranger",
    emergencyContact: "Demo Head Ranger",
    participants: [
      {
        name: "Demo Ranger",
        role: "Trip lead",
        status: "Confirmed",
      },
      {
        name: "Demo Contractor",
        role: "Support",
        status: "Pending",
      },
    ],
    vehicles: [
      {
        name: "Demo Ranger Ute",
        registration: "DEMO-002",
        status: "Requested",
      },
    ],
    itinerary: [
      {
        day: "Day 1",
        title: "Check access track",
        description:
          "Visit fake access points and mark any demo hazards for review.",
      },
    ],
  },
  {
    id: "partner-visit-planning",
    organisationSlug: "demo-enarah-services",
    title: "Demo Partner Visit Planning",
    destination: "Demo Partner Office",
    purpose:
      "Plan a fake partner support visit without exposing partner ranger data.",
    status: "Draft",
    approvalStatus: "Draft",
    approvalNotes: [],
    startsAt: "2026-08-22T00:30:00.000Z",
    endsAt: "2026-08-22T07:00:00.000Z",
    lead: "Demo Enarah Admin",
    emergencyContact: "Demo Enarah Admin",
    participants: [
      {
        name: "Demo Enarah Admin",
        role: "Trip lead",
        status: "Confirmed",
      },
      {
        name: "Demo Operations Manager",
        role: "Support",
        status: "Confirmed",
      },
    ],
    vehicles: [
      {
        name: "Demo Enarah Pool Vehicle",
        registration: "EN-DEMO-01",
        status: "Allocated",
      },
    ],
    itinerary: [
      {
        day: "Day 1",
        title: "Partner support workshop",
        description:
          "Run a fake planning session and capture non-sensitive action notes.",
      },
    ],
  },
];
