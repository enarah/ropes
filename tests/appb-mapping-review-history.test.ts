import assert from "node:assert/strict";
import test from "node:test";
import {
  shapeAppbMappingReviewDecisionHistory,
  type AppbMappingReviewHistoryRecordInput,
} from "../lib/appb-mapping-review-history";

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
