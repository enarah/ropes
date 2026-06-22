"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantGuardSessionForRequest } from "@/lib/auth-session";
import { recordAuditLog } from "@/lib/audit-logs";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import {
  isOrganisationCapabilityError,
  requireOrganisationCapability,
} from "@/lib/organisation-capabilities";
import {
  createOrganisationWriteContext,
  isTenantGuardError,
} from "@/lib/tenant-guards";
import {
  calculateTripRiskLevels,
  isActivityRiskCode,
  isTripTypeCode,
  type ActivityRiskCode,
  type TripRiskAssessmentItineraryRow,
} from "@/lib/trip-risk-assessment";

class TripRiskAssessmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripRiskAssessmentValidationError";
  }
}

export async function saveTripRiskAssessmentAction(formData: FormData) {
  const organisationSlug = getRequiredString(formData, "organisationSlug");
  const tripId = getRequiredString(formData, "tripId");
  const fallbackPath = `/trips/${tripId}/risk-assessment?org=${organisationSlug}`;

  if (!isDatabaseConfigured()) {
    redirect(`${fallbackPath}&saved=demo`);
  }

  let redirectTo = `${fallbackPath}&error=persistence`;

  try {
    const prisma = getPrismaClient();
    const organisationId = getRequiredString(formData, "organisationId");
    const [organisation, trip, existingAssessment] = await Promise.all([
      prisma.organisation.findUnique({
        select: { id: true, slug: true },
        where: { id: organisationId },
      }),
      prisma.trip.findUnique({
        select: { id: true, organisationId: true },
        where: { id: tripId },
      }),
      prisma.tripRiskAssessment.findUnique({
        select: { id: true, organisationId: true, tripId: true },
        where: { tripId },
      }),
    ]);

    if (!organisation || !trip) {
      throw new Error("Organisation or trip was not found.");
    }

    const session = await getTenantGuardSessionForRequest(prisma);
    const context = createOrganisationWriteContext({
      organisationId: organisation.id,
      relatedRecords: [
        { label: "Trip", record: trip },
        {
          label: "Trip risk assessment",
          record: existingAssessment,
          required: false,
        },
      ],
      session,
    });

    await requireOrganisationCapability(
      prisma,
      context.organisationId,
      "trips.riskAssessment",
      {
        actorUserId: context.actorUserId,
        entityId: trip.id,
        entityType: "Trip",
      },
    );

    const assessmentData = getAssessmentData(formData);
    const isUpdate = Boolean(existingAssessment);

    const assessment = await prisma.tripRiskAssessment.upsert({
      create: {
        ...assessmentData,
        createdByUserId: context.actorUserId,
        isDemo: false,
        organisationId: context.organisationId,
        tripId: trip.id,
        updatedByUserId: context.actorUserId,
      },
      update: {
        ...assessmentData,
        updatedByUserId: context.actorUserId,
      },
      where: {
        tripId: trip.id,
      },
    });

    await recordAuditLog(prisma, {
      action: isUpdate ? "UPDATED" : "CREATED",
      actorUserId: context.actorUserId,
      entityId: assessment.id,
      entityType: "TripRiskAssessment",
      metadata: {
        activityRiskCodes: assessment.activityRiskCodes,
        baseRiskLevel: assessment.baseRiskLevel,
        emergencyContactsLength: assessment.emergencyContacts?.length ?? 0,
        event: isUpdate
          ? "trip_risk_assessment_updated"
          : "trip_risk_assessment_created",
        finalRiskLevel: assessment.finalRiskLevel,
        itineraryRowCount: Array.isArray(assessmentData.dailyItinerary)
          ? assessmentData.dailyItinerary.length
          : 0,
        medicalAllergyNotesLength:
          assessment.medicalAllergyNotes?.length ?? 0,
        readyForManagerReview: assessment.readyForManagerReview,
        tripId: trip.id,
        tripSpecificControlsLength:
          assessment.tripSpecificControls?.length ?? 0,
        tripTypeCode: assessment.tripTypeCode,
      },
      organisationId: context.organisationId,
      summary: isUpdate
        ? "Updated persisted trip risk assessment and journey plan."
        : "Created persisted trip risk assessment and journey plan.",
    });

    revalidatePath("/trips");
    revalidatePath(`/trips/${trip.id}`);
    revalidatePath(`/trips/${trip.id}/risk-assessment`);
    redirectTo = `/trips/${trip.id}/risk-assessment?org=${organisation.slug}&saved=assessment`;
  } catch (error) {
    redirectTo = `${fallbackPath}&error=${
      isTenantGuardError(error)
        ? "tenant"
        : isOrganisationCapabilityError(error)
          ? "capability"
          : isTripRiskAssessmentValidationError(error)
            ? "validation"
            : "persistence"
    }`;
  }

  redirect(redirectTo);
}

