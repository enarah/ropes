export type AppbReportingCycle =
  | "annual-planning"
  | "mid-year-progress"
  | "annual-acquittal";

export type AppbFunder = "NIAA" | "DCCEEW";
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
  currentStatus: "available" | "partial" | "future";
  model: string;
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
    description: "One report instance for one grant and reporting period.",
    name: "AppbReport",
  },
  {
    description: "Stable mapping from ROPES fields to workbook sheets, cells or sections.",
    name: "AppbTemplateMapping",
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
    appbUse: "Grant budgets, funders, program types, outputs and acquittals.",
    currentStatus: "future",
    model: "Future Grants module",
  },
];
