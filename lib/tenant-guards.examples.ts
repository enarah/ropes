import {
  createOrganisationWriteContext,
  isTenantGuardError,
  type OrganisationScopedRecord,
  type TenantGuardSession,
} from "@/lib/tenant-guards";

const demoSession: TenantGuardSession = {
  userId: "demo-user-1",
  memberships: [
    {
      organisationId: "demo-org-1",
      role: "Operations Manager",
      status: "ACTIVE",
    },
  ],
};

const demoTrip: OrganisationScopedRecord = {
  id: "demo-trip-1",
  organisationId: "demo-org-1",
};

const otherOrganisationVehicle: OrganisationScopedRecord = {
  id: "demo-vehicle-2",
  organisationId: "demo-org-2",
};

export function createDemoTripWriteContext() {
  return createOrganisationWriteContext({
    organisationId: "demo-org-1",
    relatedRecords: [{ label: "Trip", record: demoTrip }],
    session: demoSession,
  });
}

export function demoCrossOrganisationWriteIsRejected() {
  try {
    createOrganisationWriteContext({
      organisationId: "demo-org-1",
      relatedRecords: [
        {
          label: "Vehicle",
          record: otherOrganisationVehicle,
        },
      ],
      session: demoSession,
    });
  } catch (error) {
    if (isTenantGuardError(error)) {
      return error.code;
    }

    throw error;
  }

  throw new Error("Expected cross-organisation write to be rejected.");
}
