import type { Prisma } from "@prisma/client";
import { canReadOrganisation } from "@/lib/auth-session";
import {
  APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT,
  countOlderAppbMappingReviewHistoryEvents,
  createAppbMappingReviewHistoryCursor,
  shapeAppbMappingReviewDecisionHistory,
} from "@/lib/appb-mapping-review-history";
import type { AppbPersistedMappingReview } from "@/lib/appb-reporting";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";

export type GrantsAppbOverview = {
  grants: GrantOverview[];
  isDatabaseAvailable: boolean;
  isDatabaseConfigured: boolean;
};

export type GrantOverview = {
  appbReportCount: number;
  funder: string;
  fundingAgreementNumber?: string;
  fundingPeriod: string;
  id: string;
  programType: string;
  project?: string;
  rangerProgram?: string;
  reportingPeriods: GrantReportingPeriodOverview[];
  status: string;
  title: string;
};

export type GrantReportingPeriodOverview = {
  appbReports: AppbReportOverview[];
  cycle: string;
  dateRange: string;
  dueOn?: string;
  id: string;
  label: string;
  status: string;
};

export type AppbReportOverview = {
  id: string;
  mappingReviews: AppbPersistedMappingReview[];
  manualFields: AppbManualFieldOverview[];
  missingDataSummary?: string;
  status: string;
  templateProfileId: string;
  templateVersionLabel: string;
};

export type AppbManualFieldOverview = {
  fieldGroup: string;
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  notes?: string;
  sensitivity: string;
  status: string;
  valueDate?: string;
  valueNumber?: string;
  valueText?: string;
};

