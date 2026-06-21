-- Store short organisation-scoped review notes for trip approval transitions.
CREATE TABLE "TripApprovalNote" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "fromApprovalStatus" "TripApprovalState",
    "toApprovalStatus" "TripApprovalState" NOT NULL,
    "note" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripApprovalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TripApprovalNote_organisationId_idx" ON "TripApprovalNote"("organisationId");
CREATE INDEX "TripApprovalNote_tripId_idx" ON "TripApprovalNote"("tripId");
CREATE INDEX "TripApprovalNote_actorUserId_idx" ON "TripApprovalNote"("actorUserId");
CREATE INDEX "TripApprovalNote_organisationId_tripId_createdAt_idx" ON "TripApprovalNote"("organisationId", "tripId", "createdAt");

ALTER TABLE "TripApprovalNote" ADD CONSTRAINT "TripApprovalNote_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripApprovalNote" ADD CONSTRAINT "TripApprovalNote_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripApprovalNote" ADD CONSTRAINT "TripApprovalNote_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
