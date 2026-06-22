-- Add organisation-scoped vehicle defect report submissions.
CREATE TYPE "VehicleDefectCategory" AS ENUM (
    'MECHANICAL',
    'SAFETY',
    'TYRES',
    'ELECTRICAL',
    'COMMUNICATIONS',
    'RECOVERY_GEAR',
    'BODY',
    'OTHER'
);

CREATE TYPE "VehicleDefectSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TYPE "VehicleDefectStatus" AS ENUM (
    'OPEN',
    'MONITORING',
    'RESOLVED'
);

CREATE TABLE "VehicleDefect" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "preStartChecklistId" TEXT,
    "reportedByUserId" TEXT,
    "category" "VehicleDefectCategory" NOT NULL,
    "severity" "VehicleDefectSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "VehicleDefectStatus" NOT NULL DEFAULT 'OPEN',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDefect_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleDefect_organisationId_idx" ON "VehicleDefect"("organisationId");
CREATE INDEX "VehicleDefect_vehicleId_idx" ON "VehicleDefect"("vehicleId");
CREATE INDEX "VehicleDefect_preStartChecklistId_idx" ON "VehicleDefect"("preStartChecklistId");
CREATE INDEX "VehicleDefect_reportedByUserId_idx" ON "VehicleDefect"("reportedByUserId");
CREATE INDEX "VehicleDefect_status_idx" ON "VehicleDefect"("status");
CREATE INDEX "VehicleDefect_organisationId_vehicleId_status_reportedAt_idx" ON "VehicleDefect"("organisationId", "vehicleId", "status", "reportedAt");

ALTER TABLE "VehicleDefect" ADD CONSTRAINT "VehicleDefect_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleDefect" ADD CONSTRAINT "VehicleDefect_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleDefect" ADD CONSTRAINT "VehicleDefect_preStartChecklistId_fkey" FOREIGN KEY ("preStartChecklistId") REFERENCES "VehiclePreStartChecklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleDefect" ADD CONSTRAINT "VehicleDefect_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
