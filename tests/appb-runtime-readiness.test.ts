import assert from "node:assert/strict";
import test from "node:test";
import { getAppbMappingReviewHistoryCursorReadinessStatus } from "../lib/appb-mapping-review-history";
import {
  APPB_RUNTIME_REQUIRED_CAPABILITIES,
  buildAppbRuntimeReadinessSummary,
} from "../lib/appb-runtime-readiness";

const validCursorSecret =
  "test-only-appb-runtime-readiness-cursor-secret-32-bytes";

test("APP&B runtime readiness reports the authorised production foundation safely", () => {
  const summary = buildAppbRuntimeReadinessSummary({
    accessMode: "authenticated",
    appbReportCount: 2,
    capabilityKeys: [...APPB_RUNTIME_REQUIRED_CAPABILITIES],
    cursorConfigurationStatus:
      getAppbMappingReviewHistoryCursorReadinessStatus({
        cursorSecret: validCursorSecret,
        nodeEnv: "production",
      }),
    databaseAvailable: true,
    databaseConfigured: true,
    reportDataCheckPerformed: true,
  });

  assert.equal(summary.valueFree, true);
  assert.deepEqual(row(summary, "Database"), {
    detail: "The organisation-scoped APP&B read completed successfully.",
    label: "Database",
    state: "Ready",
    tone: "pass",
  });
  assert.equal(row(summary, "Tenant access").state, "Ready");
  assert.equal(
    row(summary, "History cursor signing").state,
    "Configured for production",
  );
  assert.equal(row(summary, "APP&B report data").state, "Ready");
  assert.equal(row(summary, "Value-free history").state, "Ready");
  assert.equal(row(summary, "Workbook export").state, "Blocked");
  assert.equal(row(summary, "Unsupported areas").state, "Unsupported");

  const serialised = JSON.stringify(summary);
  assert.equal(serialised.includes(validCursorSecret), false);
  assert.equal(serialised.includes("32"), false);
});

test("APP&B runtime readiness identifies every missing required capability", () => {
  const summary = buildAppbRuntimeReadinessSummary({
    accessMode: "authenticated",
    appbReportCount: 0,
    capabilityKeys: [],
    cursorConfigurationStatus: "configured-production",
    databaseAvailable: true,
    databaseConfigured: true,
    reportDataCheckPerformed: true,
  });

  for (const capability of APPB_RUNTIME_REQUIRED_CAPABILITIES) {
    const capabilityRow = row(summary, `Capability: ${capability}`);
    assert.equal(capabilityRow.state, "Blocked");
    assert.equal(capabilityRow.tone, "block");
  }
});

test("APP&B runtime readiness labels local fallbacks without exposing config", () => {
  const cursorConfigurationStatus =
    getAppbMappingReviewHistoryCursorReadinessStatus({
      cursorSecret: undefined,
      nodeEnv: "development",
    });
  const summary = buildAppbRuntimeReadinessSummary({
    accessMode: "demo-fallback",
    appbReportCount: 0,
    capabilityKeys: [...APPB_RUNTIME_REQUIRED_CAPABILITIES],
    cursorConfigurationStatus,
    databaseAvailable: false,
    databaseConfigured: false,
    reportDataCheckPerformed: false,
  });

  assert.equal(cursorConfigurationStatus, "development-fallback");
  assert.equal(row(summary, "Tenant access").state, "Warning");
  assert.equal(row(summary, "Database").state, "Not configured");
  assert.equal(
    row(summary, "History cursor signing").state,
    "Development fallback active",
  );
});

test("APP&B runtime readiness blocks invalid production cursor configuration", () => {
  const cursorConfigurationStatus =
    getAppbMappingReviewHistoryCursorReadinessStatus({
      cursorSecret: "too-short",
      nodeEnv: "production",
    });
  const summary = buildAppbRuntimeReadinessSummary({
    accessMode: "authenticated",
    appbReportCount: 0,
    capabilityKeys: [...APPB_RUNTIME_REQUIRED_CAPABILITIES],
    cursorConfigurationStatus,
    databaseAvailable: false,
    databaseConfigured: true,
    reportDataCheckPerformed: false,
  });

  assert.equal(cursorConfigurationStatus, "invalid-production");
  assert.equal(
    row(summary, "History cursor signing").state,
    "Missing or invalid production configuration",
  );
  assert.equal(row(summary, "History cursor signing").tone, "block");
  assert.equal(row(summary, "Database").state, "Warning");
  assert.equal(row(summary, "APP&B report data").state, "Warning");
});

function row(
  summary: ReturnType<typeof buildAppbRuntimeReadinessSummary>,
  label: string,
) {
  const readinessRow = summary.rows.find((candidate) => candidate.label === label);
  assert.ok(readinessRow, `Expected readiness row: ${label}`);
  return readinessRow;
}
