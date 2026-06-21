import type { FulcrumSyncJobStatus, Prisma } from "@prisma/client";
import type { OrganisationSlug } from "@/lib/dashboard-data";
import { canReadOrganisation } from "@/lib/auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import { isFulcrumTokenEncryptionConfigured } from "@/lib/fulcrum-token-encryption";
import { isAuthenticatedDatabaseMode } from "@/lib/read-access-mode";

export const fulcrumSections = [
  {
    label: "Overview",
    slug: "overview",
    href: "/fulcrum",
    description: "Demo Fulcrum activity, data quality and sync posture.",
  },
  {
    label: "Connections",
    slug: "connections",
    href: "/fulcrum/connections",
    description: "Encrypted Fulcrum token setup and connection status.",
  },
  {
    label: "Apps & Forms",
    slug: "apps-forms",
    href: "/fulcrum/apps-forms",
    description: "Mock app catalogue and field structure previews.",
  },
  {
    label: "Field Records",
    slug: "field-records",
    href: "/fulcrum/field-records",
    description: "Demo synced-record table scoped to the organisation.",
  },
  {
    label: "Maps",
    slug: "maps",
    href: "/fulcrum/maps",
    description: "Map placeholder for record locations and project areas.",
  },
  {
    label: "Data Health",
    slug: "data-health",
    href: "/fulcrum/data-health",
    description: "Fake quality checks for GPS, photos and required fields.",
  },
  {
    label: "AI Assistant",
    slug: "ai-assistant",
    href: "/fulcrum/ai-assistant",
    description: "Mock assistant surface showing what it would search.",
  },
  {
    label: "App Builder",
    slug: "app-builder",
    href: "/fulcrum/app-builder",
    description: "Design-preview shell for future Fulcrum form planning.",
  },
  {
    label: "Sync Settings",
    slug: "sync-settings",
    href: "/fulcrum/sync-settings",
    description: "Placeholder sync cadence and audit settings.",
  },
] as const;

export type FulcrumSectionSlug = (typeof fulcrumSections)[number]["slug"];

export type DemoFulcrumConnection = {
  id: string;
  organisationId?: string;
  organisationSlug: OrganisationSlug;
  name: string;
  accountLabel: string;
  status: "Connected" | "Not connected" | "Ready for setup" | "Demo offline";
  lastChecked: string;
  lastTestMessage?: string;
  note: string;
  tokenHint?: string;
};

export type DemoFulcrumApp = {
  id: string;
  organisationSlug: OrganisationSlug;
  name: string;
  purpose: string;
  fields: string[];
  requiredFields: string[];
  recordCount: number;
  lastSynced: string;
  project: string;
};

export type DemoFulcrumRecord = {
  id: string;
  organisationSlug: OrganisationSlug;
  appId: string;
  title: string;
  status: "Complete" | "Needs review" | "Draft";
  createdBy: string;
  recordedAt: string;
  location: string;
  project: string;
};

export type DemoHealthCheck = {
  id: string;
  organisationSlug: OrganisationSlug;
  title: string;
  status: "Good" | "Review" | "Warning";
  count: number;
  detail: string;
};

export type DemoSyncSetting = {
  id: string;
  organisationSlug: OrganisationSlug;
  label: string;
  value: string;
  note: string;
};

export type DemoFulcrumSyncJob = {
  id: string;
  importSummary?: {
    filteredSensitiveFieldCount: number;
    importedRecordCount: number;
    missingGpsCount: number;
    skippedRecordCount: number;
    updatedRecordCount: number;
  };
  connectionId: string;
  connectionName: string;
  requestedAt: string;
  requestedBy: string;
  safeErrorCategory?: string;
  status: "Queued" | "Running" | "Succeeded" | "Failed" | "Cancelled";
  summary: string;
};

export type FulcrumConnectionState = {
  connections: DemoFulcrumConnection[];
  encryptionConfigured: boolean;
  isDatabaseAvailable: boolean;
  isDatabaseConfigured: boolean;
  organisationId?: string;
  syncJobs: DemoFulcrumSyncJob[];
};

export function isFulcrumSectionSlug(
  sectionSlug: string,
): sectionSlug is FulcrumSectionSlug {
  return fulcrumSections.some((section) => section.slug === sectionSlug);
}

export function getFulcrumSection(sectionSlug?: string) {
  if (!sectionSlug || !isFulcrumSectionSlug(sectionSlug)) {
    return fulcrumSections[0];
  }

  return fulcrumSections.find((section) => section.slug === sectionSlug)!;
}

