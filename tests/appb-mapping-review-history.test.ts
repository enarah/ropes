import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT,
  buildAppbMappingReviewHistoryCursorBoundary,
  buildAppbMappingReviewHistoryCursorPageMetadata,
  countOlderAppbMappingReviewHistoryEvents,
  createAppbMappingReviewHistoryCursor,
  isAppbMappingReviewHistoryCursorAnchor,
  parseAppbMappingReviewHistoryCursor,
  shapeAppbMappingReviewDecisionHistory,
  type AppbMappingReviewHistoryRecordInput,
} from "../lib/appb-mapping-review-history";

const cursorSigningSecret =
  "test-only-appb-mapping-review-history-secret-32-bytes";

test("APP&B mapping review history uses the compact three-event default", () => {
  assert.equal(APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT, 3);
});

test("APP&B mapping review history reports only unloaded older events", () => {
  assert.equal(countOlderAppbMappingReviewHistoryEvents(8, 3), 5);
  assert.equal(countOlderAppbMappingReviewHistoryEvents(3, 3), 0);
  assert.equal(countOlderAppbMappingReviewHistoryEvents(2, 3), 0);
});

test("APP&B mapping review history creates and parses a value-free cursor", () => {
  const cursor = createAppbMappingReviewHistoryCursor(
    {
      createdAt: "2026-07-17T09:59:59.000Z",
      id: "history-3",
      reviewedAt: "2026-07-17T10:00:00.000Z",
    },
    cursorSigningSecret,
  );

  assert.ok(cursor);
  assert.deepEqual(
    parseAppbMappingReviewHistoryCursor(cursor, cursorSigningSecret),
    {
      createdAt: new Date("2026-07-17T09:59:59.000Z"),
      id: "history-3",
      reviewedAt: new Date("2026-07-17T10:00:00.000Z"),
    },
  );
  const [payload, signature] = cursor.split(".");
  const decodedPayload = JSON.parse(
    Buffer.from(payload ?? "", "base64url").toString("utf8"),
  ) as Record<string, unknown>;

  assert.deepEqual(Object.keys(decodedPayload).sort(), ["c", "i", "r", "v"]);
  assert.equal(typeof signature, "string");
  assert.equal(cursor.includes("workbook"), false);
});

test("APP&B mapping review history rejects malformed cursors", () => {
  assert.equal(
    parseAppbMappingReviewHistoryCursor("", cursorSigningSecret),
    undefined,
  );
  assert.equal(
    parseAppbMappingReviewHistoryCursor("not-a-token", cursorSigningSecret),
    undefined,
  );
});

test("APP&B mapping review history rejects tampered payloads", () => {
  const cursor = createTestCursor();
  const [payload, signature] = cursor.split(".");
  const tamperedPayload = `${payload?.slice(0, -1)}${payload?.endsWith("A") ? "B" : "A"}`;

  assert.equal(
    parseAppbMappingReviewHistoryCursor(
      `${tamperedPayload}.${signature}`,
      cursorSigningSecret,
    ),
    undefined,
  );
});

test("APP&B mapping review history rejects tampered signatures", () => {
  const cursor = createTestCursor();
  const [payload, signature] = cursor.split(".");
  const tamperedSignature = `${signature?.slice(0, -1)}${signature?.endsWith("A") ? "B" : "A"}`;

  assert.equal(
    parseAppbMappingReviewHistoryCursor(
      `${payload}.${tamperedSignature}`,
      cursorSigningSecret,
    ),
    undefined,
  );
});

