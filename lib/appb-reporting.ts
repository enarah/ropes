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
  discoveryStatus:
    | "needs-workbook-inspection"
    | "needs-range-review"
    | "known";
  label: string;
  sheetId: string;
  a1Reference?: string;
  namedRange?: string;
};

export type AppbWorkbookSheet = {
  description: string;
  dimensions?: {
    columns: number;
    formulaCellCount: number;
    mergedRangeCount: number;
    nonEmptyCellCount: number;
    rows: number;
  };
  id: string;
  name: string;
  protectionDetected?: boolean;
  reviewNotes?: string[];
  sourceConfidence: "filename-only" | "workbook-inspected";
  state?: "visible" | "hidden" | "very-hidden";
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

export type AppbWorkbookRangeMappingStatus =
  | "unmapped"
  | "needs-review"
  | "reviewed"
  | "blocked-formula"
  | "blocked-hidden-sheet"
  | "blocked-unsupported"
  | "ready-for-future-export";

export type AppbWorkbookTargetType =
  | "single-cell"
  | "merged-cell-anchor"
  | "repeatable-row-range"
  | "repeatable-column-range"
  | "named-range"
  | "formula-cell"
  | "hidden-lookup"
  | "unsupported";

export type AppbWorkbookRangeReviewStatus = {
  reviewedBy?: string;
  reviewedOn?: string;
  status: AppbWorkbookRangeMappingStatus;
};

export type AppbWorkbookCellTarget = {
  a1Reference?: string;
  namedRange?: string;
  requiresMergedCellAnchor: boolean;
  sheetId: string;
  sheetName: string;
  targetType: AppbWorkbookTargetType;
};

export type AppbWorkbookRepeatableRange = {
  endReference?: string;
  expansionRule: AppbRepeatableExpansionRule;
  sheetId: string;
  sheetName: string;
  startReference?: string;
  targetType: "repeatable-row-range" | "repeatable-column-range";
};

export type AppbWorkbookFormulaProtectionRule = {
  description: string;
  fieldId?: string;
  id: string;
  sheetId: string;
  status: "blocked-formula";
};

export type AppbWorkbookHiddenSheetRule = {
  description: string;
  id: string;
  sheetId: string;
  status: "blocked-hidden-sheet";
};

export type AppbWorkbookExportBlocker = {
  description: string;
  id: string;
  status: AppbWorkbookRangeMappingStatus;
};

export type AppbWorkbookRangeMapping = {
  blocker?: AppbWorkbookExportBlocker;
  cellTarget?: AppbWorkbookCellTarget;
  fieldId?: string;
  formulaProtectionRule?: AppbWorkbookFormulaProtectionRule;
  hiddenSheetRule?: AppbWorkbookHiddenSheetRule;
  id: string;
  label: string;
  repeatableRange?: AppbWorkbookRepeatableRange;
  repeatableTableId?: string;
  review: AppbWorkbookRangeReviewStatus;
  reviewNotes: string[];
  sourceType: AppbFieldSourceType;
  status: AppbWorkbookRangeMappingStatus;
  targetType: AppbWorkbookTargetType;
};

export type AppbWorkbookRangeMappingStatusCount = {
  count: number;
  status: AppbWorkbookRangeMappingStatus;
};

export type AppbWorkbookRangeMappingSummary = {
  exportBlocked: true;
  statusCounts: AppbWorkbookRangeMappingStatusCount[];
  total: number;
  unresolvedCount: number;
};

export type AppbRepeatableRangeStatus = AppbWorkbookRangeMappingStatus;

export type AppbRepeatableExpansionRule =
  | "not-defined"
  | "fixed-row-count"
  | "append-rows"
  | "no-export-manual-only"
  | "blocked";

export type AppbRepeatableRowIdentity = {
  description: string;
  fieldIds: string[];
  status: "needs-review" | "reviewed";
};

export type AppbRepeatableColumnMapping = {
  columnReference?: string;
  fieldId?: string;
  label: string;
  status: AppbRepeatableRangeStatus;
};

export type AppbRepeatableHeaderRule = {
  description: string;
  headerRows?: string;
  protected: true;
  status: AppbRepeatableRangeStatus;
};

export type AppbRepeatableFormulaRowRule = {
  description: string;
  formulaRows?: string;
  protected: true;
  status: "blocked-formula";
};

export type AppbRepeatableManualRowGroup = {
  description: string;
  fieldSourceType: AppbFieldSourceType;
  status: AppbRepeatableRangeStatus;
};

export type AppbRepeatableExportBlocker = {
  description: string;
  id: string;
  status: AppbRepeatableRangeStatus;
};

export type AppbRepeatableRangeDefinition = {
  columnMappings: AppbRepeatableColumnMapping[];
  dataRows?: string;
  endColumn?: string;
  endRow?: string;
  expansionRule: AppbRepeatableExpansionRule;
  exportBlockers: AppbRepeatableExportBlocker[];
  fieldSourceType: AppbFieldSourceType;
  formulaRowRule: AppbRepeatableFormulaRowRule;
  headerRule: AppbRepeatableHeaderRule;
  id: string;
  label: string;
  manualRowGroup?: AppbRepeatableManualRowGroup;
  repeatableTableId: string;
  reviewNotes: string[];
  rowIdentity: AppbRepeatableRowIdentity;
  sectionId: string;
  sheetId: string;
  sheetName: string;
  startColumn?: string;
  startRow?: string;
  status: AppbRepeatableRangeStatus;
  templateVersionId?: string;
};

export type AppbRepeatableRangeStatusCount = {
  count: number;
  status: AppbRepeatableRangeStatus;
};

export type AppbRepeatableRangeSummary = {
  exportBlocked: true;
  expansionRuleCounts: Array<{
    count: number;
    expansionRule: AppbRepeatableExpansionRule;
  }>;
  manualOnlyCount: number;
  statusCounts: AppbRepeatableRangeStatusCount[];
  total: number;
  unresolvedCount: number;
};

export type AppbMappingReviewStatus = AppbWorkbookRangeMappingStatus;

export type AppbMappingReviewDecision =
  | "keep-needs-review"
  | "mark-reviewed"
  | "mark-blocked-formula"
  | "mark-blocked-hidden-sheet"
  | "mark-blocked-unsupported"
  | "mark-unmapped"
  | "mark-ready-for-future-export";

export type AppbMappingReviewTargetKind =
  | "field-mapping"
  | "repeatable-range";

export type AppbMappingReviewer = {
  displayName?: string;
  source: "metadata-placeholder" | "future-authenticated-user";
  userId?: string;
};

export type AppbMappingReviewNote = {
  isValueFree: true;
  maxLength: number;
  text: string;
};

export type AppbMappingReviewAuditMetadata = {
  decision: AppbMappingReviewDecision;
  mappingId: string;
  status: AppbMappingReviewStatus;
  targetKind: AppbMappingReviewTargetKind;
  templateVersionId: string;
  valueFree: true;
};

export type AppbMappingReview = {
  auditMetadata: AppbMappingReviewAuditMetadata;
  decision: AppbMappingReviewDecision;
  exportBlocked: true;
  id: string;
  label: string;
  note?: AppbMappingReviewNote;
  reviewedAt?: string;
  reviewer?: AppbMappingReviewer;
  reviewNotes: string[];
  status: AppbMappingReviewStatus;
  targetId: string;
  targetKind: AppbMappingReviewTargetKind;
  templateVersionId: string;
};

export type AppbPersistedMappingReview = {
  decision: AppbMappingReviewDecision;
  id: string;
  reviewedAt: string;
  reviewerDisplayName?: string;
  reviewerUserId?: string;
  safeNote?: string;
  status: AppbMappingReviewStatus;
  targetId: string;
  targetKind: AppbMappingReviewTargetKind;
  templateVersionId: string;
};

export type AppbMappingReviewStatusCount = {
  count: number;
  status: AppbMappingReviewStatus;
};

export type AppbMappingReviewDecisionCount = {
  count: number;
  decision: AppbMappingReviewDecision;
};

export type AppbMappingReviewTargetCount = {
  count: number;
  targetKind: AppbMappingReviewTargetKind;
};

export type AppbMappingReviewSummary = {
  blockedCount: number;
  decisionCounts: AppbMappingReviewDecisionCount[];
  exportBlocked: true;
  needsReviewCount: number;
  reviewedCount: number;
  statusCounts: AppbMappingReviewStatusCount[];
  targetCounts: AppbMappingReviewTargetCount[];
  total: number;
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
  rangeMappings: AppbWorkbookRangeMapping[];
  repeatableRangeDefinitions: AppbRepeatableRangeDefinition[];
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

type VerifiedSheetInput = {
  columns: number;
  description: string;
  formulaCellCount: number;
  id: string;
  mergedRangeCount: number;
  name: string;
  nonEmptyCellCount: number;
  protectionDetected: boolean;
  reviewNotes?: string[];
  rows: number;
  state: "visible" | "hidden" | "very-hidden";
};

function verifiedSheet(input: VerifiedSheetInput): AppbWorkbookSheet {
  return {
    description: input.description,
    dimensions: {
      columns: input.columns,
      formulaCellCount: input.formulaCellCount,
      mergedRangeCount: input.mergedRangeCount,
      nonEmptyCellCount: input.nonEmptyCellCount,
      rows: input.rows,
    },
    id: input.id,
    name: input.name,
    protectionDetected: input.protectionDetected,
    reviewNotes: input.reviewNotes,
    sourceConfidence: "workbook-inspected",
    state: input.state,
  };
}

const sheetDescriptions = {
  annualBudget:
    "Verified annual budget sheet. Finance values remain manual and formulas are treated as protected until exact writable ranges are reviewed.",
  assetRegister:
    "Verified asset register sheet. Asset rows are likely manual-only until asset ownership and reporting fields are explicitly scoped.",
  expenditure:
    "Verified expenditure report sheet. Finance/acquittal fields stay manual until budget and acquittal logic is implemented.",
  feeForService:
    "Verified fee-for-service report sheet. Activity rows are likely repeatable, but exact ranges need review.",
  hide:
    "Verified lookup/reference sheet containing dropdown and reference content. This should not be treated as a report output sheet.",
  projectPlan:
    "Verified project plan and activity report sheet for program planning, activity/progress rows and narrative areas.",
  reportType:
    "Verified report setup sheet for APP&B/report type, program selection and workbook identity fields.",
  wage:
    "Verified wage budget and employee data/demographics sheet. Personnel fields stay manual-only until workforce reporting is scoped.",
};

const annualPlanning2025Sheets: AppbWorkbookSheet[] = [
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.hide,
    formulaCellCount: 0,
    id: "hide",
    mergedRangeCount: 20,
    name: "Hide",
    nonEmptyCellCount: 208,
    protectionDetected: false,
    rows: 36,
    state: "hidden",
  }),
  verifiedSheet({
    columns: 11,
    description: sheetDescriptions.reportType,
    formulaCellCount: 1,
    id: "report-type",
    mergedRangeCount: 25,
    name: "Report Type",
    nonEmptyCellCount: 194,
    protectionDetected: true,
    rows: 33,
    state: "visible",
  }),
  verifiedSheet({
    columns: 4,
    description: sheetDescriptions.projectPlan,
    formulaCellCount: 7,
    id: "project-plan-activity-report",
    mergedRangeCount: 49,
    name: "Project Plan & Activity Report",
    nonEmptyCellCount: 312,
    protectionDetected: true,
    rows: 115,
    state: "visible",
  }),
  verifiedSheet({
    columns: 12,
    description: sheetDescriptions.annualBudget,
    formulaCellCount: 13,
    id: "annual-budget",
    mergedRangeCount: 62,
    name: "2025-26 FY Annual Budget",
    nonEmptyCellCount: 229,
    protectionDetected: true,
    rows: 57,
    state: "visible",
  }),
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.wage,
    formulaCellCount: 67,
    id: "wage-budget-report",
    mergedRangeCount: 32,
    name: "Wage Budget and Report",
    nonEmptyCellCount: 308,
    protectionDetected: false,
    reviewNotes: [
      "Formula-heavy personnel and wage areas must be reviewed even when sheet protection metadata is not detected.",
    ],
    rows: 43,
    state: "visible",
  }),
  verifiedSheet({
    columns: 3,
    description: sheetDescriptions.feeForService,
    formulaCellCount: 5,
    id: "fee-for-service-report",
    mergedRangeCount: 8,
    name: "Fee-for-Service Report",
    nonEmptyCellCount: 41,
    protectionDetected: false,
    rows: 15,
    state: "visible",
  }),
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.expenditure,
    formulaCellCount: 53,
    id: "expenditure-report",
    mergedRangeCount: 53,
    name: "Expenditure Report",
    nonEmptyCellCount: 380,
    protectionDetected: true,
    rows: 46,
    state: "visible",
  }),
  verifiedSheet({
    columns: 19,
    description: sheetDescriptions.assetRegister,
    formulaCellCount: 2,
    id: "asset-register",
    mergedRangeCount: 62,
    name: "Asset Register",
    nonEmptyCellCount: 134,
    protectionDetected: true,
    rows: 44,
    state: "visible",
  }),
];

