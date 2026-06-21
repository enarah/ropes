-- Add minimal import metadata for the manual Fulcrum record import MVP.
ALTER TABLE "FulcrumApp"
ADD COLUMN "importedAt" TIMESTAMP(3),
ADD COLUMN "rawJson" JSONB;

ALTER TABLE "FulcrumRecord"
ADD COLUMN "importedAt" TIMESTAMP(3),
ADD COLUMN "dataHealthFlags" JSONB;

CREATE UNIQUE INDEX "FulcrumApp_organisationId_fulcrumConnectionId_externalAppId_key"
ON "FulcrumApp"("organisationId", "fulcrumConnectionId", "externalAppId");

CREATE UNIQUE INDEX "FulcrumRecord_organisationId_fulcrumConnectionId_externalRecordId_key"
ON "FulcrumRecord"("organisationId", "fulcrumConnectionId", "externalRecordId");
