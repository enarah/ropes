-- Add encrypted Fulcrum token storage metadata.
ALTER TABLE "FulcrumConnection"
  ADD COLUMN "encryptedApiToken" TEXT,
  ADD COLUMN "tokenHint" TEXT,
  ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
  ADD COLUMN "disabledAt" TIMESTAMP(3);
