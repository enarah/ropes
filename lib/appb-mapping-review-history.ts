import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  AppbMappingReviewDecision,
  AppbMappingReviewDecisionHistoryEntry,
  AppbMappingReviewStatus,
  AppbMappingReviewTargetKind,
} from "./appb-reporting";

export const APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT = 3;

const APPB_MAPPING_REVIEW_HISTORY_CURSOR_VERSION = 2;
const APPB_MAPPING_REVIEW_HISTORY_MAX_CURSOR_LENGTH = 1_000;
const APPB_MAPPING_REVIEW_HISTORY_MINIMUM_SECRET_BYTES = 32;
const APPB_MAPPING_REVIEW_HISTORY_SIGNATURE_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

const globalForAppbMappingReviewHistory = globalThis as typeof globalThis & {
  appbMappingReviewHistoryDevelopmentCursorSecret?: string;
};

export type AppbMappingReviewHistoryCursorConfigurationSource =
  | "configured"
  | "invalid-non-production"
  | "process-local-fallback";

export class AppbMappingReviewHistoryCursorConfigurationError extends Error {
  readonly code: "missing-production-secret" | "short-production-secret";

  constructor(
    code: "missing-production-secret" | "short-production-secret",
  ) {
    super(
      "APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET is required in production and must contain at least 32 UTF-8 bytes.",
    );
    this.name = "AppbMappingReviewHistoryCursorConfigurationError";
    this.code = code;
  }
}

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

export function validateAppbMappingReviewHistoryCursorConfiguration(
  options: {
    cursorSecret?: string;
    nodeEnv?: string;
  } = {},
): {
  minimumSecretBytes: number;
  source: AppbMappingReviewHistoryCursorConfigurationSource;
} {
  const cursorSecret = Object.hasOwn(options, "cursorSecret")
    ? options.cursorSecret
    : process.env["APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET"];
  const nodeEnv = Object.hasOwn(options, "nodeEnv")
    ? options.nodeEnv
    : process.env["NODE_ENV"];
  const hasConfiguredSecret = Boolean(cursorSecret?.trim());
  const hasValidConfiguredSecret =
    hasConfiguredSecret &&
    Buffer.byteLength(cursorSecret ?? "", "utf8") >=
      APPB_MAPPING_REVIEW_HISTORY_MINIMUM_SECRET_BYTES;

  if (hasValidConfiguredSecret) {
    return {
      minimumSecretBytes: APPB_MAPPING_REVIEW_HISTORY_MINIMUM_SECRET_BYTES,
      source: "configured",
    };
  }

  if (nodeEnv === "production") {
    throw new AppbMappingReviewHistoryCursorConfigurationError(
      hasConfiguredSecret
        ? "short-production-secret"
        : "missing-production-secret",
    );
  }

  return {
    minimumSecretBytes: APPB_MAPPING_REVIEW_HISTORY_MINIMUM_SECRET_BYTES,
    source: hasConfiguredSecret
      ? "invalid-non-production"
      : "process-local-fallback",
  };
}

export function assertAppbMappingReviewHistoryCursorProductionConfiguration() {
  validateAppbMappingReviewHistoryCursorConfiguration();
}

export function isAppbMappingReviewHistoryCursorConfigurationError(
  error: unknown,
): error is AppbMappingReviewHistoryCursorConfigurationError {
  return error instanceof AppbMappingReviewHistoryCursorConfigurationError;
}

export function createAppbMappingReviewHistoryCursor(
  record: AppbMappingReviewHistoryCursorRecord,
  signingSecret?: string,
) {
  const createdAt = normaliseCursorDate(record.createdAt);
  const reviewedAt = normaliseCursorDate(record.reviewedAt);
  const secret = resolveAppbMappingReviewHistoryCursorSecret(signingSecret);

  if (
    !createdAt ||
    !reviewedAt ||
    !secret ||
    typeof record.id !== "string" ||
    record.id.length === 0 ||
    record.id.length > 200
  ) {
    return undefined;
  }

  const payload = Buffer.from(
    JSON.stringify({
      c: createdAt.toISOString(),
      i: record.id,
      r: reviewedAt.toISOString(),
      v: APPB_MAPPING_REVIEW_HISTORY_CURSOR_VERSION,
    }),
    "utf8",
  ).toString("base64url");

  return `${payload}.${signAppbMappingReviewHistoryCursorPayload(payload, secret)}`;
}

