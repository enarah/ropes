-- Store a safe connection test status/category without Fulcrum response payloads.
ALTER TABLE "FulcrumConnection"
  ADD COLUMN "lastTestMessage" TEXT;
