import {
  getSelectedOrganisation,
  type OrganisationSlug,
} from "@/lib/dashboard-data";

export type TripApprovalStatus =
  | "Draft"
  | "Awaiting approval"
  | "Approved"
  | "Changes requested";

export type DemoTrip = {
  id: string;
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

export function getTripsForOrganisation(organisationSlug: OrganisationSlug) {
  return demoTrips.filter((trip) => trip.organisationSlug === organisationSlug);
}

export function getTripForOrganisation(
  organisationSlug: OrganisationSlug,
  tripId: string,
) {
  return getTripsForOrganisation(organisationSlug).find(
    (trip) => trip.id === tripId,
  );
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

export function organisationHref(pathname: string, organisationSlug: string) {
  return `${pathname}?org=${organisationSlug}`;
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
    lead: "Daryl Clarke - Demo",
    emergencyContact: "Demo Enarah Admin",
    participants: [
      {
        name: "Daryl Clarke - Demo",
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
