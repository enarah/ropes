-- CreateEnum
CREATE TYPE "TripRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "TripRiskAssessment" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "tripTypeCode" TEXT NOT NULL,
    "activityRiskCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "baseRiskLevel" "TripRiskLevel" NOT NULL,
    "finalRiskLevel" "TripRiskLevel" NOT NULL,
    "tripSpecificControls" TEXT,
    "leadDrivers" TEXT,
    "spotGarminDetails" TEXT,
    "satellitePhone" TEXT,
    "mobilePhone" TEXT,
    "epirbDetails" TEXT,
    "firstAidDetails" TEXT,
    "defibDetails" TEXT,
    "dpfDetails" TEXT,
    "otherEquipment" TEXT,
    "rangers" TEXT,
    "partners" TEXT,
    "medicalAllergyNotes" TEXT,
    "relevantContacts" TEXT,
    "dailyItinerary" JSONB,
    "emergencyContacts" TEXT,
    "escalationNotes" TEXT,
    "readyForManagerReview" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripRiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripRiskAssessment_tripId_key" ON "TripRiskAssessment"("tripId");

-- CreateIndex
CREATE INDEX "TripRiskAssessment_organisationId_idx" ON "TripRiskAssessment"("organisationId");

-- CreateIndex
CREATE INDEX "TripRiskAssessment_tripId_idx" ON "TripRiskAssessment"("tripId");

-- CreateIndex
CREATE INDEX "TripRiskAssessment_createdByUserId_idx" ON "TripRiskAssessment"("createdByUserId");

-- CreateIndex
CREATE INDEX "TripRiskAssessment_updatedByUserId_idx" ON "TripRiskAssessment"("updatedByUserId");

-- CreateIndex
CREATE INDEX "TripRiskAssessment_finalRiskLevel_idx" ON "TripRiskAssessment"("finalRiskLevel");

-- AddForeignKey
ALTER TABLE "TripRiskAssessment" ADD CONSTRAINT "TripRiskAssessment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRiskAssessment" ADD CONSTRAINT "TripRiskAssessment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRiskAssessment" ADD CONSTRAINT "TripRiskAssessment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRiskAssessment" ADD CONSTRAINT "TripRiskAssessment_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
