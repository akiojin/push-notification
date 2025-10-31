import { DeliveryStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma.js';

const updateStatusSchema = z.object({
  deliveryId: z.string().uuid(),
  status: z.nativeEnum(DeliveryStatus),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

export type DeliveryUpdateInput = z.infer<typeof updateStatusSchema>;

export async function updateDeliveryStatus(input: DeliveryUpdateInput) {
  const data = updateStatusSchema.parse(input);
  return prisma.deliveryLog.update({
    where: { id: data.deliveryId },
    data: {
      status: data.status,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      deliveredAt: data.status === DeliveryStatus.SUCCESS ? new Date() : undefined,
    },
  });
}
