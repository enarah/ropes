import { isAuthenticationConfigured } from "@/lib/auth-options";
import { isDatabaseConfigured } from "@/lib/db";

export const ROPES_DEMO_MODE_ENV = "ROPES_DEMO_MODE";

export function isAuthenticatedDatabaseMode() {
  return isAuthenticationConfigured() && isDatabaseConfigured();
}

export function isExplicitDemoModeEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  const value = env[ROPES_DEMO_MODE_ENV]?.trim().toLowerCase();

  if (env["NODE_ENV"] === "production") {
    return false;
  }

  return value === "1" || value === "true" || value === "enabled";
}

export function isDemoFallbackMode() {
  return isExplicitDemoModeEnabled();
}
