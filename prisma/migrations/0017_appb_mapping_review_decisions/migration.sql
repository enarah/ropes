-- CreateEnum
CREATE TYPE "AppbMappingReviewTargetKind" AS ENUM ('FIELD_MAPPING', 'REPEATABLE_RANGE');

-- CreateEnum
CREATE TYPE "AppbMappingReviewDecision" AS ENUM ('KEEP_NEEDS_REVIEW', 'MARK_REVIEWED', 'MARK_BLOCKED_FORMULA', 'MARK_BLOCKED_HIDDEN_SHEET', 'MARK_BLOCKED_UNSUPPORTED', 'MARK_UNMAPPED', 'MARK_READY_FOR_FUTURE_EXPORT');

-- CreateEnum
CREATE TYPE "AppbMappingReviewStatus" AS ENUM ('UNMAPPED', 'NEEDS_REVIEW', 'REVIEWED', 'BLOCKED_FORMULA', 'BLOCKED_HIDDEN_SHEET', 'BLOCKED_UNSUPPORTED', 'READY_FOR_FUTURE_EXPORT');

-- CreateTable
CREATE TABLE "AppbMappingReviewDecisionRecord" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "reportingPeriodId" TEXT NOT NULL,
    "appbReportId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "targetKind" "AppbMappingReviewTargetKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "decision" "AppbMappingReviewDecision" NOT NULL,
    "reviewStatus" "AppbMappingReviewStatus" NOT NULL,
    "safeNote" TEXT,
    "reviewerUserId" TEXT,
    "reviewerDisplayName" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "auditMetadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppbMappingReviewDecisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppbMappingReviewDecisionRecord_organisationId_appbReportI_key" ON "AppbMappingReviewDecisionRecord"("organisationId", "appbReportId", "targetKind", "targetId");

-- CreateIndex
CREATE INDEX "AppbMappingReviewDecisionRecord_organisationId_idx" ON "AppbMappingReviewDecisionRecord"("organisationId");

-- CreateIndex
CREATE INDEX "AppbMappingReviewDecisionRecord_grantId_idx" ON "AppbMappingReviewDecisionRecord"("grantId");

-- CreateIndex
CREATE INDEX "AppbMappingReviewDecisionRecord_reportingPeriodId_idx" ON "AppbMappingReviewDecisionRecord"("reportingPeriodId");

-- CreateIndex
CREATE INDEX "AppbMappingReviewDecisionRecord_appbReportId_idx" ON "AppbMappingReviewDecisionRecord"("appbReportId");

-- CreateIndex
CREATE INDEX "AppbMappingReviewDecisionRecord_templateVersionId_idx" ON "AppbMappingReviewDecisionRecord"("templateVersionId");

-- CreateIndex
CREATE INDEX "AppbMappingReviewDecisionRecord_targetKind_idx" ON "AppbMappingReviewDecisionRecord"("targetKind");

-- CreateIndex
CREATE INDEX "AppbMappingReviewDecisionRecord_decision_idx" ON "AppbMappingReviewDecisionRecord"("decision");

-- CreateIndex
CREATE INDEX "AppbMappingReviewDecisionRecord_reviewStatus_idx" ON "AppbMappingReviewDecisionRecord"("reviewStatus");

-- AddForeignKey
ALTER TABLE "AppbMappingReviewDecisionRecord" ADD CONSTRAINT "AppbMappingReviewDecisionRecord_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppbMappingReviewDecisionRecord" ADD CONSTRAINT "AppbMappingReviewDecisionRecord_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppbMappingReviewDecisionRecord" ADD CONSTRAINT "AppbMappingReviewDecisionRecord_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "GrantReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppbMappingReviewDecisionRecord" ADD CONSTRAINT "AppbMappingReviewDecisionRecord_appbReportId_fkey" FOREIGN KEY ("appbReportId") REFERENCES "AppbReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
