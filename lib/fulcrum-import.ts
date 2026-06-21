import type { Prisma, PrismaClient } from "@prisma/client";

const defaultFulcrumApiBaseUrl = "https://api.fulcrumapp.com/api/v2";
const defaultRecordLimit = 100;
const maxRecordLimit = 100;

export type FulcrumImportFailureCategory =
  | "forbidden"
  | "network_error"
  | "rate_limited"
  | "selected_apps_not_found"
  | "unauthorized"
  | "unexpected_response"
  | "upstream_unavailable";

export type FulcrumImportResult =
  | {
      appCount: number;
      importedRecordCount: number;
      missingGpsCount: number;
      ok: true;
      selectedAppIds: string[];
      updatedRecordCount: number;
    }
  | {
      category: FulcrumImportFailureCategory;
      ok: false;
      selectedAppIds: string[];
    };

type ImportFulcrumRecordsInput = {
  apiToken: string;
  connectionId: string;
  limit?: number;
  organisationId: string;
  prisma: PrismaClient;
  selectedAppIds: string[];
};

type FulcrumAppPayload = {
  description: string;
  externalAppId: string;
  name: string;
  rawJson: Prisma.InputJsonObject;
  recordCount: number;
};

type FulcrumRecordPayload = {
  capturedAt: Date | null;
  dataHealthFlags: Prisma.InputJsonArray;
  externalRecordId: string;
  latitude: number | null;
  longitude: number | null;
  rawJson: Prisma.InputJsonObject;
  status: string;
};

export async function importFulcrumRecordsForConnection({
  apiToken,
  connectionId,
  limit = defaultRecordLimit,
  organisationId,
  prisma,
  selectedAppIds,
}: ImportFulcrumRecordsInput): Promise<FulcrumImportResult> {
  const cappedLimit = Math.min(Math.max(limit, 1), maxRecordLimit);
  const appResult = await fetchFulcrumApps(apiToken);

  if (!appResult.ok) {
    return {
      category: appResult.category,
      ok: false,
      selectedAppIds,
    };
  }

  const selectedApps = appResult.apps.filter((app) =>
    selectedAppIds.includes(app.externalAppId),
  );

  if (!selectedApps.length) {
    return {
      category: "selected_apps_not_found",
      ok: false,
      selectedAppIds,
    };
  }

  const now = new Date();
  const persistedApps = new Map<string, string>();

  for (const app of selectedApps) {
    const persistedApp = await prisma.fulcrumApp.upsert({
      create: {
        description: app.description,
        externalAppId: app.externalAppId,
        fulcrumConnectionId: connectionId,
        importedAt: now,
        isDemo: false,
        lastSyncedAt: now,
        name: app.name,
        organisationId,
        rawJson: app.rawJson,
        recordCount: app.recordCount,
      },
      update: {
        description: app.description,
        importedAt: now,
        isDemo: false,
        lastSyncedAt: now,
        name: app.name,
        rawJson: app.rawJson,
        recordCount: app.recordCount,
      },
      where: {
        organisationId_fulcrumConnectionId_externalAppId: {
          externalAppId: app.externalAppId,
          fulcrumConnectionId: connectionId,
          organisationId,
        },
      },
    });
    persistedApps.set(app.externalAppId, persistedApp.id);
  }

  let importedRecordCount = 0;
  let missingGpsCount = 0;
  let updatedRecordCount = 0;

  for (const externalAppId of selectedAppIds) {
    const fulcrumAppId = persistedApps.get(externalAppId);

    if (!fulcrumAppId) {
      continue;
    }

    const recordResult = await fetchFulcrumRecordsForApp({
      apiToken,
      externalAppId,
      limit: cappedLimit - importedRecordCount,
    });

    if (!recordResult.ok) {
      return {
        category: recordResult.category,
        ok: false,
        selectedAppIds,
      };
    }

    for (const record of recordResult.records) {
      if (importedRecordCount >= cappedLimit) {
        break;
      }

      const existingRecord = await prisma.fulcrumRecord.findUnique({
        select: { id: true },
        where: {
          organisationId_fulcrumConnectionId_externalRecordId: {
            externalRecordId: record.externalRecordId,
            fulcrumConnectionId: connectionId,
            organisationId,
          },
        },
      });

      await prisma.fulcrumRecord.upsert({
        create: {
          capturedAt: record.capturedAt,
          dataHealthFlags: record.dataHealthFlags,
          externalRecordId: record.externalRecordId,
          fulcrumAppId,
          fulcrumConnectionId: connectionId,
          importedAt: now,
          isDemo: false,
          latitude: record.latitude,
          longitude: record.longitude,
          organisationId,
          rawJson: record.rawJson,
          status: record.status,
        },
        update: {
          capturedAt: record.capturedAt,
          dataHealthFlags: record.dataHealthFlags,
          fulcrumAppId,
          importedAt: now,
          isDemo: false,
          latitude: record.latitude,
          longitude: record.longitude,
          rawJson: record.rawJson,
          status: record.status,
        },
        where: {
          organisationId_fulcrumConnectionId_externalRecordId: {
            externalRecordId: record.externalRecordId,
            fulcrumConnectionId: connectionId,
            organisationId,
          },
        },
      });

      importedRecordCount += 1;
      missingGpsCount += record.dataHealthFlags.includes("missing_gps") ? 1 : 0;
      updatedRecordCount += existingRecord ? 1 : 0;
    }
  }

  for (const [externalAppId, fulcrumAppId] of persistedApps) {
    const recordCount = await prisma.fulcrumRecord.count({
      where: {
        externalRecordId: {
          not: null,
        },
        fulcrumAppId,
        fulcrumConnectionId: connectionId,
        organisationId,
      },
    });
    await prisma.fulcrumApp.update({
      data: {
        recordCount,
      },
      where: {
        organisationId_fulcrumConnectionId_externalAppId: {
          externalAppId,
          fulcrumConnectionId: connectionId,
          organisationId,
        },
      },
    });
  }

  return {
    appCount: persistedApps.size,
    importedRecordCount,
    missingGpsCount,
    ok: true,
    selectedAppIds,
    updatedRecordCount,
  };
}

