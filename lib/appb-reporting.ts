export type AppbReportingCycle =
  | "annual-planning"
  | "mid-year-progress"
  | "annual-acquittal";

export type AppbFunder = "NIAA" | "DCCEEW" | "OTHER";
export type AppbProgramType = "IRP" | "IPA" | "MDBIRR" | "OTHER";

export type AppbSourceTemplate = {
  fileName: string;
  likelyCycle: AppbReportingCycle;
  notes: string;
};

export type AppbTemplateProfile = {
  description: string;
  funder: AppbFunder;
  id: string;
  programTypes: AppbProgramType[];
  reportingCycles: AppbReportingCycle[];
  sourceTemplates: string[];
};

export type AppbFutureConcept = {
  description: string;
  name: string;
};

export type AppbRopesDataSource = {
  appbUse: string;
  currentStatus: "available" | "persisted" | "partial" | "future";
  model: string;
};

export type AppbFieldSourceType =
  | "organisation"
  | "grant"
  | "grantReportingPeriod"
  | "appbReport"
  | "project"
  | "rangerProgram"
  | "trip"
  | "fulcrumRecord"
  | "manual"
  | "derived"
  | "future"
  | "formulaProtected";

export type AppbTemplateFieldFlag =
  | "required"
  | "manualOnly"
  | "structured"
  | "derived"
  | "repeatable"
  | "formulaProtected"
  | "exportBlockedUntilMapped";

export type AppbCellRangeReference = {
  discoveryStatus: "needs-workbook-inspection" | "known";
  label: string;
  sheetId: string;
  a1Reference?: string;
  namedRange?: string;
};

export type AppbWorkbookSheet = {
  description: string;
  id: string;
  name: string;
  sourceConfidence: "filename-only" | "workbook-inspected";
};

export type AppbTemplateSection = {
  description: string;
  fieldIds: string[];
  id: string;
  sheetId: string;
  title: string;
};

export type AppbTemplateField = {
  cellReference: AppbCellRangeReference;
  dataPath?: string;
  description: string;
  flags: AppbTemplateFieldFlag[];
  id: string;
  label: string;
  scope:
    | "organisation"
    | "grant"
    | "reporting-period"
    | "appb-report"
    | "manual-report-only";
  sectionId: string;
  sourceType: AppbFieldSourceType;
};

export type AppbTemplateMapping = {
  fieldId: string;
  id: string;
  reviewStatus: "needs-review" | "reviewed" | "blocked";
  sourcePath?: string;
  sourceType: AppbFieldSourceType;
  targetReference: AppbCellRangeReference;
};

export type AppbRepeatableTable = {
  anchorReference: AppbCellRangeReference;
  description: string;
  fieldSourceType: AppbFieldSourceType;
  id: string;
  label: string;
  rowIdentity: string;
  sectionId: string;
};

export type AppbManualField = {
  fieldId: string;
  reason: string;
};

export type AppbExportReadinessCheck = {
  description: string;
  id: string;
  label: string;
  status: "blocked" | "manual-review" | "ready-later";
};

export type AppbTemplateVersion = {
  discoveryNotes: string;
  exportReadinessChecks: AppbExportReadinessCheck[];
  fields: AppbTemplateField[];
  id: string;
  label: string;
  mappings: AppbTemplateMapping[];
  manualFields: AppbManualField[];
  profileId: string;
  repeatableTables: AppbRepeatableTable[];
  reportingCycle: AppbReportingCycle;
  sections: AppbTemplateSection[];
  sheets: AppbWorkbookSheet[];
  sourceTemplateFileName: string;
};

export type AppbGeneratedWorkbookPlaceholder = {
  description: string;
  enabled: false;
  reason: string;
};

export const appbSourceTemplates: AppbSourceTemplate[] = [
  {
    fileName: "APP&B - IRP, IPA and MDBIRR template - for 2025-26(3).xlsx",
    likelyCycle: "annual-planning",
    notes:
      "Annual planning workbook for IRP, IPA and MDBIRR-style program planning.",
  },
  {
    fileName: "NAC APP&B - IRP Round 1 of Expansion-2024-25.xlsx",
    likelyCycle: "annual-planning",
    notes: "Organisation-specific IRP workbook example for template profiling.",
  },
  {
    fileName: "APP&B - IRP, IPA and MDBIRR template - 25-26 mid Year.xlsx",
    likelyCycle: "mid-year-progress",
    notes: "Mid-year progress reporting workbook example.",
  },
  {
    fileName: "2025-26 Annual Report July-June Raukkan EA ALT - 4-IQXOB1V.xlsx",
    likelyCycle: "annual-acquittal",
    notes: "Annual report/acquittal workbook example for July-June reporting.",
  },
];

