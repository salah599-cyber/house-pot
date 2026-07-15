import { db } from "@/lib/db";
import { auditLogs, type auditActionEnum } from "@/lib/db/schema";

type AuditAction = (typeof auditActionEnum.enumValues)[number];

type LogAuditInput = {
  actorUserId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function logAudit(input: LogAuditInput) {
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}
