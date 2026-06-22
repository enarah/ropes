import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  defaultDemoCapabilityKeys,
  getModuleKeyForCapability,
} from "../lib/capability-registry";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the ROPES demo database.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.fulcrumRecord.deleteMany();
  await prisma.fulcrumApp.deleteMany();
  await prisma.fulcrumSyncJob.deleteMany();
  await prisma.fulcrumConnection.deleteMany();
  await prisma.tripRiskAssessment.deleteMany();
  await prisma.tripItineraryItem.deleteMany();
  await prisma.tripVehicleAllocation.deleteMany();
  await prisma.tripParticipant.deleteMany();
  await prisma.tripApprovalNote.deleteMany();
  await prisma.vehicleBooking.deleteMany();
  await prisma.vehicleMaintenanceRecord.deleteMany();
  await prisma.vehicleDefect.deleteMany();
  await prisma.vehiclePreStartChecklist.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.rangerProgram.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organisationCapability.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();

  const roles = await createRoles();

  const enarah = await prisma.organisation.create({
    data: {
      name: "Demo Enarah Services",
      slug: "demo-enarah-services",
      type: "ENARAH",
      isDemo: true,
    },
  });

  const partner = await prisma.organisation.create({
    data: {
      name: "ROPES Demo Aboriginal Corporation",
      slug: "ropes-demo-aboriginal-corporation",
      type: "DEMO",
      isDemo: true,
    },
  });

  const users = await createDemoUsers();

  await prisma.organisationCapability.createMany({
    data: [enarah, partner].flatMap((organisation) =>
      defaultDemoCapabilityKeys.map((key) => ({
        isDemo: true,
        key,
        moduleKey: getModuleKeyForCapability(key),
        organisationId: organisation.id,
      })),
    ),
  });

  await prisma.membership.createMany({
    data: [
      {
        organisationId: enarah.id,
        userId: users.enarahAdmin.id,
        roleId: roles.platformOwner.id,
      },
      {
        organisationId: partner.id,
        userId: users.enarahAdmin.id,
        roleId: roles.enarahAdmin.id,
      },
      {
        organisationId: partner.id,
        userId: users.operationsManager.id,
        roleId: roles.operationsManager.id,
      },
      {
        organisationId: partner.id,
        userId: users.headRanger.id,
        roleId: roles.headRanger.id,
      },
      {
        organisationId: partner.id,
        userId: users.ranger.id,
        roleId: roles.fieldStaff.id,
      },
      {
        organisationId: partner.id,
        userId: users.funderViewer.id,
        roleId: roles.readOnlyPartner.id,
      },
    ],
  });

  const project = await prisma.project.create({
    data: {
      organisationId: partner.id,
      name: "Demo Country and Waterways Project",
      code: "DEMO-CW-001",
      description:
        "Fake project for testing ROPES project, trip and Fulcrum relationships.",
      fundingStream: "Demo Ranger Support Grant",
      startsOn: new Date("2026-07-01T00:00:00.000Z"),
      endsOn: new Date("2027-06-30T00:00:00.000Z"),
      isDemo: true,
    },
  });

  const rangerProgram = await prisma.rangerProgram.create({
    data: {
      organisationId: partner.id,
      projectId: project.id,
      name: "Demo North Country Rangers",
      description:
        "Fake ranger program for validating organisation-scoped operations data.",
      region: "Demo North Region",
      isDemo: true,
    },
  });

  const trip = await prisma.trip.create({
    data: {
      organisationId: partner.id,
      projectId: project.id,
      rangerProgramId: rangerProgram.id,
      leadUserId: users.headRanger.id,
      title: "Demo Water Point Inspection Trip",
      purpose:
        "Fake trip used to test journey management, vehicle booking and Fulcrum links.",
      approvalStatus: "APPROVED",
      status: "PLANNED",
      destination: "Demo Water Point 7",
      startsAt: new Date("2026-08-10T22:30:00.000Z"),
      endsAt: new Date("2026-08-12T07:30:00.000Z"),
      isDemo: true,
    },
  });

  const vehicles = await prisma.vehicle.createManyAndReturn({
    data: [
      {
        organisationId: partner.id,
        name: "Demo LandCruiser 1",
        registration: "DEMO-001",
        make: "Toyota",
        model: "LandCruiser",
        year: 2022,
        status: "BOOKED",
        odometerKm: 48210,
        isDemo: true,
      },
      {
        organisationId: partner.id,
        name: "Demo Ranger Ute",
        registration: "DEMO-002",
        make: "Ford",
        model: "Ranger",
        year: 2021,
        status: "AVAILABLE",
        odometerKm: 61540,
        isDemo: true,
      },
      {
        organisationId: partner.id,
        name: "Demo Troopy",
        registration: "DEMO-003",
        make: "Toyota",
        model: "Troopcarrier",
        year: 2020,
        status: "MAINTENANCE",
        odometerKm: 73400,
        isDemo: true,
      },
    ],
  });

  await prisma.vehicleBooking.create({
    data: {
      organisationId: partner.id,
      vehicleId: vehicles[0].id,
      tripId: trip.id,
      bookedByUserId: users.operationsManager.id,
      status: "APPROVED",
      startsAt: trip.startsAt,
      endsAt: trip.endsAt,
      notes: "Fake booking linked to the demo inspection trip.",
      isDemo: true,
    },
  });

  await prisma.vehiclePreStartChecklist.createMany({
    data: [
      {
        organisationId: partner.id,
        vehicleId: vehicles[0].id,
        submittedByUserId: users.operationsManager.id,
        odometerKm: 48250,
        tyresOk: true,
        lightsOk: true,
        fluidsOk: true,
        communicationsOk: true,
        recoveryGearOk: true,
        generalConditionOk: true,
        isDemo: true,
      },
      {
        organisationId: partner.id,
        vehicleId: vehicles[2].id,
        submittedByUserId: users.ranger.id,
        odometerKm: 73430,
        tyresOk: true,
        lightsOk: false,
        fluidsOk: true,
        communicationsOk: true,
        recoveryGearOk: true,
        generalConditionOk: false,
        issueNotes: "Fake demo note: lights and general condition need review.",
        isDemo: true,
      },
    ],
  });

  const demoTroopyDefect = await prisma.vehicleDefect.create({
    data: {
      organisationId: partner.id,
      vehicleId: vehicles[2].id,
      reportedByUserId: users.ranger.id,
      category: "ELECTRICAL",
      severity: "HIGH",
      status: "OPEN",
      reportedAt: new Date("2026-08-04T01:30:00.000Z"),
      description:
        "Fake demo defect: lights need workshop review before remote travel.",
      isDemo: true,
    },
  });

  await prisma.vehicleMaintenanceRecord.createMany({
    data: [
      {
        organisationId: partner.id,
        vehicleId: vehicles[0].id,
        recordedByUserId: users.operationsManager.id,
        type: "SERVICE",
        status: "COMPLETED",
        provider: "Demo regional workshop",
        maintenanceDate: new Date("2026-07-22T01:00:00.000Z"),
        odometerKm: 48120,
        notes: "Fake demo service record for maintenance history visibility.",
        isDemo: true,
      },
      {
        organisationId: partner.id,
        vehicleId: vehicles[1].id,
        recordedByUserId: users.headRanger.id,
        type: "INSPECTION",
        status: "COMPLETED",
        provider: "Demo depot",
        maintenanceDate: new Date("2026-07-08T02:00:00.000Z"),
        odometerKm: 61240,
        notes: "Fake demo inspection record for a depot check.",
        isDemo: true,
      },
      {
        organisationId: partner.id,
        vehicleId: vehicles[2].id,
        defectId: demoTroopyDefect.id,
        recordedByUserId: users.ranger.id,
        type: "REPAIR",
        status: "DEFERRED",
        provider: "Demo regional auto electrician",
        maintenanceDate: new Date("2026-08-05T03:00:00.000Z"),
        nextDueDate: new Date("2026-08-16T00:00:00.000Z"),
        odometerKm: 73450,
        costCents: 185000,
        notes: "Fake demo repair record linked to the lights defect.",
        isDemo: true,
      },
    ],
  });

  await prisma.tripParticipant.createMany({
    data: [
      {
        organisationId: partner.id,
        tripId: trip.id,
        userId: users.headRanger.id,
        name: "Demo Head Ranger",
        role: "Trip lead",
        status: "Confirmed",
        rowOrder: 0,
        isDemo: true,
      },
      {
        organisationId: partner.id,
        tripId: trip.id,
        userId: users.ranger.id,
        name: "Demo Ranger",
        role: "Field staff",
        status: "Confirmed",
        rowOrder: 1,
        isDemo: true,
      },
    ],
  });

  await prisma.tripVehicleAllocation.create({
    data: {
      organisationId: partner.id,
      tripId: trip.id,
      vehicleId: vehicles[0].id,
      name: vehicles[0].name,
      registration: vehicles[0].registration,
      status: "Allocated",
      rowOrder: 0,
      isDemo: true,
    },
  });

  await prisma.tripItineraryItem.createMany({
    data: [
      {
        organisationId: partner.id,
        tripId: trip.id,
        day: "Day 1",
        title: "Travel to Demo Water Point 7",
        description:
          "Fake itinerary item for departing depot and arriving at the demo inspection site.",
        rowOrder: 0,
        isDemo: true,
      },
      {
        organisationId: partner.id,
        tripId: trip.id,
        day: "Day 2",
        title: "Inspect demo water points",
        description:
          "Fake itinerary item for capturing demo condition notes and follow-up actions.",
        rowOrder: 1,
        isDemo: true,
      },
    ],
  });

  await prisma.tripRiskAssessment.create({
    data: {
      organisationId: partner.id,
      tripId: trip.id,
      createdByUserId: users.operationsManager.id,
      updatedByUserId: users.operationsManager.id,
      tripTypeCode: "2A",
      activityRiskCodes: [],
      baseRiskLevel: "MEDIUM",
      finalRiskLevel: "MEDIUM",
      tripSpecificControls:
        "Fake demo controls: confirm road condition check, SPOT check-ins and vehicle recovery equipment before departure.",
      leadDrivers: "Demo Head Ranger",
      spotGarminDetails: "Fake demo SPOT assigned to trip lead.",
      satellitePhone: "Fake demo satellite phone carried by second traveller.",
      mobilePhone: "Fake demo mobile contact for depot departure and arrival.",
      epirbDetails: "Fake demo EPIRB packed with field kit.",
      firstAidDetails: "Fake demo first aid kit checked at depot.",
      defibDetails: "Fake demo defib not required for this trip.",
      dpfDetails: "Fake demo DPF status checked during pre-start.",
      otherEquipment: "Fake demo recovery kit, water and shade packed.",
      rangers: "Demo Head Ranger; Demo Ranger",
      partners: "No fake partner travellers.",
      medicalAllergyNotes:
        "Fake demo note only: no real medical or allergy details.",
      relevantContacts: "Demo Operations Manager; Demo depot contact.",
      dailyItinerary: [
        {
          amSchedule: "Depart depot and travel to Demo Water Point 7.",
          checkInRequired: true,
          date: "2026-08-11",
          day: "Day 1",
          pmSchedule: "Arrive, set up and send check-in.",
        },
        {
          amSchedule: "Inspect demo water points and record fake conditions.",
          checkInRequired: true,
          date: "2026-08-12",
          day: "Day 2",
          pmSchedule: "Return to depot and close trip.",
        },
      ],
      emergencyContacts:
        "Fake demo emergency contacts: operations manager and senior manager.",
      escalationNotes:
        "Fake demo escalation follows Enarah check-in response timing.",
      readyForManagerReview: true,
      isDemo: true,
    },
  });

  await prisma.tripApprovalNote.create({
    data: {
      actorUserId: users.operationsManager.id,
      fromApprovalStatus: "READY_FOR_REVIEW",
      isDemo: true,
      note:
        "Fake approval note: demo trip details are complete enough for prototype review.",
      organisationId: partner.id,
      toApprovalStatus: "APPROVED",
      tripId: trip.id,
    },
  });

  const fulcrumConnection = await prisma.fulcrumConnection.create({
    data: {
      organisationId: partner.id,
      name: "Demo Fulcrum Connection",
      status: "READY_FOR_SETUP",
      accountLabel: "Fake Fulcrum account - no token stored",
      isDemo: true,
    },
  });

  const fulcrumApp = await prisma.fulcrumApp.create({
    data: {
      organisationId: partner.id,
      fulcrumConnectionId: fulcrumConnection.id,
      projectId: project.id,
      name: "Demo Water Point Inspection Form",
      description:
        "Fake Fulcrum app metadata for testing the module shell and data model.",
      externalAppId: "demo-fulcrum-app-water-points",
      recordCount: 2,
      isDemo: true,
    },
  });

  await prisma.fulcrumRecord.createMany({
    data: [
      {
        organisationId: partner.id,
        fulcrumConnectionId: fulcrumConnection.id,
        fulcrumAppId: fulcrumApp.id,
        projectId: project.id,
        tripId: trip.id,
        externalRecordId: "demo-record-water-point-001",
        status: "complete",
        latitude: -23.7012,
        longitude: 133.8823,
        capturedAt: new Date("2026-08-11T01:45:00.000Z"),
        rawJson: {
          demo: true,
          siteName: "Demo Water Point 7",
          condition: "Good",
          photoStatus: "Fake photo placeholder only",
        },
        isDemo: true,
      },
      {
        organisationId: partner.id,
        fulcrumConnectionId: fulcrumConnection.id,
        fulcrumAppId: fulcrumApp.id,
        projectId: project.id,
        tripId: trip.id,
        externalRecordId: "demo-record-water-point-002",
        status: "needs-review",
        latitude: -23.7144,
        longitude: 133.9011,
        capturedAt: new Date("2026-08-11T03:10:00.000Z"),
        rawJson: {
          demo: true,
          siteName: "Demo Water Point 8",
          condition: "Follow-up required",
          issue: "Fake broken trough note",
        },
        isDemo: true,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organisationId: partner.id,
        actorUserId: users.enarahAdmin.id,
        action: "CREATED",
        entityType: "Organisation",
        entityId: partner.id,
        summary: "Created fake demo organisation seed data.",
        metadata: { demo: true },
      },
      {
        organisationId: partner.id,
        actorUserId: users.operationsManager.id,
        action: "APPROVED",
        entityType: "VehicleBooking",
        summary: "Approved fake vehicle booking for demo trip.",
        metadata: { demo: true },
      },
      {
        organisationId: partner.id,
        actorUserId: users.enarahAdmin.id,
        action: "SYNC_STARTED",
        entityType: "FulcrumConnection",
        entityId: fulcrumConnection.id,
        summary: "Recorded fake Fulcrum sync placeholder with no API call.",
        metadata: { demo: true, externalConnection: false },
      },
    ],
  });

  console.log("Seeded fake ROPES demo data.");
}