const annualPlanning2024Sheets: AppbWorkbookSheet[] = [
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.hide,
    formulaCellCount: 0,
    id: "hide",
    mergedRangeCount: 11,
    name: "Hide",
    nonEmptyCellCount: 193,
    protectionDetected: false,
    reviewNotes: [
      "This inspected workbook has the reference sheet visible, so visibility needs reviewer confirmation before export work.",
    ],
    rows: 35,
    state: "visible",
  }),
  verifiedSheet({
    columns: 10,
    description: sheetDescriptions.reportType,
    formulaCellCount: 0,
    id: "report-type",
    mergedRangeCount: 19,
    name: "Report Type",
    nonEmptyCellCount: 155,
    protectionDetected: true,
    rows: 27,
    state: "visible",
  }),
  verifiedSheet({
    columns: 4,
    description: sheetDescriptions.projectPlan,
    formulaCellCount: 6,
    id: "project-plan-activity-report",
    mergedRangeCount: 45,
    name: "Project Plan & Activity Report",
    nonEmptyCellCount: 382,
    protectionDetected: true,
    rows: 113,
    state: "visible",
  }),
  verifiedSheet({
    columns: 11,
    description: sheetDescriptions.annualBudget,
    formulaCellCount: 14,
    id: "annual-budget",
    mergedRangeCount: 48,
    name: "24-25 FY Annual Budget",
    nonEmptyCellCount: 206,
    protectionDetected: true,
    rows: 53,
    state: "visible",
  }),
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.expenditure,
    formulaCellCount: 69,
    id: "expenditure-report",
    mergedRangeCount: 62,
    name: "Expenditure Report",
    nonEmptyCellCount: 487,
    protectionDetected: true,
    rows: 54,
    state: "visible",
  }),
  verifiedSheet({
    columns: 19,
    description: sheetDescriptions.assetRegister,
    formulaCellCount: 1,
    id: "asset-register",
    mergedRangeCount: 62,
    name: "Asset Register",
    nonEmptyCellCount: 133,
    protectionDetected: true,
    rows: 44,
    state: "visible",
  }),
];

const midYear2025Sheets: AppbWorkbookSheet[] = [
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.hide,
    formulaCellCount: 0,
    id: "hide",
    mergedRangeCount: 20,
    name: "Hide",
    nonEmptyCellCount: 208,
    protectionDetected: false,
    rows: 36,
    state: "hidden",
  }),
  verifiedSheet({
    columns: 11,
    description: sheetDescriptions.reportType,
    formulaCellCount: 1,
    id: "report-type",
    mergedRangeCount: 25,
    name: "Report Type",
    nonEmptyCellCount: 194,
    protectionDetected: false,
    reviewNotes: [
      "Mid-year inspection did not expose protection metadata; formulas and manual areas still need range review.",
    ],
    rows: 33,
    state: "visible",
  }),
  verifiedSheet({
    columns: 4,
    description: sheetDescriptions.projectPlan,
    formulaCellCount: 7,
    id: "project-plan-activity-report",
    mergedRangeCount: 49,
    name: "Project Plan & Activity Report",
    nonEmptyCellCount: 401,
    protectionDetected: false,
    rows: 115,
    state: "visible",
  }),
  verifiedSheet({
    columns: 12,
    description: sheetDescriptions.annualBudget,
    formulaCellCount: 13,
    id: "annual-budget",
    mergedRangeCount: 62,
    name: "2025-26 FY Annual Budget",
    nonEmptyCellCount: 229,
    protectionDetected: false,
    rows: 57,
    state: "visible",
  }),
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.wage,
    formulaCellCount: 66,
    id: "wage-budget-report",
    mergedRangeCount: 32,
    name: "Wage Budget and Report",
    nonEmptyCellCount: 331,
    protectionDetected: false,
    rows: 43,
    state: "visible",
  }),
  verifiedSheet({
    columns: 3,
    description: sheetDescriptions.feeForService,
    formulaCellCount: 5,
    id: "fee-for-service-report",
    mergedRangeCount: 8,
    name: "Fee-for-Service Report",
    nonEmptyCellCount: 41,
    protectionDetected: false,
    rows: 15,
    state: "visible",
  }),
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.expenditure,
    formulaCellCount: 53,
    id: "expenditure-report",
    mergedRangeCount: 53,
    name: "Expenditure Report",
    nonEmptyCellCount: 383,
    protectionDetected: false,
    rows: 46,
    state: "visible",
  }),
  verifiedSheet({
    columns: 19,
    description: sheetDescriptions.assetRegister,
    formulaCellCount: 2,
    id: "asset-register",
    mergedRangeCount: 62,
    name: "Asset Register",
    nonEmptyCellCount: 173,
    protectionDetected: false,
    rows: 44,
    state: "visible",
  }),
];

