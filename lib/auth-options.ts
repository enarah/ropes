import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GoogleProvider from "next-auth/providers/google";

function getAuthSecret() {
  return process.env["NEXTAUTH_SECRET"] ?? process.env["AUTH_SECRET"] ?? "";
}

export function isAuthenticationConfigured() {
  return Boolean(getAuthSecret()) && getAuthProviders().length > 0;
}

export function getAuthProviders() {
  const providers: NextAuthOptions["providers"] = [];
  const googleClientId = process.env["GOOGLE_CLIENT_ID"];
  const googleClientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const microsoftClientId = process.env["MICROSOFT_ENTRA_ID_CLIENT_ID"];
  const microsoftClientSecret =
    process.env["MICROSOFT_ENTRA_ID_CLIENT_SECRET"];
  const microsoftTenantId = process.env["MICROSOFT_ENTRA_ID_TENANT_ID"];

  if (googleClientId && googleClientSecret) {
    providers.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    );
  }

  if (microsoftClientId && microsoftClientSecret) {
    providers.push(
      AzureADProvider({
        clientId: microsoftClientId,
        clientSecret: microsoftClientSecret,
        tenantId: microsoftTenantId || "common",
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  callbacks: {
    session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }

      return session;
    },
  },
  providers: getAuthProviders(),
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
  },
};
