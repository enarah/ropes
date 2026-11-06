import "server-only";
// Trusted Node/CLI service. No request session fallback or public endpoint.
import type { Prisma, PrismaClient } from "@prisma/client";
import { assertCredentialKey, type SpotCredentialResolver } from "./credentials";
import type { SpotFeedResult } from "./providers/spot";
import { assertOneShotPermission, validInternalIdentity } from "./sync-permissions";
import { TrackingSyncError, trackingSyncErrorCode, type TrackingSyncErrorCode } from "./sync-errors";

export type TrackingSyncSummary = {
  integrationId: string;
  result: "SUCCESS" | "FAILED" | "RATE_LIMITED" | "BUSY";
  code: TrackingSyncErrorCode | null;
  assetsDiscovered: number;
  messagesInserted: number;
  duplicatesSkipped: number;
  malformedMessagesRejected: number;
  lastSuccessfulSynchronisation: string | null;
};
type Request = { organisationId: string; integrationId: string; confirmed: boolean; discoverAssets?: boolean; start?: number };
const transactionOptions = { isolationLevel: "ReadCommitted" as const, timeout: 15_000 };

async function databaseNow(db: Prisma.TransactionClient) {
  // Epoch text avoids driver-specific timestamptz/local-time conversions.
  const [row] = await db.$queryRaw<Array<{ milliseconds: string }>>`SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::text AS milliseconds`;
  const milliseconds = Number(row?.milliseconds);
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new TrackingSyncError("PERSISTENCE_FAILED");
  return new Date(milliseconds);
}
async function allowedIntegration(db: Prisma.TransactionClient, request: Request) {
  const integration = await db.trackingIntegration.findFirst({ where: {
    id: request.integrationId, organisationId: request.organisationId,
  }, include: { organisation: { select: { isDemo: true } } } });
  if (!integration || integration.provider !== "SPOT" || !integration.enabled) throw new TrackingSyncError("INTEGRATION_UNAVAILABLE");
  if (integration.isDemo || integration.organisation.isDemo) throw new TrackingSyncError("SYNTHETIC_BOUNDARY");
  if (!await db.organisationCapability.findUnique({ where: { organisationId_key: {
    organisationId: request.organisationId, key: "integrations.spotTracker",
  } }, select: { id: true } })) throw new TrackingSyncError("CAPABILITY_DISABLED");
  assertCredentialKey(integration.credentialKey);
  return integration;
}