const annualAcquittal2025Sheets: AppbWorkbookSheet[] = [
  verifiedSheet({
    columns: 2,
    description: sheetDescriptions.hide,
    formulaCellCount: 0,
    id: "hide",
    mergedRangeCount: 0,
    name: "Hide",
    nonEmptyCellCount: 9,
    protectionDetected: false,
    rows: 5,
    state: "hidden",
  }),
  verifiedSheet({
    columns: 10,
    description: sheetDescriptions.reportType,
    formulaCellCount: 0,
    id: "report-type",
    mergedRangeCount: 19,
    name: "Report Type",
    nonEmptyCellCount: 152,
    protectionDetected: true,
    rows: 25,
    state: "visible",
  }),
  verifiedSheet({
    columns: 4,
    description: sheetDescriptions.projectPlan,
    formulaCellCount: 6,
    id: "project-plan-activity-report",
    mergedRangeCount: 48,
    name: "Project Plan & Activity Report",
    nonEmptyCellCount: 390,
    protectionDetected: true,
    rows: 112,
    state: "visible",
  }),
  verifiedSheet({
    columns: 11,
    description: sheetDescriptions.annualBudget,
    formulaCellCount: 16,
    id: "annual-budget",
    mergedRangeCount: 47,
    name: "25-26 FY Annual Budget",
    nonEmptyCellCount: 207,
    protectionDetected: true,
    rows: 52,
    state: "visible",
  }),
  verifiedSheet({
    columns: 15,
    description: sheetDescriptions.expenditure,
    formulaCellCount: 47,
    id: "expenditure-report",
    mergedRangeCount: 60,
    name: "Expenditure Report",
    nonEmptyCellCount: 479,
    protectionDetected: true,
    rows: 53,
    state: "visible",
  }),
  verifiedSheet({
    columns: 19,
    description: sheetDescriptions.assetRegister,
    formulaCellCount: 1,
    id: "asset-register",
    mergedRangeCount: 64,
    name: "Asset Register",
    nonEmptyCellCount: 239,
    protectionDetected: true,
    rows: 47,
    state: "visible",
  }),
];

const sharedVerifiedSections: AppbTemplateSection[] = [
  {
    description:
      "APP&B/report type setup, version control, program selection and workbook identity metadata.",
    fieldIds: [
      "organisation-name",
      "grant-title",
      "program-type",
      "reporting-period",
      "appb-report-status",
      "manual-report-setup",
      "report-type-formula-pull-through",
    ],
    id: "report-type-setup",
    sheetId: "report-type",
    title: "APP&B / report type setup",
  },
  {
    description:
      "Project plan, activity report, 12-month plan, progress narrative and future activity/evidence summaries.",
    fieldIds: [
      "project-name",
      "ranger-program",
      "activity-summary",
      "fulcrum-evidence-summary",
      "project-activity-narrative",
      "project-detail-formula-pull-through",
    ],
    id: "project-plan-activity",
    sheetId: "project-plan-activity-report",
    title: "Project plan and activity report",
  },
  {
    description:
      "Annual budget / financial-year annual budget fields and finance formulas.",
    fieldIds: ["manual-budget-summary", "budget-total-formulas"],
    id: "annual-budget",
    sheetId: "annual-budget",
    title: "Annual budget",
  },
  {
    description:
      "Wage budget, employee data and demographic reporting areas. Personnel data remains manual-only.",
    fieldIds: ["wage-personnel-manual-fields", "wage-total-formulas"],
    id: "wage-employee-demographics",
    sheetId: "wage-budget-report",
    title: "Wage budget and employee data/demographics",
  },
  {
    description:
      "Fee-for-service report rows for future scoped activity reporting.",
    fieldIds: ["fee-for-service-manual-fields", "fee-service-formulas"],
    id: "fee-for-service",
    sheetId: "fee-for-service-report",
    title: "Fee-for-service report",
  },
  {
    description:
      "Expenditure report, acquittal finance fields and notes. These stay manual until finance ownership is scoped.",
    fieldIds: [
      "expenditure-manual-fields",
      "finance-acquittal-notes",
      "expenditure-formulas",
    ],
    id: "expenditure-report",
    sheetId: "expenditure-report",
    title: "Expenditure report",
  },
  {
    description:
      "Asset register fields and instructions. Asset rows stay manual until asset reporting is scoped.",
    fieldIds: ["asset-register-manual-fields", "asset-register-formulas"],
    id: "asset-register",
    sheetId: "asset-register",
    title: "Asset register",
  },
  {
    description:
      "Hidden lookup/reference content for programs, report types, capacity-building examples and instructions.",
    fieldIds: ["hidden-lookup-reference-fields"],
    id: "hidden-reference",
    sheetId: "hide",
    title: "Hidden lookup/reference content",
  },
];