export async function getGrantsAppbOverview(
  organisationSlug: string,
): Promise<GrantsAppbOverview> {
  if (!isDatabaseConfigured()) {
    return {
      grants: [],
      isDatabaseAvailable: false,
      isDatabaseConfigured: false,
    };
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      select: {
        id: true,
      },
      where: {
        slug: organisationSlug,
      },
    });

    const hasAccess = organisation
      ? await canReadOrganisation(prisma, organisation.id)
      : false;

    if (!organisation || !hasAccess) {
      return {
        grants: [],
        isDatabaseAvailable: false,
        isDatabaseConfigured: true,
      };
    }

    const grants = await prisma.grant.findMany({
      include: {
        appbReports: {
          select: {
            id: true,
          },
          where: {
            organisationId: organisation.id,
          },
        },
        project: {
          select: {
            code: true,
            name: true,
          },
        },
        rangerProgram: {
          select: {
            name: true,
          },
        },
        reportingPeriods: {
          include: {
            appbReports: {
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
                manualFieldValues: {
                  orderBy: {
                    updatedAt: "desc",
                  },
                  select: {
                    fieldGroup: true,
                    fieldId: true,
                    fieldLabel: true,
                    fieldType: true,
                    notes: true,
                    sensitivity: true,
                    status: true,
                    valueDate: true,
                    valueNumber: true,
                    valueText: true,
                  },
                  where: {
                    organisationId: organisation.id,
                  },
                },
                mappingReviewDecisions: {
                  orderBy: {
                    reviewedAt: "desc",
                  },
                  select: {
                    _count: {
                      select: {
                        historyRecords: {
                          where: {
                            organisationId: organisation.id,
                            valueFree: true,
                          },
                        },
                      },
                    },
                    decision: true,
                    historyRecords: {
                      orderBy: [
                        { reviewedAt: "desc" },
                        { createdAt: "desc" },
                        { id: "desc" },
                      ],
                      select: {
                        appbReportId: true,
                        createdAt: true,
                        id: true,
                        newDecision: true,
                        newReviewStatus: true,
                        organisationId: true,
                        previousDecision: true,
                        previousReviewStatus: true,
                        reviewedAt: true,
                        reviewerDisplayName: true,
                        reviewerUserId: true,
                        safeNote: true,
                        targetId: true,
                        targetKind: true,
                        templateVersionId: true,
                        valueFree: true,
                      },
                      take: APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT,
                      where: {
                        organisationId: organisation.id,
                        valueFree: true,
                      },
                    },
                    id: true,
                    reviewedAt: true,
                    reviewerDisplayName: true,
                    reviewerUserId: true,
                    reviewStatus: true,
                    safeNote: true,
                    targetId: true,
                    targetKind: true,
                    templateVersionId: true,
                  },
                  where: {
                    organisationId: organisation.id,
                  },
                },
                missingDataSummary: true,
                status: true,
                templateProfileId: true,
                templateVersionLabel: true,
              },
              where: {
                organisationId: organisation.id,
              },
            },
          },
          orderBy: {
            startsOn: "asc",
          },
          where: {
            organisationId: organisation.id,
          },
        },
      },
      orderBy: [
        {
          fundingPeriodStart: "desc",
        },
        {
          title: "asc",
        },
      ],
      where: {
        organisationId: organisation.id,
      },
    });
    const appbReportIds = grants.flatMap((grant) =>
      grant.reportingPeriods.flatMap((period) =>
        period.appbReports.map((report) => report.id),
      ),
    );
    const reviewNoteRejections =
      appbReportIds.length > 0
        ? await prisma.auditLog.findMany({
            orderBy: {
              createdAt: "desc",
            },
            select: {
              entityId: true,
              metadata: true,
            },
            where: {
              action: "REJECTED",
              entityId: {
                in: appbReportIds,
              },
              entityType: "AppbMappingReviewDecisionRecord",
              metadata: {
                path: ["event"],
                equals: "appb_mapping_review_note_rejected",
              },
              organisationId: organisation.id,
            },
          })
        : [];

    return {
      grants: grants.map((grant) => ({
        appbReportCount: grant.appbReports.length,
        funder: formatEnumLabel(grant.funder),
        fundingAgreementNumber: grant.fundingAgreementNumber ?? undefined,
        fundingPeriod: formatDateRange(
          grant.fundingPeriodStart,
          grant.fundingPeriodEnd,
        ),
        id: grant.id,
        programType: formatEnumLabel(grant.programType),
        project: grant.project
          ? `${grant.project.name} (${grant.project.code})`
          : undefined,
        rangerProgram: grant.rangerProgram?.name,
        reportingPeriods: grant.reportingPeriods.map((period) => ({
          appbReports: period.appbReports.map((report) => ({
            id: report.id,
            mappingReviews: report.mappingReviewDecisions.map((review) => {
              const targetKind = formatMappingReviewTargetKind(
                review.targetKind,
              );
              const decisionVersions =
                shapeAppbMappingReviewDecisionHistory(review.historyRecords, {
                  appbReportId: report.id,
                  organisationId: organisation.id,
                  targetId: review.targetId,
                  targetKind,
                  templateVersionId: review.templateVersionId,
                });
              const olderDecisionVersionCount =
                countOlderAppbMappingReviewHistoryEvents(
                  review._count.historyRecords,
                  decisionVersions.length,
                );
              const lastLoadedHistoryRecord = review.historyRecords.at(-1);

              return {
                decision: formatMappingReviewDecision(review.decision),
                history: {
                  currentDecisionRecorded: true,
                  decisionVersions,
                  nextCursor:
                    olderDecisionVersionCount > 0 && lastLoadedHistoryRecord
                      ? createAppbMappingReviewHistoryCursor(
                          lastLoadedHistoryRecord,
                        )
                      : undefined,
                  olderDecisionVersionCount,
                  previousDecisionAvailable: decisionVersions.some(
                    (version) =>
                      Boolean(
                        version.previousDecision || version.previousStatus,
                      ),
                  ),
                  rejectedNoteReasonCounts: buildRejectedNoteReasonCounts(
                    reviewNoteRejections.filter(
                      (auditLog) => auditLog.entityId === report.id,
                    ),
                    {
                      targetId: review.targetId,
                      targetKind,
                      templateVersionId: review.templateVersionId,
                    },
                  ),
                  valueFree: true,
                },
                id: review.id,
                reviewedAt: review.reviewedAt.toISOString(),
                reviewerDisplayName: review.reviewerDisplayName ?? undefined,
                reviewerUserId: review.reviewerUserId ?? undefined,
                safeNote: review.safeNote ?? undefined,
                status: formatMappingReviewStatus(review.reviewStatus),
                targetId: review.targetId,
                targetKind,
                templateVersionId: review.templateVersionId,
              };
            }),
            manualFields: report.manualFieldValues.map((field) => ({
              fieldGroup: field.fieldGroup,
              fieldId: field.fieldId,
              fieldLabel: field.fieldLabel,
              fieldType: formatEnumLabel(field.fieldType),
              notes: field.notes ?? undefined,
              sensitivity: formatEnumLabel(field.sensitivity),
              status: formatEnumLabel(field.status),
              valueDate: field.valueDate
                ? formatDateInputValue(field.valueDate)
                : undefined,
              valueNumber: field.valueNumber?.toString(),
              valueText: field.valueText ?? undefined,
            })),
            missingDataSummary: report.missingDataSummary ?? undefined,
            status: formatEnumLabel(report.status),
            templateProfileId: report.templateProfileId,
            templateVersionLabel: report.templateVersionLabel,
          })),
          cycle: formatEnumLabel(period.cycle),
          dateRange: formatDateRange(period.startsOn, period.endsOn),
          dueOn: period.dueOn ? formatShortDate(period.dueOn) : undefined,
          id: period.id,
          label: period.label,
          status: formatEnumLabel(period.status),
        })),
        status: formatEnumLabel(grant.status),
        title: grant.title,
      })),
      isDatabaseAvailable: true,
      isDatabaseConfigured: true,
    };
  } catch {
    return {
      grants: [],
      isDatabaseAvailable: false,
      isDatabaseConfigured: true,
    };
  }
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateRange(start: Date, end: Date) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatMappingReviewDecision(
  value: string,
): AppbPersistedMappingReview["decision"] {
  switch (value) {
    case "MARK_REVIEWED":
      return "mark-reviewed";
    case "MARK_BLOCKED_FORMULA":
      return "mark-blocked-formula";
    case "MARK_BLOCKED_HIDDEN_SHEET":
      return "mark-blocked-hidden-sheet";
    case "MARK_BLOCKED_UNSUPPORTED":
      return "mark-blocked-unsupported";
    case "MARK_UNMAPPED":
      return "mark-unmapped";
    case "MARK_READY_FOR_FUTURE_EXPORT":
      return "mark-ready-for-future-export";
    case "KEEP_NEEDS_REVIEW":
    default:
      return "keep-needs-review";
  }
}