export function parseSelectedFulcrumAppIds(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

export function parseFulcrumImportLimit(value: string | null | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return defaultRecordLimit;
  }

  return Math.min(Math.max(parsed, 1), maxRecordLimit);
}

async function fetchFulcrumApps(apiToken: string) {
  const response = await fetchFulcrumJson(getFulcrumFormsUrl(), apiToken);

  if (!response.ok) {
    return response;
  }

  return {
    apps: getArrayFromPayload(response.payload, "forms")
      .map(mapFulcrumAppPayload)
      .filter((app): app is FulcrumAppPayload => Boolean(app)),
    ok: true as const,
  };
}

async function fetchFulcrumRecordsForApp({
  apiToken,
  externalAppId,
  limit,
}: {
  apiToken: string;
  externalAppId: string;
  limit: number;
}) {
  if (limit <= 0) {
    return {
      ok: true as const,
      records: [],
    };
  }

  const url = new URL(getFulcrumRecordsUrl());
  url.searchParams.set("form_id", externalAppId);
  url.searchParams.set("per_page", String(limit));

  const response = await fetchFulcrumJson(url.toString(), apiToken);

  if (!response.ok) {
    return response;
  }

  return {
    ok: true as const,
    records: getArrayFromPayload(response.payload, "records")
      .map((record) => mapFulcrumRecordPayload(record, externalAppId))
      .filter((record): record is FulcrumRecordPayload => Boolean(record)),
  };
}