export function getFulcrumConnectionsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  return demoFulcrumConnections.filter(
    (connection) => connection.organisationSlug === organisationSlug,
  );
}

export async function getFulcrumConnectionState(
  organisationSlug: OrganisationSlug,
): Promise<FulcrumConnectionState> {
  const encryptionConfigured = isFulcrumTokenEncryptionConfigured();

  if (!isDatabaseConfigured()) {
    return {
      connections: getFulcrumConnectionsForOrganisation(organisationSlug),
      encryptionConfigured,
      isDatabaseAvailable: false,
      isDatabaseConfigured: false,
      syncJobs: [],
    };
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        fulcrumConnections: {
          orderBy: {
            createdAt: "asc",
          },
        },
        fulcrumSyncJobs: {
          include: {
            fulcrumConnection: {
              select: {
                name: true,
              },
            },
            requestedBy: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            requestedAt: "desc",
          },
          take: 5,
        },
      },
      where: {
        slug: organisationSlug,
      },
    });

    if (!organisation) {
      return {
        connections: isAuthenticatedDatabaseMode()
          ? []
          : getFulcrumConnectionsForOrganisation(organisationSlug),
        encryptionConfigured,
        isDatabaseAvailable: false,
        isDatabaseConfigured: true,
        syncJobs: [],
      };
    }

    if (!(await canReadOrganisation(prisma, organisation.id))) {
      return {
        connections: [],
        encryptionConfigured,
        isDatabaseAvailable: true,
        isDatabaseConfigured: true,
        organisationId: organisation.id,
        syncJobs: [],
      };
    }

    const connections = organisation.fulcrumConnections.length
      ? organisation.fulcrumConnections.map((connection) => ({
          accountLabel: connection.accountLabel ?? "Fulcrum account",
          id: connection.id,
          lastChecked: connection.lastCheckedAt
            ? formatDateTime(connection.lastCheckedAt)
            : "Not checked",
          lastTestMessage: connection.lastTestMessage ?? undefined,
          name: connection.name,
          note: connection.encryptedApiToken
            ? "Encrypted token is stored. Raw tokens are never displayed after save."
            : "No token is stored for this organisation.",
          organisationId: connection.organisationId,
          organisationSlug,
          status: mapConnectionStatus(connection.status),
          tokenHint: connection.tokenHint ?? undefined,
        }))
      : [createReadyConnectionPlaceholder(organisationSlug, organisation.id)];

    return {
      connections,
      encryptionConfigured,
      isDatabaseAvailable: true,
      isDatabaseConfigured: true,
      organisationId: organisation.id,
      syncJobs: organisation.fulcrumSyncJobs.map(mapPersistedSyncJob),
    };
  } catch {
    return {
      connections: isAuthenticatedDatabaseMode()
        ? []
        : getFulcrumConnectionsForOrganisation(organisationSlug),
      encryptionConfigured,
      isDatabaseAvailable: false,
      isDatabaseConfigured: true,
      syncJobs: [],
    };
  }
}

export async function getFulcrumAppsForOrganisation(
  organisationSlug: OrganisationSlug,
): Promise<DemoFulcrumApp[]> {
  if (!isDatabaseConfigured()) {
    return getDemoFulcrumAppsForOrganisation(organisationSlug);
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        fulcrumApps: {
          include: {
            project: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
      },
      where: {
        slug: organisationSlug,
      },
    });

    if (!organisation || !(await canReadOrganisation(prisma, organisation.id))) {
      return isAuthenticatedDatabaseMode()
        ? []
        : getDemoFulcrumAppsForOrganisation(organisationSlug);
    }

    if (!organisation.fulcrumApps.length) {
      return getDemoFulcrumAppsForOrganisation(organisationSlug);
    }

    return organisation.fulcrumApps.map((app) => ({
      fields: getPersistedAppFields(app.rawJson),
      id: app.id,
      lastSynced: app.lastSyncedAt
        ? formatDateTime(app.lastSyncedAt)
        : "Not imported yet",
      name: app.name,
      organisationSlug,
      project: app.project?.name ?? "Unmapped",
      purpose: app.description,
      recordCount: app.recordCount,
      requiredFields: [],
    }));
  } catch {
    return isAuthenticatedDatabaseMode()
      ? []
      : getDemoFulcrumAppsForOrganisation(organisationSlug);
  }
}