function formatMappingReviewStatus(
  value: string,
): AppbPersistedMappingReview["status"] {
  switch (value) {
    case "UNMAPPED":
      return "unmapped";
    case "REVIEWED":
      return "reviewed";
    case "BLOCKED_FORMULA":
      return "blocked-formula";
    case "BLOCKED_HIDDEN_SHEET":
      return "blocked-hidden-sheet";
    case "BLOCKED_UNSUPPORTED":
      return "blocked-unsupported";
    case "READY_FOR_FUTURE_EXPORT":
      return "ready-for-future-export";
    case "NEEDS_REVIEW":
    default:
      return "needs-review";
  }
}

function formatMappingReviewTargetKind(
  value: string,
): AppbPersistedMappingReview["targetKind"] {
  return value === "REPEATABLE_RANGE" ? "repeatable-range" : "field-mapping";
}

function buildRejectedNoteReasonCounts(
  auditLogs: Array<{ metadata: Prisma.JsonValue | null }>,
  target: {
    targetId: string;
    targetKind: AppbPersistedMappingReview["targetKind"];
    templateVersionId: string;
  },
): AppbPersistedMappingReview["history"]["rejectedNoteReasonCounts"] {
  const counts = new Map<string, number>();

  for (const auditLog of auditLogs) {
    const metadata = safeAuditMetadata(auditLog.metadata);

    if (
      !metadata ||
      metadata.valueFree !== true ||
      metadata.event !== "appb_mapping_review_note_rejected" ||
      metadata.targetId !== target.targetId ||
      metadata.targetKind !== target.targetKind ||
      metadata.templateVersionId !== target.templateVersionId
    ) {
      continue;
    }

    counts.set(
      metadata.rejectionReasonCode,
      (counts.get(metadata.rejectionReasonCode) ?? 0) + 1,
    );
  }

  return Array.from(counts.entries())
    .map(([reasonCode, count]) => ({ count, reasonCode }))
    .sort((first, second) => first.reasonCode.localeCompare(second.reasonCode));
}

function safeAuditMetadata(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata as Record<string, Prisma.JsonValue>;

  if (
    value.event !== "appb_mapping_review_note_rejected" ||
    value.valueFree !== true ||
    typeof value.rejectionReasonCode !== "string" ||
    typeof value.targetId !== "string" ||
    typeof value.targetKind !== "string" ||
    typeof value.templateVersionId !== "string"
  ) {
    return null;
  }

  if (
    value.targetKind !== "field-mapping" &&
    value.targetKind !== "repeatable-range"
  ) {
    return null;
  }

  return {
    event: value.event,
    rejectionReasonCode: value.rejectionReasonCode,
    targetId: value.targetId,
    targetKind: value.targetKind,
    templateVersionId: value.templateVersionId,
    valueFree: value.valueFree,
  };
}