async function fetchFulcrumJson(url: string, apiToken: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-ApiToken": apiToken,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        category: mapFulcrumFailureStatus(response.status),
        ok: false as const,
      };
    }

    return {
      ok: true as const,
      payload: await readSafeJson(response),
    };
  } catch {
    return {
      category: "network_error" as const,
      ok: false as const,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function mapFulcrumAppPayload(payload: unknown): FulcrumAppPayload | null {
  const record = getRecord(payload);
  const externalAppId = getString(record?.["id"]);
  const name = getString(record?.["name"]);

  if (!externalAppId || !name) {
    return null;
  }

  return {
    description: getString(record?.["description"]) ?? "Imported Fulcrum form.",
    externalAppId,
    name,
    rawJson: {
      description: getString(record?.["description"]) ?? null,
      externalAppId,
      fieldCount: getArray(record?.["elements"])?.length ?? null,
      name,
      recordCount: getNumber(record?.["record_count"]) ?? 0,
    },
    recordCount: getNumber(record?.["record_count"]) ?? 0,
  };
}

function mapFulcrumRecordPayload(
  payload: unknown,
  externalAppId: string,
): FulcrumRecordPayload | null {
  const record = getRecord(payload);
  const externalRecordId = getString(record?.["id"]);

  if (!externalRecordId) {
    return null;
  }

  const latitude = getNumber(record?.["latitude"]);
  const longitude = getNumber(record?.["longitude"]);
  const capturedAt = getDate(
    record?.["created_at"] ??
      record?.["client_created_at"] ??
      record?.["updated_at"],
  );
  const status = getString(record?.["status"]) ?? "imported";
  const dataHealthFlags: string[] = [];

  if (latitude === null || longitude === null) {
    dataHealthFlags.push("missing_gps");
  }

  return {
    capturedAt,
    dataHealthFlags: dataHealthFlags as Prisma.InputJsonArray,
    externalRecordId,
    latitude,
    longitude,
    rawJson: {
      capturedAt: capturedAt?.toISOString() ?? null,
      externalAppId,
      externalRecordId,
      formValuesPreview: getSafeFormValuesPreview(record?.["form_values"]),
      latitude,
      longitude,
      status,
      updatedAt: getString(record?.["updated_at"]) ?? null,
      version: getNumber(record?.["version"]) ?? null,
    },
    status,
  };
}

function getFulcrumFormsUrl() {
  return (
    process.env["FULCRUM_FORMS_IMPORT_URL"] ??
    `${getFulcrumApiBaseUrl()}/forms.json`
  );
}

function getFulcrumRecordsUrl() {
  return (
    process.env["FULCRUM_RECORDS_IMPORT_URL"] ??
    `${getFulcrumApiBaseUrl()}/records.json`
  );
}

function getFulcrumApiBaseUrl() {
  return (
    process.env["FULCRUM_API_BASE_URL"]?.replace(/\/$/, "") ??
    defaultFulcrumApiBaseUrl
  );
}

function mapFulcrumFailureStatus(
  status: number,
): FulcrumImportFailureCategory {
  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status >= 500) {
    return "upstream_unavailable";
  }

  return "unexpected_response";
}

function getArrayFromPayload(payload: unknown, key: string) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = getRecord(payload);
  const nested = record?.[key];

  return Array.isArray(nested) ? nested : [];
}

function getSafeFormValuesPreview(value: unknown): Prisma.InputJsonObject {
  const formValues = getRecord(value);

  if (!formValues) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(formValues)
      .slice(0, 25)
      .map(([key, item]) => [key, getSafeJsonPreviewValue(item)]),
  );
}

function getSafeJsonPreviewValue(value: unknown): Prisma.InputJsonValue {
  if (
    typeof value === "boolean" || typeof value === "number"
  ) {
    return value;
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value.slice(0, 240);
  }

  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (typeof value === "object") {
    return "[object omitted]";
  }

  return "omitted";
}

async function readSafeJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function getRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getDate(value: unknown) {
  const dateValue = getString(value);

  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  return Number.isNaN(date.getTime()) ? null : date;
}