const sharedVerifiedFields: AppbTemplateField[] = [
  {
    cellReference: needsRangeReview("report-type", "Organisation name"),
    dataPath: "Organisation.name",
    description: "Selected organisation name for the tenant-scoped workbook.",
    flags: ["required", "structured", "exportBlockedUntilMapped"],
    id: "organisation-name",
    label: "Organisation name",
    scope: "organisation",
    sectionId: "report-type-setup",
    sourceType: "organisation",
  },
  {
    cellReference: needsRangeReview("report-type", "Grant title"),
    dataPath: "Grant.title",
    description: "Grant or funding agreement title selected for this report.",
    flags: ["required", "structured", "exportBlockedUntilMapped"],
    id: "grant-title",
    label: "Grant title",
    scope: "grant",
    sectionId: "report-type-setup",
    sourceType: "grant",
  },
  {
    cellReference: needsRangeReview("report-type", "Program type"),
    dataPath: "Grant.programType",
    description: "Program type such as IRP, IPA, MDBIRR or other.",
    flags: ["required", "structured", "exportBlockedUntilMapped"],
    id: "program-type",
    label: "Program type",
    scope: "grant",
    sectionId: "report-type-setup",
    sourceType: "grant",
  },
  {
    cellReference: needsRangeReview("report-type", "Reporting period"),
    dataPath: "GrantReportingPeriod.label",
    description: "Grant-scoped reporting period label and cycle.",
    flags: ["required", "structured", "exportBlockedUntilMapped"],
    id: "reporting-period",
    label: "Reporting period",
    scope: "reporting-period",
    sectionId: "report-type-setup",
    sourceType: "grantReportingPeriod",
  },
  {
    cellReference: needsRangeReview("report-type", "APP&B report status"),
    dataPath: "AppbReport.status",
    description: "Status of the grant-scoped APP&B report instance in ROPES.",
    flags: ["structured", "exportBlockedUntilMapped"],
    id: "appb-report-status",
    label: "APP&B report status",
    scope: "appb-report",
    sectionId: "report-type-setup",
    sourceType: "appbReport",
  },
  {
    cellReference: needsRangeReview("report-type", "Manual report setup fields"),
    description:
      "Report setup fields appear manual-only until workbook labels and writable ranges are reviewed.",
    flags: ["required", "manualOnly", "exportBlockedUntilMapped"],
    id: "manual-report-setup",
    label: "Manual report setup fields",
    scope: "manual-report-only",
    sectionId: "report-type-setup",
    sourceType: "manual",
  },
  {
    cellReference: needsRangeReview("report-type", "Report type formula cells"),
    description:
      "Identity/detail pull-through formulas must be protected from overwrite during future export.",
    flags: ["formulaProtected", "exportBlockedUntilMapped"],
    id: "report-type-formula-pull-through",
    label: "Report type formula cells",
    scope: "manual-report-only",
    sectionId: "report-type-setup",
    sourceType: "formulaProtected",
  },
  {
    cellReference: needsRangeReview("project-plan-activity-report", "Project name"),
    dataPath: "Project.name",
    description:
      "Linked project name where the grant is associated with a ROPES project.",
    flags: ["structured", "exportBlockedUntilMapped"],
    id: "project-name",
    label: "Project name",
    scope: "grant",
    sectionId: "project-plan-activity",
    sourceType: "project",
  },
  {
    cellReference: needsRangeReview("project-plan-activity-report", "Ranger program"),
    dataPath: "RangerProgram.name",
    description:
      "Linked ranger program name where the grant is associated with a ROPES program.",
    flags: ["structured", "exportBlockedUntilMapped"],
    id: "ranger-program",
    label: "Ranger program",
    scope: "grant",
    sectionId: "project-plan-activity",
    sourceType: "rangerProgram",
  },
  {
    cellReference: needsRangeReview("project-plan-activity-report", "Activity summary"),
    description:
      "Future derived summary from trips, itinerary rows and trip reports once reporting logic exists.",
    flags: ["derived", "repeatable", "exportBlockedUntilMapped"],
    id: "activity-summary",
    label: "Activity summary",
    scope: "appb-report",
    sectionId: "project-plan-activity",
    sourceType: "derived",
  },
  {
    cellReference: needsRangeReview(
      "project-plan-activity-report",
      "Fulcrum evidence summary",
    ),
    description:
      "Future evidence summary from organisation-scoped Fulcrum records linked to grant activity.",
    flags: ["derived", "repeatable", "exportBlockedUntilMapped"],
    id: "fulcrum-evidence-summary",
    label: "Fulcrum evidence summary",
    scope: "appb-report",
    sectionId: "project-plan-activity",
    sourceType: "fulcrumRecord",
  },
  {
    cellReference: needsRangeReview(
      "project-plan-activity-report",
      "Project/activity narrative areas",
    ),
    description:
      "Free-text project and activity narrative areas stay manual until report-specific text ownership and limits are scoped.",
    flags: ["manualOnly", "exportBlockedUntilMapped"],
    id: "project-activity-narrative",
    label: "Project/activity narrative",
    scope: "manual-report-only",
    sectionId: "project-plan-activity",
    sourceType: "manual",
  },
  {
    cellReference: needsRangeReview(
      "project-plan-activity-report",
      "Project detail formula cells",
    ),
    description:
      "Formula cells in project/detail areas must be protected from overwrite during future export.",
    flags: ["formulaProtected", "exportBlockedUntilMapped"],
    id: "project-detail-formula-pull-through",
    label: "Project detail formula cells",
    scope: "manual-report-only",
    sectionId: "project-plan-activity",
    sourceType: "formulaProtected",
  },
  {
    cellReference: needsRangeReview("annual-budget", "Manual budget summary"),
    description:
      "Budget or acquittal values should remain manual until finance data ownership is explicitly implemented.",
    flags: ["required", "manualOnly", "exportBlockedUntilMapped"],
    id: "manual-budget-summary",
    label: "Manual budget summary",
    scope: "manual-report-only",
    sectionId: "annual-budget",
    sourceType: "manual",
  },
  {
    cellReference: needsRangeReview("annual-budget", "Budget total formulas"),
    description:
      "Annual budget formula cells must be detected and protected from overwrite during any future export.",
    flags: ["formulaProtected", "exportBlockedUntilMapped"],
    id: "budget-total-formulas",
    label: "Budget total formulas",
    scope: "manual-report-only",
    sectionId: "annual-budget",
    sourceType: "formulaProtected",
  },
  {
    cellReference: needsRangeReview(
      "wage-budget-report",
      "Wage/personnel manual fields",
    ),
    description:
      "Wage, FTE and demographic fields remain manual-only until workforce reporting is explicitly scoped.",
    flags: ["manualOnly", "exportBlockedUntilMapped"],
    id: "wage-personnel-manual-fields",
    label: "Wage/personnel manual fields",
    scope: "manual-report-only",
    sectionId: "wage-employee-demographics",
    sourceType: "manual",
  },
  {
    cellReference: needsRangeReview("wage-budget-report", "Wage total formulas"),
    description: "Wage and employee-data formula cells must be protected.",
    flags: ["formulaProtected", "exportBlockedUntilMapped"],
    id: "wage-total-formulas",
    label: "Wage total formulas",
    scope: "manual-report-only",
    sectionId: "wage-employee-demographics",
    sourceType: "formulaProtected",
  },
  {
    cellReference: needsRangeReview(
      "fee-for-service-report",
      "Fee-for-service manual rows",
    ),
    description:
      "Fee-for-service activity rows are likely manual until activity-source rules are scoped.",
    flags: ["manualOnly", "repeatable", "exportBlockedUntilMapped"],
    id: "fee-for-service-manual-fields",
    label: "Fee-for-service manual rows",
    scope: "manual-report-only",
    sectionId: "fee-for-service",
    sourceType: "manual",
  },
  {
    cellReference: needsRangeReview(
      "fee-for-service-report",
      "Fee-for-service formula cells",
    ),
    description: "Fee-for-service formula cells must be protected from overwrite.",
    flags: ["formulaProtected", "exportBlockedUntilMapped"],
    id: "fee-service-formulas",
    label: "Fee-for-service formulas",
    scope: "manual-report-only",
    sectionId: "fee-for-service",
    sourceType: "formulaProtected",
  },
  {
    cellReference: needsRangeReview("expenditure-report", "Expenditure fields"),
    description:
      "Expenditure fields remain manual-only until budget/acquittal finance logic is explicitly implemented.",
    flags: ["required", "manualOnly", "exportBlockedUntilMapped"],
    id: "expenditure-manual-fields",
    label: "Expenditure manual fields",
    scope: "manual-report-only",
    sectionId: "expenditure-report",
    sourceType: "manual",
  },
  {
    cellReference: needsRangeReview(
      "expenditure-report",
      "Finance/acquittal notes",
    ),
    description:
      "Finance/acquittal notes stay manual and must not be exposed in summaries.",
    flags: ["manualOnly", "exportBlockedUntilMapped"],
    id: "finance-acquittal-notes",
    label: "Finance/acquittal notes",
    scope: "manual-report-only",
    sectionId: "expenditure-report",
    sourceType: "manual",
  },
  {
    cellReference: needsRangeReview(
      "expenditure-report",
      "Expenditure formula cells",
    ),
    description:
      "Expenditure report formula cells must be protected from overwrite.",
    flags: ["formulaProtected", "exportBlockedUntilMapped"],
    id: "expenditure-formulas",
    label: "Expenditure formulas",
    scope: "manual-report-only",
    sectionId: "expenditure-report",
    sourceType: "formulaProtected",
  },
  {
    cellReference: needsRangeReview("asset-register", "Asset register fields"),
    description:
      "Asset register fields remain manual until asset reporting and ownership rules are scoped.",
    flags: ["manualOnly", "repeatable", "exportBlockedUntilMapped"],
    id: "asset-register-manual-fields",
    label: "Asset register manual fields",
    scope: "manual-report-only",
    sectionId: "asset-register",
    sourceType: "manual",
  },
  {
    cellReference: needsRangeReview("asset-register", "Asset register formula cells"),
    description: "Asset register formula cells must be protected from overwrite.",
    flags: ["formulaProtected", "exportBlockedUntilMapped"],
    id: "asset-register-formulas",
    label: "Asset register formulas",
    scope: "manual-report-only",
    sectionId: "asset-register",
    sourceType: "formulaProtected",
  },
  {
    cellReference: needsRangeReview("hide", "Lookup/dropdown source fields"),
    description:
      "Hidden lookup and dropdown source fields should inform mapping review but should not be exported as report output.",
    flags: ["manualOnly", "exportBlockedUntilMapped"],
    id: "hidden-lookup-reference-fields",
    label: "Lookup/dropdown source fields",
    scope: "manual-report-only",
    sectionId: "hidden-reference",
    sourceType: "manual",
  },
];

