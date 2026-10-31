-- CreateEnum
CREATE TYPE "TrackingProvider" AS ENUM ('SPOT');

-- CreateEnum
CREATE TYPE "TrackingAssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TrackingMessageKind" AS ENUM ('TRACKING', 'CHECK_IN', 'MOVEMENT', 'HELP', 'HELP_CANCEL', 'CUSTOM', 'POINT_OF_INTEREST', 'STOP', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TripTrackingRole" AS ENUM ('PRIMARY', 'SUPPORT', 'PERSON', 'OTHER');

-- CreateTable
CREATE TABLE "TrackingIntegration" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "provider" "TrackingProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "credentialKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pollIntervalSeconds" INTEGER NOT NULL DEFAULT 180,
    "lastPollAttemptAt" TIMESTAMP(3),
    "lastPollSuccessAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingAsset" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "trackingIntegrationId" TEXT NOT NULL,
    "externalAssetId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "providerDisplayName" TEXT,
    "model" TEXT,
    "status" "TrackingAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultVehicleId" TEXT,
    "expectedTrackingIntervalMinutes" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingMessage" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "trackingIntegrationId" TEXT NOT NULL,
    "trackingAssetId" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageKind" "TrackingMessageKind" NOT NULL,
    "providerMessageType" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "messageContent" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripTrackingAssignment" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "trackingAssetId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "role" "TripTrackingRole" NOT NULL DEFAULT 'PRIMARY',
    "assignedFrom" TIMESTAMP(3),
    "assignedUntil" TIMESTAMP(3),
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripTrackingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackingIntegration_credentialKey_key" ON "TrackingIntegration"("credentialKey");

-- CreateIndex
CREATE INDEX "TrackingIntegration_organisationId_idx" ON "TrackingIntegration"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingIntegration_organisationId_id_key" ON "TrackingIntegration"("organisationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingIntegration_organisationId_provider_name_key" ON "TrackingIntegration"("organisationId", "provider", "name");

-- CreateIndex
CREATE INDEX "TrackingAsset_organisationId_idx" ON "TrackingAsset"("organisationId");

-- CreateIndex
CREATE INDEX "TrackingAsset_defaultVehicleId_idx" ON "TrackingAsset"("defaultVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingAsset_organisationId_id_key" ON "TrackingAsset"("organisationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingAsset_organisationId_trackingIntegrationId_id_key" ON "TrackingAsset"("organisationId", "trackingIntegrationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingAsset_trackingIntegrationId_externalAssetId_key" ON "TrackingAsset"("trackingIntegrationId", "externalAssetId");

-- CreateIndex
CREATE INDEX "TrackingMessage_organisationId_occurredAt_idx" ON "TrackingMessage"("organisationId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingMessage_trackingAssetId_occurredAt_idx" ON "TrackingMessage"("trackingAssetId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingMessage_trackingAssetId_messageKind_occurredAt_idx" ON "TrackingMessage"("trackingAssetId", "messageKind", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingMessage_trackingIntegrationId_externalMessageId_key" ON "TrackingMessage"("trackingIntegrationId", "externalMessageId");

-- CreateIndex
CREATE INDEX "TripTrackingAssignment_organisationId_idx" ON "TripTrackingAssignment"("organisationId");

-- CreateIndex
CREATE INDEX "TripTrackingAssignment_trackingAssetId_idx" ON "TripTrackingAssignment"("trackingAssetId");

-- CreateIndex
CREATE INDEX "TripTrackingAssignment_vehicleId_idx" ON "TripTrackingAssignment"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "TripTrackingAssignment_tripId_trackingAssetId_key" ON "TripTrackingAssignment"("tripId", "trackingAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_organisationId_id_key" ON "Trip"("organisationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_organisationId_id_key" ON "Vehicle"("organisationId", "id");

-- AddForeignKey
ALTER TABLE "TrackingIntegration" ADD CONSTRAINT "TrackingIntegration_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TrackingAsset" ADD CONSTRAINT "TrackingAsset_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TrackingAsset" ADD CONSTRAINT "TrackingAsset_organisationId_trackingIntegrationId_fkey" FOREIGN KEY ("organisationId", "trackingIntegrationId") REFERENCES "TrackingIntegration"("organisationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TrackingAsset" ADD CONSTRAINT "TrackingAsset_organisationId_defaultVehicleId_fkey" FOREIGN KEY ("organisationId", "defaultVehicleId") REFERENCES "Vehicle"("organisationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TrackingMessage" ADD CONSTRAINT "TrackingMessage_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TrackingMessage" ADD CONSTRAINT "TrackingMessage_organisationId_trackingIntegrationId_fkey" FOREIGN KEY ("organisationId", "trackingIntegrationId") REFERENCES "TrackingIntegration"("organisationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TrackingMessage" ADD CONSTRAINT "TrackingMessage_organisationId_trackingIntegrationId_track_fkey" FOREIGN KEY ("organisationId", "trackingIntegrationId", "trackingAssetId") REFERENCES "TrackingAsset"("organisationId", "trackingIntegrationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TripTrackingAssignment" ADD CONSTRAINT "TripTrackingAssignment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TripTrackingAssignment" ADD CONSTRAINT "TripTrackingAssignment_organisationId_tripId_fkey" FOREIGN KEY ("organisationId", "tripId") REFERENCES "Trip"("organisationId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TripTrackingAssignment" ADD CONSTRAINT "TripTrackingAssignment_organisationId_trackingAssetId_fkey" FOREIGN KEY ("organisationId", "trackingAssetId") REFERENCES "TrackingAsset"("organisationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TripTrackingAssignment" ADD CONSTRAINT "TripTrackingAssignment_organisationId_vehicleId_fkey" FOREIGN KEY ("organisationId", "vehicleId") REFERENCES "Vehicle"("organisationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Invalid fixes are retained as events with BOTH coordinates null.
ALTER TABLE "TrackingMessage" ADD CONSTRAINT "TrackingMessage_valid_coordinates_check"
CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR
       ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND
        "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180));
ALTER TABLE "TrackingAsset" ADD CONSTRAINT "TrackingAsset_positive_interval_check"
CHECK ("expectedTrackingIntervalMinutes" IS NULL OR "expectedTrackingIntervalMinutes" > 0);
ALTER TABLE "TrackingIntegration" ADD CONSTRAINT "TrackingIntegration_poll_interval_check"
CHECK ("pollIntervalSeconds" >= 150);
ALTER TABLE "TripTrackingAssignment" ADD CONSTRAINT "TripTrackingAssignment_window_check"
CHECK ("assignedFrom" IS NULL OR "assignedUntil" IS NULL OR "assignedFrom" <= "assignedUntil");

-- Tenant ownership is immutable, including assets that have no messages/assignments.
CREATE FUNCTION "tracking_prevent_organisation_move"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."organisationId" IS DISTINCT FROM OLD."organisationId" THEN
    RAISE EXCEPTION 'Tracking organisation ownership is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "TrackingIntegration_immutable_organisation" BEFORE UPDATE ON "TrackingIntegration"
FOR EACH ROW EXECUTE FUNCTION "tracking_prevent_organisation_move"();
CREATE TRIGGER "TrackingAsset_immutable_organisation" BEFORE UPDATE ON "TrackingAsset"
FOR EACH ROW EXECUTE FUNCTION "tracking_prevent_organisation_move"();
CREATE TRIGGER "TrackingMessage_immutable_organisation" BEFORE UPDATE ON "TrackingMessage"
FOR EACH ROW EXECUTE FUNCTION "tracking_prevent_organisation_move"();
CREATE TRIGGER "TripTrackingAssignment_immutable_organisation" BEFORE UPDATE ON "TripTrackingAssignment"
FOR EACH ROW EXECUTE FUNCTION "tracking_prevent_organisation_move"();
