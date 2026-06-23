import {
  appbTemplateVersions,
  type AppbFieldSourceType,
  type AppbTemplateField,
  type AppbTemplateVersion,
} from "@/lib/appb-reporting";
import type {
  AppbReportOverview,
  GrantOverview,
  GrantReportingPeriodOverview,
} from "@/lib/grants-appb-data";

export type AppbReadinessStatus =
  | "ready"
  | "missing-data"
  | "manual-required"
  | "range-review-required"
  | "formula-protected"
  | "future-data-source"
  | "blocked";

export type AppbReadinessCategory =
  | "organisation"
  | "grant"
  | "reporting-period"
  | "appb-report"
  | "project"
  | "ranger-program"
  | "activity-summary"
  | "fulcrum-evidence"
  | "manual-finance"
  | "manual-wage-personnel"
  | "manual-narrative"
  | "formula-protection"
  | "repeatable-table"
  | "export-readiness";

export type AppbReadinessItem = {
  category: AppbReadinessCategory;
  label: string;
  nextAction: string;
  reason: string;
  status: AppbReadinessStatus;
};

export type AppbReadinessStatusCount = {
  count: number;
  status: AppbReadinessStatus;
};

export type AppbReportReadinessSummary = {
  exportStatus: "blocked";
  items: AppbReadinessItem[];
  nextActions: string[];
  statusCounts: AppbReadinessStatusCount[];
  templateVersion?: {
    id: string;
    label: string;
  };
  topBlockers: AppbReadinessItem[];
};

type AppbReadinessInput = {
  grant: GrantOverview;
  organisationName: string;
  period: GrantReportingPeriodOverview;
  report: AppbReportOverview;
};

const readinessStatusOrder: AppbReadinessStatus[] = [
  "ready",
  "missing-data",
  "manual-required",
  "range-review-required",
  "formula-protected",
  "future-data-source",
  "blocked",
];

export function buildAppbReportReadinessSummary({
  grant,
  organisationName,
  period,
  report,
}: AppbReadinessInput): AppbReportReadinessSummary {
  const templateVersion = findTemplateVersion(report, period);

  if (!templateVersion) {
    const items: AppbReadinessItem[] = [
      {
        category: "export-readiness",
        label: "Template metadata",
        nextAction:
          "Add or select a reviewed APP&B template version before export can be considered.",
        reason:
          "ROPES could not match this report to a known template version.",
        status: "blocked",
      },
      exportBlockedItem(),
    ];

    return summarize(items);
  }

  const items = [
    ...templateVersion.fields.map((field) =>
      readinessItemForField({
        field,
        grant,
        organisationName,
        period,
        report,
      }),
    ),
    ...templateVersion.repeatableTables.map((table) => ({
      category: "repeatable-table" as const,
      label: table.label,
      nextAction:
        table.fieldSourceType === "manual"
          ? "Review the repeatable table range before any future export work."
          : "Define the data source and range mapping for this repeatable table.",
      reason:
        table.fieldSourceType === "manual"
          ? "The table is identified structurally, but exact row ranges are not mapped."
          : "The table depends on future derived or evidence data-source rules.",
      status:
        table.fieldSourceType === "manual"
          ? ("range-review-required" as const)
          : ("future-data-source" as const),
    })),
    ...templateVersion.exportReadinessChecks.map((check) => ({
      category: "export-readiness" as const,
      label: check.label,
      nextAction: "Resolve this export-readiness blocker in a later scoped PR.",
      reason: check.description,
      status:
        check.status === "manual-review"
          ? ("manual-required" as const)
          : ("blocked" as const),
    })),
    exportBlockedItem(),
  ];

  return summarize(items, templateVersion);
}

function findTemplateVersion(
  report: AppbReportOverview,
  period: GrantReportingPeriodOverview,
) {
  const profileMatches = appbTemplateVersions.filter(
    (version) => version.profileId === report.templateProfileId,
  );
  const label = normaliseLabel(report.templateVersionLabel);
  const exactLabelMatch = profileMatches.find(
    (version) => normaliseLabel(version.label) === label,
  );

  if (exactLabelMatch) {
    return exactLabelMatch;
  }

  const cycle = cycleFromLabel(period.cycle);
  const cycleMatches = profileMatches.filter(
    (version) => version.reportingCycle === cycle,
  );
  const containsLabelMatch = cycleMatches.find((version) => {
    const versionLabel = normaliseLabel(version.label);
    return versionLabel.includes(label) || label.includes(versionLabel);
  });

  return containsLabelMatch ?? cycleMatches[0] ?? profileMatches[0];
}