export const appbTemplateProfiles: AppbTemplateProfile[] = [
  {
    description:
      "Shared NIAA-style APP&B planning/reporting structure for IRP, IPA and MDBIRR programs.",
    funder: "NIAA",
    id: "niaa-irp-ipa-mdbirr-appb",
    programTypes: ["IRP", "IPA", "MDBIRR"],
    reportingCycles: [
      "annual-planning",
      "mid-year-progress",
      "annual-acquittal",
    ],
    sourceTemplates: appbSourceTemplates.map((template) => template.fileName),
  },
  {
    description:
      "Future DCCEEW APP&B profile placeholder for environment and land-management program reporting.",
    funder: "DCCEEW",
    id: "dcceew-appb-placeholder",
    programTypes: ["IPA", "MDBIRR", "OTHER"],
    reportingCycles: [
      "annual-planning",
      "mid-year-progress",
      "annual-acquittal",
    ],
    sourceTemplates: [],
  },
];

const sharedDiscoverySheets: AppbWorkbookSheet[] = [
  {
    description:
      "Expected workbook identity, funder, program and organisation details. Exact tab name still needs workbook inspection.",
    id: "workbook-identity",
    name: "Workbook identity",
    sourceConfidence: "filename-only",
  },
  {
    description:
      "Expected planning or reporting content for projects, activities, outputs and evidence. Exact tab structure still needs workbook inspection.",
    id: "program-reporting",
    name: "Program reporting",
    sourceConfidence: "filename-only",
  },
  {
    description:
      "Expected budget, acquittal or financial summary area. ROPES should not populate this until finance requirements are explicitly scoped.",
    id: "budget-acquittal",
    name: "Budget and acquittal",
    sourceConfidence: "filename-only",
  },
];

const sharedDiscoverySections: AppbTemplateSection[] = [
  {
    description:
      "Identifies the organisation, funder, program type, grant and reporting period represented by the workbook.",
    fieldIds: [
      "organisation-name",
      "grant-title",
      "program-type",
      "reporting-period",
    ],
    id: "identity-and-scope",
    sheetId: "workbook-identity",
    title: "Identity and scope",
  },
  {
    description:
      "Captures project, ranger program, planned or completed activities and evidence references.",
    fieldIds: [
      "project-name",
      "ranger-program",
      "activity-summary",
      "fulcrum-evidence-summary",
    ],
    id: "activities-and-evidence",
    sheetId: "program-reporting",
    title: "Activities and evidence",
  },
  {
    description:
      "Manual or future finance fields that must be protected from accidental export until budget/acquittal work is scoped.",
    fieldIds: ["manual-budget-summary", "formula-total"],
    id: "finance-and-formulas",
    sheetId: "budget-acquittal",
    title: "Finance and formulas",
  },
];

