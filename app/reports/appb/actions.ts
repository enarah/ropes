"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AppbManualFieldStatus, Prisma } from "@prisma/client";
import { getTenantGuardSessionForRequest } from "@/lib/auth-session";
import { recordAuditLog } from "@/lib/audit-logs";
import {
  buildAppbManualFieldDefinitions,
  type AppbManualFieldDefinition,
} from "@/lib/appb-readiness";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import {
  isOrganisationCapabilityError,
  requireOrganisationCapability,
} from "@/lib/organisation-capabilities";
import {
  createOrganisationWriteContext,
  isTenantGuardError,
} from "@/lib/tenant-guards";

const manualFieldStatusValues = [
  "BLANK",
  "DRAFT",
  "ENTERED",
  "NEEDS_REVIEW",
  "REVIEWED",
  "NOT_APPLICABLE",
] as const;

const manualFieldClearModeValues = [
  "PRESERVE_EXISTING",
  "REPLACE_VALUE",
  "CLEAR_VALUE",
  "CLEAR_NOTE",
  "CLEAR_VALUE_AND_NOTE",
  "MARK_BLANK",
  "MARK_NOT_APPLICABLE",
] as const;

type AppbManualFieldClearMode = (typeof manualFieldClearModeValues)[number];

type ExistingManualFieldValue = {
  notes: string | null;
  valueDate: Date | null;
  valueNumber: Prisma.Decimal | null;
  valueText: string | null;
} | null;

type ManualFieldValueData = {
  notes: string | null;
  valueDate: Date | null;
  valueNumber: Prisma.Decimal | null;
  valueText: string | null;
};

class AppbManualFieldValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppbManualFieldValidationError";
  }
}

export async function upsertAppbManualFieldValueAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const appbReportId = getRequiredString(formData, "appbReportId");
  const fallbackPath = `/reports/appb?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const [organisation, appbReport] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { slug: organisationSlug },
      }),
      prisma.appbReport.findUnique({
        include: {
          grant: {
            select: {
              id: true,
              organisationId: true,
              project: { select: { code: true, name: true } },
              rangerProgram: { select: { name: true } },
              status: true,
              title: true,
              funder: true,
              fundingAgreementNumber: true,
              fundingPeriodStart: true,
              fundingPeriodEnd: true,
              programType: true,
            },
          },
          reportingPeriod: {
            select: {
              cycle: true,
              dueOn: true,
              endsOn: true,
              id: true,
              label: true,
              organisationId: true,
              startsOn: true,
              status: true,
            },
          },
        },
        where: { id: appbReportId },
      }),
    ]);

    if (!organisation || !appbReport) {
      throw new AppbManualFieldValidationError("APP&B report was not found.");
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [
        { label: "APP&B report", record: appbReport },
        { label: "Grant", record: appbReport.grant },
        { label: "Reporting period", record: appbReport.reportingPeriod },
      ],
      session,
    });

    for (const capability of [
      "reporting",
      "reporting.appb",
      "grants",
      "grants.appb",
    ] as const) {
      await requireOrganisationCapability(
        prisma,
        context.organisationId,
        capability,
        {
          actorUserId: context.actorUserId,
          entityId: appbReport.id,
          entityType: "AppbReport",
        },
      );
    }

    const fieldId = getRequiredString(formData, "fieldId");
    const definitions = buildAppbManualFieldDefinitions(
      {
        id: appbReport.id,
        manualFields: [],
        status: formatEnumLabel(appbReport.status),
        templateProfileId: appbReport.templateProfileId,
        templateVersionLabel: appbReport.templateVersionLabel,
      },
      {
        appbReports: [],
        cycle: formatEnumLabel(appbReport.reportingPeriod.cycle),
        dateRange: formatDateRange(
          appbReport.reportingPeriod.startsOn,
          appbReport.reportingPeriod.endsOn,
        ),
        dueOn: appbReport.reportingPeriod.dueOn
          ? formatShortDate(appbReport.reportingPeriod.dueOn)
          : undefined,
        id: appbReport.reportingPeriod.id,
        label: appbReport.reportingPeriod.label,
        status: formatEnumLabel(appbReport.reportingPeriod.status),
      },
    );
    const definition = definitions.find((field) => field.fieldId === fieldId);

    if (!definition) {
      throw new AppbManualFieldValidationError(
        "Manual field is not available for this APP&B report template.",
      );
    }

    const requestedStatus = getAllowedStatus(formData);
    const clearMode = getAllowedClearMode(formData);
    const status = statusForClearMode(requestedStatus, clearMode);
    const existing = await prisma.appbManualFieldValue.findUnique({
      select: {
        id: true,
        notes: true,
        valueDate: true,
        valueNumber: true,
        valueText: true,
      },
      where: {
        organisationId_appbReportId_fieldId: {
          appbReportId: appbReport.id,
          fieldId: definition.fieldId,
          organisationId: context.organisationId,
        },
      },
    });
    const valueData = getManualValueData(
      formData,
      definition,
      status,
      existing,
      clearMode,
    );
    const manualFieldValue = await prisma.appbManualFieldValue.upsert({
      create: {
        ...valueData,
        appbReportId: appbReport.id,
        createdByUserId: context.actorUserId,
        fieldGroup: definition.fieldGroup,
        fieldId: definition.fieldId,
        fieldLabel: definition.fieldLabel,
        fieldType: definition.fieldType,
        grantId: appbReport.grantId,
        isDemo: false,
        organisationId: context.organisationId,
        reportingPeriodId: appbReport.reportingPeriodId,
        sensitivity: definition.sensitivity,
        status,
        updatedByUserId: context.actorUserId,
      },
      update: {
        ...valueData,
        fieldGroup: definition.fieldGroup,
        fieldLabel: definition.fieldLabel,
        fieldType: definition.fieldType,
        sensitivity: definition.sensitivity,
        status,
        updatedByUserId: context.actorUserId,
      },
      where: {
        organisationId_appbReportId_fieldId: {
          appbReportId: appbReport.id,
          fieldId: definition.fieldId,
          organisationId: context.organisationId,
        },
      },
    });

    await recordAuditLog(prisma, {
      action: existing ? "UPDATED" : "CREATED",
      actorUserId: context.actorUserId,
      entityId: manualFieldValue.id,
      entityType: "AppbManualFieldValue",
      metadata: {
        actionType: existing ? "updated" : "created",
        appbReportId: appbReport.id,
        event: "appb_manual_field_value_upserted",
        clearMode,
        fieldGroup: definition.fieldGroup,
        fieldId: definition.fieldId,
        sensitivity: definition.sensitivity,
        status,
      },
      organisationId: context.organisationId,
      summary: existing
        ? "Updated APP&B manual report-only field metadata."
        : "Created APP&B manual report-only field metadata.",
    });

    revalidatePath("/reports/appb");
    redirectTo = `/reports/appb?org=${organisation.slug}&saved=manual-field`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error)
        ? "tenant"
        : isOrganisationCapabilityError(error)
          ? "capability"
          : error instanceof AppbManualFieldValidationError
            ? "validation"
            : "persistence"
    }`;
  }

  redirect(redirectTo);
}

