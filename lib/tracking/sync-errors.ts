const codes = [
  "PERMISSION_DENIED", "INVALID_ARGUMENTS", "INTEGRATION_UNAVAILABLE",
  "CAPABILITY_DISABLED", "SYNTHETIC_BOUNDARY", "CREDENTIALS_UNAVAILABLE",
  "UNSAFE_REQUEST", "REQUEST_TIMEOUT", "REQUEST_FAILED", "PROVIDER_ERROR",
  "RESPONSE_TOO_LARGE", "MALFORMED_RESPONSE", "UNSUPPORTED_PROFILE",
  "UNKNOWN_ASSET", "MESSAGE_CONFLICT", "OWNERSHIP_CONFLICT",
  "ATTEMPT_SUPERSEDED", "PERSISTENCE_FAILED",
] as const;
export type TrackingSyncErrorCode = typeof codes[number];
const allowedCodes: ReadonlySet<string> = new Set(codes);

// Intentionally no raw message, URL, body, input value or nested exception.
// Validate at runtime too: even an untyped caller cannot manufacture a secret code.
export class TrackingSyncError extends Error {
  readonly code: TrackingSyncErrorCode;
  constructor(code: TrackingSyncErrorCode) {
    const safe = allowedCodes.has(code) ? code : "PERSISTENCE_FAILED";
    super(safe);
    this.code = safe;
    this.name = "TrackingSyncError";
  }
}
export function trackingSyncErrorCode(error: unknown): TrackingSyncErrorCode {
  return error instanceof TrackingSyncError && allowedCodes.has(error.code) ? error.code : "PERSISTENCE_FAILED";
}
