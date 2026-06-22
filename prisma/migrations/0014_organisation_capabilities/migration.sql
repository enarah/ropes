-- CreateTable
CREATE TABLE "OrganisationCapability" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationCapability_organisationId_key_key" ON "OrganisationCapability"("organisationId", "key");

-- CreateIndex
CREATE INDEX "OrganisationCapability_organisationId_idx" ON "OrganisationCapability"("organisationId");

-- CreateIndex
CREATE INDEX "OrganisationCapability_key_idx" ON "OrganisationCapability"("key");

-- CreateIndex
CREATE INDEX "OrganisationCapability_moduleKey_idx" ON "OrganisationCapability"("moduleKey");

-- AddForeignKey
ALTER TABLE "OrganisationCapability" ADD CONSTRAINT "OrganisationCapability_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill current operational capabilities for existing organisations so
-- migrated databases keep today's modules available until an admin UI exists.
INSERT INTO "OrganisationCapability" ("id", "organisationId", "key", "moduleKey", "isDemo", "createdAt", "updatedAt")
SELECT
    'cap_' || substr(md5("Organisation"."id" || ':' || capability."key"), 1, 24),
    "Organisation"."id",
    capability."key",
    capability."moduleKey",
    "Organisation"."isDemo",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Organisation"
CROSS JOIN (
    VALUES
        ('trips', 'trips'),
        ('trips.approvals', 'trips'),
        ('trips.riskAssessment', 'trips'),
        ('trips.journeyManagement', 'trips'),
        ('vehicles', 'vehicles'),
        ('vehicles.bookings', 'vehicles'),
        ('vehicles.preStarts', 'vehicles'),
        ('vehicles.defects', 'vehicles'),
        ('vehicles.maintenance', 'vehicles'),
        ('fulcrum', 'fulcrum'),
        ('fulcrum.import', 'fulcrum'),
        ('fulcrum.maps', 'fulcrum'),
        ('reporting', 'reporting'),
        ('safety', 'safety'),
        ('integrations', 'integrations'),
        ('branding', 'branding')
) AS capability("key", "moduleKey")
ON CONFLICT ("organisationId", "key") DO NOTHING;
