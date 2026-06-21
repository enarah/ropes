import {
  getSelectedOrganisation,
  type OrganisationSlug,
} from "@/lib/dashboard-data";
import { canReadOrganisation } from "@/lib/auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import { isAuthenticatedDatabaseMode } from "@/lib/read-access-mode";

export type TripApprovalStatus =
  | "Draft"
  | "Awaiting approval"
  | "Approved"
  | "Changes requested";

export type DemoTrip = {
  id: string;
  organisationId?: string;
  organisationSlug: OrganisationSlug;
  title: string;
  destination: string;
  purpose: string;
  status: "Draft" | "Planned" | "In progress" | "Completed";
  approvalStatus: TripApprovalStatus;
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
  status: string;
  startsAt: Date;
  endsAt: Date;
  leadUser: { name: string } | null;
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
    approvalStatus: mapTripApprovalStatus(trip.status),
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

  return "Draft";
}

function mapTripApprovalStatus(status: string): TripApprovalStatus {
  if (status === "PLANNED" || status === "IN_PROGRESS" || status === "COMPLETED") {
    return "Approved";
  }

  if (status === "CANCELLED") {
    return "Changes requested";
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
    approvalStatus: "Awaiting approval",
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