const sharedDiscoveryFields: AppbTemplateField[] = [
  {
    cellReference: needsInspection("workbook-identity", "Organisation name"),
    dataPath: "Organisation.name",
    description: "Selected organisation name for the tenant-scoped workbook.",
    flags: ["required", "structured", "exportBlockedUntilMapped"],
    id: "organisation-name",
    label: "Organisation name",
    scope: "organisation",
    sectionId: "identity-and-scope",
    sourceType: "organisation",
  },
  {
    cellReference: needsInspection("workbook-identity", "Grant title"),
    dataPath: "Grant.title",
    description: "Grant or funding agreement title selected for this report.",
    flags: ["required", "structured", "exportBlockedUntilMapped"],
    id: "grant-title",
    label: "Grant title",
    scope: "grant",
    sectionId: "identity-and-scope",
    sourceType: "grant",
  },
  {
    cellReference: needsInspection("workbook-identity", "Program type"),
    dataPath: "Grant.programType",
    description: "Program type such as IRP, IPA, MDBIRR or other.",
    flags: ["required", "structured", "exportBlockedUntilMapped"],
    id: "program-type",
    label: "Program type",
    scope: "grant",
    sectionId: "identity-and-scope",
    sourceType: "grant",
  },
  {
    cellReference: needsInspection("workbook-identity", "Reporting period"),
    dataPath: "GrantReportingPeriod.label",
    description: "Grant-scoped reporting period label and cycle.",
    flags: ["required", "structured", "exportBlockedUntilMapped"],
    id: "reporting-period",
    label: "Reporting period",
    scope: "reporting-period",
    sectionId: "identity-and-scope",
    sourceType: "grantReportingPeriod",
  },
  {
    cellReference: needsInspection("program-reporting", "Project name"),
    dataPath: "Project.name",
    description:
      "Linked project name where the grant is associated with a ROPES project.",
    flags: ["structured", "exportBlockedUntilMapped"],
    id: "project-name",
    label: "Project name",
    scope: "grant",
    sectionId: "activities-and-evidence",
    sourceType: "project",
  },
  {
    cellReference: needsInspection("program-reporting", "Ranger program"),
    dataPath: "RangerProgram.name",
    description:
      "Linked ranger program name where the grant is associated with a ROPES program.",
    flags: ["structured", "exportBlockedUntilMapped"],
    id: "ranger-program",
    label: "Ranger program",
    scope: "grant",
    sectionId: "activities-and-evidence",
    sourceType: "rangerProgram",
  },
  {
    cellReference: needsInspection("program-reporting", "Activity summary"),
    description:
      "Future derived summary from trips, itinerary rows and trip reports once reporting logic exists.",
    flags: ["derived", "repeatable", "exportBlockedUntilMapped"],
    id: "activity-summary",
    label: "Activity summary",
    scope: "appb-report",
    sectionId: "activities-and-evidence",
    sourceType: "derived",
  },
  {
    cellReference: needsInspection("program-reporting", "Fulcrum evidence summary"),
    description:
      "Future evidence summary from organisation-scoped Fulcrum records linked to grant activity.",
    flags: ["derived", "repeatable", "exportBlockedUntilMapped"],
    id: "fulcrum-evidence-summary",
    label: "Fulcrum evidence summary",
    scope: "appb-report",
    sectionId: "activities-and-evidence",
    sourceType: "fulcrumRecord",
  },
  {
    cellReference: needsInspection("budget-acquittal", "Manual budget summary"),
    description:
      "Budget or acquittal values should remain manual until finance data ownership is explicitly implemented.",
    flags: ["required", "manualOnly", "exportBlockedUntilMapped"],
    id: "manual-budget-summary",
    label: "Manual budget summary",
    scope: "manual-report-only",
    sectionId: "finance-and-formulas",
    sourceType: "manual",
  },
  {
    cellReference: needsInspection("budget-acquittal", "Formula total"),
    description:
      "Formula cells must be detected and protected from overwrite during any future export.",
    flags: ["formulaProtected", "exportBlockedUntilMapped"],
    id: "formula-total",
    label: "Formula total",
    scope: "manual-report-only",
    sectionId: "finance-and-formulas",
    sourceType: "formulaProtected",
  },
];

const sharedRepeatableTables: AppbRepeatableTable[] = [
  {
    anchorReference: needsInspection("program-reporting", "Activity rows"),
    description:
      "Future repeatable rows for trips, activities, outputs or evidence once the actual workbook range is inspected.",
    fieldSourceType: "derived",
    id: "activity-output-rows",
    label: "Activity/output rows",
    rowIdentity: "One row per mapped activity, trip, output or evidence item.",
    sectionId: "activities-and-evidence",
  },
  {
    anchorReference: needsInspection("program-reporting", "Evidence rows"),
    description:
      "Future repeatable evidence rows for Fulcrum records or activity report references.",
    fieldSourceType: "fulcrumRecord",
    id: "evidence-rows",
    label: "Evidence rows",
    rowIdentity: "One row per mapped evidence record or grouped evidence summary.",
    sectionId: "activities-and-evidence",
  },
];

const sharedTemplateMappings: AppbTemplateMapping[] = sharedDiscoveryFields.map(
  (field) => ({
    fieldId: field.id,
    id: `${field.id}-mapping`,
    reviewStatus: field.flags.includes("formulaProtected")
      ? "blocked"
      : "needs-review",
    sourcePath: field.dataPath,
    sourceType: field.sourceType,
    targetReference: field.cellReference,
  }),
);

const sharedManualFields: AppbManualField[] = [
  {
    fieldId: "manual-budget-summary",
    reason:
      "ROPES does not yet own budget/acquittal finance data, so these fields stay manual.",
  },
  {
    fieldId: "formula-total",
    reason:
      "Formula cells need workbook inspection and protection before export can write nearby values.",
  },
];

