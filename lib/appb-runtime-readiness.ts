import {
  organisationHasCapability,
  type OrganisationCapabilityKey,
} from "@/lib/capability-registry";
import type { AppbMappingReviewHistoryCursorReadinessStatus } from "@/lib/appb-mapping-review-history";

export const APPB_RUNTIME_REQUIRED_CAPABILITIES = [
  "reporting",
  "reporting.appb",
  "grants",
  "grants.appb",
] as const satisfies readonly OrganisationCapabilityKey[];

export type AppbRuntimeReadinessTone = "block" | "pass" | "warn";

export type AppbRuntimeReadinessRow = {
  detail: string;
  label: string;
  state: string;
  tone: AppbRuntimeReadinessTone;
};

export type AppbRuntimeReadinessSummary = {
  rows: AppbRuntimeReadinessRow[];
  valueFree: true;
};

export function buildAppbRuntimeReadinessSummary({
  accessMode,
  appbReportCount,
  capabilityKeys,
  cursorConfigurationStatus,
  databaseAvailable,
  databaseConfigured,
  reportDataCheckPerformed,
}: {
  accessMode: "authenticated" | "demo-fallback";
  appbReportCount: number;
  capabilityKeys: readonly OrganisationCapabilityKey[] | undefined;
  cursorConfigurationStatus: AppbMappingReviewHistoryCursorReadinessStatus;
  databaseAvailable: boolean;
  databaseConfigured: boolean;
  reportDataCheckPerformed: boolean;
}): AppbRuntimeReadinessSummary {
  const rows: AppbRuntimeReadinessRow[] = [
    databaseReadinessRow({
      databaseAvailable,
      databaseConfigured,
      reportDataCheckPerformed,
    }),
    accessMode === "authenticated"
      ? {
          detail:
            "The signed-in user has an active membership for the selected organisation.",
          label: "Tenant access",
          state: "Ready",
          tone: "pass",
        }
      : {
          detail:
            "Local demo access is active. Production requires authenticated active membership.",
          label: "Tenant access",
          state: "Warning",
          tone: "warn",
        },
    ...APPB_RUNTIME_REQUIRED_CAPABILITIES.map((capability) =>
      organisationHasCapability(capabilityKeys, capability)
        ? {
            detail: "Enabled for the selected organisation.",
            label: `Capability: ${capability}`,
            state: "Ready",
            tone: "pass" as const,
          }
        : {
            detail:
              "Required capability is not enabled for the selected organisation.",
            label: `Capability: ${capability}`,
            state: "Blocked",
            tone: "block" as const,
          },
    ),
    cursorReadinessRow(cursorConfigurationStatus),
    reportDataReadinessRow({
      appbReportCount,
      databaseAvailable,
      reportDataCheckPerformed,
    }),
    historyReadinessRow({
      cursorConfigurationStatus,
      databaseAvailable,
      reportDataCheckPerformed,
    }),
    {
      detail:
        "Workbook generation and XLSX export are intentionally unavailable.",
      label: "Workbook export",
      state: "Blocked",
      tone: "block",
    },
    {
      detail:
        "Uploaded templates, AI calls, external services, broad audit browsing and capability administration are not part of this foundation.",
      label: "Unsupported areas",
      state: "Unsupported",
      tone: "warn",
    },
  ];

  return { rows, valueFree: true };
}

function databaseReadinessRow({
  databaseAvailable,
  databaseConfigured,
  reportDataCheckPerformed,
}: {
  databaseAvailable: boolean;
  databaseConfigured: boolean;
  reportDataCheckPerformed: boolean;
}): AppbRuntimeReadinessRow {
  if (!databaseConfigured) {
    return {
      detail: "DATABASE_URL is not configured for persisted APP&B data.",
      label: "Database",
      state: "Not configured",
      tone: "block",
    };
  }

  if (!reportDataCheckPerformed) {
    return {
      detail:
        "Database availability was not checked because another required configuration is blocked.",
      label: "Database",
      state: "Warning",
      tone: "warn",
    };
  }

  return databaseAvailable
    ? {
        detail: "The organisation-scoped APP&B read completed successfully.",
        label: "Database",
        state: "Ready",
        tone: "pass",
      }
    : {
        detail:
          "ROPES could not confirm the organisation-scoped APP&B read.",
        label: "Database",
        state: "Blocked",
        tone: "block",
      };
}

function cursorReadinessRow(
  status: AppbMappingReviewHistoryCursorReadinessStatus,
): AppbRuntimeReadinessRow {
  switch (status) {
    case "configured-production":
      return {
        detail:
          "A stable server-side signing secret is configured for this production runtime.",
        label: "History cursor signing",
        state: "Configured for production",
        tone: "pass",
      };
    case "configured-non-production":
      return {
        detail: "A server-side signing secret is configured for this runtime.",
        label: "History cursor signing",
        state: "Ready",
        tone: "pass",
      };
    case "development-fallback":
      return {
        detail:
          "A process-local fallback is active and must not be used for production deployment.",
        label: "History cursor signing",
        state: "Development fallback active",
        tone: "warn",
      };
    case "invalid-non-production":
      return {
        detail:
          "The configured development secret is invalid; remove it to use the local fallback or replace it.",
        label: "History cursor signing",
        state: "Not configured",
        tone: "block",
      };
    case "invalid-production":
      return {
        detail:
          "Production APP&B data loading is disabled until the server-side cursor configuration is corrected.",
        label: "History cursor signing",
        state: "Missing or invalid production configuration",
        tone: "block",
      };
  }
}

function reportDataReadinessRow({
  appbReportCount,
  databaseAvailable,
  reportDataCheckPerformed,
}: {
  appbReportCount: number;
  databaseAvailable: boolean;
  reportDataCheckPerformed: boolean;
}): AppbRuntimeReadinessRow {
  if (!reportDataCheckPerformed || !databaseAvailable) {
    return {
      detail: "Report presence could not be confirmed without a safe database read.",
      label: "APP&B report data",
      state: "Warning",
      tone: "warn",
    };
  }

  return appbReportCount > 0
    ? {
        detail: `${appbReportCount} organisation-scoped APP&B report${appbReportCount === 1 ? " is" : "s are"} available.`,
        label: "APP&B report data",
        state: "Ready",
        tone: "pass",
      }
    : {
        detail: "No APP&B report records are available for this organisation yet.",
        label: "APP&B report data",
        state: "Warning",
        tone: "warn",
      };
}

function historyReadinessRow({
  cursorConfigurationStatus,
  databaseAvailable,
  reportDataCheckPerformed,
}: {
  cursorConfigurationStatus: AppbMappingReviewHistoryCursorReadinessStatus;
  databaseAvailable: boolean;
  reportDataCheckPerformed: boolean;
}): AppbRuntimeReadinessRow {
  const cursorBlocked =
    cursorConfigurationStatus === "invalid-production" ||
    cursorConfigurationStatus === "invalid-non-production";

  if (cursorBlocked || !databaseAvailable || !reportDataCheckPerformed) {
    return {
      detail:
        "Value-free review history is supported, but runtime access is not currently ready.",
      label: "Value-free history",
      state: "Warning",
      tone: "warn",
    };
  }

  return {
    detail:
      "Bounded history and per-target load-more expose metadata only, with rejected-note counts kept separate.",
    label: "Value-free history",
    state: "Ready",
    tone: "pass",
  };
}
