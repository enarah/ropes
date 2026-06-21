-- Persist structured trip detail rows as first-class organisation-scoped data.
CREATE TABLE "TripParticipant" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rowOrder" INTEGER NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripVehicleAllocation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "name" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rowOrder" INTEGER NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripVehicleAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripItineraryItem" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rowOrder" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripItineraryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TripParticipant_organisationId_idx" ON "TripParticipant"("organisationId");
CREATE INDEX "TripParticipant_tripId_idx" ON "TripParticipant"("tripId");
CREATE INDEX "TripParticipant_userId_idx" ON "TripParticipant"("userId");
CREATE INDEX "TripParticipant_organisationId_tripId_rowOrder_idx" ON "TripParticipant"("organisationId", "tripId", "rowOrder");

CREATE INDEX "TripVehicleAllocation_organisationId_idx" ON "TripVehicleAllocation"("organisationId");
CREATE INDEX "TripVehicleAllocation_tripId_idx" ON "TripVehicleAllocation"("tripId");
CREATE INDEX "TripVehicleAllocation_vehicleId_idx" ON "TripVehicleAllocation"("vehicleId");
CREATE INDEX "TripVehicleAllocation_organisationId_tripId_rowOrder_idx" ON "TripVehicleAllocation"("organisationId", "tripId", "rowOrder");

CREATE INDEX "TripItineraryItem_organisationId_idx" ON "TripItineraryItem"("organisationId");
CREATE INDEX "TripItineraryItem_tripId_idx" ON "TripItineraryItem"("tripId");
CREATE INDEX "TripItineraryItem_organisationId_tripId_rowOrder_idx" ON "TripItineraryItem"("organisationId", "tripId", "rowOrder");

ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TripVehicleAllocation" ADD CONSTRAINT "TripVehicleAllocation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripVehicleAllocation" ADD CONSTRAINT "TripVehicleAllocation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripVehicleAllocation" ADD CONSTRAINT "TripVehicleAllocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TripItineraryItem" ADD CONSTRAINT "TripItineraryItem_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripItineraryItem" ADD CONSTRAINT "TripItineraryItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