const sharedVerifiedRepeatableTables: AppbRepeatableTable[] = [
  {
    anchorReference: needsRangeReview("report-type", "Version-control rows"),
    description:
      "Version-control rows are likely repeatable metadata rows and need exact range review.",
    fieldSourceType: "manual",
    id: "version-control-rows",
    label: "Version-control rows",
    rowIdentity: "One row per workbook/template version note where present.",
    sectionId: "report-type-setup",
  },
  {
    anchorReference: needsRangeReview("report-type", "Report setup rows"),
    description:
      "Report setup and metadata rows identify funder, program, report type and grant context.",
    fieldSourceType: "manual",
    id: "report-setup-metadata-rows",
    label: "Report setup / metadata rows",
    rowIdentity: "One row per reviewed setup label/value pair where applicable.",
    sectionId: "report-type-setup",
  },
  {
    anchorReference: needsRangeReview(
      "project-plan-activity-report",
      "Project plan/activity rows",
    ),
    description:
      "Future repeatable rows for project plans, activities, outputs or evidence once the exact workbook range is reviewed.",
    fieldSourceType: "derived",
    id: "project-plan-activity-rows",
    label: "Project plan/activity rows",
    rowIdentity: "One row per mapped project activity, output or evidence item.",
    sectionId: "project-plan-activity",
  },
  {
    anchorReference: needsRangeReview(
      "project-plan-activity-report",
      "Activity output/progress rows",
    ),
    description:
      "Mid-year and annual progress rows are likely repeatable, but source rules need explicit review.",
    fieldSourceType: "future",
    id: "activity-output-progress-rows",
    label: "Activity output/progress rows",
    rowIdentity: "One row per reviewed output or progress item.",
    sectionId: "project-plan-activity",
  },
  {
    anchorReference: needsRangeReview("annual-budget", "Budget line items"),
    description:
      "Budget line items remain manual until budget/acquittal finance logic is scoped.",
    fieldSourceType: "manual",
    id: "budget-line-items",
    label: "Budget line items",
    rowIdentity: "One row per budget line item in the reviewed workbook range.",
    sectionId: "annual-budget",
  },
  {
    anchorReference: needsRangeReview(
      "wage-budget-report",
      "Wage/FTE/demographic rows",
    ),
    description:
      "Wage, FTE and demographic rows are likely repeatable but remain manual-only.",
    fieldSourceType: "manual",
    id: "wage-fte-demographic-rows",
    label: "Wage/FTE/demographic rows",
    rowIdentity: "One row per wage, FTE or demographic record where present.",
    sectionId: "wage-employee-demographics",
  },
  {
    anchorReference: needsRangeReview(
      "fee-for-service-report",
      "Fee-for-service activity rows",
    ),
    description:
      "Fee-for-service rows are likely repeatable activity rows and need exact range review.",
    fieldSourceType: "manual",
    id: "fee-for-service-activity-rows",
    label: "Fee-for-service activity rows",
    rowIdentity: "One row per fee-for-service activity where present.",
    sectionId: "fee-for-service",
  },
  {
    anchorReference: needsRangeReview("expenditure-report", "Expenditure rows"),
    description:
      "Expenditure rows remain manual until finance/acquittal data ownership is scoped.",
    fieldSourceType: "manual",
    id: "expenditure-report-rows",
    label: "Expenditure rows",
    rowIdentity: "One row per expenditure or acquittal line item.",
    sectionId: "expenditure-report",
  },
  {
    anchorReference: needsRangeReview("asset-register", "Asset register rows"),
    description:
      "Asset register rows remain manual until asset reporting is scoped.",
    fieldSourceType: "manual",
    id: "asset-register-rows",
    label: "Asset register rows",
    rowIdentity: "One row per asset register entry.",
    sectionId: "asset-register",
  },
  {
    anchorReference: needsRangeReview("hide", "Hidden lookup/dropdown rows"),
    description:
      "Hidden lookup and dropdown source rows should inform validation, not output generation.",
    fieldSourceType: "manual",
    id: "hidden-lookup-dropdown-rows",
    label: "Hidden lookup/dropdown rows",
    rowIdentity: "One row per lookup/dropdown source value where reviewed.",
    sectionId: "hidden-reference",
  },
];

function metadataForSheets(sheets: AppbWorkbookSheet[]) {
  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const sections = sharedVerifiedSections.filter((section) =>
    sheetIds.has(section.sheetId),
  );
  const sectionIds = new Set(sections.map((section) => section.id));
  const fields = sharedVerifiedFields.filter((field) =>
    sectionIds.has(field.sectionId),
  );
  const repeatableTables = sharedVerifiedRepeatableTables.filter((table) =>
    sectionIds.has(table.sectionId),
  );
  const manualFields = fields
    .filter(
      (field) =>
        field.flags.includes("manualOnly") ||
        field.flags.includes("formulaProtected"),
    )
    .map((field) => ({
      fieldId: field.id,
      reason: manualFieldReason(field),
    }));

  return {
    fields,
    manualFields,
    mappings: buildMappings(fields),
    rangeMappings: buildRangeMappings(fields, repeatableTables, sheets),
    repeatableRangeDefinitions: buildRepeatableRangeDefinitions(
      repeatableTables,
      sheets,
    ),
    repeatableTables,
    sections,
    sheets,
  };
}

function buildMappings(fields: AppbTemplateField[]): AppbTemplateMapping[] {
  return fields.map((field) => ({
    fieldId: field.id,
    id: `${field.id}-mapping`,
    reviewStatus: field.flags.includes("formulaProtected")
      ? "blocked"
      : "needs-review",
    sourcePath: field.dataPath,
    sourceType: field.sourceType,
    targetReference: field.cellReference,
  }));
}

function buildRangeMappings(
  fields: AppbTemplateField[],
  repeatableTables: AppbRepeatableTable[],
  sheets: AppbWorkbookSheet[],
): AppbWorkbookRangeMapping[] {
  const sheetById = new Map(sheets.map((sheet) => [sheet.id, sheet]));

  return [
    ...fields.map((field) => buildFieldRangeMapping(field, sheetById)),
    ...repeatableTables.map((table) =>
      buildRepeatableRangeMapping(table, sheetById),
    ),
  ];
}

function buildFieldRangeMapping(
  field: AppbTemplateField,
  sheetById: Map<string, AppbWorkbookSheet>,
): AppbWorkbookRangeMapping {
  const sheet = sheetById.get(field.cellReference.sheetId);
  const sheetName = sheet?.name ?? field.cellReference.sheetId;
  const base = {
    fieldId: field.id,
    id: `${field.id}-range-mapping`,
    label: field.label,
    review: { status: "needs-review" as AppbWorkbookRangeMappingStatus },
    reviewNotes: [
      "Exact workbook cell or range remains unreviewed. Do not use this mapping for export.",
    ],
    sourceType: field.sourceType,
  };

  if (field.flags.includes("formulaProtected")) {
    return {
      ...base,
      cellTarget: {
        requiresMergedCellAnchor: false,
        sheetId: field.cellReference.sheetId,
        sheetName,
        targetType: "formula-cell",
      },
      formulaProtectionRule: {
        description:
          "Formula cells are blocked from future writes until explicitly reviewed.",
        fieldId: field.id,
        id: `${field.id}-formula-protection`,
        sheetId: field.cellReference.sheetId,
        status: "blocked-formula",
      },
      review: { status: "blocked-formula" },
      status: "blocked-formula",
      targetType: "formula-cell",
    };
  }

  if (sheet?.state === "hidden" || sheet?.state === "very-hidden") {
    return {
      ...base,
      cellTarget: {
        requiresMergedCellAnchor: false,
        sheetId: field.cellReference.sheetId,
        sheetName,
        targetType: "hidden-lookup",
      },
      hiddenSheetRule: {
        description:
          "Hidden lookup/reference sheets are blocked unless reviewed in a later scoped mapping PR.",
        id: `${field.id}-hidden-sheet-rule`,
        sheetId: field.cellReference.sheetId,
        status: "blocked-hidden-sheet",
      },
      review: { status: "blocked-hidden-sheet" },
      status: "blocked-hidden-sheet",
      targetType: "hidden-lookup",
    };
  }

  if (field.flags.includes("repeatable")) {
    return {
      ...base,
      blocker: {
        description:
          "Repeatable field expansion rules are not defined, so this target cannot be exported.",
        id: `${field.id}-repeatable-blocker`,
        status: "needs-review",
      },
      repeatableRange: {
        expansionRule: "not-defined",
        sheetId: field.cellReference.sheetId,
        sheetName,
        targetType: "repeatable-row-range",
      },
      status: "needs-review",
      targetType: "repeatable-row-range",
    };
  }

  return {
    ...base,
    cellTarget: {
      a1Reference: field.cellReference.a1Reference,
      namedRange: field.cellReference.namedRange,
      requiresMergedCellAnchor: true,
      sheetId: field.cellReference.sheetId,
      sheetName,
      targetType: field.cellReference.namedRange ? "named-range" : "single-cell",
    },
    status:
      field.cellReference.discoveryStatus === "known"
        ? "reviewed"
        : "needs-review",
    review: {
      status:
        field.cellReference.discoveryStatus === "known"
          ? "reviewed"
          : "needs-review",
    },
    targetType: field.cellReference.namedRange ? "named-range" : "single-cell",
  };
}

