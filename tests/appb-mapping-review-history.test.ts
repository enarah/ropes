import assert from "node:assert/strict";
import test from "node:test";
import {
  APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT,
  buildAppbMappingReviewHistoryCursorBoundary,
  buildAppbMappingReviewHistoryCursorPageMetadata,
  countOlderAppbMappingReviewHistoryEvents,
  createAppbMappingReviewHistoryCursor,
  parseAppbMappingReviewHistoryCursor,
  shapeAppbMappingReviewDecisionHistory,
  type AppbMappingReviewHistoryRecordInput,
} from "../lib/appb-mapping-review-history";

test("APP&B mapping review history uses the compact three-event default", () => {
  assert.equal(APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT, 3);
});

test("APP&B mapping review history reports only unloaded older events", () => {
  assert.equal(countOlderAppbMappingReviewHistoryEvents(8, 3), 5);
  assert.equal(countOlderAppbMappingReviewHistoryEvents(3, 3), 0);
  assert.equal(countOlderAppbMappingReviewHistoryEvents(2, 3), 0);
});

test("APP&B mapping review history creates and parses a value-free cursor", () => {
  const cursor = createAppbMappingReviewHistoryCursor({
    createdAt: "2026-07-17T09:59:59.000Z",
    id: "history-3",
    reviewedAt: "2026-07-17T10:00:00.000Z",
  });

  assert.ok(cursor);
  assert.deepEqual(parseAppbMappingReviewHistoryCursor(cursor), {
    createdAt: new Date("2026-07-17T09:59:59.000Z"),
    id: "history-3",
    reviewedAt: new Date("2026-07-17T10:00:00.000Z"),
  });
  assert.equal(cursor.includes("workbook"), false);
});

test("APP&B mapping review history rejects malformed cursors", () => {
  assert.equal(parseAppbMappingReviewHistoryCursor(""), undefined);
  assert.equal(parseAppbMappingReviewHistoryCursor("not-json"), undefined);
  assert.equal(
    parseAppbMappingReviewHistoryCursor(
      encodeURIComponent(
        JSON.stringify({
          c: "2026-07-17T09:59:59.000Z",
          i: "history-3",
          r: "2026-07-17T10:00:00.000Z",
          v: 2,
        }),
      ),
    ),
    undefined,
  );
});

test("APP&B mapping review history builds the stable newest-first cursor boundary", () => {
  const cursor = parseAppbMappingReviewHistoryCursor(
    createAppbMappingReviewHistoryCursor({
      createdAt: "2026-07-17T09:59:59.000Z",
      id: "history-3",
      reviewedAt: "2026-07-17T10:00:00.000Z",
    }) ?? "",
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
    totalOlderEventCount: 5,
  });

  assert.equal(page.remainingCount, 2);
  assert.ok(page.nextCursor);
  assert.deepEqual(parseAppbMappingReviewHistoryCursor(page.nextCursor), {
    createdAt: new Date(lastRecord.createdAt),
    id: lastRecord.id,
    reviewedAt: new Date(lastRecord.reviewedAt),
  });
  assert.deepEqual(
    buildAppbMappingReviewHistoryCursorPageMetadata({
      lastRecord,
      loadedRecordCount: 2,
      totalOlderEventCount: 2,
    }),
    { nextCursor: undefined, remainingCount: 0 },
  );
});

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
