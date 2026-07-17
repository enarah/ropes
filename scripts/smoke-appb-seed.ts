import "dotenv/config";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import {
  APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT,
  buildAppbMappingReviewHistoryCursorBoundary,
} from "../lib/appb-mapping-review-history";
import { appbGeneratedWorkbookPlaceholder } from "../lib/appb-reporting";

const DEMO_ORGANISATION_SLUG = "ropes-demo-aboriginal-corporation";
const SEEDED_TARGET_ID = "organisation-name-range-mapping";
const SEEDED_TEMPLATE_VERSION_ID =
  "niaa-irp-ipa-mdbirr-2025-26-annual-planning";
const REQUIRED_APPB_CAPABILITIES = [
  "reporting",
  "reporting.appb",
  "grants",
  "grants.appb",
] as const;
const SAFE_REJECTION_METADATA_KEYS = new Set([
  "appbReportId",
  "decision",
  "event",
  "noteLength",
  "rejectionReasonCode",
  "targetId",
  "targetKind",
  "templateVersionId",
  "valueFree",
]);
const SAFE_REJECTION_SUMMARY =
  "Rejected fake APP&B review note example; text was not stored.";

class SmokeCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmokeCheckError";
  }
}

async function main() {
  const connectionString = process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new SmokeCheckError(
      "local DATABASE_URL is required after migrations and seed",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await runSmokeChecks(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function runSmokeChecks(prisma: PrismaClient) {
  const organisation = await prisma.organisation.findUnique({
    select: {
      capabilities: {
        select: { key: true },
      },
      id: true,
      isDemo: true,
    },
    where: { slug: DEMO_ORGANISATION_SLUG },
  });

  passIf(
    Boolean(organisation?.isDemo),
    "demo organisation exists",
    "seeded demo organisation was not found",
  );

  if (!organisation) {
    throw new SmokeCheckError("seeded demo organisation was not found");
  }

  const capabilityKeys = new Set(
    organisation.capabilities.map((capability) => capability.key),
  );
  passIf(
    REQUIRED_APPB_CAPABILITIES.every((key) => capabilityKeys.has(key)),
    "APP&B capabilities enabled",
    "required APP&B capabilities are missing",
  );

  const reports = await prisma.appbReport.findMany({
    select: {
      exportedAt: true,
      id: true,
      isDemo: true,
      status: true,
    },
    where: {
      isDemo: true,
      organisationId: organisation.id,
    },
  });
  passIf(
    reports.length > 0 && reports.every((report) => report.isDemo),
    "APP&B reports found",
    "fake APP&B reports were not found",
  );

  const reportIds = reports.map((report) => report.id);
  const manualFields = await prisma.appbManualFieldValue.findMany({
    select: {
      appbReportId: true,
      isDemo: true,
      status: true,
    },
    where: {
      appbReportId: { in: reportIds },
      isDemo: true,
      organisationId: organisation.id,
    },
  });
  passIf(
    manualFields.length >= 3 &&
      manualFields.every(
        (field) => field.isDemo && reportIds.includes(field.appbReportId),
      ),
    "manual field examples present",
    "fake manual field examples were not found",
  );

  const reviewDecision =
    await prisma.appbMappingReviewDecisionRecord.findFirst({
      select: {
        appbReportId: true,
        id: true,
        templateVersionId: true,
      },
      where: {
        appbReportId: { in: reportIds },
        organisationId: organisation.id,
        targetId: SEEDED_TARGET_ID,
        targetKind: "FIELD_MAPPING",
        templateVersionId: SEEDED_TEMPLATE_VERSION_ID,
      },
    });
  passIf(
    Boolean(reviewDecision),
    "mapping review decision found",
    "seeded mapping review decision was not found",
  );

  if (!reviewDecision) {
    throw new SmokeCheckError("seeded mapping review decision was not found");
  }

  const historyWhere = {
    appbReportId: reviewDecision.appbReportId,
    organisationId: organisation.id,
    reviewDecisionId: reviewDecision.id,
    targetId: SEEDED_TARGET_ID,
    targetKind: "FIELD_MAPPING",
    templateVersionId: SEEDED_TEMPLATE_VERSION_ID,
    valueFree: true,
  } satisfies Prisma.AppbMappingReviewDecisionHistoryRecordWhereInput;
  const historyOrderBy = [
    { reviewedAt: "desc" },
    { createdAt: "desc" },
    { id: "desc" },
  ] satisfies Prisma.AppbMappingReviewDecisionHistoryRecordOrderByWithRelationInput[];
  const [historyCount, nonValueFreeHistoryCount, newestHistory] =
    await Promise.all([
      prisma.appbMappingReviewDecisionHistoryRecord.count({
        where: historyWhere,
      }),
      prisma.appbMappingReviewDecisionHistoryRecord.count({
        where: {
          ...historyWhere,
          valueFree: false,
        },
      }),
      prisma.appbMappingReviewDecisionHistoryRecord.findMany({
        orderBy: historyOrderBy,
        select: {
          createdAt: true,
          id: true,
          reviewedAt: true,
          valueFree: true,
        },
        take: APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT,
        where: historyWhere,
      }),
    ]);
  passIf(
    historyCount === 5 && nonValueFreeHistoryCount === 0,
    "five value-free history events found",
    "seeded history is missing, unbounded or not value-free",
  );
  passIf(
    newestHistory.length === APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT &&
      newestHistory.every((event) => event.valueFree),
    "newest three default history events available",
    "default history event set is not the expected safe size",
  );

  const lastDefaultEvent = newestHistory.at(-1);

  if (!lastDefaultEvent) {
    throw new SmokeCheckError("default history event set is unavailable");
  }

  const olderHistory =
    await prisma.appbMappingReviewDecisionHistoryRecord.findMany({
      orderBy: historyOrderBy,
      select: { id: true, valueFree: true },
      take: APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT,
      where: {
        ...historyWhere,
        ...buildAppbMappingReviewHistoryCursorBoundary(lastDefaultEvent),
      },
    });
  passIf(
    olderHistory.length === 2 &&
      olderHistory.every((event) => event.valueFree) &&
      olderHistory.every(
        (event) => !newestHistory.some((recent) => recent.id === event.id),
      ),
    "two older history events available",
    "older value-free history does not support the seeded load-more path",
  );

  const rejectedNoteEvents = await prisma.auditLog.findMany({
    select: { metadata: true, summary: true },
    where: {
      action: "REJECTED",
      entityId: reviewDecision.appbReportId,
      entityType: "AppbMappingReviewDecisionRecord",
      metadata: {
        equals: "appb_mapping_review_note_rejected",
        path: ["event"],
      },
      organisationId: organisation.id,
    },
  });
  const rejectedNoteReasonCounts = new Map<string, number>();
  const rejectionMetadataIsSafe = rejectedNoteEvents.every((event) => {
    const metadata = safeRejectedNoteMetadata(
      event.metadata,
      reviewDecision.appbReportId,
    );

    if (!metadata || event.summary !== SAFE_REJECTION_SUMMARY) {
      return false;
    }

    rejectedNoteReasonCounts.set(
      metadata.rejectionReasonCode,
      (rejectedNoteReasonCounts.get(metadata.rejectionReasonCode) ?? 0) + 1,
    );
    return true;
  });
  passIf(
    rejectionMetadataIsSafe &&
      rejectedNoteEvents.length === 2 &&
      rejectedNoteReasonCounts.get("workbook-cell-or-formula") === 2,
    "rejected-note reason count present without rejected text",
    "safe rejected-note reason metadata is missing or invalid",
  );

  passIf(
    appbGeneratedWorkbookPlaceholder.enabled === false &&
      reports.every(
        (report) => report.exportedAt === null && report.status !== "EXPORTED",
      ),
    "workbook export remains unavailable",
    "workbook export is not safely blocked for seeded reports",
  );

  console.log("PASS APP&B smoke test completed safely");
}

function safeRejectedNoteMetadata(
  metadata: Prisma.JsonValue | null,
  expectedAppbReportId: string,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata as Record<string, Prisma.JsonValue>;

  if (
    !Object.keys(value).every((key) => SAFE_REJECTION_METADATA_KEYS.has(key)) ||
    value["event"] !== "appb_mapping_review_note_rejected" ||
    value["valueFree"] !== true ||
    value["appbReportId"] !== expectedAppbReportId ||
    typeof value["decision"] !== "string" ||
    value["targetId"] !== SEEDED_TARGET_ID ||
    value["targetKind"] !== "field-mapping" ||
    value["templateVersionId"] !== SEEDED_TEMPLATE_VERSION_ID ||
    typeof value["noteLength"] !== "number" ||
    typeof value["rejectionReasonCode"] !== "string"
  ) {
    return null;
  }

  return {
    rejectionReasonCode: value["rejectionReasonCode"],
  };
}

function passIf(
  condition: boolean,
  passMessage: string,
  failureMessage: string,
) {
  if (!condition) {
    throw new SmokeCheckError(failureMessage);
  }

  console.log(`PASS ${passMessage}`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof SmokeCheckError
      ? error.message
      : "APP&B smoke test could not complete; check local database, migrations and seed";

  console.error(`FAIL ${message}`);
  process.exitCode = 1;
});
