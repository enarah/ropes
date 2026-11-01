import { isAuthenticationConfigured } from "@/lib/auth-options";
import { isDatabaseConfigured } from "@/lib/db";
import { isDisposableDemoDatabaseUrl } from "@/lib/disposable-demo-database";

export const ROPES_DEMO_MODE_ENV = "ROPES_DEMO_MODE";
export const ROPES_RUNTIME_ENV = "ROPES_RUNTIME_ENV";

export function isAuthenticatedDatabaseMode() {
  return isAuthenticationConfigured() && isDatabaseConfigured();
}

export function isExplicitDemoModeEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  const value = env[ROPES_DEMO_MODE_ENV]?.trim().toLowerCase();

  const explicitDemo = value === "1" || value === "true" || value === "enabled";
  if (!explicitDemo) return false;

  // next start needs NODE_ENV=production; synthetic access is a separate,
  // server-only application setting, restricted to the disposable database.
  if (env["NODE_ENV"] === "production") {
    return env[ROPES_RUNTIME_ENV] === "sandbox" && isDisposableDemoDatabaseUrl(env["DATABASE_URL"]);
  }
  return true;
}

export function isDemoFallbackMode() {
  return isExplicitDemoModeEnabled();
}