export async function getFulcrumRecordsForOrganisation(
  organisationSlug: OrganisationSlug,
): Promise<DemoFulcrumRecord[]> {
  if (!isDatabaseConfigured()) {
    return getDemoFulcrumRecordsForOrganisation(organisationSlug);
  }

  try {
    const prisma = getPrismaClient();
    const organisation = await prisma.organisation.findUnique({
      include: {
        fulcrumRecords: {
          include: {
            fulcrumApp: {
              select: {
                id: true,
                name: true,
              },
            },
            project: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 100,
        },
      },
      where: {
        slug: organisationSlug,
      },
    });

    if (!organisation || !(await canReadOrganisation(prisma, organisation.id))) {
      return isAuthenticatedDatabaseMode()
        ? []
        : getDemoFulcrumRecordsForOrganisation(organisationSlug);
    }

    if (!organisation.fulcrumRecords.length) {
      return getDemoFulcrumRecordsForOrganisation(organisationSlug);
    }

    return organisation.fulcrumRecords.map((record) => ({
      appId: record.fulcrumApp.id,
      createdBy: "Fulcrum import",
      id: record.id,
      location:
        record.latitude === null || record.longitude === null
          ? "Missing GPS"
          : "GPS captured",
      organisationSlug,
      project: record.project?.name ?? "Unmapped",
      recordedAt: (record.capturedAt ?? record.updatedAt).toISOString(),
      status: mapPersistedRecordStatus(record.status),
      title: getPersistedRecordTitle(record.rawJson, record.fulcrumApp.name),
    }));
  } catch {
    return isAuthenticatedDatabaseMode()
      ? []
      : getDemoFulcrumRecordsForOrganisation(organisationSlug);
  }
}

export function getHealthChecksForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  return demoHealthChecks.filter(
    (check) => check.organisationSlug === organisationSlug,
  );
}

export function getSyncSettingsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  return demoSyncSettings.filter(
    (setting) => setting.organisationSlug === organisationSlug,
  );
}

export function getFulcrumSummary(
  organisationSlug: OrganisationSlug,
  counts?: {
    appCount: number;
    healthReviewCount: number;
    recordCount: number;
  },
) {
  const apps = getDemoFulcrumAppsForOrganisation(organisationSlug);
  const records = getDemoFulcrumRecordsForOrganisation(organisationSlug);
  const checks = getHealthChecksForOrganisation(organisationSlug);
  const appCount = counts?.appCount ?? apps.length;
  const recordCount = counts?.recordCount ?? records.length;
  const healthReviewCount =
    counts?.healthReviewCount ??
    checks.filter((check) => check.status !== "Good").length;

  return [
    {
      label: "Apps",
      value: String(appCount),
      caption: "Demo or imported app metadata in this organisation.",
    },
    {
      label: "Field records",
      value: String(recordCount),
      caption: "Demo fallback or capped imported records.",
    },
    {
      label: "Health checks",
      value: String(healthReviewCount),
      caption: "Mock quality signals needing review.",
    },
    {
      label: "API tokens",
      value: "0",
      caption: "Raw Fulcrum tokens are never shown in the UI.",
    },
  ];
}

function getDemoFulcrumAppsForOrganisation(organisationSlug: OrganisationSlug) {
  return demoFulcrumApps.filter(
    (app) => app.organisationSlug === organisationSlug,
  );
}

function getDemoFulcrumRecordsForOrganisation(
  organisationSlug: OrganisationSlug,
) {
  return demoFulcrumRecords.filter(
    (record) => record.organisationSlug === organisationSlug,
  );
}

function getPersistedAppFields(rawJson: unknown) {
  if (!rawJson || typeof rawJson !== "object") {
    return ["Imported metadata"];
  }

  const fieldCount = (rawJson as Record<string, unknown>)["fieldCount"];

  return typeof fieldCount === "number" && fieldCount > 0
    ? [`${fieldCount} imported form fields`]
    : ["Imported metadata"];
}

function getPersistedRecordTitle(rawJson: unknown, fallback: string) {
  if (!rawJson || typeof rawJson !== "object") {
    return fallback;
  }

  const preview = (rawJson as Record<string, unknown>)["formValuesPreview"];

  if (!preview || typeof preview !== "object") {
    return fallback;
  }

  const firstTextValue = Object.values(preview).find(
    (value) => typeof value === "string" && value.trim(),
  );

  return typeof firstTextValue === "string" ? firstTextValue : fallback;
}

function mapPersistedRecordStatus(
  status: string,
): DemoFulcrumRecord["status"] {
  const normalisedStatus = status.toLowerCase();

  if (normalisedStatus.includes("complete")) {
    return "Complete";
  }

  if (normalisedStatus.includes("draft")) {
    return "Draft";
  }

  return "Needs review";
}