function readinessItemForField({
  field,
  grant,
  organisationName,
  period,
  report,
}: {
  field: AppbTemplateField;
  grant: GrantOverview;
  organisationName: string;
  period: GrantReportingPeriodOverview;
  report: AppbReportOverview;
}): AppbReadinessItem {
  const category = categoryForField(field);

  if (field.flags.includes("formulaProtected")) {
    return {
      category,
      label: field.label,
      nextAction: "Keep this workbook formula area protected from future writes.",
      reason: "Formula-protected workbook fields are never treated as writable.",
      status: "formula-protected",
    };
  }

  if (field.flags.includes("manualOnly")) {
    return {
      category,
      label: field.label,
      nextAction: "Keep this as manual review until ROPES explicitly owns the data.",
      reason:
        "This field group is manual-only and may include finance, personnel, narrative or report-only content.",
      status: "manual-required",
    };
  }

  if (isFutureSource(field.sourceType)) {
    return {
      category,
      label: field.label,
      nextAction:
        "Define a safe structured source and summary rule in a later reporting milestone.",
      reason:
        "This field depends on future derived activity, evidence or reporting data.",
      status: "future-data-source",
    };
  }

  const availability = structuredAvailability({
    field,
    grant,
    organisationName,
    period,
    report,
  });

  if (!availability.available) {
    return {
      category,
      label: field.label,
      nextAction: availability.nextAction,
      reason: availability.reason,
      status: "missing-data",
    };
  }

  if (field.cellReference.discoveryStatus === "needs-range-review") {
    return {
      category,
      label: field.label,
      nextAction:
        "Review the exact workbook cell or range before future export writes.",
      reason:
        "The structured data exists, but the verified workbook range has not been mapped.",
      status: "range-review-required",
    };
  }

  return {
    category,
    label: field.label,
    nextAction: "No action needed for this structured field.",
    reason: availability.reason,
    status: "ready",
  };
}

function structuredAvailability({
  field,
  grant,
  organisationName,
  period,
  report,
}: {
  field: AppbTemplateField;
  grant: GrantOverview;
  organisationName: string;
  period: GrantReportingPeriodOverview;
  report: AppbReportOverview;
}) {
  switch (field.sourceType) {
    case "organisation":
      return availability(Boolean(organisationName), "Organisation scope is selected.");
    case "grant":
      return availability(Boolean(grant.title), "Grant details are available.");
    case "grantReportingPeriod":
      return availability(
        Boolean(period.label && period.dateRange),
        "Reporting period details are available.",
      );
    case "appbReport":
      return availability(
        Boolean(report.status && report.templateProfileId),
        "APP&B report metadata is available.",
      );
    case "project":
      return availability(
        Boolean(grant.project),
        "Linked project details are available.",
        "Link a project to the grant before this field can be treated as present.",
      );
    case "rangerProgram":
      return availability(
        Boolean(grant.rangerProgram),
        "Linked ranger program details are available.",
        "Link a ranger program to the grant before this field can be treated as present.",
      );
    default:
      return availability(false, "No structured source is available.");
  }
}

function availability(
  available: boolean,
  readyReason: string,
  missingNextAction = "Add the missing structured data in a later scoped workflow.",
) {
  return {
    available,
    nextAction: available ? "Review exact range mapping before export." : missingNextAction,
    reason: available ? readyReason : "Required structured data is missing.",
  };
}

function categoryForField(field: AppbTemplateField): AppbReadinessCategory {
  if (field.flags.includes("formulaProtected")) {
    return "formula-protection";
  }

  if (field.flags.includes("manualOnly")) {
    if (field.id.includes("wage")) {
      return "manual-wage-personnel";
    }

    if (field.id.includes("narrative")) {
      return "manual-narrative";
    }

    if (
      field.id.includes("budget") ||
      field.id.includes("expenditure") ||
      field.id.includes("finance")
    ) {
      return "manual-finance";
    }

    return "appb-report";
  }

  switch (field.sourceType) {
    case "organisation":
      return "organisation";
    case "grant":
      return "grant";
    case "grantReportingPeriod":
      return "reporting-period";
    case "appbReport":
      return "appb-report";
    case "project":
      return "project";
    case "rangerProgram":
      return "ranger-program";
    case "fulcrumRecord":
      return "fulcrum-evidence";
    case "derived":
    case "future":
      return "activity-summary";
    default:
      return "export-readiness";
  }
}

function isFutureSource(sourceType: AppbFieldSourceType) {
  return (
    sourceType === "derived" ||
    sourceType === "future" ||
    sourceType === "fulcrumRecord"
  );
}

function summarize(
  items: AppbReadinessItem[],
  templateVersion?: AppbTemplateVersion,
): AppbReportReadinessSummary {
  const statusCounts = readinessStatusOrder.map((status) => ({
    count: items.filter((item) => item.status === status).length,
    status,
  }));
  const topBlockers = [...items]
    .filter((item) => item.status !== "ready")
    .sort((left, right) => blockerWeight(right.status) - blockerWeight(left.status))
    .slice(0, 4);
  const nextActions = Array.from(
    new Set(topBlockers.map((item) => item.nextAction)),
  ).slice(0, 3);

  return {
    exportStatus: "blocked",
    items,
    nextActions,
    statusCounts,
    templateVersion: templateVersion
      ? {
          id: templateVersion.id,
          label: templateVersion.label,
        }
      : undefined,
    topBlockers,
  };
}

function blockerWeight(status: AppbReadinessStatus) {
  switch (status) {
    case "blocked":
      return 6;
    case "range-review-required":
      return 5;
    case "formula-protected":
      return 4;
    case "missing-data":
      return 3;
    case "manual-required":
      return 2;
    case "future-data-source":
      return 1;
    case "ready":
      return 0;
  }
}

function exportBlockedItem(): AppbReadinessItem {
  return {
    category: "export-readiness",
    label: "Workbook export",
    nextAction:
      "Keep export disabled until exact range mapping, manual review and formula protection are completed.",
    reason: "Workbook generation is intentionally not implemented.",
    status: "blocked",
  };
}

function normaliseLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(copy|placeholder|review|template)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cycleFromLabel(value: string) {
  const label = normaliseLabel(value);

  if (label.includes("mid")) {
    return "mid-year-progress";
  }

  if (
    label.includes("acquittal") ||
    label.includes("final") ||
    label.includes("annual report")
  ) {
    return "annual-acquittal";
  }

  return "annual-planning";
}