const sharedReadinessChecks: AppbExportReadinessCheck[] = [
  {
    description:
      "The actual XLSX workbook has not been inspected in app code, so sheet names, cell addresses, ranges and protection settings are unverified.",
    id: "workbook-inspection-required",
    label: "Workbook inspection required",
    status: "blocked",
  },
  {
    description:
      "Structured ROPES fields are identified, but every workbook field must be reviewed before export can be enabled.",
    id: "field-mapping-review-required",
    label: "Field mapping review required",
    status: "blocked",
  },
  {
    description:
      "Budget/acquittal fields remain manual until a future finance data model is explicitly scoped.",
    id: "finance-fields-manual",
    label: "Finance fields manual",
    status: "manual-review",
  },
];

export const appbTemplateVersions: AppbTemplateVersion[] = [
  {
    discoveryNotes:
      "Conservative annual planning metadata based on source filename only. Detailed sheet, range, formula and protection inspection remains a follow-up.",
    exportReadinessChecks: sharedReadinessChecks,
    fields: sharedDiscoveryFields,
    id: "niaa-irp-ipa-mdbirr-2025-26-annual-planning",
    label: "2025-26 annual planning template",
    mappings: sharedTemplateMappings,
    manualFields: sharedManualFields,
    profileId: "niaa-irp-ipa-mdbirr-appb",
    repeatableTables: sharedRepeatableTables,
    reportingCycle: "annual-planning",
    sections: sharedDiscoverySections,
    sheets: sharedDiscoverySheets,
    sourceTemplateFileName:
      "APP&B - IRP, IPA and MDBIRR template - for 2025-26(3).xlsx",
  },
  {
    discoveryNotes:
      "Organisation-specific IRP workbook example. Metadata is not treated as authoritative until the workbook is inspected.",
    exportReadinessChecks: sharedReadinessChecks,
    fields: sharedDiscoveryFields,
    id: "niaa-irp-expansion-2024-25-annual-planning",
    label: "2024-25 IRP expansion annual planning example",
    mappings: sharedTemplateMappings,
    manualFields: sharedManualFields,
    profileId: "niaa-irp-ipa-mdbirr-appb",
    repeatableTables: sharedRepeatableTables,
    reportingCycle: "annual-planning",
    sections: sharedDiscoverySections,
    sheets: sharedDiscoverySheets,
    sourceTemplateFileName: "NAC APP&B - IRP Round 1 of Expansion-2024-25.xlsx",
  },
  {
    discoveryNotes:
      "Mid-year progress reporting metadata based on source filename only. Repeatable activity/progress tables require workbook inspection.",
    exportReadinessChecks: sharedReadinessChecks,
    fields: sharedDiscoveryFields,
    id: "niaa-irp-ipa-mdbirr-2025-26-mid-year",
    label: "2025-26 mid-year progress template",
    mappings: sharedTemplateMappings,
    manualFields: sharedManualFields,
    profileId: "niaa-irp-ipa-mdbirr-appb",
    repeatableTables: sharedRepeatableTables,
    reportingCycle: "mid-year-progress",
    sections: sharedDiscoverySections,
    sheets: sharedDiscoverySheets,
    sourceTemplateFileName:
      "APP&B - IRP, IPA and MDBIRR template - 25-26 mid Year.xlsx",
  },
  {
    discoveryNotes:
      "Annual report/acquittal metadata based on source filename only. Export stays blocked until formulas, protected cells and manual finance fields are reviewed.",
    exportReadinessChecks: sharedReadinessChecks,
    fields: sharedDiscoveryFields,
    id: "niaa-irp-ipa-mdbirr-2025-26-annual-acquittal",
    label: "2025-26 annual report/acquittal template",
    mappings: sharedTemplateMappings,
    manualFields: sharedManualFields,
    profileId: "niaa-irp-ipa-mdbirr-appb",
    repeatableTables: sharedRepeatableTables,
    reportingCycle: "annual-acquittal",
    sections: sharedDiscoverySections,
    sheets: sharedDiscoverySheets,
    sourceTemplateFileName:
      "2025-26 Annual Report July-June Raukkan EA ALT - 4-IQXOB1V.xlsx",
  },
];

export const appbGeneratedWorkbookPlaceholder: AppbGeneratedWorkbookPlaceholder =
  {
    description:
      "Future generated workbook metadata can record selected organisation, grant, reporting period, template version, export timestamp and safe audit status.",
    enabled: false,
    reason:
      "Workbook export is intentionally disabled until template mapping inspection and review are implemented.",
  };