function createReadyConnectionPlaceholder(
  organisationSlug: OrganisationSlug,
  organisationId: string,
): DemoFulcrumConnection {
  return {
    accountLabel: "No Fulcrum token saved",
    id: "new-fulcrum-connection",
    lastChecked: "Not checked",
    name: "Fulcrum API connection",
    note: "Save an API token to create an encrypted organisation-scoped connection.",
    organisationId,
    organisationSlug,
    status: "Ready for setup",
  };
}

function mapConnectionStatus(status: string): DemoFulcrumConnection["status"] {
  if (status === "CONNECTED") {
    return "Connected";
  }

  if (status === "READY_FOR_SETUP") {
    return "Ready for setup";
  }

  if (status === "ERROR") {
    return "Not connected";
  }

  return "Not connected";
}

function mapPersistedSyncJob({
  fulcrumConnection,
  requestedBy,
  ...syncJob
}: {
  id: string;
  fulcrumConnectionId: string;
  fulcrumConnection: { name: string };
  metadata: Prisma.JsonValue | null;
  requestedAt: Date;
  requestedBy: { name: string } | null;
  safeErrorCategory: string | null;
  status: FulcrumSyncJobStatus;
  summary: string;
}): DemoFulcrumSyncJob {
  return {
    connectionId: syncJob.fulcrumConnectionId,
    connectionName: fulcrumConnection.name,
    id: syncJob.id,
    importSummary: getImportSummary(syncJob.metadata),
    requestedAt: formatDateTime(syncJob.requestedAt),
    requestedBy: requestedBy?.name ?? "Unknown user",
    safeErrorCategory: syncJob.safeErrorCategory ?? undefined,
    status: mapSyncJobStatus(syncJob.status),
    summary: syncJob.summary,
  };
}

function getImportSummary(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const record = metadata as Record<string, unknown>;

  if (record["event"] !== "manual_fulcrum_import_completed") {
    return undefined;
  }

  return {
    filteredSensitiveFieldCount: getMetadataNumber(
      record["filteredSensitiveFieldCount"],
    ),
    importedRecordCount: getMetadataNumber(record["importedRecordCount"]),
    missingGpsCount: getMetadataNumber(record["missingGpsCount"]),
    skippedRecordCount: getMetadataNumber(record["skippedRecordCount"]),
    updatedRecordCount: getMetadataNumber(record["updatedRecordCount"]),
  };
}

function getMetadataNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapSyncJobStatus(
  status: FulcrumSyncJobStatus,
): DemoFulcrumSyncJob["status"] {
  if (status === "RUNNING") {
    return "Running";
  }

  if (status === "SUCCEEDED") {
    return "Succeeded";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  return "Queued";
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export const assistantPrompts = [
  "Which fake records are missing GPS?",
  "Summarise records for the demo water point trip.",
  "Which demo apps are used most?",
  "Draft a ranger activity report from selected records.",
] as const;

export const appBuilderPreviewFields = [
  {
    name: "Site name",
    type: "Text",
    required: "Yes",
    note: "Primary label for reports.",
  },
  {
    name: "Inspection date",
    type: "Date",
    required: "Yes",
    note: "Used for monthly activity summaries.",
  },
  {
    name: "Condition",
    type: "Choice",
    required: "Yes",
    note: "Good, monitor, repair needed.",
  },
  {
    name: "Photos",
    type: "Media",
    required: "When issue reported",
    note: "Future media sync metadata only.",
  },
] as const;

const demoFulcrumConnections: DemoFulcrumConnection[] = [
  {
    id: "demo-partner-connection",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    name: "Demo Partner Fulcrum Workspace",
    accountLabel: "Fake Fulcrum account - no token stored",
    status: "Demo offline",
    lastChecked: "Not checked",
    note: "Demo fallback only. Configure a database and encryption key to save an encrypted token.",
  },
  {
    id: "demo-enarah-connection",
    organisationSlug: "demo-enarah-services",
    name: "Demo Enarah Support Workspace",
    accountLabel: "Fake internal support account - no token stored",
    status: "Ready for setup",
    lastChecked: "Not checked",
    note: "Demo fallback only. No Fulcrum API request has been made.",
  },
];

const demoFulcrumApps: DemoFulcrumApp[] = [
  {
    id: "water-point-form",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    name: "Demo Water Point Inspection Form",
    purpose: "Fake water infrastructure checks for ranger trip reporting.",
    fields: ["Site", "Condition", "Photo", "Follow-up needed", "GPS"],
    requiredFields: ["Site", "Condition", "GPS"],
    recordCount: 12,
    lastSynced: "Demo sync only",
    project: "Demo Country and Waterways Project",
  },
  {
    id: "track-condition-form",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    name: "Demo Track Condition Form",
    purpose: "Fake access track notes and hazard observations.",
    fields: ["Track section", "Access status", "Hazard", "Photo", "GPS"],
    requiredFields: ["Track section", "Access status"],
    recordCount: 8,
    lastSynced: "Demo sync only",
    project: "Demo Country and Waterways Project",
  },
  {
    id: "support-checklist-form",
    organisationSlug: "demo-enarah-services",
    name: "Demo Fulcrum Support Checklist",
    purpose: "Fake internal checklist for partner support sessions.",
    fields: ["Partner", "Topic", "Action", "Owner", "Due date"],
    requiredFields: ["Partner", "Topic", "Action"],
    recordCount: 3,
    lastSynced: "Demo sync only",
    project: "Demo Partner Enablement Project",
  },
];

const demoFulcrumRecords: DemoFulcrumRecord[] = [
  {
    id: "fake-record-water-001",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    appId: "water-point-form",
    title: "Demo Water Point 7",
    status: "Complete",
    createdBy: "Demo Head Ranger",
    recordedAt: "2026-08-11T01:15:00.000Z",
    location: "Demo GPS captured",
    project: "Demo Country and Waterways Project",
  },
  {
    id: "fake-record-water-002",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    appId: "water-point-form",
    title: "Demo Water Point 9",
    status: "Needs review",
    createdBy: "Demo Ranger",
    recordedAt: "2026-08-11T03:10:00.000Z",
    location: "Missing demo GPS",
    project: "Demo Country and Waterways Project",
  },
  {
    id: "fake-record-track-001",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    appId: "track-condition-form",
    title: "Demo North Access Track",
    status: "Draft",
    createdBy: "Demo Ranger",
    recordedAt: "2026-08-19T02:30:00.000Z",
    location: "Demo GPS captured",
    project: "Demo Country and Waterways Project",
  },
  {
    id: "fake-record-support-001",
    organisationSlug: "demo-enarah-services",
    appId: "support-checklist-form",
    title: "Demo Partner Workshop Notes",
    status: "Complete",
    createdBy: "Demo Enarah Admin",
    recordedAt: "2026-08-22T03:00:00.000Z",
    location: "Office record",
    project: "Demo Partner Enablement Project",
  },
];

const demoHealthChecks: DemoHealthCheck[] = [
  {
    id: "gps-check",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Missing GPS",
    status: "Review",
    count: 1,
    detail: "One fake record is missing GPS metadata.",
  },
  {
    id: "photo-check",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Expected photos",
    status: "Warning",
    count: 2,
    detail: "Two fake records would need photo review before reporting.",
  },
  {
    id: "required-fields-check",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Required fields",
    status: "Good",
    count: 0,
    detail: "Required demo values are complete.",
  },
  {
    id: "support-required-fields-check",
    organisationSlug: "demo-enarah-services",
    title: "Required fields",
    status: "Good",
    count: 0,
    detail: "Fake support checklist values are complete.",
  },
  {
    id: "support-linking-check",
    organisationSlug: "demo-enarah-services",
    title: "Project links",
    status: "Review",
    count: 1,
    detail: "One fake support record needs a project mapping review.",
  },
];

const demoSyncSettings: DemoSyncSetting[] = [
  {
    id: "manual-sync",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    label: "Manual sync",
    value: "Capped import MVP",
    note: "Tested connections can import selected app IDs manually.",
  },
  {
    id: "sync-cadence",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    label: "Scheduled sync",
    value: "Not configured",
    note: "Scheduling comes after encrypted connection setup.",
  },
  {
    id: "audit-log",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    label: "Audit logging",
    value: "Safe events",
    note: "Connection tests, sync placeholders and imports log safe metadata.",
  },
  {
    id: "support-manual-sync",
    organisationSlug: "demo-enarah-services",
    label: "Manual sync",
    value: "Capped import MVP",
    note: "Tested connections can import selected app IDs manually.",
  },
  {
    id: "support-token-storage",
    organisationSlug: "demo-enarah-services",
    label: "Token storage",
    value: "Encrypted setup",
    note: "Raw tokens are encrypted at rest and never shown after save.",
  },
];
