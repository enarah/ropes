"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  AppbManualFieldStatus,
  AppbMappingReviewDecision,
  AppbMappingReviewStatus,
  AppbMappingReviewTargetKind,
  Prisma,
} from "@prisma/client";
import { getTenantGuardSessionForRequest } from "@/lib/auth-session";
import { recordAuditLog } from "@/lib/audit-logs";
import {
  buildAppbManualFieldDefinitions,
  findAppbTemplateVersion,
  type AppbManualFieldDefinition,
} from "@/lib/appb-readiness";
import {
  buildAppbMappingReviews,
  type AppbMappingReview,
  type AppbMappingReviewDecision as AppbMappingReviewDecisionValue,
  type AppbMappingReviewTargetKind as AppbMappingReviewTargetKindValue,
} from "@/lib/appb-reporting";
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

type AppbReviewNoteUnsafePattern =
  | "too-long"
  | "copied-text"
  | "currency-or-financial-value"
  | "phone-number"
  | "email-address"
  | "secret-or-token"
  | "private-url"
  | "medical-personnel-or-wage-term"
  | "workbook-cell-or-formula"
  | "likely-person-name";

type AppbReviewNoteValidationResult =
  | {
      isSafe: true;
      noteLength: number;
    }
  | {
      isSafe: false;
      noteLength: number;
      reasonCode: AppbReviewNoteUnsafePattern;
    };

const mappingReviewDecisionValues = [
  "keep-needs-review",
  "mark-reviewed",
  "mark-blocked-formula",
  "mark-blocked-hidden-sheet",
  "mark-blocked-unsupported",
  "mark-unmapped",
  "mark-ready-for-future-export",
] as const;

const mappingReviewTargetKindValues = [
  "field-mapping",
  "repeatable-range",
] as const;

const appbReviewNoteSafetyPolicy = {
  maxLength: 240,
  unsafePatterns: [
    {
      code: "email-address",
      pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    },
    {
      code: "phone-number",
      pattern: /(?:\+?\d[\d\s().-]{7,}\d)/,
    },
    {
      code: "currency-or-financial-value",
      pattern:
        /(?:[$€£]\s?\d|\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|\b\d+\.\d{2}\s?(?:aud|dollars?)?\b)/i,
    },
    {
      code: "secret-or-token",
      pattern:
        /\b(?:api[_ -]?key|token|secret|password|bearer|client[_ -]?secret)\b|sk-[A-Za-z0-9_-]{10,}|[A-Za-z0-9_-]{32,}/i,
    },
    {
      code: "private-url",
      pattern: /\b(?:https?:\/\/|www\.)\S+/i,
    },
    {
      code: "medical-personnel-or-wage-term",
      pattern:
        /\b(?:medical|allerg(?:y|ies)|diagnosis|medicare|wage|salary|payroll|employee|personnel|human resources|date of birth|dob)\b/i,
    },
    {
      code: "workbook-cell-or-formula",
      pattern: /(?:\b[A-Z]{1,3}\d{1,5}(?::[A-Z]{1,3}\d{1,5})?\b|=[A-Z])/,
    },
    {
      code: "likely-person-name",
      pattern:
        /\b(?:staff|employee|ranger|person|worker|participant)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/,
    },
  ] satisfies Array<{
    code: AppbReviewNoteUnsafePattern;
    pattern: RegExp;
  }>,
};

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

class AppbMappingReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppbMappingReviewValidationError";
  }
}

