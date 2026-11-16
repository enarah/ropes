// Node-only trusted CLI binding. This module is never imported by app routes.
import { createEnvironmentCredentialResolver } from "./credentials";
import { createSpotAdapter, type SpotTransport } from "./providers/spot";
import { createTrackingSync } from "./sync";
import { assertOneShotPermission } from "./sync-permissions";
import { TrackingSyncError, trackingSyncErrorCode } from "./sync-errors";
import type { PrismaClient } from "@prisma/client";

export async function runSpotOneShotCommand(argv: string[], environment: Record<string, string | undefined>, dependencies: {
  createPrisma: () => PrismaClient;
  transport?: SpotTransport;
  write: (summary: string) => void;
}) {
  let prisma: PrismaClient | undefined;
  try {
    const values = new Map<string, string>();
    const flags = new Set<string>();
    for (let index = 0; index < argv.length; index++) {
      const arg = argv[index]!;
      if (["--confirm-one-shot", "--discover-assets"].includes(arg)) {
        if (flags.has(arg)) throw new TrackingSyncError("INVALID_ARGUMENTS");
        flags.add(arg);
      } else if (["--organisation-id", "--integration-id", "--start"].includes(arg)) {
        const value = argv[++index];
        if (!value || value.startsWith("--") || values.has(arg)) throw new TrackingSyncError("INVALID_ARGUMENTS");
        values.set(arg, value);
      } else throw new TrackingSyncError("INVALID_ARGUMENTS");
    }
    const organisationId = values.get("--organisation-id") ?? "";
    const integrationId = values.get("--integration-id") ?? "";
    const confirmed = flags.has("--confirm-one-shot");
    // Refuse before constructing a DB client, resolving credentials or HTTP.
    assertOneShotPermission(environment, organisationId, confirmed);
    const rawStart = values.get("--start");
    if (rawStart !== undefined && !/^\d+$/.test(rawStart)) throw new TrackingSyncError("INVALID_ARGUMENTS");
    const start = rawStart === undefined ? 1 : Number(rawStart);
    prisma = dependencies.createPrisma();
    const adapter = createSpotAdapter({ transport: dependencies.transport });
    const sync = createTrackingSync({ prisma, environment,
      authorize: async (id) => assertOneShotPermission(environment, id, confirmed),
      resolveCredentials: createEnvironmentCredentialResolver(environment), retrieve: adapter.retrieve });
    const summary = await sync.syncOneIntegration({ organisationId, integrationId, confirmed, start,
      discoverAssets: flags.has("--discover-assets") });
    dependencies.write(JSON.stringify(summary));
    return summary.result === "FAILED" ? 1 : 0;
  } catch (error) {
    dependencies.write(JSON.stringify({ result: "FAILED", code: trackingSyncErrorCode(error) }));
    return 1;
  } finally {
    // A disconnect failure must never print a raw database/connection exception.
    if (prisma) await prisma.$disconnect().catch(() => {});
  }
}