function getManualValueData(
  formData: FormData,
  definition: AppbManualFieldDefinition,
  status: AppbManualFieldStatus,
  existing: ExistingManualFieldValue,
  clearMode: AppbManualFieldClearMode,
): ManualFieldValueData {
  if (status === "BLANK" || clearMode === "MARK_BLANK") {
    return {
      notes: null,
      valueDate: null,
      valueNumber: null,
      valueText: null,
    };
  }

  if (clearMode === "CLEAR_VALUE_AND_NOTE") {
    return {
      notes: null,
      valueDate: null,
      valueNumber: null,
      valueText: null,
    };
  }

  const submittedValue = getSubmittedValueData(formData, definition);
  const preservedValue = getPreservedValueData(existing);
  const submittedNotes = getOptionalLimitedString(formData, "notes", 300);
  const notes =
    clearMode === "CLEAR_NOTE"
      ? null
      : (submittedNotes ?? existing?.notes ?? null);

  if (status === "NOT_APPLICABLE" || clearMode === "MARK_NOT_APPLICABLE") {
    return {
      notes,
      valueDate: null,
      valueNumber: null,
      valueText: null,
    };
  }

  if (clearMode === "CLEAR_VALUE") {
    return {
      notes,
      valueDate: null,
      valueNumber: null,
      valueText: null,
    };
  }

  if (clearMode === "CLEAR_NOTE") {
    return {
      notes,
      ...preservedValue,
    };
  }

  if (clearMode === "REPLACE_VALUE") {
    return {
      notes,
      ...submittedValue,
    };
  }

  return {
    notes,
    valueDate: submittedValue.valueDate ?? preservedValue.valueDate,
    valueNumber: submittedValue.valueNumber ?? preservedValue.valueNumber,
    valueText: submittedValue.valueText ?? preservedValue.valueText,
  };
}

function getSubmittedValueData(
  formData: FormData,
  definition: AppbManualFieldDefinition,
): Omit<ManualFieldValueData, "notes"> {
  if (definition.fieldType === "NUMBER" || definition.fieldType === "CURRENCY") {
    return {
      valueDate: null,
      valueNumber: getOptionalDecimal(formData, "valueNumber"),
      valueText: null,
    };
  }

  if (definition.fieldType === "DATE") {
    return {
      valueDate: getOptionalDate(formData, "valueDate"),
      valueNumber: null,
      valueText: null,
    };
  }

  if (definition.fieldType === "ROW_GROUP_PLACEHOLDER") {
    return {
      valueDate: null,
      valueNumber: null,
      valueText: null,
    };
  }

  return {
    valueDate: null,
    valueNumber: null,
    valueText: getOptionalLimitedString(formData, "valueText", 500),
  };
}

function getPreservedValueData(
  existing: ExistingManualFieldValue,
): Omit<ManualFieldValueData, "notes"> {
  return {
    valueDate: existing?.valueDate ?? null,
    valueNumber: existing?.valueNumber ?? null,
    valueText: existing?.valueText ?? null,
  };
}

function statusForClearMode(
  status: AppbManualFieldStatus,
  clearMode: AppbManualFieldClearMode,
): AppbManualFieldStatus {
  if (clearMode === "MARK_BLANK") {
    return "BLANK";
  }

  if (clearMode === "MARK_NOT_APPLICABLE") {
    return "NOT_APPLICABLE";
  }

  return status;
}

function getAllowedStatus(formData: FormData): AppbManualFieldStatus {
  const value = getRequiredString(formData, "status").toUpperCase();

  if (!manualFieldStatusValues.includes(value as AppbManualFieldStatus)) {
    throw new AppbManualFieldValidationError("Manual field status is invalid.");
  }

  return value as AppbManualFieldStatus;
}

function getAllowedClearMode(formData: FormData): AppbManualFieldClearMode {
  const value =
    getOptionalString(formData, "clearMode")?.toUpperCase() ??
    "PRESERVE_EXISTING";

  if (!manualFieldClearModeValues.includes(value as AppbManualFieldClearMode)) {
    throw new AppbManualFieldValidationError(
      "Manual field clear action is invalid.",
    );
  }

  return value as AppbManualFieldClearMode;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new AppbManualFieldValidationError("Manual field date is invalid.");
  }

  return date;
}

function getOptionalDecimal(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new AppbManualFieldValidationError("Manual field number is invalid.");
  }

  return number as unknown as Prisma.Decimal;
}

function getOptionalLimitedString(formData: FormData, key: string, max: number) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (value.length > max) {
    throw new AppbManualFieldValidationError(
      `Manual field ${key} must be ${max} characters or fewer.`,
    );
  }

  return value;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new AppbManualFieldValidationError(`Manual field ${key} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateRange(start: Date, end: Date) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}
