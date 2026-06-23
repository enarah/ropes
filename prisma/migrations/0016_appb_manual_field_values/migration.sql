-- Add organisation-scoped manual APP&B report-only field values.
CREATE TYPE "AppbManualFieldStatus" AS ENUM (
    'BLANK',
    'DRAFT',
    'ENTERED',
    'NEEDS_REVIEW',
    'REVIEWED',
    'NOT_APPLICABLE'
);

CREATE TYPE "AppbManualFieldSensitivity" AS ENUM (
    'NORMAL',
    'FINANCE',
    'PERSONNEL',
    'NARRATIVE',
    'SENSITIVE'
);

CREATE TYPE "AppbManualFieldType" AS ENUM (
    'SHORT_TEXT',
    'LONG_TEXT',
    'NUMBER',
    'CURRENCY',
    'DATE',
    'YES_NO',
    'SELECT',
    'ROW_GROUP_PLACEHOLDER'
);

CREATE TABLE "AppbManualFieldValue" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "reportingPeriodId" TEXT NOT NULL,
    "appbReportId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldGroup" TEXT NOT NULL,
    "fieldType" "AppbManualFieldType" NOT NULL,
    "sensitivity" "AppbManualFieldSensitivity" NOT NULL,
    "status" "AppbManualFieldStatus" NOT NULL DEFAULT 'BLANK',
    "valueText" TEXT,
    "valueNumber" DECIMAL(12,2),
    "valueDate" TIMESTAMP(3),
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppbManualFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppbManualFieldValue_organisationId_appbReportId_fieldId_key" ON "AppbManualFieldValue"("organisationId", "appbReportId", "fieldId");
CREATE INDEX "AppbManualFieldValue_organisationId_idx" ON "AppbManualFieldValue"("organisationId");
CREATE INDEX "AppbManualFieldValue_grantId_idx" ON "AppbManualFieldValue"("grantId");
CREATE INDEX "AppbManualFieldValue_reportingPeriodId_idx" ON "AppbManualFieldValue"("reportingPeriodId");
CREATE INDEX "AppbManualFieldValue_appbReportId_idx" ON "AppbManualFieldValue"("appbReportId");
CREATE INDEX "AppbManualFieldValue_fieldGroup_idx" ON "AppbManualFieldValue"("fieldGroup");
CREATE INDEX "AppbManualFieldValue_status_idx" ON "AppbManualFieldValue"("status");
CREATE INDEX "AppbManualFieldValue_sensitivity_idx" ON "AppbManualFieldValue"("sensitivity");

ALTER TABLE "AppbManualFieldValue" ADD CONSTRAINT "AppbManualFieldValue_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppbManualFieldValue" ADD CONSTRAINT "AppbManualFieldValue_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppbManualFieldValue" ADD CONSTRAINT "AppbManualFieldValue_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "GrantReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppbManualFieldValue" ADD CONSTRAINT "AppbManualFieldValue_appbReportId_fkey" FOREIGN KEY ("appbReportId") REFERENCES "AppbReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
