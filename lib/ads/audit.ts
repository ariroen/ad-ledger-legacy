import { prisma } from "./db";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

export async function writeAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before === undefined ? null : JSON.stringify(input.before),
      after: input.after === undefined ? null : JSON.stringify(input.after),
    },
  });
}
