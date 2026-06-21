-- Add organisation-scoped Fulcrum sync job placeholders.
CREATE TYPE "FulcrumSyncJobStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "FulcrumSyncJob" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "fulcrumConnectionId" TEXT NOT NULL,
  "requestedByUserId" TEXT,
  "status" "FulcrumSyncJobStatus" NOT NULL DEFAULT 'QUEUED',
  "safeErrorCategory" TEXT,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FulcrumSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FulcrumSyncJob_organisationId_idx" ON "FulcrumSyncJob"("organisationId");
CREATE INDEX "FulcrumSyncJob_fulcrumConnectionId_idx" ON "FulcrumSyncJob"("fulcrumConnectionId");
CREATE INDEX "FulcrumSyncJob_requestedByUserId_idx" ON "FulcrumSyncJob"("requestedByUserId");
CREATE INDEX "FulcrumSyncJob_status_idx" ON "FulcrumSyncJob"("status");

ALTER TABLE "FulcrumSyncJob"
  ADD CONSTRAINT "FulcrumSyncJob_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FulcrumSyncJob"
  ADD CONSTRAINT "FulcrumSyncJob_fulcrumConnectionId_fkey"
  FOREIGN KEY ("fulcrumConnectionId") REFERENCES "FulcrumConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FulcrumSyncJob"
  ADD CONSTRAINT "FulcrumSyncJob_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