export const appbTemplateMappingSummary = {
  blockedReadinessChecks: appbTemplateVersions.reduce(
    (count, version) =>
      count +
      version.exportReadinessChecks.filter((check) => check.status === "blocked")
        .length,
    0,
  ),
  fieldCount: appbTemplateVersions.reduce(
    (count, version) => count + version.fields.length,
    0,
  ),
  manualFieldCount: appbTemplateVersions.reduce(
    (count, version) => count + version.manualFields.length,
    0,
  ),
  mappingCount: appbTemplateVersions.reduce(
    (count, version) => count + version.mappings.length,
    0,
  ),
  repeatableTableCount: appbTemplateVersions.reduce(
    (count, version) => count + version.repeatableTables.length,
    0,
  ),
  versionCount: appbTemplateVersions.length,
};

export const appbFutureConcepts: AppbFutureConcept[] = [
  {
    description: "Organisation-scoped funding agreement or grant record.",
    name: "Grant",
  },
  {
    description: "Funder reference data such as NIAA or DCCEEW.",
    name: "GrantFunder",
  },
  {
    description: "Program type reference such as IRP, IPA, MDBIRR or other.",
    name: "GrantProgramType",
  },
  {
    description: "Grant-specific annual, mid-year or final reporting window.",
    name: "GrantReportingPeriod",
  },
  {
    description: "Reusable mapping profile for one funder/program template family.",
    name: "FunderTemplateProfile",
  },
  {
    description: "Versioned template release by funder, year and program type.",
    name: "FunderTemplateVersion",
  },
  {
    description: "Workbook sheet inventory for one inspected template version.",
    name: "AppbWorkbookSheet",
  },
  {
    description: "Named section within a workbook sheet.",
    name: "AppbTemplateSection",
  },
  {
    description: "One required, manual, derived or protected workbook field.",
    name: "AppbTemplateField",
  },
  {
    description: "One report instance for one grant and reporting period.",
    name: "AppbReport",
  },
  {
    description: "Stable mapping from ROPES fields to workbook sheets, cells or sections.",
    name: "AppbTemplateMapping",
  },
  {
    description: "Repeatable row/table mapping such as activities, outputs or evidence.",
    name: "AppbRepeatableTable",
  },
  {
    description: "Manual-only fields that ROPES should not populate automatically.",
    name: "AppbManualField",
  },
  {
    description: "Checks that must pass before export can be enabled.",
    name: "AppbExportReadinessCheck",
  },
  {
    description: "Future generated workbook metadata and safe export audit anchor.",
    name: "AppbGeneratedWorkbook",
  },
];

export const appbRopesDataSources: AppbRopesDataSource[] = [
  {
    appbUse: "Organisation identity and selected tenant scope.",
    currentStatus: "available",
    model: "Organisation",
  },
  {
    appbUse: "Project names, codes, dates and funding stream placeholders.",
    currentStatus: "partial",
    model: "Project",
  },
  {
    appbUse: "Program names, descriptions and regions.",
    currentStatus: "partial",
    model: "RangerProgram",
  },
  {
    appbUse: "Operational activity context, destinations and timing.",
    currentStatus: "partial",
    model: "Trip",
  },
  {
    appbUse: "People counts and participation context, not full workforce reporting.",
    currentStatus: "partial",
    model: "TripParticipant",
  },
  {
    appbUse: "Activity schedule narrative and trip-day context.",
    currentStatus: "partial",
    model: "TripItineraryItem",
  },
  {
    appbUse: "Journey management and risk-control evidence where relevant.",
    currentStatus: "partial",
    model: "TripRiskAssessment",
  },
  {
    appbUse: "Fleet usage context where a funder report asks for vehicle-supported activity.",
    currentStatus: "partial",
    model: "Vehicle",
  },
  {
    appbUse: "Imported field evidence and activity records.",
    currentStatus: "partial",
    model: "FulcrumRecord",
  },
  {
    appbUse: "Safe generation/export evidence once workbook creation exists.",
    currentStatus: "available",
    model: "AuditLog",
  },
  {
    appbUse: "Optional enablement for APP&B reporting and template mapping.",
    currentStatus: "available",
    model: "OrganisationCapability",
  },
  {
    appbUse:
      "Organisation-scoped funder, program type, funding period and report window anchors.",
    currentStatus: "persisted",
    model: "Grant / GrantReportingPeriod / AppbReport",
  },
];

function needsInspection(
  sheetId: string,
  label: string,
): AppbCellRangeReference {
  return {
    discoveryStatus: "needs-workbook-inspection",
    label,
    sheetId,
  };
}
