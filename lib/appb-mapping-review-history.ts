import type {
  AppbMappingReviewDecision,
  AppbMappingReviewDecisionHistoryEntry,
  AppbMappingReviewStatus,
  AppbMappingReviewTargetKind,
} from "./appb-reporting";

export const APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT = 3;

export type AppbMappingReviewHistoryRecordInput = {
  appbReportId: string;
  newDecision: string;
  newReviewStatus: string;
  organisationId: string;
  previousDecision: string | null;
  previousReviewStatus: string | null;
  reviewedAt: Date | string;
  reviewerDisplayName: string | null;
  reviewerUserId: string | null;
  safeNote: string | null;
  targetId: string;
  targetKind: string;
  templateVersionId: string;
  valueFree: boolean;
};

export function shapeAppbMappingReviewDecisionHistory(
  records: AppbMappingReviewHistoryRecordInput[],
  target: {
    appbReportId: string;
    organisationId: string;
    targetId: string;
    targetKind: AppbMappingReviewTargetKind;
    templateVersionId: string;
  },
): AppbMappingReviewDecisionHistoryEntry[] {
  return records
    .flatMap((record) => {
      const targetKind = formatTargetKind(record.targetKind);
      const newDecision = formatDecision(record.newDecision);
      const newStatus = formatStatus(record.newReviewStatus);
      const previousDecision = record.previousDecision
        ? formatDecision(record.previousDecision)
        : undefined;
      const previousStatus = record.previousReviewStatus
        ? formatStatus(record.previousReviewStatus)
        : undefined;

      if (
        record.valueFree !== true ||
        record.organisationId !== target.organisationId ||
        record.appbReportId !== target.appbReportId ||
        targetKind !== target.targetKind ||
        record.targetId !== target.targetId ||
        record.templateVersionId !== target.templateVersionId ||
        !newDecision ||
        !newStatus ||
        (record.previousDecision !== null && !previousDecision) ||
        (record.previousReviewStatus !== null && !previousStatus)
      ) {
        return [];
      }

      return [
        {
          newDecision,
          newStatus,
          previousDecision,
          previousStatus,
          reviewedAt:
            record.reviewedAt instanceof Date
              ? record.reviewedAt.toISOString()
              : record.reviewedAt,
          reviewerDisplayName: record.reviewerDisplayName ?? undefined,
          reviewerUserId: record.reviewerUserId ?? undefined,
          safeNote: record.safeNote ?? undefined,
          targetId: record.targetId,
          targetKind,
          templateVersionId: record.templateVersionId,
          valueFree: true as const,
        },
      ];
    })
    .sort((first, second) =>
      second.reviewedAt.localeCompare(first.reviewedAt),
    );
}

export function countOlderAppbMappingReviewHistoryEvents(
  totalEventCount: number,
  loadedEventCount: number,
) {
  return Math.max(totalEventCount - loadedEventCount, 0);
}

function formatDecision(
  value: string,
): AppbMappingReviewDecision | undefined {
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
      return "keep-needs-review";
    default:
      return undefined;
  }
}

function formatStatus(value: string): AppbMappingReviewStatus | undefined {
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
      return "needs-review";
    default:
      return undefined;
  }
}

function formatTargetKind(
  value: string,
): AppbMappingReviewTargetKind | undefined {
  switch (value) {
    case "FIELD_MAPPING":
      return "field-mapping";
    case "REPEATABLE_RANGE":
      return "repeatable-range";
    default:
      return undefined;
  }
}
