import { TrackingSyncError } from "./sync-errors";

export function validInternalIdentity(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
}
export function assertOneShotPermission(environment: Record<string, string | undefined>, organisationId: string, confirmed: boolean) {
  const demo = environment.ROPES_DEMO_MODE?.trim().toLowerCase();
  if (confirmed !== true || !validInternalIdentity(organisationId) ||
    environment.ROPES_RUNTIME_ENV !== "sandbox" ||
    !["production", "development", "test"].includes(environment.NODE_ENV ?? "") ||
    environment.ALLOW_SPOT_ONE_SHOT_SYNC !== "true" ||
    environment.ROPES_SPOT_SYNC_ORGANISATION_ID !== organisationId ||
    ["true", "1", "enabled"].includes(demo ?? "")) {
    throw new TrackingSyncError("PERMISSION_DENIED");
  }
}
