import type {
  AppbMappingReviewDecision,
  AppbMappingReviewDecisionHistoryEntry,
  AppbMappingReviewStatus,
  AppbMappingReviewTargetKind,
} from "./appb-reporting";

export const APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT = 3;

const APPB_MAPPING_REVIEW_HISTORY_CURSOR_VERSION = 1;
const APPB_MAPPING_REVIEW_HISTORY_MAX_CURSOR_LENGTH = 1_000;

export type AppbMappingReviewHistoryCursorRecord = {
  createdAt: Date | string;
  id: string;
  reviewedAt: Date | string;
};

export type AppbMappingReviewHistoryCursor = {
  createdAt: Date;
  id: string;
  reviewedAt: Date;
};

export type AppbMappingReviewHistoryLoadMoreInput = {
  appbReportId: string;
  cursor: string;
  organisationSlug: string;
  targetId: string;
  targetKind: AppbMappingReviewTargetKind;
  templateVersionId: string;
};

export type AppbMappingReviewHistoryLoadMoreResult =
  | {
      events: AppbMappingReviewDecisionHistoryEntry[];
      nextCursor?: string;
      remainingCount: number;
      status: "success";
      valueFree: true;
    }
  | {
      code: "access-denied" | "invalid-request" | "unavailable";
      events: [];
      remainingCount: 0;
      status: "error";
      valueFree: true;
    };

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

export function createAppbMappingReviewHistoryCursor(
  record: AppbMappingReviewHistoryCursorRecord,
) {
  const createdAt = normaliseCursorDate(record.createdAt);
  const reviewedAt = normaliseCursorDate(record.reviewedAt);

  if (
    !createdAt ||
    !reviewedAt ||
    typeof record.id !== "string" ||
    record.id.length === 0 ||
    record.id.length > 200
  ) {
    return undefined;
  }

  return encodeURIComponent(
    JSON.stringify({
      c: createdAt.toISOString(),
      i: record.id,
      r: reviewedAt.toISOString(),
      v: APPB_MAPPING_REVIEW_HISTORY_CURSOR_VERSION,
    }),
  );
}

export function parseAppbMappingReviewHistoryCursor(
  cursor: string,
): AppbMappingReviewHistoryCursor | undefined {
  if (
    typeof cursor !== "string" ||
    cursor.length === 0 ||
    cursor.length > APPB_MAPPING_REVIEW_HISTORY_MAX_CURSOR_LENGTH
  ) {
    return undefined;
  }

  try {
    const value = JSON.parse(decodeURIComponent(cursor)) as Record<
      string,
      unknown
    >;
    const createdAt = normaliseCursorDate(value["c"]);
    const reviewedAt = normaliseCursorDate(value["r"]);
    const id = value["i"];

    if (
      value["v"] !== APPB_MAPPING_REVIEW_HISTORY_CURSOR_VERSION ||
      !createdAt ||
      !reviewedAt ||
      typeof id !== "string" ||
      id.length === 0 ||
      id.length > 200
    ) {
      return undefined;
    }

    return { createdAt, id, reviewedAt };
  } catch {
    return undefined;
  }
}

export function buildAppbMappingReviewHistoryCursorBoundary(
  cursor: AppbMappingReviewHistoryCursor,
) {
  return {
    OR: [
      { reviewedAt: { lt: cursor.reviewedAt } },
      {
        createdAt: { lt: cursor.createdAt },
        reviewedAt: cursor.reviewedAt,
      },
      {
        createdAt: cursor.createdAt,
        id: { lt: cursor.id },
        reviewedAt: cursor.reviewedAt,
      },
    ],
  };
}

export function buildAppbMappingReviewHistoryCursorPageMetadata({
  lastRecord,
  loadedRecordCount,
  totalOlderEventCount,
}: {
  lastRecord?: AppbMappingReviewHistoryCursorRecord;
  loadedRecordCount: number;
  totalOlderEventCount: number;
}) {
  const remainingCount = Math.max(
    totalOlderEventCount - loadedRecordCount,
    0,
  );

  return {
    nextCursor:
      remainingCount > 0 && lastRecord
        ? createAppbMappingReviewHistoryCursor(lastRecord)
        : undefined,
    remainingCount,
  };
}

function normaliseCursorDate(value: unknown) {
  if (!(value instanceof Date) && typeof value !== "string") {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
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