export function parseAppbMappingReviewHistoryCursor(
  cursor: string,
  signingSecret?: string,
): AppbMappingReviewHistoryCursor | undefined {
  if (
    typeof cursor !== "string" ||
    cursor.length === 0 ||
    cursor.length > APPB_MAPPING_REVIEW_HISTORY_MAX_CURSOR_LENGTH
  ) {
    return undefined;
  }

  try {
    const secret = resolveAppbMappingReviewHistoryCursorSecret(signingSecret);
    const [payload, signature, extraSegment] = cursor.split(".");

    if (
      !secret ||
      !payload ||
      !signature ||
      extraSegment !== undefined ||
      !APPB_MAPPING_REVIEW_HISTORY_SIGNATURE_PATTERN.test(signature) ||
      !verifyAppbMappingReviewHistoryCursorSignature(
        payload,
        signature,
        secret,
      )
    ) {
      return undefined;
    }

    const payloadBuffer = Buffer.from(payload, "base64url");

    if (payloadBuffer.toString("base64url") !== payload) {
      return undefined;
    }

    const value = JSON.parse(payloadBuffer.toString("utf8")) as Record<
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
  signingSecret,
  totalOlderEventCount,
}: {
  lastRecord?: AppbMappingReviewHistoryCursorRecord;
  loadedRecordCount: number;
  signingSecret?: string;
  totalOlderEventCount: number;
}) {
  const remainingCount = Math.max(
    totalOlderEventCount - loadedRecordCount,
    0,
  );

  return {
    nextCursor:
      remainingCount > 0 && lastRecord
        ? createAppbMappingReviewHistoryCursor(lastRecord, signingSecret)
        : undefined,
    remainingCount,
  };
}

export function isAppbMappingReviewHistoryCursorAnchor(
  cursor: AppbMappingReviewHistoryCursor,
  record?: AppbMappingReviewHistoryCursorRecord | null,
) {
  const createdAt = normaliseCursorDate(record?.createdAt);
  const reviewedAt = normaliseCursorDate(record?.reviewedAt);

  return Boolean(
    record &&
      createdAt &&
      reviewedAt &&
      record.id === cursor.id &&
      createdAt.getTime() === cursor.createdAt.getTime() &&
      reviewedAt.getTime() === cursor.reviewedAt.getTime(),
  );
}

function resolveAppbMappingReviewHistoryCursorSecret(
  signingSecret?: string,
) {
  const configuredSecret =
    signingSecret ??
    process.env["APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET"];
  const configuration =
    validateAppbMappingReviewHistoryCursorConfiguration({
      cursorSecret: configuredSecret,
      nodeEnv: process.env["NODE_ENV"],
    });

  if (configuration.source === "configured") {
    return configuredSecret;
  }

  if (configuration.source === "invalid-non-production") {
    return undefined;
  }

  globalForAppbMappingReviewHistory.appbMappingReviewHistoryDevelopmentCursorSecret ??=
    randomBytes(APPB_MAPPING_REVIEW_HISTORY_MINIMUM_SECRET_BYTES).toString(
      "base64url",
    );

  return globalForAppbMappingReviewHistory.appbMappingReviewHistoryDevelopmentCursorSecret;
}

function signAppbMappingReviewHistoryCursorPayload(
  payload: string,
  secret: string,
) {
  return createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64url");
}

function verifyAppbMappingReviewHistoryCursorSignature(
  payload: string,
  signature: string,
  secret: string,
) {
  const expectedSignature = signAppbMappingReviewHistoryCursorPayload(
    payload,
    secret,
  );
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
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