async function createRoles() {
  const [
    platformOwner,
    enarahAdmin,
    organisationAdmin,
    operationsManager,
    headRanger,
    fieldStaff,
    readOnlyPartner,
  ] = await Promise.all([
    prisma.role.create({
      data: {
        name: "Platform Owner",
        description: "Full control across the whole platform.",
      },
    }),
    prisma.role.create({
      data: {
        name: "Enarah Admin",
        description: "Can support Enarah and partner organisation setup.",
      },
    }),
    prisma.role.create({
      data: {
        name: "Organisation Admin",
        description: "Can manage one partner organisation.",
      },
    }),
    prisma.role.create({
      data: {
        name: "Operations Manager",
        description: "Can manage trips, vehicles, staff allocation and reports.",
      },
    }),
    prisma.role.create({
      data: {
        name: "Ranger Coordinator / Head Ranger",
        description: "Can coordinate trips, ranger activity and field records.",
      },
    }),
    prisma.role.create({
      data: {
        name: "Field Staff / Ranger",
        description: "Can view assigned trips and submit field updates.",
      },
    }),
    prisma.role.create({
      data: {
        name: "Read-only Partner / Funder",
        description: "Can view approved dashboards and reports.",
      },
    }),
  ]);

  return {
    platformOwner,
    enarahAdmin,
    organisationAdmin,
    operationsManager,
    headRanger,
    fieldStaff,
    readOnlyPartner,
  };
}

async function createDemoUsers() {
  const [enarahAdmin, operationsManager, headRanger, ranger, funderViewer] =
    await Promise.all([
      prisma.user.create({
        data: {
          name: "Demo Enarah Admin",
          email: "enarah.admin@example.test",
          isDemo: true,
        },
      }),
      prisma.user.create({
        data: {
          name: "Demo Operations Manager",
          email: "operations.manager@example.test",
          isDemo: true,
        },
      }),
      prisma.user.create({
        data: {
          name: "Demo Head Ranger",
          email: "head.ranger@example.test",
          isDemo: true,
        },
      }),
      prisma.user.create({
        data: {
          name: "Demo Ranger",
          email: "ranger@example.test",
          isDemo: true,
        },
      }),
      prisma.user.create({
        data: {
          name: "Demo Funder Viewer",
          email: "funder.viewer@example.test",
          isDemo: true,
        },
      }),
    ]);

  return { enarahAdmin, operationsManager, headRanger, ranger, funderViewer };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