function buildRepeatableRangeMapping(
  table: AppbRepeatableTable,
  sheetById: Map<string, AppbWorkbookSheet>,
): AppbWorkbookRangeMapping {
  const sheet = sheetById.get(table.anchorReference.sheetId);
  const sheetName = sheet?.name ?? table.anchorReference.sheetId;
  const hidden = sheet?.state === "hidden" || sheet?.state === "very-hidden";

  if (hidden) {
    return {
      hiddenSheetRule: {
        description:
          "Hidden lookup/reference repeatable ranges are blocked from output mapping.",
        id: `${table.id}-hidden-sheet-rule`,
        sheetId: table.anchorReference.sheetId,
        status: "blocked-hidden-sheet",
      },
      id: `${table.id}-range-mapping`,
      label: table.label,
      repeatableTableId: table.id,
      review: { status: "blocked-hidden-sheet" },
      reviewNotes: [
        "Hidden lookup/reference sheet; do not treat as report output without review.",
      ],
      sourceType: table.fieldSourceType,
      status: "blocked-hidden-sheet",
      targetType: "hidden-lookup",
    };
  }

  return {
    blocker: {
      description:
        "Repeatable row or column expansion rules are not defined in this metadata foundation.",
      id: `${table.id}-repeatable-blocker`,
      status: "needs-review",
    },
    id: `${table.id}-range-mapping`,
    label: table.label,
    repeatableRange: {
      expansionRule: "not-defined",
      sheetId: table.anchorReference.sheetId,
      sheetName,
      targetType: "repeatable-row-range",
    },
    repeatableTableId: table.id,
    review: { status: "needs-review" },
    reviewNotes: [
      "Repeatable table candidate requires exact start/end range and row identity review.",
    ],
    sourceType: table.fieldSourceType,
    status: "needs-review",
    targetType: "repeatable-row-range",
  };
}

function buildRepeatableRangeDefinitions(
  repeatableTables: AppbRepeatableTable[],
  sheets: AppbWorkbookSheet[],
): AppbRepeatableRangeDefinition[] {
  const sheetById = new Map(sheets.map((sheet) => [sheet.id, sheet]));

  return repeatableTables.map((table) =>
    buildRepeatableRangeDefinition(table, sheetById),
  );
}

function buildRepeatableRangeDefinition(
  table: AppbRepeatableTable,
  sheetById: Map<string, AppbWorkbookSheet>,
): AppbRepeatableRangeDefinition {
  const sheet = sheetById.get(table.anchorReference.sheetId);
  const sheetName = sheet?.name ?? table.anchorReference.sheetId;
  const hidden = sheet?.state === "hidden" || sheet?.state === "very-hidden";
  const manualOnly = table.fieldSourceType === "manual";
  const status: AppbRepeatableRangeStatus = hidden
    ? "blocked-hidden-sheet"
    : "needs-review";
  const expansionRule: AppbRepeatableExpansionRule = hidden
    ? "blocked"
    : manualOnly
      ? "no-export-manual-only"
      : "not-defined";

  return {
    columnMappings: [
      {
        label: "Repeatable table columns",
        status: hidden ? "blocked-hidden-sheet" : "needs-review",
      },
    ],
    expansionRule,
    exportBlockers: [
      {
        description: hidden
          ? "Hidden lookup/reference repeatable areas are not report output targets."
          : "Start/end rows, columns and expansion behaviour require review before export.",
        id: `${table.id}-repeatable-export-blocker`,
        status,
      },
    ],
    fieldSourceType: table.fieldSourceType,
    formulaRowRule: {
      description:
        "Total and formula rows must be identified and protected before any future export.",
      protected: true,
      status: "blocked-formula",
    },
    headerRule: {
      description:
        "Header rows must be reviewed and protected from data writes before export.",
      protected: true,
      status,
    },
    id: `${table.id}-repeatable-range-definition`,
    label: table.label,
    manualRowGroup: manualOnly
      ? {
          description:
            "Manual-only row group. ROPES may track readiness, but must not treat this as structured export data.",
          fieldSourceType: table.fieldSourceType,
          status,
        }
      : undefined,
    repeatableTableId: table.id,
    reviewNotes: [
      hidden
        ? "Hidden/reference sheet candidate remains blocked."
        : "Exact start/end rows and columns are not claimed by this metadata foundation.",
      manualOnly
        ? "Manual-only rows remain report-only and are not structured export rows."
        : "Future structured, derived or Fulcrum-derived rows need a later data-source rule.",
    ],
    rowIdentity: {
      description: table.rowIdentity,
      fieldIds: [],
      status: "needs-review",
    },
    sectionId: table.sectionId,
    sheetId: table.anchorReference.sheetId,
    sheetName,
    status,
  };
}

function manualFieldReason(field: AppbTemplateField) {
  if (field.flags.includes("formulaProtected")) {
    return "Formula cells require exact range review and must be protected from overwrite before export can be enabled.";
  }

  if (field.id.includes("budget") || field.id.includes("expenditure")) {
    return "ROPES does not yet own budget/acquittal finance data, so these fields stay manual.";
  }

  if (field.id.includes("wage")) {
    return "ROPES does not yet own wage, FTE or personnel-demographic reporting data, so these fields stay manual.";
  }

  return "The reviewed workbook structure indicates this area should remain manual until a later scoped mapping decision.";
}

const sharedReadinessChecks: AppbExportReadinessCheck[] = [
  {
    description:
      "Workbook sheet structure has been inspected, but exact writable cells, named ranges and formula boundaries still require range review.",
    id: "range-review-required",
    label: "Range review required",
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
      "Budget/acquittal, wage/personnel, narrative and asset-register fields remain manual until later data ownership work is scoped.",
    id: "manual-only-areas-review-required",
    label: "Manual-only areas review required",
    status: "manual-review",
  },
];

const annualPlanning2025Metadata = metadataForSheets(annualPlanning2025Sheets);
const annualPlanning2024Metadata = metadataForSheets(annualPlanning2024Sheets);
const midYear2025Metadata = metadataForSheets(midYear2025Sheets);
const annualAcquittal2025Metadata = metadataForSheets(
  annualAcquittal2025Sheets,
);

const rangeMappingStatuses: AppbWorkbookRangeMappingStatus[] = [
  "unmapped",
  "needs-review",
  "reviewed",
  "blocked-formula",
  "blocked-hidden-sheet",
  "blocked-unsupported",
  "ready-for-future-export",
];

const repeatableExpansionRules: AppbRepeatableExpansionRule[] = [
  "not-defined",
  "fixed-row-count",
  "append-rows",
  "no-export-manual-only",
  "blocked",
];

const mappingReviewDecisions: AppbMappingReviewDecision[] = [
  "keep-needs-review",
  "mark-reviewed",
  "mark-blocked-formula",
  "mark-blocked-hidden-sheet",
  "mark-blocked-unsupported",
  "mark-unmapped",
  "mark-ready-for-future-export",
];

const mappingReviewTargetKinds: AppbMappingReviewTargetKind[] = [
  "field-mapping",
  "repeatable-range",
];

export function buildAppbWorkbookRangeMappingSummary(
  version: AppbTemplateVersion,
  persistedReviews: AppbPersistedMappingReview[] = [],
): AppbWorkbookRangeMappingSummary {
  const statusCounts = rangeMappingStatuses.map((status) => ({
    count: version.rangeMappings.filter(
      (mapping) =>
        resolveAppbRangeMappingStatus(mapping, persistedReviews) === status,
    ).length,
    status,
  }));

  return {
    exportBlocked: true,
    statusCounts,
    total: version.rangeMappings.length,
    unresolvedCount: version.rangeMappings.filter(
      (mapping) => !isAppbRangeMappingResolved(mapping, persistedReviews),
    ).length,
  };
}

export function buildAppbMappingReviews(
  version: AppbTemplateVersion,
  persistedReviews: AppbPersistedMappingReview[] = [],
): AppbMappingReview[] {
  const reviews = [
    ...version.rangeMappings
      .filter((mapping) => Boolean(mapping.fieldId))
      .map((mapping) => buildFieldMappingReview(version, mapping)),
    ...version.repeatableRangeDefinitions.map((definition) =>
      buildRepeatableRangeReview(version, definition),
    ),
  ];

  return reviews.map((review) =>
    applyPersistedMappingReview(review, persistedReviews),
  );
}

export function buildAppbMappingReviewSummary(
  version: AppbTemplateVersion,
  persistedReviews: AppbPersistedMappingReview[] = [],
): AppbMappingReviewSummary {
  const reviews = buildAppbMappingReviews(version, persistedReviews);
  const statusCounts = rangeMappingStatuses.map((status) => ({
    count: reviews.filter((review) => review.status === status).length,
    status,
  }));
  const decisionCounts = mappingReviewDecisions.map((decision) => ({
    count: reviews.filter((review) => review.decision === decision).length,
    decision,
  }));
  const targetCounts = mappingReviewTargetKinds.map((targetKind) => ({
    count: reviews.filter((review) => review.targetKind === targetKind).length,
    targetKind,
  }));

  return {
    blockedCount: reviews.filter((review) => review.status.startsWith("blocked"))
      .length,
    decisionCounts,
    exportBlocked: true,
    needsReviewCount: reviews.filter(
      (review) => review.status === "needs-review" || review.status === "unmapped",
    ).length,
    reviewedCount: reviews.filter(
      (review) =>
        review.status === "reviewed" ||
        review.status === "ready-for-future-export",
    ).length,
    statusCounts,
    targetCounts,
    total: reviews.length,
  };
}

