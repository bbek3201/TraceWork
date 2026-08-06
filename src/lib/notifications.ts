import type { Prisma, PrismaClient } from "@prisma/client";

type NotifyClient = PrismaClient | Prisma.TransactionClient;

type NotifyInput = {
  organizationId: string;
  userIds: string[];
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
};

/** Fans a notification out to a set of recipients (deduped, self-notify skipped by caller if desired). */
export function notify(client: NotifyClient, input: NotifyInput) {
  const recipients = [...new Set(input.userIds)];
  if (recipients.length === 0) return Promise.resolve();
  return client.notification.createMany({
    data: recipients.map((userId) => ({
      organizationId: input.organizationId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    })),
  });
}
