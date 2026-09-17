import { isAuthenticationConfigured } from "@/lib/auth-options";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import { ROPES_DEMO_MODE_ENV } from "@/lib/read-access-mode";

export type HealthPayload = {
  status: "ok";
};

export type ReadinessPayload = {
  checks: {
    authentication: "authentication_unconfigured" | "ok";
    database: "database_unavailable" | "database_unconfigured" | "ok";
    demoMode: "demo_mode_enabled" | "ok";
  };
  status: "not_ready" | "ok";
};

export type ReadinessResult = {
  httpStatus: 200 | 503;
  payload: ReadinessPayload;
};

export type ReadinessDependencies = {
  isAuthenticationConfigured?: () => boolean;
  isDatabaseConfigured?: () => boolean;
  isDemoModeFlagEnabled?: () => boolean;
  probeDatabase?: () => Promise<boolean>;
};

const READINESS_DATABASE_TIMEOUT_MS = 2_000;

export function buildHealthPayload(): HealthPayload {
  return { status: "ok" };
}

export async function buildReadinessResult({
  isAuthenticationConfigured: authConfigured = isAuthenticationConfigured,
  isDatabaseConfigured: databaseConfigured = isDatabaseConfigured,
  isDemoModeFlagEnabled: demoModeFlagEnabled = isRawDemoModeFlagEnabled,
  probeDatabase = probeDatabaseReadiness,
}: ReadinessDependencies = {}): Promise<ReadinessResult> {
  const checks: ReadinessPayload["checks"] = {
    authentication: authConfigured() ? "ok" : "authentication_unconfigured",
    database: "database_unconfigured",
    demoMode: demoModeFlagEnabled() ? "demo_mode_enabled" : "ok",
  };

  if (databaseConfigured()) {
    checks.database = (await safelyProbeDatabase(probeDatabase))
      ? "ok"
      : "database_unavailable";
  }

  const ready = Object.values(checks).every((check) => check === "ok");

  return {
    httpStatus: ready ? 200 : 503,
    payload: {
      checks,
      status: ready ? "ok" : "not_ready",
    },
  };
}

export function isRawDemoModeFlagEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  const value = env[ROPES_DEMO_MODE_ENV]?.trim().toLowerCase();

  return value === "1" || value === "true" || value === "enabled";
}

async function probeDatabaseReadiness() {
  try {
    const prisma = getPrismaClient();
    await withTimeout(
      prisma.$queryRaw`SELECT 1`,
      READINESS_DATABASE_TIMEOUT_MS,
    );

    return true;
  } catch {
    return false;
  }
}

async function safelyProbeDatabase(probeDatabase: () => Promise<boolean>) {
  try {
    return await probeDatabase();
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("readiness timeout")), timeoutMs);
    }),
  ]);
}