export function buildAppbRepeatableRangeSummary(
  version: AppbTemplateVersion,
  persistedReviews: AppbPersistedMappingReview[] = [],
): AppbRepeatableRangeSummary {
  const statusCounts = rangeMappingStatuses.map((status) => ({
    count: version.repeatableRangeDefinitions.filter(
      (definition) =>
        resolveAppbRepeatableRangeStatus(definition, persistedReviews) === status,
    ).length,
    status,
  }));
  const expansionRuleCounts = repeatableExpansionRules.map((expansionRule) => ({
    count: version.repeatableRangeDefinitions.filter(
      (definition) => definition.expansionRule === expansionRule,
    ).length,
    expansionRule,
  }));

  return {
    exportBlocked: true,
    expansionRuleCounts,
    manualOnlyCount: version.repeatableRangeDefinitions.filter(
      (definition) => definition.expansionRule === "no-export-manual-only",
    ).length,
    statusCounts,
    total: version.repeatableRangeDefinitions.length,
    unresolvedCount: version.repeatableRangeDefinitions.filter(
      (definition) =>
        !isAppbRepeatableRangeResolved(definition, persistedReviews),
    ).length,
  };
}

export function findAppbRangeMappingForField(
  version: AppbTemplateVersion,
  fieldId: string,
) {
  return version.rangeMappings.find((mapping) => mapping.fieldId === fieldId);
}

export function isAppbRangeMappingResolved(
  mapping: AppbWorkbookRangeMapping | undefined,
  persistedReviews: AppbPersistedMappingReview[] = [],
) {
  const status = resolveAppbRangeMappingStatus(mapping, persistedReviews);

  return (
    status === "reviewed" ||
    status === "ready-for-future-export"
  );
}

export function isAppbRepeatableRangeResolved(
  definition: AppbRepeatableRangeDefinition | undefined,
  persistedReviews: AppbPersistedMappingReview[] = [],
) {
  const status = resolveAppbRepeatableRangeStatus(definition, persistedReviews);

  return (
    status === "reviewed" ||
    status === "ready-for-future-export"
  );
}

export function findAppbRepeatableRangeDefinition(
  version: AppbTemplateVersion,
  repeatableTableId: string,
) {
  return version.repeatableRangeDefinitions.find(
    (definition) => definition.repeatableTableId === repeatableTableId,
  );
}

function buildFieldMappingReview(
  version: AppbTemplateVersion,
  mapping: AppbWorkbookRangeMapping,
): AppbMappingReview {
  const decision = reviewDecisionForStatus(mapping.status);

  return {
    auditMetadata: {
      decision,
      mappingId: mapping.id,
      status: mapping.status,
      targetKind: "field-mapping",
      templateVersionId: version.id,
      valueFree: true,
    },
    decision,
    exportBlocked: true,
    id: `${version.id}-${mapping.id}-review`,
    label: mapping.label,
    note: safeMappingReviewNote(mapping.reviewNotes),
    reviewedAt: mapping.review.reviewedOn,
    reviewer: mapping.review.reviewedBy
      ? {
          displayName: mapping.review.reviewedBy,
          source: "metadata-placeholder",
        }
      : undefined,
    reviewNotes: mapping.reviewNotes,
    status: mapping.status,
    targetId: mapping.id,
    targetKind: "field-mapping",
    templateVersionId: version.id,
  };
}

export function resolveAppbRangeMappingStatus(
  mapping: AppbWorkbookRangeMapping | undefined,
  persistedReviews: AppbPersistedMappingReview[] = [],
): AppbMappingReviewStatus | undefined {
  if (!mapping) {
    return undefined;
  }

  return (
    findPersistedMappingReview(persistedReviews, {
      targetId: mapping.id,
      targetKind: "field-mapping",
    })?.status ?? mapping.status
  );
}

export function resolveAppbRepeatableRangeStatus(
  definition: AppbRepeatableRangeDefinition | undefined,
  persistedReviews: AppbPersistedMappingReview[] = [],
): AppbMappingReviewStatus | undefined {
  if (!definition) {
    return undefined;
  }

  return (
    findPersistedMappingReview(persistedReviews, {
      targetId: definition.id,
      targetKind: "repeatable-range",
    })?.status ?? definition.status
  );
}

function applyPersistedMappingReview(
  review: AppbMappingReview,
  persistedReviews: AppbPersistedMappingReview[],
): AppbMappingReview {
  const persistedReview = findPersistedMappingReview(persistedReviews, review);

  if (!persistedReview) {
    return review;
  }

  return {
    ...review,
    decision: persistedReview.decision,
    id: persistedReview.id,
    note: persistedReview.safeNote
      ? {
          isValueFree: true,
          maxLength: 240,
          text: persistedReview.safeNote,
        }
      : review.note,
    reviewedAt: persistedReview.reviewedAt,
    reviewer:
      persistedReview.reviewerDisplayName || persistedReview.reviewerUserId
        ? {
            displayName: persistedReview.reviewerDisplayName,
            source: "future-authenticated-user",
            userId: persistedReview.reviewerUserId,
          }
        : undefined,
    reviewNotes: persistedReview.safeNote
      ? [persistedReview.safeNote]
      : review.reviewNotes,
    status: persistedReview.status,
  };
}

function findPersistedMappingReview(
  persistedReviews: AppbPersistedMappingReview[],
  target: {
    targetId: string;
    targetKind: AppbMappingReviewTargetKind;
  },
) {
  return persistedReviews.find(
    (review) =>
      review.targetId === target.targetId &&
      review.targetKind === target.targetKind,
  );
}

function buildRepeatableRangeReview(
  version: AppbTemplateVersion,
  definition: AppbRepeatableRangeDefinition,
): AppbMappingReview {
  const decision = reviewDecisionForStatus(definition.status);

  return {
    auditMetadata: {
      decision,
      mappingId: definition.id,
      status: definition.status,
      targetKind: "repeatable-range",
      templateVersionId: version.id,
      valueFree: true,
    },
    decision,
    exportBlocked: true,
    id: `${version.id}-${definition.id}-review`,
    label: definition.label,
    note: safeMappingReviewNote(definition.reviewNotes),
    reviewNotes: definition.reviewNotes,
    status: definition.status,
    targetId: definition.id,
    targetKind: "repeatable-range",
    templateVersionId: version.id,
  };
}

function reviewDecisionForStatus(
  status: AppbMappingReviewStatus,
): AppbMappingReviewDecision {
  switch (status) {
    case "reviewed":
      return "mark-reviewed";
    case "blocked-formula":
      return "mark-blocked-formula";
    case "blocked-hidden-sheet":
      return "mark-blocked-hidden-sheet";
    case "blocked-unsupported":
      return "mark-blocked-unsupported";
    case "unmapped":
      return "mark-unmapped";
    case "ready-for-future-export":
      return "mark-ready-for-future-export";
    case "needs-review":
      return "keep-needs-review";
  }
}

function safeMappingReviewNote(notes: string[]): AppbMappingReviewNote | undefined {
  const [firstNote] = notes;

  if (!firstNote) {
    return undefined;
  }

  return {
    isValueFree: true,
    maxLength: 240,
    text: firstNote.slice(0, 240),
  };
}

function withTemplateVersionId(
  definitions: AppbRepeatableRangeDefinition[],
  templateVersionId: string,
) {
  return definitions.map((definition) => ({
    ...definition,
    templateVersionId,
  }));
}