function getAssessmentData(formData: FormData) {
  const tripTypeCode = getTripTypeCode(formData);
  const activityRiskCodes = getActivityRiskCodes(formData);
  const riskLevels = getRiskLevels(tripTypeCode, activityRiskCodes);

  return {
    activityRiskCodes,
    baseRiskLevel: riskLevels.baseRiskLevel,
    dailyItinerary: getDailyItinerary(formData),
    defibDetails: getOptionalLimitedString(formData, "defibDetails", 240),
    dpfDetails: getOptionalLimitedString(formData, "dpfDetails", 240),
    emergencyContacts: getOptionalLimitedString(
      formData,
      "emergencyContacts",
      500,
    ),
    epirbDetails: getOptionalLimitedString(formData, "epirbDetails", 240),
    escalationNotes: getOptionalLimitedString(formData, "escalationNotes", 500),
    finalRiskLevel: riskLevels.finalRiskLevel,
    firstAidDetails: getOptionalLimitedString(formData, "firstAidDetails", 240),
    leadDrivers: getOptionalLimitedString(formData, "leadDrivers", 240),
    medicalAllergyNotes: getOptionalLimitedString(
      formData,
      "medicalAllergyNotes",
      500,
    ),
    mobilePhone: getOptionalLimitedString(formData, "mobilePhone", 240),
    otherEquipment: getOptionalLimitedString(formData, "otherEquipment", 300),
    partners: getOptionalLimitedString(formData, "partners", 300),
    rangers: getOptionalLimitedString(formData, "rangers", 300),
    readyForManagerReview:
      formData.get("readyForManagerReview") === "ready",
    relevantContacts: getOptionalLimitedString(
      formData,
      "relevantContacts",
      500,
    ),
    satellitePhone: getOptionalLimitedString(formData, "satellitePhone", 240),
    spotGarminDetails: getOptionalLimitedString(
      formData,
      "spotGarminDetails",
      240,
    ),
    tripSpecificControls: getOptionalLimitedString(
      formData,
      "tripSpecificControls",
      700,
    ),
    tripTypeCode,
  };
}

function getTripTypeCode(formData: FormData) {
  const value = getRequiredString(formData, "tripTypeCode");

  if (!isTripTypeCode(value)) {
    throw new TripRiskAssessmentValidationError(
      "Trip type is not supported.",
    );
  }

  return value;
}

function getActivityRiskCodes(formData: FormData) {
  const values = formData
    .getAll("activityRiskCodes")
    .filter((value): value is string => typeof value === "string");
  const uniqueValues = [...new Set(values)];

  if (!uniqueValues.every(isActivityRiskCode)) {
    throw new TripRiskAssessmentValidationError(
      "Activity risk code is not supported.",
    );
  }

  return uniqueValues as ActivityRiskCode[];
}

function getRiskLevels(
  tripTypeCode: string,
  activityRiskCodes: ActivityRiskCode[],
) {
  try {
    return calculateTripRiskLevels(tripTypeCode, activityRiskCodes);
  } catch {
    throw new TripRiskAssessmentValidationError(
      "Risk level could not be calculated.",
    );
  }
}

function getDailyItinerary(formData: FormData) {
  const rowCount = getOptionalInteger(formData, "dailyItineraryRowCount", {
    max: 12,
    min: 0,
  });
  const rows: TripRiskAssessmentItineraryRow[] = [];

  for (let index = 0; index < (rowCount ?? 0); index += 1) {
    const day = getOptionalLimitedString(formData, `dailyDay-${index}`, 80);

    if (!day) {
      continue;
    }

    rows.push({
      amSchedule:
        getOptionalLimitedString(formData, `dailyAmSchedule-${index}`, 240) ??
        "",
      checkInRequired:
        formData.get(`dailyCheckInRequired-${index}`) === "yes",
      date: getOptionalDateString(formData, `dailyDate-${index}`) ?? "",
      day,
      pmSchedule:
        getOptionalLimitedString(formData, `dailyPmSchedule-${index}`, 240) ??
        "",
    });
  }

  return rows;
}

function getOptionalDateString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new TripRiskAssessmentValidationError(`${key} must be a valid date.`);
  }

  return value;
}

function getOptionalInteger(
  formData: FormData,
  key: string,
  bounds: { max: number; min: number },
) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  if (
    !Number.isInteger(numberValue) ||
    numberValue < bounds.min ||
    numberValue > bounds.max
  ) {
    throw new TripRiskAssessmentValidationError(
      `${key} must be a sensible number.`,
    );
  }

  return numberValue;
}

function getOptionalLimitedString(
  formData: FormData,
  key: string,
  maxLength: number,
) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    throw new TripRiskAssessmentValidationError(`${key} is too long.`);
  }

  return value;
}

function getRequiredString(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    throw new TripRiskAssessmentValidationError(`${key} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isTripRiskAssessmentValidationError(
  error: unknown,
): error is TripRiskAssessmentValidationError {
  return error instanceof TripRiskAssessmentValidationError;
}
