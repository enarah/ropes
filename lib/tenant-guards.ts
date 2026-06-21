export type OrganisationId = string;
export type UserId = string;

export type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export type TenantGuardMembership = {
  organisationId: OrganisationId;
  role?: string;
  status: MembershipStatus;
};

export type TenantGuardSession = {
  memberships?: readonly TenantGuardMembership[];
  userId?: UserId | null;
};

export type AuthenticatedTenantSession = TenantGuardSession & {
  memberships: readonly TenantGuardMembership[];
  userId: UserId;
};

export type OrganisationScopedRecord = {
  id?: string | null;
  organisationId?: OrganisationId | null;
};

export type RelatedRecordCheck = {
  label: string;
  record: OrganisationScopedRecord | null | undefined;
  required?: boolean;
};

export type OrganisationWriteContext = {
  actorUserId: UserId;
  organisationId: OrganisationId;
};

export type TenantGuardErrorCode =
  | "AUTH_REQUIRED"
  | "ORGANISATION_REQUIRED"
  | "ORGANISATION_ACCESS_DENIED"
  | "RELATED_RECORD_REQUIRED"
  | "RELATED_RECORD_UNSCOPED"
  | "RELATED_RECORD_ORGANISATION_MISMATCH";

export class TenantGuardError extends Error {
  constructor(
    public readonly code: TenantGuardErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TenantGuardError";
  }
}

export function isTenantGuardError(error: unknown): error is TenantGuardError {
  return error instanceof TenantGuardError;
}

export function requireAuthenticatedSession(
  session: TenantGuardSession | null | undefined,
): asserts session is AuthenticatedTenantSession {
  if (!session?.userId) {
    throw new TenantGuardError(
      "AUTH_REQUIRED",
      "A signed-in user is required for this operation.",
    );
  }

  if (!session.memberships?.length) {
    throw new TenantGuardError(
      "ORGANISATION_ACCESS_DENIED",
      "The current user has no active organisation memberships.",
    );
  }
}

export function requireOrganisationAccess(
  session: TenantGuardSession | null | undefined,
  organisationId: OrganisationId | null | undefined,
): OrganisationWriteContext {
  requireAuthenticatedSession(session);

  if (!organisationId) {
    throw new TenantGuardError(
      "ORGANISATION_REQUIRED",
      "An explicit organisationId is required for this operation.",
    );
  }

  const hasAccess = session.memberships.some(
    (membership) =>
      membership.organisationId === organisationId &&
      membership.status === "ACTIVE",
  );

  if (!hasAccess) {
    throw new TenantGuardError(
      "ORGANISATION_ACCESS_DENIED",
      "The current user cannot access the requested organisation.",
    );
  }

  return {
    actorUserId: session.userId,
    organisationId,
  };
}

export function requireOrganisationScopedRecord(
  organisationId: OrganisationId,
  record: OrganisationScopedRecord | null | undefined,
  label: string,
): OrganisationScopedRecord {
  if (!record) {
    throw new TenantGuardError(
      "RELATED_RECORD_REQUIRED",
      `${label} is required for this operation.`,
    );
  }

  if (!record.organisationId) {
    throw new TenantGuardError(
      "RELATED_RECORD_UNSCOPED",
      `${label} does not include an organisationId.`,
    );
  }

  if (record.organisationId !== organisationId) {
    throw new TenantGuardError(
      "RELATED_RECORD_ORGANISATION_MISMATCH",
      `${label} belongs to a different organisation.`,
    );
  }

  return record;
}

export function requireRelatedRecordsInOrganisation(
  organisationId: OrganisationId,
  relatedRecords: readonly RelatedRecordCheck[],
) {
  for (const relatedRecord of relatedRecords) {
    if (!relatedRecord.record && relatedRecord.required === false) {
      continue;
    }

    requireOrganisationScopedRecord(
      organisationId,
      relatedRecord.record,
      relatedRecord.label,
    );
  }
}

export function createOrganisationWriteContext({
  organisationId,
  relatedRecords = [],
  session,
}: {
  organisationId: OrganisationId | null | undefined;
  relatedRecords?: readonly RelatedRecordCheck[];
  session: TenantGuardSession | null | undefined;
}) {
  const context = requireOrganisationAccess(session, organisationId);
  requireRelatedRecordsInOrganisation(context.organisationId, relatedRecords);

  return context;
}
