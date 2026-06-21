import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";

export type AuditLogInput = {
  action: AuditAction;
  actorUserId?: string | null;
  entityId?: string | null;
  entityType: string;
  metadata?: Prisma.InputJsonValue;
  organisationId: string;
  summary: string;
};

export async function recordAuditLog(
  prisma: PrismaClient,
  input: AuditLogInput,
) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        entityId: input.entityId ?? null,
        entityType: input.entityType,
        metadata: input.metadata,
        organisationId: input.organisationId,
        summary: input.summary,
      },
    });
  } catch {
    // Audit logging is best-effort for now. A failed audit insert must not
    // roll back an already-successful operational write.
  }
}
