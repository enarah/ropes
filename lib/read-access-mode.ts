import { isAuthenticationConfigured } from "@/lib/auth-options";
import { isDatabaseConfigured } from "@/lib/db";

export function isAuthenticatedDatabaseMode() {
  return isAuthenticationConfigured() && isDatabaseConfigured();
}
