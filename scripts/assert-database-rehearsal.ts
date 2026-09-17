import "dotenv/config";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { canonicalRoleDefinitions } from "../lib/canonical-roles";

const REHEARSAL_ORGANISATION_SLUG = "ropes-rehearsal";
const REHEARSAL_ORGANISATION_NAME = "ROPES Rehearsal Organisation";
const REHEARSAL_USER_EMAIL = "rehearsal.admin@example.test";
const REHEARSAL_USER_NAME = "ROPES Rehearsal Admin";
const REHEARSAL_ROLE_NAME = "Enarah Admin";

type Phase = "after-apply" | "before-apply";

async function main() {
  const phase = parsePhase(process.argv.slice(2));
  const connectionString = process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for rehearsal assertions.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    if (phase === "before-apply") {
      await assertBeforeApply(prisma);
      console.log("PASS rehearsal database has no synthetic bootstrap records before apply");
      return;
    }

    await assertAfterApply(prisma);
    console.log("PASS rehearsal database structural assertions passed");
  } finally {
    await prisma.$disconnect();
  }
}

function parsePhase(args: string[]): Phase {
  const phase = args[0] ?? "after-apply";

  if (phase === "before-apply" || phase === "after-apply") {
    return phase;
  }

  throw new Error("Usage: tsx scripts/assert-database-rehearsal.ts [before-apply|after-apply]");
}

async function assertBeforeApply(prisma: PrismaClient) {
  assertEqual(
    await prisma.organisation.count({
      where: { slug: REHEARSAL_ORGANISATION_SLUG },
    }),
    0,
    "Synthetic organisation must not exist before apply.",
  );
  assertEqual(
    await prisma.user.count({ where: { email: REHEARSAL_USER_EMAIL } }),
    0,
    "Synthetic user must not exist before apply.",
  );
}

async function assertAfterApply(prisma: PrismaClient) {
  const organisation = await prisma.organisation.findUnique({
    select: {
      capabilities: { select: { key: true } },
      id: true,
      isDemo: true,
      name: true,
      slug: true,
      type: true,
    },
    where: { slug: REHEARSAL_ORGANISATION_SLUG },
  });
  assertPresent(organisation, "Synthetic organisation exists.");
  assertEqual(organisation.name, REHEARSAL_ORGANISATION_NAME, "Synthetic organisation name matches.");
  assertEqual(organisation.type, "ENARAH", "Synthetic organisation type is ENARAH.");
  assertEqual(organisation.isDemo, false, "Synthetic organisation is not demo.");
  assertEqual(organisation.capabilities.length, 0, "No capabilities were enabled by the minimum rehearsal.");
  assertEqual(
    await prisma.organisation.count({
      where: { slug: REHEARSAL_ORGANISATION_SLUG },
    }),
    1,
    "Exactly one synthetic organisation exists.",
  );

  const user = await prisma.user.findUnique({
    select: {
      email: true,
      id: true,
      isDemo: true,
      name: true,
    },
    where: { email: REHEARSAL_USER_EMAIL },
  });
  assertPresent(user, "Synthetic user exists.");
  assertEqual(user.name, REHEARSAL_USER_NAME, "Synthetic user display name matches.");
  assertEqual(user.isDemo, false, "Synthetic user is not demo.");
  assertEqual(
    await prisma.user.count({ where: { email: REHEARSAL_USER_EMAIL } }),
    1,
    "Exactly one synthetic user exists.",
  );

  const role = await prisma.role.findUnique({
    select: {
      id: true,
      name: true,
    },
    where: { name: REHEARSAL_ROLE_NAME },
  });
  assertPresent(role, "Requested canonical role exists.");
  assertEqual(
    await prisma.role.count({ where: { name: REHEARSAL_ROLE_NAME } }),
    1,
    "Requested canonical role is not duplicated.",
  );
  assertEqual(
    await prisma.role.count({
      where: {
        name: {
          in: canonicalRoleDefinitions.map((canonicalRole) => canonicalRole.name),
        },
      },
    }),
    canonicalRoleDefinitions.length,
    "Every canonical role exists exactly once.",
  );

  const membership = await prisma.membership.findUnique({
    select: {
      id: true,
      organisationId: true,
      role: { select: { name: true } },
      status: true,
      userId: true,
    },
    where: {
      organisationId_userId: {
        organisationId: organisation.id,
        userId: user.id,
      },
    },
  });
  assertPresent(membership, "Synthetic membership exists.");
  assertEqual(membership.status, "ACTIVE", "Synthetic membership is ACTIVE.");
  assertEqual(membership.role.name, REHEARSAL_ROLE_NAME, "Synthetic membership uses Enarah Admin.");
  assertEqual(
    await prisma.membership.count({
      where: {
        organisationId: organisation.id,
        userId: user.id,
      },
    }),
    1,
    "Synthetic membership is not duplicated.",
  );
  assertEqual(
    await prisma.membership.count({ where: { userId: user.id } }),
    1,
    "Synthetic user has only one membership.",
  );

  await assertNoOperationalRows(prisma);
}

async function assertNoOperationalRows(prisma: PrismaClient) {
  const counts = {
    appbManualFieldValues: await prisma.appbManualFieldValue.count(),
    appbMappingReviewDecisionHistory: await prisma.appbMappingReviewDecisionHistoryRecord.count(),
    appbMappingReviewDecisions: await prisma.appbMappingReviewDecisionRecord.count(),
    appbReports: await prisma.appbReport.count(),
    auditLogs: await prisma.auditLog.count(),
    fulcrumApps: await prisma.fulcrumApp.count(),
    fulcrumConnections: await prisma.fulcrumConnection.count(),
    fulcrumRecords: await prisma.fulcrumRecord.count(),
    fulcrumSyncJobs: await prisma.fulcrumSyncJob.count(),
    grantReportingPeriods: await prisma.grantReportingPeriod.count(),
    grants: await prisma.grant.count(),
    organisationCapabilities: await prisma.organisationCapability.count(),
    projects: await prisma.project.count(),
    rangerPrograms: await prisma.rangerProgram.count(),
    tripApprovalNotes: await prisma.tripApprovalNote.count(),
    tripItineraryItems: await prisma.tripItineraryItem.count(),
    tripParticipants: await prisma.tripParticipant.count(),
    tripRiskAssessments: await prisma.tripRiskAssessment.count(),
    tripVehicleAllocations: await prisma.tripVehicleAllocation.count(),
    trips: await prisma.trip.count(),
    vehicleBookings: await prisma.vehicleBooking.count(),
    vehicleDefects: await prisma.vehicleDefect.count(),
    vehicleMaintenanceRecords: await prisma.vehicleMaintenanceRecord.count(),
    vehiclePreStartChecklists: await prisma.vehiclePreStartChecklist.count(),
    vehicles: await prisma.vehicle.count(),
  };

  for (const [label, count] of Object.entries(counts)) {
    assertEqual(count, 0, `No unexpected ${label} rows were created.`);
  }
}

function assertPresent<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR ${message}`);
  process.exitCode = 1;
});
