-- CreateTable
CREATE TABLE "AppbMappingReviewDecisionHistoryRecord" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "appbReportId" TEXT NOT NULL,
    "reviewDecisionId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "targetKind" "AppbMappingReviewTargetKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "previousDecision" "AppbMappingReviewDecision",
    "previousReviewStatus" "AppbMappingReviewStatus",
    "newDecision" "AppbMappingReviewDecision" NOT NULL,
    "newReviewStatus" "AppbMappingReviewStatus" NOT NULL,
    "reviewerUserId" TEXT,
    "reviewerDisplayName" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "safeNote" TEXT,
    "valueFree" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppbMappingReviewDecisionHistoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppbReviewHistory_organisationId_idx" ON "AppbMappingReviewDecisionHistoryRecord"("organisationId");

-- CreateIndex
CREATE INDEX "AppbReviewHistory_appbReportId_idx" ON "AppbMappingReviewDecisionHistoryRecord"("appbReportId");

-- CreateIndex
CREATE INDEX "AppbReviewHistory_reviewDecisionId_idx" ON "AppbMappingReviewDecisionHistoryRecord"("reviewDecisionId");

-- CreateIndex
CREATE INDEX "AppbReviewHistory_templateVersionId_idx" ON "AppbMappingReviewDecisionHistoryRecord"("templateVersionId");

-- CreateIndex
CREATE INDEX "AppbReviewHistory_target_reviewedAt_idx" ON "AppbMappingReviewDecisionHistoryRecord"("organisationId", "appbReportId", "targetKind", "targetId", "reviewedAt");

-- AddForeignKey
ALTER TABLE "AppbMappingReviewDecisionHistoryRecord" ADD CONSTRAINT "AppbReviewHistory_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppbMappingReviewDecisionHistoryRecord" ADD CONSTRAINT "AppbReviewHistory_appbReportId_fkey" FOREIGN KEY ("appbReportId") REFERENCES "AppbReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppbMappingReviewDecisionHistoryRecord" ADD CONSTRAINT "AppbReviewHistory_reviewDecisionId_fkey" FOREIGN KEY ("reviewDecisionId") REFERENCES "AppbMappingReviewDecisionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