export const appbTemplateVersions: AppbTemplateVersion[] = [
  {
    discoveryNotes:
      "Verified structural metadata from reviewed local inspection. Exact writable cells, named ranges and formula boundaries still require range review before export.",
    exportReadinessChecks: sharedReadinessChecks,
    fields: annualPlanning2025Metadata.fields,
    id: "niaa-irp-ipa-mdbirr-2025-26-annual-planning",
    label: "2025-26 annual planning template",
    mappings: annualPlanning2025Metadata.mappings,
    manualFields: annualPlanning2025Metadata.manualFields,
    profileId: "niaa-irp-ipa-mdbirr-appb",
    rangeMappings: annualPlanning2025Metadata.rangeMappings,
    repeatableRangeDefinitions: withTemplateVersionId(
      annualPlanning2025Metadata.repeatableRangeDefinitions,
      "niaa-irp-ipa-mdbirr-2025-26-annual-planning",
    ),
    repeatableTables: annualPlanning2025Metadata.repeatableTables,
    reportingCycle: "annual-planning",
    sections: annualPlanning2025Metadata.sections,
    sheets: annualPlanning2025Metadata.sheets,
    sourceTemplateFileName:
      "APP&B - IRP, IPA and MDBIRR template - for 2025-26(3).xlsx",
  },
  {
    discoveryNotes:
      "Verified structural metadata from reviewed local inspection. The Hide/reference sheet was visible in this example and needs reviewer confirmation before export work.",
    exportReadinessChecks: sharedReadinessChecks,
    fields: annualPlanning2024Metadata.fields,
    id: "niaa-irp-expansion-2024-25-annual-planning",
    label: "2024-25 IRP expansion annual planning example",
    mappings: annualPlanning2024Metadata.mappings,
    manualFields: annualPlanning2024Metadata.manualFields,
    profileId: "niaa-irp-ipa-mdbirr-appb",
    rangeMappings: annualPlanning2024Metadata.rangeMappings,
    repeatableRangeDefinitions: withTemplateVersionId(
      annualPlanning2024Metadata.repeatableRangeDefinitions,
      "niaa-irp-expansion-2024-25-annual-planning",
    ),
    repeatableTables: annualPlanning2024Metadata.repeatableTables,
    reportingCycle: "annual-planning",
    sections: annualPlanning2024Metadata.sections,
    sheets: annualPlanning2024Metadata.sheets,
    sourceTemplateFileName: "NAC APP&B - IRP Round 1 of Expansion-2024-25.xlsx",
  },
  {
    discoveryNotes:
      "Verified structural metadata from reviewed local inspection. Protection metadata was not detected on the mid-year workbook, so formulas and manual areas still need range review.",
    exportReadinessChecks: sharedReadinessChecks,
    fields: midYear2025Metadata.fields,
    id: "niaa-irp-ipa-mdbirr-2025-26-mid-year",
    label: "2025-26 mid-year progress template",
    mappings: midYear2025Metadata.mappings,
    manualFields: midYear2025Metadata.manualFields,
    profileId: "niaa-irp-ipa-mdbirr-appb",
    rangeMappings: midYear2025Metadata.rangeMappings,
    repeatableRangeDefinitions: withTemplateVersionId(
      midYear2025Metadata.repeatableRangeDefinitions,
      "niaa-irp-ipa-mdbirr-2025-26-mid-year",
    ),
    repeatableTables: midYear2025Metadata.repeatableTables,
    reportingCycle: "mid-year-progress",
    sections: midYear2025Metadata.sections,
    sheets: midYear2025Metadata.sheets,
    sourceTemplateFileName:
      "APP&B - IRP, IPA and MDBIRR template - 25-26 mid Year.xlsx",
  },
  {
    discoveryNotes:
      "Verified structural metadata from reviewed local inspection. This annual report/acquittal example uses the smaller sheet set without wage or fee-for-service tabs.",
    exportReadinessChecks: sharedReadinessChecks,
    fields: annualAcquittal2025Metadata.fields,
    id: "niaa-irp-ipa-mdbirr-2025-26-annual-acquittal",
    label: "2025-26 annual report/acquittal template",
    mappings: annualAcquittal2025Metadata.mappings,
    manualFields: annualAcquittal2025Metadata.manualFields,
    profileId: "niaa-irp-ipa-mdbirr-appb",
    rangeMappings: annualAcquittal2025Metadata.rangeMappings,
    repeatableRangeDefinitions: withTemplateVersionId(
      annualAcquittal2025Metadata.repeatableRangeDefinitions,
      "niaa-irp-ipa-mdbirr-2025-26-annual-acquittal",
    ),
    repeatableTables: annualAcquittal2025Metadata.repeatableTables,
    reportingCycle: "annual-acquittal",
    sections: annualAcquittal2025Metadata.sections,
    sheets: annualAcquittal2025Metadata.sheets,
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
  blockedFormulaRangeMappingCount: appbTemplateVersions.reduce(
    (count, version) =>
      count +
      version.rangeMappings.filter(
        (mapping) => mapping.status === "blocked-formula",
      ).length,
    0,
  ),
  blockedHiddenSheetRangeMappingCount: appbTemplateVersions.reduce(
    (count, version) =>
      count +
      version.rangeMappings.filter(
        (mapping) => mapping.status === "blocked-hidden-sheet",
      ).length,
    0,
  ),
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
  mappingReviewBlockedCount: appbTemplateVersions.reduce(
    (count, version) =>
      count + buildAppbMappingReviewSummary(version).blockedCount,
    0,
  ),
  mappingReviewCount: appbTemplateVersions.reduce(
    (count, version) => count + buildAppbMappingReviewSummary(version).total,
    0,
  ),
  mappingReviewNeedsReviewCount: appbTemplateVersions.reduce(
    (count, version) =>
      count + buildAppbMappingReviewSummary(version).needsReviewCount,
    0,
  ),
  mappingCount: appbTemplateVersions.reduce(
    (count, version) => count + version.mappings.length,
    0,
  ),
  rangeMappingCount: appbTemplateVersions.reduce(
    (count, version) => count + version.rangeMappings.length,
    0,
  ),
  rangeMappingNeedsReviewCount: appbTemplateVersions.reduce(
    (count, version) =>
      count +
      version.rangeMappings.filter((mapping) => mapping.status === "needs-review")
        .length,
    0,
  ),
  rangeMappingReviewedCount: appbTemplateVersions.reduce(
    (count, version) =>
      count +
      version.rangeMappings.filter((mapping) =>
        isAppbRangeMappingResolved(mapping),
      ).length,
    0,
  ),
  repeatableTableCount: appbTemplateVersions.reduce(
    (count, version) => count + version.repeatableTables.length,
    0,
  ),
  repeatableRangeDefinitionCount: appbTemplateVersions.reduce(
    (count, version) => count + version.repeatableRangeDefinitions.length,
    0,
  ),
  repeatableRangeManualOnlyCount: appbTemplateVersions.reduce(
    (count, version) =>
      count +
      version.repeatableRangeDefinitions.filter(
        (definition) => definition.expansionRule === "no-export-manual-only",
      ).length,
    0,
  ),
  repeatableRangeNeedsReviewCount: appbTemplateVersions.reduce(
    (count, version) =>
      count +
      version.repeatableRangeDefinitions.filter(
        (definition) => definition.status === "needs-review",
      ).length,
    0,
  ),
  sheetCount: appbTemplateVersions.reduce(
    (count, version) => count + version.sheets.length,
    0,
  ),
  sheetProtectionDetectedCount: appbTemplateVersions.reduce(
    (count, version) =>
      count + version.sheets.filter((sheet) => sheet.protectionDetected).length,
    0,
  ),
  formulaSheetCount: appbTemplateVersions.reduce(
    (count, version) =>
      count +
      version.sheets.filter(
        (sheet) => (sheet.dimensions?.formulaCellCount ?? 0) > 0,
      ).length,
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
    description:
      "Exact cell, named range or repeatable workbook target metadata with review status.",
    name: "AppbWorkbookRangeMapping",
  },
  {
    description:
      "Single-cell, merged-anchor, formula, hidden lookup or unsupported workbook target.",
    name: "AppbWorkbookCellTarget",
  },
  {
    description:
      "Repeatable workbook row/column range that remains blocked until expansion rules are reviewed.",
    name: "AppbWorkbookRepeatableRange",
  },
  {
    description: "Repeatable row/table mapping such as activities, outputs or evidence.",
    name: "AppbRepeatableTable",
  },
  {
    description:
      "Review-gated repeatable table definition with header, data, formula and expansion metadata.",
    name: "AppbRepeatableRangeDefinition",
  },
  {
    description:
      "Value-free human review record for field mappings and repeatable range metadata.",
    name: "AppbMappingReview",
  },
  {
    description:
      "Safe review decision such as keep needs-review, mark reviewed or mark blocked.",
    name: "AppbMappingReviewDecision",
  },
  {
    description:
      "Compact value-free review counts for a template version or APP&B report.",
    name: "AppbMappingReviewSummary",
  },
  {
    description:
      "Repeatable table row identity rule used to distinguish future fixed or appendable rows.",
    name: "AppbRepeatableRowIdentity",
  },
  {
    description:
      "Column-level mapping placeholder for a repeatable table range.",
    name: "AppbRepeatableColumnMapping",
  },
  {
    description:
      "Header and formula row protection rules for repeatable workbook areas.",
    name: "AppbRepeatableHeaderRule / AppbRepeatableFormulaRowRule",
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

function needsRangeReview(
  sheetId: string,
  label: string,
): AppbCellRangeReference {
  return {
    discoveryStatus: "needs-range-review",
    label,
    sheetId,
  };
}
