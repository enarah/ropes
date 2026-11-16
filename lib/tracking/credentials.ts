import "server-only";
// Node-only module: never import from client components or shared DTO contracts.
import { env as serverEnvironment } from "node:process";
import { inspect } from "node:util";
import { TrackingSyncError } from "./sync-errors";

export class SpotCredentials {
  #feedId: string;
  #password: string | undefined;
  constructor(feedId: string, password?: string) {
    if (typeof feedId !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(feedId) || (password !== undefined &&
      (typeof password !== "string" || !password.length || password.length > 512 || /[\u0000-\u001f\u007f]/.test(password)))) {
      throw new TrackingSyncError("CREDENTIALS_UNAVAILABLE");
    }
    this.#feedId = feedId;
    this.#password = password;
  }
  // Called only by the allowlisted adapter; no public URL/configuration DTO.
  applyTo(url: URL) {
    url.pathname += `${encodeURIComponent(this.#feedId)}/`;
    if (this.#password !== undefined) url.searchParams.set("feedPassword", this.#password);
  }
  containsSecret(value: string) {
    return value.includes(this.#feedId) || Boolean(this.#password && value.includes(this.#password));
  }
  toJSON() { return "[SPOT credentials redacted]"; }
  [inspect.custom]() { return this.toJSON(); }
}
export type SpotCredentialResolver = (credentialKey: string) => Promise<SpotCredentials>;

export function assertCredentialKey(key: string) {
  // Canonical hyphenated lowercase tokens: the environment mapping is injective.
  if (typeof key !== "string" || key.length > 64 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(key)) {
    throw new TrackingSyncError("CREDENTIALS_UNAVAILABLE");
  }
}
export function createEnvironmentCredentialResolver(
  environment: Record<string, string | undefined> = serverEnvironment,
): SpotCredentialResolver {
  return async (key) => {
    assertCredentialKey(key);
    const prefix = `ROPES_TRACKING_${key.replaceAll("-", "_").toUpperCase()}`;
    const feedId = environment[`${prefix}_FEED_ID`];
    if (!feedId) throw new TrackingSyncError("CREDENTIALS_UNAVAILABLE");
    return new SpotCredentials(feedId, environment[`${prefix}_FEED_PASSWORD`] || undefined);
  };
}
