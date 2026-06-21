-- Add a small dedicated approval workflow state for trips.
CREATE TYPE "TripApprovalState" AS ENUM (
    'DRAFT',
    'READY_FOR_REVIEW',
    'APPROVED',
    'CHANGES_REQUESTED',
    'CANCELLED'
);

ALTER TABLE "Trip"
ADD COLUMN "approvalStatus" "TripApprovalState" NOT NULL DEFAULT 'DRAFT';

CREATE INDEX "Trip_approvalStatus_idx" ON "Trip"("approvalStatus");
