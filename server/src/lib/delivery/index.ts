import { DeliveryStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma.js';

const updateStatusSchema = z.object({
  deliveryId: z.string().uuid(),
  status: z.nativeEnum(DeliveryStatus).optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  deliveredAt: z.date().nullable().optional(),
  retryCount: z.number().int().min(0).optional(),
  lastAttemptAt: z.date().optional(),
  nextAttemptAt: z.date().nullable().optional(),
  lastErrorAt: z.date().nullable().optional(),
});

export type DeliveryUpdateInput = z.infer<typeof updateStatusSchema>;

export async function updateDeliveryStatus(input: DeliveryUpdateInput) {
  const data = updateStatusSchema.parse(input);
  const { deliveryId, status, errorCode, errorMessage, deliveredAt, retryCount, lastAttemptAt, nextAttemptAt, lastErrorAt } = data;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) {
    updateData.status = status;
  }

  if (errorCode !== undefined) {
    updateData.errorCode = errorCode ?? null;
  }

  if (errorMessage !== undefined) {
    updateData.errorMessage = errorMessage ?? null;
  }

  if (retryCount !== undefined) {
    updateData.retryCount = retryCount;
  }

  if (lastAttemptAt !== undefined) {
    updateData.lastAttemptAt = lastAttemptAt;
  }

  if (nextAttemptAt !== undefined) {
    updateData.nextAttemptAt = nextAttemptAt ?? null;
  }

  if (lastErrorAt !== undefined) {
    updateData.lastErrorAt = lastErrorAt ?? null;
  }

  if (deliveredAt !== undefined) {
    updateData.deliveredAt = deliveredAt;
  } else if (status === DeliveryStatus.SUCCESS) {
    updateData.deliveredAt = new Date();
  }

  return prisma.deliveryLog.update({
    where: { id: deliveryId },
    data: updateData,
  });
}
