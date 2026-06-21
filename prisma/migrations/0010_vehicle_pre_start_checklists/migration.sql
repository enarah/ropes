-- Add organisation-scoped vehicle pre-start checklist submissions.
CREATE TABLE "VehiclePreStartChecklist" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "odometerKm" INTEGER NOT NULL,
    "tyresOk" BOOLEAN NOT NULL,
    "lightsOk" BOOLEAN NOT NULL,
    "fluidsOk" BOOLEAN NOT NULL,
    "communicationsOk" BOOLEAN NOT NULL,
    "recoveryGearOk" BOOLEAN NOT NULL,
    "generalConditionOk" BOOLEAN NOT NULL,
    "issueNotes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiclePreStartChecklist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehiclePreStartChecklist_organisationId_idx" ON "VehiclePreStartChecklist"("organisationId");
CREATE INDEX "VehiclePreStartChecklist_vehicleId_idx" ON "VehiclePreStartChecklist"("vehicleId");
CREATE INDEX "VehiclePreStartChecklist_submittedByUserId_idx" ON "VehiclePreStartChecklist"("submittedByUserId");
CREATE INDEX "VehiclePreStartChecklist_organisationId_vehicleId_checkedAt_idx" ON "VehiclePreStartChecklist"("organisationId", "vehicleId", "checkedAt");

ALTER TABLE "VehiclePreStartChecklist" ADD CONSTRAINT "VehiclePreStartChecklist_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehiclePreStartChecklist" ADD CONSTRAINT "VehiclePreStartChecklist_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehiclePreStartChecklist" ADD CONSTRAINT "VehiclePreStartChecklist_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
