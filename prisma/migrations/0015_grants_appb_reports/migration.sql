-- Add organisation-scoped Grants and APP&B report foundations.
CREATE TYPE "GrantFunder" AS ENUM (
    'NIAA',
    'DCCEEW',
    'OTHER'
);

CREATE TYPE "GrantProgramType" AS ENUM (
    'IRP',
    'IPA',
    'MDBIRR',
    'OTHER'
);

CREATE TYPE "GrantStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'COMPLETED',
    'ARCHIVED'
);

CREATE TYPE "GrantReportingCycle" AS ENUM (
    'ANNUAL_PLANNING',
    'MID_YEAR_PROGRESS',
    'ANNUAL_ACQUITTAL'
);

CREATE TYPE "GrantReportingPeriodStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'COMPLETED',
    'ARCHIVED'
);

CREATE TYPE "AppbReportStatus" AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'READY',
    'EXPORTED'
);

CREATE TABLE "Grant" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "projectId" TEXT,
    "rangerProgramId" TEXT,
    "funder" "GrantFunder" NOT NULL,
    "programType" "GrantProgramType" NOT NULL,
    "title" TEXT NOT NULL,
    "fundingAgreementNumber" TEXT,
    "fundingPeriodStart" TIMESTAMP(3) NOT NULL,
    "fundingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "status" "GrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrantReportingPeriod" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cycle" "GrantReportingCycle" NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "dueOn" TIMESTAMP(3),
    "status" "GrantReportingPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantReportingPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppbReport" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "reportingPeriodId" TEXT NOT NULL,
    "templateProfileId" TEXT NOT NULL,
    "templateVersionLabel" TEXT NOT NULL,
    "status" "AppbReportStatus" NOT NULL DEFAULT 'DRAFT',
    "manualFieldSummary" TEXT,
    "missingDataSummary" TEXT,
    "exportedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppbReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Grant_organisationId_idx" ON "Grant"("organisationId");
CREATE INDEX "Grant_projectId_idx" ON "Grant"("projectId");
CREATE INDEX "Grant_rangerProgramId_idx" ON "Grant"("rangerProgramId");
CREATE INDEX "Grant_funder_idx" ON "Grant"("funder");
CREATE INDEX "Grant_programType_idx" ON "Grant"("programType");
CREATE INDEX "Grant_status_idx" ON "Grant"("status");
CREATE INDEX "Grant_organisationId_fundingPeriodStart_fundingPeriodEnd_idx" ON "Grant"("organisationId", "fundingPeriodStart", "fundingPeriodEnd");

CREATE INDEX "GrantReportingPeriod_organisationId_idx" ON "GrantReportingPeriod"("organisationId");
CREATE INDEX "GrantReportingPeriod_grantId_idx" ON "GrantReportingPeriod"("grantId");
CREATE INDEX "GrantReportingPeriod_cycle_idx" ON "GrantReportingPeriod"("cycle");
CREATE INDEX "GrantReportingPeriod_status_idx" ON "GrantReportingPeriod"("status");
CREATE INDEX "GrantReportingPeriod_organisationId_grantId_startsOn_idx" ON "GrantReportingPeriod"("organisationId", "grantId", "startsOn");

CREATE INDEX "AppbReport_organisationId_idx" ON "AppbReport"("organisationId");
CREATE INDEX "AppbReport_grantId_idx" ON "AppbReport"("grantId");
CREATE INDEX "AppbReport_reportingPeriodId_idx" ON "AppbReport"("reportingPeriodId");
CREATE INDEX "AppbReport_status_idx" ON "AppbReport"("status");
CREATE INDEX "AppbReport_organisationId_grantId_reportingPeriodId_idx" ON "AppbReport"("organisationId", "grantId", "reportingPeriodId");

ALTER TABLE "Grant" ADD CONSTRAINT "Grant_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Grant" ADD CONSTRAINT "Grant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Grant" ADD CONSTRAINT "Grant_rangerProgramId_fkey" FOREIGN KEY ("rangerProgramId") REFERENCES "RangerProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GrantReportingPeriod" ADD CONSTRAINT "GrantReportingPeriod_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrantReportingPeriod" ADD CONSTRAINT "GrantReportingPeriod_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppbReport" ADD CONSTRAINT "AppbReport_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppbReport" ADD CONSTRAINT "AppbReport_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppbReport" ADD CONSTRAINT "AppbReport_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "GrantReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
