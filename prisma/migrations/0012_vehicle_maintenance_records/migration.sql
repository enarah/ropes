-- Add organisation-scoped vehicle maintenance records.
CREATE TYPE "VehicleMaintenanceType" AS ENUM (
    'SERVICE',
    'REPAIR',
    'INSPECTION',
    'TYRES',
    'REGISTRATION',
    'CLEANING',
    'OTHER'
);

CREATE TYPE "VehicleMaintenanceStatus" AS ENUM (
    'COMPLETED',
    'SCHEDULED',
    'DEFERRED'
);

CREATE TABLE "VehicleMaintenanceRecord" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "defectId" TEXT,
    "recordedByUserId" TEXT,
    "type" "VehicleMaintenanceType" NOT NULL,
    "status" "VehicleMaintenanceStatus" NOT NULL DEFAULT 'COMPLETED',
    "provider" TEXT,
    "maintenanceDate" TIMESTAMP(3) NOT NULL,
    "odometerKm" INTEGER,
    "costCents" INTEGER,
    "notes" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMaintenanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleMaintenanceRecord_organisationId_idx" ON "VehicleMaintenanceRecord"("organisationId");
CREATE INDEX "VehicleMaintenanceRecord_vehicleId_idx" ON "VehicleMaintenanceRecord"("vehicleId");
CREATE INDEX "VehicleMaintenanceRecord_defectId_idx" ON "VehicleMaintenanceRecord"("defectId");
CREATE INDEX "VehicleMaintenanceRecord_recordedByUserId_idx" ON "VehicleMaintenanceRecord"("recordedByUserId");
CREATE INDEX "VehicleMaintenanceRecord_status_idx" ON "VehicleMaintenanceRecord"("status");
CREATE INDEX "VehicleMaintenanceRecord_organisationId_vehicleId_maintenanceDate_idx" ON "VehicleMaintenanceRecord"("organisationId", "vehicleId", "maintenanceDate");

ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "VehicleDefect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceRecord" ADD CONSTRAINT "VehicleMaintenanceRecord_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