export function createTrackingSync({ prisma, authorize, environment, resolveCredentials, retrieve }: {
  prisma: PrismaClient;
  // Mandatory trusted authorizer; CLI binds this to a separate runtime org grant.
  authorize: (organisationId: string) => Promise<void>;
  environment: Record<string, string | undefined>;
  resolveCredentials: SpotCredentialResolver;
  retrieve: (credentials: Awaited<ReturnType<SpotCredentialResolver>>, start?: number) => Promise<SpotFeedResult>;
}) {
  async function run(request: Request): Promise<TrackingSyncSummary> {
    assertOneShotPermission(environment, request.organisationId, request.confirmed);
    if (!validInternalIdentity(request.integrationId) || (request.start !== undefined &&
      (!Number.isSafeInteger(request.start) || request.start < 1 || request.start > 1_000_001 || (request.start - 1) % 50 !== 0))) {
      throw new TrackingSyncError("INVALID_ARGUMENTS");
    }
    try { await authorize(request.organisationId); }
    catch { throw new TrackingSyncError("PERMISSION_DENIED"); }
    // Validate ownership/capability before even resolving a credential reference.
    const initial = await allowedIntegration(prisma, request);
    const summary: TrackingSyncSummary = { integrationId: initial.id, result: "FAILED", code: null,
      assetsDiscovered: 0, messagesInserted: 0, duplicatesSkipped: 0, malformedMessagesRejected: 0,
      lastSuccessfulSynchronisation: initial.lastPollSuccessAt?.toISOString() ?? null };
    const claim = await prisma.$transaction(async (db) => {
      // Fixed provider-wide transaction lock, shared by every CLI/process.
      // No feed secret/hash is persisted. Do not hold a transaction over HTTP.
      const [lock] = await db.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(187, 4) AS locked`;
      if (!lock?.locked) return { result: "BUSY" as const };
      const current = await allowedIntegration(db, request);
      if (current.credentialKey !== initial.credentialKey) throw new TrackingSyncError("ATTEMPT_SUPERSEDED");
      const now = await databaseNow(db);
      // Deliberately conservative: all feeds share the previous attempt's
      // interval. Alternate credential keys cannot bypass a same-feed limit.
      const attempts = await db.trackingIntegration.findMany({ where: { provider: "SPOT", lastPollAttemptAt: { not: null } },
        select: { lastPollAttemptAt: true, pollIntervalSeconds: true } });
      if (attempts.some((row) => now.getTime() < row.lastPollAttemptAt!.getTime() + Math.max(150, row.pollIntervalSeconds) * 1000)) {
        return { result: "RATE_LIMITED" as const };
      }
      await db.trackingIntegration.update({ where: { organisationId_id: { organisationId: request.organisationId, id: current.id } },
        data: { lastPollAttemptAt: now } });
      return { result: "CLAIMED" as const, attemptedAt: now };
    }, transactionOptions);
    if (claim.result !== "CLAIMED") return { ...summary, result: claim.result };
    let malformedMessagesRejected = 0;
    try {
      let credentials: Awaited<ReturnType<SpotCredentialResolver>>;
      try { credentials = await resolveCredentials(initial.credentialKey); }
      catch { throw new TrackingSyncError("CREDENTIALS_UNAVAILABLE"); }
      const feed = await retrieve(credentials, request.start);
      malformedMessagesRejected = feed.malformedMessagesRejected;
      if (!feed.messages.length && malformedMessagesRejected) throw new TrackingSyncError("MALFORMED_RESPONSE");
      const counts = await prisma.$transaction(async (db) => {
        const current = await allowedIntegration(db, request);
        if (current.credentialKey !== initial.credentialKey || current.lastPollAttemptAt?.getTime() !== claim.attemptedAt.getTime()) {
          throw new TrackingSyncError("ATTEMPT_SUPERSEDED");
        }
        let assetsDiscovered = 0, messagesInserted = 0, duplicatesSkipped = 0;
        for (const event of feed.messages) {
          let asset = await db.trackingAsset.findUnique({ where: { trackingIntegrationId_externalAssetId: {
            trackingIntegrationId: current.id, externalAssetId: event.messengerId,
          } } });
          if (!asset) {
            if (request.discoverAssets !== true) throw new TrackingSyncError("UNKNOWN_ASSET");
            asset = await db.trackingAsset.create({ data: { organisationId: request.organisationId,
              trackingIntegrationId: current.id, externalAssetId: event.messengerId,
              displayName: "Discovered SPOT tracker", model: event.model } });
            assetsDiscovered++;
          }
          if (asset.organisationId !== request.organisationId || asset.trackingIntegrationId !== current.id) {
            throw new TrackingSyncError("OWNERSHIP_CONFLICT");
          }
          const existing = await db.trackingMessage.findUnique({ where: { trackingIntegrationId_externalMessageId: {
            trackingIntegrationId: current.id, externalMessageId: event.message.externalMessageId,
          } } });
          if (existing) {
            if (existing.organisationId !== request.organisationId || existing.trackingAssetId !== asset.id ||
              existing.occurredAt.getTime() !== event.message.occurredAt.getTime() ||
              existing.messageKind !== event.message.messageKind || existing.providerMessageType !== event.message.providerMessageType ||
              existing.latitude !== event.message.latitude || existing.longitude !== event.message.longitude) {
              throw new TrackingSyncError("MESSAGE_CONFLICT");
            }
            duplicatesSkipped++;
          } else {
            // Explicit allowlist: never copy arbitrary adapter/provider fields.
            await db.trackingMessage.create({ data: { organisationId: request.organisationId,
              trackingIntegrationId: current.id, trackingAssetId: asset.id,
              externalMessageId: event.message.externalMessageId, occurredAt: event.message.occurredAt,
              messageKind: event.message.messageKind, providerMessageType: event.message.providerMessageType,
              latitude: event.message.latitude, longitude: event.message.longitude } });
            messagesInserted++;
          }
          // Fill only absent model metadata. Never overwrite manual labels,
          // source names, vehicle association, interval or retirement status.
          if (asset.model === null && event.model !== null) await db.trackingAsset.update({
            where: { organisationId_id: { organisationId: request.organisationId, id: asset.id } }, data: { model: event.model },
          });
        }
        const successfulAt = await databaseNow(db);
        const update = await db.trackingIntegration.updateMany({ where: { id: current.id,
          organisationId: request.organisationId, lastPollAttemptAt: claim.attemptedAt },
          data: { lastPollSuccessAt: successfulAt, lastErrorCode: null, lastErrorAt: null } });
        if (update.count !== 1) throw new TrackingSyncError("ATTEMPT_SUPERSEDED");
        return { assetsDiscovered, messagesInserted, duplicatesSkipped, successfulAt };
      }, transactionOptions);
      return { ...summary, result: "SUCCESS", assetsDiscovered: counts.assetsDiscovered,
        messagesInserted: counts.messagesInserted, duplicatesSkipped: counts.duplicatesSkipped,
        malformedMessagesRejected: feed.malformedMessagesRejected,
        lastSuccessfulSynchronisation: counts.successfulAt.toISOString() };
    } catch (error) {
      const code = trackingSyncErrorCode(error);
      try {
        await prisma.$transaction(async (db) => {
          await db.trackingIntegration.updateMany({ where: { id: initial.id, organisationId: request.organisationId,
            lastPollAttemptAt: claim.attemptedAt }, data: { lastErrorCode: code, lastErrorAt: await databaseNow(db) } });
        }, transactionOptions);
      } catch { throw new TrackingSyncError("PERSISTENCE_FAILED"); }
      return { ...summary, code, malformedMessagesRejected };
    }
  }
  return {
    async syncOneIntegration(request: Request) {
      try { return await run(request); }
      catch (error) { throw new TrackingSyncError(trackingSyncErrorCode(error)); }
    },
  };
}