test("APP&B mapping review history rejects a valid signature for an unsupported version", () => {
  const payload = Buffer.from(
    JSON.stringify({
      c: "2026-07-17T09:59:59.000Z",
      i: "history-3",
      r: "2026-07-17T10:00:00.000Z",
      v: 1,
    }),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", cursorSigningSecret)
    .update(payload, "utf8")
    .digest("base64url");

  assert.equal(
    parseAppbMappingReviewHistoryCursor(
      `${payload}.${signature}`,
      cursorSigningSecret,
    ),
    undefined,
  );
});

test("APP&B mapping review history rejects cursors signed with another secret", () => {
  assert.equal(
    parseAppbMappingReviewHistoryCursor(
      createTestCursor(),
      "another-test-only-cursor-signing-secret-with-32-bytes",
    ),
    undefined,
  );
});

test("APP&B mapping review history rejects a configured secret shorter than 32 bytes", () => {
  assert.equal(
    createAppbMappingReviewHistoryCursor(
      {
        createdAt: "2026-07-17T09:59:59.000Z",
        id: "history-3",
        reviewedAt: "2026-07-17T10:00:00.000Z",
      },
      "too-short",
    ),
    undefined,
  );
});

test("APP&B mapping review history builds the stable newest-first cursor boundary", () => {
  const cursor = parseAppbMappingReviewHistoryCursor(
    createAppbMappingReviewHistoryCursor(
      {
        createdAt: "2026-07-17T09:59:59.000Z",
        id: "history-3",
        reviewedAt: "2026-07-17T10:00:00.000Z",
      },
      cursorSigningSecret,
    ) ?? "",
    cursorSigningSecret,
  );

  assert.ok(cursor);
  assert.deepEqual(buildAppbMappingReviewHistoryCursorBoundary(cursor), {
    OR: [
      { reviewedAt: { lt: new Date("2026-07-17T10:00:00.000Z") } },
      {
        createdAt: { lt: new Date("2026-07-17T09:59:59.000Z") },
        reviewedAt: new Date("2026-07-17T10:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-07-17T09:59:59.000Z"),
        id: { lt: "history-3" },
        reviewedAt: new Date("2026-07-17T10:00:00.000Z"),
      },
    ],
  });
});

test("APP&B mapping review history shapes safe cursor page metadata", () => {
  const lastRecord = {
    createdAt: "2026-07-17T09:59:59.000Z",
    id: "history-3",
    reviewedAt: "2026-07-17T10:00:00.000Z",
  };
  const page = buildAppbMappingReviewHistoryCursorPageMetadata({
    lastRecord,
    loadedRecordCount: 3,
    signingSecret: cursorSigningSecret,
    totalOlderEventCount: 5,
  });

  assert.equal(page.remainingCount, 2);
  assert.ok(page.nextCursor);
  assert.deepEqual(
    parseAppbMappingReviewHistoryCursor(
      page.nextCursor,
      cursorSigningSecret,
    ),
    {
      createdAt: new Date(lastRecord.createdAt),
      id: lastRecord.id,
      reviewedAt: new Date(lastRecord.reviewedAt),
    },
  );
  assert.deepEqual(
    buildAppbMappingReviewHistoryCursorPageMetadata({
      lastRecord,
      loadedRecordCount: 2,
      signingSecret: cursorSigningSecret,
      totalOlderEventCount: 2,
    }),
    { nextCursor: undefined, remainingCount: 0 },
  );
});

test("APP&B mapping review history rejects stale or mismatched cursor anchors", () => {
  const cursor = parseAppbMappingReviewHistoryCursor(
    createTestCursor(),
    cursorSigningSecret,
  );

  assert.ok(cursor);
  assert.equal(isAppbMappingReviewHistoryCursorAnchor(cursor, null), false);
  assert.equal(
    isAppbMappingReviewHistoryCursorAnchor(cursor, {
      createdAt: cursor.createdAt,
      id: "another-history-record",
      reviewedAt: cursor.reviewedAt,
    }),
    false,
  );
  assert.equal(
    isAppbMappingReviewHistoryCursorAnchor(cursor, {
      createdAt: cursor.createdAt,
      id: cursor.id,
      reviewedAt: cursor.reviewedAt,
    }),
    true,
  );
});

function createTestCursor() {
  const cursor = createAppbMappingReviewHistoryCursor(
    {
      createdAt: "2026-07-17T09:59:59.000Z",
      id: "history-3",
      reviewedAt: "2026-07-17T10:00:00.000Z",
    },
    cursorSigningSecret,
  );

  assert.ok(cursor);
  return cursor;
}

const target = {
  appbReportId: "report-1",
  organisationId: "organisation-1",
  targetId: "mapping-1",
  targetKind: "field-mapping" as const,
  templateVersionId: "annual-plan-v1",
};

function historyRecord(
  overrides: Partial<AppbMappingReviewHistoryRecordInput> = {},
): AppbMappingReviewHistoryRecordInput {
  return {
    appbReportId: target.appbReportId,
    newDecision: "MARK_REVIEWED",
    newReviewStatus: "REVIEWED",
    organisationId: target.organisationId,
    previousDecision: null,
    previousReviewStatus: null,
    reviewedAt: new Date("2026-07-16T10:00:00.000Z"),
    reviewerDisplayName: "Test Reviewer",
    reviewerUserId: "user-1",
    safeNote: "Range reviewed against template structure",
    targetId: target.targetId,
    targetKind: "FIELD_MAPPING",
    templateVersionId: target.templateVersionId,
    valueFree: true,
    ...overrides,
  };
}

test("APP&B mapping review history shapes a current-decision creation event", () => {
  assert.deepEqual(
    shapeAppbMappingReviewDecisionHistory([historyRecord()], target),
    [
      {
        newDecision: "mark-reviewed",
        newStatus: "reviewed",
        previousDecision: undefined,
        previousStatus: undefined,
        reviewedAt: "2026-07-16T10:00:00.000Z",
        reviewerDisplayName: "Test Reviewer",
        reviewerUserId: "user-1",
        safeNote: "Range reviewed against template structure",
        targetId: "mapping-1",
        targetKind: "field-mapping",
        templateVersionId: "annual-plan-v1",
        valueFree: true,
      },
    ],
  );
});

test("APP&B mapping review history shapes previous and new decision metadata", () => {
  const [version] = shapeAppbMappingReviewDecisionHistory(
    [
      historyRecord({
        newDecision: "MARK_BLOCKED_UNSUPPORTED",
        newReviewStatus: "BLOCKED_UNSUPPORTED",
        previousDecision: "KEEP_NEEDS_REVIEW",
        previousReviewStatus: "NEEDS_REVIEW",
      }),
    ],
    target,
  );

  assert.equal(version?.previousDecision, "keep-needs-review");
  assert.equal(version?.previousStatus, "needs-review");
  assert.equal(version?.newDecision, "mark-blocked-unsupported");
  assert.equal(version?.newStatus, "blocked-unsupported");
  assert.equal(version?.valueFree, true);
});

test("APP&B mapping review history sorts the most recent events first", () => {
  const versions = shapeAppbMappingReviewDecisionHistory(
    [
      historyRecord({ reviewedAt: "2026-07-14T10:00:00.000Z" }),
      historyRecord({ reviewedAt: "2026-07-16T10:00:00.000Z" }),
      historyRecord({ reviewedAt: "2026-07-15T10:00:00.000Z" }),
    ],
    target,
  );

  assert.deepEqual(
    versions.map((version) => version.reviewedAt),
    [
      "2026-07-16T10:00:00.000Z",
      "2026-07-15T10:00:00.000Z",
      "2026-07-14T10:00:00.000Z",
    ],
  );
});

test("APP&B mapping review history excludes non-value-free and mismatched records", () => {
  const records = [
    historyRecord({ valueFree: false }),
    historyRecord({ organisationId: "other-organisation" }),
    historyRecord({ appbReportId: "other-report" }),
    historyRecord({ targetId: "other-mapping" }),
    historyRecord({ templateVersionId: "other-version" }),
    historyRecord({ newDecision: "UNKNOWN_DECISION" }),
  ];

  assert.deepEqual(
    shapeAppbMappingReviewDecisionHistory(records, target),
    [],
  );
});