class AppbReviewNoteSafetyError extends Error {
  constructor() {
    super("Review note did not pass safety validation.");
    this.name = "AppbReviewNoteSafetyError";
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
        mappingReviews: [],
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

export async function saveAppbMappingReviewDecisionAction(formData: FormData) {
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
              funder: true,
              fundingAgreementNumber: true,
              fundingPeriodEnd: true,
              fundingPeriodStart: true,
              id: true,
              organisationId: true,
              programType: true,
              project: { select: { code: true, name: true } },
              rangerProgram: { select: { name: true } },
              status: true,
              title: true,
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
      throw new AppbMappingReviewValidationError("APP&B report was not found.");
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

    const templateVersionId = getRequiredString(formData, "templateVersionId");
    const targetKind = getAllowedMappingReviewTargetKind(formData);
    const targetId = getRequiredString(formData, "targetId");
    const decisionValue = getAllowedMappingReviewDecision(formData);
    const safeNote = getOptionalString(formData, "safeNote");
    const templateVersion = findAppbTemplateVersion(
      reportOverviewForTemplate(appbReport),
      periodOverviewForTemplate(appbReport.reportingPeriod),
    );

    if (!templateVersion || templateVersion.id !== templateVersionId) {
      throw new AppbMappingReviewValidationError(
        "Mapping review template version does not match this APP&B report.",
      );
    }

    const reviewTarget = buildAppbMappingReviews(templateVersion).find(
      (review) =>
        review.targetKind === targetKind && review.targetId === targetId,
    );

    if (!reviewTarget) {
      throw new AppbMappingReviewValidationError(
        "Mapping review target is not available for this APP&B report template.",
      );
    }

    validateConservativeMappingReviewDecision(reviewTarget, decisionValue);

    const noteValidation = validateAppbReviewNoteSafety(safeNote);

    if (!noteValidation.isSafe) {
      await recordAuditLog(prisma, {
        action: "REJECTED",
        actorUserId: context.actorUserId,
        entityId: appbReport.id,
        entityType: "AppbMappingReviewDecisionRecord",
        metadata: {
          appbReportId: appbReport.id,
          decision: decisionValue,
          event: "appb_mapping_review_note_rejected",
          noteLength: noteValidation.noteLength,
          rejectionReasonCode: noteValidation.reasonCode,
          targetId,
          targetKind,
          templateVersionId,
          valueFree: true,
        },
        organisationId: context.organisationId,
        summary: "Rejected APP&B mapping review note safety validation.",
      });

      throw new AppbReviewNoteSafetyError();
    }

    const decision = prismaMappingReviewDecision(decisionValue);
    const reviewStatus = prismaMappingReviewStatusForDecision(decisionValue);
    const prismaTargetKind = prismaMappingReviewTargetKind(targetKind);
    const reviewer = await prisma.user.findUnique({
      select: {
        name: true,
      },
      where: {
        id: context.actorUserId,
      },
    });
    const reviewedAt = new Date();
    const auditMetadata = {
      appbReportId: appbReport.id,
      decision: decisionValue,
      event: "appb_mapping_review_decision_saved",
      reviewStatus: mappingReviewStatusForDecision(decisionValue),
      safeNoteLength: safeNote?.length ?? 0,
      targetId,
      targetKind,
      templateVersionId,
      valueFree: true,
    };
    const existing = await prisma.appbMappingReviewDecisionRecord.findUnique({
      select: { id: true },
      where: {
        organisationId_appbReportId_targetKind_targetId: {
          appbReportId: appbReport.id,
          organisationId: context.organisationId,
          targetId,
          targetKind: prismaTargetKind,
        },
      },
    });
    const reviewDecision =
      await prisma.appbMappingReviewDecisionRecord.upsert({
        create: {
          appbReportId: appbReport.id,
          auditMetadataJson: auditMetadata,
          decision,
          grantId: appbReport.grantId,
          organisationId: context.organisationId,
          reportingPeriodId: appbReport.reportingPeriodId,
          reviewedAt,
          reviewerDisplayName: reviewer?.name ?? "Unknown reviewer",
          reviewerUserId: context.actorUserId,
          reviewStatus,
          safeNote,
          targetId,
          targetKind: prismaTargetKind,
          templateVersionId,
        },
        update: {
          auditMetadataJson: auditMetadata,
          decision,
          reviewedAt,
          reviewerDisplayName: reviewer?.name ?? "Unknown reviewer",
          reviewerUserId: context.actorUserId,
          reviewStatus,
          safeNote,
          templateVersionId,
        },
        where: {
          organisationId_appbReportId_targetKind_targetId: {
            appbReportId: appbReport.id,
            organisationId: context.organisationId,
            targetId,
            targetKind: prismaTargetKind,
          },
        },
      });

    await recordAuditLog(prisma, {
      action: existing ? "UPDATED" : "CREATED",
      actorUserId: context.actorUserId,
      entityId: reviewDecision.id,
      entityType: "AppbMappingReviewDecisionRecord",
      metadata: {
        ...auditMetadata,
        actionType: existing ? "updated" : "created",
      },
      organisationId: context.organisationId,
      summary: existing
        ? "Updated APP&B mapping review decision metadata."
        : "Created APP&B mapping review decision metadata.",
    });

    revalidatePath("/reports/appb");
    redirectTo = `/reports/appb?org=${organisation.slug}&saved=mapping-review`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error)
        ? "tenant"
        : isOrganisationCapabilityError(error)
          ? "capability"
          : error instanceof AppbReviewNoteSafetyError
            ? "note-safety"
          : error instanceof AppbMappingReviewValidationError ||
              error instanceof AppbManualFieldValidationError
            ? "validation"
            : "persistence"
    }`;
  }

  redirect(redirectTo);
}

function getAllowedMappingReviewTargetKind(
  formData: FormData,
): AppbMappingReviewTargetKindValue {
  const value = getRequiredString(formData, "targetKind");

  if (
    !mappingReviewTargetKindValues.includes(
      value as AppbMappingReviewTargetKindValue,
    )
  ) {
    throw new AppbMappingReviewValidationError(
      "Mapping review target type is invalid.",
    );
  }

  return value as AppbMappingReviewTargetKindValue;
}

function getAllowedMappingReviewDecision(
  formData: FormData,
): AppbMappingReviewDecisionValue {
  const value = getRequiredString(formData, "decision");

  if (
    !mappingReviewDecisionValues.includes(
      value as AppbMappingReviewDecisionValue,
    )
  ) {
    throw new AppbMappingReviewValidationError(
      "Mapping review decision is invalid.",
    );
  }

  return value as AppbMappingReviewDecisionValue;
}

function validateConservativeMappingReviewDecision(
  reviewTarget: AppbMappingReview,
  decision: AppbMappingReviewDecisionValue,
) {
  const blockedDecisionByStatus: Partial<
    Record<AppbMappingReview["status"], AppbMappingReviewDecisionValue>
  > = {
    "blocked-formula": "mark-blocked-formula",
    "blocked-hidden-sheet": "mark-blocked-hidden-sheet",
    "blocked-unsupported": "mark-blocked-unsupported",
  };
  const requiredDecision = blockedDecisionByStatus[reviewTarget.status];

  if (requiredDecision && decision !== requiredDecision) {
    throw new AppbMappingReviewValidationError(
      "Blocked workbook targets must keep their matching blocked review decision.",
    );
  }
}

function validateAppbReviewNoteSafety(
  note: string | null,
): AppbReviewNoteValidationResult {
  if (!note) {
    return {
      isSafe: true,
      noteLength: 0,
    };
  }

  if (note.length > appbReviewNoteSafetyPolicy.maxLength) {
    return {
      isSafe: false,
      noteLength: note.length,
      reasonCode: "too-long",
    };
  }

  if (looksLikeCopiedText(note)) {
    return {
      isSafe: false,
      noteLength: note.length,
      reasonCode: "copied-text",
    };
  }

  for (const unsafePattern of appbReviewNoteSafetyPolicy.unsafePatterns) {
    if (unsafePattern.pattern.test(note)) {
      return {
        isSafe: false,
        noteLength: note.length,
        reasonCode: unsafePattern.code,
      };
    }
  }

  return {
    isSafe: true,
    noteLength: note.length,
  };
}

function looksLikeCopiedText(note: string) {
  const sentenceBreaks = note.match(/[.!?]\s+/g)?.length ?? 0;
  const commaBreaks = note.match(/,/g)?.length ?? 0;

  return note.includes("\n") || (note.length > 160 && sentenceBreaks + commaBreaks > 2);
}

function prismaMappingReviewTargetKind(
  targetKind: AppbMappingReviewTargetKindValue,
): AppbMappingReviewTargetKind {
  return targetKind === "repeatable-range"
    ? "REPEATABLE_RANGE"
    : "FIELD_MAPPING";
}

function prismaMappingReviewDecision(
  decision: AppbMappingReviewDecisionValue,
): AppbMappingReviewDecision {
  switch (decision) {
    case "mark-reviewed":
      return "MARK_REVIEWED";
    case "mark-blocked-formula":
      return "MARK_BLOCKED_FORMULA";
    case "mark-blocked-hidden-sheet":
      return "MARK_BLOCKED_HIDDEN_SHEET";
    case "mark-blocked-unsupported":
      return "MARK_BLOCKED_UNSUPPORTED";
    case "mark-unmapped":
      return "MARK_UNMAPPED";
    case "mark-ready-for-future-export":
      return "MARK_READY_FOR_FUTURE_EXPORT";
    case "keep-needs-review":
      return "KEEP_NEEDS_REVIEW";
  }
}

function prismaMappingReviewStatusForDecision(
  decision: AppbMappingReviewDecisionValue,
): AppbMappingReviewStatus {
  switch (decision) {
    case "mark-reviewed":
      return "REVIEWED";
    case "mark-blocked-formula":
      return "BLOCKED_FORMULA";
    case "mark-blocked-hidden-sheet":
      return "BLOCKED_HIDDEN_SHEET";
    case "mark-blocked-unsupported":
      return "BLOCKED_UNSUPPORTED";
    case "mark-unmapped":
      return "UNMAPPED";
    case "mark-ready-for-future-export":
      return "READY_FOR_FUTURE_EXPORT";
    case "keep-needs-review":
      return "NEEDS_REVIEW";
  }
}

function mappingReviewStatusForDecision(
  decision: AppbMappingReviewDecisionValue,
) {
  switch (decision) {
    case "mark-reviewed":
      return "reviewed";
    case "mark-blocked-formula":
      return "blocked-formula";
    case "mark-blocked-hidden-sheet":
      return "blocked-hidden-sheet";
    case "mark-blocked-unsupported":
      return "blocked-unsupported";
    case "mark-unmapped":
      return "unmapped";
    case "mark-ready-for-future-export":
      return "ready-for-future-export";
    case "keep-needs-review":
      return "needs-review";
  }
}

function reportOverviewForTemplate(appbReport: {
  id: string;
  status: string;
  templateProfileId: string;
  templateVersionLabel: string;
}) {
  return {
    id: appbReport.id,
    mappingReviews: [],
    manualFields: [],
    status: formatEnumLabel(appbReport.status),
    templateProfileId: appbReport.templateProfileId,
    templateVersionLabel: appbReport.templateVersionLabel,
  };
}

function periodOverviewForTemplate(period: {
  cycle: string;
  dueOn: Date | null;
  endsOn: Date;
  id: string;
  label: string;
  startsOn: Date;
  status: string;
}) {
  return {
    appbReports: [],
    cycle: formatEnumLabel(period.cycle),
    dateRange: formatDateRange(period.startsOn, period.endsOn),
    dueOn: period.dueOn ? formatShortDate(period.dueOn) : undefined,
    id: period.id,
    label: period.label,
    status: formatEnumLabel(period.status),
  };
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
